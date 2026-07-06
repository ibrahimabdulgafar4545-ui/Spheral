import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiCalendar, FiCheck, FiPhone, FiAlertCircle } from 'react-icons/fi';
import { useApp } from '../context/AppContext';
import { authAPI } from '../api/auth';
import Button from '../components/ui/Button';
import { useLanguage } from '../context/LanguageContext';

export default function SignupPage() {
  const { login, signup, sendCode, verifyCode, saveAccountSession, showToast } = useApp();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showPrompt, setShowPrompt] = useState(false);
  const [tempAuth, setTempAuth] = useState(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    dob: '',
    gender: 'Male',
  });

  const [showPass, setShowPass] = useState(false);
  const [step, setStep] = useState(1); // 1: Your info, 2: Verify, 3: Done
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [signupError, setSignupError] = useState('');

  const handleGoogleClick = () => {
    if (!window.google) {
      setSignupError('Google Sign-In SDK failed to load. Please try again.');
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: 'email profile openid',
      callback: async (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          setLoading(true);
          setSignupError('');
          try {
            const res = await authAPI.googleLogin(tokenResponse.access_token);
            setLoading(false);
            if (res.success) {
              showToast('success', 'Successfully connected with Google!');
              saveAccountSession(res.user, res.token, true);
              window.location.href = '/';
            } else {
              setSignupError(res.error || 'Google login failed');
            }
          } catch (err) {
            setLoading(false);
            setSignupError(err.message);
          }
        }
      }
    });
    client.requestAccessToken();
  };

  const handleAppleClick = () => {
    showToast('info', 'Apple Sign In coming soon');
  };

  // Verification Code step states
  const [code, setCode] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [debugCode, setDebugCode] = useState(''); // helper to show verify code in UI when API key is missing

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Resend code timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((t) => t - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const getIdentifier = () => {
    return form.email;
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.username.trim() || form.username.length < 3) e.username = 'Username must be at least 3 characters';

    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) {
      e.email = 'Valid email is required';
    }

    if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!form.dob) e.dob = 'Date of birth is required';
    if (!form.gender) e.gender = 'Please select your gender';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async (e) => {
    e.preventDefault();
    if (!validateStep1()) return;

    setLoading(true);
    const identifier = getIdentifier();

    try {
      const res = await sendCode({
        identifier,
        method: 'email',
      });

      if (res.success) {
        setStep(2);
        setResendTimer(30);
        if (res.debugCode) {
          setDebugCode(res.debugCode);
        } else {
          setDebugCode('');
        }
      } else {
        setErrors({ form: res.error || 'Failed to send verification code' });
      }
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    const identifier = getIdentifier();
    try {
      const res = await sendCode({
        identifier,
        method: 'email',
      });
      if (res.success) {
        setResendTimer(30);
        if (res.debugCode) {
          setDebugCode(res.debugCode);
        }
      }
    } catch (err) {
      setErrors({ verify: err.message });
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setErrors({ verify: 'Verification code must be 6 digits' });
      return;
    }

    setLoading(true);
    const identifier = getIdentifier();

    try {
      const verifyRes = await verifyCode({
        identifier,
        code,
      });

      if (verifyRes.success) {
        const signupRes = await signup({
          name: `${form.firstName} ${form.lastName}`,
          username: form.username,
          email: form.email,
          password: form.password,
        });

        if (signupRes.success) {
          setTempAuth({ user: signupRes.user, token: signupRes.token });
          setStep(3);
        } else {
          setErrors({ verify: signupRes.error || 'Signup failed after code verification' });
        }
      } else {
        setErrors({ verify: verifyRes.error || 'Invalid verification code' });
      }
    } catch (err) {
      setErrors({ verify: err.message });
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    const p = form.password;
    if (!p) return { label: '', color: '', width: '0%' };
    if (p.length < 6) return { label: 'Weak', color: 'bg-red-500', width: '25%' };
    if (p.length < 8) return { label: 'Fair', color: 'bg-yellow-500', width: '50%' };
    if (p.length < 12 || !/[A-Z]/.test(p) || !/[0-9]/.test(p)) return { label: 'Good', color: 'bg-sp-blue', width: '75%' };
    return { label: 'Strong', color: 'bg-green-500', width: '100%' };
  };

  const strength = passwordStrength();

  return (
    <div className="fixed inset-0 bg-sp-bg flex items-center justify-center px-2 sm:px-4 overflow-hidden sm:relative sm:min-h-screen sm:overflow-y-auto sm:overflow-x-hidden mb-40">
      {/* Ambient glows */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-sp-blue/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in scale-[0.85] xs:scale-90 sm:scale-100 origin-center">
        {/* Logo */}
        <div className="text-center mb-2 sm:mb-8">
          <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-sp-blue flex items-center justify-center mx-auto mb-1 sm:mb-4 shadow-glow-blue">
            <span className="text-white font-black text-xl sm:text-3xl">S</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-gradient tracking-tight">{t('auth.joinSpheral')}</h1>
          <p className="hidden sm:block text-sp-muted mt-2 text-sm">Create your account in seconds</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-6">
          {[
            { step: 1, label: 'Your info' },
            { step: 2, label: 'Verify' },
            { step: 3, label: 'Done' }
          ].map((s) => (
            <div key={s.step} className="flex items-center gap-1 sm:gap-2">
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all duration-300
                ${step >= s.step ? 'bg-sp-blue text-white shadow-glow-sm' : 'bg-sp-hover text-sp-muted'}`}>
                {step > s.step ? <FiCheck size={12} /> : s.step}
              </div>
              <span className={`text-[10px] sm:text-xs hidden sm:inline ${step >= s.step ? 'text-sp-text font-semibold' : 'text-sp-muted'}`}>{s.label}</span>
              {s.step < 3 && <div className={`w-4 sm:w-6 h-0.5 transition-all duration-300 ${step > s.step ? 'bg-sp-blue' : 'bg-sp-border'}`} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="card p-4 sm:p-8">
          {errors.form && (
            <div className="bg-sp-red/10 border border-sp-red/20 text-sp-red rounded-xl px-4 py-2 sm:py-3 mb-3 sm:mb-4 text-xs sm:text-sm flex items-center gap-2">
              <FiAlertCircle size={16} />
              <span>{errors.form}</span>
            </div>
          )}

          {/* ─── Step 1: Info Gathering ───────────────────────── */}
          {step === 1 && (
            <div className="animate-fade-in flex flex-col gap-2 sm:gap-4">
              <form onSubmit={handleNext} className="flex flex-col gap-2 sm:gap-4">
                <h2 className="hidden sm:block text-lg sm:text-xl font-bold text-sp-text">Your info</h2>

              {/* Name grid row (proper gap fixed) */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => update('firstName', e.target.value)}
                    placeholder={t('auth.fullName').split(' ')[0]}
                    className={`input-field text-sm py-2 sm:py-3 pl-3 sm:pl-4 ${errors.firstName ? 'border-red-500/60' : ''}`}
                  />
                  {errors.firstName && <p className="text-red-400 text-xs mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) => update('lastName', e.target.value)}
                    placeholder={t('auth.fullName').split(' ')[1]}
                    className={`input-field text-sm py-2 sm:py-3 pl-3 sm:pl-4 ${errors.lastName ? 'border-red-500/60' : ''}`}
                  />
                  {errors.lastName && <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>}
                </div>
              </div>

              {/* Username & Email grid row */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                {/* Username field */}
                <div>
                  <div className="relative">
                    <FiUser className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 text-sp-muted" size={15} />
                    <input
                      type="text"
                      required
                      value={form.username}
                      onChange={(e) => update('username', e.target.value)}
                      placeholder={t('auth.username')}
                      className={`input-field text-sm py-2 sm:py-3 pl-8 sm:pl-12 ${errors.username ? 'border-red-500/60' : ''}`}
                    />
                  </div>
                  {errors.username && <p className="text-red-400 text-[10px] mt-0.5">{errors.username}</p>}
                </div>

                {/* Email address field */}
                <div>
                  <div className="relative">
                    <FiMail className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 text-sp-muted" size={15} />
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => update('email', e.target.value)}
                      placeholder={t('auth.email')}
                      className={`input-field text-sm py-2 sm:py-3 pl-8 sm:pl-12 ${errors.email ? 'border-red-500/60' : ''}`}
                    />
                  </div>
                  {errors.email && <p className="text-red-400 text-[10px] mt-0.5">{errors.email}</p>}
                </div>
              </div>

              {/* Password & Confirm grid row */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                {/* Password */}
                <div>
                  <div className="relative">
                    <FiLock className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 text-sp-muted" size={15} />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => update('password', e.target.value)}
                      placeholder={t('auth.password')}
                      className={`input-field text-sm py-2 sm:py-3 pl-8 sm:pl-12 pr-8 ${errors.password ? 'border-red-500/60' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sp-muted hover:text-sp-text"
                    >
                      {showPass ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-400 text-[10px] mt-0.5">{errors.password}</p>}
                </div>

                {/* Confirm Password */}
                <div>
                  <div className="relative">
                    <FiLock className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 text-sp-muted" size={15} />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={(e) => update('confirmPassword', e.target.value)}
                      placeholder={t('auth.confirmPassword')}
                      className={`input-field text-sm py-2 sm:py-3 pl-8 sm:pl-12 ${errors.confirmPassword ? 'border-red-500/60' : ''}`}
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-red-400 text-[10px] mt-0.5">{errors.confirmPassword}</p>}
                </div>
              </div>

              {/* DOB & Gender grid row */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 items-end">
                {/* Date of birth */}
                <div>
                  <label className="hidden sm:block text-[10px] sm:text-xs font-semibold text-sp-sub uppercase tracking-wider mb-1">{t('profile.birthday') ?? 'Birthday'}</label>
                  <div className="relative">
                    <FiCalendar className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 text-sp-muted" size={15} />
                    <input
                      type="date"
                      value={form.dob}
                      onChange={(e) => update('dob', e.target.value)}
                      className={`input-field text-sm py-2 sm:py-3 pl-8 sm:pl-12 pr-1 ${errors.dob ? 'border-red-500/60' : ''} [color-scheme:dark]`}
                    />
                  </div>
                  {errors.dob && <p className="text-red-400 text-[10px] mt-0.5">{errors.dob}</p>}
                </div>

                {/* Gender */}
                <div>
                  <label className="hidden sm:block text-[10px] sm:text-xs font-semibold text-sp-sub uppercase tracking-wider mb-1">Gender</label>
                  <div className="flex gap-1 sm:gap-2">
                    {['Male', 'Female'].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => update('gender', g)}
                        className={`flex-1 py-2 sm:py-2.5 rounded-lg border text-[11px] sm:text-sm font-semibold transition-all
                          ${form.gender === g
                            ? 'border-sp-blue bg-sp-blue/10 text-sp-blue'
                            : 'border-sp-border bg-sp-hover text-sp-sub hover:text-sp-text'
                          }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                loading={loading}
                variant="primary"
                size="lg"
                className="w-full mt-2"
              >
                Continue →
                </Button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 mt-1 mb-2">
                <div className="flex-1 border-t border-sp-divider" />
                <span className="text-xs text-sp-muted font-medium">or continue with</span>
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
          )}

          {/* ─── Step 2: Code Verification ─────────────────────── */}
          {step === 2 && (
            <form onSubmit={handleVerify} className="animate-fade-in flex flex-col gap-4">
              <h2 className="text-xl font-bold text-sp-text">Verify your email address</h2>
              <p className="text-sm text-sp-sub leading-relaxed">
                We sent a 6-digit verification code to <strong className="text-sp-text">{getIdentifier()}</strong>.
              </p>

              {errors.verify && (
                <div className="bg-sp-red/10 border border-sp-red/20 text-sp-red rounded-xl px-4 py-3 text-xs flex items-center gap-2">
                  <FiAlertCircle size={14} />
                  <span>{errors.verify}</span>
                </div>
              )}

              {/* Debug Helper for Sandbox environment */}
              {debugCode && (
                <div className="bg-sp-blue/10 border border-sp-blue/20 text-sp-blue rounded-xl p-3.5 text-xs text-center">
                  <span className="font-semibold">Local Testing Code:</span> <span className="font-black tracking-widest text-lg ml-2">{debugCode}</span>
                </div>
              )}

              <div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="input text-center text-2xl font-bold tracking-widest py-3 border-sp-border"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setStep(1)}
                  variant="secondary"
                  size="lg"
                  className="flex-1"
                >
                  ← Edit Info
                </Button>
                <Button
                  type="submit"
                  disabled={code.length !== 6}
                  loading={loading}
                  variant="primary"
                  size="lg"
                  className="flex-1"
                >
                  Verify & Sign Up
                </Button>
              </div>

              {/* Resend button */}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendTimer > 0}
                className="text-xs text-sp-blue hover:underline text-center disabled:text-sp-muted disabled:no-underline font-semibold"
              >
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend verification code'}
              </button>
            </form>
          )}

          {/* ─── Step 3: Success Screen ────────────────────────── */}
          {step === 3 && (
            <div className="animate-fade-in text-center py-6 space-y-6">
              <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 text-green-400 rounded-full flex items-center justify-center mx-auto shadow-glow-sm">
                <FiCheck size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-sp-text">Account Verified!</h2>
                <p className="text-sm text-sp-sub mt-2 leading-relaxed">
                  Your Spheral account has been created and verified successfully. Let's build your profile!
                </p>
              </div>
              <Button
                onClick={() => {
                  setShowPrompt(true);
                }}
                variant="primary"
                size="lg"
                className="w-full"
              >
                Enter Spheral
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-sp-muted mt-4 sm:mt-6 text-xs sm:text-sm">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="text-sp-blue font-semibold hover:underline">{t('auth.signIn')}</Link>
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
