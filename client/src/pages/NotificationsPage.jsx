import { Link, useNavigate } from 'react-router-dom';
import { FiBell, FiCheck, FiHeart, FiMessageCircle, FiUser, FiRefreshCw, FiUsers, FiGift, FiTag, FiVideo } from 'react-icons/fi';
import MainLayout from '../components/layout/MainLayout';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { timeAgo, getAssetUrl } from '../utils/helpers';
import Avatar from '../components/ui/Avatar';
import VerifiedBadge from '../components/ui/VerifiedBadge';
import SystemAvatar from '../components/ui/SystemAvatar';

function NotifIcon({ type }) {
  const props = { size: 14 };
  switch (type) {
    case 'like':           return <FiHeart {...props} className="text-red-500" />;
    case 'reaction':       return <FiHeart {...props} className="text-red-500" />;
    case 'comment':        return <FiMessageCircle {...props} className="text-sp-blue" />;
    case 'message':        return <FiMessageCircle {...props} className="text-sp-blue" />;
    case 'friend_request': return <FiUser {...props} className="text-green-500" />;
    case 'share':          return <FiRefreshCw {...props} className="text-purple-400" />;
    case 'mention':        return <FiMessageCircle {...props} className="text-sp-blue" />;
    case 'group_post':     return <FiUsers {...props} className="text-orange-400" />;
    case 'group_join':     return <FiUsers {...props} className="text-orange-400" />;
    case 'birthday':       return <FiGift {...props} className="text-pink-400" />;
    case 'tag':            return <FiTag {...props} className="text-yellow-400" />;
    case 'live':           return <FiVideo {...props} className="text-red-500 font-bold" />;
    default:               return <FiBell {...props} className="text-sp-muted" />;
  }
}

export default function NotificationsPage() {
  const { notifications, markNotifRead, markAllRead, unreadNotifCount } = useApp();
  const { t } = useLanguage();
  const unread = notifications.filter((n) => !n.read);
  const read   = notifications.filter((n) =>  n.read);

  return (
    <MainLayout hideRight>
      <div className="max-w-[640px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-sp-text">{t('notifications.title')}</h1>
            {unreadNotifCount > 0 && (
              <p className="text-sp-sub text-sm mt-0.5">{unreadNotifCount} {t('notifications.unread')}</p>
            )}
          </div>
          {unreadNotifCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-sp-blue text-sm font-semibold hover:bg-sp-blue/10 px-3 py-2 rounded-xl transition-colors"
            >
              <FiCheck size={14} /> {t('notifications.markAllRead')}
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="card p-16 text-center">
            <FiBell size={48} className="mx-auto mb-4 text-sp-faint" />
            <p className="font-semibold text-sp-text">{t('notifications.noNotifications')}</p>
            <p className="text-sm text-sp-muted mt-1">{t('notifications.noNotificationsSubtext')}</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            {unread.length > 0 && (
              <>
                <div className="px-4 py-2.5 bg-sp-blue/5 border-b border-sp-divider">
                  <p className="section-label text-sp-blue">{t('notifications.new')} · {unread.length}</p>
                </div>
                {unread.map((n) => <NotifRow key={n.id} notif={n} onRead={markNotifRead} />)}
              </>
            )}
            {read.length > 0 && (
              <>
                <div className="px-4 py-2.5 border-b border-sp-divider">
                  <p className="section-label">{t('notifications.earlier')}</p>
                </div>
                {read.map((n) => <NotifRow key={n.id} notif={n} onRead={markNotifRead} />)}
              </>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

function NotifRow({ notif, onRead }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const isSystem = ['broadcast', 'verification', 'warning'].includes(notif.type);

  const handleRowClick = () => {
    onRead(notif.id || notif._id);
    if (isSystem) {
      if (notif.post) {
        navigate(`/?post=${notif.post._id || notif.post}`);
      }
      return;
    }
    if (notif.type === 'live') {
      navigate(`/live/live_user_${notif.actor?.id || notif.actor?._id}`);
    } else if (notif.type === 'friend_request') {
      navigate(`/profile/${notif.actor?.id || notif.actor?._id}`);
    } else if (notif.type === 'message') {
      navigate('/messages');
    } else if (notif.post) {
      navigate(`/?post=${notif.post._id || notif.post}`);
    } else if (notif.actor) {
      navigate(`/profile/${notif.actor.id || notif.actor._id}`);
    }
  };

  let senderName = notif.actor?.name || 'Spheral';
  if (isSystem) {
    if (notif.type === 'warning') {
      senderName = 'Spheral Security';
    } else if (notif.type === 'broadcast') {
      senderName = 'Spheral Announcement';
    } else if (notif.type === 'verification') {
      senderName = 'Spheral';
    }
  }

  return (
    <div
      onClick={handleRowClick}
      className={`flex items-start gap-3 px-4 py-4 hover:bg-sp-hover transition-colors cursor-pointer border-b border-sp-divider/50 last:border-0 group
        ${!notif.read ? 'bg-sp-blue/5' : ''}`}
    >
      <div className="flex-shrink-0">
        {isSystem ? (
          <SystemAvatar type={notif.type} />
        ) : (
          <div className="relative">
            <Avatar src={notif.actor?.avatar} alt={notif.actor?.name} className="w-14 h-14" />
            <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-sp-card flex items-center justify-center ring-2 ring-sp-card">
              <NotifIcon type={notif.type} />
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] text-sp-text leading-snug flex items-center gap-1 flex-wrap">
          <span className="font-bold">{senderName}</span>
          {!isSystem && notif.actor?.verified && <VerifiedBadge size={12} />}
          <span className="text-sp-sub ml-1">{notif.content}</span>
        </div>
        <p className={`text-xs mt-1.5 font-semibold ${!notif.read ? 'text-sp-blue' : 'text-sp-muted'}`}>
          {timeAgo(notif.createdAt)}
        </p>
        {!isSystem && notif.type === 'friend_request' && !notif.read && (
          <div className="flex gap-2 mt-2.5">
            <button className="btn-primary btn-sm">{t('friends.accept')}</button>
            <button className="btn-secondary btn-sm">{t('friends.decline')}</button>
          </div>
        )}
      </div>
      {notif.postImage && (
        <img src={getAssetUrl(notif.postImage)} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
      )}
      {!notif.read && (
        <div className="w-2.5 h-2.5 rounded-full bg-sp-blue flex-shrink-0 mt-1" />
      )}
    </div>
  );
}
