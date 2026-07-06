import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FiUser, FiLock, FiBell, FiEye, FiGlobe, FiSave, FiSun, FiMoon, FiShield, FiSearch
} from 'react-icons/fi';
import MainLayout from '../components/layout/MainLayout';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { LANGUAGE_OPTIONS } from '../locales/index';
import { usersAPI } from '../api/users';
import { authAPI } from '../api/auth';
import clsx from 'clsx';

const SECTIONS = [
  { id: 'account', label: 'Account', icon: <FiUser size={18} /> },
  { id: 'privacy', label: 'Privacy', icon: <FiEye size={18} /> },
  { id: 'security', label: 'Security', icon: <FiLock size={18} /> },
  { id: 'notifications', label: 'Notifications', icon: <FiBell size={18} /> },
  { id: 'content_prefs', label: 'Content Preferences', icon: <FiShield size={18} /> },
  { id: 'display', label: 'Display & Theme', icon: <FiSun size={18} /> },
  { id: 'language', label: 'Language', icon: <FiGlobe size={18} /> },
];

export default function SettingsPage() {
  const { user, showToast, theme, toggleTheme, updateCurrentUser } = useApp();
  const { t, lang, setLanguage } = useLanguage();
  const [active, setActive] = useState('account');
  const [saving, setSaving] = useState(false);

  // 30-day username & display name change cooldown calculations
  const lastNameChangeAt = user?.lastNameChangeAt;
  const cooldownDays = 30;
  let remainingDays = 0;
  let isCooldownActive = false;

  if (lastNameChangeAt) {
    const lastChange = new Date(lastNameChangeAt);
    const cooldownEnd = new Date(lastChange.getTime() + cooldownDays * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = cooldownEnd.getTime() - now.getTime();
    if (diffMs > 0) {
      isCooldownActive = true;
      remainingDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    }
  }
  const [saved, setSaved] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const routerLocation = useLocation();

  useEffect(() => {
    if (routerLocation.hash) {
      const h = routerLocation.hash.replace('#', '');
      if (['account', 'privacy', 'security', 'notifications', 'display', 'content_prefs', 'language'].includes(h)) {
        setActive(h);
      } else if (['privacy_checkup', 'privacy_center'].includes(h)) {
        setActive('privacy');
      } else if (h === 'activity_log') {
        setActive('account');
      }
    }
  }, [routerLocation.hash]);

  const filteredSections = SECTIONS.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const keywords = {
      account: ['name', 'bio', 'location', 'age', 'relationship', 'city', 'country', 'school', 'workplace', 'education'],
      privacy: ['profile', 'tagging', 'review', 'search', 'discoverability', 'checkup', 'center'],
      security: ['password', 'current', 'new'],
      notifications: ['like', 'comment', 'alerts', 'content', 'preferences'],
      display: ['theme', 'dark', 'light', 'mode', 'application'],
      language: ['language', 'translation', 'locale', 'arabic', 'english', 'french', 'spanish', 'portuguese', 'hausa', 'yoruba']
    };
    if (s.label.toLowerCase().includes(q)) return true;
    return keywords[s.id]?.some(k => k.includes(q));
  });

  // Form states (Account)
  const [name, setName] = useState(user?.name || '');
  const [usernameState, setUsernameState] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [workplace, setWorkplace] = useState(user?.workplace || '');
  const [education, setEducation] = useState(user?.education || '');
  const [age, setAge] = useState(user?.age || '');
  const [relationshipStatus, setRelationshipStatus] = useState(user?.relationshipStatus || '');
  const [city, setCity] = useState(user?.city || '');
  const [country, setCountry] = useState(user?.country || '');
  const [school, setSchool] = useState(user?.school || '');

  // Professional mode states
  const [isProfessional, setIsProfessional] = useState(user?.isProfessional || false);
  const [category, setCategory] = useState(user?.category || '');
  const [publicEmail, setPublicEmail] = useState(user?.publicContact?.email || '');
  const [publicPhone, setPublicPhone] = useState(user?.publicContact?.phone || '');
  const [publicWebsite, setPublicWebsite] = useState(user?.publicContact?.website || '');

  // Privacy states
  const [profilePrivacy, setProfilePrivacy] = useState('public');
  const [taggingApproval, setTaggingApproval] = useState(true);
  const [searchVisibility, setSearchVisibility] = useState(true);
  const [friendsVisibility, setFriendsVisibility] = useState('public');
  const [followingVisibility, setFollowingVisibility] = useState('public');

  // Security states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  // Notification states
  const [notifPrefs, setNotifPrefs] = useState({
    likes: true, comments: true, friendRequests: true, messages: true,
  });

  // Synchronize input fields when user object loads
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUsernameState(user.username || '');
      setBio(user.bio || '');
      setLocation(user.location || '');
      setWebsite(user.website || '');
      setWorkplace(user.workplace || '');
      setEducation(user.education || '');
      setAge(user.age != null ? user.age : '');
      setRelationshipStatus(user.relationshipStatus || '');
      setCity(user.city || '');
      setCountry(user.country || '');
      setSchool(user.school || '');
      setIsProfessional(user.isProfessional || false);
      setCategory(user.category || '');
      setPublicEmail(user.publicContact?.email || '');
      setPublicPhone(user.publicContact?.phone || '');
      setPublicWebsite(user.publicContact?.website || '');
      
      // Privacy Settings
      setProfilePrivacy(user.privacySettings?.profileVisibility || 'public');
      setTaggingApproval(user.privacySettings?.taggingApproval !== false);
      setSearchVisibility(user.privacySettings?.searchVisibility !== false);
      setFriendsVisibility(user.privacySettings?.friendsVisibility || 'public');
      setFollowingVisibility(user.privacySettings?.followingVisibility || 'public');

      // Notification settings
      setNotifPrefs({
        likes: user.preferences?.likes !== false,
        comments: user.preferences?.comments !== false,
        friendRequests: user.preferences?.friendRequests !== false,
        messages: user.preferences?.messages !== false,
      });
    }
  }, [user]);

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await usersAPI.updateProfile(user.id || user._id, {
        name,
        username: usernameState,
        bio,
        location,
        website,
        workplace,
        education,
        age: age ? parseInt(age, 10) : null,
        relationshipStatus,
        city,
        country,
        school,
        isProfessional,
        category,
        publicContact: {
          email: publicEmail,
          phone: publicPhone,
          website: publicWebsite,
        }
      });
      if (res.success) {
        setSaved(true);
        updateCurrentUser(res.user);
        showToast('success', 'Profile updated successfully!');
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrivacy = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await usersAPI.updateProfile(user.id || user._id, {
        privacySettings: {
          profileVisibility: profilePrivacy,
          taggingApproval,
          searchVisibility,
          friendsVisibility,
          followingVisibility,
        }
      });
      if (res.success) {
        updateCurrentUser(res.user);
        showToast('success', 'Privacy settings updated successfully!');
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to update privacy settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifPref = async (key, val) => {
    const updatedPrefs = { ...notifPrefs, [key]: val };
    setNotifPrefs(updatedPrefs);
    try {
      const res = await usersAPI.updateProfile(user.id || user._id, {
        preferences: updatedPrefs
      });
      if (res.success) {
        updateCurrentUser(res.user);
        showToast('success', 'Notification preference updated');
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to update preferences');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('error', 'New passwords do not match');
      return;
    }
    try {
      setChangingPass(true);
      const res = await authAPI.updatePassword({ currentPassword, newPassword });
      if (res.success) {
        showToast('success', 'Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to update password');
    } finally {
      setChangingPass(false);
    }
  };

  const ToggleSwitch = ({ checked, onChange, id }) => (
    <button
      id={id}
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0
        ${checked ? 'bg-sp-blue' : 'bg-sp-border'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200
        ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );

  return (
    <MainLayout hideRight>
      <div className="max-w-[1000px] mx-auto select-none mt-2">
        <div className="flex gap-4 flex-col md:flex-row items-start">
          {/* Left Navigation */}
          <aside className="w-full md:w-72 flex-shrink-0">
            <div className="card p-3 sticky top-20 flex md:flex-col overflow-x-auto no-scroll md:overflow-x-visible gap-1 md:min-h-[calc(100vh-6rem)]">
              <div className="mb-4 hidden md:block">
                <h1 className="text-2xl font-bold text-sp-text mb-3 px-2">Settings</h1>
                <div className="relative px-2 mb-2">
                  <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-sp-muted" size={16} />
                  <input
                    type="text"
                    placeholder="Find the setting you need"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-sp-overlay rounded-full pl-10 pr-4 py-2.5 text-[15px] text-sp-text border border-sp-border focus:border-sp-blue outline-none transition-colors placeholder-sp-muted"
                  />
                </div>
              </div>

              <div className="hidden md:block text-[13px] font-bold text-sp-sub uppercase tracking-wider mb-1 mt-2 px-3">
                Most visited settings
              </div>

              {filteredSections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={`flex-shrink-0 md:w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-semibold transition-all text-left
                    ${active === s.id
                      ? 'bg-sp-blue/10 text-sp-blue'
                      : 'text-sp-text hover:bg-sp-hover'
                    }`}
                >
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center ${active === s.id ? 'bg-sp-blue text-white' : 'bg-sp-overlay text-sp-sub'}`}>
                    {s.icon}
                  </span>
                  {s.label}
                </button>
              ))}

              {filteredSections.length === 0 && (
                <p className="text-sm text-sp-muted px-3 py-4">No matching settings found.</p>
              )}
            </div>
          </aside>

          {/* Form Content */}
          <div className="flex-1 min-w-0">

            {/* ── Tab: Account Settings ────────────────────────── */}
            {active === 'account' && (
              <form onSubmit={handleSaveAccount} className="card p-6 space-y-4">
                <h2 className="text-lg font-bold text-sp-text mb-4">Account Settings</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider mb-1.5 block">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isCooldownActive && !user?.isAdmin}
                      className={clsx(
                        "input",
                        isCooldownActive && !user?.isAdmin && "opacity-65 cursor-not-allowed bg-sp-hover"
                      )}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider mb-1.5 block">Username</label>
                    <input
                      type="text"
                      value={usernameState}
                      onChange={(e) => setUsernameState(e.target.value)}
                      disabled={isCooldownActive && !user?.isAdmin}
                      className={clsx(
                        "input",
                        isCooldownActive && !user?.isAdmin && "opacity-65 cursor-not-allowed bg-sp-hover"
                      )}
                    />
                  </div>
                </div>

                {isCooldownActive && !user?.isAdmin && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold px-4 py-2.5 rounded-xl animate-fade-in flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    You can change your name or username again in {remainingDays} days.
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider mb-1.5 block">Bio</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="input resize-none" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider mb-1.5 block">Location</label>
                    <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider mb-1.5 block">Website</label>
                    <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} className="input" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider mb-1.5 block">Workplace</label>
                    <input type="text" value={workplace} onChange={(e) => setWorkplace(e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider mb-1.5 block">Education</label>
                    <input type="text" value={education} onChange={(e) => setEducation(e.target.value)} className="input" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider mb-1.5 block">Age</label>
                    <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="input" min="0" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider mb-1.5 block">Relationship Status</label>
                    <select
                      value={relationshipStatus}
                      onChange={(e) => setRelationshipStatus(e.target.value)}
                      className="input [color-scheme:dark]"
                    >
                      <option value="">Select Status</option>
                      <option value="Single">Single</option>
                      <option value="In a relationship">In a relationship</option>
                      <option value="Engaged">Engaged</option>
                      <option value="Married">Married</option>
                      <option value="It's complicated">It's complicated</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider mb-1.5 block">City</label>
                    <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider mb-1.5 block">Country</label>
                    <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className="input" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider mb-1.5 block">School</label>
                  <input type="text" value={school} onChange={(e) => setSchool(e.target.value)} className="input" />
                </div>

                {/* Professional Mode Section */}
                <div className="pt-4 border-t border-sp-divider space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-sp-text">Professional Mode</h3>
                      <p className="text-xs text-sp-muted">Switch to a Creator account to show category details, public contact info, and view performance insights.</p>
                    </div>
                    <ToggleSwitch
                      checked={isProfessional}
                      onChange={setIsProfessional}
                      id="professional-toggle"
                    />
                  </div>

                  {isProfessional && (
                    <div className="space-y-4 pt-2 animate-fade-in">
                      <div>
                        <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider mb-1.5 block">Category</label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="input [color-scheme:dark]"
                        >
                          <option value="">Select Category</option>
                          <option value="Content Creator">Content Creator</option>
                          <option value="Musician">Musician</option>
                          <option value="Public Figure">Public Figure</option>
                          <option value="Business">Business</option>
                          <option value="Photographer">Photographer</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider mb-1.5 block">Public Email</label>
                          <input type="email" value={publicEmail} onChange={(e) => setPublicEmail(e.target.value)} placeholder="public@email.com" className="input" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider mb-1.5 block">Public Phone</label>
                          <input type="text" value={publicPhone} onChange={(e) => setPublicPhone(e.target.value)} placeholder="+1234567890" className="input" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider mb-1.5 block">Public Website</label>
                          <input type="text" value={publicWebsite} onChange={(e) => setPublicWebsite(e.target.value)} placeholder="www.website.com" className="input" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  <FiSave size={15} />
                  {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
                </button>
              </form>
            )}

            {/* ── Tab: Privacy Settings ────────────────────────── */}
            {active === 'privacy' && (
              <form onSubmit={handleSavePrivacy} className="card p-6 space-y-5 animate-fade-in">
                <h2 className="text-lg font-bold text-sp-text mb-4">Privacy Preferences</h2>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider">Who can see your profile</label>
                  <select
                    value={profilePrivacy}
                    onChange={(e) => setProfilePrivacy(e.target.value)}
                    className="input w-full [color-scheme:dark]"
                  >
                    <option value="public">Public (Everyone)</option>
                    <option value="friends">Friends Only</option>
                    <option value="private">Private (Only Me)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider">Who can see my friends list</label>
                    <select
                      value={friendsVisibility}
                      onChange={(e) => setFriendsVisibility(e.target.value)}
                      className="input w-full [color-scheme:dark]"
                    >
                      <option value="public">Everyone</option>
                      <option value="friends">Friends Only</option>
                      <option value="private">Only Me</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider">Who can see who I follow</label>
                    <select
                      value={followingVisibility}
                      onChange={(e) => setFollowingVisibility(e.target.value)}
                      className="input w-full [color-scheme:dark]"
                    >
                      <option value="public">Everyone</option>
                      <option value="friends">Friends Only</option>
                      <option value="private">Only Me</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-sp-divider">
                  <div>
                    <p className="text-sm font-semibold text-sp-text">Timeline Review</p>
                    <p className="text-xs text-sp-muted">Require review before tagged posts show on your profile</p>
                  </div>
                  <ToggleSwitch
                    checked={taggingApproval}
                    onChange={setTaggingApproval}
                  />
                </div>

                <div className="flex items-center justify-between py-2 border-b border-sp-divider">
                  <div>
                    <p className="text-sm font-semibold text-sp-text">Search Discoverability</p>
                    <p className="text-xs text-sp-muted">Allow others to find your account by email or phone</p>
                  </div>
                  <ToggleSwitch
                    checked={searchVisibility}
                    onChange={setSearchVisibility}
                  />
                </div>

                <button type="submit" className="btn-primary flex items-center gap-2">
                  <FiSave size={15} /> Save Privacy Settings
                </button>
              </form>
            )}

            {/* ── Tab: Security Settings ────────────────────────── */}
            {active === 'security' && (
              <form onSubmit={handleChangePassword} className="card p-6 space-y-4 animate-fade-in">
                <h2 className="text-lg font-bold text-sp-text mb-4 flex items-center gap-2">
                  <FiShield className="text-sp-blue" /> Security Settings
                </h2>

                <div>
                  <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider mb-1.5 block">Current Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider mb-1.5 block">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider mb-1.5 block">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Re-type new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input"
                  />
                </div>

                <button type="submit" disabled={changingPass} className="btn-primary flex items-center gap-2">
                  <FiSave size={15} />
                  {changingPass ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            )}

            {/* ── Tab: Notifications ───────────────────────────── */}
            {active === 'notifications' && (
              <div className="card p-6 space-y-4">
                <h2 className="text-lg font-bold text-sp-text mb-4">Notification Preferences</h2>
                <div className="flex items-center justify-between py-2 border-b border-sp-divider">
                  <div>
                    <p className="text-sm font-medium text-sp-text">Like Notifications</p>
                    <p className="text-xs text-sp-muted">Receive alerts when someone likes your post or reel</p>
                  </div>
                  <ToggleSwitch
                    checked={notifPrefs.likes}
                    onChange={(v) => handleSaveNotifPref('likes', v)}
                  />
                </div>
                <div className="flex items-center justify-between py-2 border-b border-sp-divider">
                  <div>
                    <p className="text-sm font-medium text-sp-text">Comment Notifications</p>
                    <p className="text-xs text-sp-muted">Receive alerts when someone comments on your post or reel</p>
                  </div>
                  <ToggleSwitch
                    checked={notifPrefs.comments}
                    onChange={(v) => handleSaveNotifPref('comments', v)}
                  />
                </div>
                <div className="flex items-center justify-between py-2 border-b border-sp-divider">
                  <div>
                    <p className="text-sm font-medium text-sp-text">Friend Request Notifications</p>
                    <p className="text-xs text-sp-muted">Receive alerts when someone sends you a friend request</p>
                  </div>
                  <ToggleSwitch
                    checked={notifPrefs.friendRequests}
                    onChange={(v) => handleSaveNotifPref('friendRequests', v)}
                  />
                </div>
                <div className="flex items-center justify-between py-2 border-b border-sp-divider">
                  <div>
                    <p className="text-sm font-medium text-sp-text">Message Notifications</p>
                    <p className="text-xs text-sp-muted">Receive alerts when someone sends you a message</p>
                  </div>
                  <ToggleSwitch
                    checked={notifPrefs.messages}
                    onChange={(v) => handleSaveNotifPref('messages', v)}
                  />
                </div>
              </div>
            )}

            {/* ── Tab: Content Preferences ─────────────────────── */}
            {active === 'content_prefs' && (
              <div className="card p-6 space-y-4">
                <h2 className="text-lg font-bold text-sp-text mb-4">Content Preferences</h2>
                <div className="py-2 border-b border-sp-divider">
                  <h3 className="text-sm font-semibold text-sp-text mb-1">Blocked Users</h3>
                  <p className="text-xs text-sp-muted mb-4">Users you block will not be able to see your posts, tag you, or send you messages.</p>
                  
                  {(!user?.blockedUsers || user.blockedUsers.length === 0) ? (
                    <p className="text-sm text-sp-muted italic">You haven't blocked anyone.</p>
                  ) : (
                    <div className="space-y-3">
                      {user.blockedUsers.map(blockedId => (
                        <div key={blockedId} className="flex items-center justify-between p-3 rounded-lg bg-sp-overlay border border-sp-border">
                          <span className="text-sm text-sp-text font-medium">User ID: {blockedId}</span>
                          <button 
                            onClick={async () => {
                              try {
                                const res = await usersAPI.blockUser(blockedId);
                                updateCurrentUser({ ...user, blockedUsers: res.blockedUsers });
                                showToast('success', 'User unblocked');
                              } catch(e) {
                                showToast('error', 'Failed to unblock user');
                              }
                            }}
                            className="text-xs font-semibold text-sp-blue hover:underline"
                          >
                            Unblock
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Tab: Display & Theme ─────────────────────────── */}
            {active === 'display' && (
              <div className="card p-6 space-y-6">
                <h2 className="text-lg font-bold text-sp-text mb-2">{t('settings.displaySettings')}</h2>

                {/* Theme toggle */}
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-sp-text">{t('settings.appTheme')}</p>
                    <p className="text-xs text-sp-muted mt-0.5">{t('settings.appThemeDesc')}</p>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="flex items-center gap-2 px-4 py-2 bg-sp-overlay border border-sp-border rounded-xl text-sm font-semibold hover:bg-sp-hover text-sp-text transition-colors"
                  >
                    {theme === 'dark' ? (
                      <><FiSun className="text-yellow-400" /> {t('settings.lightMode')}</>
                    ) : (
                      <><FiMoon className="text-sp-blue" /> {t('settings.darkMode')}</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ── Tab: Language ────────────────────────────────── */}
            {active === 'language' && (
              <div className="card p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-sp-text mb-1">{t('settings.languageSetting')}</h2>
                  <p className="text-xs text-sp-muted mt-0.5">{t('settings.languageSettingDesc')}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {LANGUAGE_OPTIONS.map((langOpt) => {
                    const isSelected = lang === langOpt.code;
                    return (
                      <button
                        key={langOpt.code}
                        onClick={() => setLanguage(langOpt.code, { userId: user?.id || user?._id })}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-200
                          ${
                            isSelected
                              ? 'border-sp-blue bg-sp-blue/8 ring-2 ring-sp-blue/20 shadow-glow-sm'
                              : 'border-sp-border bg-sp-overlay hover:bg-sp-hover hover:border-sp-blue/40'
                          }`}
                      >
                        <span className="text-2xl leading-none flex-shrink-0">{langOpt.flag}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${
                            isSelected ? 'text-sp-blue' : 'text-sp-text'
                          }`}>
                            {langOpt.nativeName}
                          </p>
                          <p className="text-[11px] text-sp-muted">
                            {t(`languages.${langOpt.code}`)}
                          </p>
                        </div>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-sp-blue flex items-center justify-center flex-shrink-0">
                            <svg viewBox="0 0 12 12" width={10} height={10} fill="none">
                              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </MainLayout>
  );
}
