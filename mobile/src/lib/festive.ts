// Sale windows, by date in India time, matching frontend/src/lib/festive.ts and the backend's
// BLACKFRIDAY coupon (backend/src/services/blackFriday.js). IST midnight is 18:30 UTC the day before.

const BF_START = Date.UTC(2026, 10, 18, 18, 30);
const BF_END = Date.UTC(2026, 10, 30, 18, 30);

export const isBlackFriday = (now = Date.now()) => now >= BF_START && now < BF_END;
export const BLACK_FRIDAY = { code: 'BLACKFRIDAY', percent: 50, ends: '30 Nov, 11:59 pm' };

export function saleTimeLeft(now = Date.now()) {
  const mins = Math.floor(Math.max(0, BF_END - now) / 60000);
  return { days: Math.floor(mins / 1440), hours: Math.floor((mins % 1440) / 60) };
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
