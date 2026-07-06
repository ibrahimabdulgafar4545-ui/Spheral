import { useState } from 'react';
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
 * Reusable Avatar component with optional online indicator and size variants.
 * Usage: <Avatar src={url} alt="Name" size="md" online />
 */
export default function Avatar({ src, alt = '', size = 'md', online = false, className = '', ring = false }) {
  const [error, setError] = useState(false);

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

  return (
    <div className={`relative inline-flex items-center justify-center flex-shrink-0 rounded-full ${className}`}>
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
      {online && (
        <div
          className={`${dotSizes[size] || dotSizes.md} absolute bottom-0 right-0 rounded-full bg-green-400 ${size === '32' ? '' : 'border-2'} border-sp-card`}
        />
      )}
    </div>
  );
}
