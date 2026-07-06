import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { timeAgo, notifIcon } from '../../utils/helpers';
import { FiBell, FiCheck } from 'react-icons/fi';
import VerifiedBadge from '../ui/VerifiedBadge';

export default function NotificationsDropdown({ onClose }) {
  const { notifications, markNotifRead, markAllRead, unreadNotifCount } = useApp();

  return (
    <div className="dropdown w-[380px] max-h-[80vh] flex flex-col right-0 top-full mt-2">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-sp-divider flex-shrink-0">
        <h2 className="font-bold text-base text-sp-text">Notifications</h2>
        {unreadNotifCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-sp-blue text-xs font-semibold hover:underline flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-sp-blue/10 transition-colors"
          >
            <FiCheck size={12} /> Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1 no-scroll">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-sp-muted">
            <FiBell size={36} className="mb-3 opacity-30" />
            <p className="font-semibold text-sp-sub">No notifications</p>
            <p className="text-xs mt-1">We'll notify you when something happens.</p>
          </div>
        ) : (
          <>
            {notifications.some((n) => !n.read) && (
              <p className="section-label px-4 pt-3 pb-1">New</p>
            )}
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => markNotifRead(n.id)}
                className={`flex items-start gap-3 px-4 py-3 hover:bg-sp-hover transition-colors cursor-pointer relative ${!n.read ? 'bg-sp-blue/5' : ''}`}
              >
                <div className="relative flex-shrink-0">
                  <img src={n.actor.avatar} alt="" className="w-11 h-11 rounded-full object-cover" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-sp-card flex items-center justify-center text-xs ring-2 ring-sp-card">
                    {notifIcon(n.type)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-sp-text leading-snug flex items-center gap-1 flex-wrap">
                    <span className="font-semibold">{n.actor.name}</span>
                    {n.actor.verified && <VerifiedBadge size={10} />}
                    <span className="text-sp-sub ml-1">{n.content}</span>
                  </div>
                  <p className={`text-[11px] mt-1 font-semibold ${!n.read ? 'text-sp-blue' : 'text-sp-muted'}`}>
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
                {n.postImage && (
                  <img src={n.postImage} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                )}
                {!n.read && (
                  <div className="w-2.5 h-2.5 rounded-full bg-sp-blue absolute right-4 top-5 flex-shrink-0" />
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-sp-divider flex-shrink-0">
        <Link
          to="/notifications"
          onClick={onClose}
          className="block text-center text-sm font-semibold text-sp-text hover:bg-sp-hover py-2 rounded-xl transition-colors"
        >
          See all notifications
        </Link>
      </div>
    </div>
  );
}
