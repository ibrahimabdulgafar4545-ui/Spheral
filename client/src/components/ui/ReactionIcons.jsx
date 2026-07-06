import React from 'react';

// CSS Keyframes for Sub-element and Core Emoji Animations
export const ReactionStyles = () => (
  <style>{`
    /* Picker Hover Animations */
    .react-icon-like:hover .like-hand {
      animation: react-thumb-wobble 0.6s ease-in-out infinite;
    }
    .react-icon-love:hover .love-heart {
      animation: react-heartbeat 0.8s ease-in-out infinite;
    }
    .react-icon-care:hover .care-arms-group {
      animation: react-care-hug 1s ease-in-out infinite;
    }
    .react-icon-haha:hover .haha-face-group {
      animation: react-laugh 0.6s ease-in-out infinite;
    }
    .react-icon-haha:hover .haha-eyes {
      animation: haha-eyes-squint 0.6s ease-in-out infinite;
    }
    .react-icon-haha:hover .haha-mouth {
      animation: haha-mouth-shake 0.3s ease-in-out infinite;
    }
    .react-icon-wow:hover .wow-face-group {
      animation: react-gasp 0.7s ease-in-out infinite;
    }
    .react-icon-sad:hover .sad-face-group {
      animation: react-cry-face 1.2s ease-in-out infinite;
    }
    .react-icon-sad:hover .sad-tear {
      animation: react-cry-tear 1.2s ease-in-out infinite;
    }
    .react-icon-angry:hover .angry-face-group {
      animation: react-angry-shake 0.15s linear infinite;
    }

    /* Idle / Selected State Animations (subtle, slow loop) */
    .react-idle-like .like-hand {
      animation: react-thumb-wobble-idle 4s ease-in-out infinite;
    }
    .react-idle-love .love-heart {
      animation: react-heartbeat-idle 3s ease-in-out infinite;
    }
    .react-idle-care .care-arms-group {
      animation: react-care-hug-idle 4s ease-in-out infinite;
    }
    .react-idle-haha .haha-face-group {
      animation: react-laugh-idle 4s ease-in-out infinite;
    }
    .react-idle-wow .wow-face-group {
      animation: react-gasp-idle 3.5s ease-in-out infinite;
    }
    .react-idle-sad .sad-face-group {
      animation: react-cry-face-idle 5s ease-in-out infinite;
    }
    .react-idle-sad .sad-tear {
      animation: react-cry-tear 2.5s ease-in-out infinite;
    }
    .react-idle-angry .angry-face-group {
      animation: react-angry-shake-idle 4s linear infinite;
    }

    /* Keyframe Definitions */
    @keyframes react-thumb-wobble {
      0%, 100% { transform: rotate(0deg) translateY(0); }
      33% { transform: rotate(-15deg) translateY(-3px) scale(1.08); }
      66% { transform: rotate(5deg) translateY(0.5px); }
    }
    @keyframes react-thumb-wobble-idle {
      0%, 80%, 100% { transform: rotate(0deg); }
      90% { transform: rotate(-5deg) translateY(-0.5px); }
    }

    @keyframes react-heartbeat {
      0%, 100% { transform: scale(1); }
      20% { transform: scale(1.22); }
      40% { transform: scale(1.08); }
      60% { transform: scale(1.26); }
      80% { transform: scale(1.04); }
    }
    @keyframes react-heartbeat-idle {
      0%, 75%, 100% { transform: scale(1); }
      85% { transform: scale(1.12); }
      92% { transform: scale(1.04); }
    }

    @keyframes react-care-hug {
      0%, 100% { transform: scale(1) rotate(0); }
      30% { transform: scale(0.93, 1.05) rotate(-6deg); }
      65% { transform: scale(1.05, 0.93) rotate(6deg); }
    }
    @keyframes react-care-hug-idle {
      0%, 80%, 100% { transform: scale(1) rotate(0); }
      90% { transform: scale(0.96, 1.04) rotate(-3deg); }
    }

    @keyframes react-laugh {
      0%, 100% { transform: rotate(0) translateY(0); }
      30% { transform: rotate(-8deg) translateY(-3px); }
      60% { transform: rotate(8deg) translateY(-1px); }
    }
    @keyframes react-laugh-idle {
      0%, 80%, 100% { transform: rotate(0) translateY(0); }
      90% { transform: rotate(-4deg) translateY(-1px); }
    }

    @keyframes haha-eyes-squint {
      0%, 100% { transform: scaleY(1); }
      50% { transform: scaleY(0.6); }
    }
    @keyframes haha-mouth-shake {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.12, 0.88); }
    }

    @keyframes react-gasp {
      0%, 100% { transform: scale(1) translateY(0); }
      45% { transform: scale(1.18) translateY(-2px); }
    }
    @keyframes react-gasp-idle {
      0%, 80%, 100% { transform: scale(1) translateY(0); }
      90% { transform: scale(1.08) translateY(-1px); }
    }

    @keyframes react-cry-face {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(1.5px); }
    }
    @keyframes react-cry-face-idle {
      0%, 80%, 100% { transform: translateY(0); }
      90% { transform: translateY(0.8px); }
    }

    @keyframes react-cry-tear {
      0% { opacity: 0; transform: translateY(-1px) scale(0.6); }
      25% { opacity: 1; }
      80% { opacity: 0.9; transform: translateY(7px) scale(1); }
      100% { opacity: 0; transform: translateY(10px) scale(0.4); }
    }

    @keyframes react-angry-shake {
      0%, 100% { transform: translate(0, 0) rotate(0); }
      20% { transform: translate(-1.2px, 0.8px) rotate(-1.5deg); }
      40% { transform: translate(1.2px, -0.8px) rotate(1.5deg); }
      60% { transform: translate(-0.8px, -1.2px) rotate(-1deg); }
      80% { transform: translate(0.8px, 1.2px) rotate(1deg); }
    }
    @keyframes react-angry-shake-idle {
      0%, 80%, 100% { transform: translate(0, 0) rotate(0); }
      85%, 95% { transform: translate(-0.6px, 0.4px) rotate(-0.5deg); }
      90% { transform: translate(0.6px, -0.4px) rotate(0.5deg); }
    }
  `}</style>
);

