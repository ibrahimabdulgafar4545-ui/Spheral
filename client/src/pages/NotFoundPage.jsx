import { Link } from 'react-router-dom';
import { FiHome, FiArrowLeft } from 'react-icons/fi';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-spheral-dark flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-spheral-blue/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center relative z-10 animate-fade-in">
        {/* 404 */}
        <div className="mb-6">
          <span className="text-[120px] font-black text-gradient leading-none select-none">404</span>
        </div>

        {/* Spheral logo mark */}
        <div className="w-16 h-16 rounded-2xl bg-spheral-blue/20 border border-spheral-blue/30 flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl font-black text-spheral-blue">S</span>
        </div>

        <h1 className="text-2xl font-bold text-spheral-text mb-2">Page not found</h1>
        <p className="text-spheral-muted max-w-sm mx-auto leading-relaxed mb-8">
          This page doesn't exist or was removed. Let's get you back on track.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="btn-secondary btn-md flex items-center gap-2"
          >
            <FiArrowLeft size={16} />
            Go back
          </button>
          <Link to="/" className="btn-primary btn-md flex items-center gap-2">
            <FiHome size={16} />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
