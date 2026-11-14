import type { Tone } from './ui';

// Shared by the ERP sections (People, Payroll, Letters, …)

export type EmploymentType = 'intern' | 'full_time' | 'part_time' | 'contractor';
export type PayType = 'stipend' | 'salary' | 'unpaid';
export const EMPLOYMENT: Array<{ value: EmploymentType; label: string; tone: Tone }> = [
  { value: 'intern', label: 'Intern', tone: 'purple' },
  { value: 'full_time', label: 'Full-time', tone: 'green' },
  { value: 'part_time', label: 'Part-time', tone: 'blue' },
  { value: 'contractor', label: 'Contractor', tone: 'amber' }
];

// "2026-11-12" → "12 Nov 2026", without a timezone shift
export const day = (v: string) => {
  if (!v) return '—';
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

