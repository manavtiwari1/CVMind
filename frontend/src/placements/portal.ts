import { createContext, useContext } from 'react';
import type { College, ReviewStatus, Staff } from './api';

export type Toast = (message: string, tone?: 'ok' | 'error') => void;

export interface Portal {
  staff: Staff;
  college: College;
  isAdmin: boolean;
  // Contract ended: the portal is read-only until CVMind renews it
  readOnly: boolean;
  toast: Toast;
  setCollege: (college: College) => void;
  openStudent: (id: string) => void;
}

export const PortalContext = createContext<Portal | null>(null);
export const usePortal = () => {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal outside the placements portal');
  return ctx;
};

export const errorText = (err: unknown, fallback = 'Something went wrong. Please try again.') => (err instanceof Error && err.message ? err.message : fallback);

export const fmtDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (d: string | null | undefined) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');

export const REVIEW_LABELS: Record<ReviewStatus, string> = {
  approved: 'Approved',
  changes_requested: 'Needs changes',
  stale: 'Edited since review',
  not_reviewed: 'Not reviewed'
};
