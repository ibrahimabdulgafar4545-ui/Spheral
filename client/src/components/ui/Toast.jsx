import { useEffect } from 'react';
import { FiX, FiCheckCircle, FiAlertCircle, FiInfo, FiAlertTriangle } from 'react-icons/fi';

const icons = {
  success: <FiCheckCircle size={18} className="text-green-400" />,
  error: <FiAlertCircle size={18} className="text-red-400" />,
  info: <FiInfo size={18} className="text-spheral-blue" />,
  warning: <FiAlertTriangle size={18} className="text-yellow-400" />,
};

const borders = {
  success: 'border-green-500/30 bg-green-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  info: 'border-blue-500/30 bg-blue-500/10',
  warning: 'border-yellow-500/30 bg-yellow-500/10',
};

/**
 * Toast notification component.
 * @param {string} type - 'success' | 'error' | 'info' | 'warning'
 * @param {string} message - The message to display
 * @param {function} onClose - Called when the toast is dismissed
 * @param {number} duration - Auto-dismiss in ms (default 3000)
 */
export default function Toast({ type = 'info', message, onClose, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl
        backdrop-blur-sm animate-slide-up ${borders[type]}`}
      role="alert"
    >
      {icons[type]}
      <p className="text-sm text-spheral-text font-medium flex-1">{message}</p>
      <button
        onClick={onClose}
        className="text-spheral-muted hover:text-spheral-text transition-colors ml-2"
      >
        <FiX size={15} />
      </button>
    </div>
  );
}

/**
 * Toast container — place at the root level.
 * Manages a list of toasts.
 */
export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onClose={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}
