import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi';
import { useApp } from '../context/AppContext';
import { authAPI } from '../api/auth';
import Button from '../components/ui/Button';
import { useLanguage } from '../context/LanguageContext';

export default function LoginPage() {
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const { login, saveAccountSession, showToast } = useApp();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showPrompt, setShowPrompt] = useState(false);
  const [tempAuth, setTempAuth] = useState(null);

  const handleGoogleClick = () => {
    if (!window.google) {
      setError('Google Sign-In SDK failed to load. Please try again.');
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: 'email profile openid',
      callback: async (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          setLoading(true);
          setError('');
          try {
            const res = await authAPI.googleLogin(tokenResponse.access_token);
            setLoading(false);
            if (res.success) {
              showToast('success', 'Successfully connected with Google!');
              saveAccountSession(res.user, res.token, true);
              window.location.href = '/';
            } else {
              setError(res.error || 'Google login failed');
            }
          } catch (err) {
            setLoading(false);
            setError(err.message);
          }
        }
      }
    });
    client.requestAccessToken();
  };

  const handleAppleClick = () => {
    showToast('info', 'Apple Sign In coming soon');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    const res = await login({ email, password });
    setLoading(false);
    if (res?.success) {
      setTempAuth({ user: res.user, token: res.token });
      setShowPrompt(true);
    } else {
      setError(res?.error || 'Login failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-sp-bg flex items-center justify-center px-2 sm:px-4 overflow-hidden sm:relative sm:min-h-screen sm:overflow-y-auto sm:overflow-x-hidden mb-40">
      {/* Ambient glows */}
      <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] bg-sp-blue/8 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-purple-600/6 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10 scale-[0.9] xs:scale-95 sm:scale-100 origin-center">
        {/* Logo */}
        <div className="text-center mb-4 sm:mb-10">
          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-sp-blue flex items-center justify-center mx-auto mb-2 sm:mb-5 shadow-glow-blue">
            <span className="text-white font-black text-lg sm:text-2xl">S</span>
          </div>
          <h1 className="text-xl sm:text-[28px] font-black text-gradient tracking-tight">Spheral</h1>
          <p className="hidden sm:block text-sp-muted mt-2 text-sm">Connect with the people who matter</p>
        </div>

        {/* Card */}
        <div className="card p-4 sm:p-8">
          <h2 className="text-lg sm:text-xl font-bold text-sp-text mb-1 sm:mb-1">{t('auth.welcomeBack')}</h2>
          <p className="hidden sm:block text-sp-sub text-sm mb-6">{t('auth.signIn')}</p>

          {error && (
            <div className="bg-sp-red/10 border border-sp-red/30 text-sp-red rounded-xl px-4 py-2 sm:py-3 mb-3 sm:mb-4 text-xs sm:text-sm animate-fade-up">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-4 mt-2 sm:mt-0">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider">{t('auth.email')}</label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sp-muted" size={16} />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider">{t('auth.password')}</label>
                <Link to="/forgot-password" className="text-xs text-sp-blue hover:underline">{t('auth.forgotPassword')}</Link>
              </div>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sp-muted" size={16} />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="input pl-10 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sp-muted hover:text-sp-text transition-colors"
                >
                  {showPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            <Button
              id="login-submit"
              type="submit"
              loading={loading}
              variant="primary"
              size="lg"
              iconRight={<FiArrowRight size={18} />}
              className="w-full mt-1"
            >
              {t('auth.signIn')}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-3 sm:my-5">
            <div className="flex-1 border-t border-sp-divider" />
            <span className="text-[10px] sm:text-xs text-sp-muted font-medium">or continue with</span>
            <div className="flex-1 border-t border-sp-divider" />
          </div>

          {/* Social */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleGoogleClick}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-sp-border bg-sp-overlay hover:bg-sp-hover transition-colors text-sm font-semibold text-sp-text cursor-pointer"
            >
              <svg className="w-4 h-4 text-left" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={handleAppleClick}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-sp-border bg-sp-overlay hover:bg-sp-hover transition-all text-sm font-semibold text-sp-text/40 hover:text-sp-text cursor-pointer relative group"
              title="Apple Sign In coming soon"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.3.07 2.19.73 2.96.77 1.13-.23 2.21-.9 3.42-.77 1.45.17 2.54.76 3.25 1.94-2.98 1.79-2.28 5.72.42 6.82-.57 1.5-1.32 2.97-2.05 4.12zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Apple
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-sp-card text-sp-text border border-sp-border text-[10px] py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none">
                Coming soon
              </span>
            </button>
          </div>
        </div>

        <p className="text-center text-sp-sub text-xs sm:text-sm mt-3 sm:mt-6">
          {t('auth.noAccount')}{' '}
          <Link to="/signup" className="text-sp-blue font-semibold hover:underline">
            {t('auth.signUp')} →
          </Link>
        </p>
      </div>

      {/* Save Account Confirm Modal */}
      {showPrompt && tempAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-sp-card border border-sp-border rounded-2xl shadow-xl max-w-sm w-full p-6 text-center animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-sp-blue/10 text-sp-blue flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
            </div>
            <h3 className="font-bold text-sp-text text-lg">Save Account?</h3>
            <p className="text-sp-sub text-sm mt-2 mb-6">
              Would you like to save <strong>{tempAuth.user?.name}</strong> (@{tempAuth.user?.username}) for quick switching later without entering a password?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  saveAccountSession(tempAuth.user, tempAuth.token, false);
                  setShowPrompt(false);
                  navigate('/');
                }}
                className="flex-1 py-2.5 rounded-xl border border-sp-border text-sp-text hover:bg-sp-hover font-semibold transition-colors"
              >
                No
              </button>
              <button
                onClick={() => {
                  saveAccountSession(tempAuth.user, tempAuth.token, true);
                  setShowPrompt(false);
                  navigate('/');
                }}
                className="flex-1 py-2.5 rounded-xl bg-sp-blue hover:bg-blue-600 text-white font-semibold transition-colors shadow-md"
              >
                Yes, Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
