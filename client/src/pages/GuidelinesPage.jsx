import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiHeart } from 'react-icons/fi';
import { useApp } from '../context/AppContext';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/ui/Button';

function GuidelinesContent() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Title */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-sp-blue/10 text-sp-blue flex items-center justify-center">
          <FiHeart size={22} className="text-sp-blue" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-sp-text tracking-tight">Community Guidelines</h1>
          <p className="text-xs text-sp-muted mt-0.5">Spheral safety policies</p>
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

        <p className="text-sp-sub">
          Spheral is dedicated to providing an open, authentic space to connect with friends. We enforce the following rules to ensure everyone's safety:
        </p>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-sp-text border-b border-sp-border pb-1.5">1. Zero Tolerance for Harassment & Hate Speech</h2>
          <p>
            Harassing, bullying, stalking, or targeting other users is strictly prohibited. We do not tolerate hate speech based on race, ethnicity, nationality, sex, gender identity, sexual orientation, religion, age, or disability.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-sp-text border-b border-sp-border pb-1.5">2. Respect Privacy</h2>
          <p>
            Do not share private details of others (such as telephone numbers, home addresses, or private photos) without explicit consent. Impersonation of other individuals or entities is also a violation of these guidelines.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-sp-text border-b border-sp-border pb-1.5">3. Spam & Malicious Content</h2>
          <p>
            Do not distribute unsolicited promotional spam, misleading links, or malware. We block profiles designed solely to scrape content, farm followers, or execute bot automation scripts.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-sp-text border-b border-sp-border pb-1.5">4. Enforcement & Reporting</h2>
          <p>
            If you encounter content or a user that violates these guidelines, please use the **Report** system (available inside the "More" context menu on any Post, Reel, or Comment). 
          </p>
          <p>
            All submitted reports are saved and reviewed. Violations will result in warnings, content deletion, or permanent account termination.
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

export default function GuidelinesPage() {
  const { isAuthenticated } = useApp();

  if (isAuthenticated) {
    return (
      <MainLayout>
        <GuidelinesContent />
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
      <GuidelinesContent />
    </div>
  );
}
