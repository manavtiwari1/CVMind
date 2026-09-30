import { useState } from 'react';
import { 
  Code2, 
  ExternalLink, 
  Sparkles, 
  Terminal, 
  Cpu, 
  Compass, 
  Trophy, 
  CheckCircle2, 
  ShieldCheck,
  Layers,
  Braces,
  Play
} from 'lucide-react';
import { CODING_PROBLEMS } from '../../data/codingProblems';
import cvmindIcon from '../../assets/cvmind_icon.png';
import './CVmindCodeLanding.css';

const PROBLEM_COUNT = CODING_PROBLEMS.length;

const FEATURE_HIGHLIGHTS = [
  {
    icon: <Code2 className="code-feat-icon text-cyan" size={24} />,
    title: `${PROBLEM_COUNT} DSA Challenges`,
    description: 'Classic algorithm problems across arrays, linked lists, trees, graphs, dynamic programming and more, each with a full statement, examples and a hidden test set.',
    badge: `${PROBLEM_COUNT} Challenges`
  },
  {
    icon: <Terminal className="code-feat-icon text-emerald" size={24} />,
    title: 'Monaco Editor & Multi-Language Runner',
    description: 'The same editor engine as VS Code. Write solutions in JavaScript or Python and run them against the tests. C++ has editor support, but it is not judged yet.',
    badge: 'JavaScript & Python'
  },
  {
    icon: <Sparkles className="code-feat-icon text-purple" size={24} />,
    title: '6-Tier Progressive AI Copilot',
    description: 'Never get stuck. Get progressive hints that guide your intuition without giving away the full answer — from conceptual clues to optimal Big-O complexity advice.',
    badge: 'AI Powered'
  },
  {
    icon: <Compass className="code-feat-icon text-blue" size={24} />,
    title: 'Visual Skill Tree & Roadmap',
    description: 'Work through topics in order, with progress per topic, milestone badges, streak tracking and a recommendation for what to solve next.',
    badge: 'Structured'
  },
  {
    icon: <Trophy className="code-feat-icon text-amber" size={24} />,
    title: 'Timed Practice',
    description: 'Pick a time limit, a number of problems and a difficulty, then work through them against a countdown. It is practice only, with no proctoring.',
    badge: 'Practice'
  },
  {
    icon: <ShieldCheck className="code-feat-icon text-teal" size={24} />,
    title: 'Your Progress Profile',
    description: 'See problems solved by difficulty and topic, your streaks and a submission heatmap. Progress is saved on your device.',
    badge: 'Your data'
  }
];

const POPULAR_PROBLEMS = [
  { id: 'two-sum', title: 'Two Sum', difficulty: 'Easy', category: 'Arrays & Hashing' },
  { id: 'valid-parentheses', title: 'Valid Parentheses', difficulty: 'Easy', category: 'Stack' },
  { id: 'best-time-to-buy-and-sell-stock', title: 'Best Time to Buy & Sell Stock', difficulty: 'Easy', category: 'Sliding Window' },
  { id: 'longest-substring-without-repeating-characters', title: 'Longest Substring Without Repeating', difficulty: 'Medium', category: 'Sliding Window' },
  { id: 'merge-two-sorted-lists', title: 'Merge Two Sorted Lists', difficulty: 'Easy', category: 'Linked List' },
  { id: 'lru-cache', title: 'LRU Cache', difficulty: 'Hard', category: 'Design' },
];

