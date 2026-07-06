import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiInfo } from 'react-icons/fi';
import { useApp } from '../context/AppContext';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/ui/Button';

function AboutContent() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Title */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-sp-blue/10 text-sp-blue flex items-center justify-center">
          <FiInfo size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-sp-text tracking-tight">About Spheral</h1>
          <p className="text-xs text-sp-muted mt-0.5">Learn more about the platform</p>
        </div>
      </div>

      <div className="card p-6 sm:p-8 space-y-6 text-left leading-relaxed text-sp-text/90 text-sm">
        {/* Description */}
        <p className="text-base text-sp-text font-medium leading-relaxed">
          Spheral is a modern, privacy-focused social network designed to bring you closer to the people who matter most. 
        </p>

        <section className="space-y-3">
          <h3 className="font-bold text-sp-text text-sm uppercase tracking-wider text-sp-blue">Why Spheral?</h3>
          <p>
            Unlike traditional social platforms that commoditize your attention span, Spheral was built to emphasize authentic relations. We restrict feeds to show content exclusively from users on your active friends list—meaning no clutter, no algorithm traps, and no mock data.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="font-bold text-sp-text text-sm uppercase tracking-wider text-sp-blue">Core Features</h3>
          <ul className="list-disc list-inside space-y-2 text-sp-sub">
            <li><strong>Feed & Stories:</strong> Share moments, texts, custom stickers, and background music overlays.</li>
            <li><strong>Reels Feed:</strong> Post and scroll through vertical full-screen video reels with custom gesture seeking.</li>
            <li><strong>DMs & Group Chats:</strong> Text, send voice notes, images, or files in secure real-time messaging networks.</li>
            <li><strong>Agora Audio/Video Calls:</strong> Call or stream live directly to friends with native WebRTC configurations.</li>
            <li><strong>Multi-Account switching:</strong> Manage multiple login sessions seamlessly from your profile menu.</li>
          </ul>
        </section>
      </div>

      <div className="mt-6 text-center">
        <Button onClick={() => navigate(-1)} variant="secondary" size="md" className="gap-1.5">
          <FiArrowLeft size={16} /> Go Back
        </Button>
      </div>
    </div>
  );
}

export default function AboutPage() {
  const { isAuthenticated } = useApp();

  if (isAuthenticated) {
    return (
      <MainLayout>
        <AboutContent />
      </MainLayout>
    );
  }

  return (
    <div className="min-h-screen bg-sp-bg text-sp-text">
      {/* Standalone Header */}
      <header className="h-14 border-b border-sp-border/80 flex items-center justify-between px-6 bg-sp-card/90 backdrop-blur-md sticky top-0 z-55">
        <Link to="/login" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sp-blue flex items-center justify-center font-black text-white text-base">S</div>
          <span className="font-bold text-sp-text text-sm">Spheral</span>
        </Link>
        <Link to="/login" className="text-xs font-bold text-sp-blue hover:underline">
          Back to Login
        </Link>
      </header>
      <AboutContent />
    </div>
  );
}
