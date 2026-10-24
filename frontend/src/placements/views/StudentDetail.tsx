import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Download, FileText, Linkedin, MessageSquare, ScanSearch } from 'lucide-react';
import { api, download } from '../api';
import type { Review, StudentDetail as Detail, WorkSummary } from '../api';
import { sanitizeResumeHtml } from '../../lib/sanitizeHtml';
import { ReviewBadge, Score, Spinner, StatusBadge } from '../ui';
import { errorText, fmtDate, fmtDateTime, usePortal } from '../portal';

// Same fonts the resume editor and the PDF export use
const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Rubik:wght@300;400;500;600;700&family=Lato:wght@400;700&family=Merriweather:wght@400;700&family=Playfair+Display:wght@400;700&family=Poppins:wght@400;500;600&family=Open+Sans:wght@400;600;700;800&family=Raleway:wght@300;400;600&family=EB+Garamond:wght@400;500&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,400&family=Great+Vibes&family=Montserrat:wght@400;500;600;700;800&display=swap';

interface LoadedWork {
  id: string;
  title: string;
  type: WorkSummary['type'];
  updatedAt: string;
  html?: string;
  review?: Review;
  evaluation?: Record<string, unknown> | null;
  targetRole?: string;
  fileName?: string;
}

export default function StudentDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { toast, readOnly } = usePortal();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [workId, setWorkId] = useState<string | null>(null);

  useEffect(() => {
    api<Detail>(`/students/${id}`).then((d) => {
      setDetail(d);
      setWorkId(d.works.find((w) => w.type === 'resume')?.id || d.works[0]?.id || null);
    }, (err) => setError(errorText(err)));
  }, [id]);

  if (error) return <><button type="button" className="pl-back" onClick={onBack}><ArrowLeft size={16} /> Students</button><div className="pl-notice red">{error}</div></>;
  if (!detail) return <div className="pl-center"><Spinner /> Loading…</div>;

  const { student, works, scans, linkedin } = detail;
  const resumes = works.filter((w) => w.type === 'resume');
  const reports = works.filter((w) => w.type !== 'resume');
  // Removing ends this college's access to the student's data at once
  const remove = async () => {
    if (!window.confirm(`Remove ${student.name || student.email} from your college? You will no longer see their resumes and scores, and they lose CVMind Pro.`)) return;
    try {
      await api(`/students/${id}`, { method: 'DELETE' });
      toast('Student removed.');
      onBack();
    } catch (err) {
      toast(errorText(err), 'error');
    }
  };
  // The summary badge follows the latest review (the server's eligibility shows on the next load)
  const updateReview = (wid: string, review: Review) => setDetail((d) => d && ({
    ...d,
    student: d.student.stats ? { ...d.student, stats: { ...d.student.stats, reviewStatus: review.state } } : d.student,
    works: d.works.map((w) => (w.id === wid ? { ...w, review } : w))
  }));

  return (
    <>
      <button type="button" className="pl-back" onClick={onBack}><ArrowLeft size={16} /> Students</button>
      <div className="pl-head">
        <div>
          <h1>{student.name || student.email}</h1>
          <p>{[student.rollNo, student.branch, student.batch].filter(Boolean).join(' · ') || student.email}</p>
        </div>
        <div className="pl-actions">
          {student.stats?.eligible && <span className="pl-badge green">Eligible</span>}
          <StatusBadge status={student.status} />
          {!readOnly && <button type="button" className="pl-btn sm danger" onClick={remove}>Remove from list</button>}
        </div>
      </div>

      <div className="pl-detail">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="pl-card pad">
            <dl className="pl-kv">
              <dt>Email</dt><dd style={{ wordBreak: 'break-all' }}>{student.email}</dd>
              <dt>Joined</dt><dd>{fmtDate(student.joinedAt)}</dd>
              <dt>Latest ATS</dt><dd><Score value={student.stats?.atsScore} /></dd>
              <dt>LinkedIn</dt><dd><Score value={student.stats?.linkedinScore} /></dd>
              <dt>Review</dt><dd>{student.stats && <ReviewBadge status={student.stats.reviewStatus} />}</dd>
            </dl>
          </div>

          <div className="pl-card">
            <div className="pl-section-label">Resumes ({resumes.length})</div>
            <div className="pl-list">
              {resumes.length === 0 && <p className="pl-muted pl-small" style={{ padding: '0 14px 12px' }}>No resumes built on CVMind yet.</p>}
              {resumes.map((w) => (
                <button key={w.id} type="button" className={workId === w.id ? 'active' : ''} onClick={() => setWorkId(w.id)}>
                  <span className="pl-list-title"><span><FileText size={14} /> {w.title}</span></span>
                  <span className="pl-muted pl-small">Edited {fmtDate(w.updatedAt)}{w.collegeFormat ? ' · College format' : ''}</span>
                  {w.review && <span><ReviewBadge status={w.review.state} /></span>}
                </button>
              ))}
            </div>
            {reports.length > 0 && <>
              <div className="pl-section-label">Reports ({reports.length})</div>
              <div className="pl-list">
                {reports.map((w) => (
                  <button key={w.id} type="button" className={workId === w.id ? 'active' : ''} onClick={() => setWorkId(w.id)}>
                    <span className="pl-list-title"><span>{w.type === 'linkedin' ? <Linkedin size={14} /> : <ScanSearch size={14} />} {w.type === 'linkedin' ? 'LinkedIn review' : 'ATS check'}</span></span>
                    <span className="pl-muted pl-small">{w.title} · {fmtDate(w.createdAt)}</span>
                  </button>
                ))}
              </div>
            </>}
          </div>

          <div className="pl-card pad">
            <h2>Score history</h2>
            {scans.length === 0 && linkedin.length === 0 ? <p className="pl-muted pl-small">No checks yet.</p> : (
              <table className="pl-table">
                <tbody>
                  {[...scans.map((s) => ({ at: s.createdAt, label: `ATS · ${s.fileName}`, score: s.score })), ...linkedin.map((l) => ({ at: l.createdAt, label: 'LinkedIn', score: l.score }))]
                    .sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 15)
                    .map((r, i) => <tr key={i}><td className="pl-small">{fmtDate(r.at)}</td><td className="pl-small">{r.label}</td><td className="num"><Score value={r.score} /></td></tr>)}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {workId ? <WorkView key={workId} studentId={id} workId={workId} studentName={student.name} onReview={(r) => updateReview(workId, r)} toast={toast} /> : (
          <div className="pl-card pl-empty">This student hasn't made any resumes or reports on CVMind yet.</div>
        )}
      </div>
    </>
  );
}

