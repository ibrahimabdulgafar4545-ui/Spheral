import { Link, useLocation } from 'react-router-dom';
import {
  FiHome, FiBell, FiBookmark, FiClock, FiCalendar,
  FiSettings, FiChevronRight,
} from 'react-icons/fi';
import { MdOutlinePeopleAlt } from 'react-icons/md';
import { IoGridOutline } from 'react-icons/io5';
import { HiOutlineVideoCamera } from 'react-icons/hi';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import clsx from 'clsx';
import Avatar from '../ui/Avatar';
import { getAssetUrl } from '../../utils/helpers';

export default function LeftSidebar() {
  const { user, pendingFriendRequests, unreadNotifCount, groups } = useApp();
  const { t } = useLanguage();
  const loc = useLocation();

  const isActive = (p) => p === '/' ? loc.pathname === '/' : loc.pathname.startsWith(p);
  const badges   = { pending: pendingFriendRequests, notifs: unreadNotifCount };
  const joined   = groups.filter((g) => g.isJoined).slice(0, 5);

  const NAV = [
    { to: '/',              icon: FiHome,             label: t('nav.home') },
    { to: '/friends',       icon: MdOutlinePeopleAlt, label: t('nav.friends'),        badgeKey: 'pending' },
    { to: '/groups',        icon: IoGridOutline,      label: t('nav.groups') },
    { to: '/notifications', icon: FiBell,             label: t('nav.notifications'),  badgeKey: 'notifs' },
    { to: '/bookmarks',     icon: FiBookmark,         label: t('nav.bookmarks') },
    { to: '/events',        icon: FiCalendar,         label: t('common.more') }, // Let's translate
    { to: '/memories',      icon: FiClock,            label: t('nav.memories') },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-[260px] flex-shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto no-scroll py-4 pe-3">

      {/* Profile link */}
      <Link
        to={`/profile/${user?.id}`}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-sp-hover transition-all mb-1 group"
      >
        <Avatar
          src={user?.avatar}
          alt={user?.name}
          className="w-9 h-9 group-hover:ring-sp-blue transition-all"
          ring={true}
        />
        <div className="min-w-0 text-left">
          <p className="font-semibold text-sp-text text-sm truncate group-hover:text-sp-blue transition-colors">{user?.name}</p>
          <p className="text-[11px] text-sp-muted">{t('profile.intro')}</p>
        </div>
      </Link>

      {/* Main nav */}
      <nav className="flex flex-col gap-0.5 mt-1">
        {NAV.map(({ to, icon: Icon, label, badgeKey }) => {
          const active = isActive(to);
          const count  = badgeKey ? badges[badgeKey] : 0;
          return (
            <Link
              key={to}
              to={to}
              className={clsx('nav-link', active && 'active')}
            >
              <span className={clsx('flex-shrink-0', active ? 'text-sp-blue' : 'text-sp-sub')}>
                <Icon size={20} />
              </span>
              <span className="text-[14px]">{label}</span>
              {count > 0 && (
                <span className="ms-auto bg-sp-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="divider" />

      {/* Joined Groups */}
      {joined.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between px-3 mb-1.5">
            <span className="section-label">{t('groups.myGroups')}</span>
            <Link to="/groups" className="text-[11px] text-sp-blue hover:underline font-semibold">{t('common.seeAll')}</Link>
          </div>
          {joined.map((g) => (
            <Link key={g.id || g._id} to={`/groups/${g.id || g._id}`} className="nav-link">
              <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 border border-sp-border bg-gradient-to-r from-sp-blue/20 to-purple-500/20 flex items-center justify-center">
                {g.cover ? (
                  <img src={getAssetUrl(g.cover)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] text-sp-blue font-black uppercase">{g.name?.charAt(0) || 'G'}</span>
                )}
              </div>
              <span className="text-[13px] truncate">{g.name}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="divider" />

      {/* Settings */}
      <Link to="/settings" className="nav-link">
        <FiSettings size={18} className="text-sp-sub" />
        <span className="text-[14px]">{t('settings.title')}</span>
      </Link>

      {/* Footer */}
      <div className="mt-auto pt-4">
        <div className="divider" />
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-sp-muted px-3 leading-relaxed">
          <Link to="/privacy" className="hover:underline hover:text-sp-blue">{t('settings.privacy')}</Link>
          <span>·</span>
          <Link to="/terms" className="hover:underline hover:text-sp-blue">Terms</Link>
          <span>·</span>
          <Link to="/about" className="hover:underline hover:text-sp-blue">{t('profile.about')}</Link>
          <span>·</span>
          <Link to="/guidelines" className="hover:underline hover:text-sp-blue">Guidelines</Link>
        </div>
        <p className="text-[10px] text-sp-muted px-3 mt-1.5 leading-relaxed">
          <span className="text-sp-blue font-medium">Spheral</span> © 2026
        </p>
      </div>
    </aside>
  );
}
