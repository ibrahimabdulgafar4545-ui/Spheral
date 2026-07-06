import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiCheckCircle, FiShield, FiX } from 'react-icons/fi';
import Button from '../ui/Button';

export default function VerificationCelebrationModal({ isOpen, onClose }) {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setShouldRender(true);
  }, [isOpen]);

  if (!shouldRender) return null;

  return createPortal(
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Confetti container (Pure CSS) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => {
          const size = Math.random() * 8 + 6;
          const left = Math.random() * 100;
          const delay = Math.random() * 5;
          const duration = Math.random() * 3 + 2;
          const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
          const color = colors[Math.floor(Math.random() * colors.length)];
          return (
            <div
              key={i}
              className="absolute rounded-full animate-fall"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: color,
                left: `${left}%`,
                top: `-20px`,
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`,
                opacity: 0.8,
              }}
            />
          );
        })}
      </div>

      {/* Modal Card */}
      <div className={`relative bg-sp-card border border-sp-border rounded-3xl p-8 max-w-sm w-full text-center shadow-glow-blue transition-transform duration-300 transform ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-sp-muted hover:text-sp-text hover:bg-sp-hover p-1.5 rounded-full transition"
        >
          <FiX size={18} />
        </button>

        {/* Floating Verification Badge Animation */}
        <div className="relative flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full bg-sp-blue/10 flex items-center justify-center text-sp-blue animate-pulse-slow">
            <FiCheckCircle size={56} className="fill-sp-blue/20 stroke-[1.5]" />
          </div>
          {/* Sparkles */}
          <div className="absolute top-0 right-1/4 w-3.5 h-3.5 bg-yellow-400 rounded-full animate-ping" />
          <div className="absolute bottom-2 left-1/4 w-2.5 h-2.5 bg-sp-blue rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
        </div>

        <h2 className="text-2xl font-black text-sp-text tracking-tight mb-2">You're Verified!</h2>
        <p className="text-sm text-sp-sub mb-6 leading-relaxed">
          🎉 Congratulations! Your account has been officially verified by the Spheral Team. 
          A blue checkmark has been added to your profile to celebrate your authenticity.
        </p>

        <Button variant="primary" onClick={onClose} className="w-full justify-center">
          Awesome!
        </Button>
      </div>

      {/* CSS injection for fallback confetti falling animation */}
      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear infinite;
        }
        .animate-pulse-slow {
          animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: .9;
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
