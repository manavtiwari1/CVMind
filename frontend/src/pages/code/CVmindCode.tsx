import { useState } from 'react';
import { 
  Code2, 
  BookOpen, 
  Compass, 
  User, 
  Trophy, 
  Shield, 
  Sparkles, 
  Flame, 
  Star 
} from 'lucide-react';
import { CODING_PROBLEMS, type CodingProblem } from '../../data/codingProblems';
import ProblemLibrary from './ProblemLibrary';
import CodeArena from './CodeArena';
import Roadmap from './Roadmap';
import CodingProfile from './CodingProfile';
import Contests from './Contests';
import Assessments from './Assessments';
import AIProblemGen from './AIProblemGen';
import cvmindIcon from '../../assets/cvmind_icon.png';
import './Code.css';

interface CVmindCodeProps {
  customApiKey?: string;
  initialTab?: string;
}

export default function CVmindCode({ customApiKey = '', initialTab = 'problems' }: CVmindCodeProps) {
  const [activeTab, setActiveTab] = useState<string>(() => {
    return initialTab || 'problems';
  });

  const [problems, setProblems] = useState<CodingProblem[]>(() => {
    try {
      const savedCustom = localStorage.getItem('cvmind_custom_problems');
      if (savedCustom) {
        const parsed = JSON.parse(savedCustom);
        return [...CODING_PROBLEMS, ...parsed];
      }
    } catch {}
    return CODING_PROBLEMS;
  });

  const [selectedProblem, setSelectedProblem] = useState<CodingProblem>(CODING_PROBLEMS[0]);

  const [solvedProblemIds, setSolvedProblemIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cvmind_solved_problems');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['two-sum']; // Pre-seed with one solved challenge for realistic baseline stats
  });

  const handleMarkSolved = (problemId: string) => {
    setSolvedProblemIds(prev => {
      if (!prev.includes(problemId)) {
        const updated = [...prev, problemId];
        localStorage.setItem('cvmind_solved_problems', JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
  };

  const handleSelectProblem = (problem: CodingProblem) => {
    setSelectedProblem(problem);
    setActiveTab('arena');
  };

  const handleLoadGeneratedProblem = (newProblem: CodingProblem) => {
    setProblems(prev => [newProblem, ...prev]);
    try {
      const savedCustom = JSON.parse(localStorage.getItem('cvmind_custom_problems') || '[]');
      localStorage.setItem('cvmind_custom_problems', JSON.stringify([newProblem, ...savedCustom]));
    } catch {}
    setSelectedProblem(newProblem);
    setActiveTab('arena');
  };

  const currentRating = 1640 + solvedProblemIds.length * 15;

  return (
    <div className="cvmind-code-container">
      {/* ─── TOP HEADER BAR ─── */}
      <header className="code-header-bar">
        <div className="code-brand-area">
          <img 
            src={cvmindIcon} 
            alt="CVMind Code" 
            className="code-brand-logo-img" 
          />
          <div>
            <div className="code-brand-title">
              CVMind Code
            </div>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <nav className="code-nav-pills">
          <button
            onClick={() => setActiveTab('problems')}
            className={`code-nav-tab ${activeTab === 'problems' ? 'active' : ''}`}
          >
            <BookOpen size={15} />
            Problems
          </button>

          <button
            onClick={() => setActiveTab('arena')}
            className={`code-nav-tab ${activeTab === 'arena' ? 'active' : ''}`}
          >
            <Code2 size={15} />
            Code Arena
          </button>

          <button
            onClick={() => setActiveTab('roadmap')}
            className={`code-nav-tab ${activeTab === 'roadmap' ? 'active' : ''}`}
          >
            <Compass size={15} />
            Roadmap
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`code-nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
          >
            <User size={15} />
            Skill Profile
          </button>

          <button
            onClick={() => setActiveTab('contests')}
            className={`code-nav-tab ${activeTab === 'contests' ? 'active' : ''}`}
          >
            <Trophy size={15} />
            Contests
          </button>

          <button
            onClick={() => setActiveTab('assessments')}
            className={`code-nav-tab ${activeTab === 'assessments' ? 'active' : ''}`}
          >
            <Shield size={15} />
            Assessments
          </button>

          <button
            onClick={() => setActiveTab('ai-generator')}
            className={`code-nav-tab ${activeTab === 'ai-generator' ? 'active' : ''}`}
          >
            <Sparkles size={15} color="#38bdf8" />
            AI Generator
          </button>
        </nav>

        {/* Quick User Stats */}
        <div className="code-header-stats">
          <div className="code-stat-pill" title="Daily Coding Streak">
            <Flame size={15} color="#f59e0b" />
            <span>14d</span>
          </div>
          <div className="code-stat-pill" title="Technical Rating">
            <Star size={15} color="#818cf8" />
            <span>{currentRating}</span>
          </div>
        </div>
      </header>

      {/* ─── ACTIVE TAB VIEW ─── */}
      <main style={{ flex: 1 }}>
        {activeTab === 'problems' && (
          <ProblemLibrary
            problems={problems}
            solvedProblemIds={solvedProblemIds}
            onSelectProblem={handleSelectProblem}
            onOpenAiGenerator={() => setActiveTab('ai-generator')}
          />
        )}

        {activeTab === 'arena' && (
          <CodeArena
            problem={selectedProblem}
            onBackToLibrary={() => setActiveTab('problems')}
            onMarkSolved={handleMarkSolved}
            customApiKey={customApiKey}
          />
        )}

        {activeTab === 'roadmap' && (
          <Roadmap
            solvedProblemIds={solvedProblemIds}
            onSelectProblem={handleSelectProblem}
          />
        )}

        {activeTab === 'profile' && (
          <CodingProfile
            solvedCount={solvedProblemIds.length}
          />
        )}

        {activeTab === 'contests' && (
          <Contests />
        )}

        {activeTab === 'assessments' && (
          <Assessments
            onStartAssessment={handleSelectProblem}
          />
        )}

        {activeTab === 'ai-generator' && (
          <AIProblemGen
            onLoadGeneratedProblem={handleLoadGeneratedProblem}
            customApiKey={customApiKey}
          />
        )}
      </main>
    </div>
  );
}
