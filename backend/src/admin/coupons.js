import { Coupon } from './models.js';

// Checks a coupon for a purchase. Returns { ok, coupon, discount, finalAmount } or { ok: false, error }.
export async function evaluateCoupon(code, { email, amount }) {
  const cleanCode = String(code || '').trim().toUpperCase();
  if (!cleanCode) return { ok: false, error: 'Enter a coupon code.' };
  const coupon = await Coupon.findOne({ code: cleanCode }).lean();
  const now = Date.now();
  if (!coupon || !coupon.active) return { ok: false, error: 'That coupon code is not valid.' };
  if (coupon.validFrom && new Date(coupon.validFrom).getTime() > now) return { ok: false, error: 'That coupon is not active yet.' };
  if (coupon.validTo && new Date(coupon.validTo).getTime() < now) return { ok: false, error: 'That coupon has expired.' };
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return { ok: false, error: 'That coupon has been fully used.' };
  const price = Number(amount) || 0;
  if (coupon.minAmount && price < coupon.minAmount) return { ok: false, error: `This coupon needs a purchase of at least ₹${coupon.minAmount}.` };
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (coupon.perUserLimit && cleanEmail) {
    const used = (coupon.redemptions || []).filter((r) => r.email === cleanEmail).length;
    if (used >= coupon.perUserLimit) return { ok: false, error: 'You have already used this coupon.' };
  }
  const raw = coupon.type === 'percent' ? (price * coupon.value) / 100 : coupon.value;
  const discount = Math.min(price, Math.round(raw * 100) / 100);
  return { ok: true, coupon, discount, finalAmount: Math.round((price - discount) * 100) / 100 };
}

// Records a redemption atomically, so maxUses can't be exceeded by two checkouts at once
export async function redeemCoupon(coupon, { email, amount, discount, transactionId }) {
  const filter = { _id: coupon._id, active: true };
  if (coupon.maxUses) filter.usedCount = { $lt: coupon.maxUses };
  const result = await Coupon.updateOne(filter, {
    $inc: { usedCount: 1 },
    $push: { redemptions: { email: String(email || '').toLowerCase(), amount, discount, transactionId, at: new Date() } }
  });
  return result.modifiedCount === 1;
}
