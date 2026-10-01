import { useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Circle } from 'lucide-react';
import { TOPICS, type CodingProblem } from '../../data/codingProblems';
import { statusOf, useProgress } from './codeStore';
import './code-pages.css';

interface RoadmapPageProps {
  problems: CodingProblem[];
  onOpen: (problem: CodingProblem) => void;
}

const DESCRIPTIONS: Record<string, string> = {
  'Arrays & Hashing': 'Frequency counts, lookups and prefix sums. The foundation for most other patterns.',
  'Two Pointers': 'Walk an array from both ends or at different speeds to avoid nested loops.',
  'Sliding Window': 'Maintain a moving range over an array or string to optimise subarray questions.',
  Stack: 'Last-in-first-out thinking: matching brackets, monotonic stacks and expression parsing.',
  'Binary Search': 'Halve the search space on sorted data, or on the answer itself.',
  'Linked List': 'Pointer manipulation: reversing, merging, cycle detection and fast/slow pointers.',
  'Trees & Graphs': 'Traversals, recursion on trees, BFS and DFS on graphs and grids.',
  'Dynamic Programming': 'Break problems into overlapping subproblems and remember the results.',
  'Backtracking & Heaps': 'Explore choices and undo them, and keep the best k items with a heap.',
  'Math & Bit Manipulation': 'Number properties, modular arithmetic and bitwise tricks.',
};

const RANK = { Easy: 0, Medium: 1, Hard: 2 } as const;

export default function RoadmapPage({ problems, onOpen }: RoadmapPageProps) {
  const progress = useProgress();
  const [openTrack, setOpenTrack] = useState<string | null>(null);

  const tracks = useMemo(() => {
    const order = TOPICS.filter((t) => t !== 'All');
    const extra = [...new Set(problems.map((p) => p.category))].filter((c) => !order.includes(c));
    return [...order, ...extra]
      .map((topic) => {
        const list = problems.filter((p) => p.category === topic).sort((a, b) => RANK[a.difficulty] - RANK[b.difficulty]);
        const solved = list.filter((p) => progress.solved[p.id]).length;
        return { topic, list, solved, next: list.find((p) => !progress.solved[p.id]) };
      })
      .filter((t) => t.list.length > 0);
  }, [problems, progress.solved]);

  const recommended = tracks.find((t) => t.next)?.next;
  const recommendedTrack = tracks.find((t) => t.next);

  return (
    <div className="cx-page">
      <div className="cx-page-head">
        <div>
          <h1>Roadmap</h1>
          <p>Work through the topics in order. Each track lists its problems from easiest to hardest and remembers what you have solved.</p>
        </div>
      </div>

      {recommended && recommendedTrack && (
        <section className="cx-card cx-recommend">
          <div>
            <small>Recommended next</small>
            <h2>{recommended.title}</h2>
            <p>{recommendedTrack.topic} · <span className={`cx-diff cx-diff--${recommended.difficulty.toLowerCase()}`}>{recommended.difficulty}</span></p>
          </div>
          <button type="button" className="cx-btn cx-btn--primary" onClick={() => onOpen(recommended)}>
            {progress.attempted[recommended.id] ? 'Continue' : 'Start'} <ArrowRight size={15} />
          </button>
        </section>
      )}

      <div className="cx-tracks">
        {tracks.map((t, i) => {
          const pct = Math.round((t.solved / t.list.length) * 100);
          const open = openTrack === t.topic;
          return (
            <section key={t.topic} className="cx-card cx-track">
              <div className="cx-track-head">
                <span className="cx-track-num">{i + 1}</span>
                <div>
                  <h2>{t.topic}</h2>
                  <p>{DESCRIPTIONS[t.topic] || 'Practice problems for this topic.'}</p>
                </div>
                <b className="cx-track-pct">{pct}%</b>
              </div>
              <div className="cx-bar"><i className="cx-bar-fill cx-bar-fill--accent" style={{ width: `${pct}%` }} /></div>
              <div className="cx-track-foot">
                <span>{t.solved} of {t.list.length} solved</span>
                <div className="cx-track-actions">
                  {t.next && <button type="button" className="cx-btn cx-btn--sm" onClick={() => onOpen(t.next as CodingProblem)}>{t.solved ? 'Continue' : 'Start'}</button>}
                  <button type="button" className="cx-btn cx-btn--sm cx-btn--ghost" onClick={() => setOpenTrack(open ? null : t.topic)} aria-expanded={open}>
                    Problems <ChevronDown size={14} className={open ? 'is-flipped' : ''} />
                  </button>
                </div>
              </div>
              {open && (
                <ul className="cx-track-list">
                  {t.list.map((p) => {
                    const s = statusOf(progress, p.id);
                    return (
                      <li key={p.id}>
                        <button type="button" onClick={() => onOpen(p)}>
                          <span className={`cx-st${s === 'solved' ? ' cx-st--solved' : s === 'attempted' ? ' cx-st--attempted' : ''}`}>
                            {s === 'solved' ? <Check size={13} /> : s === 'attempted' ? <Circle size={10} /> : null}
                          </span>
                          <span className="cx-track-title">{p.title}</span>
                          <span className={`cx-diff cx-diff--${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
