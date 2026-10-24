import { Loader2 } from 'lucide-react';
import type { ReviewStatus, StudentStatus } from './api';
import { REVIEW_LABELS } from './portal';

export const Spinner = ({ size = 16 }: { size?: number }) => <Loader2 size={size} className="pl-spin" aria-hidden />;

export function Score({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span className="pl-muted">—</span>;
  const tone = value >= 75 ? 'good' : value >= 50 ? 'mid' : 'low';
  return <span className={`pl-score ${tone}`}>{value}</span>;
}

const REVIEW_TONE: Record<ReviewStatus, string> = { approved: 'green', changes_requested: 'amber', stale: 'blue', not_reviewed: '' };
export const ReviewBadge = ({ status }: { status: ReviewStatus }) => <span className={`pl-badge ${REVIEW_TONE[status]}`}>{REVIEW_LABELS[status]}</span>;

const STATUS: Record<StudentStatus, [string, string]> = {
  joined: ['Joined', 'green'],
  invited: ['Invited', 'blue'],
  declined: ['Declined', 'red'],
  left: ['Left', 'red'],
  removed: ['Removed', '']
};
export const StatusBadge = ({ status }: { status: StudentStatus }) => <span className={`pl-badge ${STATUS[status][1]}`}>{STATUS[status][0]}</span>;
