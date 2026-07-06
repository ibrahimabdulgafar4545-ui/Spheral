/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  // Enable RTL variant — works with dir="rtl" on the html element
  // Allows classes like rtl:flex-row-reverse, rtl:text-right, rtl:space-x-reverse
  theme: {
    extend: {
      colors: {
        sp: {
          // Backgrounds
          bg:       'var(--sp-bg)',
          surface:  'var(--sp-surface)',
          card:     'var(--sp-card)',
          elevated: 'var(--sp-elevated)',
          overlay:  'var(--sp-overlay)',
          hover:    'var(--sp-hover)',
          active:   'var(--sp-active)',
          border:   'var(--sp-border)',
          divider:  'var(--sp-divider)',

          // Text
          text:     'var(--sp-text)',
          sub:      'var(--sp-sub)',
          muted:    'var(--sp-muted)',
          faint:    '#3d4455',

          // Brand
          blue:     '#1a73e8',
          blueHov:  '#1557c0',
          blueSoft: '#1a73e815',

          // Status
          green:    '#22c55e',
          red:      '#ef4444',
          yellow:   '#f59e0b',
          purple:   '#a855f7',
          pink:     '#ec4899',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(26,115,232,0.25)',
        'glow-sm':   '0 0 10px rgba(26,115,232,0.15)',
        'card':      '0 2px 12px rgba(0,0,0,0.4)',
        'card-lg':   '0 4px 32px rgba(0,0,0,0.6)',
        'dropdown':  '0 8px 40px rgba(0,0,0,0.7)',
        'inner-glow':'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      animation: {
        'fade-in':     'fadeIn 0.18s ease-out',
        'fade-up':     'fadeUp 0.22s ease-out',
        'slide-down':  'slideDown 0.2s cubic-bezier(0.16,1,0.3,1)',
        'scale-in':    'scaleIn 0.15s cubic-bezier(0.16,1,0.3,1)',
        'bounce-in':   'bounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        'reaction':    'reaction 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        'pulse-slow':  'pulse 3s ease-in-out infinite',
        'shimmer':     'shimmer 1.8s linear infinite',
        'progress':    'progress 5s linear forwards',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' },                       to: { opacity: '1' } },
        fadeUp:    { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:   { from: { opacity: '0', transform: 'scale(0.92)' }, to: { opacity: '1', transform: 'scale(1)' } },
        bounceIn:  { from: { opacity: '0', transform: 'scale(0.5)' }, to: { opacity: '1', transform: 'scale(1)' } },
        reaction:  { from: { transform: 'scale(0) translateY(8px)' }, to: { transform: 'scale(1) translateY(0)' } },
        shimmer:   { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        progress:  { from: { width: '0%' }, to: { width: '100%' } },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34,1.56,0.64,1)',
      },
    },
  },
  plugins: [],
}
