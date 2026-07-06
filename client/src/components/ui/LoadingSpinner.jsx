/**
 * Spinner sizes: 'sm' | 'md' | 'lg'
 */
export default function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-[3px]',
  };

  return (
    <div className={`${sizes[size]} rounded-full border-sp-border border-t-sp-blue animate-spin ${className}`} />
  );
}

/**
 * Full-page loading screen
 */
export function PageLoader() {
  return (
    <div className="min-h-screen bg-sp-bg flex flex-col items-center justify-center gap-5 select-none animate-fade-in transition-colors duration-300">
      <div className="w-16 h-16 rounded-2xl bg-sp-blue flex items-center justify-center shadow-glow-blue animate-bounce">
        <span className="text-white font-black text-3xl">S</span>
      </div>
      <LoadingSpinner size="md" className="border-sp-border border-t-sp-blue" />
      <p className="text-sp-muted text-sm font-bold tracking-wide animate-pulse">Loading Spheral…</p>
    </div>
  );
}

/**
 * Skeleton block for content placeholders
 */
export function Skeleton({ className = '' }) {
  return (
    <div className={`bg-sp-hover rounded-lg animate-pulse ${className}`} />
  );
}

/**
 * Post skeleton loader
 */
export function PostSkeleton() {
  return (
    <div className="card p-4 mb-4 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-full bg-sp-hover" />
        <div className="flex-1">
          <div className="h-3.5 bg-sp-hover rounded w-32 mb-2" />
          <div className="h-2.5 bg-sp-hover rounded w-20" />
        </div>
      </div>
      <div className="h-3 bg-sp-hover rounded mb-2 w-full" />
      <div className="h-3 bg-sp-hover rounded mb-2 w-5/6" />
      <div className="h-3 bg-sp-hover rounded mb-4 w-4/6" />
      <div className="h-48 bg-sp-hover rounded-xl mb-4" />
      <div className="flex gap-2">
        <div className="h-8 bg-sp-hover rounded-lg flex-1" />
        <div className="h-8 bg-sp-hover rounded-lg flex-1" />
        <div className="h-8 bg-sp-hover rounded-lg flex-1" />
      </div>
    </div>
  );
}
