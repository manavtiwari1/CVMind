import { useMemo, useState } from 'react';
import { Award, Flame, Lock, Trash2 } from 'lucide-react';
import { TOPICS, type CodingProblem } from '../../data/codingProblems';
import { computeStreak, dayKey, resetProgress, summarize, timeAgo, useProgress } from './codeStore';
import './code-pages.css';

interface ProfilePageProps {
  problems: CodingProblem[];
  onOpen: (problem: CodingProblem) => void;
}

const WEEKS = 26;

function readUser(): { name: string; email: string } | null {
  try {
    const u = JSON.parse(localStorage.getItem('cvmind_user') || 'null');
    return u && (u.name || u.email) ? { name: u.name || u.email, email: u.email || '' } : null;
  } catch {
    return null;
  }
}

function level(count: number) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

export default function ProfilePage({ problems, onOpen }: ProfilePageProps) {
  const progress = useProgress();
  const [confirming, setConfirming] = useState(false);
  const [user] = useState(readUser);

  const summary = useMemo(() => summarize(problems, progress), [problems, progress]);
  const streak = useMemo(() => computeStreak(progress.activity), [progress.activity]);

  const accepted = progress.submissions.filter((s) => s.verdict === 'Accepted').length;
  const totalSubs = progress.submissions.length;

  // heatmap: columns are weeks (Sunday first), ending with the current week
  const heat = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - today.getDay() - (WEEKS - 1) * 7);
    const cols: { key: string; count: number; future: boolean }[][] = [];
    const cursor = new Date(start);
    for (let w = 0; w < WEEKS; w++) {
      const col: { key: string; count: number; future: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const key = dayKey(cursor.getTime());
        col.push({ key, count: progress.activity[key] || 0, future: cursor > today });
        cursor.setDate(cursor.getDate() + 1);
      }
      cols.push(col);
    }
    return cols;
  }, [progress.activity]);

  const topicsSolved = summary.byTopic.filter((t) => t.solved > 0).length;
  const badges = [
    { id: 'first', title: 'First solve', hint: 'Solve any problem', done: summary.solved >= 1, now: Math.min(summary.solved, 1), goal: 1 },
    { id: 'ten', title: 'Ten solved', hint: 'Solve 10 problems', done: summary.solved >= 10, now: Math.min(summary.solved, 10), goal: 10 },
    { id: 'fifty', title: 'Fifty solved', hint: 'Solve 50 problems', done: summary.solved >= 50, now: Math.min(summary.solved, 50), goal: 50 },
    { id: 'hard', title: 'Hard mode', hint: 'Solve a Hard problem', done: summary.byDifficulty.Hard.solved >= 1, now: Math.min(summary.byDifficulty.Hard.solved, 1), goal: 1 },
    { id: 'week', title: 'Seven-day streak', hint: 'Submit 7 days in a row', done: streak.longest >= 7, now: Math.min(streak.longest, 7), goal: 7 },
    { id: 'range', title: 'All-rounder', hint: 'Solve in 5 different topics', done: topicsSolved >= 5, now: Math.min(topicsSolved, 5), goal: 5 },
  ];

  const topicOrder = TOPICS.filter((t) => t !== 'All');
  const topics = [...summary.byTopic].sort((a, b) => topicOrder.indexOf(a.topic) - topicOrder.indexOf(b.topic));
  const recent = progress.submissions.slice(0, 10);
  const byId = useMemo(() => new Map(problems.map((p) => [p.id, p])), [problems]);

  return (
    <div className="cx-page">
      <div className="cx-profile-head cx-card">
        <div className="cx-avatar" aria-hidden="true">{(user?.name || 'Y').charAt(0).toUpperCase()}</div>
        <div className="cx-profile-id">
          <h1>{user?.name || 'Your profile'}</h1>
          <p>{user?.email || 'Not signed in'} · {user ? 'Progress is saved to your account.' : 'Sign in to save your progress to your account.'}</p>
        </div>
        <div className="cx-profile-actions">
          {confirming ? (
            <>
              <span className="cx-muted-inline">Erase all progress?</span>
              <button type="button" className="cx-btn cx-btn--sm cx-btn--danger" onClick={() => { resetProgress(); setConfirming(false); }}>Yes, erase</button>
              <button type="button" className="cx-btn cx-btn--sm" onClick={() => setConfirming(false)}>Cancel</button>
            </>
          ) : (
            <button type="button" className="cx-btn cx-btn--sm cx-btn--ghost" onClick={() => setConfirming(true)}><Trash2 size={14} /> Reset progress</button>
          )}
        </div>
      </div>

      <div className="cx-stat-grid">
        <div className="cx-card cx-stat"><small>Solved</small><b>{summary.solved}<span>/{summary.total}</span></b></div>
        <div className="cx-card cx-stat"><small>Submissions</small><b>{totalSubs}</b></div>
        <div className="cx-card cx-stat"><small>Accepted</small><b>{totalSubs ? `${Math.round((accepted / totalSubs) * 100)}%` : '0%'}<span> of submissions</span></b></div>
        <div className="cx-card cx-stat"><small>Current streak</small><b><Flame size={18} className="cx-flame" /> {streak.current}<span> days</span></b></div>
        <div className="cx-card cx-stat"><small>Longest streak</small><b>{streak.longest}<span> days</span></b></div>
        <div className="cx-card cx-stat"><small>Active days</small><b>{streak.activeDays}</b></div>
      </div>

      <div className="cx-two-col">
        <section className="cx-card cx-panel">
          <h2>Activity</h2>
          <p className="cx-panel-sub">Submissions per day over the last {WEEKS} weeks</p>
          <div className="cx-heat" role="img" aria-label="Submission activity heatmap">
            {heat.map((col, i) => (
              <div key={i} className="cx-heat-col">
                {col.map((c) => (
                  <i key={c.key} className={`cx-heat-cell lv${c.future ? 'x' : level(c.count)}`} title={c.future ? '' : `${c.key}: ${c.count} submission${c.count === 1 ? '' : 's'}`} />
                ))}
              </div>
            ))}
          </div>
          <div className="cx-heat-legend">Less <i className="cx-heat-cell lv0" /><i className="cx-heat-cell lv1" /><i className="cx-heat-cell lv2" /><i className="cx-heat-cell lv3" /><i className="cx-heat-cell lv4" /> More</div>
        </section>

        <section className="cx-card cx-panel">
          <h2>By difficulty</h2>
          <div className="cx-diff-rows">
            {(['Easy', 'Medium', 'Hard'] as const).map((d) => {
              const v = summary.byDifficulty[d];
              return (
                <div key={d} className="cx-diff-row">
                  <span className={`cx-diff cx-diff--${d.toLowerCase()}`}>{d}</span>
                  <div className="cx-bar"><i className={`cx-bar-fill cx-bar-fill--${d.toLowerCase()}`} style={{ width: `${v.total ? (v.solved / v.total) * 100 : 0}%` }} /></div>
                  <b>{v.solved}<small>/{v.total}</small></b>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="cx-two-col">
        <section className="cx-card cx-panel">
          <h2>Topics</h2>
          <div className="cx-diff-rows">
            {topics.map((t) => (
              <div key={t.topic} className="cx-diff-row cx-diff-row--topic">
                <span>{t.topic}</span>
                <div className="cx-bar"><i className="cx-bar-fill cx-bar-fill--accent" style={{ width: `${t.total ? (t.solved / t.total) * 100 : 0}%` }} /></div>
                <b>{t.solved}<small>/{t.total}</small></b>
              </div>
            ))}
          </div>
        </section>

        <section className="cx-card cx-panel">
          <h2>Badges</h2>
          <p className="cx-panel-sub">Earned from your real progress</p>
          <ul className="cx-badges">
            {badges.map((b) => (
              <li key={b.id} className={b.done ? 'is-earned' : ''}>
                <span className="cx-badge-icon">{b.done ? <Award size={18} /> : <Lock size={15} />}</span>
                <div>
                  <b>{b.title}</b>
                  <small>{b.done ? 'Earned' : `${b.hint} (${b.now}/${b.goal})`}</small>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="cx-card cx-panel">
        <h2>Recent submissions</h2>
        {recent.length === 0 ? (
          <div className="cx-empty"><h3>No submissions yet</h3><p>Open a problem, write a solution and press Submit.</p></div>
        ) : (
          <ul className="cx-recent">
            {recent.map((s) => {
              const p = byId.get(s.problemId);
              return (
                <li key={s.id}>
                  <button type="button" onClick={() => p && onOpen(p)} disabled={!p}>
                    <span className={`cx-sub-verdict ${s.verdict.startsWith('Accepted') ? 'is-ok' : 'is-bad'}`}>{s.verdict}</span>
                    <span className="cx-recent-title">{s.problemTitle}</span>
                    <span className="cx-sub-meta">{s.language}</span>
                    <span className="cx-sub-time">{timeAgo(s.at)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