const commonSvgProps = (size) => ({
  width: size,
  height: size,
  viewBox: '0 0 36 36',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  style: { filter: 'drop-shadow(0 2.5px 5px rgba(0,0,0,0.16))' }
});

// 1. LIKE (Glossy 3D Blue Circle + Shaded Thumbs Up)
export const LikeIcon = ({ size = 20, isIdle = false }) => (
  <svg {...commonSvgProps(size)} className={isIdle ? 'react-idle-like' : 'react-icon-like'}>
    <defs>
      <radialGradient id="likeBgGrad" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#4facfe" />
        <stop offset="60%" stopColor="#1877F2" />
        <stop offset="100%" stopColor="#0a53be" />
      </radialGradient>
      <linearGradient id="handGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#E6EEF8" />
      </linearGradient>
      <filter id="cuffShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="1" stdDeviation="0.6" floodOpacity="0.15" />
      </filter>
    </defs>
    {/* Vivid Blue Glossy Circle */}
    <circle cx="18" cy="18" r="16.5" fill="url(#likeBgGrad)" stroke="#1466D6" strokeWidth="0.8" />
    
    {/* Inner Glossy Highlight Curve */}
    <path d="M4 14C8 6 18 4 28 8" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.35" />

    {/* Shaded Hand & Thumb */}
    <g className="like-hand" style={{ transformOrigin: '14px 23px' }}>
      {/* Wrist Cuff */}
      <path d="M10 21.5H13.2V27.5H10V21.5Z" fill="#BAC8D9" rx="0.8" filter="url(#cuffShadow)" />
      {/* Hand Body */}
      <path
        d="M13.2 22C13.2 22 15.5 15.2 18.5 12C19.5 10.8 21.2 11.2 21.2 13C21.2 15.2 20 17.5 20 17.5H26.8C28.2 17.5 29 18.5 29 19.8C29 20.6 28.6 21.2 28 21.8C28.8 22.2 29 23.2 29 23.8C29 24.6 28.6 25.2 28 25.8C28.4 26.4 28.4 27.2 28 27.8C27.4 28.5 26.5 28.8 25.5 28.8H18.2C15.8 28.8 13.2 26.8 13.2 22Z"
        fill="url(#handGrad)"
        stroke="#105ECA"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);

