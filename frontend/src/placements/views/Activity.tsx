import { useEffect, useState } from 'react';
import { api } from '../api';
import { Spinner } from '../ui';
import { errorText, fmtDateTime } from '../portal';

interface Entry { id: string; actorName: string; actorType: string; action: string; targetLabel: string; ip: string; createdAt: string }

const ACTIONS: Record<string, string> = {
  'staff.login': 'Signed in',
  'staff.password_changed': 'Changed their password',
  'staff.added': 'Added staff',
  'staff.reset': 'Reset a staff password',
  'staff.removed': 'Removed staff',
  'staff.admin_replaced': 'Changed the college admin',
  'settings.updated': 'Changed settings',
  'roster.imported': 'Uploaded students',
  'roster.edited': 'Edited a student',
  'roster.reinvited': 'Sent an invitation again',
  'roster.removed': 'Removed a student',
  'student.joined': 'Joined',
  'student.declined': 'Declined the invitation',
  'student.left': 'Left the college',
  'student.viewed': 'Viewed a student',
  'work.viewed': 'Opened a resume or report',
  'review.approved': 'Approved a resume',
  'review.changes_requested': 'Asked for changes',
  'review.commented': 'Commented on a review',
  'download.resume': 'Downloaded a resume',
  'download.zip': 'Downloaded resumes (ZIP)',
  'students.exported': 'Exported the student list',
  'college.created': 'Set up the college',
  'college.updated': 'Updated the plan'
};

// Who did what in this college's portal. Only this college's own entries are ever returned.
export default function ActivityView() {
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ data: Entry[]; total: number }>('/audit', { query: { page, limit: 50 } }).then((r) => { setRows(r.data); setTotal(r.total); }, (err) => setError(errorText(err)));
  }, [page]);

  const pages = Math.max(1, Math.ceil(total / 50));
  return (
    <>
      <div className="pl-head">
        <div>
          <h1>Activity log</h1>
          <p>Every sign-in, student view, review and download in your portal.</p>
        </div>
      </div>
      {error && <div className="pl-notice red">{error}</div>}
      <div className="pl-card">
        {!rows ? <div className="pl-center"><Spinner /></div> : rows.length === 0 ? <div className="pl-empty">Nothing yet.</div> : (
          <div className="pl-table-wrap">
            <table className="pl-table">
              <thead><tr><th>When</th><th>Who</th><th>What</th><th>On</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(r.createdAt)}</td>
                    <td>{r.actorType === 'cvmind' ? 'CVMind' : r.actorName}{r.actorType === 'student' && <span className="pl-muted pl-small"> (student)</span>}</td>
                    <td>{ACTIONS[r.action] || r.action}</td>
                    <td className="pl-muted">{r.targetLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > 50 && (
          <div className="pl-pager">
            <span>Page {page} of {pages}</span>
            <div className="pl-actions">
              <button type="button" className="pl-btn sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Newer</button>
              <button type="button" className="pl-btn sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Older</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
