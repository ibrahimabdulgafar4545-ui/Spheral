import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiEye } from 'react-icons/fi';
import { useApp } from '../context/AppContext';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/ui/Button';

function PrivacyContent() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Title */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-sp-blue/10 text-sp-blue flex items-center justify-center">
          <FiEye size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-sp-text tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-sp-muted mt-0.5">Last updated: July 2026</p>
        </div>
      </div>

      <div className="card p-6 sm:p-8 space-y-6 text-left leading-relaxed text-sp-text/90 text-sm">
        {/* AI Draft Disclaimer */}
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl text-xs space-y-1">
          <p className="font-bold">⚠️ AI-Generated Draft / Sandbox Disclaimer</p>
          <p>
            This document is a simulated draft generated for the Spheral sandbox environment. It has not been reviewed by legal professionals. You must consult a qualified attorney to review and customize these terms before utilizing Spheral with real users at scale.
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-sp-text border-b border-sp-border pb-1.5">1. Information We Collect</h2>
          <p>
            Spheral collects the following categories of data to provide and improve our services:
          </p>
          <ul className="list-disc list-inside pl-2 space-y-1.5 text-sp-sub">
            <li><strong>Account Credentials:</strong> Your name, username, email address, phone number, and hashed password.</li>
            <li><strong>Profile & Content Data:</strong> Bio information, location details, posts, comment history, stories, reels, private messages, and media uploads.</li>
            <li><strong>Technical Metadata:</strong> Call connection logs, online/offline status, and time-stamped interaction metadata.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-sp-text border-b border-sp-border pb-1.5">2. Third-Party Integrations</h2>
          <p>
            Spheral integrates with selected third-party services to deliver core functionalities. Data is shared only to facilitate these features:
          </p>
          <ul className="list-disc list-inside pl-2 space-y-1.5 text-sp-sub">
            <li><strong>Brevo (formerly Sendinblue):</strong> Used to deliver multi-factor authentication (MFA) codes via email and SMS text verifications.</li>
            <li><strong>Agora RTC:</strong> Provides live video streaming, voice channels, and real-time audio/video calls.</li>
            <li><strong>Jamendo:</strong> Powering the stories and reels audio sound library picker.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-sp-text border-b border-sp-border pb-1.5">3. Data Usage & Security</h2>
          <p>
            We use your data solely to maintain live connections, dispatch notifications, index posts/comments, and enforce safety guidelines. Your password is cryptographically protected using bcrypt.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-sp-text border-b border-sp-border pb-1.5">4. Account Deletion & Rights</h2>
          <p>
            You have the right to request deletion of your account and personal content. Under Settings & Privacy, you can toggle privacy configurations or request full account deletion, which wipes your database profile record and uploaded assets from our storage directories.
          </p>
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

export default function PrivacyPage() {
  const { isAuthenticated } = useApp();

  if (isAuthenticated) {
    return (
      <MainLayout>
        <PrivacyContent />
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
      <PrivacyContent />
    </div>
  );
}
