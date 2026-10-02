import { useMemo, useState } from 'react';
import { CalendarCheck, Check, ChevronLeft, ChevronRight, Circle, Dices, Flame, Search, Sparkles, Timer, X } from 'lucide-react';
import { COMPANIES, TOPICS, type CodingProblem } from '../../data/codingProblems';
import { LEVEL_RANK, LEVELS, levelOf } from '../../data/codingLevels';
import { computeStreak, dailyProblem, dayKey, statusOf, summarize, useProgress } from './codeStore';
import './code-problemset.css';

interface ProblemSetProps {
  problems: CodingProblem[];
  onOpen: (problem: CodingProblem) => void;
  onOpenAi: () => void;
  onOpenPractice: () => void;
}

type SortKey = 'level' | 'level-desc' | 'number' | 'title';
const PAGE_SIZE = 25;

function Ring({ solved, total }: { solved: number; total: number }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const pct = total ? solved / total : 0;
  return (
    <svg viewBox="0 0 110 110" className="cx-ring" role="img" aria-label={`${solved} of ${total} solved`}>
      <circle cx="55" cy="55" r={r} className="cx-ring-track" />
      <circle cx="55" cy="55" r={r} className="cx-ring-fill" strokeLinecap={pct > 0 ? 'round' : 'butt'} strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 55 55)" />
      <text x="55" y="53" textAnchor="middle" className="cx-ring-num">{solved}</text>
      <text x="55" y="70" textAnchor="middle" className="cx-ring-sub">/ {total} solved</text>
    </svg>
  );
}

