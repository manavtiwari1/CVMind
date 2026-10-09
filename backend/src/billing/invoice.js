import PDFDocument from 'pdfkit';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppSetting } from '../admin/models.js';
import { sendEmail, emailConfigured, SUPPORT_EMAIL } from '../admin/mailer.js';
import { invoiceEmail } from '../services/emailTemplates.js';
import { PLANS } from './plans.js';
import { PaymentOrder, Subscription } from './models.js';

// The invoice emailed after a Cashfree payment. CVMind isn't GST registered, so it carries no tax lines.
// The layout follows the CVMind invoice template (landscape, yellow and navy).

const SELLER = { name: 'CVMind', email: SUPPORT_EMAIL, phone: '+91 87006 83798', site: 'https://www.cvmind.in' };
const TZ = 'Asia/Kolkata';

const ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../assets');
const FONTS = {
  regular: path.join(ASSETS, 'fonts/Poppins-Regular.ttf'),
  medium: path.join(ASSETS, 'fonts/Poppins-Medium.ttf'),
  semibold: path.join(ASSETS, 'fonts/Poppins-SemiBold.ttf'),
  bold: path.join(ASSETS, 'fonts/Poppins-Bold.ttf'),
  extrabold: path.join(ASSETS, 'fonts/Poppins-ExtraBold.ttf'),
  italic: path.join(ASSETS, 'fonts/Poppins-Italic.ttf')
};
const LOGO = path.join(ASSETS, 'invoice-logo.png');

const METHOD_LABEL = {
  upi: 'UPI', credit_card: 'Credit card', debit_card: 'Debit card', net_banking: 'Net banking',
  wallet: 'Wallet', pay_later: 'Pay later', cardless_emi: 'Cardless EMI', credit_card_emi: 'Card EMI', debit_card_emi: 'Card EMI'
};

export const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ });

// CVM-2026-0001, counting up across all years
async function nextInvoiceNumber(date) {
  const row = await AppSetting.findOneAndUpdate({ key: 'counter.invoice' }, { $inc: { value: 1 } }, { upsert: true, returnDocument: 'after' }).lean();
  return `CVM-${new Date(date).toLocaleString('en-IN', { year: 'numeric', timeZone: TZ })}-${String(row.value).padStart(4, '0')}`;
}

// Material icons (24x24 paths) for the contact block
const ICON = {
  person: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  phone: 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
  mail: 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
  globe: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z'
};

/**
 * @param {object} inv { number, date, buyer: { name, email }, plan, period: { from, to } | null,
 *   listPrice, discount, couponCode, amount, method, orderId, paymentId }
 * @returns {Promise<Buffer>}
 */