// 2. LOVE (Glossy Red heart on transparent background)
export const LoveIcon = ({ size = 20, isIdle = false }) => (
  <svg {...commonSvgProps(size)} className={isIdle ? 'react-idle-love' : 'react-icon-love'}>
    <defs>
      <radialGradient id="loveGrad" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FF7B97" />
        <stop offset="45%" stopColor="#FF2E56" />
        <stop offset="90%" stopColor="#D5001C" />
        <stop offset="100%" stopColor="#9C0010" />
      </radialGradient>
    </defs>
    <g className="love-heart" style={{ transformOrigin: 'center' }}>
      <path
        d="M18 31.5L15.3 29C7.6 22 2.5 17.4 2.5 11.8C2.5 7.2 6.1 3.5 10.7 3.5C13.3 3.5 15.8 4.7 17.4 6.7C19 4.7 21.5 3.5 24.1 3.5C28.7 3.5 32.3 7.2 32.3 11.8C32.3 17.4 27.2 22 19.5 29L18 31.5Z"
        fill="url(#loveGrad)"
        stroke="#A50012"
        strokeWidth="1"
      />
      {/* 3D Reflection curve */}
      <path
        d="M6 11.5C6 7.5 9 5.2 11.8 5.2"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.55"
      />
    </g>
  </svg>
);

// 3. CARE (Smiley hugging red heart - CORRECT variant)
export const CareIcon = ({ size = 20, isIdle = false }) => (
  <svg {...commonSvgProps(size)} className={isIdle ? 'react-idle-care' : 'react-icon-care'}>
    <defs>
      <radialGradient id="careFace" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FFF59D" />
        <stop offset="60%" stopColor="#FFCA28" />
        <stop offset="100%" stopColor="#FFA000" />
      </radialGradient>
      <radialGradient id="careHeartGrad" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FF7A95" />
        <stop offset="100%" stopColor="#D5001C" />
      </radialGradient>
    </defs>
    <g className="care-arms-group" style={{ transformOrigin: '18px 26px' }}>
      {/* Core yellow face */}
      <circle cx="18" cy="18" r="15.5" fill="url(#careFace)" stroke="#E68A00" strokeWidth="0.8" />
      
      {/* Smiling Eyes */}
      <path d="M11.5 15C11.5 15 12.3 13.5 13.8 13.5C15.3 13.5 16 15 16 15" stroke="#4E342E" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 15C20 15 20.7 13.5 22.2 13.5C23.7 13.5 24.5 15 24.5 15" stroke="#4E342E" strokeWidth="2" strokeLinecap="round" />
      
      {/* Smiling Mouth */}
      <path d="M15.5 20C16 21 17 21.8 18 21.8C19 21.8 20 21 20.5 20" stroke="#4E342E" strokeWidth="1.8" strokeLinecap="round" fill="none" />

      {/* Red heart being hugged */}
      <path
        d="M18 25L15 22.2C11.5 19.2 9.5 17.5 9.5 15C9.5 13 11 11.5 13 11.5C14.2 11.5 15.2 12 15.8 12.8C16.4 12 17.4 11.5 18.6 11.5C20.6 11.5 22.1 13 22.1 15C22.1 17.5 20.1 19.2 16.6 22.2L18 25Z"
        fill="url(#careHeartGrad)"
        stroke="#B71C1C"
        strokeWidth="0.6"
      />

      {/* Two arms wrapping around the heart shape */}
      {/* Left arm */}
      <path
        d="M6 18.5C5.2 19 5.5 22.5 7.8 24.2C9.5 25.5 12.2 23.5 12.2 22C12.2 21 9.8 18 6 18.5Z"
        fill="url(#careFace)"
        stroke="#E68A00"
        strokeWidth="0.6"
      />
      {/* Right arm */}
      <path
        d="M30 18.5C30.8 19 30.5 22.5 28.2 24.2C26.5 25.5 23.8 23.5 23.8 22C23.8 21 26.2 18 30 18.5Z"
        fill="url(#careFace)"
        stroke="#E68A00"
        strokeWidth="0.6"
      />
    </g>
  </svg>
);

