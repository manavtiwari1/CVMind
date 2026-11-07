// Festival windows for seasonal dressing on the site. Each one switches itself on and off by date,
// so nothing has to be removed after the festival.

const DIWALI_START = new Date(2026, 9, 28); // 28 Oct 2026
const DIWALI_END = new Date(2026, 10, 13); // up to and including 12 Nov 2026

export const isDiwaliSeason = (now = new Date()) => now >= DIWALI_START && now < DIWALI_END;

// The Diwali offer shown on the pricing page. The coupon itself lives in the database (admin panel →
// Coupons): LEODIWALI, 50% off, one use per account, valid until 12 Nov 2026 11:59 pm IST.
export const DIWALI_OFFER = { code: 'LEODIWALI', percent: 50, ends: '12 Nov, 11:59 pm' };

// The price after the offer, rounded exactly like the server (backend/src/admin/coupons.js)
export const diwaliPrice = (price: number) => {
  const discount = Math.min(price, Math.round(((price * DIWALI_OFFER.percent) / 100) * 100) / 100);
  return Math.round((price - discount) * 100) / 100;
};
