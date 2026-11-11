// Festival windows for the site. Each one switches itself on and off by date (India time),
// so nothing has to be removed after the festival.

// "Happy Bhai Dooj" greetings: until the end of 11 Nov 2026 IST (midnight IST = 18:30 UTC)
const BHAI_DOOJ_END = Date.UTC(2026, 10, 11, 18, 30);
export const isBhaiDooj = (now = Date.now()) => now < BHAI_DOOJ_END;

// The LEODIWALI offer on the pricing page: until 12 Nov 2026, 11:59 pm IST, when the coupon itself expires.
// The coupon lives in the database (admin panel → Coupons): 50% off, one use per account.
const OFFER_END = Date.UTC(2026, 10, 12, 18, 30);
export const isOfferLive = (now = Date.now()) => now < OFFER_END;
export const DIWALI_OFFER = { code: 'LEODIWALI', percent: 50, ends: '12 Nov, 11:59 pm' };

// The price after the offer, rounded exactly like the server (backend/src/admin/coupons.js)
export const diwaliPrice = (price: number) => {
  const discount = Math.min(price, Math.round(((price * DIWALI_OFFER.percent) / 100) * 100) / 100);
  return Math.round((price - discount) * 100) / 100;
};
