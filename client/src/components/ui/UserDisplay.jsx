import React from 'react';
import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import { useApp } from '../../context/AppContext';

export default function UserDisplay({
  user,
  size = 'md', // 'xs', 'sm', 'md', 'lg', 'xl'
  className = '',
  avatarClassName = '',
  nameClassName = '',
  hideAvatar = false,
  hideName = false,
  showUsername = false,
  link = true, // true (auto profile link) or custom path or false (no link)
  children,
  subText,
}) {
  const { getLiveChannelForUser } = useApp();

  if (!user) return null;

  const userId = user._id || user.id;
  const profileLink = typeof link === 'string' ? link : `/profile/${userId}`;
  const isLink = !!link && !!userId;
  const liveChannel = getLiveChannelForUser(userId);

  // Determine sizing values
  const avatarSizes = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const nameSizes = {
    xs: 'text-xs font-semibold',
    sm: 'text-sm font-semibold',
    md: 'text-[15px] font-semibold',
    lg: 'text-lg font-bold',
    xl: 'text-xl font-extrabold'
  };

  const badgeSizes = {
    xs: 10,
    sm: 12,
    md: 13,
    lg: 15,
    xl: 18
  };

  const content = (
    <div className={`flex items-center gap-2 min-w-0 ${className}`}>
      {!hideAvatar && (
        <Avatar
          src={user.avatar}
          alt={user.name}
          className={`${avatarSizes[size]} ${avatarClassName}`}
          online={user.isOnline}
          liveChannel={liveChannel}
        />
      )}
      {!hideName && (
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 flex-wrap">
            <span className={`text-sp-text leading-tight truncate ${nameSizes[size]} ${nameClassName}`}>
              {user.name}
            </span>
            {user.verified && <VerifiedBadge size={badgeSizes[size]} />}
            {children}
          </div>
          {showUsername && user.username && (
            <p className="text-[10px] text-sp-muted truncate">@{user.username}</p>
          )}
          {subText && (
            <div className="mt-0.5">{subText}</div>
          )}
        </div>
      )}
    </div>
  );

  if (isLink) {
    return (
      <Link to={profileLink} className="block hover:opacity-90 active:opacity-80 transition-opacity min-w-0">
        {content}
      </Link>
    );
  }

  return content;
}
