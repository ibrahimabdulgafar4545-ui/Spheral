import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiShield } from 'react-icons/fi';
import { useApp } from '../context/AppContext';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/ui/Button';

function TermsContent() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Title */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-sp-blue/10 text-sp-blue flex items-center justify-center">
          <FiShield size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-sp-text tracking-tight">Terms of Service</h1>
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
          <h2 className="text-base font-bold text-sp-text border-b border-sp-border pb-1.5">1. Account Eligibility</h2>
          <p>
            To register for a Spheral account, you must be at least 13 years of age. By creating an account, you represent and warrant that you meet this minimum age requirement and possess the capacity to agree to these Terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-sp-text border-b border-sp-border pb-1.5">2. User Responsibilities & Conduct</h2>
          <p>
            You are responsible for safeguarding your account credentials. You agree not to engage in prohibited conduct, which includes:
          </p>
          <ul className="list-disc list-inside pl-2 space-y-1 text-sp-sub">
            <li>Harassing, threatening, or impersonating other users.</li>
            <li>Posting spam, malware, or unlawful content.</li>
            <li>Attempting to reverse-engineer or disrupt Spheral services.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-sp-text border-b border-sp-border pb-1.5">3. Content Ownership & License</h2>
          <p>
            You retain ownership of the text, images, videos, audio, and reels you post to Spheral. However, by uploading content, you grant Spheral a worldwide, non-exclusive, royalty-free license to host, display, distribute, and run your content to provide social services.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-sp-text border-b border-sp-border pb-1.5">4. Account Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account at our sole discretion, without prior notice, if we determine that you have violated these Terms or engaged in behavior that harms the community.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-sp-text border-b border-sp-border pb-1.5">5. Limitation of Liability</h2>
          <p>
            Spheral is provided "as is" without warranties of any kind. In no event shall Spheral or its developers be liable for direct, indirect, incidental, or consequential damages resulting from your use of the platform.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-sp-text border-b border-sp-border pb-1.5">6. Disputes & Law</h2>
          <p>
            Any disputes arising out of these terms shall be resolved through negotiation or binding arbitration, governed by local laws without regard to conflict of law principles.
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

export default function TermsPage() {
  const { isAuthenticated } = useApp();

  if (isAuthenticated) {
    return (
      <MainLayout>
        <TermsContent />
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
      <TermsContent />
    </div>
  );
}
