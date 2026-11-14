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

// Logo and wordmark on the left, a title block on the right, a gold rule under both
export function letterhead(doc, { title, lines = [], address = '' } = {}) {
  const { navy, soft, gold } = COLORS;
  doc.image(LOGO, MARGIN, 36, { height: 46 });
  doc.font('extrabold').fontSize(26).fillColor('#0b1437').text('CV', MARGIN + 54, 40, { continued: true, lineBreak: false }).fillColor('#3b38d6').text('Mind', { lineBreak: false });
  doc.font('semibold').fontSize(7.5).fillColor('#1e2a5a').text('AI POWERED  •  CAREER EMPOWERED', MARGIN + 56, 72, { lineBreak: false, characterSpacing: 0.6 });
  if (address) doc.font('regular').fontSize(7.5).fillColor(soft).text(address, MARGIN + 56, 84, { width: 240 });
  if (title) doc.font('extrabold').fontSize(20).fillColor(navy).text(title, 300, 38, { width: A4[0] - 300 - MARGIN, align: 'right' });
  lines.forEach((l, i) => doc.font('regular').fontSize(9).fillColor(soft).text(l, 300, 66 + i * 13, { width: A4[0] - 300 - MARGIN, align: 'right' }));
  doc.rect(MARGIN, 108, A4[0] - 2 * MARGIN, 2).fill(gold);
  doc.x = MARGIN;
  doc.y = 128;
}

export function footer(doc, note) {
  const { soft, band, gold } = COLORS;
  const y = A4[1] - 58;
  doc.font('italic').fontSize(8).fillColor(soft).text(note, MARGIN, y, { width: A4[0] - 2 * MARGIN, align: 'center', lineBreak: false });
  doc.font('regular').fontSize(8).fillColor(soft).text(`${COMPANY.name} · ${COMPANY.site} · ${COMPANY.email}`, MARGIN, y + 13, { width: A4[0] - 2 * MARGIN, align: 'center', lineBreak: false });
  doc.rect(0, A4[1] - 18, A4[0], 18).fill(band);
  doc.polygon([A4[0] - 170, A4[1]], [A4[0] - 155, A4[1] - 18], [A4[0], A4[1] - 18], [A4[0], A4[1]]).fill(gold);
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
  letterhead(doc, { title: 'PAYSLIP', lines: [monthLabel(line.month), line.payslipNumber ? `No. ${line.payslipNumber}` : 'Not paid yet'], address: settings.companyAddress });

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

  footer(doc, 'This is a computer-generated payslip and needs no signature.');
  doc.end();
  return done;
}
