import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { FiUsers, FiX, FiSend, FiVideo, FiMic, FiMicOff, FiVideoOff, FiMessageSquare } from 'react-icons/fi';
import { useApp } from '../context/AppContext';
import { reelsAPI } from '../api/reels';
import Avatar from '../components/ui/Avatar';
import VerifiedBadge from '../components/ui/VerifiedBadge';
import TextInputWithEmoji from '../components/ui/TextInputWithEmoji';

// ─── Native WebRTC Configuration ─────────────────────────────────────────────
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Free TURN server (openrelay.metered.ca) — replace with your own in production
    { urls: 'turn:openrelay.metered.ca:80',  username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
  iceCandidatePoolSize: 10,
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
  const [showMobileChat, setShowMobileChat] = useState(true);

  // Co-Host Requests & Duration & Moderation States
  const [coHostStatus, setCoHostStatus] = useState('idle'); // 'idle' | 'requesting' | 'approved' | 'declined'
  const [pendingRequests, setPendingRequests] = useState([]); // Array of { userId, userName, userAvatar }
  const [duration, setDuration] = useState(0); // Live duration in seconds
  const [mutedUsers, setMutedUsers] = useState([]); // Array of muted userIds (chat moderation)

  // Public/Private Live Session States
  const [hasStartedStream, setHasStartedStream] = useState(!isHost); // For host: require setup screen first
  const [streamMode, setStreamMode] = useState('public'); // 'public' | 'private'
  const [freeJoinLimit, setFreeJoinLimit] = useState('unlimited'); // 'unlimited' | '5' | '10' | '20' | '50'
  const [pendingAccessRequests, setPendingAccessRequests] = useState([]); // Host: watch access requests
  const [accessState, setAccessState] = useState(isHost ? 'approved' : 'checking'); // Viewers: access status
  const [pendingReason, setPendingReason] = useState(''); // 'private' | 'limit_reached'
  const [mirrorCamera, setMirrorCamera] = useState(true); // for local camera preview mirroring

  // Live Dual WebRTC States
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [hostStream, setHostStream] = useState(null);
  const [coHostStream, setCoHostStream] = useState(null);
  const [coHostId, setCoHostId] = useState(null);

  // References
  const localStreamRef = useRef(null);
  const peerConnections = useRef({}); // Map of viewerId -> RTCPeerConnection (or 'host' for viewers)
  const messagesEndRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const hostVideoRef = useRef(null);
  const coHostVideoRef = useRef(null);
  const hostStreamIdRef = useRef(null);
  const coHostIdRef = useRef(null); // tracks coHostId in closures to avoid stale state
  const coHostStreamRef = useRef(null); // tracks coHostStream in closures
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Live Composite Recording References
  const audioCtxRef = useRef(null);
  const audioDestRef = useRef(null);
  const canvasElementRef = useRef(null);
  const compositeStreamRef = useRef(null);
  const drawLoopRef = useRef(null);
  const remoteAudioSourceRef = useRef(null);
  const remoteStreamRef = useRef(null);

  // Sync remote stream ref and mix guest audio
  useEffect(() => {
    remoteStreamRef.current = remoteStream;

    if (isHost && audioCtxRef.current && audioDestRef.current && remoteStream) {
      try {
        if (remoteAudioSourceRef.current) {
          remoteAudioSourceRef.current.disconnect();
        }
        if (remoteStream.getAudioTracks().length > 0) {
          const source = audioCtxRef.current.createMediaStreamSource(remoteStream);
          source.connect(audioDestRef.current);
          remoteAudioSourceRef.current = source;
        }
      } catch (audioErr) {
        console.warn('Failed to route guest audio to recorder:', audioErr);
      }
    }
  }, [remoteStream, isHost]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Bind Host stream
  useEffect(() => {
    if (hostVideoRef.current) {
      if (isHost) {
        hostVideoRef.current.srcObject = localStream;
      } else {
        hostVideoRef.current.srcObject = hostStream;
      }
    }
  }, [localStream, hostStream, isHost]);

  // Bind Guest / Co-Host stream
  useEffect(() => {
    if (coHostVideoRef.current) {
      if (isHost) {
        coHostVideoRef.current.srcObject = coHostStream;
      } else {
        if (coHostStatus === 'approved') {
          coHostVideoRef.current.srcObject = localStream;
        } else {
          coHostVideoRef.current.srcObject = coHostStream;
        }
      }
    }
  }, [localStream, coHostStream, coHostStatus, isHost]);

  // Live Duration Timer loop
  useEffect(() => {
    let interval = null;
    if (!streamEnded) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [streamEnded]);

  const formatDuration = (sec) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return [
      hrs > 0 ? String(hrs).padStart(2, '0') : null,
      String(mins).padStart(2, '0'),
      String(secs).padStart(2, '0')
    ].filter(Boolean).join(':');
  };

  const initCompositeRecording = (hostStream) => {
    const canvas = document.createElement('canvas');
    canvas.width = 540;
    canvas.height = 960;
    canvasElementRef.current = canvas;
    const ctx = canvas.getContext('2d');

    const localVideo = document.createElement('video');
    localVideo.srcObject = hostStream;
    localVideo.muted = true;
    localVideo.setAttribute('playsinline', 'true');
    localVideo.play().catch(e => console.warn(e));

    let remoteVideo = null;

    const drawVideoCover = (video, destX, destY, destWidth, destHeight) => {
      if (!video.videoWidth || !video.videoHeight) {
        ctx.drawImage(video, destX, destY, destWidth, destHeight);
        return;
      }
      const videoAspect = video.videoWidth / video.videoHeight;
      const destAspect = destWidth / destHeight;
      let sX = 0, sY = 0, sW = video.videoWidth, sH = video.videoHeight;

      if (videoAspect > destAspect) {
        sW = video.videoHeight * destAspect;
        sX = (video.videoWidth - sW) / 2;
      } else {
        sH = video.videoWidth / destAspect;
        sY = (video.videoHeight - sH) / 2;
      }
      ctx.drawImage(video, sX, sY, sW, sH, destX, destY, destWidth, destHeight);
    };

    const draw = () => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const currentRemoteStream = remoteStreamRef.current;
      if (currentRemoteStream && currentRemoteStream.getVideoTracks().length > 0) {
        if (!remoteVideo || remoteVideo.srcObject !== currentRemoteStream) {
          remoteVideo = document.createElement('video');
          remoteVideo.srcObject = currentRemoteStream;
          remoteVideo.muted = true;
          remoteVideo.setAttribute('playsinline', 'true');
          remoteVideo.play().catch(e => console.warn(e));
        }
      } else {
        remoteVideo = null;
      }

      if (remoteVideo && remoteVideo.readyState >= 2) {
        drawVideoCover(localVideo, 0, 0, canvas.width, canvas.height / 2);
        drawVideoCover(remoteVideo, 0, canvas.height / 2, canvas.width, canvas.height / 2);
      } else if (localVideo.readyState >= 2) {
        drawVideoCover(localVideo, 0, 0, canvas.width, canvas.height);
      }
      drawLoopRef.current = requestAnimationFrame(draw);
    };

    draw();

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      const dest = audioCtx.createMediaStreamDestination();
      audioDestRef.current = dest;

      if (hostStream.getAudioTracks().length > 0) {
        const localSource = audioCtx.createMediaStreamSource(hostStream);
        localSource.connect(dest);
      }

      const canvasStream = canvas.captureStream(30);
      const composite = new MediaStream();
      composite.addTrack(canvasStream.getVideoTracks()[0]);
      if (dest.stream.getAudioTracks().length > 0) {
        composite.addTrack(dest.stream.getAudioTracks()[0]);
      }
      compositeStreamRef.current = composite;
    } catch (err) {
      console.warn('AudioContext mixing error, recording video only:', err);
      compositeStreamRef.current = canvas.captureStream(30);
    }
  };

  // Connect to Socket Room & Init WebRTC
  useEffect(() => {
    let active = true;

    const startHost = async (mode = 'public') => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        setLocalStream(stream);

        // Initialize composite canvas and audio context
        initCompositeRecording(stream);

        // Start recording
        const options = { mimeType: 'video/webm;codecs=vp8,opus' };
        try {
          const recStream = compositeStreamRef.current || stream;
          if (MediaRecorder.isTypeSupported(options.mimeType)) {
            mediaRecorderRef.current = new MediaRecorder(recStream, options);
          } else {
            mediaRecorderRef.current = new MediaRecorder(recStream);
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
      }

      const triggerRenegotiation = async (viewerId) => {
        const pc = peerConnections.current[viewerId];
        if (pc && pc.signalingState !== 'closed') {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('liveWebrtcOffer', { targetId: viewerId, offer, hostId: user.id || user._id });
          } catch (err) {
            console.error('[Host] renegotiation offer creation failed:', err);
          }
        }
      };

      if (socket && active) {
        // 1. Notify friends
        const friendIds = friendsList.map(f => f._id || f.id);
        socket.emit('goLive', {
          hostId: user.id || user._id,
          hostName: user.name,
          hostAvatar: user.avatar,
          channelName,
          friends: friendIds,
          mode,
          freeJoinLimit
        });

        // 2. Join Room for chat & presence
        socket.emit('joinLive', {
          channelName,
          userId: user.id || user._id,
          userName: user.name,
          userAvatar: user.avatar
        });

        // 3. Remove stale listeners before adding new ones
        socket.off('hostInitiateWebrtc');
        socket.off('receiveWebrtcAnswer');
        socket.off('receiveWebrtcIceCandidate');
        socket.off('coHostRequestReceived');
        socket.off('liveAccessRequestReceived');
        socket.off('coHostLeftNotify');

        // 4. Handle incoming viewers (guests)
        socket.on('hostInitiateWebrtc', async ({ viewerId }) => {
          if (!active) return;
          let pc = peerConnections.current[viewerId];
          if (!pc) {
            pc = new RTCPeerConnection(ICE_SERVERS);
            peerConnections.current[viewerId] = pc;

            pc.onconnectionstatechange = () => {
              console.log(`[Host WebRTC] Viewer ${viewerId} state: ${pc.connectionState}`);
              if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                if (viewerId === coHostIdRef.current) {
                  // Snapshot the co-host track IDs while we still have the ref
                  const staleStream = coHostStreamRef.current;
                  coHostIdRef.current = null;
                  coHostStreamRef.current = null;
                  setCoHostStream(null);
                  setRemoteStream(null);
                  setCoHostId(null);

                  // Forward removals to other spectators — only remove guest tracks
                  const guestTrackIds = staleStream
                    ? new Set(staleStream.getTracks().map(t => t.id))
                    : new Set();
                  Object.entries(peerConnections.current).forEach(([otherViewerId, otherPc]) => {
                    if (otherViewerId !== viewerId && otherPc.signalingState !== 'closed') {
                      otherPc.getSenders().forEach(sender => {
                        if (sender.track && guestTrackIds.has(sender.track.id)) {
                          otherPc.removeTrack(sender);
                        }
                      });
                      triggerRenegotiation(otherViewerId);
                    }
                  });
                }
              }
            };
            pc.oniceconnectionstatechange = () => {
              console.log(`[Host ICE] Viewer ${viewerId}: ${pc.iceConnectionState}`);
            };

            // Add local tracks (Host stream)
            if (localStreamRef.current) {
              localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current);
              });
            }

            // Also forward any existing guest stream to this new viewer
            if (coHostStreamRef.current) {
              coHostStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, coHostStreamRef.current);
              });
            }

            // Receive guest (co-host) stream
            pc.ontrack = (event) => {
              if (event.streams && event.streams[0]) {
                const guestStream = event.streams[0];
                setRemoteStream(guestStream);
                coHostStreamRef.current = guestStream;
                setCoHostStream(guestStream);
                coHostIdRef.current = viewerId;
                setCoHostId(viewerId);

                // Forward this guest stream to all other viewers
                Object.entries(peerConnections.current).forEach(([otherViewerId, otherPc]) => {
                  if (otherViewerId !== viewerId && otherPc.signalingState !== 'closed') {
                    guestStream.getTracks().forEach(track => {
                      const senders = otherPc.getSenders();
                      const alreadyAdded = senders.some(s => s.track?.id === track.id);
                      if (!alreadyAdded) {
                        otherPc.addTrack(track, guestStream);
                      }
                    });
                    triggerRenegotiation(otherViewerId);
                  }
                });
              }
            };

            pc.onicecandidate = (event) => {
              if (event.candidate) {
                socket.emit('liveWebrtcIceCandidate', {
                  targetId: viewerId,
                  candidate: event.candidate,
                  senderId: user.id || user._id
                });
              }
            };
          }

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('liveWebrtcOffer', { targetId: viewerId, offer, hostId: user.id || user._id });
        });

        // 5. Handle incoming answers from viewers
        socket.on('receiveWebrtcAnswer', async ({ viewerId, answer }) => {
          const pc = peerConnections.current[viewerId];
          if (pc && pc.signalingState !== 'stable') {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(answer));
            } catch (err) {
              console.error('[Host] setRemoteDescription error:', err);
            }
          }
        });

        // 6. Handle ICE candidates from viewers
        socket.on('receiveWebrtcIceCandidate', async ({ senderId, candidate }) => {
          const pc = peerConnections.current[senderId];
          if (pc && candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.warn('[Host] addIceCandidate error:', err);
            }
          }
        });

        // 5. Handle co-host join requests
        socket.on('coHostRequestReceived', ({ userId, userName, userAvatar }) => {
          if (active) {
            setPendingRequests(prev => {
              if (prev.find(r => r.userId === userId)) return prev;
              return [...prev, { userId, userName, userAvatar }];
            });
            showToast('info', `${userName} requested to join as co-host!`);
          }
        });

        // 6. Handle spectator access requests
        socket.on('liveAccessRequestReceived', ({ userId, userName, userAvatar }) => {
          if (active) {
            setPendingAccessRequests(prev => {
              if (prev.find(r => r.userId === userId)) return prev;
              return [...prev, { userId, userName, userAvatar }];
            });
            showToast('info', `${userName} requested access to watch your private stream!`);
          }
        });

        // 7. Handle co-host leaving voluntarily
        socket.on('coHostLeftNotify', ({ viewerId }) => {
          if (viewerId === coHostIdRef.current) {
            const staleStream = coHostStreamRef.current;
            coHostIdRef.current = null;
            coHostStreamRef.current = null;
            setCoHostStream(null);
            setRemoteStream(null);
            setCoHostId(null);

            const guestTrackIds = staleStream
              ? new Set(staleStream.getTracks().map(t => t.id))
              : new Set();
            Object.entries(peerConnections.current).forEach(([otherViewerId, otherPc]) => {
              if (otherViewerId !== viewerId && otherPc.signalingState !== 'closed') {
                otherPc.getSenders().forEach(sender => {
                  if (sender.track && guestTrackIds.has(sender.track.id)) {
                    otherPc.removeTrack(sender);
                  }
                });
                triggerRenegotiation(otherViewerId);
              }
            });
            showToast('info', 'The guest has left the broadcast.');
          }
        });
      }
    };

    const proceedToJoinViewer = () => {
      const hostId = channelName.replace('live_user_', '');
      const myId = user.id || user._id;

      socket.emit('joinLive', {
        channelName,
        userId: myId,
        userName: user.name,
        userAvatar: user.avatar
      });

      // Remove stale WebRTC listeners before re-registering
      socket.off('receiveWebrtcOffer');
      socket.off('receiveWebrtcIceCandidate');
      socket.off('coHostRequestApproved');
      socket.off('coHostRequestDeclined');
      socket.off('userMuted');
      socket.off('kickedByHost');

      // Create PeerConnection once (guard against duplicate calls)
      let pc = peerConnections.current['host'];
      if (!pc || pc.connectionState === 'closed' || pc.connectionState === 'failed') {
        pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnections.current['host'] = pc;

        pc.onconnectionstatechange = () => {
          console.log('[Viewer WebRTC] state:', pc.connectionState);
        };
        pc.oniceconnectionstatechange = () => {
          console.log('[Viewer ICE]', pc.iceConnectionState);
        };

        // Receive host / guest streams
        pc.ontrack = (event) => {
          if (!active) return;
          if (event.streams && event.streams[0]) {
            const stream = event.streams[0];
            console.log('[Viewer WebRTC] track stream ID:', stream.id);
            
            if (!hostStreamIdRef.current) {
              hostStreamIdRef.current = stream.id;
              setHostStream(stream);
              setRemoteStream(stream); // compatibility fallback
            } else if (stream.id === hostStreamIdRef.current) {
              setHostStream(stream);
              setRemoteStream(stream); // compatibility fallback
            } else {
              setCoHostStream(stream);
            }

            event.track.onended = () => {
              console.log('[Viewer WebRTC] track ended:', event.track.kind);
              if (stream.id !== hostStreamIdRef.current) {
                setCoHostStream(null);
              }
            };

            event.track.onmute = () => {
              console.log('[Viewer WebRTC] track muted:', event.track.kind);
              if (stream.id !== hostStreamIdRef.current) {
                setCoHostStream(null);
              }
            };
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('liveWebrtcIceCandidate', {
              targetId: hostId,
              candidate: event.candidate,
              senderId: myId
            });
          }
        };
      }

      // WebRTC signaling handlers — always re-register on this pc instance
      socket.on('receiveWebrtcOffer', async ({ hostId: senderHostId, offer }) => {
        if (!active) return;
        try {
          // Handle rollback for renegotiation when already have a local description
          if (pc.signalingState === 'have-local-offer') {
            await pc.setLocalDescription({ type: 'rollback' });
          }
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('liveWebrtcAnswer', { targetId: senderHostId, answer, viewerId: myId });
        } catch (err) {
          console.error('[Viewer] WebRTC offer handling error:', err);
        }
      });

      socket.on('receiveWebrtcIceCandidate', async ({ senderId, candidate }) => {
        if (!active || !candidate) return;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[Viewer] addIceCandidate error:', err);
        }
      });

      // Co-host approval
      socket.on('coHostRequestApproved', async () => {
        if (!active) return;
        setCoHostStatus('approved');
        showToast('success', 'Your request to join was approved! Connecting camera...');
        try {
          const vStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          localStreamRef.current = vStream;
          setLocalStream(vStream);
          vStream.getTracks().forEach(track => pc.addTrack(track, vStream));
          // Trigger host renegotiation
          socket.emit('viewerJoinedLive', { channelName, viewerId: myId });
        } catch (err) {
          console.error('Failed to start guest camera:', err);
          showToast('error', 'Could not access camera/mic for co-hosting.');
          setCoHostStatus('idle');
        }
      });

      socket.on('coHostRequestDeclined', () => {
        if (!active) return;
        setCoHostStatus('declined');
        showToast('error', 'The host declined your request to join.');
        setTimeout(() => { if (active) setCoHostStatus('idle'); }, 3000);
      });

      // Moderation
      socket.on('userMuted', ({ userId }) => {
        if (String(userId) === String(myId)) {
          setMutedUsers(prev => [...prev, userId]);
          showToast('warning', 'You have been muted by the host.');
        }
      });

      socket.on('kickedByHost', () => {
        showToast('error', 'You were removed from the stream by the host.');
        navigate('/');
      });

      // Signal host to create an offer for us
      socket.emit('viewerJoinedLive', { channelName, viewerId: myId });

    };

    const startViewer = () => {
      if (!socket || !active) return;

      // ── Remove any stale listeners first to prevent stacking ──────────────
      socket.off('liveAccessStatus');
      socket.off('liveAccessApproved');
      socket.off('liveAccessDeclined');
      socket.off('liveAccessRequired');

      // Handler for access check response
      const handleAccessStatus = ({ approved, mode, reason }) => {
        if (!active) return;
        if (reason === 'stream_not_found') {
          setAccessState('ended');
          showToast('error', 'This live stream does not exist or has ended.');
          return;
        }
        if (approved) {
          // Under free limit or already approved → join immediately
          setAccessState('approved');
          proceedToJoinViewer();
        } else {
          // Private stream or public stream with limit reached → send access request and wait
          setAccessState('pending');
          setPendingReason(reason === 'limit_reached' ? 'limit_reached' : 'private');
          if (reason === 'limit_reached') {
            showToast('info', 'This live stream has reached its free join limit. Requesting access...');
          }
          socket.emit('requestLiveAccess', {
            channelName,
            userId: user.id || user._id,
            userName: user.name,
            userAvatar: user.avatar
          });
        }
      };

      // Handler for when host approves access
      const handleAccessApproved = ({ channelName: approvedChannel }) => {
        if (!active) return;
        if (approvedChannel === channelName) {
          setAccessState('approved');
          proceedToJoinViewer();
        }
      };

      const handleAccessDeclined = ({ channelName: declinedChannel }) => {
        if (!active) return;
        if (declinedChannel === channelName) {
          setAccessState('declined');
          showToast('error', 'Your request to join this private stream was declined.');
        }
      };

      socket.on('liveAccessStatus', handleAccessStatus);
      socket.on('liveAccessApproved', handleAccessApproved);
      socket.on('liveAccessDeclined', handleAccessDeclined);

      // Check access — server will respond with liveAccessStatus
      socket.emit('checkLiveAccess', { channelName, userId: user.id || user._id });
    };

    // Shared Chat Listeners — remove before re-adding to prevent stacking
    if (socket) {
      socket.off('liveMessage');
      socket.off('liveViewerCount');
      socket.off('liveStreamEnded');

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
      if (hasStartedStream) {
        startHost(streamMode);
      }
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

      // Clean up composite canvas loop and AudioContext
      if (drawLoopRef.current) {
        cancelAnimationFrame(drawLoopRef.current);
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }

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
        socket.off('liveAccessStatus');
        socket.off('liveAccessApproved');
        socket.off('liveAccessDeclined');
        socket.off('liveAccessRequired');
        socket.off('liveAccessRequestReceived');
        socket.off('coHostRequestReceived');
        socket.off('coHostRequestApproved');
        socket.off('coHostRequestDeclined');
        socket.off('coHostLeftNotify');
        socket.off('kickedByHost');
        socket.off('userMuted');
      }
    };
  }, [channelName, isHost, socket, hasStartedStream, streamMode]);

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

  const handleLeaveCoHost = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    setCoHostStatus('idle');
    const myId = user.id || user._id;
    if (socket) {
      const pc = peerConnections.current['host'];
      if (pc) {
        pc.getSenders().forEach(sender => {
          if (sender.track) {
            pc.removeTrack(sender);
          }
        });
      }
      socket.emit('leaveCoHost', { channelName, viewerId: myId });
    }
    showToast('info', 'You left the co-host broadcast.');
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

  if (isHost && !hasStartedStream) {
    return (
      <div className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col items-center justify-center p-4 text-white select-none">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-pink-500 via-purple-600 to-red-500" />
          
          <div className="mb-6 relative inline-block">
            <Avatar src={user?.avatar} alt={user?.name} size="2xl" className="mx-auto border-4 border-zinc-800 shadow" />
            <span className="absolute bottom-0 right-2 w-3.5 h-3.5 rounded-full bg-red-600 border-2 border-zinc-900 animate-pulse" />
          </div>

          <h2 className="text-xl font-black text-white mb-1">Set Up Your Live Stream</h2>
          <p className="text-xs text-zinc-400 mb-6 font-semibold">Choose who can join and watch your broadcast in real-time.</p>

          <div className="space-y-3 mb-8 text-left">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 px-1">Broadcast Privacy</label>
            
            {/* Public Mode Option */}
            <button
              onClick={() => setStreamMode('public')}
              className={`w-full p-4 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                streamMode === 'public'
                  ? 'border-red-500 bg-red-500/5 text-white'
                  : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-zinc-300'
              }`}
            >
              <div className="mt-0.5">
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  streamMode === 'public' ? 'border-red-500' : 'border-zinc-600'
                }`}>
                  {streamMode === 'public' && <span className="w-2 h-2 rounded-full bg-red-500" />}
                </span>
              </div>
              <div>
                <p className="text-xs font-black">Public Broadcast</p>
                <p className="text-[10px] opacity-70 mt-0.5 font-semibold">Anyone on the platform can join and watch instantly.</p>
              </div>
            </button>

            {/* Private Mode Option */}
            <button
              onClick={() => setStreamMode('private')}
              className={`w-full p-4 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                streamMode === 'private'
                  ? 'border-red-500 bg-red-500/5 text-white'
                  : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-zinc-300'
              }`}
            >
              <div className="mt-0.5">
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  streamMode === 'private' ? 'border-red-500' : 'border-zinc-600'
                }`}>
                  {streamMode === 'private' && <span className="w-2 h-2 rounded-full bg-red-500" />}
                </span>
              </div>
              <div>
                <p className="text-xs font-black">Private Broadcast (Approval Required)</p>
                <p className="text-[10px] opacity-70 mt-0.5 font-semibold">Viewers must request access; you manually approve them before they join.</p>
              </div>
            </button>

            {/* Free Join Limit Option */}
            {streamMode === 'public' && (
              <div className="space-y-3 mt-4 text-left animate-fade-down">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 px-1">Free Join Limit (TikTok Style)</label>
                <div className="grid grid-cols-3 gap-2">
                  {['unlimited', '5', '10', '20', '50'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFreeJoinLimit(opt)}
                      className={`py-2 px-3 rounded-xl border text-[10px] font-black transition cursor-pointer capitalize ${
                        freeJoinLimit === opt
                          ? 'border-red-500 bg-red-500/10 text-white'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {opt === 'unlimited' ? 'Unlimited' : `${opt} Users`}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-zinc-500 font-semibold px-1 mt-1 leading-normal">Once this limit is reached, any new viewers will require your manual approval to watch the stream.</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setHasStartedStream(true);
              }}
              className="flex-1 py-3.5 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-2xl font-bold text-xs transition shadow-lg shadow-red-900/20 cursor-pointer active:scale-[0.98]"
            >
              Go Live Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isHost && accessState === 'pending') {
    return (
      <div className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col items-center justify-center p-4 text-white select-none">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-pink-500 via-purple-600 to-red-500 animate-pulse" />
          <div className="w-16 h-16 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-400">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
          </div>
          <h2 className="text-base font-black text-white mb-2">
            {pendingReason === 'limit_reached' ? 'Join Limit Reached' : 'Private Broadcast Access'}
          </h2>
          <p className="text-xs text-zinc-400 mb-6 leading-relaxed font-semibold">
            {pendingReason === 'limit_reached'
              ? 'This public stream has reached its free join limit. Your request has been sent to the host.'
              : 'This live stream is private. A request has been sent to the host. Please wait for approval.'}
          </p>
          <div className="flex flex-col gap-2">
            <div className="py-2.5 rounded-xl bg-zinc-950 border border-zinc-850 text-zinc-500 text-[10px] font-bold uppercase tracking-wider animate-pulse">
              Pending Host Approval...
            </div>
            <button
              onClick={() => navigate('/')}
              className="py-3 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-2xl font-bold text-xs transition cursor-pointer"
            >
              Exit to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isHost && accessState === 'declined') {
    return (
      <div className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col items-center justify-center p-4 text-white select-none">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600" />
          <div className="w-12 h-12 rounded-full bg-red-600/10 flex items-center justify-center mx-auto mb-4 text-red-500">
            <FiX size={24} />
          </div>
          <h2 className="text-base font-black text-white mb-2">Access Denied</h2>
          <p className="text-xs text-zinc-400 mb-6 leading-relaxed font-semibold">
            Your request to join this private live stream was declined by the host.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-2xl font-bold text-xs transition cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!isHost && accessState === 'ended') {
    return (
      <div className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col items-center justify-center p-4 text-white select-none">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-zinc-700" />
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-400">
            <FiVideo size={24} />
          </div>
          <h2 className="text-base font-black text-white mb-2">Stream Not Found</h2>
          <p className="text-xs text-zinc-400 mb-6 leading-relaxed font-semibold">
            This live stream has ended or does not exist.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-2xl font-bold text-xs transition cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col md:flex-row select-none">
      {/* ─── Main Video Stream Panel ───────────────────────────── */}
      <div className={`relative flex-1 bg-zinc-950 flex items-center justify-center overflow-hidden transition-all duration-300 ${showMobileChat ? 'pb-[40vh] md:pb-0' : 'pb-0'}`}>
        {/* Render split streams if co-host is active, otherwise render full screen */}
        {(isHost ? !!coHostStream : (coHostStatus === 'approved' || !!coHostStream)) ? (
          <div className="w-full h-full flex flex-col sm:flex-row bg-zinc-950">
            {/* Top/Left Frame: Host Stream */}
            <div className="flex-1 relative bg-black border-b sm:border-b-0 sm:border-r border-sp-border/30">
              <video
                ref={hostVideoRef}
                autoPlay
                playsInline
                muted={isHost}
                className="w-full h-full object-cover animate-fade-in"
                style={{ transform: (isHost && mirrorCamera) ? 'scaleX(-1)' : 'none' }}
              />
              <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-black/60 text-white text-[10px] font-bold z-10">
                {isHost ? 'You (Host)' : 'Host'}
              </span>
            </div>
            {/* Bottom/Right Frame: Guest Stream */}
            <div className="flex-1 relative bg-black">
              <video
                ref={coHostVideoRef}
                autoPlay
                playsInline
                muted={!isHost && coHostStatus === 'approved'}
                className="w-full h-full object-cover animate-fade-in"
                style={{ transform: (!isHost && coHostStatus === 'approved' && mirrorCamera) ? 'scaleX(-1)' : 'none' }}
              />
              <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-black/60 text-white text-[10px] font-bold z-10">
                {isHost ? 'Guest' : (coHostStatus === 'approved' ? 'You (Guest)' : 'Guest')}
              </span>
            </div>
          </div>
        ) : (
          /* Single Stream */
          <video
            ref={hostVideoRef}
            autoPlay
            playsInline
            muted={isHost}
            className="w-full h-full bg-zinc-950 object-cover animate-fade-in"
            style={{ transform: (isHost && mirrorCamera) ? 'scaleX(-1)' : 'none' }}
          />
        )}

        {/* Floating request button for viewers */}
        {!isHost && (
          <div className={`absolute transition-all duration-300 z-20 md:bottom-4 ${showMobileChat ? 'bottom-[calc(40vh+16px)] right-4' : 'bottom-4 right-4'}`}>
            {coHostStatus === 'idle' && (
              <button 
                onClick={() => {
                  setCoHostStatus('requesting');
                  socket.emit('requestCoHost', { channelName, userId: user.id || user._id, userName: user.name, userAvatar: user.avatar });
                  showToast('info', 'Sent request to join as co-host.');
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-sp-blue hover:bg-blue-600 text-white text-xs font-black shadow-lg transition-transform active:scale-95 pointer-events-auto"
              >
                <FiVideo size={14} />
                Request Co-Host
              </button>
            )}
            {coHostStatus === 'requesting' && (
              <span className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-zinc-800 text-zinc-400 text-xs font-bold shadow-lg border border-zinc-700 pointer-events-auto animate-pulse">
                Pending Approval...
              </span>
            )}
            {coHostStatus === 'approved' && (
              <span className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-green-600 text-white text-xs font-bold shadow-lg pointer-events-auto">
                Co-Hosting Active
              </span>
            )}
          </div>
        )}

        {/* Pending Co-Host Approval Request banner for Host */}
        {isHost && pendingRequests.length > 0 && (
          <div className={`absolute left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl z-30 max-w-sm w-full flex items-center justify-between gap-4 animate-bounce pointer-events-auto transition-all duration-300 md:bottom-20 ${showMobileChat ? 'bottom-[calc(40vh+80px)]' : 'bottom-20'}`}>
            <div className="flex items-center gap-3">
              <Avatar src={pendingRequests[0].userAvatar} alt={pendingRequests[0].userName} size="sm" />
              <div className="text-left">
                <p className="text-xs font-bold text-white leading-tight">{pendingRequests[0].userName}</p>
                <p className="text-[10px] text-zinc-400">Wants to join as co-host</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  const targetId = pendingRequests[0].userId;
                  socket.emit('approveCoHost', { channelName, viewerId: targetId });
                  setPendingRequests(prev => prev.filter(r => r.userId !== targetId));
                  showToast('success', 'Approved co-host request.');
                }}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-black text-[10px] rounded-lg transition"
              >
                Accept
              </button>
              <button 
                onClick={() => {
                  const targetId = pendingRequests[0].userId;
                  socket.emit('declineCoHost', { channelName, viewerId: targetId });
                  setPendingRequests(prev => prev.filter(r => r.userId !== targetId));
                  showToast('info', 'Declined request.');
                }}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-[10px] rounded-lg transition"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {/* Pending Viewer Access Requests for Private Live Stream (Host Only) */}
        {isHost && pendingAccessRequests.length > 0 && (
          <div className={`absolute left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl z-30 max-w-sm w-full flex items-center justify-between gap-4 animate-bounce pointer-events-auto transition-all duration-300 md:bottom-36 ${showMobileChat ? 'bottom-[calc(40vh+140px)]' : 'bottom-36'}`}>
            <div className="flex items-center gap-3">
              <Avatar src={pendingAccessRequests[0].userAvatar} alt={pendingAccessRequests[0].userName} size="sm" />
              <div className="text-left">
                <p className="text-xs font-bold text-white leading-tight">{pendingAccessRequests[0].userName}</p>
                <p className="text-[10px] text-zinc-400">Wants to watch your private stream</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  const targetId = pendingAccessRequests[0].userId;
                  socket.emit('approveLiveAccess', { channelName, viewerId: targetId });
                  setPendingAccessRequests(prev => prev.filter(r => r.userId !== targetId));
                  showToast('success', 'Approved viewer access request.');
                }}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-black text-[10px] rounded-lg transition cursor-pointer"
              >
                Approve
              </button>
              <button 
                onClick={() => {
                  const targetId = pendingAccessRequests[0].userId;
                  socket.emit('declineLiveAccess', { channelName, viewerId: targetId });
                  setPendingAccessRequests(prev => prev.filter(r => r.userId !== targetId));
                  showToast('info', 'Declined viewer access request.');
                }}
                className="px-3 py-1.5 bg-zinc-850 hover:bg-zinc-850 text-zinc-400 font-bold text-[10px] rounded-lg transition cursor-pointer"
              >
                Decline
              </button>
            </div>
          </div>
        )}

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
            <span className="flex items-center justify-center px-3 py-1 rounded-full bg-black/45 backdrop-blur text-white text-xs font-semibold">
              {formatDuration(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Chat toggle button for mobile */}
            <button
              onClick={() => setShowMobileChat(prev => !prev)}
              className={`md:hidden w-9 h-9 rounded-full backdrop-blur text-white flex items-center justify-center transition ${showMobileChat ? 'bg-sp-blue hover:bg-blue-600' : 'bg-black/45 hover:bg-black/75'}`}
              title="Toggle Live Chat"
            >
              <FiMessageSquare size={16} />
            </button>

            <button
              onClick={() => isHost ? handleEndStream() : navigate('/')}
              className="w-9 h-9 rounded-full bg-black/45 hover:bg-black/75 backdrop-blur text-white flex items-center justify-center transition"
              title="Leave / End stream"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>

        {/* Bottom controls panel for Host or Approved Co-Host */}
        {(isHost || coHostStatus === 'approved') && (
          <div className={`absolute left-1/2 -translate-x-1/2 flex items-center gap-3.5 z-10 transition-all duration-300 md:bottom-4 ${showMobileChat ? 'bottom-[calc(40vh+16px)]' : 'bottom-4'}`}>
            <button
              onClick={toggleMic}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition shadow-lg cursor-pointer
                ${micEnabled ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
              title={micEnabled ? "Mute Microphone" : "Unmute Microphone"}
            >
              {micEnabled ? <FiMic size={18} /> : <FiMicOff size={18} />}
            </button>
            <button
              onClick={toggleVideo}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition shadow-lg cursor-pointer
                ${videoEnabled ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
              title={videoEnabled ? "Turn Camera Off" : "Turn Camera On"}
            >
              {videoEnabled ? <FiVideo size={18} /> : <FiVideoOff size={18} />}
            </button>
            
            {/* Mirror Camera Preview Toggle */}
            <button
              onClick={() => setMirrorCamera(prev => !prev)}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition shadow-lg cursor-pointer
                ${mirrorCamera ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-zinc-950 text-zinc-500 border border-zinc-800'}`}
              title="Mirror Camera Preview"
            >
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 3h5v5M8 3H3v5M21 3l-7 7M3 3l7 7M18 21h3v-3M6 21H3v-3M21 21l-7-7M3 21l7-7"></path>
              </svg>
            </button>

            {isHost ? (
              <button
                onClick={handleEndStream}
                className="px-5 h-11 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold transition shadow-lg text-xs cursor-pointer active:scale-95"
              >
                End Live
              </button>
            ) : (
              <button
                onClick={handleLeaveCoHost}
                className="px-5 h-11 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-bold transition shadow-lg text-xs cursor-pointer active:scale-95"
              >
                Leave Co-Host
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── Live Comments & Chat sidebar ─────────────────────── */}
      <div className={`w-full border-zinc-800 flex flex-col z-10 transition-all duration-300
        md:w-80 md:h-full md:border-l md:border-t-0 md:relative md:bg-zinc-900
        ${showMobileChat ? 'absolute bottom-0 left-0 right-0 h-[40vh] bg-zinc-950/85 backdrop-blur-md border-t rounded-t-3xl shadow-2xl' : 'hidden md:flex'}`}>
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
                      
                      {/* Host Moderation Controls */}
                      {isHost && msg.user && String(msg.user._id || msg.user.id) !== String(user.id || user._id) && (
                        <span className="inline-flex items-center gap-1.5 ml-2">
                          <button 
                            onClick={() => {
                              const targetUserId = msg.user._id || msg.user.id;
                              socket.emit('muteUser', { channelName, userId: targetUserId });
                              showToast('success', `Muted ${msg.user.name}`);
                            }}
                            className="text-[9px] font-black text-amber-500 hover:text-amber-600 underline cursor-pointer"
                            title="Mute user chat"
                          >
                            Mute
                          </button>
                          <button 
                            onClick={() => {
                              const targetUserId = msg.user._id || msg.user.id;
                              socket.emit('kickUser', { channelName, userId: targetUserId });
                              showToast('success', `Kicked ${msg.user.name} from stream`);
                            }}
                            className="text-[9px] font-black text-red-500 hover:text-red-600 underline cursor-pointer"
                            title="Remove user from stream"
                          >
                            Remove
                          </button>
                        </span>
                      )}

                      <span className="text-zinc-200 ml-0.5 block w-full text-left">
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
          {mutedUsers.includes(user.id || user._id) ? (
            <div className="text-center text-xs py-2 text-zinc-500 font-semibold bg-zinc-950/45 rounded-lg border border-zinc-800 animate-pulse">
              🔇 You have been muted by the host
            </div>
          ) : (
            <TextInputWithEmoji
              value={commentText}
              onChange={setCommentText}
              onSubmit={() => submitLiveComment()}
              onStickerSelect={(url) => submitLiveComment(url)}
              placeholder="Comment live..."
              showAvatar={false}
              panelDirection="above"
            />
          )}
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
