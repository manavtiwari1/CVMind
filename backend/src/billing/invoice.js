import PDFDocument from 'pdfkit';
import mongoose from 'mongoose';
import { AppSetting } from '../admin/models.js';
import { sendEmail, emailConfigured, SUPPORT_EMAIL } from '../admin/mailer.js';
import { invoiceEmail } from '../services/emailTemplates.js';
import { PLANS } from './plans.js';
import { PaymentOrder, Subscription } from './models.js';

// The invoice emailed after a Cashfree payment. CVMind isn't GST registered, so it carries no tax lines.

// Emails go out from support@cvmind.in (Resend); replies land in the Gmail support inbox
const SELLER = { name: 'CVMind', email: 'support@cvmind.in', site: 'www.cvmind.in' };
const contactEmails = () => [...new Set([SELLER.email, SUPPORT_EMAIL])];
const TZ = 'Asia/Kolkata';

const METHOD_LABEL = {
  upi: 'UPI', credit_card: 'Credit card', debit_card: 'Debit card', net_banking: 'Net banking',
  wallet: 'Wallet', pay_later: 'Pay later', cardless_emi: 'Cardless EMI', credit_card_emi: 'Card EMI', debit_card_emi: 'Card EMI'
};

// The standard PDF fonts have no rupee sign
export const inr = (n) => `INR ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: TZ });

// CVM-2026-0001, counting up across all years
async function nextInvoiceNumber(date) {
  const row = await AppSetting.findOneAndUpdate({ key: 'counter.invoice' }, { $inc: { value: 1 } }, { upsert: true, returnDocument: 'after' }).lean();
  return `CVM-${new Date(date).toLocaleString('en-IN', { year: 'numeric', timeZone: TZ })}-${String(row.value).padStart(4, '0')}`;
}

/**
 * @param {object} inv { number, date, buyer: { name, email }, plan, period: { from, to } | null,
 *   listPrice, discount, couponCode, amount, method, orderId, paymentId }
 * @returns {Promise<Buffer>}
 */
export function renderInvoicePdf(inv) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Invoice ${inv.number}`, Author: SELLER.name } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const ink = '#0f172a';
    const muted = '#64748b';
    const brand = '#1d4ed8';
    const line = '#e4e8ef';
    const left = 50;
    const right = doc.page.width - 50;
    const width = right - left;

    // Header
    doc.fillColor(brand).font('Helvetica-Bold').fontSize(22).text(SELLER.name, left, 50);
    doc.fillColor(muted).font('Helvetica').fontSize(9).text(`${SELLER.site}  ·  ${SELLER.email}`, left, 77);
    doc.fillColor(ink).font('Helvetica-Bold').fontSize(18).text('INVOICE', left, 50, { width, align: 'right' });
    doc.fillColor(muted).font('Helvetica').fontSize(9)
      .text(`Invoice no.  ${inv.number}`, left, 74, { width, align: 'right' })
      .text(`Date  ${day(inv.date)}`, { width, align: 'right' });
    doc.moveTo(left, 110).lineTo(right, 110).strokeColor(line).lineWidth(1).stroke();

    // Parties
    const partyY = 128;
    const col = (x, title, rows) => {
      doc.fillColor(muted).font('Helvetica-Bold').fontSize(8).text(title.toUpperCase(), x, partyY, { characterSpacing: 0.6 });
      doc.fillColor(ink).font('Helvetica-Bold').fontSize(11).text(rows[0], x, partyY + 14, { width: width / 2 - 10 });
      doc.font('Helvetica').fontSize(9.5).fillColor(muted);
      for (const r of rows.slice(1)) doc.text(r, { width: width / 2 - 10 });
    };
    col(left, 'Billed to', [inv.buyer.name || inv.buyer.email, ...(inv.buyer.name ? [inv.buyer.email] : [])]);
    col(left + width / 2 + 10, 'Sold by', [SELLER.name, ...contactEmails(), SELLER.site]);

    // Line items
    let y = 205;
    const amountX = right - 120;
    doc.rect(left, y, width, 24).fill('#f1f5ff');
    doc.fillColor(ink).font('Helvetica-Bold').fontSize(9)
      .text('DESCRIPTION', left + 10, y + 8)
      .text('AMOUNT', amountX, y + 8, { width: 110, align: 'right' });
    y += 34;
    doc.font('Helvetica-Bold').fontSize(10.5).text(`CVMind Pro - ${inv.plan}`, left + 10, y, { width: amountX - left - 20 });
    doc.font('Helvetica').fontSize(10.5).text(inr(inv.listPrice), amountX, y, { width: 110, align: 'right' });
    if (inv.period) {
      doc.fillColor(muted).fontSize(9).text(`Access from ${day(inv.period.from)} to ${day(inv.period.to)}`, left + 10, y + 15);
    }
    y += 40;
    doc.moveTo(left, y).lineTo(right, y).strokeColor(line).stroke();

    // Totals
    y += 12;
    const totalRow = (label, value, { bold = false, color = ink } = {}) => {
      doc.fillColor(bold ? ink : muted).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9.5)
        .text(label, amountX - 170, y, { width: 160, align: 'right' });
      doc.fillColor(color).text(value, amountX, y, { width: 110, align: 'right' });
      y += bold ? 22 : 17;
    };
    totalRow('Subtotal', inr(inv.listPrice));
    if (inv.discount > 0) totalRow(`Discount${inv.couponCode ? ` (${inv.couponCode})` : ''}`, `- ${inr(inv.discount)}`, { color: '#15803d' });
    doc.moveTo(amountX - 170, y).lineTo(right, y).strokeColor(line).stroke();
    y += 8;
    totalRow('Total paid', inr(inv.amount), { bold: true, color: brand });

    // Payment details
    y += 14;
    doc.fillColor(muted).font('Helvetica-Bold').fontSize(8).text('PAYMENT', left, y, { characterSpacing: 0.6 });
    y += 14;
    const detail = (label, value) => {
      if (!value) return;
      doc.fillColor(muted).font('Helvetica').fontSize(9.5).text(label, left, y, { width: 120 });
      doc.fillColor(ink).text(value, left + 120, y, { width: width - 120 });
      y += 15;
    };
    detail('Status', 'Paid');
    detail('Paid on', day(inv.date));
    detail('Method', inv.method);
    detail('Order ID', inv.orderId);
    detail('Payment ID', inv.paymentId);

    // Footer
    const footY = doc.page.height - 110;
    doc.moveTo(left, footY).lineTo(right, footY).strokeColor(line).stroke();
    doc.fillColor(muted).font('Helvetica').fontSize(8.5)
      .text('CVMind is not registered under GST, so no GST is charged on this invoice.', left, footY + 12, { width })
      .text('This is a computer-generated invoice and needs no signature.', { width })
      .text(`Questions about this payment? Write to ${contactEmails().join(' or ')}.`, { width });

    doc.end();
  });
}

