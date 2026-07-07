import React, { useState, useRef, useEffect } from 'react';
import {
  ReactionStyles,
  LikeIcon,
  LoveIcon,
  CareIcon,
  HahaIcon,
  WowIcon,
  SadIcon,
  AngryIcon
} from './ReactionIcons';

/**
 * ReactionPicker – hover/long‑press UI wrapper for choosing a reaction.
 * Props:
 *   onSelect (type: string) => void – called with the chosen reaction type.
 *   current (string|null) – currently selected reaction to highlight.
 *   children - the trigger button/element.
 *   positionClass - custom CSS classes for absolute positioning.
 */
const REACTIONS = [
  { type: 'like',   component: LikeIcon,  glowClass: 'hover:shadow-[0_0_15px_rgba(24,119,242,0.65)] hover:bg-blue-500/10' },
  { type: 'love',   component: LoveIcon,  glowClass: 'hover:shadow-[0_0_15px_rgba(245,48,84,0.65)] hover:bg-red-500/10' },
  { type: 'care',   component: CareIcon,  glowClass: 'hover:shadow-[0_0_15px_rgba(255,179,0,0.65)] hover:bg-amber-500/10' },
  { type: 'haha',   component: HahaIcon,  glowClass: 'hover:shadow-[0_0_15px_rgba(251,192,45,0.65)] hover:bg-yellow-500/10' },
  { type: 'wow',    component: WowIcon,   glowClass: 'hover:shadow-[0_0_15px_rgba(245,127,23,0.65)] hover:bg-orange-500/10' },
  { type: 'sad',    component: SadIcon,   glowClass: 'hover:shadow-[0_0_15px_rgba(0,176,255,0.65)] hover:bg-sky-500/10' },
  { type: 'angry',  component: AngryIcon, glowClass: 'hover:shadow-[0_0_15px_rgba(221,44,0,0.65)] hover:bg-red-600/10' },
];

export default function ReactionPicker({ onSelect, current, children, positionClass = 'left-1/2 -translate-x-1/2' }) {
  const [visible, setVisible] = useState(false);
  const [dynamicStyle, setDynamicStyle] = useState({ minWidth: '340px' });
  const timerRef = useRef(null);
  const pickerRef = useRef(null);
  const wrapperRef = useRef(null);

  // Desktop hover trigger
  const handleMouseEnter = () => {
    clearTimeout(timerRef.current);
    if (!visible) {
      timerRef.current = setTimeout(() => setVisible(true), 200);
    }
  };
  const handleMouseLeave = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVisible(false);
    }, 350); 
  };

  // Mobile long‑press trigger
  const handleTouchStart = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(true), 500);
  };
  const handleTouchEnd = () => clearTimeout(timerRef.current);

  // Click‑outside to close
  useEffect(() => {
    const onClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setVisible(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Smart positioning logic
  useEffect(() => {
    if (visible && pickerRef.current && wrapperRef.current) {
      const wrapperRect = wrapperRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      
      let newStyle = { minWidth: '340px', zIndex: 999999 }; // Extremely high z-index to beat dropdowns

      // Base position based on props
      if (positionClass.includes('right-0')) {
        newStyle.right = '0';
        newStyle.left = 'auto';
      } else if (positionClass.includes('left-0')) {
        newStyle.left = '0';
        newStyle.right = 'auto';
      } else {
        newStyle.left = '50%';
        newStyle.transform = 'translateX(-50%)';
      }

      // Edge detection and flipping
      // If expanding right pushes it off screen:
      if (wrapperRect.left + 340 > viewportWidth) {
        newStyle.right = '0';
        newStyle.left = 'auto';
        newStyle.transform = 'none';
      }
      // If expanding left pushes it off screen:
      if (wrapperRect.right - 340 < 0) {
        newStyle.left = '0';
        newStyle.right = 'auto';
        newStyle.transform = 'none';
      }

      // Vertical overflow: if close to top edge, flip to bottom
      if (wrapperRect.top < 80) {
        newStyle.top = '100%';
        newStyle.marginTop = '10px';
      } else {
        newStyle.bottom = '100%';
        newStyle.marginBottom = '10px';
      }

      setDynamicStyle(newStyle);
    }
  }, [visible, positionClass]);

  return (
    <div
      ref={wrapperRef}
      className={`relative inline-block w-full ${visible ? 'z-[99999]' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Dynamic injection of reaction keyframes styling */}
      <ReactionStyles />

      {visible && (
        <div
          ref={pickerRef}
          className={`absolute flex space-x-1 sm:space-x-2 bg-gradient-to-b from-sp-card to-sp-bg backdrop-blur-md rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.5)] p-2 animate-scale-in`}
          style={dynamicStyle}
        >
          {REACTIONS.map((r) => {
            const IconComponent = r.component;
            return (
              <button
                key={r.type}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(r.type);
                  setVisible(false);
                }}
                className={`flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 hover:scale-125 ${r.glowClass} ${current === r.type ? 'ring-2 ring-sp-blue bg-sp-blue/15' : ''}`}
              >
                {/* Custom animated SVGs */}
                <IconComponent size={26} isIdle={false} />
              </button>
            );
          })}
        </div>
      )}
      {children}
    </div>
  );
}
