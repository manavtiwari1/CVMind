import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Overview as OverviewData } from '../api';
import { Spinner } from '../ui';
import { errorText, usePortal } from '../portal';

type Go = (view: 'students' | 'invite' | 'settings') => void;

export default function Overview({ go }: { go: Go }) {
  const { college, isAdmin } = usePortal();
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ data: OverviewData }>('/overview').then((r) => setData(r.data), (err) => setError(errorText(err)));
  }, []);

  if (error) return <div className="pl-notice red">{error}</div>;
  if (!data) return <div className="pl-center"><Spinner /> Loading…</div>;

  const scored = data.scoreBuckets.reduce((n, b) => n + b.students, 0);
  const maxBucket = Math.max(1, ...data.scoreBuckets.map((b) => b.students));
  const { minAtsScore } = college.settings;

  return (
    <>
      <div className="pl-head">
        <div>
          <h1>Overview</h1>
          <p>{college.name} · plan ends {new Date(college.contract.endsAt || '').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="pl-actions">
          <button type="button" className="pl-btn" onClick={() => go('invite')}>Add students</button>
          <button type="button" className="pl-btn primary" onClick={() => go('students')}>Open students</button>
        </div>
      </div>

      {data.joined === 0 && (
        <div className="pl-notice blue">
          No students have joined yet. Upload your student list under <b>Add students</b>. Each student gets an email, and their resumes and scores show here once they accept.
        </div>
      )}

      <div className="pl-grid">
        <div className="pl-card pl-stat"><span>Students joined</span><b>{data.joined}</b><small>{data.invited} invited, not joined yet</small></div>
        <div className="pl-card pl-stat"><span>Seats used</span><b>{data.seatsUsed} / {data.seats}</b><small>Joined and invited students</small></div>
        <div className="pl-card pl-stat"><span>Eligible for drives</span><b>{data.eligible}</b><small>{minAtsScore ? `ATS ${minAtsScore}+ and an approved resume` : 'An approved resume'}</small></div>
        <div className="pl-card pl-stat"><span>Approved resumes</span><b>{data.approved}</b><small>{data.changesRequested} need changes · {data.notReviewed} to review</small></div>
      </div>

      <div className="pl-grid two">
        <div className="pl-card pad">
          <h2>ATS score spread</h2>
          {scored === 0 ? <p className="pl-muted">No ATS checks yet. Scores appear when students check a resume on CVMind.</p> : (
            <div className="pl-bars">
              {data.scoreBuckets.map((b) => (
                <div key={b.from} className="pl-bar">
                  <span>{b.from}–{Math.min(b.to, 100)}</span>
                  <div className="pl-bar-track"><div className="pl-bar-fill" style={{ width: `${(b.students / maxBucket) * 100}%`, background: b.from >= 75 ? 'var(--pl-green)' : b.from >= 60 ? '#84cc16' : b.from >= 40 ? '#f59e0b' : 'var(--pl-red)' }} /></div>
                  <span className="pl-muted" style={{ textAlign: 'right' }}>{b.students}</span>
                </div>
              ))}
              {data.noScore > 0 && <p className="pl-muted pl-small">{data.noScore} joined students haven't checked a resume yet.</p>}
            </div>
          )}
        </div>
        <Groups title="By branch" rows={data.byBranch} />
      </div>
      <Groups title="By batch" rows={data.byBatch} />

      {isAdmin && !minAtsScore && (
        <p className="pl-muted pl-small">Tip: set a minimum ATS score in <button type="button" className="pl-link" onClick={() => go('settings')}>Settings</button> to build your eligible list for placement drives.</p>
      )}
    </>
  );
}

function Groups({ title, rows }: { title: string; rows: OverviewData['byBranch'] }) {
  return (
    <div className="pl-card">
      <h2 style={{ padding: '16px 16px 0' }}>{title}</h2>
      {rows.length === 0 ? <p className="pl-muted" style={{ padding: 16 }}>Nothing yet.</p> : (
        <div className="pl-table-wrap">
          <table className="pl-table">
            <thead><tr><th>{title.replace('By ', '').replace(/^./, (c) => c.toUpperCase())}</th><th className="num">Joined</th><th className="num">Average ATS</th><th className="num">Eligible</th></tr></thead>
            <tbody>
              {rows.map((r) => <tr key={r.name}><td>{r.name}</td><td className="num">{r.students}</td><td className="num">{r.avgAts ?? '—'}</td><td className="num">{r.eligible}</td></tr>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
