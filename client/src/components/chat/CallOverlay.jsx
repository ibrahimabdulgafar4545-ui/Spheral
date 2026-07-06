import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiPhone, FiPhoneOff, FiVideo, FiVideoOff, FiMic, FiMicOff, FiVolume2 } from 'react-icons/fi';
import AgoraRTC from 'agora-rtc-sdk-ng';
import Avatar from '../ui/Avatar';

// Use environment variable or default temporary App ID
const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID || '109f352202884564ab396c732df1364e'; 

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
      this.intervalId = setInterval(playRing, 6000);
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
      gain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime + 1.2);
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
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(!callData?.video);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef(null);

  // Agora refs
  const agoraClientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const [remoteUser, setRemoteUser] = useState(null);

  // Fallback Camera Stream ref (if Agora fails or is mock)
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localMediaStreamRef = useRef(null);
  const [isMockCall, setIsMockCall] = useState(false);

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

  // Handle Agora WebRTC Connection
  useEffect(() => {
    if (callState !== 'connected') return;

    let active = true;

    const startAgora = async () => {
      try {
        // 1. Initialize Agora client
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        agoraClientRef.current = client;

        // 2. Setup event listeners
        client.on('user-published', async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          if (mediaType === 'video') {
            setRemoteUser(user);
            setTimeout(() => {
              user.videoTrack?.play('remote-video-container');
            }, 100);
          }
          if (mediaType === 'audio') {
            user.audioTrack?.play();
          }
        });

        client.on('user-unpublished', (user) => {
          if (user.uid === remoteUser?.uid) {
            setRemoteUser(null);
          }
        });

        // 3. Join the Agora Channel
        // We use a temp token or null (if Agora App ID runs in testing mode without token verification)
        await client.join(AGORA_APP_ID, callData.channelName, null, currentUser.id || currentUser._id);

        // 4. Create and publish local tracks
        const tracks = [];
        localAudioTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack();
        tracks.push(localAudioTrackRef.current);

        if (callData.video) {
          localVideoTrackRef.current = await AgoraRTC.createCameraVideoTrack();
          tracks.push(localVideoTrackRef.current);
          setTimeout(() => {
            localVideoTrackRef.current?.play('local-video-container');
          }, 100);
        }

        if (active) {
          await client.publish(tracks);
          console.log('Agora RTC channel published successfully!');
        }
      } catch (err) {
        console.warn('Agora connection failed. Falling back to Mock local WebRTC preview.', err);
        if (active) {
          setupMockCall();
        }
      }
    };

    const setupMockCall = async () => {
      setIsMockCall(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: callData.video,
          audio: true
        });
        localMediaStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        // Mock remote camera preview (using local stream as simulated remote feedback)
        setTimeout(() => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
        }, 1500);
      } catch (err) {
        console.error('Camera access denied:', err);
      }
    };

    startAgora();

    // Cleanup on EndCall
    return () => {
      active = false;
      cleanupAgora();
    };
  }, [callState]);

  // Bind media stream to video elements once they are rendered in DOM
  useEffect(() => {
    if (isMockCall && localMediaStreamRef.current) {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localMediaStreamRef.current;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = localMediaStreamRef.current;
      }
    }
  }, [isMockCall, callState, videoOff]);

  const cleanupAgora = async () => {
    // Agora Tracks cleanup
    try {
      localAudioTrackRef.current?.stop();
      localAudioTrackRef.current?.close();
      localVideoTrackRef.current?.stop();
      localVideoTrackRef.current?.close();
    } catch (e) {
      console.error(e);
    }

    try {
      if (agoraClientRef.current) {
        await agoraClientRef.current.leave();
      }
    } catch (e) {
      console.error(e);
    }

    // Mock stream cleanup
    if (localMediaStreamRef.current) {
      localMediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const toggleMute = () => {
    const nextState = !muted;
    setMuted(nextState);
    if (isMockCall) {
      if (localMediaStreamRef.current) {
        localMediaStreamRef.current.getAudioTracks().forEach(track => {
          track.enabled = !nextState;
        });
      }
    } else {
      localAudioTrackRef.current?.setEnabled(!nextState);
    }
  };

  const toggleVideo = () => {
    const nextState = !videoOff;
    setVideoOff(nextState);
    if (isMockCall) {
      if (localMediaStreamRef.current) {
        localMediaStreamRef.current.getVideoTracks().forEach(track => {
          track.enabled = !nextState;
        });
      }
    } else {
      localVideoTrackRef.current?.setEnabled(!nextState);
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
          <div className="px-3 py-1 bg-white/10 rounded-full text-xs font-semibold backdrop-blur-sm">
            {isMockCall ? 'Mock WebRTC Connection' : 'Agora RTC Room Connected'}
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
          <div className="relative w-full h-full">
            {/* Remote Stream Container */}
            {callData.video && (
              <div className="w-full h-full flex items-center justify-center">
                {isMockCall ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : (
                  <div id="remote-video-container" className="w-full h-full bg-black" />
                )}
                {(!isMockCall && !remoteUser) && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                    Waiting for user to share camera...
                  </div>
                )}
              </div>
            )}

            {/* Local Stream Container (Picture in Picture) */}
            {callData.video && !videoOff && (
              <div className="absolute bottom-4 right-4 w-32 h-44 rounded-xl overflow-hidden border border-white/20 bg-black shadow-card-lg z-10">
                {isMockCall ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : (
                  <div id="local-video-container" className="w-full h-full" />
                )}
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