export function renderInvoicePdf(inv) {
  // Positions below are in the template's pixels (1456 x 818), scaled onto a 16:9 page
  const S = 0.66;
  const u = (v) => v * S;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [u(1456), u(818)], margin: 0, info: { Title: `Invoice ${inv.number}`, Author: SELLER.name } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    for (const [name, file] of Object.entries(FONTS)) doc.registerFont(name, file);

    const navy = '#0d1f4f';
    const ink = '#111827';
    const valueInk = '#1e2f5c';
    const yellow = '#fcc84f';
    const gold = '#f4b400';
    const line = '#d9e1ee';

    // Draws one line of text at template coordinates; shrinks it to fit when given a width
    const text = (str, x, y, { font = 'regular', size = 16, color = ink, width, align = 'left', spacing = 0 } = {}) => {
      let pt = u(size);
      doc.font(font);
      if (width) {
        while (pt > u(9) && doc.fontSize(pt).widthOfString(str, { characterSpacing: u(spacing) }) > u(width)) pt -= 0.25;
      }
      doc.fillColor(color).fontSize(pt).text(str, u(x), u(y), {
        lineBreak: false, characterSpacing: u(spacing), ...(width ? { width: u(width), align } : {})
      });
    };
    const rect = (x, y, w, h, fill) => doc.rect(u(x), u(y), u(w), u(h)).fill(fill);
    const icon = (d, x, y, size, color) => {
      doc.save().translate(u(x), u(y)).scale(u(size) / 24).path(d).fill(color).restore();
    };

    rect(0, 0, 1456, 818, '#ffffff');

    // Header: logo, wordmark, invoice number and date
    doc.image(LOGO, u(48), u(20), { height: u(100) });
    text('CV', 222, 4, { font: 'extrabold', size: 66, color: '#0b1437' });
    const markWidth = (doc.font('extrabold').fontSize(u(66)).widthOfString('CV') + doc.widthOfString('Mind')) / S;
    text('Mind', 222 + doc.widthOfString('CV') / S, 4, { font: 'extrabold', size: 66, color: '#3b38d6' });

    // Tagline spread to the wordmark's width, with a gold dot between the halves
    const tagParts = [['AI POWERED', '#1e2a5a'], ['•', gold], ['CAREER EMPOWERED', '#1e2a5a']];
    doc.font('semibold').fontSize(u(13.5));
    const tagChars = tagParts.reduce((n, [t]) => n + t.length, 0) + 2;
    const gap = doc.widthOfString(' ');
    const natural = tagParts.reduce((w, [t]) => w + doc.widthOfString(t), 0) + gap * 2;
    const spacing = Math.max(0, (u(markWidth) - natural) / (tagChars - 1));
    let tx = u(225);
    for (const [t, color] of tagParts) {
      doc.fillColor(color).text(t, tx, u(92), { lineBreak: false, characterSpacing: spacing });
      tx += doc.widthOfString(t, { characterSpacing: spacing }) + gap + spacing;
    }

    text('INVOICE', 1000, 12, { font: 'extrabold', size: 60, color: navy, width: 410, align: 'right' });
    text('Invoice No.:', 1065, 88, { font: 'bold', size: 19, color: navy });
    text(inv.number, 1237, 88, { size: 19, color: valueInk, width: 175 });
    text('Invoice Date:', 1065, 124, { font: 'bold', size: 19, color: navy });
    text(day(inv.date), 1237, 124, { size: 19, color: valueInk });

    // Bill to
    rect(45, 146, 8, 68, gold);
    text('BILL TO', 78, 138, { font: 'bold', size: 25, color: navy });
    const buyerLines = inv.buyer.name ? [inv.buyer.name, inv.buyer.email] : [inv.buyer.email];
    buyerLines.forEach((l, i) => text(l, 75, 172 + i * 21, { size: 17, color: valueInk, width: 600 }));

    // Summary strip
    const strip = [[45, 342, 'Invoice No.', inv.number], [388, 332, 'Issue Date', day(inv.date)], [721, 331, 'Due Date', day(inv.date)]];
    for (const [x, w, label, value] of strip) {
      rect(x, 234, w, 84, yellow);
      text(label, x + 36, 248, { font: 'bold', size: 18, color: navy });
      text(value, x + 36, 274, { size: 18, color: valueInk, width: w - 50 });
    }
    rect(1053, 234, 363, 84, '#0b2559');
    text('TOTAL DUE (INR)', 1116, 242, { font: 'bold', size: 17, color: '#ffffff' });
    text(inr(inv.amount), 1116, 266, { font: 'bold', size: 30, color: '#ffffff', width: 290 });

    // Line item
    rect(45, 333, 1371, 38, '#e9eff9');
    doc.rect(u(45), u(333), u(1371), u(78)).lineWidth(u(1.5)).strokeColor(line).stroke();
    text('Description', 80, 339, { font: 'bold', size: 18, color: navy });
    text('Qty', 611, 339, { font: 'bold', size: 18, color: navy, width: 255, align: 'center' });
    text('Unit Price (₹)', 867, 339, { font: 'bold', size: 18, color: navy, width: 293, align: 'center' });
    text('Amount (₹)', 1161, 339, { font: 'bold', size: 18, color: navy, width: 255, align: 'center' });
    for (const x of [610, 866, 1160]) doc.moveTo(u(x), u(371)).lineTo(u(x), u(411)).strokeColor(line).stroke();
    const period = inv.period ? ` (${day(inv.period.from)} to ${day(inv.period.to)})` : '';
    text(`CVMind Pro – ${inv.plan}${period}`, 80, 378, { size: 16, color: valueInk, width: 515 });
    text('1', 611, 378, { size: 16, color: valueInk, width: 255, align: 'center' });
    text(inr(inv.listPrice), 867, 378, { size: 16, color: valueInk, width: 293, align: 'center' });
    text(inr(inv.listPrice), 1161, 378, { size: 16, color: valueInk, width: 255, align: 'center' });

    // Payment details
    const payRows = [
      ['PAYMENT', `${inr(inv.amount)} received`],
      ['STATUS', 'PAID'],
      ['PAID ON', day(inv.date)],
      ['METHOD', inv.method || 'Online (Cashfree)'],
      ['ORDER ID', inv.orderId],
      ['PAYMENT ID', inv.paymentId || '—']
    ];
    const rowH = 35.5;
    payRows.forEach(([label, value], i) => {
      const y = 420 + i * rowH;
      text(label, 97, y + 7, { font: 'bold', size: 15, color: '#000000', width: 235, align: 'center' });
      text(value, 350, y + 7, { font: label === 'STATUS' ? 'bold' : 'regular', size: 15, color: label === 'STATUS' ? '#15803d' : ink, width: 325 });
    });
    doc.lineWidth(u(2)).strokeColor('#000000');
    doc.rect(u(97), u(420), u(591), u(rowH * payRows.length)).stroke();
    doc.moveTo(u(332), u(420)).lineTo(u(332), u(420 + rowH * payRows.length)).stroke();
    for (let i = 1; i < payRows.length; i++) doc.moveTo(u(97), u(420 + i * rowH)).lineTo(u(688), u(420 + i * rowH)).stroke();

    // Totals
    let ty = 420;
    const totalRow = (label, value, { bg, size = 18, color = navy } = {}) => {
      if (bg) rect(820, ty, 593, 37, bg);
      else doc.rect(u(810), u(ty), u(595), u(36)).lineWidth(u(1)).strokeColor(line).stroke();
      text(label, bg ? 832 : 840, ty + 6, { font: 'bold', size, color: navy, width: 330 });
      text(value, 1160, ty + 6, { font: 'bold', size, color, width: 230, align: 'right' });
      ty += 40;
    };
    totalRow('Subtotal', inr(inv.listPrice));
    if (inv.discount > 0) totalRow(`Discount${inv.couponCode ? ` (${inv.couponCode})` : ''}`, `– ${inr(inv.discount)}`, { color: '#15803d' });
    totalRow('Total', inr(inv.amount), { bg: '#fdefc8', size: 20 });

    // GST note
    doc.roundedRect(u(55), u(640), u(1370), u(42), u(6)).fillAndStroke('#f6f9fd', line);
    doc.circle(u(95), u(661), u(12)).fill(gold);
    text('i', 89, 648, { font: 'bold', size: 17, color: '#ffffff', width: 12, align: 'center' });
    rect(143, 648, 3, 26, gold);
    text('CVMind is not registered under GST, so no GST is charged on this invoice.', 155, 646, { size: 18, color: valueInk });
    rect(45, 698, 405, 2, gold);
    text('This is a computer-generated invoice and needs no signature.', 457, 686, { font: 'italic', size: 14, color: valueInk });
    rect(985, 698, 430, 2, gold);

    // Footer: support line and business contact
    doc.circle(u(85), u(751), u(30)).fill(navy);
    icon(ICON.mail, 70, 736, 30, '#ffffff');
    rect(151, 738, 3, 44, gold);
    text('Questions about this payment? Write to', 164, 727, { size: 17, color: valueInk });
    text(SELLER.email, 164, 750, { font: 'bold', size: 17, color: navy });

    const contact = [[ICON.person, `Business: ${SELLER.name}`], [ICON.phone, `Phone: ${SELLER.phone}`], [ICON.mail, `Email: ${SELLER.email}`], [ICON.globe, `Website: ${SELLER.site}`]];
    contact.forEach(([d, label], i) => {
      icon(d, 986, 705 + i * 21, 20, navy);
      text(label, 1040, 703 + i * 21, { size: 15, color: valueInk, width: 400 });
    });

    // Bottom band
    rect(0, 792, 1456, 26, '#0b2559');
    doc.polygon([u(1120), u(818)], [u(1145), u(792)], [u(1456), u(792)], [u(1456), u(818)]).fill(gold);
    doc.polygon([u(1108), u(818)], [u(1133), u(792)], [u(1141), u(792)], [u(1116), u(818)]).fill('#ffffff');

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

export const invoiceFileName = (number) => `CVMind-Invoice-${number}.pdf`;

// Emails a paid order's invoice to the buyer, every time it's called (Admin → Invoices can resend)
export async function emailInvoice(orderId) {
  const invoice = await invoiceForOrder(orderId);
  if (!invoice) return false;
  const { data, pdf } = invoice;
  await sendEmail({
    to: data.buyer.email,
    ...invoiceEmail({ name: data.buyer.name, number: data.number, plan: data.plan, amount: inr(data.amount), until: data.period ? day(data.period.to) : '' }),
    attachments: [{ filename: invoiceFileName(data.number), content: pdf.toString('base64') }]
  });
  await PaymentOrder.updateOne({ orderId }, { invoiceSentAt: new Date() });
  return true;
}

// Emails the invoice once per order, after payment. On a failed send it can be tried again.
export async function sendInvoice(orderId) {
  if (!emailConfigured()) return false;
  const claimed = await PaymentOrder.findOneAndUpdate({ orderId, status: 'paid', amount: { $gt: 0 }, invoiceSentAt: null }, { invoiceSentAt: new Date() }).lean();
  if (!claimed) return false;
  try {
    return await emailInvoice(orderId);
  } catch (err) {
    await PaymentOrder.updateOne({ orderId }, { invoiceSentAt: null }).catch(() => {});
    throw err;
  }
}