export default function CVmindCodeLanding() {
  const [activeCodeTab, setActiveCodeTab] = useState<'python' | 'javascript' | 'cpp'>('python');

  const openCodeArenaInNewTab = (tab?: string, problemId?: string) => {
    let url = '/code-arena';
    const params = new URLSearchParams();
    if (tab) params.set('tab', tab);
    if (problemId) params.set('problem', problemId);
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const codeSnippets = {
    python: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        # Hash Map for O(N) lookup time
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []`,
    javascript: `function twoSum(nums, target) {
  // Map stores number -> index
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (seen.has(diff)) {
      return [seen.get(diff), i];
    }
    seen.set(nums[i], i);
  }
  return [];
}`,
    cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> seen;
        for (int i = 0; i < nums.size(); ++i) {
            int complement = target - nums[i];
            if (seen.find(complement) != seen.end()) {
                return {seen[complement], i};
            }
            seen[nums[i]] = i;
        }
        return {};
    }
};`
  };

  return (
    <div className="code-landing-page">
      {/* ── HERO SECTION ────────────────────────────────────────── */}
      <section className="code-landing-hero">
        <div className="code-landing-glow-1" />
        <div className="code-landing-glow-2" />

        <div className="code-landing-hero-content">
          <div className="code-landing-badge">
            <span className="code-badge-pulse" />
            <Sparkles size={14} className="code-badge-icon" />
            <span>INTRODUCING CVMIND CODE</span>
          </div>

          <h1 className="code-landing-title">
            Master Algorithmic Coding &amp; <br />
            <span className="code-landing-title-grad">Ace Your Technical Interviews</span>
          </h1>

          <p className="code-landing-subtitle">
            CVMind Code is an all-in-one in-browser coding arena and automated DSA judge.
            Solve {PROBLEM_COUNT} coding problems in a Monaco editor (the engine behind VS Code), run your code against real tests,
            and use progressive AI hints to learn data structures and algorithms.
          </p>

          {/* Core Call to Action Buttons */}
          <div className="code-landing-cta-group">
            <button 
              className="code-landing-main-cta"
              onClick={() => openCodeArenaInNewTab()}
              title="Open CVMind Code in a new browser tab"
              id="btn-cvmind-code-hero"
            >
              <span className="code-cta-icon-wrapper">
                <img src={cvmindIcon} alt="CVMind" className="code-cta-brand-icon" />
              </span>
              <span className="code-cta-label">CVMind Code</span>
              <ExternalLink size={18} className="code-cta-ext-icon" />
            </button>
          </div>

          <div className="code-landing-cta-hint">
            <span className="code-hint-dot" />
            Clicking <strong>CVMind Code</strong> launches the full coding arena in a new tab so your current CV Mind work stays intact.
          </div>

          {/* Quick Metrics Bar */}
          <div className="code-landing-metrics">
            <div className="code-metric-item">
              <span className="code-metric-num">{PROBLEM_COUNT}</span>
              <span className="code-metric-label">DSA Challenges</span>
            </div>
            <div className="code-metric-divider" />
            <div className="code-metric-item">
              <span className="code-metric-num">2</span>
              <span className="code-metric-label">Languages Judged</span>
            </div>
            <div className="code-metric-divider" />
            <div className="code-metric-item">
              <span className="code-metric-num">0</span>
              <span className="code-metric-label">Installs Needed</span>
            </div>
            <div className="code-metric-divider" />
            <div className="code-metric-item">
              <span className="code-metric-num">100%</span>
              <span className="code-metric-label">Free Practice</span>
            </div>
          </div>
        </div>

        {/* ── INTERACTIVE CODE PREVIEW MOCKUP ─────────────────────── */}
        <div className="code-landing-preview-wrapper">
          <div className="code-mockup-window">
            <div className="code-mockup-header">
              <div className="code-mockup-dots">
                <span className="code-dot dot-red" />
                <span className="code-dot dot-yellow" />
                <span className="code-dot dot-green" />
              </div>
              <div className="code-mockup-tabs">
                <button 
                  className={`code-mockup-tab ${activeCodeTab === 'python' ? 'active' : ''}`}
                  onClick={() => setActiveCodeTab('python')}
                >
                  <span className="code-tab-dot py-dot" /> solution.py
                </button>
                <button 
                  className={`code-mockup-tab ${activeCodeTab === 'javascript' ? 'active' : ''}`}
                  onClick={() => setActiveCodeTab('javascript')}
                >
                  <span className="code-tab-dot js-dot" /> solution.js
                </button>
                <button 
                  className={`code-mockup-tab ${activeCodeTab === 'cpp' ? 'active' : ''}`}
                  onClick={() => setActiveCodeTab('cpp')}
                >
                  <span className="code-tab-dot cpp-dot" /> solution.cpp
                </button>
              </div>
              <div className="code-mockup-run-badge">
                <Play size={12} fill="currentColor" /> Ready
              </div>
            </div>

            <div className="code-mockup-editor">
              <pre className="code-mockup-pre">
                <code>{codeSnippets[activeCodeTab]}</code>
              </pre>
            </div>

            <div className="code-mockup-console">
              <div className="code-console-header">
                <div className="code-console-title">
                  <Terminal size={14} /> Execution Results (Test Cases)
                </div>
                <div className="code-console-status">
                  <CheckCircle2 size={14} className="text-emerald" /> All 3 Passed
                </div>
              </div>
              <div className="code-console-body">
                <div className="code-test-row">
                  <span className="code-test-tag pass">PASS</span>
                  <span className="code-test-text">Case 1: nums=[2,7,11,15], target=9 ➜ [0, 1]</span>
                  <span className="code-test-time">12ms</span>
                </div>
                <div className="code-test-row">
                  <span className="code-test-tag pass">PASS</span>
                  <span className="code-test-text">Case 2: nums=[3,2,4], target=6 ➜ [1, 2]</span>
                  <span className="code-test-time">14ms</span>
                </div>
                <div className="code-test-row">
                  <span className="code-test-tag pass">PASS</span>
                  <span className="code-test-text">Case 3: nums=[3,3], target=6 ➜ [0, 1]</span>
                  <span className="code-test-time">9ms</span>
                </div>
              </div>

              {/* Floating AI Insight Pill */}
              <div className="code-ai-hint-box">
                <Sparkles size={15} className="text-purple" />
                <span><strong>AI Optimization Coach:</strong> Optimal O(N) Time and O(N) Space Complexity achieved via Hash Map lookup.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT IS CVMIND CODE / FEATURE PILLARS ─────────────────── */}
      <section className="code-landing-features-section">
        <div className="code-section-header">
          <div className="code-section-eyebrow">
            <Cpu size={14} /> BUILT FOR ENGINEERS &amp; JOB SEEKERS
          </div>
          <h2 className="code-section-title">Everything You Need to Ace Tech Rounds</h2>
          <p className="code-section-desc">
            Unlike static question lists, CVMind Code is a complete hands-on development playground equipped with an automated judge and step-by-step AI guidance.
          </p>
        </div>

        <div className="code-features-grid">
          {FEATURE_HIGHLIGHTS.map((feat, idx) => (
            <div key={idx} className="code-feature-card">
              <div className="code-feat-header">
                <div className="code-feat-icon-box">{feat.icon}</div>
                <span className="code-feat-badge">{feat.badge}</span>
              </div>
              <h3 className="code-feat-title">{feat.title}</h3>
              <p className="code-feat-desc">{feat.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── POPULAR PROBLEMS PREVIEW ──────────────────────────────── */}
      <section className="code-landing-problems-section">
        <div className="code-section-header">
          <div className="code-section-eyebrow">
            <Braces size={14} /> CURATED CURRICULUM
          </div>
          <h2 className="code-section-title">Jump Straight Into Top Interview Problems</h2>
          <p className="code-section-desc">
            Pick a challenge below to open it immediately in CVMind Code in a fresh tab.
          </p>
        </div>

        <div className="code-problems-grid">
          {POPULAR_PROBLEMS.map((prob) => (
            <div key={prob.id} className="code-problem-card">
              <div className="code-prob-top">
                <span className={`code-prob-diff diff-${prob.difficulty.toLowerCase()}`}>
                  {prob.difficulty}
                </span>
                <span className="code-prob-cat">{prob.category}</span>
              </div>
              <h4 className="code-prob-name">{prob.title}</h4>
              <button 
                className="code-prob-solve-btn"
                onClick={() => openCodeArenaInNewTab('arena', prob.id)}
                title={`Solve ${prob.title} in CVMind Code (opens new tab)`}
              >
                <span>Solve Problem</span>
                <ExternalLink size={13} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── BOTTOM CALL TO ACTION BANNER ──────────────────────────── */}
      <section className="code-landing-cta-banner">
        <div className="code-cta-banner-card">
          <div className="code-cta-banner-glow" />
          <div className="code-cta-banner-content">
            <div className="code-banner-icon-ring">
              <Code2 size={32} className="text-cyan" />
            </div>
            <h2 className="code-banner-title">
              Ready to Level Up Your Coding Skills?
            </h2>
            <p className="code-banner-subtitle">
              Start writing code in seconds. No configuration, no local compiler required. Click below to launch CVMind Code in a new tab.
            </p>
            
            <div className="code-banner-actions">
              <button 
                className="code-landing-main-cta code-landing-main-cta-lg"
                onClick={() => openCodeArenaInNewTab()}
                id="btn-cvmind-code-bottom"
              >
                <img src={cvmindIcon} alt="CVMind" className="code-cta-brand-icon" />
                <span className="code-cta-label">CVMind Code</span>
                <ExternalLink size={20} className="code-cta-ext-icon" />
              </button>
            </div>

            <div className="code-banner-footnote">
              <Layers size={13} /> Launches in a new tab • Keep your resume checker session active
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