export default function ProblemSet({ problems, onOpen, onOpenAi, onOpenPractice }: ProblemSetProps) {
  const progress = useProgress();
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('All');
  const [level, setLevel] = useState('All');
  const [status, setStatus] = useState('All');
  const [company, setCompany] = useState('All');
  const [sort, setSort] = useState<SortKey>('level');
  const [page, setPage] = useState(1);

  const numbered = useMemo(() => problems.map((p, i) => ({ p, n: i + 1, level: levelOf(p) })), [problems]);
  const summary = useMemo(() => summarize(problems, progress), [problems, progress]);
  const streak = useMemo(() => computeStreak(progress.activity), [progress.activity]);
  const daily = useMemo(() => dailyProblem(problems), [problems]);
  const last = progress.lastProblemId ? problems.find((p) => p.id === progress.lastProblemId) : undefined;

  const topicCounts = useMemo(() => {
    const m = new Map<string, number>();
    problems.forEach((p) => m.set(p.category, (m.get(p.category) || 0) + 1));
    return m;
  }, [problems]);

  const byLevel = useMemo(() => LEVELS.map((name) => {
    const inLevel = numbered.filter((x) => x.level === name);
    return { name, total: inLevel.length, solved: inLevel.filter((x) => statusOf(progress, x.p.id) === 'solved').length };
  }), [numbered, progress]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = numbered.filter(({ p, level: l }) => {
      if (topic !== 'All' && p.category !== topic) return false;
      if (level !== 'All' && l !== level) return false;
      if (company !== 'All' && !p.companies.includes(company)) return false;
      if (status !== 'All') {
        const s = statusOf(progress, p.id);
        if (status === 'Solved' && s !== 'solved') return false;
        if (status === 'Attempted' && s !== 'attempted') return false;
        if (status === 'Todo' && s !== 'todo') return false;
      }
      if (q && !`${p.title} ${p.category} ${p.companies.join(' ')}`.toLowerCase().includes(q)) return false;
      return true;
    });
    if (sort === 'level') list = [...list].sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || a.n - b.n);
    if (sort === 'level-desc') list = [...list].sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || a.n - b.n);
    if (sort === 'title') list = [...list].sort((a, b) => a.p.title.localeCompare(b.p.title));
    return list;
  }, [numbered, query, topic, level, company, status, sort, progress]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const hasFilters = query || topic !== 'All' || level !== 'All' || status !== 'All' || company !== 'All' || sort !== 'level';

  const resetFilters = () => { setQuery(''); setTopic('All'); setLevel('All'); setStatus('All'); setCompany('All'); setSort('level'); setPage(1); };
  const update = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1); };

  const pickRandom = () => {
    const pool = filtered.filter(({ p }) => statusOf(progress, p.id) !== 'solved');
    const source = pool.length ? pool : filtered;
    if (source.length) onOpen(source[Math.floor(Math.random() * source.length)].p);
  };

  // last 7 local days for the streak card
  const [loadedAt] = useState(() => Date.now());
  const week = useMemo(() => {
    const out: { key: string; label: string; active: boolean }[] = [];
    const now = loadedAt;
    for (let i = 6; i >= 0; i--) {
      const d = now - i * 86400000;
      const key = dayKey(d);
      out.push({ key, label: new Date(d).toLocaleDateString(undefined, { weekday: 'narrow' }), active: (progress.activity[key] || 0) > 0 });
    }
    return out;
  }, [progress.activity, loadedAt]);

  return (
    <div className="cx-page cx-ps">
      <div className="cx-ps-main">
        <div className="cx-topics" role="tablist" aria-label="Topics">
          {TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={topic === t}
              className={`cx-topic${topic === t ? ' is-active' : ''}`}
              onClick={() => update(setTopic)(t)}
            >
              {t}
              <span>{t === 'All' ? problems.length : topicCounts.get(t) || 0}</span>
            </button>
          ))}
        </div>

        <div className="cx-ps-toolbar">
          <label className="cx-search">
            <Search size={15} aria-hidden="true" />
            <input value={query} onChange={(e) => update(setQuery)(e.target.value)} placeholder="Search problems" aria-label="Search problems" />
            {query && <button type="button" className="cx-search-clear" onClick={() => update(setQuery)('')} aria-label="Clear search"><X size={14} /></button>}
          </label>
          <select className="cx-select" value={level} onChange={(e) => update(setLevel)(e.target.value)} aria-label="Level">
            <option value="All">Level</option>
            {LEVELS.map((l) => <option key={l}>{l}</option>)}
          </select>
          <select className="cx-select" value={status} onChange={(e) => update(setStatus)(e.target.value)} aria-label="Status">
            <option value="All">Status</option>
            <option value="Todo">Todo</option><option value="Attempted">Attempted</option><option value="Solved">Solved</option>
          </select>
          <select className="cx-select" value={company} onChange={(e) => update(setCompany)(e.target.value)} aria-label="Company">
            <option value="All">Company</option>
            {COMPANIES.filter((c) => c !== 'All').map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className="cx-select" value={sort} onChange={(e) => update(setSort)(e.target.value as SortKey)} aria-label="Sort">
            <option value="level">Sort: Beginner first</option>
            <option value="level-desc">Advanced first</option>
            <option value="number">Problem number</option>
            <option value="title">Title A to Z</option>
          </select>
          <button type="button" className="cx-btn cx-btn--sm" onClick={pickRandom} title="Open a random unsolved problem from this list">
            <Dices size={15} /> Pick one
          </button>
          {hasFilters && <button type="button" className="cx-btn cx-btn--sm cx-btn--ghost" onClick={resetFilters}>Reset</button>}
        </div>

        <div className="cx-card cx-table-wrap">
          {visible.length === 0 ? (
            <div className="cx-empty">
              <h3>No problems match</h3>
              <p>Try a different search or clear the filters.</p>
              <button type="button" className="cx-btn cx-btn--sm" onClick={resetFilters}>Clear filters</button>
            </div>
          ) : (
            <table className="cx-table">
              <thead>
                <tr>
                  <th className="cx-col-status">Status</th>
                  <th>Title</th>
                  <th className="cx-col-topic">Topic</th>
                  <th className="cx-col-company">Companies</th>
                  <th className="cx-col-diff">Level</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(({ p, n, level: l }) => {
                  const s = statusOf(progress, p.id);
                  return (
                    <tr key={p.id} onClick={() => onOpen(p)}>
                      <td className="cx-col-status">
                        {s === 'solved' && <span className="cx-st cx-st--solved" title="Solved"><Check size={14} /></span>}
                        {s === 'attempted' && <span className="cx-st cx-st--attempted" title="Attempted"><Circle size={12} /></span>}
                        {s === 'todo' && <span className="cx-st" aria-label="Not started" />}
                      </td>
                      <td>
                        <button type="button" className="cx-row-title" onClick={(e) => { e.stopPropagation(); onOpen(p); }}>
                          <span className="cx-row-num">{n}.</span> {p.title}
                          {p.isAiGenerated && <span className="cx-tag cx-tag--ai"><Sparkles size={11} /> AI</span>}
                        </button>
                      </td>
                      <td className="cx-col-topic"><span className="cx-tag">{p.category}</span></td>
                      <td className="cx-col-company">
                        <span className="cx-company-text">{p.companies.slice(0, 2).join(', ')}{p.companies.length > 2 ? ` +${p.companies.length - 2}` : ''}</span>
                      </td>
                      <td className="cx-col-diff"><span className={`cx-diff cx-diff--${l.toLowerCase()}`} title={p.difficulty}>{l}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {filtered.length > PAGE_SIZE && (
          <nav className="cx-pager" aria-label="Pagination">
            <button type="button" className="cx-icon-btn" disabled={current === 1} onClick={() => setPage(current - 1)} aria-label="Previous page"><ChevronLeft size={18} /></button>
            <span>Page {current} of {pages}</span>
            <button type="button" className="cx-icon-btn" disabled={current === pages} onClick={() => setPage(current + 1)} aria-label="Next page"><ChevronRight size={18} /></button>
            <span className="cx-pager-count">{filtered.length} problems</span>
          </nav>
        )}
      </div>

      <aside className="cx-ps-side">
        <section className="cx-card cx-side-card">
          <h3>Your progress</h3>
          <div className="cx-progress">
            <Ring solved={summary.solved} total={summary.total} />
            <div className="cx-bars">
              {byLevel.map((v) => (
                <div key={v.name} className="cx-bar-row">
                  <span className={`cx-diff cx-diff--${v.name.toLowerCase()}`}>{v.name}</span>
                  <span className="cx-bar-count">{v.solved}<small>/{v.total}</small></span>
                  <div className="cx-bar"><i className={`cx-bar-fill cx-bar-fill--${v.name.toLowerCase()}`} style={{ width: `${v.total ? (v.solved / v.total) * 100 : 0}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          {summary.solved === 0 && <p className="cx-note">Solve your first problem and your progress shows up here. It is saved to your account when you are signed in.</p>}
        </section>

        <section className="cx-card cx-side-card">
          <h3><Flame size={16} className="cx-flame" /> Streak</h3>
          <div className="cx-streak">
            <div><b>{streak.current}</b><small>day streak</small></div>
            <div><b>{streak.longest}</b><small>longest</small></div>
            <div><b>{streak.activeDays}</b><small>active days</small></div>
          </div>
          <div className="cx-week" aria-label="Last 7 days">
            {week.map((d) => <span key={d.key} className={d.active ? 'is-on' : ''} title={d.key}>{d.label}</span>)}
          </div>
        </section>

        {daily && (
          <section className="cx-card cx-side-card">
            <h3><CalendarCheck size={16} /> Daily challenge</h3>
            <button type="button" className="cx-side-problem" onClick={() => onOpen(daily)}>
              <b>{daily.title}</b>
              <span className={`cx-pill cx-pill--${levelOf(daily).toLowerCase()}`}>{levelOf(daily)}</span>
              <small>{daily.category}</small>
            </button>
            {statusOf(progress, daily.id) === 'solved' && <p className="cx-note cx-note--ok">Done for today.</p>}
          </section>
        )}

        {last && (
          <section className="cx-card cx-side-card">
            <h3>Continue</h3>
            <button type="button" className="cx-side-problem" onClick={() => onOpen(last)}>
              <b>{last.title}</b>
              <span className={`cx-pill cx-pill--${levelOf(last).toLowerCase()}`}>{levelOf(last)}</span>
              <small>Pick up where you left off</small>
            </button>
          </section>
        )}

        <section className="cx-card cx-side-card cx-side-cta">
          <button type="button" className="cx-btn" onClick={onOpenPractice}><Timer size={15} /> Timed practice</button>
          <button type="button" className="cx-btn" onClick={onOpenAi}><Sparkles size={15} /> Generate a problem</button>
        </section>
      </aside>
    </div>
  );
}
