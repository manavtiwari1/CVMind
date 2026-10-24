import type { ImportRow } from './api';

// Column names colleges tend to use, mapped to ours
const HEADERS: Record<string, keyof ImportRow> = {
  email: 'email', 'email id': 'email', 'e-mail': 'email', 'email address': 'email', mail: 'email',
  name: 'name', 'student name': 'name', 'full name': 'name',
  'roll no': 'rollNo', rollno: 'rollNo', 'roll number': 'rollNo', roll: 'rollNo', 'enrollment no': 'rollNo', 'enrolment no': 'rollNo', 'registration no': 'rollNo', 'reg no': 'rollNo', 'student id': 'rollNo',
  branch: 'branch', department: 'branch', dept: 'branch', stream: 'branch', course: 'branch',
  batch: 'batch', year: 'batch', 'passing year': 'batch', 'graduation year': 'batch', 'pass out year': 'batch'
};

// Small CSV reader: quoted fields, commas or tabs (pasted from a spreadsheet)
export function parseCsv(text: string): string[][] {
  const delimiter = text.includes('\t') && !text.split('\n')[0].includes(',') ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) { row.push(cell.trim()); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim()); cell = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function toImportRows(text: string): { rows: ImportRow[]; error: string } {
  // \s also matches the byte-order mark Excel puts at the start of a CSV
  const table = parseCsv(text.replace(/^\s+/, ''));
  if (!table.length) return { rows: [], error: 'The file is empty.' };
  const header = table[0].map((h) => HEADERS[h.toLowerCase().replace(/[._]/g, ' ').replace(/\s+/g, ' ').trim()]);
  // No header row: a plain list of emails
  if (!header.includes('email')) {
    if (table.every((r) => r.length === 1)) return { rows: table.map((r) => ({ email: r[0] })), error: '' };
    return { rows: [], error: 'Add a header row with an "Email" column. Other columns: Name, Roll no, Branch, Batch.' };
  }
  const rows = table.slice(1).map((r) => {
    const out: ImportRow = { email: '' };
    header.forEach((key, i) => { if (key && r[i]) out[key] = r[i]; });
    return out;
  });
  return { rows, error: rows.length ? '' : 'The file has a header row but no students.' };
}
