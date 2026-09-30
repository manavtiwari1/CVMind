import { useCallback, useEffect, useMemo, useState } from 'react';
import './code-base.css';
import { CODING_PROBLEMS, type CodingProblem } from '../../data/codingProblems';
import CodeTopBar, { type CodeView } from './CodeTopBar';
import ProblemSet from './ProblemSet';
import Workspace from './Workspace';
import ProfilePage from './ProfilePage';
import RoadmapPage from './RoadmapPage';
import PracticePage from './PracticePage';
import AIGenerator from './AIGenerator';
import { computeStreak, summarize, useProgress } from './codeStore';

interface CVmindCodeProps {
  customApiKey?: string;
  initialTab?: string;
}

const THEME_KEY = 'cvmind_code_theme';
const CUSTOM_KEY = 'cvmind_custom_problems';

// Older links used different tab names; keep them working.
const LEGACY_TABS: Record<string, CodeView> = {
  problems: 'problems',
  arena: 'workspace',
  roadmap: 'roadmap',
  profile: 'profile',
  contests: 'practice',
  assessments: 'practice',
  practice: 'practice',
  'ai-gen': 'ai',
  'ai-generator': 'ai',
  ai: 'ai',
};

function loadCustomProblems(): CodingProblem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    return raw ? (JSON.parse(raw) as CodingProblem[]) : [];
  } catch {
    return [];
  }
}

function initialTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* ignore */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function CVmindCode({ customApiKey = '', initialTab = 'problems' }: CVmindCodeProps) {
  const progress = useProgress();
  const [custom, setCustom] = useState<CodingProblem[]>(loadCustomProblems);
  const problems = useMemo(() => [...CODING_PROBLEMS, ...custom], [custom]);
  const [theme, setTheme] = useState<'light' | 'dark'>(initialTheme);

  const [view, setView] = useState<CodeView>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('problem')) return 'workspace';
      const tab = params.get('tab');
      if (tab && LEGACY_TABS[tab] && LEGACY_TABS[tab] !== 'workspace') return LEGACY_TABS[tab];
    } catch { /* fall through */ }
    return LEGACY_TABS[initialTab] && LEGACY_TABS[initialTab] !== 'workspace' ? LEGACY_TABS[initialTab] : 'problems';
  });

  const [problemId, setProblemId] = useState<string | null>(() => {
    try { return new URLSearchParams(window.location.search).get('problem'); } catch { return null; }
  });

  const selected = problemId ? problems.find((p) => p.id === problemId || p.slug === problemId) : undefined;
  // a deep link to a problem that no longer exists falls back to the list
  const activeView: CodeView = view === 'workspace' && !selected ? 'problems' : view;

  // keep the address bar in sync so a refresh or a shared link returns to the same place
  useEffect(() => {
    try {
      const params = new URLSearchParams();
      if (activeView === 'workspace' && selected) params.set('problem', selected.slug || selected.id);
      else params.set('tab', activeView);
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
    } catch { /* history unavailable */ }
  }, [activeView, selected]);

  useEffect(() => {
    document.title = activeView === 'workspace' && selected ? `${selected.title} - CVMind Code` : 'CVMind Code';
  }, [activeView, selected]);

  const openProblem = useCallback((p: CodingProblem) => { setProblemId(p.id); setView('workspace'); window.scrollTo(0, 0); }, []);
  const changeView = useCallback((v: CodeView) => { setView(v); window.scrollTo(0, 0); }, []);

  const useGenerated = useCallback((p: CodingProblem) => {
    setCustom((prev) => {
      const next = [p, ...prev.filter((x) => x.id !== p.id)];
      try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(next)); } catch { /* the problem still opens; it just is not kept */ }
      return next;
    });
    setProblemId(p.id);
    setView('workspace');
    window.scrollTo(0, 0);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
  };

  const summary = useMemo(() => summarize(problems, progress), [problems, progress]);
  const streak = useMemo(() => computeStreak(progress.activity).current, [progress.activity]);

  return (
    <div className="cx-app" data-cx-theme={theme}>
      <CodeTopBar view={activeView} onView={changeView} streak={streak} solved={summary.solved} total={summary.total} theme={theme} onToggleTheme={toggleTheme} />
      <main className="cx-main">
        {activeView === 'problems' && (
          <ProblemSet problems={problems} onOpen={openProblem} onOpenAi={() => changeView('ai')} onOpenPractice={() => changeView('practice')} />
        )}
        {activeView === 'workspace' && selected && (
          <Workspace
            key={selected.id}
            problem={selected}
            problems={problems}
            theme={theme}
            customApiKey={customApiKey}
            onOpen={openProblem}
            onBack={() => changeView('problems')}
          />
        )}
        {activeView === 'roadmap' && <RoadmapPage problems={problems} onOpen={openProblem} />}
        {activeView === 'practice' && <PracticePage problems={problems} theme={theme} customApiKey={customApiKey} />}
        {activeView === 'profile' && <ProfilePage problems={problems} onOpen={openProblem} />}
        {activeView === 'ai' && <AIGenerator onUse={useGenerated} customApiKey={customApiKey} />}
      </main>
    </div>
  );
}
