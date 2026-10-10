import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Minus, FileSearch } from 'lucide-react';
import { getScans, type ScanRow } from '../../lib/growthApi';
import './growth.css';

// ATS score history on My Documents: every check of a resume, its score over time, and what moved.

// The AI can score the same resume a few points apart on different runs (same as the server's SCORE_NOISE)
const NOISE = 3;

const SERIES = [
  { key: 'score', label: 'Overall', color: '#1f9e72', width: 3 },
  { key: 'keywordsScore', label: 'Keywords', color: '#7c3aed', width: 1.5 },
  { key: 'contentScore', label: 'Content', color: '#2563eb', width: 1.5 },
  { key: 'formattingScore', label: 'Formatting', color: '#d97706', width: 1.5 },
] as const;

const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const fullDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const prettyName = (s: ScanRow) => s.fileName.replace(/\.(pdf|docx?|txt)$/i, '');

function Trend({ delta, since }: { delta: number; since: string }) {
  if (Math.abs(delta) < NOISE) return <span className="sh-trend same"><Minus size={14} /> About the same as {since}</span>;
  return delta > 0
    ? <span className="sh-trend up"><TrendingUp size={14} /> Up {delta} since {since}</span>
    : <span className="sh-trend down"><TrendingDown size={14} /> Down {Math.abs(delta)} since {since}</span>;
}

interface ScoreHistoryProps {
  userKey: string;
  onOpenReport: (workId: string) => void;
  onCheckResume: () => void;
}

export default function ScoreHistory({ userKey, onOpenReport, onCheckResume }: ScoreHistoryProps) {
  const [scans, setScans] = useState<ScanRow[] | null>(null);
  const [picked, setPicked] = useState('');
  const [showParts, setShowParts] = useState(false);

  useEffect(() => {
    let alive = true;
    getScans().then(s => { if (alive) setScans(s); }).catch(() => { if (alive) setScans([]); });
    return () => { alive = false; };
  }, [userKey]);

  // One entry per resume, most recently checked first
  const resumes = useMemo(() => {
    const groups = new Map<string, ScanRow[]>();
    for (const s of scans || []) {
      const list = groups.get(s.resumeKey) || [];
      list.push(s);
      groups.set(s.resumeKey, list);
    }
    return [...groups.entries()].map(([key, list]) => ({ key, name: prettyName(list[0]), checks: [...list].reverse() }));
  }, [scans]);

  if (!scans || scans.length === 0) return null;

  const current = resumes.find(r => r.key === picked) || resumes[0];
  const checks = current.checks;
  const latest = checks[checks.length - 1];
  const previous = checks.length > 1 ? checks[checks.length - 2] : null;
  const first = checks[0];
  const data = checks.map(c => ({ ...c, date: shortDate(c.createdAt) }));

  return (
    <section className="md-section">
      <div className="md-section-head">
        <h2>Score history</h2>
        {resumes.length > 1 && (
          <select className="sh-picker" value={current.key} onChange={e => setPicked(e.target.value)} aria-label="Resume">
            {resumes.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
          </select>
        )}
      </div>

      <div className="md-panel sh-card">
        <div className="sh-summary">
          <div className="sh-latest">
            <span className="sh-score">{latest.score}</span>
            <span className="sh-score-label">Latest ATS score<br /><small>{current.name}</small></span>
          </div>
          <div className="sh-trends">
            {previous && <Trend delta={latest.score - previous.score} since="your last check" />}
            {checks.length > 2 && <Trend delta={latest.score - first.score} since={`your first check on ${shortDate(first.createdAt)}`} />}
            {!previous && <span className="sh-hint">Edit your resume and check it again to see your progress here.</span>}
          </div>
        </div>

        {checks.length > 1 && (
          <>
            <div className="sh-chart" aria-label={`ATS score over ${checks.length} checks`}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="#eef0f3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value, name) => [value ?? '–', SERIES.find(s => s.key === name)?.label || String(name)]} labelStyle={{ fontWeight: 600 }} />
                  {SERIES.filter(s => s.key === 'score' || showParts).map(s => (
                    <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={s.width} dot={{ r: s.key === 'score' ? 4 : 2 }} connectNulls isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="sh-legend">
              <label>
                <input type="checkbox" checked={showParts} onChange={e => setShowParts(e.target.checked)} /> Show keywords, content and formatting
              </label>
              {showParts && SERIES.map(s => (
                <span key={s.key} className="sh-key"><i style={{ background: s.color }} />{s.label}</span>
              ))}
            </div>
          </>
        )}

        <div className="sh-table-wrap">
          <table className="sh-table">
            <thead>
              <tr><th>Checked</th><th>Overall</th><th>Keywords</th><th>Content</th><th>Formatting</th><th aria-label="Report" /></tr>
            </thead>
            <tbody>
              {[...checks].reverse().map(c => (
                <tr key={c.id}>
                  <td>{fullDate(c.createdAt)}</td>
                  <td><strong>{c.score}</strong></td>
                  <td>{c.keywordsScore ?? '–'}</td>
                  <td>{c.contentScore ?? '–'}</td>
                  <td>{c.formattingScore ?? '–'}</td>
                  <td>
                    {c.workId && (
                      <button type="button" className="md-link" onClick={() => onOpenReport(c.workId)}>
                        <FileSearch size={14} /> Report
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="button" className="md-btn md-btn--outline sh-again" onClick={onCheckResume}>Check a resume again</button>
      </div>
    </section>
  );
}
