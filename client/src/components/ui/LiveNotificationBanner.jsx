import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Avatar from './Avatar';

export default function LiveNotificationBanner() {
  const { activeLiveStreams } = useApp();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(new Set());

  const visible = activeLiveStreams.filter(s => !dismissed.has(s.channelName));

  if (!visible.length) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none w-full max-w-sm px-4">
      {visible.map((stream) => (
        <div
          key={stream.channelName}
          className="pointer-events-auto w-full animate-slide-down"
        >
          <div
            className="flex items-center gap-3 bg-sp-card/95 backdrop-blur-xl border border-red-500/40 shadow-[0_8px_32px_rgba(220,38,38,0.3)] rounded-2xl px-4 py-3 cursor-pointer hover:border-red-500/70 transition-all duration-200"
            onClick={() => {
              navigate(`/live/${stream.channelName}`);
              setDismissed(prev => new Set([...prev, stream.channelName]));
            }}
          >
            <div className="relative flex-shrink-0">
              <Avatar src={stream.hostAvatar} alt={stream.hostName} className="w-10 h-10 border-2 border-red-500" />
              <span className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[8px] font-black px-1 py-0.5 rounded uppercase animate-pulse leading-none">
                LIVE
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-sp-text truncate">{stream.hostName}</p>
              <p className="text-xs text-sp-muted">is live now — tap to join</p>
            </div>
            <div className="flex-shrink-0 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors">
              Join
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDismissed(prev => new Set([...prev, stream.channelName]));
              }}
              className="flex-shrink-0 text-sp-muted hover:text-sp-text ml-1"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
