import fs from 'node:fs';
import PDFDocument from 'pdfkit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { monthLabel } from './payroll.js';

// ERP documents (payslips, letters) on an A4 CVMind letterhead, in the invoice's fonts and colours.

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

export const COLORS = { navy: '#0d1f4f', ink: '#111827', soft: '#475569', line: '#d9e1ee', gold: '#f4b400', band: '#0b2559', tint: '#f3f6fb', green: '#15803d' };
export const COMPANY = { name: 'CVMind', site: 'www.cvmind.in', email: 'support@cvmind.in' };

const A4 = [595.28, 841.89];
export const MARGIN = 48;
export const PAGE = A4;

export const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
export const longDate = (d) => {
  if (!d) return '—';
  const date = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00Z`) : new Date(d);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: typeof d === 'string' && d.length === 10 ? 'UTC' : 'Asia/Kolkata' });
};

// Starts an A4 document; returns the doc and a promise of the finished PDF bytes
export function startDocument(title) {
  const doc = new PDFDocument({ size: A4, margin: MARGIN, info: { Title: title, Author: COMPANY.name } });
  for (const [name, file] of Object.entries(FONTS)) doc.registerFont(name, file);
  const chunks = [];
  const done = new Promise((resolve, reject) => {
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  return { doc, done };
}

// The official CVMind letterhead: logo, wordmark, website and Udyam number on the left; the MSME mark
// and the office address on the right with a dark rule under it; a "contact us" strip at the foot.
// assets/letterhead/msme.png and assets/letterhead/stamp.png are drawn when present.
export const LETTERHEAD = {
  site: 'WWW.CVMIND.IN',
  udyam: 'UDYAM-DL-10-0123703',
  address: 'D-122, K-1 Mohan Garden, Uttam Nagar, New Delhi - 110059',
  phone: '+91 8700683798',
  email: 'cvmindofficial@gmail.com'
};
const MSME = path.join(ASSETS, 'letterhead/msme.png');
export const STAMP = path.join(ASSETS, 'letterhead/stamp.png');
const RULE = '#1f2a37';
const PIN = 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z';
const PHONE = 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z';
const MAIL = 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z';
const icon = (doc, d, x, y, size, color) => doc.save().translate(x, y).scale(size / 24).path(d).fill(color).restore();
export const hasImage = (file) => { try { return fs.statSync(file).isFile(); } catch { return false; } };

export function letterhead(doc) {
  const ink = '#111827';
  // Left: logo, wordmark with a green dot, website and Udyam number
  const logo = doc.openImage(LOGO);
  const lw = (logo.width * 44) / logo.height;
  doc.image(logo, MARGIN, 52, { height: 44 });
  const tx = MARGIN + lw + 8;
  doc.font('extrabold').fontSize(22).fillColor('#0b1437').text('CVMind', tx, 54, { lineBreak: false });
  const w = doc.widthOfString('CVMind');
  doc.circle(tx + w + 5, 72, 3.2).fill('#16a34a');
  doc.font('regular').fontSize(6.5).fillColor('#1e3a8a').text(LETTERHEAD.site, tx + 1, 82, { lineBreak: false, characterSpacing: 0.3 });
  doc.font('bold').fontSize(6.5).fillColor(ink).text(LETTERHEAD.udyam, tx + 1, 91, { lineBreak: false });
  // Right: MSME mark, address with a pin, and the rule under it
  if (hasImage(MSME)) doc.image(MSME, A4[0] - MARGIN - 112, 16, { width: 112 });
  icon(doc, PIN, 320, 68, 10, ink);
  doc.font('regular').fontSize(8).fillColor(ink).text(LETTERHEAD.address, 334, 67, { width: A4[0] - MARGIN - 334, lineGap: 1 });
  doc.moveTo(316, 106).lineTo(A4[0] - MARGIN, 106).lineWidth(2.5).strokeColor(RULE).stroke();
  doc.x = MARGIN;
  doc.y = 140;
}

export function footer(doc) {
  const ink = '#111827';
  const y = A4[1] - 52;
  doc.moveTo(108, y).lineTo(A4[0] - MARGIN, y).lineWidth(2).strokeColor(RULE).stroke();
  const ty = y + 10;
  doc.font('bold').fontSize(8.5).fillColor(ink).text('contact us', 118, ty, { lineBreak: false });
  doc.moveTo(170, y + 6).lineTo(170, y + 26).lineWidth(0.8).strokeColor(RULE).stroke();
  icon(doc, PHONE, 182, ty, 10, ink);
  doc.font('regular').fontSize(8).fillColor(ink).text(`Phone: ${LETTERHEAD.phone}`, 198, ty + 1, { lineBreak: false });
  doc.moveTo(318, y + 6).lineTo(318, y + 26).lineWidth(0.8).strokeColor(RULE).stroke();
  icon(doc, MAIL, 330, ty, 10, ink);
  doc.font('regular').fontSize(8).fillColor(ink).text(`Email: ${LETTERHEAD.email}`, 346, ty + 1, { lineBreak: false });
}

// A two-column grid of label/value pairs inside a tinted box
function detailsBox(doc, pairs, y) {
  const { navy, ink, tint, line } = COLORS;
  const w = A4[0] - 2 * MARGIN;
  const rows = Math.ceil(pairs.length / 2);
  const h = rows * 30 + 14;
  doc.roundedRect(MARGIN, y, w, h, 6).fillAndStroke(tint, line);
  pairs.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGIN + 14 + col * (w / 2);
    const ry = y + 10 + row * 30;
    doc.font('semibold').fontSize(7.5).fillColor(navy).text(label.toUpperCase(), x, ry, { lineBreak: false, characterSpacing: 0.4 });
    doc.font('regular').fontSize(10).fillColor(ink).text(value || '—', x, ry + 11, { width: w / 2 - 28, lineBreak: false, ellipsis: true });
  });
  return y + h;
}

// A simple table: header row, then rows of [label, value]
function table(doc, x, y, width, header, rows, { total } = {}) {
  const { navy, ink, line, tint } = COLORS;
  doc.rect(x, y, width, 22).fill(tint);
  doc.font('semibold').fontSize(9).fillColor(navy).text(header[0], x + 10, y + 6.5, { lineBreak: false });
  doc.text(header[1], x + 10, y + 6.5, { width: width - 20, align: 'right', lineBreak: false });
  let ry = y + 22;
  for (const [label, value] of rows) {
    doc.moveTo(x, ry).lineTo(x + width, ry).lineWidth(0.6).strokeColor(line).stroke();
    doc.font('regular').fontSize(9.5).fillColor(ink).text(label, x + 10, ry + 6, { width: width - 110, lineBreak: false, ellipsis: true });
    doc.text(value, x + 10, ry + 6, { width: width - 20, align: 'right', lineBreak: false });
    ry += 22;
  }
  if (total) {
    doc.moveTo(x, ry).lineTo(x + width, ry).lineWidth(1).strokeColor(navy).stroke();
    doc.font('bold').fontSize(10).fillColor(navy).text(total[0], x + 10, ry + 6, { lineBreak: false });
    doc.text(total[1], x + 10, ry + 6, { width: width - 20, align: 'right', lineBreak: false });
    ry += 22;
  }
  doc.rect(x, y, width, ry - y).lineWidth(0.8).strokeColor(line).stroke();
  return ry;
}

const PAY_MODE = { bank: 'Bank transfer', upi: 'UPI', cash: 'Cash', other: 'Other' };

/** @param {object} line an ErpPayLine (paid) @param {object} settings ERP settings @returns {Promise<Buffer>} */
export async function renderPayslipPdf(line, settings = {}) {
  const label = line.payType === 'salary' ? 'Salary' : 'Stipend';
  const { doc, done } = startDocument(`Payslip ${line.payslipNumber || line.month}`);
  letterhead(doc);
  doc.font('bold').fontSize(14).fillColor(COLORS.navy).text(`PAYSLIP · ${monthLabel(line.month).toUpperCase()}`, MARGIN, 124, { width: A4[0] - 2 * MARGIN, align: 'center' });
  doc.font('regular').fontSize(8.5).fillColor(COLORS.soft).text(line.payslipNumber ? `No. ${line.payslipNumber}` : 'Not paid yet', MARGIN, 142, { width: A4[0] - 2 * MARGIN, align: 'center' });
  doc.y = 162;

  let y = detailsBox(doc, [
    ['Name', line.name], ['Employee ID', line.idNumber],
    ['Designation', line.designation], ['Department', line.department],
    ['Pay period', monthLabel(line.month)], ['Paid on', line.paidOn ? longDate(line.paidOn) : 'Not paid yet'],
    ['Payment', line.paidMode ? `${PAY_MODE[line.paidMode] || line.paidMode}${line.paidRef ? ` · Ref ${line.paidRef}` : ''}` : '—'],
    ['Account', line.paidMode === 'upi' ? line.upiId : line.bankAccountLast4 ? `•••• ${line.bankAccountLast4}` : '—']
  ], doc.y);

  y += 18;
  const half = (A4[0] - 2 * MARGIN - 16) / 2;
  const daysEnd = table(doc, MARGIN, y, half, ['Attendance', 'Days'], [
    ['Working days in the month', String(line.monthWorkingDays)],
    ['Your working days', String(line.workingDays)],
    ['Present (incl. WFH)', String(line.presentDays)],
    ['Paid leave', String(line.paidLeaveDays)],
    ['Unpaid leave', String(line.unpaidLeaveDays)],
    ['Unpaid days', String(line.unpaidDays)]
  ]);
  const earnings = [[`Monthly ${label.toLowerCase()}`, inr(line.monthlyAmount)], [`${label} for paid days`, inr(line.basePay)]];
  if (line.bonus) earnings.push(['Bonus', inr(line.bonus)]);
  if (line.reimbursements) earnings.push(['Reimbursements', inr(line.reimbursements)]);
  if (line.deductions) earnings.push(['Deductions', `– ${inr(line.deductions)}`]);
  const payEnd = table(doc, MARGIN + half + 16, y, half, ['Pay', 'Amount'], earnings, { total: ['Net pay', inr(line.netPay)] });

  y = Math.max(daysEnd, payEnd) + 20;
  const w = A4[0] - 2 * MARGIN;
  doc.roundedRect(MARGIN, y, w, 46, 6).fill(COLORS.band);
  doc.font('semibold').fontSize(10).fillColor('#ffffff').text('NET PAY', MARGIN + 16, y + 17, { lineBreak: false, characterSpacing: 0.6 });
  doc.font('bold').fontSize(18).fillColor('#ffffff').text(inr(line.netPay), MARGIN + 16, y + 12, { width: w - 32, align: 'right', lineBreak: false });
  y += 62;
  if (line.note) doc.font('regular').fontSize(9).fillColor(COLORS.soft).text(`Note: ${line.note}`, MARGIN, y, { width: w });

  doc.font('italic').fontSize(8).fillColor(COLORS.soft).text('This is a computer-generated payslip and needs no signature.', MARGIN, A4[1] - 72, { width: A4[0] - 2 * MARGIN, align: 'center', lineBreak: false });
  footer(doc);
  doc.end();
  return done;
}
