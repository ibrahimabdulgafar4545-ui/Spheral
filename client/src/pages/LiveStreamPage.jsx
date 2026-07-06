import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { FiUsers, FiX, FiSend, FiVideo, FiMic, FiMicOff, FiVideoOff } from 'react-icons/fi';
import { useApp } from '../context/AppContext';
import { reelsAPI } from '../api/reels';
import Avatar from '../components/ui/Avatar';
import VerifiedBadge from '../components/ui/VerifiedBadge';
import TextInputWithEmoji from '../components/ui/TextInputWithEmoji';

// ─── Native WebRTC Configuration ─────────────────────────────────────────────
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

export default function LiveStreamPage() {
  const { channelName } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, socket, friendsList, showToast } = useApp();

  const isHost = searchParams.get('host') === 'true';

  // Live States
  const [viewerCount, setViewerCount] = useState(1);
  const [messages, setMessages] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [streamEnded, setStreamEnded] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savingReel, setSavingReel] = useState(false);

  // References
  const localStreamRef = useRef(null);
  const peerConnections = useRef({}); // Map of viewerId -> RTCPeerConnection (or 'host' for viewers)
  const messagesEndRef = useRef(null);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Connect to Socket Room & Init WebRTC
  useEffect(() => {
    let active = true;

    const startHost = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Start recording
        const options = { mimeType: 'video/webm;codecs=vp8,opus' };
        try {
          if (MediaRecorder.isTypeSupported(options.mimeType)) {
            mediaRecorderRef.current = new MediaRecorder(stream, options);
          } else {
            mediaRecorderRef.current = new MediaRecorder(stream);
          }
          mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
              recordedChunksRef.current.push(event.data);
            }
          };
          mediaRecorderRef.current.start(1000);
        } catch (e) {
          console.warn('MediaRecorder init failed:', e);
        }
      } catch (err) {
        console.warn('Camera/Mic error:', err);
        showToast('error', 'Could not access camera or microphone.');
        // Allow audio-only or completely empty stream if permissions denied
      }

      if (socket && active) {
        // 1. Notify friends
        const friendIds = friendsList.map(f => f._id || f.id);
        socket.emit('goLive', {
          hostId: user.id || user._id,
          hostName: user.name,
          hostAvatar: user.avatar,
          channelName,
          friends: friendIds
        });

        // 2. Join Room for chat & presence
        socket.emit('joinLive', {
          channelName,
          userId: user.id || user._id,
          userName: user.name,
          userAvatar: user.avatar
        });

        // 3. Handle incoming viewers
        socket.on('hostInitiateWebrtc', async ({ viewerId }) => {
          if (!active) return;
          const pc = new RTCPeerConnection(ICE_SERVERS);
          peerConnections.current[viewerId] = pc;

          // Add local tracks
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
              pc.addTrack(track, localStreamRef.current);
            });
          }

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              socket.emit('liveWebrtcIceCandidate', { targetId: viewerId, candidate: event.candidate, senderId: user.id || user._id });
            }
          };

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('liveWebrtcOffer', { targetId: viewerId, offer, hostId: user.id || user._id });
        });

        // 4. Handle incoming answers
        socket.on('receiveWebrtcAnswer', async ({ viewerId, answer }) => {
          const pc = peerConnections.current[viewerId];
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
          }
        });

        socket.on('receiveWebrtcIceCandidate', async ({ senderId, candidate }) => {
          const pc = peerConnections.current[senderId];
          if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        });
      }
    };

    const startViewer = () => {
      if (socket && active) {
        socket.emit('joinLive', {
          channelName,
          userId: user.id || user._id,
          userName: user.name,
          userAvatar: user.avatar
        });

        // Trigger host to create an offer for us
        // channelName is essentially the hostId in our URL scheme
        const hostId = channelName.replace('live_user_', ''); 
        socket.emit('viewerJoinedLive', { channelName, viewerId: user.id || user._id });

        let pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnections.current['host'] = pc;

        pc.ontrack = (event) => {
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('liveWebrtcIceCandidate', { targetId: hostId, candidate: event.candidate, senderId: user.id || user._id });
          }
        };

        socket.on('receiveWebrtcOffer', async ({ hostId: senderHostId, offer }) => {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('liveWebrtcAnswer', { targetId: senderHostId, answer, viewerId: user.id || user._id });
        });

        socket.on('receiveWebrtcIceCandidate', async ({ senderId, candidate }) => {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        });
      }
    };

    // Shared Chat Listeners
    if (socket) {
      socket.on('liveMessage', (msg) => {
        if (active) setMessages(prev => [...prev, msg]);
      });
      socket.on('liveViewerCount', (count) => {
        if (active) setViewerCount(count);
      });
      socket.on('liveStreamEnded', () => {
        if (!isHost && active) setStreamEnded(true);
      });
    }

    if (isHost) {
      startHost();
    } else {
      startViewer();
    }

    return () => {
      active = false;
      // Stop tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      // Close all peer connections
      Object.values(peerConnections.current).forEach(pc => pc.close());
      peerConnections.current = {};

      if (socket) {
        socket.emit('leaveLive', {
          channelName,
          userId: user.id || user._id,
          userName: user.name
        });
        socket.off('liveMessage');
        socket.off('liveViewerCount');
        socket.off('liveStreamEnded');
        socket.off('hostInitiateWebrtc');
        socket.off('receiveWebrtcOffer');
        socket.off('receiveWebrtcAnswer');
        socket.off('receiveWebrtcIceCandidate');
      }
    };
  }, [channelName, isHost, socket]);

  // Audio/Video toggles
  const toggleMic = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !micEnabled;
        setMicEnabled(!micEnabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getVideoTracks()[0];
      if (track) {
        track.enabled = !videoEnabled;
        setVideoEnabled(!videoEnabled);
      }
    }
  };

  // Chat submission
  const submitLiveComment = (stickerUrl = null) => {
    const textToSend = stickerUrl || commentText.trim();
    if (!textToSend) return;

    if (socket) {
      socket.emit('sendLiveComment', {
        channelName,
        comment: {
          user: { name: user.name, avatar: user.avatar, verified: user.verified },
          text: textToSend,
          type: stickerUrl ? 'sticker' : 'text'
        }
      });
      if (!stickerUrl) {
        setCommentText('');
      }
    }
  };

  const handleEndStream = () => {
    if (socket) {
      socket.emit('endLiveStream', { channelName });
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    Object.values(peerConnections.current).forEach(pc => pc.close());
    setShowSaveModal(true);
  };

  const saveStreamAsReel = async () => {
    setSavingReel(true);
    try {
      let videoBlob;
      if (recordedChunksRef.current.length > 0) {
        videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      } else {
        // Decode a tiny valid 1-second blank MP4 video from base64 to avoid HTML5 play crashes
        const tinyMp4Base64 = "AAAAIGZ0eXBpc29tAAAAAGlzb21tcDQyAAAAKmZyZWUAAADebWRhdAABG//73/vUf/gAAD5oR0NIPwAAAAcAAAAOAAAAAf/9/wAAAAMwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwQAAAAl21vb3YAAABsbXZoZAAAAADed2T23ndk9gAAA+gAAAR8AAEAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAI0dHJhawAAAFx0a2hkAAAAA953ZPXed2T9AAAAAQAAAAAAAR8AAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAABVbWRpYQAAACxtZGhkAAAAA3ndk9d53ZP9AAACuAAAA1UAVQAAAAABAAAAAAAAYWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAAB2aWRlb21lZGlhAAAAAAAAAHZtaGgAAAABAAAAAAAAAAAAAAAkZGluZgAAABxkcmVmAAAAAAAAAAEAAAAMdXJsIAAAAAEAAAEbc3RibAAAAG1zdHNkAAAAAAAAAAEAAABVYXZjMQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAF2AHYAAAAAABVjb2xycHJ0Z2NvbHIAAG5jbGMABAAFAARhdmNDAWQAMv/hABhnRkMAMrN9AeoYAgCPAAABAAgAAAMEpIhIQAAEAAAAGmJydGMAAAAAAAAAH0AAAAAAAACYAAAAF3N0dHMAAAAAAAAAAQAAAAEAAAq4AAAAHHN0c3oAAAAAAAAAAAAAAAEAAAAEAAAADHN0c2MAAAAAAAAAAQAAAAEAAAABAAAAAXN0Y28AAAAAAAAAAQAAADw=";
        const byteCharacters = atob(tinyMp4Base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        videoBlob = new Blob([byteArray], { type: 'video/mp4' });
      }

      const fd = new FormData();
      // If we recorded webm, we should use .webm extension so the backend/player processes it correctly
      const ext = recordedChunksRef.current.length > 0 ? 'webm' : 'mp4';
      fd.append('video', videoBlob, `live-stream-archive.${ext}`);
      fd.append('caption', `Live Stream catchup archive from ${new Date().toLocaleDateString()}! 🎥✨`);
      fd.append('audioName', 'Original Live Audio');
      
      const res = await reelsAPI.uploadReel(fd);
      if (res.success) {
        showToast('success', 'Live Stream successfully saved to Reels!');
        navigate('/reels');
      }
    } catch (e) {
      console.error(e);
      showToast('error', 'Failed to archive stream, redirecting.');
      navigate('/');
    } finally {
      setSavingReel(false);
      setShowSaveModal(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col md:flex-row select-none">
      {/* ─── Main Video Stream Panel ───────────────────────────── */}
      <div className="relative flex-1 bg-zinc-950 flex items-center justify-center overflow-hidden">
        {/* Render Native Video */}
        <video 
          ref={videoRef}
          autoPlay 
          playsInline
          muted={isHost} // Host must be muted locally to prevent echo
          className="w-full h-full bg-zinc-950 object-cover" 
        />

        {/* Live Top Banner Overlay */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold shadow-md animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white" />
              LIVE
            </span>
            <span className="flex items-center justify-center gap-1 px-3 py-1 rounded-full bg-black/45 backdrop-blur text-white text-xs font-bold">
              <FiUsers size={12} />
              {viewerCount}
            </span>
          </div>

          <button
            onClick={() => isHost ? handleEndStream() : navigate('/')}
            className="w-9 h-9 rounded-full bg-black/45 hover:bg-black/75 backdrop-blur text-white flex items-center justify-center transition pointer-events-auto"
            title="Leave / End stream"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Bottom controls panel for Host */}
        {isHost && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 z-10">
            <button
              onClick={toggleMic}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition shadow-lg
                ${micEnabled ? 'bg-zinc-800 text-white' : 'bg-red-600 text-white'}`}
            >
              {micEnabled ? <FiMic size={20} /> : <FiMicOff size={20} />}
            </button>
            <button
              onClick={toggleVideo}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition shadow-lg
                ${videoEnabled ? 'bg-zinc-800 text-white' : 'bg-red-600 text-white'}`}
            >
              {videoEnabled ? <FiVideo size={20} /> : <FiVideoOff size={20} />}
            </button>
            <button
              onClick={handleEndStream}
              className="px-6 h-12 rounded-full bg-red-600 text-white font-bold transition shadow-lg hover:bg-red-700"
            >
              End Live
            </button>
          </div>
        )}
      </div>

      {/* ─── Live Comments & Chat sidebar ─────────────────────── */}
      <div className="w-full md:w-80 h-72 md:h-full bg-zinc-900 border-t md:border-t-0 md:border-l border-zinc-800 flex flex-col z-10">
        <div className="px-4 py-3 border-b border-zinc-800 flex-shrink-0">
          <h3 className="font-bold text-white text-sm">Live Comments</h3>
        </div>

        {/* Scrollable feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {messages.length === 0 ? (
            <div className="text-zinc-500 text-xs text-center py-10">
              No comments yet. Say hello to the host!
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex items-start gap-2.5 ${msg.system ? 'text-zinc-400 italic text-[11px] justify-center bg-zinc-950/20 py-1.5 rounded-lg' : 'text-white'}`}>
                {!msg.system && (
                  <Avatar src={msg.user?.avatar} alt={msg.user?.name} size="xs" className="mt-0.5" />
                )}
                <div>
                  {!msg.system ? (
                    <p className="text-xs flex items-center gap-1 flex-wrap">
                      <span className="font-bold text-sp-blue">{msg.user?.name}</span>
                      {msg.user?.verified && <VerifiedBadge size={10} />}
                      <span className="text-zinc-200 ml-0.5 block">
                        {msg.type === 'sticker' || (typeof msg.text === 'string' && (msg.text.startsWith('https://fonts.gstatic.com/') || msg.text.startsWith('data:image/'))) ? (
                          <img src={msg.text} alt="sticker" className="w-16 h-16 object-contain mt-1 rounded bg-zinc-950/40 p-1 border border-zinc-800" />
                        ) : (
                          msg.text
                        )}
                      </span>
                    </p>
                  ) : (
                    <span className="flex items-center gap-1 flex-wrap text-zinc-400 text-xs">
                      <span>{msg.user?.name}</span>
                      {msg.user?.verified && <VerifiedBadge size={10} />}
                      <span>{msg.text}</span>
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Form input */}
        <div className="p-3 border-t border-zinc-800 flex-shrink-0 bg-zinc-900 text-left">
          <TextInputWithEmoji
            value={commentText}
            onChange={setCommentText}
            onSubmit={() => submitLiveComment()}
            onStickerSelect={(url) => submitLiveComment(url)}
            placeholder="Comment live..."
            showAvatar={false}
            panelDirection="above"
          />
        </div>
      </div>

      {/* ─── Stream Ended Viewer notice modal ─────────────────── */}
      {streamEnded && (
        <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-400">
              <FiVideo size={24} />
            </div>
            <h3 className="font-bold text-white text-lg mb-2">Live Stream Ended</h3>
            <p className="text-zinc-400 text-sm mb-6">The broadcaster has ended the live stream session.</p>
            <button
              onClick={() => navigate('/')}
              className="w-full py-2.5 rounded-xl bg-sp-blue hover:bg-blue-700 text-white font-bold transition"
            >
              Back to Home
            </button>
          </div>
        </div>
      )}

      {/* ─── Host Stream Save option modal ───────────────────── */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-white text-lg mb-2">Save Live Stream?</h3>
            <p className="text-zinc-400 text-sm mb-6">Would you like to archive and save this broadcast as a Reel post for your profile, or discard it?</p>
            
            <div className="space-y-2.5">
              <button
                onClick={saveStreamAsReel}
                disabled={savingReel}
                className="w-full py-2.5 rounded-xl bg-sp-blue hover:bg-blue-700 text-white font-bold transition flex items-center justify-center gap-2"
              >
                {savingReel ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Saving Stream...
                  </>
                ) : (
                  'Save as Reel'
                )}
              </button>
              <button
                onClick={() => navigate('/')}
                disabled={savingReel}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition"
              >
                Discard & Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
