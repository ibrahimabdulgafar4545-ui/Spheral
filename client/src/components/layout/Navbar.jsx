import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FiSearch, FiHome, FiBell, FiMessageCircle,
  FiMenu, FiX, FiChevronDown, FiSettings, FiLogOut,
  FiUser, FiHelpCircle, FiBookmark, FiMoon, FiChevronLeft, FiChevronRight, FiClock, FiVideo,
  FiCalendar, FiEdit3, FiImage, FiUsers, FiGrid, FiPlayCircle, FiPlus, FiShield
} from 'react-icons/fi';
import { MdOutlinePeopleAlt } from 'react-icons/md';
import { IoGridOutline } from 'react-icons/io5';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import clsx from 'clsx';
import { getAssetUrl } from '../../utils/helpers';
import Avatar from '../ui/Avatar';
import VerifiedBadge from '../ui/VerifiedBadge';

function GridWaffleIcon({ size = 18, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" {...props}>
      <rect x="3" y="3" width="4" height="4" rx="1" />
      <rect x="10" y="3" width="4" height="4" rx="1" />
      <rect x="17" y="3" width="4" height="4" rx="1" />
      <rect x="3" y="10" width="4" height="4" rx="1" />
      <rect x="10" y="10" width="4" height="4" rx="1" />
      <rect x="17" y="10" width="4" height="4" rx="1" />
      <rect x="3" y="17" width="4" height="4" rx="1" />
      <rect x="10" y="17" width="4" height="4" rx="1" />
      <rect x="17" y="17" width="4" height="4" rx="1" />
    </svg>
  );
}