// 4. HAHA (Squinting laughing face + Glossy gradient)
export const HahaIcon = ({ size = 20, isIdle = false }) => (
  <svg {...commonSvgProps(size)} className={isIdle ? 'react-idle-haha' : 'react-icon-haha'}>
    <defs>
      <radialGradient id="hahaFace" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FFF59D" />
        <stop offset="60%" stopColor="#FBC02D" />
        <stop offset="100%" stopColor="#F57F17" />
      </radialGradient>
    </defs>
    <g className="haha-face-group" style={{ transformOrigin: 'center' }}>
      <circle cx="18" cy="18" r="15.5" fill="url(#hahaFace)" stroke="#E67E22" strokeWidth="0.8" />
      
      {/* Squinting Eyes */}
      <g className="haha-eyes" style={{ transformOrigin: '18px 15px' }}>
        <path d="M10 13.5L14.2 16L10 18.5" stroke="#3E2723" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M26 13.5L21.8 16L26 18.5" stroke="#3E2723" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
      
      {/* Laughing Mouth */}
      <g className="haha-mouth" style={{ transformOrigin: '18px 23px' }}>
        <path d="M11 19.5C11 19.5 12.5 27 18 27C23.5 27 25 19.5 25 19.5H11Z" fill="#3E2723" />
        <path d="M14.2 23.5C15.8 26.2 20.2 26.2 21.8 23.5H14.2Z" fill="#FF5252" />
      </g>
    </g>
  </svg>
);

// 5. WOW (Surprised face + gasp + Glossy gradient)
export const WowIcon = ({ size = 20, isIdle = false }) => (
  <svg {...commonSvgProps(size)} className={isIdle ? 'react-idle-wow' : 'react-icon-wow'}>
    <defs>
      <radialGradient id="wowFace" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FFF9C4" />
        <stop offset="60%" stopColor="#FBC02D" />
        <stop offset="100%" stopColor="#E65100" />
      </radialGradient>
    </defs>
    <g className="wow-face-group" style={{ transformOrigin: 'center' }}>
      <circle cx="18" cy="18" r="15.5" fill="url(#wowFace)" stroke="#D84315" strokeWidth="0.8" />
      
      {/* Big Surprised Eyes */}
      <ellipse cx="12" cy="13.5" rx="2.5" ry="4.5" fill="#3E2723" />
      <ellipse cx="24" cy="13.5" rx="2.5" ry="4.5" fill="#3E2723" />
      <circle cx="11.5" cy="12.5" r="0.8" fill="#FFFFFF" />
      <circle cx="23.5" cy="12.5" r="0.8" fill="#FFFFFF" />

      {/* Surprised eyebrows */}
      <path d="M8.5 7.5C10.5 6.2 13 7.5 13 7.5" stroke="#3E2723" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M23 7.5C23 7.5 25.5 6.2 27.5 7.5" stroke="#3E2723" strokeWidth="2" strokeLinecap="round" fill="none" />
      
      {/* Gasp Mouth */}
      <ellipse cx="18" cy="24" rx="4.8" ry="6.8" fill="#3E2723" />
    </g>
  </svg>
);

