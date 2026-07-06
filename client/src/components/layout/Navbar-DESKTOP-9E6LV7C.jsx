import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FiSearch, FiHome, FiBell, FiMessageCircle,
  FiMenu, FiX, FiChevronDown, FiSettings, FiLogOut,
  FiUser, FiHelpCircle, FiBookmark,
} from 'react-icons/fi';
import { MdOutlinePeopleAlt } from 'react-icons/md';
import { IoGridOutline } from 'react-icons/io5';
import { useApp } from '../../context/AppContext';
import NotificationsDropdown from './NotificationsDropdown';
import clsx from 'clsx';
import { getAssetUrl } from '../../utils/helpers';

const NAV_ITEMS = [
  { to: '/',             icon: FiHome,             label: 'Home' },
  { to: '/friends',      icon: MdOutlinePeopleAlt, label: 'Friends',  badgeKey: 'pendingFriendRequests' },
  { to: '/groups',       icon: IoGridOutline,      label: 'Groups' },
];

export default function Navbar() {
  const { user, unreadNotifCount, pendingFriendRequests, setSearch, logout, friendsList, openConversation } = useApp();
  const [searchVal, setSearchVal]   = useState('');
  const [searchFocus, setSearchFocus] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const notifRef   = useRef(null);
  const profileRef = useRef(null);
  const messagesRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const fn = (e) => {
      if (notifRef.current   && !notifRef.current.contains(e.target))   setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
      if (messagesRef.current && !messagesRef.current.contains(e.target)) setShowMessages(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
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
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 glass border-b border-sp-border/60 select-none">
        <div className="max-w-screen-xl mx-auto h-full flex items-center justify-between px-3 gap-2">

          {/* Logo + Search */}
          <div className="flex items-center gap-2 flex-shrink-0">
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
            {/* Messages */}
            <div ref={messagesRef} className="relative">
              <button
                id="nav-messages"
                onClick={() => { setShowMessages(!showMessages); setShowNotifs(false); setShowProfile(false); }}
                className="nav-btn"
                title="Messenger"
              >
                <FiMessageCircle size={20} />
              </button>
              {showMessages && (
                <div className="dropdown w-80 right-0 top-full mt-2 p-3 flex flex-col gap-2 bg-sp-card border border-sp-border rounded-2xl shadow-dropdown z-[400] max-h-96 overflow-y-auto no-scroll">
                  <p className="section-label mb-1 px-1">Contacts</p>
                  {friendsList.map(f => (
                    <button
                      key={f._id || f.id}
                      onClick={() => { openConversation(f); setShowMessages(false); }}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-sp-hover text-left w-full transition-all group"
                    >
                      <div className="relative">
                        {f.avatar ? (
                          <img src={getAssetUrl(f.avatar)} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-700 text-white font-bold flex items-center justify-center text-xs uppercase select-none">
                            {f.name ? f.name.charAt(0) : '?'}
                          </div>
                        )}
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-sp-card ${f.isOnline ? 'bg-sp-green' : 'bg-sp-muted'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-sp-text group-hover:text-sp-blue transition-colors truncate">{f.name}</p>
                        <p className="text-[10px] text-sp-muted">@{f.username}</p>
                      </div>
                    </button>
                  ))}
                  {friendsList.length === 0 && (
                    <p className="text-xs text-sp-muted text-center py-4">Add friends to start messaging!</p>
                  )}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button
                id="nav-notifications"
                onClick={() => { setShowNotifs(!showNotifs); setShowProfile(false); setShowMessages(false); }}
                className="nav-btn"
                title="Notifications"
              >
                <FiBell size={20} />
                {unreadNotifCount > 0 && (
                  <span className="badge animate-pulse-slow">{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</span>
                )}
              </button>
              {showNotifs && <NotificationsDropdown onClose={() => setShowNotifs(false)} />}
            </div>

            {/* Profile Dropdown */}
            <div ref={profileRef} className="relative">
              <button
                id="nav-profile"
                onClick={() => { setShowProfile(!showProfile); setShowNotifs(false); setShowMessages(false); }}
                className="flex items-center gap-1.5 p-1 pl-1 pr-2 rounded-full hover:bg-sp-hover transition-colors cursor-pointer ml-0.5"
              >
                {user?.avatar ? (
                  <img
                    src={getAssetUrl(user.avatar)}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-sp-blue/30"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-700 text-white font-bold flex items-center justify-center text-xs uppercase select-none ring-2 ring-sp-blue/30">
                    {user?.name ? user.name.charAt(0) : '?'}
                  </div>
                )}
                <FiChevronDown
                  size={13}
                  className={clsx('text-sp-muted transition-transform duration-200', showProfile && 'rotate-180')}
                />
              </button>

              {showProfile && (
                <div className="dropdown w-72 right-0 top-full mt-2 animate-slide-down">
                  <Link
                    to={`/profile/${user?.id}`}
                    onClick={() => setShowProfile(false)}
                    className="flex items-center gap-3 p-4 hover:bg-sp-hover transition-colors"
                  >
                    {user?.avatar ? (
                      <img src={getAssetUrl(user.avatar)} alt={user.name} className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gray-700 text-white font-bold flex items-center justify-center text-base uppercase select-none">
                        {user?.name ? user.name.charAt(0) : '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sp-text truncate">{user?.name}</p>
                      <p className="text-xs text-sp-sub">@{user?.username}</p>
                      <p className="text-xs text-sp-blue mt-0.5 font-medium">View your profile →</p>
                    </div>
                  </Link>

                  <div className="divider mx-3 my-0" />

                  <div className="p-1.5">
                    {[
                      { icon: FiBookmark, label: 'Saved Posts', to: '/bookmarks' },
                      { icon: FiSettings, label: 'Settings',    to: '/settings'  },
                    ].map(({ icon: Icon, label, to }) => (
                      <Link
                        key={label}
                        to={to}
                        onClick={() => setShowProfile(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sp-text hover:bg-sp-hover transition-colors text-sm font-medium"
                      >
                        <span className="w-8 h-8 rounded-lg bg-sp-overlay flex items-center justify-center text-sp-sub">
                          <Icon size={16} />
                        </span>
                        {label}
                      </Link>
                    ))}

                    <div className="divider mx-1 my-1" />
                    <button
                      onClick={() => { logout(); setShowProfile(false); navigate('/login'); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sp-     >
                  <Icon size={20} />
                  {label}
                  {badgeKey && badgeMap[badgeKey] > 0 && (
                    <span className="ml-auto bg-sp-red text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {badgeMap[badgeKey]}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
