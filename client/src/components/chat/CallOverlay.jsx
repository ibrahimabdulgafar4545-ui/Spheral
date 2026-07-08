import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiPhone, FiPhoneOff, FiVideo, FiVideoOff, FiMic, FiMicOff, FiVolume2, FiCameraOff } from 'react-icons/fi';
import Avatar from '../ui/Avatar';
import { useApp } from '../../context/AppContext';

class ToneGenerator {
  constructor() {
    this.ctx = null;
    this.oscillators = [];
    this.gainNode = null;
    this.intervalId = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playIncoming() {
    this.init();
    this.stop();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const playRing = () => {
      if (!this.ctx) return;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.value = 440;
      osc2.frequency.value = 480;

      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime + 2.0);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2.1);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();

      osc1.stop(this.ctx.currentTime + 2.1);
      osc2.stop(this.ctx.currentTime + 2.1);

      this.oscillators = [osc1, osc2];
      this.gainNode = gain;
    };

    try {
      playRing();
      this.intervalId = setInterval(playRing, 3000);
    } catch (e) {
      console.warn('ToneGenerator failed to start:', e);
    }
  }

  playOutgoing() {
    this.init();
    this.stop();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const playBeep = () => {
      if (!this.ctx) return;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.value = 400;
      osc2.frequency.value = 450;

      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime + 1.2);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();

      osc1.stop(this.ctx.currentTime + 1.3);
      osc2.stop(this.ctx.currentTime + 1.3);

      this.oscillators = [osc1, osc2];
      this.gainNode = gain;
    };

    try {
      playBeep();
      this.intervalId = setInterval(playBeep, 4000);
    } catch (e) {
      console.warn('ToneGenerator failed to start:', e);
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.oscillators.forEach(osc => {
      try { osc.stop(); } catch(e){}
    });
    this.oscillators = [];
    if (this.gainNode) {
      try { this.gainNode.disconnect(); } catch(e){}
      this.gainNode = null;
    }
  }
}

const toneGenerator = new ToneGenerator();

