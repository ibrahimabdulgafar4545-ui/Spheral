import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useApp } from '../context/AppContext';
import { usersAPI } from '../api/users';
import { FiShield, FiArrowRight, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';

export default function PrivacyCheckupPage() {
  const { user, updateCurrentUser, showToast } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    profileVisibility: 'public',
    taggingApproval: true,
    searchVisibility: true,
  });

  useEffect(() => {
    if (user?.privacySettings) {
      setSettings(user.privacySettings);
    }
  }, [user]);

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

  const handleSave = async () => {
    try {
      setLoading(true);
      const res = await usersAPI.updateProfile(user.id || user._id, {
        privacySettings: settings
      });
      if (res.success) {
        updateCurrentUser(res.user);
        showToast('success', 'Privacy settings updated successfully!');
        setStep(4); // Success step
      }
    } catch (err) {
      showToast('error', 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { title: 'Who can see your posts?', desc: 'Choose who can see your profile and posts by default.' },
    { title: 'Timeline & Tagging', desc: 'Control whether you want to review posts you\'re tagged in.' },
    { title: 'Search & Discoverability', desc: 'Choose if people can look you up using your email or phone.' }
  ];

  return (
    <MainLayout hideRight>
      <div className="max-w-[600px] mx-auto mt-10 px-4 select-none">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-sp-blue/10 rounded-full flex items-center justify-center mx-auto mb-4 text-sp-blue">
            <FiShield size={32} />
          </div>
          <h1 className="text-2xl font-bold text-sp-text mb-2">Privacy Checkup</h1>
          <p className="text-sp-muted text-sm max-w-md mx-auto">
            We'll guide you through a few steps to make sure your privacy settings are exactly how you want them.
          </p>
        </div>

        <div className="card p-6 min-h-[300px] flex flex-col relative overflow-hidden">
          {/* Progress bar */}
          {step < 4 && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-sp-border">
              <div 
                className="h-full bg-sp-blue transition-all duration-300" 
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          )}

          {step === 1 && (
            <div className="flex-1 animate-fade-in">
              <h2 className="text-xl font-bold text-sp-text mb-2">{steps[0].title}</h2>
              <p className="text-sp-muted text-sm mb-6">{steps[0].desc}</p>
              
              <div className="space-y-3">
                {['public', 'friends', 'private'].map(opt => (
                  <label key={opt} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${settings.profileVisibility === opt ? 'border-sp-blue bg-sp-blue/5' : 'border-sp-border hover:bg-sp-hover'}`}>
                    <input 
                      type="radio" 
                      name="profileVisibility" 
                      value={opt} 
                      checked={settings.profileVisibility === opt}
                      onChange={(e) => setSettings({ ...settings, profileVisibility: e.target.value })}
                      className="accent-sp-blue w-4 h-4"
                    />
                    <div>
                      <p className="text-sm font-semibold text-sp-text capitalize">{opt === 'private' ? 'Only Me' : opt}</p>
                      <p className="text-xs text-sp-muted">
                        {opt === 'public' && 'Anyone on or off Spheral'}
                        {opt === 'friends' && 'Only your friends on Spheral'}
                        {opt === 'private' && 'Only you can see your content'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex-1 animate-fade-in">
              <h2 className="text-xl font-bold text-sp-text mb-2">{steps[1].title}</h2>
              <p className="text-sp-muted text-sm mb-6">{steps[1].desc}</p>
              
              <label className="flex items-center justify-between p-4 rounded-xl border border-sp-border bg-sp-overlay">
                <div>
                  <p className="text-sm font-semibold text-sp-text">Review tags before they appear</p>
                  <p className="text-xs text-sp-muted max-w-[250px]">When someone tags you in a post, you'll have to approve it before it shows on your profile.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, taggingApproval: !settings.taggingApproval })}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${settings.taggingApproval ? 'bg-sp-blue' : 'bg-sp-border'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${settings.taggingApproval ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="flex-1 animate-fade-in">
              <h2 className="text-xl font-bold text-sp-text mb-2">{steps[2].title}</h2>
              <p className="text-sp-muted text-sm mb-6">{steps[2].desc}</p>
              
              <label className="flex items-center justify-between p-4 rounded-xl border border-sp-border bg-sp-overlay">
                <div>
                  <p className="text-sm font-semibold text-sp-text">Allow search engines</p>
                  <p className="text-xs text-sp-muted max-w-[250px]">Let people outside of Spheral find your profile using search engines.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, searchVisibility: !settings.searchVisibility })}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${settings.searchVisibility ? 'bg-sp-blue' : 'bg-sp-border'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${settings.searchVisibility ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </label>
            </div>
          )}

          {step === 4 && (
            <div className="flex-1 animate-fade-in text-center flex flex-col items-center justify-center py-8">
              <FiCheckCircle size={64} className="text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-sp-text mb-2">You're all set!</h2>
              <p className="text-sp-muted text-sm mb-6">Thanks for reviewing your privacy choices. You can always change these later in Settings.</p>
              <button onClick={() => navigate('/settings')} className="btn-primary">
                Return to Settings
              </button>
            </div>
          )}

          {/* Navigation Buttons */}
          {step < 4 && (
            <div className="flex justify-between items-center mt-8 pt-4 border-t border-sp-divider">
              <button 
                onClick={handlePrev} 
                disabled={step === 1}
                className={`flex items-center gap-2 font-semibold text-sm ${step === 1 ? 'text-sp-muted opacity-50 cursor-not-allowed' : 'text-sp-blue hover:underline'}`}
              >
                <FiArrowLeft size={16} /> Back
              </button>
              
              {step < 3 ? (
                <button onClick={handleNext} className="btn-primary flex items-center gap-2">
                  Next <FiArrowRight size={16} />
                </button>
              ) : (
                <button onClick={handleSave} disabled={loading} className="btn-primary flex items-center gap-2">
                  {loading ? 'Saving...' : 'Review & Save'} <FiShield size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
