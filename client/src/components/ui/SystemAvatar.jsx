import { FiShield, FiSliders, FiVolume2 } from 'react-icons/fi';

export default function SystemAvatar({ type, className = '' }) {
  let BadgeIcon = FiSliders;
  let badgeColor = 'text-white';
  let badgeBg = 'bg-sp-blue';

  if (type === 'warning') {
    BadgeIcon = FiShield;
    badgeBg = 'bg-red-500';
  } else if (type === 'broadcast') {
    BadgeIcon = FiVolume2;
    badgeBg = 'bg-purple-500';
  } else if (type === 'verification') {
    BadgeIcon = FiSliders;
    badgeBg = 'bg-green-500';
  }

  return (
    <div className={`relative flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-tr from-sp-blue to-blue-600 flex items-center justify-center font-black text-white text-[22px] shadow-glow-blue select-none ${className}`}>
      <span>S</span>
      <span className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-lg ring-2 ring-sp-card ${badgeBg} ${badgeColor}`}>
        <BadgeIcon size={13} />
      </span>
    </div>
  );
}
