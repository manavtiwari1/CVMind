import { useEffect, useState } from 'react';
import { CheckSquare, Copy, RefreshCw, Sparkles, X } from 'lucide-react';
import { api } from '../api';
import type { Priority } from '../api';
import { useTeam } from '../store';
import { Modal, Spinner } from '../ui';

// Leo in CVMind Team. Leo reads only what the person asking can see, and sends that text to DeepSeek.
export const LEO_NOTE = 'Leo reads these messages to summarise them. The text is sent to DeepSeek, our AI provider.';

export interface LeoSummary {
  summary: string;
  decisions: string[];
  actionItems: Array<{ text: string; owner: string }>;
  openQuestions: string[];
  messageCount?: number;
}

export interface TaskDraft { title: string; description: string; priority: Priority; dueAt: string | null; assigneeIds: string[] }

export function summaryText(s: LeoSummary) {
  return [
    s.summary,
    s.decisions.length ? `\nDecisions:\n${s.decisions.map((d) => `- ${d}`).join('\n')}` : '',
    s.actionItems.length ? `\nAction items:\n${s.actionItems.map((a) => `- ${a.text}${a.owner ? ` (@${a.owner})` : ''}`).join('\n')}` : '',
    s.openQuestions.length ? `\nOpen questions:\n${s.openQuestions.map((q) => `- ${q}`).join('\n')}` : ''
  ].join('\n').trim();
}

// The summary, decisions, action items and questions. Action items can become tasks.
export function SummaryView({ summary, onTask }: { summary: LeoSummary; onTask?: (draft: TaskDraft) => void }) {
  const { people, toast } = useTeam();
  const idOf = (username: string) => [...people.values()].find((p) => p.username === username)?.id;
  return (
    <div className="tm-leo-result">
      <p>{summary.summary}</p>
      {summary.decisions.length > 0 && <><h3>Decisions</h3><ul>{summary.decisions.map((d, i) => <li key={i}>{d}</li>)}</ul></>}
      {summary.actionItems.length > 0 && (
        <>
          <h3>Action items</h3>
          <ul className="tm-leo-actions">
            {summary.actionItems.map((a, i) => (
              <li key={i}>
                <span>{a.text}{a.owner && <span className="tm-muted"> · @{a.owner}</span>}</span>
                {onTask && <button type="button" className="tm-btn sm ghost" onClick={() => { const id = idOf(a.owner); onTask({ title: a.text.slice(0, 200), description: '', priority: 'normal', dueAt: null, assigneeIds: id ? [id] : [] }); }}><CheckSquare size={13} /> Task</button>}
              </li>
            ))}
          </ul>
        </>
      )}
      {summary.openQuestions.length > 0 && <><h3>Open questions</h3><ul>{summary.openQuestions.map((q, i) => <li key={i}>{q}</li>)}</ul></>}
      <button type="button" className="tm-btn sm" onClick={() => navigator.clipboard.writeText(summaryText(summary)).then(() => toast('Copied'), () => toast('Could not copy.', 'error'))}><Copy size={13} /> Copy</button>
    </div>
  );
}

export function LeoSummaryPanel({ channelId, threadId, onClose, onTask }: { channelId: string; threadId?: string; onClose?: () => void; onTask?: (draft: TaskDraft) => void }) {
  const { toast } = useTeam();
  const [summary, setSummary] = useState<LeoSummary | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api<{ data: LeoSummary; remaining: number }>('/leo/summary', { method: 'POST', body: { channelId, threadId } });
      setSummary(res.data);
      setRemaining(res.remaining);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Leo could not summarise this.');
    } finally {
      setBusy(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, [channelId, threadId]);

  const body = (
    <div className="tm-leo">
      {busy && <div className="tm-center"><Spinner /> <span>Leo is reading {threadId ? 'the thread' : 'the latest messages'}…</span></div>}
      {!busy && error && <p className="tm-notice amber">{error}</p>}
      {!busy && summary && <SummaryView summary={summary} onTask={onTask} />}
      <p className="tm-hint">{LEO_NOTE}{remaining !== null ? ` ${remaining} Leo uses left today.` : ''}</p>
      {!busy && <button type="button" className="tm-btn sm ghost" onClick={() => { run().catch(() => toast('Could not refresh.', 'error')); }}><RefreshCw size={13} /> Summarise again</button>}
    </div>
  );
  if (!onClose) return body;
  return (
    <aside className="tm-panel" aria-label="Leo summary">
      <header className="tm-panel-head">
        <h2><Sparkles size={16} /> Leo summary</h2>
        <button type="button" className="tm-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
      </header>
      <div className="tm-panel-body">{body}</div>
    </aside>
  );
}

export async function draftTask(messageId: string) {
  const res = await api<{ data: TaskDraft; remaining: number }>('/leo/task-draft', { method: 'POST', body: { messageId } });
  return res.data;
}

// ── Progress report ──────────────────────────────────────────────────────────
interface Report {
  from: string;
  to: string;
  headline: string;
  highlights: string[];
  concerns: string[];
  suggestions: string[];
  stats: Record<string, number>;
}

export function ProgressReport({ adminId, onClose }: { adminId: string; onClose: () => void }) {
  const { nameOf } = useTeam();
  const [days, setDays] = useState(7);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError('');
    api<{ data: Report }>('/leo/report', { query: { adminId, from: new Date(Date.now() - days * 86400000).toISOString() } })
      .then((r) => { if (!cancelled) setReport(r.data); })
      .catch((err: Error) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [adminId, days]);

  const s = report?.stats;
  return (
    <Modal title={<><Sparkles size={16} /> Progress report: {nameOf(adminId)}</>} onClose={onClose} wide>
      <div className="tm-form">
        <div className="tm-segment tm-layouts" role="radiogroup" aria-label="Period">
          {[7, 14, 30].map((d) => <button key={d} type="button" role="radio" aria-checked={days === d} className={days === d ? 'active' : ''} onClick={() => setDays(d)}>Last {d} days</button>)}
        </div>
        {busy && <div className="tm-center"><Spinner /> <span>Leo is writing the report…</span></div>}
        {!busy && error && <p className="tm-notice amber">{error}</p>}
        {!busy && report && s && (
          <div className="tm-leo-result">
            <div className="tm-report-stats">
              <span><strong>{s.completed}</strong> tasks done</span>
              <span><strong>{s.completedOnTime}</strong> on time</span>
              <span className={s.overdue ? 'tm-red' : ''}><strong>{s.overdue}</strong> overdue now</span>
              <span><strong>{s.approved}</strong> approved / <strong>{s.changesRequested}</strong> changes asked</span>
              <span><strong>{s.checkIns}</strong> of {s.workingDays} check-ins</span>
              {s.leaveDays > 0 && <span><strong>{s.leaveDays}</strong> leave days</span>}
            </div>
            <p><strong>{report.headline}</strong></p>
            {report.highlights.length > 0 && <><h3>Went well</h3><ul>{report.highlights.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
            {report.concerns.length > 0 && <><h3>Watch</h3><ul>{report.concerns.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
            {report.suggestions.length > 0 && <><h3>Suggestions</h3><ul>{report.suggestions.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
            <p className="tm-hint">Written by Leo from tasks, reviews and check-ins between {report.from} and {report.to}. Check the numbers before acting on it.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
