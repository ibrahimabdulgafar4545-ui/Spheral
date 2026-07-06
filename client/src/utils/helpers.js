import { formatDistanceToNow, format } from 'date-fns';

export function timeAgo(dateStr) {
  try {
    if (!dateStr) return '';
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return '';
  }
}

export function formatCount(n) {
  if (n == null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function fullDate(dateStr) {
  try { return format(new Date(dateStr), 'MMMM d, yyyy'); }
  catch { return dateStr || ''; }
}

export function clampText(str, max = 150) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export function genId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

// Returns a string type key — use the NotifIcon component in NotificationsPage to render as icon
export function notifIcon(type) {
  return type || 'default';
}

export function privacyIcon(privacy) {
  return privacy === 'public' ? 'public' : 'private';
}

export function getAssetUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : (import.meta.env.MODE === 'production' ? 'https://spheral.onrender.com' : 'http://localhost:5000');
  return `${baseUrl}/${cleanPath}`;
}

export function parseMentions(text) {
  if (!text) return [];
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
  return parts.map((part) => {
    if (part.startsWith('@')) {
      return { text: part, isMention: true, username: part.slice(1) };
    }
    return { text: part, isMention: false };
  });
}