// Builds the invoice for a paid order. Gives the order its invoice number the first time.
export async function invoiceForOrder(orderId) {
  let order = await PaymentOrder.findOne({ orderId, status: 'paid' }).lean();
  if (!order || !(order.amount > 0)) return null;
  if (!order.invoiceNumber) {
    const number = await nextInvoiceNumber(order.paidAt || new Date());
    // Another caller may have numbered it first; theirs wins
    order = await PaymentOrder.findOneAndUpdate({ orderId, invoiceNumber: { $in: ['', null] } }, { invoiceNumber: number }, { returnDocument: 'after' }).lean()
      || await PaymentOrder.findOne({ orderId }).lean();
  }
  const [user, sub] = await Promise.all([
    mongoose.models.User ? mongoose.models.User.findOne({ email: order.email }, { name: 1 }).lean() : null,
    Subscription.findOne({ orderId }).lean()
  ]);
  const data = {
    number: order.invoiceNumber,
    date: order.paidAt || order.createdAt,
    buyer: { name: user?.name || '', email: order.email },
    plan: PLANS[order.plan]?.label || order.plan,
    period: sub ? { from: sub.startsAt, to: sub.expiresAt } : null,
    listPrice: order.listPrice,
    discount: order.discount || 0,
    couponCode: order.couponCode || '',
    amount: order.amount,
    method: METHOD_LABEL[order.paymentMethod] || (order.paymentMethod ? order.paymentMethod.replace(/_/g, ' ') : ''),
    orderId: order.orderId,
    paymentId: order.cfPaymentId || ''
  };
  return { data, pdf: await renderInvoicePdf(data) };
}

// Emails the invoice once per order. On a failed send it can be tried again.
export async function sendInvoice(orderId) {
  if (!emailConfigured()) return false;
  const claimed = await PaymentOrder.findOneAndUpdate({ orderId, status: 'paid', amount: { $gt: 0 }, invoiceSentAt: null }, { invoiceSentAt: new Date() }).lean();
  if (!claimed) return false;
  try {
    const invoice = await invoiceForOrder(orderId);
    if (!invoice) return false;
    const { data, pdf } = invoice;
    await sendEmail({
      to: data.buyer.email,
      ...invoiceEmail({ name: data.buyer.name, number: data.number, plan: data.plan, amount: inr(data.amount), until: data.period ? day(data.period.to) : '' }),
      attachments: [{ filename: `CVMind-Invoice-${data.number}.pdf`, content: pdf.toString('base64') }]
    });
    return true;
  } catch (err) {
    await PaymentOrder.updateOne({ orderId }, { invoiceSentAt: null }).catch(() => {});
    throw err;
  }
}