// 6. SAD (Crying face + drop shadow + tear drop animation)
export const SadIcon = ({ size = 20, isIdle = false }) => (
  <svg {...commonSvgProps(size)} className={isIdle ? 'react-idle-sad' : 'react-icon-sad'}>
    <defs>
      <radialGradient id="sadFace" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FFF9C4" />
        <stop offset="65%" stopColor="#FFA726" />
        <stop offset="100%" stopColor="#F57C00" />
      </radialGradient>
      <linearGradient id="tearBlue" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#80D8FF" />
        <stop offset="100%" stopColor="#00B0FF" />
      </linearGradient>
    </defs>
    <g className="sad-face-group" style={{ transformOrigin: 'center' }}>
      <circle cx="18" cy="18" r="15.5" fill="url(#sadFace)" stroke="#EF6C00" strokeWidth="0.8" />
      
      {/* Downcast Eyebrows */}
      <path d="M8.5 12.5C10.5 11 13 12 13 12" stroke="#3E2723" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M23 12C23 12 25.5 11 27.5 12.5" stroke="#3E2723" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      
      {/* Downward eyes */}
      <circle cx="12.5" cy="15.8" r="2" fill="#3E2723" />
      <circle cx="23.5" cy="15.8" r="2" fill="#3E2723" />
      
      {/* Sad Frowning Mouth */}
      <path d="M13.5 23.5C15.5 21.5 20.5 21.5 22.5 23.5" stroke="#3E2723" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      
      {/* Flowing Tear */}
      <path
        className="sad-tear"
        d="M10 18.5C10 18.5 8.2 21.5 9.2 23C10.2 24.5 11.2 24.5 11.2 23C11.2 21.5 10 18.5 10 18.5Z"
        fill="url(#tearBlue)"
        style={{ transformOrigin: '10px 18.5px' }}
      />
    </g>
  </svg>
);

// 7. ANGRY (Glossy red face with fuming brows)
export const AngryIcon = ({ size = 20, isIdle = false }) => (
  <svg {...commonSvgProps(size)} className={isIdle ? 'react-idle-angry' : 'react-icon-angry'}>
    <defs>
      <radialGradient id="angryFace" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FF8A80" />
        <stop offset="60%" stopColor="#FF3D00" />
        <stop offset="100%" stopColor="#BF360C" />
      </radialGradient>
    </defs>
    <g className="angry-face-group" style={{ transformOrigin: 'center' }}>
      <circle cx="18" cy="18" r="15.5" fill="url(#angryFace)" stroke="#D84315" strokeWidth="0.8" />
      
      {/* Frowning Angled Eyebrows */}
      <path d="M9 11L14 14" stroke="#2D1510" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M27 11L22 14" stroke="#2D1510" strokeWidth="2.8" strokeLinecap="round" />
      
      {/* Angry Glaring Eyes */}
      <circle cx="12.5" cy="16.5" r="2" fill="#2D1510" />
      <circle cx="23.5" cy="16.5" r="2" fill="#2D1510" />
      
      {/* Angry Frown Mouth */}
      <path d="M13 24.2C15.5 21.5 20.5 21.5 23 24.2" stroke="#2D1510" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </g>
  </svg>
);

// Map type -> component
export const getReactionIcon = (type, size = 20, isIdle = false) => {
  switch (type) {
    case 'like':   return <LikeIcon size={size} isIdle={isIdle} />;
    case 'love':   return <LoveIcon size={size} isIdle={isIdle} />;
    case 'care':   return <CareIcon size={size} isIdle={isIdle} />;
    case 'haha':   return <HahaIcon size={size} isIdle={isIdle} />;
    case 'wow':    return <WowIcon size={size} isIdle={isIdle} />;
    case 'sad':    return <SadIcon size={size} isIdle={isIdle} />;
    case 'angry':  return <AngryIcon size={size} isIdle={isIdle} />;
    default:       return null;
  }
};
