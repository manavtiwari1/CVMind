import { Compass, ArrowRight, Zap } from 'lucide-react';
import { CODING_PROBLEMS, type CodingProblem } from '../../data/codingProblems';

interface RoadmapProps {
  solvedProblemIds: string[];
  onSelectProblem: (problem: CodingProblem) => void;
}

interface RoadmapTrack {
  name: string;
  category: string;
  totalProblems: number;
  solvedProblems: number;
  description: string;
}

export default function Roadmap({ solvedProblemIds, onSelectProblem }: RoadmapProps) {
  const tracks: RoadmapTrack[] = [
    {
      name: 'Arrays & Hashing',
      category: 'Arrays & Hashing',
      totalProblems: 24,
      solvedProblems: 18,
      description: 'Hash maps, frequency counters, and prefix sums for O(1) lookups.'
    },
    {
      name: 'Two Pointers & Sliding Window',
      category: 'Strings & Sliding Window',
      totalProblems: 18,
      solvedProblems: 12,
      description: 'Dynamic intervals, palindrome inspection, and subarray optimization.'
    },
    {
      name: 'Stacks & Queues',
      category: 'Stack',
      totalProblems: 14,
      solvedProblems: 10,
      description: 'Monotonic stacks, parentheses validation, and DFS/BFS foundations.'
    },
    {
      name: 'Binary Search',
      category: 'Binary Search',
      totalProblems: 16,
      solvedProblems: 9,
      description: 'Logarithmic search over sorted collections and answer spaces.'
    },
    {
      name: 'Linked Lists',
      category: 'Linked List',
      totalProblems: 15,
      solvedProblems: 8,
      description: 'Pointer manipulation, cycle detection, and reversal patterns.'
    },
    {
      name: 'Dynamic Programming',
      category: 'Dynamic Programming',
      totalProblems: 28,
      solvedProblems: 7,
      description: 'Overlapping subproblems, state transitions, and knapsack variations.'
    }
  ];

  const nextChallenge = CODING_PROBLEMS.find(p => !solvedProblemIds.includes(p.id)) || CODING_PROBLEMS[0];

  return (
    <div className="roadmap-container">
      {/* Header Banner */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(41, 151, 255, 0.08)', color: '#2563eb', padding: '5px 14px', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 700, marginBottom: '10px', border: '1px solid rgba(41, 151, 255, 0.2)' }}>
          <Compass size={14} color="#7c3aed" />
          PERSONALIZED DSA LEARNING PATH
        </div>
        <h2 style={{ fontSize: '1.9rem', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>
          Your Technical Career Roadmap
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.96rem', margin: 0, maxWidth: '640px' }}>
          Track your algorithmic mastery across core computer science competencies.
          Our AI continuously optimizes your next challenges to patch knowledge gaps.
        </p>
      </div>

      {/* Recommended Next Problem Card */}
      {nextChallenge && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(41, 151, 255, 0.05), rgba(124, 58, 237, 0.04)), #ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '18px',
          padding: '24px 28px',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          flexWrap: 'wrap',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
              <Zap size={15} color="#f59e0b" /> RECOMMENDED NEXT FOCUS
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
              {nextChallenge.title}
            </h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className={`diff-badge diff-${nextChallenge.difficulty.toLowerCase()}`}>
                {nextChallenge.difficulty}
              </span>
              <span style={{ fontSize: '0.84rem', color: '#64748b' }}>
                {nextChallenge.category}
              </span>
            </div>
          </div>

          <button
            onClick={() => onSelectProblem(nextChallenge)}
            className="btn-primary-submit"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            Solve Challenge Now
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Topic Tracks Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        {tracks.map((track, i) => {
          const percent = Math.round((track.solvedProblems / track.totalProblems) * 100);
          return (
            <div key={i} className="track-progress-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  {track.name}
                </h4>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: percent >= 70 ? '#34d399' : '#38bdf8' }}>
                  {percent}%
                </span>
              </div>

              <p style={{ color: '#94a3b8', fontSize: '0.84rem', margin: '8px 0 14px 0', lineHeight: 1.5 }}>
                {track.description}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b' }}>
                <span>{track.solvedProblems} of {track.totalProblems} Solved</span>
                <span>{track.totalProblems - track.solvedProblems} Remaining</span>
              </div>

              <div className="track-bar-outer">
                <div className="track-bar-fill" style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
