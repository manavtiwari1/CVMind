// Festival and sale windows for the site. Each one switches itself on and off by date (India time),
// so nothing has to be removed afterwards. IST is UTC+5:30, so midnight IST is 18:30 UTC the day before.

// "Happy Bhai Dooj" greetings: until the end of 11 Nov 2026 IST
const BHAI_DOOJ_END = Date.UTC(2026, 10, 11, 18, 30);
export const isBhaiDooj = (now = Date.now()) => now < BHAI_DOOJ_END;

// ── Black Friday week: 19 Nov 2026, 12:00 am IST → 30 Nov 2026, 11:59 pm IST ─────────────────
// The BLACKFRIDAY coupon (50% off, one use per account) is created by the backend with the same
// dates (backend/src/services/blackFriday.js), so the code stops working when the banner goes away.
const BF_START = Date.UTC(2026, 10, 18, 18, 30);
const BF_END = Date.UTC(2026, 10, 30, 18, 30);

// Local preview before the sale: open any page with ?preview=blackfriday while running `npm run dev`.
// Production builds ignore it, so nobody sees the sale early.
const devPreview = () => {
  try {
    return import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'blackfriday';
  } catch {
    return false;
  }
};

export const isBlackFriday = (now = Date.now()) => devPreview() || (now >= BF_START && now < BF_END);
export const BLACK_FRIDAY = { code: 'BLACKFRIDAY', percent: 50, ends: '30 Nov, 11:59 pm', endsAt: BF_END };

// The price after the offer, rounded exactly like the server (backend/src/admin/coupons.js)
export const offerPrice = (price: number) => {
  const discount = Math.min(price, Math.round(((price * BLACK_FRIDAY.percent) / 100) * 100) / 100);
  return Math.round((price - discount) * 100) / 100;
};

// Days, hours and minutes left in the sale, for the countdown
export function timeLeft(now = Date.now()) {
  const ms = Math.max(0, BF_END - now);
  const mins = Math.floor(ms / 60000);
  return { days: Math.floor(mins / 1440), hours: Math.floor((mins % 1440) / 60), minutes: mins % 60 };
}