export default function CallOverlay({ callData, callState, onAccept, onDecline, onEnd, currentUser }) {
  const { socket } = useApp();
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(!callData?.video);
  const [cameraError, setCameraError] = useState(false);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef(null);

  // WebRTC refs
  const peerConnectionRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localMediaStreamRef = useRef(null);

  // Format call duration
  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Call duration timer
  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [callState]);

  // Handle ringtones based on callState
  useEffect(() => {
    if (callState === 'ringing') {
      if (callData?.incoming) {
        toneGenerator.playIncoming();
      } else {
        toneGenerator.playOutgoing();
      }
    } else if (callState === 'calling') {
      toneGenerator.playOutgoing();
    } else {
      toneGenerator.stop();
    }
    return () => toneGenerator.stop();
  }, [callState, callData]);

  // Outgoing call timeout (30 seconds)
  useEffect(() => {
    let timeoutId;
    if ((callState === 'calling' || callState === 'ringing') && callData && !callData.incoming) {
      timeoutId = setTimeout(() => {
        onEnd();
        console.log("Call timed out: user did not answer");
      }, 30000);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [callState, callData, onEnd]);

  // Handle Native WebRTC Connection (P2P Calling without Agora)
  useEffect(() => {
    if (callState !== 'connected') return;
    if (!socket) return;

    let active = true;
    const targetPeerId = callData.incoming ? callData.callerId : callData.recipientId;

    const startWebRTCCall = async () => {
      let localStreamReadyResolve;
      const localStreamReadyPromise = new Promise((resolve) => {
        localStreamReadyResolve = resolve;
      });

      try {
        // 1. Create RTCPeerConnection synchronously
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
            { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
            { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
          ],
          iceCandidatePoolSize: 10
        });
        peerConnectionRef.current = pc;

        pc.onconnectionstatechange = () => {
          console.log('[Call WebRTC] connection:', pc.connectionState);
          if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            console.warn('[Call WebRTC] Connection failed/disconnected — attempting ICE restart');
            if (pc.restartIce) pc.restartIce();
          }
        };
        pc.oniceconnectionstatechange = () => {
          console.log('[Call ICE]', pc.iceConnectionState);
        };
        pc.onicegatheringstatechange = () => {
          console.log('[Call ICE Gathering]', pc.iceGatheringState);
        };

        // 2. Setup incoming track handler (bind event.streams[0] to source)
        pc.ontrack = (event) => {
          if (!active) return;
          console.log('[Call WebRTC] Remote track received:', event.track.kind);
          const stream = (event.streams && event.streams[0]) ? event.streams[0] : null;
          if (!stream) return;

          if (callData.video) {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = stream;
              remoteVideoRef.current.play().catch(e => console.warn("Video play failed:", e));
            }
          } else {
            if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = stream;
              remoteAudioRef.current.play().catch(e => console.warn("Audio play failed:", e));
            }
          }
        };

        // 3. ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate && socket && active) {
            socket.emit('callIceCandidate', { targetId: targetPeerId, candidate: event.candidate });
          }
        };

        // 4. Remove stale socket listeners before adding new ones
        socket.off('receiveCallOffer');
        socket.off('receiveCallAnswer');
        socket.off('receiveCallIceCandidate');

        // 5. Setup signaling queues & handlers
        const iceQueue = [];
        const processIceQueue = async () => {
          while (iceQueue.length > 0) {
            const cand = iceQueue.shift();
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {
              console.warn('[Call] Deferred addIceCandidate error:', e);
            }
          }
        };

        socket.on('receiveCallOffer', async ({ offer, senderId }) => {
          if (!active || String(senderId) !== String(targetPeerId)) return;
          try {
            // Wait for local stream tracks to be added first
            await localStreamReadyPromise;

            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('callAnswer', { targetId: targetPeerId, answer });
            await processIceQueue();
          } catch (e) {
            console.error('[Call] Error handling offer:', e);
          }
        });

        socket.on('receiveCallAnswer', async ({ answer, senderId }) => {
          if (!active || String(senderId) !== String(targetPeerId)) return;
          try {
            if (pc.signalingState !== 'stable') {
              await pc.setRemoteDescription(new RTCSessionDescription(answer));
              await processIceQueue();
            }
          } catch (e) {
            console.error('[Call] Error handling answer:', e);
          }
        });

        socket.on('receiveCallIceCandidate', async ({ candidate, senderId }) => {
          if (!active || String(senderId) !== String(targetPeerId) || !candidate) return;
          try {
            if (pc.remoteDescription && pc.remoteDescription.type) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
              iceQueue.push(candidate);
            }
          } catch (e) {
            console.warn('[Call] addIceCandidate error:', e);
          }
        });

        // 6. Get local media stream asynchronously
        const constraints = {
          audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 },
          video: callData.video
            ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
            : false
        };

        try {
          const localStream = await navigator.mediaDevices.getUserMedia(constraints);
          if (active) {
            localMediaStreamRef.current = localStream;
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStream;
            }
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
          }
        } catch (err) {
          console.error('[Call] getUserMedia failed:', err);
          if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') {
            setCameraError(true);
            setVideoOff(true);
            // Try audio-only fallback
            if (callData.video) {
              try {
                const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
                if (active) {
                  localMediaStreamRef.current = audioOnly;
                  audioOnly.getTracks().forEach(t => pc.addTrack(t, audioOnly));
                }
              } catch {}
            }
          }
        } finally {
          localStreamReadyResolve();
        }

        // 7. Caller creates and sends offer (after a small delay to let the callee setup)
        if (!callData.incoming) {
          setTimeout(async () => {
            if (!active) return;
            try {
              // Ensure we wait for local media stream to be ready first
              await localStreamReadyPromise;
              const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: !!callData.video });
              await pc.setLocalDescription(offer);
              socket.emit('callOffer', { targetId: targetPeerId, offer });
            } catch (err) {
              console.error('[Call] Error creating offer:', err);
            }
          }, 600);
        }

      } catch (err) {
        console.error('[Call] WebRTC initialization failed:', err);
        localStreamReadyResolve();
      }
    };

    startWebRTCCall();

    return () => {
      active = false;
      cleanupWebRTCCall();
    };
  }, [callState]);

  const cleanupWebRTCCall = () => {
    if (localMediaStreamRef.current) {
      localMediaStreamRef.current.getTracks().forEach(track => track.stop());
      localMediaStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (socket) {
      socket.off('receiveCallOffer');
      socket.off('receiveCallAnswer');
      socket.off('receiveCallIceCandidate');
    }
    // Clear video elements
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  };


  const toggleMute = () => {
    const nextState = !muted;
    setMuted(nextState);
    if (localMediaStreamRef.current) {
      localMediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !nextState;
      });
    }
  };

  const toggleVideo = () => {
    const nextState = !videoOff;
    setVideoOff(nextState);
    if (localMediaStreamRef.current) {
      localMediaStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !nextState;
      });
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (callState === 'idle' || !callData) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-md flex flex-col p-4 animate-fade-in select-none text-white">
      {/* Top Bar: Caller / Receiver Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar
            src={callData.incoming ? callData.callerAvatar : callData.recipientAvatar}
            alt={callData.incoming ? callData.callerName : callData.recipientName}
            size="lg"
            className="border border-white/20"
          />
          <div>
            <h3 className="font-bold text-base">
              {callData.incoming ? callData.callerName : callData.recipientName}
            </h3>
            <p className="text-xs text-gray-400">
              {callState === 'ringing' ? 'Incoming Ringing...' : callState === 'calling' ? 'Calling...' : `Connected DMs · ${formatDuration(duration)}`}
            </p>
          </div>
        </div>

        {callState === 'connected' && (
          <div className="px-3 py-1 bg-gradient-to-r from-sp-blue to-purple-600 rounded-full text-xs font-semibold backdrop-blur-sm animate-pulse">
            Secure WebRTC Connection
          </div>
        )}
      </div>

      {/* Media Feed Area */}
      <div className="flex-1 my-6 flex items-center justify-center relative rounded-2xl bg-gray-900 overflow-hidden border border-white/10">
        {callState === 'ringing' || callState === 'calling' ? (
          <div className="text-center animate-pulse">
            <Avatar
              src={callData.incoming ? callData.callerAvatar : callData.recipientAvatar}
              alt={callData.incoming ? callData.callerName : callData.recipientName}
              size="2xl"
              className="mx-auto border-4 border-sp-blue shadow-glow mb-4"
            />
            <p className="text-sm font-semibold tracking-wider text-sp-blue uppercase">
              {callData.video ? 'Video Call' : 'Audio Call'}
            </p>
          </div>
        ) : (
          /* Connected State: Render Streams */
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            {/* Remote Video Stream */}
            {callData.video && (
              <div className="w-full h-full flex items-center justify-center bg-black relative">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay for Remote Camera Off */}
                {videoOff && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                    <FiCameraOff size={32} className="text-white/50 mb-2 animate-pulse" />
                    <span className="text-white/70 text-sm font-medium">
                      Camera Off
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Hidden audio element to play incoming audio during audio-only calls */}
            {!callData.video && (
              <audio ref={remoteAudioRef} autoPlay playsInline />
            )}

            {/* Local Stream Container (Picture in Picture) */}
            {callData.video && !videoOff && (
              <div className="absolute bottom-4 right-4 w-32 h-44 rounded-xl overflow-hidden border border-white/20 bg-black shadow-card-lg z-10">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              </div>
            )}

            {/* Audio call display (if video is disabled or camera off) */}
            {(!callData.video || videoOff) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Avatar
                  src={callData.incoming ? callData.callerAvatar : callData.recipientAvatar}
                  alt={callData.incoming ? callData.callerName : callData.recipientName}
                  size="2xl"
                  className="border-2 border-white/20 mb-4"
                />
                <div className="flex gap-2 items-center text-sm text-gray-400">
                  <FiVolume2 className="text-sp-blue animate-bounce" /> Audio streaming active
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Bar: Action Controls */}
      <div className="flex items-center justify-center gap-6 py-4">
        {/* Ringing incoming options */}
        {callState === 'ringing' && callData.incoming ? (
          <>
            <button
              onClick={onAccept}
              className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white transition-all shadow-glow hover:scale-105"
            >
              <FiPhone size={24} />
            </button>
            <button
              onClick={onDecline}
              className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-all shadow-glow hover:scale-105"
            >
              <FiPhoneOff size={24} />
            </button>
          </>
        ) : (
          /* Active Call Options */
          <>
            <button
              onClick={toggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all
                ${muted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'}`}
            >
              {muted ? <FiMicOff size={18} /> : <FiMic size={18} />}
            </button>

            {callData?.video && (
              <button
                onClick={toggleVideo}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all
                  ${videoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'}`}
              >
                {videoOff ? <FiVideoOff size={18} /> : <FiVideo size={18} />}
              </button>
            )}

            <button
              onClick={onEnd}
              className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-all shadow-glow"
            >
              <FiPhoneOff size={24} />
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
