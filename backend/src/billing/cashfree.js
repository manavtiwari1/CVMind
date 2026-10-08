import crypto from 'crypto';

// Cashfree Payment Gateway. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY, and CASHFREE_ENV=production
// for live payments (anything else uses the sandbox).

const API_VERSION = '2025-01-01';

export const cashfreeMode = () => (process.env.CASHFREE_ENV === 'production' ? 'production' : 'sandbox');

export const cashfreeConfigured = () => !!(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY);

const baseUrl = () => (cashfreeMode() === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg');

async function call(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-version': API_VERSION,
      'x-client-id': process.env.CASHFREE_APP_ID,
      'x-client-secret': process.env.CASHFREE_SECRET_KEY
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `Cashfree error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// Returns { payment_session_id, order_status, ... }
export function createCashfreeOrder({ orderId, amount, customerId, email, phone, name, returnUrl, notifyUrl }) {
  return call('/orders', {
    method: 'POST',
    body: {
      order_id: orderId,
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: customerId,
        customer_email: email,
        customer_phone: phone,
        ...(name ? { customer_name: name.slice(0, 100) } : {})
      },
      order_meta: {
        return_url: returnUrl,
        ...(notifyUrl ? { notify_url: notifyUrl } : {})
      }
    }
  });
}

// order_status: ACTIVE | PAID | EXPIRED | TERMINATED | TERMINATION_REQUESTED
export const getCashfreeOrder = (orderId) => call(`/orders/${encodeURIComponent(orderId)}`);

// The successful payment for an order (for the method shown in the admin panel), if any
export async function getSuccessfulPayment(orderId) {
  try {
    const payments = await call(`/orders/${encodeURIComponent(orderId)}/payments`);
    return (Array.isArray(payments) ? payments : []).find((p) => p.payment_status === 'SUCCESS') || null;
  } catch {
    return null;
  }
}

// Signature = base64(HMAC-SHA256(timestamp + raw body, secret key))
export function verifyCashfreeWebhook(rawBody, timestamp, signature) {
  if (!rawBody || !timestamp || !signature || !process.env.CASHFREE_SECRET_KEY) return false;
  const expected = crypto.createHmac('sha256', process.env.CASHFREE_SECRET_KEY).update(timestamp + rawBody).digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
