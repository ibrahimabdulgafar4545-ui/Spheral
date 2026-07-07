import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAssetUrl } from '../../utils/helpers';

const COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500', 
  'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500', 
  'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500',
  'bg-pink-500', 'bg-rose-500'
];

function getColor(str) {
  if (!str) return 'bg-gray-500';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLORS.length;
  return COLORS[index];
}

/**
 * Reusable Avatar component with optional online indicator, size variants, and TikTok-style LIVE stream overlays.
 * Usage: <Avatar src={url} alt="Name" size="md" online liveChannel="live_user_123" />
 */
export default function Avatar({ src, alt = '', size = 'md', online = false, className = '', ring = false, liveChannel = null }) {
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl',
    '32': 'w-32 h-32 text-4xl',
  };

  const dotSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
    '2xl': 'w-4 h-4',
    '32': 'w-5 h-5 border-4',
  };

  const showFallback = !src || error;
  const bgColor = getColor(alt);

  const handleClick = (e) => {
    if (liveChannel) {
      e.stopPropagation();
      e.preventDefault();
      navigate(`/live/${liveChannel}`);
    }
  };

  const mainAvatar = (
    <div className={`relative inline-flex items-center justify-center flex-shrink-0 rounded-full`}>
      {showFallback ? (
        <div className={`flex items-center justify-center rounded-full text-white font-bold uppercase select-none border border-sp-border ${bgColor} ${sizes[size] || sizes.md} ${ring ? 'ring-2 ring-sp-blue/40' : ''}`}>
          {alt ? alt.charAt(0) : '?'}
        </div>
      ) : (
        <img
          src={getAssetUrl(src)}
          alt={alt}
          onError={() => setError(true)}
          className={`${sizes[size] || sizes.md} rounded-full object-cover ${ring ? 'ring-2 ring-sp-blue/40' : ''}`}
        />
      )}
      {online && !liveChannel && (
        <div
          className={`${dotSizes[size] || dotSizes.md} absolute bottom-0 right-0 rounded-full bg-green-400 ${size === '32' ? '' : 'border-2'} border-sp-card`}
        />
      )}
    </div>
  );

  if (liveChannel) {
    return (
      <div 
        onClick={handleClick} 
        className={`relative inline-flex flex-shrink-0 items-center justify-center p-[2.5px] rounded-full bg-gradient-to-tr from-pink-500 via-purple-600 to-red-500 shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200 animate-pulse ${className}`}
        title="Tap to join Live stream!"
      >
        <div className="p-[1.5px] bg-sp-card rounded-full flex items-center justify-center">
          {mainAvatar}
        </div>
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-sp-card shadow leading-none uppercase tracking-wide scale-90 z-20">
          LIVE
        </span>
      </div>
    );
  }

  return (
    <div className={`${className} inline-flex flex-shrink-0 rounded-full`}>
      {mainAvatar}
    </div>
  );
}
