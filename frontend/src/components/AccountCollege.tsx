import { useEffect, useState } from 'react';
import { GraduationCap, Loader2 } from 'lucide-react';
import { API_BASE } from '../lib/apiBase';
import { authFetch } from '../lib/authFetch';
import { readUser, saveUser } from '../lib/currentUser';
import { fetchMyCollege } from '../lib/myCollege';
import type { MyCollege } from '../lib/myCollege';

const STATE_LABEL = { approved: 'Approved', changes_requested: 'Needs changes', stale: 'Edited since review', not_reviewed: 'Not reviewed' };
const STATE_COLOR = { approved: 'var(--green)', changes_requested: '#b45309', stale: 'var(--blue)', not_reviewed: 'var(--text-secondary)' };
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

// Account → My college: the college a student is linked to, its reviews of their resumes, and leaving
export default function AccountCollege({ initial, onLeft }: { initial: MyCollege | null; onLeft: () => void }) {
  const [data, setData] = useState<MyCollege | null>(initial);
  const [error, setError] = useState('');
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    fetchMyCollege().then(setData, (err: Error) => setError(err.message));
  }, []);

  const leave = async () => {
    if (!data || !window.confirm(`Leave ${data.college.name}? Your placement team will stop seeing your resumes and scores, and the free CVMind Pro from your college ends.`)) return;
    setLeaving(true);
    try {
      const res = await authFetch(`${API_BASE}/api/user/college/leave`, { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not leave your college.');
      // Pro may still come from a subscription; the next account check settles it
      const stored = readUser();
      if (stored) saveUser({ ...stored, isPro: false, plan: undefined });
      onLeft();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not leave your college.');
      setLeaving(false);
    }
  };

  return (
    <>
      <h1 className="acct-title">My college</h1>
      {error && <p className="acct-msg error" role="alert">{error}</p>}
      {!data ? (
        <div className="acct-empty"><Loader2 size={22} className="acct-spin" /> Loading…</div>
      ) : (
        <>
          <div className="acct-plan">
            <div>
              <span className="acct-label">Linked to</span>
              <div className="acct-plan-name"><GraduationCap size={18} /> {data.college.name}</div>
              <p className="acct-plan-desc">
                {data.college.proActive
                  ? `Your college gives you CVMind Pro until ${day(data.college.endsAt)}. Your placement team can see your resumes, ATS scores and LinkedIn results.`
                  : "Your college's CVMind plan has ended, so the free Pro has ended too."}
              </p>
            </div>
          </div>

          <h2 className="acct-label" style={{ marginTop: 20, display: 'block' }}>Resume reviews</h2>
          {data.reviews.length === 0 ? (
            <p className="acct-billing-note" style={{ marginTop: 6 }}>Your placement team hasn't reviewed a resume yet. Build or update your resume and they will see it.</p>
          ) : (
            <ul className="acct-docs">
              {data.reviews.map((r) => (
                <li key={r.workId} className="acct-doc" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                  <div className="acct-doc-info">
                    <span className="acct-doc-title">{r.title} · <span style={{ color: STATE_COLOR[r.state] }}>{STATE_LABEL[r.state]}</span></span>
                    <span className="acct-doc-meta">Reviewed by {r.reviewerName} on {day(r.reviewedAt)}{r.state === 'stale' ? ' · you edited it after the review' : ''}</span>
                  </div>
                  {r.comments.map((c, i) => (
                    <p key={i} className="acct-doc-meta" style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg-secondary, rgba(0,0,0,0.04))' }}>
                      <b>{c.byName}:</b> {c.text}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          )}

          <div className="acct-actions" style={{ marginTop: 20 }}>
            <button className="acct-btn ghost" disabled={leaving} onClick={leave}>{leaving ? <Loader2 size={15} className="acct-spin" /> : 'Leave college'}</button>
          </div>
        </>
      )}
    </>
  );
}