export default function Navbar() {
  const { user, unreadNotifCount, pendingFriendRequests, unreadMessageCount, setSearch, logout, friendsList, openConversation, toggleTheme, accounts, switchAccount, removeAccountSession } = useApp();
  const { t } = useLanguage();
  const [searchVal, setSearchVal]   = useState('');

  const NAV_ITEMS = [
    { to: '/',             icon: FiHome,             label: t('nav.home') },
    { to: '/friends',      icon: MdOutlinePeopleAlt, label: t('nav.friends'),  badgeKey: 'pendingFriendRequests' },
    { to: '/reels',        icon: FiPlayCircle,       label: t('reels.title') },
    { to: '/groups',       icon: IoGridOutline,      label: t('nav.groups') },
  ];
  const [searchFocus, setSearchFocus] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showGrid, setShowGrid]       = useState(false);
  const [profileMenuLevel, setProfileMenuLevel] = useState('main'); // 'main', 'settings', 'mobile_settings'
  const [showMessages, setShowMessages] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileCreateOpen, setMobileCreateOpen] = useState(true);
  const [mobileSocialOpen, setMobileSocialOpen] = useState(true);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [showMobileAccounts, setShowMobileAccounts] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const chatParam = searchParams.get('chat');
  const isMobileChat = location.pathname.startsWith('/messages') && chatParam && typeof window !== 'undefined' && window.innerWidth < 768;
  const isLivePage = location.pathname.startsWith('/live');

  if (isMobileChat || isLivePage) {
    return null;
  }

  const currentUserId = user?.id || user?._id;
  const otherAccounts = (accounts || []).filter(a => a.id !== currentUserId);
  
  const notifRef   = useRef(null);
  const profileRef = useRef(null);
  const messagesRef = useRef(null);
  const gridRef     = useRef(null);

  // Close dropdowns on outside click or escape key
  useEffect(() => {
    const clickFn = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
      if (gridRef.current && !gridRef.current.contains(e.target)) setShowGrid(false);
    };
    const keyFn = (e) => {
      if (e.key === 'Escape') {
        setShowProfile(false);
        setShowGrid(false);
      }
    };
    document.addEventListener('mousedown', clickFn);
    document.addEventListener('keydown', keyFn);
    return () => {
      document.removeEventListener('mousedown', clickFn);
      document.removeEventListener('keydown', keyFn);
    };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchVal.trim()) return;
    setSearch(searchVal.trim());
    navigate(`/search?q=${encodeURIComponent(searchVal.trim())}`);
    setSearchFocus(false);
  };

  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const badgeMap = { pendingFriendRequests };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 glass border-b border-sp-border/60 select-none pt-[env(safe-area-inset-top,0px)] box-content">
        <div className="max-w-screen-xl mx-auto h-full flex items-center justify-between px-3 gap-2">

          {/* Logo + Search */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {location.pathname !== '/' && (
              <button
                onClick={() => navigate(-1)}
                className="w-8.5 h-8.5 rounded-full bg-sp-overlay hover:bg-sp-hover text-sp-text flex items-center justify-center transition-colors border border-sp-border mr-0.5"
                title="Go Back"
              >
                <FiChevronLeft size={20} className="stroke-[2.5]" />
              </button>
            )}
            <Link to="/" className="flex items-center gap-2 group" aria-label="Spheral home">
              <div className="w-9 h-9 rounded-xl bg-sp-blue flex items-center justify-center shadow-glow-sm group-hover:shadow-glow-blue transition-shadow">
                <span className="text-white font-black text-[18px] leading-none tracking-tight">S</span>
              </div>
              <span className="text-lg font-black text-gradient hidden sm:block tracking-tight">Spheral</span>
            </Link>

            {/* Search */}
            <form onSubmit={handleSearch} className="relative hidden md:flex items-center ml-1">
              <FiSearch
                className={clsx('absolute left-3 transition-colors text-sm', searchFocus ? 'text-sp-blue' : 'text-sp-muted')}
                size={14}
              />
              <input
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                onFocus={() => setSearchFocus(true)}
                onBlur={() => setSearchFocus(false)}
                placeholder="Search Spheral"
                className={clsx(
                  'bg-sp-overlay rounded-full pl-9 pr-4 py-2 text-sm text-sp-text placeholder-sp-muted',
                  'border focus:outline-none transition-all duration-300',
                  searchFocus
                    ? 'border-sp-blue ring-2 ring-sp-blue/20 w-64'
                    : 'border-sp-border w-52 hover:border-sp-border/80'
                )}
              />
            </form>
          </div>

          {/* Center Navigation */}
          <div className="hidden md:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
            {NAV_ITEMS.map(({ to, icon: Icon, label, badgeKey }) => {
              const active = isActive(to);
              const count  = badgeKey ? badgeMap[badgeKey] : 0;
              return (
                <Link
                  key={to}
                  to={to}
                  title={label}
                  className={clsx(
                    'relative flex items-center justify-center w-24 h-11 rounded-xl transition-all duration-150',
                    active
                      ? 'text-sp-blue'
                      : 'text-sp-sub hover:text-sp-text hover:bg-sp-hover'
                  )}
                >
                  <Icon size={22} />
                  {active && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-10 rounded-full bg-sp-blue" />
                  )}
                  {count > 0 && (
                    <span className="badge">{count > 9 ? '9+' : count}</span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1">
            {/* Grid Waffle Menu */}
            <div ref={gridRef} className="relative hidden md:block">
              <button
                onClick={() => { setShowGrid(!showGrid); setShowProfile(false); }}
                className={clsx('nav-btn', showGrid && 'bg-sp-hover text-sp-blue')}
                title="Menu"
              >
                <GridWaffleIcon />
              </button>

              {showGrid && (
                <div className="dropdown w-[500px] right-0 top-full mt-2 p-5 animate-slide-down grid grid-cols-2 gap-6 bg-sp-card border border-sp-border shadow-2xl rounded-2xl select-none">
                  {/* Left Column: Social */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-sp-text text-base px-2">Social</h3>
                    <div className="flex flex-col gap-1">
                      {[
                        { to: '/friends', icon: FiUsers, label: 'Friends', desc: 'Find friends and connections' },
                        { to: '/groups', icon: IoGridOutline, label: 'Groups', desc: 'Connect with communities' },
                        { to: '/bookmarks', icon: FiBookmark, label: 'Saved', desc: 'Find your saved posts and reels' },
                        { to: '/memories', icon: FiClock, label: 'Memories', desc: 'Browse your past moments' },
                        { to: '/events', icon: FiCalendar, label: 'Events', desc: 'Discover local meetups' },
                        { to: '/notifications', icon: FiBell, label: 'Notifications', desc: 'View your notifications activity' },
                      ].map(item => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setShowGrid(false)}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-sp-hover transition-colors"
                        >
                          <div className="w-9 h-9 rounded-full bg-sp-overlay text-sp-blue flex items-center justify-center flex-shrink-0">
                            <item.icon size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sp-text text-sm leading-none">{item.label}</p>
                            <p className="text-[11px] text-sp-muted mt-1 truncate">{item.desc}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Create */}
                  <div className="space-y-4 border-l border-sp-border pl-6">
                    <h3 className="font-bold text-sp-text text-base px-2">{t('nav.create')}</h3>
                    <div className="flex flex-col gap-1">
                      {[
                        { to: '/?createPost=true', icon: FiEdit3, label: t('nav.createPost'), desc: t('feed.whatsOnMind') },
                        { to: '/?createStory=true', icon: FiImage, label: t('nav.createStory'), desc: t('nav.createStory') },
                        { to: '/reels?createReel=true', icon: FiPlayCircle, label: t('nav.createReel'), desc: t('reels.uploadReel') },
                        { to: `/live/live_user_${user?.id || user?._id}?host=true`, icon: FiVideo, label: t('nav.goLive'), desc: t('nav.goLive') },
                        { to: '/groups?create=true', icon: IoGridOutline, label: t('groups.createGroup'), desc: t('groups.createGroup') },
                        { to: '/events?create=true', icon: FiCalendar, label: t('nav.createEvent'), desc: t('nav.createEvent') },
                      ].map(item => (
                        <Link
                          key={item.label}
                          to={item.to}
                          onClick={() => setShowGrid(false)}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-sp-hover transition-colors"
                        >
                          <div className="w-9 h-9 rounded-full bg-sp-overlay text-sp-blue flex items-center justify-center flex-shrink-0">
                            <item.icon size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sp-text text-sm leading-none">{item.label}</p>
                            <p className="text-[11px] text-sp-muted mt-1 truncate">{item.desc}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Search Button (Mobile only) */}
            <div className="relative md:hidden">
              <button
                onClick={() => { navigate('/search'); setShowNotifs(false); setShowProfile(false); }}
                className="nav-btn"
                title="Search"
              >
                <FiSearch size={20} />
              </button>
            </div>

            {/* Create/Upload Button */}
            <div className="relative">
              <Link
                to="/reels?createReel=true"
                className="nav-btn text-sp-blue hover:bg-sp-blue/10"
                title="Create/Upload Reel"
              >
                <FiPlus size={20} />
              </Link>
            </div>

            {/* Messages Button (Goes directly to /messages full page) */}
            <div className="relative">
              <button
                id="nav-messages"
                onClick={() => { navigate('/messages'); setShowNotifs(false); setShowProfile(false); }}
                className="nav-btn"
                title="Messenger"
              >
                <FiMessageCircle size={20} />
                {unreadMessageCount > 0 && (
                  <span className="badge animate-pulse-slow">{unreadMessageCount > 9 ? '9+' : unreadMessageCount}</span>
                )}
              </button>
            </div>

            {/* Notifications (Goes directly to /notifications full page) */}
            <div className="relative hidden md:block">
              <button
                id="nav-notifications"
                onClick={() => { navigate('/notifications'); setShowProfile(false); }}
                className="nav-btn"
                title="Notifications"
              >
                <FiBell size={20} />
                {unreadNotifCount > 0 && (
                  <span className="badge animate-pulse-slow">{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</span>
                )}
              </button>
            </div>

            {/* Profile Dropdown */}
            <div ref={profileRef} className="relative hidden md:block">
              <button
                id="nav-profile"
                onClick={() => { setShowProfile(!showProfile); setShowNotifs(false); setShowMessages(false); }}
                className="flex items-center gap-1.5 p-1 pl-1 pr-2 rounded-full hover:bg-sp-hover transition-colors cursor-pointer ml-0.5"
              >
                <Avatar src={user?.avatar} alt={user?.name} className="w-8 h-8" ring={true} />
                <FiChevronDown
                  size={13}
                  className={clsx('text-sp-muted transition-transform duration-200', showProfile && 'rotate-180')}
                />
              </button>

              {showProfile && (
                <div className="dropdown w-[320px] right-0 top-full mt-2 py-2.5 animate-slide-down">
                  {profileMenuLevel === 'main' ? (
                    <>
                      {/* Accounts Section (X/TikTok Switcher Style) */}
                      <div className="px-3 pb-2 border-b border-sp-border/60">
                        {/* Current Active Account */}
                        <div className="flex items-center justify-between p-2 rounded-xl bg-sp-blue/5 border border-sp-blue/15">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar src={user?.avatar} alt={user?.name} className="w-8 h-8 rounded-full" />
                          <div className="min-w-0 text-left">
                              <div className="flex items-center gap-1">
                                <p className="font-bold text-sp-text text-sm truncate leading-tight">{user?.name}</p>
                                {user?.verified && <VerifiedBadge size={12} />}
                              </div>
                              <p className="text-[10px] text-sp-muted">@{user?.username || 'active'}</p>
                            </div>
                          </div>
                          <span className="w-2.5 h-2.5 rounded-full bg-sp-blue ring-4 ring-sp-blue/20 shrink-0" />
                        </div>

                        {/* Other Accounts List */}
                        {otherAccounts.map(acc => (
                          <div key={acc.id} className="w-full flex items-center justify-between p-1 mt-1.5 rounded-xl hover:bg-sp-hover transition-colors group/acc">
                            <button
                              onClick={() => { switchAccount(acc.id); setShowProfile(false); }}
                              className="flex-1 flex items-center gap-2.5 p-1 text-left min-w-0"
                            >
                              <Avatar src={acc.avatar} alt={acc.name} className="w-8 h-8 rounded-full" />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sp-text text-sm truncate leading-tight">{acc.name}</p>
                                <p className="text-[10px] text-sp-muted">@{acc.username}</p>
                              </div>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeAccountSession(acc.id);
                              }}
                              className="w-6 h-6 rounded-full hover:bg-sp-divider flex items-center justify-center text-sp-muted hover:text-sp-red transition-colors mr-1 shrink-0"
                              title="Remove account"
                            >
                              <FiX size={13} />
                            </button>
                          </div>
                        ))}

                        {/* Add Account Row */}
                        <button
                          onClick={() => { setShowProfile(false); navigate('/login?add_account=true'); }}
                          className="w-full flex items-center gap-2.5 p-2 mt-1.5 rounded-xl text-sp-blue hover:bg-sp-blue/5 transition-colors text-left font-bold text-xs"
                        >
                          <div className="w-8 h-8 rounded-full bg-sp-blue/10 flex items-center justify-center text-sp-blue shrink-0">
                            <FiPlus size={16} />
                          </div>
                          <span>{t('auth.noAccount')}</span>
                        </button>
                      </div>

                      <div className="px-1.5 pt-2">
                        {user?.isAdmin && (
                          <button onClick={() => { setShowProfile(false); navigate('/admin'); }} className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-sp-hover text-sp-text text-sm transition-colors text-left font-medium">
                            <div className="flex items-center gap-2.5">
                              <FiShield size={17} className="text-sp-blue" />
                              <span className="text-sp-blue font-bold">{t('nav.adminDashboard')}</span>
                            </div>
                          </button>
                        )}
                        <button onClick={() => setProfileMenuLevel('settings')} className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-sp-hover text-sp-text text-sm transition-colors text-left font-medium">
                          <div className="flex items-center gap-2.5">
                            <FiSettings size={17} className="text-sp-muted" />
                            <span>{t('nav.settingsPrivacy')}</span>
                          </div>
                          <FiChevronRight size={14} className="text-sp-muted" />
                        </button>
                        <button onClick={() => { setShowProfile(false); navigate('/help-center'); }} className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-sp-hover text-sp-text text-sm transition-colors text-left font-medium">
                          <div className="flex items-center gap-2.5">
                            <FiHelpCircle size={17} className="text-sp-muted" />
                            <span>{t('nav.helpSupport')}</span>
                          </div>
                          <FiChevronRight size={14} className="text-sp-muted" />
                        </button>
                        <button onClick={toggleTheme} className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-sp-hover text-sp-text text-sm transition-colors text-left font-medium">
                          <div className="flex items-center gap-2.5">
                            <FiMoon size={17} className="text-sp-muted" />
                            <span>{t('nav.display')}</span>
                          </div>
                        </button>
                        <button onClick={() => { setShowProfile(false); navigate('/help-center'); }} className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-sp-hover text-sp-text text-sm transition-colors text-left font-medium">
                          <div className="flex items-center gap-2.5">
                            <FiMessageCircle size={17} className="text-sp-muted" />
                            <span>{t('nav.feedback')}</span>
                          </div>
                        </button>
                        <button onClick={() => { logout(); setShowProfile(false); navigate('/login'); }} className="w-full flex items-center justify-between px-3 py-2 mt-1 rounded-xl hover:bg-sp-red/10 text-sp-red text-sm transition-colors text-left font-bold">
                          <div className="flex items-center gap-2.5">
                            <FiLogOut size={17} />
                            <span>{t('nav.logOut')}</span>
                          </div>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-2 flex items-center gap-3 border-b border-sp-divider pb-3 mb-2">
                        <button onClick={() => setProfileMenuLevel('main')} className="w-9 h-9 rounded-full hover:bg-sp-hover flex items-center justify-center text-sp-muted transition-colors">
                          <FiChevronLeft size={24} />
                        </button>
                        <h2 className="font-bold text-sp-text text-[20px]">{t('nav.settingsPrivacy')}</h2>
                      </div>
                      <div className="p-2 pb-3">
                        <Link to="/settings" onClick={() => setShowProfile(false)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-sp-hover text-sp-text font-medium text-[15px] transition-colors">
                          <div className="w-9 h-9 rounded-full bg-sp-overlay flex items-center justify-center text-sp-sub"><FiSettings size={20} /></div>
                          {t('settings.title')}
                        </Link>
                        <Link to="/settings#privacy_checkup" onClick={() => setShowProfile(false)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-sp-hover text-sp-text font-medium text-[15px] transition-colors">
                          <div className="w-9 h-9 rounded-full bg-sp-overlay flex items-center justify-center text-sp-sub"><FiUser size={20} /></div>
                          {t('settings.privacy')}
                        </Link>
                        <Link to="/settings#privacy_center" onClick={() => setShowProfile(false)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-sp-hover text-sp-text font-medium text-[15px] transition-colors">
                          <div className="w-9 h-9 rounded-full bg-sp-overlay flex items-center justify-center text-sp-sub"><FiUser size={20} /></div>
                          {t('settings.profileVisibility')}
                        </Link>
                        <Link to="/settings#activity_log" onClick={() => setShowProfile(false)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-sp-hover text-sp-text font-medium text-[15px] transition-colors">
                          <div className="w-9 h-9 rounded-full bg-sp-overlay flex items-center justify-center text-sp-sub"><FiClock size={20} /></div>
                          {t('settings.accountInfo')}
                        </Link>
                        <Link to="/settings#content_prefs" onClick={() => setShowProfile(false)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-sp-hover text-sp-text font-medium text-[15px] transition-colors">
                          <div className="w-9 h-9 rounded-full bg-sp-overlay flex items-center justify-center text-sp-sub"><FiSettings size={20} /></div>
                          {t('settings.contentPreferences')}
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              id="nav-mobile-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="nav-btn md:hidden ml-1"
            >
              {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu overlay */}
        {mobileOpen && (
          <div className="md:hidden fixed top-0 left-0 w-screen h-screen z-[999] bg-sp-bg overflow-y-auto animate-fade-in pb-24">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-sp-text">Menu</h1>
                <div className="flex gap-2">
                   <button onClick={() => { setMobileOpen(false); navigate('/settings'); }} className="w-9 h-9 rounded-full bg-sp-overlay flex items-center justify-center text-sp-text" title="Settings"><FiSettings size={18} /></button>
                <button onClick={() => { setMobileOpen(false); navigate('/search'); }} className="w-9 h-9 rounded-full bg-sp-overlay flex items-center justify-center text-sp-text" title="Search"><FiSearch size={18} /></button>
                   <button onClick={() => setMobileOpen(false)} className="w-9 h-9 rounded-full bg-sp-overlay flex items-center justify-center text-sp-text font-bold" title="Close"><FiX size={18} /></button>
                </div>
              </div>
              
              {/* Mobile Active User Card (Switching trigger) */}
              <div className="flex items-center justify-between bg-sp-card p-3 rounded-xl shadow-sm mb-4 border border-sp-border">
                <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={() => { setMobileOpen(false); navigate(`/profile/${user?.id}`); }}>
                   <Avatar src={user?.avatar} alt={user?.name} className="w-10 h-10" />
                   <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-1">
                        <p className="font-semibold text-sp-text truncate">{user?.name}</p>
                        {user?.verified && <VerifiedBadge size={13} />}
                      </div>
                      <p className="text-xs text-sp-sub">@{user?.username || 'active'}</p>
                   </div>
                </div>
                <button
                  onClick={() => setShowMobileAccounts(!showMobileAccounts)}
                  className="p-1.5 text-sp-muted hover:text-sp-text rounded-full hover:bg-sp-hover transition-colors shrink-0"
                >
                  <FiChevronDown size={20} className={clsx('transition-transform duration-200', showMobileAccounts && 'rotate-180')} />
                </button>
              </div>

              {/* Mobile Accounts List */}
              {showMobileAccounts && (
                <div className="bg-sp-card border border-sp-border rounded-xl p-3 mb-4 shadow-sm animate-slide-down">
                  <p className="text-[10px] font-bold text-sp-muted uppercase tracking-wider mb-2.5 text-left">Switch Accounts</p>
                  
                  {otherAccounts.map(acc => (
                    <div key={acc.id} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-sp-hover transition-colors mb-1.5">
                      <button
                        onClick={() => { switchAccount(acc.id); setMobileOpen(false); }}
                        className="flex-1 flex items-center gap-2.5 text-left min-w-0"
                      >
                        <Avatar src={acc.avatar} alt={acc.name} className="w-8 h-8 rounded-full" />
                        <div className="min-w-0">
                          <p className="font-semibold text-sp-text text-sm truncate leading-none">{acc.name}</p>
                          <p className="text-[10px] text-sp-muted mt-0.5">@{acc.username}</p>
                        </div>
                      </button>
                      <button
                        onClick={() => removeAccountSession(acc.id)}
                        className="w-6 h-6 rounded-full hover:bg-sp-divider flex items-center justify-center text-sp-muted hover:text-sp-red shrink-0"
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => { setMobileOpen(false); navigate('/login?add_account=true'); }}
                    className="w-full flex items-center gap-2.5 p-1.5 rounded-lg text-sp-blue hover:bg-sp-blue/5 transition-colors font-bold text-xs text-left mt-2 border-t border-sp-border/50 pt-2"
                  >
                    <div className="w-8 h-8 rounded-full bg-sp-blue/10 flex items-center justify-center text-sp-blue shrink-0">
                      <FiPlus size={16} />
                    </div>
                    <span>Add an existing account</span>
                  </button>
                </div>
              )}
              
              {/* Create Accordion */}
              <button
                onClick={() => setMobileCreateOpen(!mobileCreateOpen)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-sp-hover border-b border-sp-border/50"
              >
                <div className="flex items-center gap-3">
                  <FiPlus size={22} className="text-sp-blue" />
                  <span className="font-semibold text-sp-text text-base">Create</span>
                </div>
                <FiChevronDown size={20} className={clsx('text-sp-muted transition-transform', mobileCreateOpen && 'rotate-180')} />
              </button>

              {mobileCreateOpen && (
                <div className="pl-6 flex flex-col gap-1 mt-2 mb-4 animate-slide-down">
                  <Link to="/?createPost=true" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-sp-hover text-sp-text font-semibold text-[15px]">
                    <div className="w-8 h-8 rounded-full bg-sp-blue/10 text-sp-blue flex items-center justify-center"><FiEdit3 size={16} /></div>
                    Create Post
                  </Link>
                  <Link to="/?createStory=true" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-sp-hover text-sp-text font-semibold text-[15px]">
                    <div className="w-8 h-8 rounded-full bg-sp-blue/10 text-sp-blue flex items-center justify-center"><FiImage size={16} /></div>
                    Create Story
                  </Link>
                  <Link to="/reels?createReel=true" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-sp-hover text-sp-text font-semibold text-[15px]">
                    <div className="w-8 h-8 rounded-full bg-sp-blue/10 text-sp-blue flex items-center justify-center"><FiPlayCircle size={16} /></div>
                    Create Reel
                  </Link>
                  <Link to={`/live/live_user_${user?.id || user?._id}?host=true`} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-sp-hover text-sp-text font-semibold text-[15px]">
                    <div className="w-8 h-8 rounded-full bg-sp-blue/10 text-sp-blue flex items-center justify-center"><FiVideo size={16} /></div>
                    Go Live
                  </Link>
                  <Link to="/groups?create=true" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-sp-hover text-sp-text font-semibold text-[15px]">
                    <div className="w-8 h-8 rounded-full bg-sp-blue/10 text-sp-blue flex items-center justify-center"><IoGridOutline size={16} /></div>
                    Create Group
                  </Link>
                  <Link to="/events?create=true" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-sp-hover text-sp-text font-semibold text-[15px]">
                    <div className="w-8 h-8 rounded-full bg-sp-blue/10 text-sp-blue flex items-center justify-center"><FiCalendar size={16} /></div>
                    Create Event
                  </Link>
                </div>
              )}

              {/* Social Accordion */}
              <button
                onClick={() => setMobileSocialOpen(!mobileSocialOpen)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-sp-hover border-b border-sp-border/50"
              >
                <div className="flex items-center gap-3">
                  <FiGrid size={22} className="text-sp-blue" />
                  <span className="font-semibold text-sp-text text-base">Social</span>
                </div>
                <FiChevronDown size={20} className={clsx('text-sp-muted transition-transform', mobileSocialOpen && 'rotate-180')} />
              </button>

              {mobileSocialOpen && (
                <div className="pl-6 flex flex-col gap-1 mt-2 mb-4 animate-slide-down">
                  <Link to="/friends" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-sp-hover text-sp-text font-semibold text-[15px]">
                    <div className="w-8 h-8 rounded-full bg-sp-blue/10 text-sp-blue flex items-center justify-center"><MdOutlinePeopleAlt size={16} /></div>
                    Friends
                  </Link>
                  <Link to="/groups" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-sp-hover text-sp-text font-semibold text-[15px]">
                    <div className="w-8 h-8 rounded-full bg-sp-blue/10 text-sp-blue flex items-center justify-center"><IoGridOutline size={16} /></div>
                    Groups
                  </Link>
                  <Link to="/bookmarks" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-sp-hover text-sp-text font-semibold text-[15px]">
                    <div className="w-8 h-8 rounded-full bg-sp-blue/10 text-sp-blue flex items-center justify-center"><FiBookmark size={16} /></div>
                    Saved Bookmarks
                  </Link>
                  <Link to="/reels" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-sp-hover text-sp-text font-semibold text-[15px]">
                    <div className="w-8 h-8 rounded-full bg-sp-blue/10 text-sp-blue flex items-center justify-center"><FiPlayCircle size={16} /></div>
                    Reels Feed
                  </Link>
                  <Link to="/notifications" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-sp-hover text-sp-text font-semibold text-[15px]">
                    <div className="w-8 h-8 rounded-full bg-sp-blue/10 text-sp-blue flex items-center justify-center"><FiBell size={16} /></div>
                    Notifications
                  </Link>
                  <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-sp-hover text-sp-text font-semibold text-[15px]">
                    <div className="w-8 h-8 rounded-full bg-sp-blue/10 text-sp-blue flex items-center justify-center"><FiClock size={16} /></div>
                    Memories
                  </Link>
                  <Link to="/messages" onClick={() => setMobileOpen(false)} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-sp-hover text-sp-text font-semibold text-[15px] w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-sp-blue/10 text-sp-blue flex items-center justify-center"><FiMessageCircle size={16} /></div>
                      Messages
                    </div>
                    {unreadMessageCount > 0 && (
                      <span className="bg-sp-red text-white text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 mr-1 shadow-sm">
                        {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                      </span>
                    )}
                  </Link>
                </div>
              )}

              {/* Admin Dashboard */}
              {user?.isAdmin && (
                <button
                  onClick={() => { setMobileOpen(false); navigate('/admin'); }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-sp-hover text-sp-blue font-semibold text-base border-b border-sp-border/50 text-left"
                >
                  <FiShield size={22} className="text-sp-blue" />
                  <span>Admin Dashboard</span>
                </button>
              )}

              {/* Settings & Privacy Accordion */}
              <button
                onClick={() => setMobileSettingsOpen(!mobileSettingsOpen)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-sp-hover border-b border-sp-border/50"
              >
                <div className="flex items-center gap-3">
                  <FiSettings size={22} className="text-sp-muted" />
                  <span className="font-semibold text-sp-text text-base">Settings & privacy</span>
                </div>
                <FiChevronDown size={20} className={clsx('text-sp-muted transition-transform', mobileSettingsOpen && 'rotate-180')} />
              </button>

              {mobileSettingsOpen && (
                <div className="pl-6 flex flex-col gap-1 mt-2 mb-4 animate-slide-down">
                  <Link to="/settings" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-sp-hover text-sp-text font-semibold text-[15px]">
                    <div className="w-8 h-8 rounded-full bg-sp-overlay flex items-center justify-center text-sp-sub"><FiSettings size={16} /></div>
                    Settings
                  </Link>
                  <Link to="/settings#privacy_checkup" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-sp-hover text-sp-text font-semibold text-[15px]">
                    <div className="w-8 h-8 rounded-full bg-sp-overlay flex items-center justify-center text-sp-sub"><FiUser size={16} /></div>
                    Privacy checkup
                  </Link>
                  <Link to="/settings#privacy_center" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-sp-hover text-sp-text font-semibold text-[15px]">
                    <div className="w-8 h-8 rounded-full bg-sp-overlay flex items-center justify-center text-sp-sub"><FiUser size={16} /></div>
                    Privacy Center
                  </Link>
                  <Link to="/activity-log" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-sp-hover text-sp-text font-semibold text-[15px]">
                    <div className="w-8 h-8 rounded-full bg-sp-overlay flex items-center justify-center text-sp-sub"><FiClock size={16} /></div>
                    Activity log
                  </Link>
                  <Link to="/settings#content_prefs" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-sp-hover text-sp-text font-semibold text-[15px]">
                    <div className="w-8 h-8 rounded-full bg-sp-overlay flex items-center justify-center text-sp-sub"><FiSettings size={16} /></div>
                    Content preferences
                  </Link>
                </div>
              )}

              {/* Help & Support */}
              <button
                onClick={() => { setMobileOpen(false); navigate('/help-center'); }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-sp-hover text-sp-text font-semibold text-base border-b border-sp-border/50 text-left"
              >
                <FiHelpCircle size={22} className="text-sp-muted" />
                <span>Help & support</span>
              </button>

              {/* Display & Accessibility */}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-sp-hover text-sp-text font-semibold text-base border-b border-sp-border/50 text-left"
              >
                <div className="flex items-center gap-3">
                  <FiMoon size={22} className="text-sp-muted" />
                  <span>Display & accessibility</span>
                </div>
                <div className="text-xs text-sp-muted font-bold bg-sp-overlay px-2 py-1 rounded">
                  Toggle Theme
                </div>
              </button>

              {/* Give Feedback */}
              <button
                onClick={() => { setMobileOpen(false); navigate('/help-center'); }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-sp-hover text-sp-text font-semibold text-base border-b border-sp-border/50 text-left"
              >
                <FiMessageCircle size={22} className="text-sp-muted" />
                <span>Give feedback</span>
              </button>

              {/* Log Out */}
              <button
                onClick={() => { logout(); setMobileOpen(false); navigate('/login'); }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-sp-hover mt-6 bg-sp-red/10 text-sp-red justify-center font-bold border border-sp-red/20 shadow-sm"
              >
                <FiLogOut size={20} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Fixed bottom navigation bar (mobile only) - rendered in document.body via Portal to prevent containing-block bugs */}
      {createPortal(
        <div className="md:hidden safe-mobile-bottom-nav border-t border-sp-border/80 flex items-center justify-around px-2 shadow-lg backdrop-blur-md bg-sp-card/90">
            
            {/* Home */}
            <Link
              to="/"
              className={clsx(
                "flex flex-col items-center justify-center flex-1 h-full relative transition-all duration-150",
                isActive('/') ? "text-sp-blue" : "text-sp-sub"
              )}
            >
              <FiHome size={22} />
              <span className="text-[10px] mt-0.5 font-medium">Home</span>
              {isActive('/') && (
                <span className="absolute bottom-1 w-5 h-0.5 rounded-full bg-sp-blue" />
              )}
            </Link>

            {/* Friends */}
            <Link
              to="/friends"
              className={clsx(
                "flex flex-col items-center justify-center flex-1 h-full relative transition-all duration-150",
                isActive('/friends') ? "text-sp-blue" : "text-sp-sub"
              )}
            >
              <div className="relative">
                <MdOutlinePeopleAlt size={22} />
                {pendingFriendRequests > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-sp-red text-white text-[9px] font-bold px-1 py-0.5 rounded-full leading-none scale-90">
                    {pendingFriendRequests}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 font-medium">Friends</span>
              {isActive('/friends') && (
                <span className="absolute bottom-1 w-5 h-0.5 rounded-full bg-sp-blue" />
              )}
            </Link>

            {/* Reels (Emphasized play/video icon) */}
            <Link
              to="/reels"
              className="flex flex-col items-center justify-center flex-1 h-full relative -top-2"
            >
              <div className={clsx(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-md border",
                isActive('/reels')
                  ? "bg-gradient-to-tr from-sp-blue to-purple-600 text-white border-transparent scale-110 shadow-sp-blue/20"
                  : "bg-sp-overlay text-sp-text border-sp-border hover:bg-sp-hover"
              )}>
                <FiPlayCircle size={24} />
              </div>
              <span className="text-[10px] mt-0.5 font-bold text-sp-sub">Reels</span>
            </Link>

            {/* Notifications */}
            <Link
              to="/notifications"
              className={clsx(
                "flex flex-col items-center justify-center flex-1 h-full relative transition-all duration-150",
                isActive('/notifications') ? "text-sp-blue" : "text-sp-sub"
              )}
            >
              <div className="relative">
                <FiBell size={22} />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-sp-red text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none animate-pulse">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 font-medium">Notifs</span>
              {isActive('/notifications') && (
                <span className="absolute bottom-1 w-5 h-0.5 rounded-full bg-sp-blue" />
              )}
            </Link>

            {/* Profile */}
            <Link
              to={`/profile/${user?.id || user?._id}`}
              className={clsx(
                "flex flex-col items-center justify-center flex-1 h-full relative transition-all duration-150",
                isActive('/profile') ? "text-sp-blue" : "text-sp-sub"
              )}
            >
              <Avatar 
                src={user?.avatar} 
                alt={user?.name} 
                size="xs" 
                ring={isActive('/profile')} 
              />
              <span className="text-[10px] mt-0.5 font-medium">Profile</span>
              {isActive('/profile') && (
                <span className="absolute bottom-1 w-5 h-0.5 rounded-full bg-sp-blue" />
              )}
            </Link>

        </div>,
        document.body
      )}
    </>
  );
}