function WorkView({ studentId, workId, onReview, toast }: { studentId: string; workId: string; studentName: string; onReview: (r: Review) => void; toast: (m: string, t?: 'ok' | 'error') => void }) {
  const { college } = usePortal();
  const [work, setWork] = useState<LoadedWork | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ work: LoadedWork }>(`/students/${studentId}/works/${workId}`).then((r) => setWork(r.work), (err) => setError(errorText(err)));
  }, [studentId, workId]);

  // Student HTML runs in a sandboxed frame with no scripts, after the usual sanitising
  const srcDoc = useMemo(() => (work?.html ? `<!DOCTYPE html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS_HREF}"><style>body{margin:0;padding:16px;background:#fff;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#111}*{box-sizing:border-box}</style></head><body>${sanitizeResumeHtml(work.html)}</body></html>` : ''), [work]);

  if (error) return <div className="pl-notice red">{error}</div>;
  if (!work) return <div className="pl-card pl-center"><Spinner /> Loading…</div>;

  if (work.type !== 'resume') {
    return (
      <div className="pl-card pad pl-report">
        <h2>{work.type === 'linkedin' ? 'LinkedIn review' : 'ATS check'} · {work.title}</h2>
        {work.targetRole && <p className="pl-muted">Target role: {work.targetRole}</p>}
        {work.evaluation ? <Report value={work.evaluation} /> : <p className="pl-muted">This report has no saved details.</p>}
      </div>
    );
  }

  const pdf = async () => {
    setBusy(true);
    try {
      await download('/downloads/resume', { method: 'POST', body: { studentId, workId } }, 'resume.pdf');
    } catch (err) {
      toast(errorText(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
      <ReviewPanel studentId={studentId} workId={workId} review={work.review!} onReview={(r) => { setWork((w) => w && { ...w, review: r }); onReview(r); }} />
      <div className="pl-card">
        <div className="pl-preview-head">
          <div><b>{work.title}</b><div className="pl-muted pl-small">Last edited {fmtDateTime(work.updatedAt)}</div></div>
          <button type="button" className="pl-btn sm" onClick={pdf} disabled={busy}>{busy ? <Spinner size={13} /> : <Download size={14} />} PDF</button>
        </div>
        <iframe className="pl-preview" title={`${work.title} preview`} sandbox="" srcDoc={srcDoc} referrerPolicy="no-referrer" />
      </div>
      <p className="pl-muted pl-small">You are viewing this as {college.name}. Each view is recorded in your activity log.</p>
    </div>
  );
}

function ReviewPanel({ studentId, workId, review, onReview }: { studentId: string; workId: string; review: Review; onReview: (r: Review) => void }) {
  const { readOnly, toast } = usePortal();
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState('');
  const base = `/students/${studentId}/works/${workId}`;

  const send = async (label: string, path: string, body: Record<string, unknown>) => {
    setBusy(label);
    try {
      const r = await api<{ review: Review }>(path, { method: 'POST', body });
      onReview(r.review);
      setComment('');
      toast(label === 'approve' ? 'Resume approved. The student has been emailed.' : label === 'changes' ? 'Feedback sent to the student.' : 'Comment added.');
    } catch (err) {
      toast(errorText(err), 'error');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="pl-card pad pl-review">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Review</h2>
        <ReviewBadge status={review.state} />
      </div>
      {review.state === 'stale' && <div className="pl-notice blue">The student edited this resume after your last review. Check it again.</div>}
      {review.comments.length > 0 && (
        <div className="pl-comments">
          {review.comments.map((c, i) => <div key={i} className="pl-comment"><b>{c.byName}</b> <span className="pl-muted pl-small">{fmtDateTime(c.at)}</span><div>{c.text}</div></div>)}
        </div>
      )}
      {!readOnly && <>
        <textarea className="pl-textarea" placeholder="Feedback for the student (needed to request changes)" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} aria-label="Feedback" />
        <div className="pl-actions">
          <button type="button" className="pl-btn primary" disabled={!!busy} onClick={() => send('approve', `${base}/review`, { status: 'approved', comment })}>{busy === 'approve' ? <Spinner size={14} /> : <CheckCircle2 size={15} />} Approve</button>
          <button type="button" className="pl-btn" disabled={!!busy || !comment.trim()} onClick={() => send('changes', `${base}/review`, { status: 'changes_requested', comment })}>{busy === 'changes' && <Spinner size={14} />} Request changes</button>
          {review.status && <button type="button" className="pl-btn" disabled={!!busy || !comment.trim()} onClick={() => send('comment', `${base}/comments`, { text: comment })}><MessageSquare size={15} /> Comment only</button>}
        </div>
      </>}
    </div>
  );
}

const human = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/^./, (c) => c.toUpperCase());

// The saved AI report, shown generically: scores, text and lists
function Report({ value }: { value: Record<string, unknown> }) {
  const entries = Object.entries(value).filter(([, v]) => v !== null && v !== '' && !(Array.isArray(v) && !v.length));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
      {entries.map(([k, v]) => <ReportItem key={k} label={human(k)} value={v} />)}
    </div>
  );
}

function ReportItem({ label, value }: { label: string; value: unknown }) {
  if (typeof value === 'number') return <div><b>{label}:</b> <Score value={Math.round(value)} /></div>;
  if (typeof value === 'string' || typeof value === 'boolean') return <div><b>{label}</b><div className="pl-muted">{String(value)}</div></div>;
  if (Array.isArray(value)) {
    return (
      <div><b>{label}</b>
        <ul>{value.slice(0, 20).map((item, i) => <li key={i}>{typeof item === 'object' && item ? Object.values(item).filter((x) => typeof x === 'string' || typeof x === 'number').join(' — ') : String(item)}</li>)}</ul>
      </div>
    );
  }
  if (value && typeof value === 'object') {
    return (
      <div style={{ borderLeft: '3px solid var(--pl-border)', paddingLeft: 10 }}>
        <b>{label}</b>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
          {Object.entries(value as Record<string, unknown>).map(([k, v]) => <ReportItem key={k} label={human(k)} value={v} />)}
        </div>
      </div>
    );
  }
  return null;
}
