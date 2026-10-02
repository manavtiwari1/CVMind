import { BookOpen, Compass, Flame, LogOut, Moon, Sparkles, Sun, Timer, User } from 'lucide-react';
import cvmindIcon from '../../assets/cvmind_icon.png';
import { siteOrigin } from '../../lib/hosts';

export type CodeView = 'problems' | 'workspace' | 'roadmap' | 'practice' | 'profile' | 'ai';

interface CodeTopBarProps {
  view: CodeView;
  onView: (view: CodeView) => void;
  streak: number;
  solved: number;
  total: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const NAV: { id: CodeView; label: string; icon: typeof BookOpen }[] = [
  { id: 'problems', label: 'Problems', icon: BookOpen },
  { id: 'roadmap', label: 'Roadmap', icon: Compass },
  { id: 'practice', label: 'Practice', icon: Timer },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'ai', label: 'AI Generator', icon: Sparkles },
];

export default function CodeTopBar({ view, onView, streak, solved, total, theme, onToggleTheme }: CodeTopBarProps) {
  // the workspace belongs to the Problems section
  const active = view === 'workspace' ? 'problems' : view;

  return (
    <header className="cx-topbar">
      <button type="button" className="cx-brand" onClick={() => onView('problems')} aria-label="CVMind Code home">
        <img src={cvmindIcon} alt="" />
        <span className="cx-brand-name">CVMind <em>Code</em></span>
      </button>

      <nav className="cx-nav" aria-label="CVMind Code">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={`cx-nav-item${active === id ? ' is-active' : ''}`} aria-current={active === id ? 'page' : undefined} onClick={() => onView(id)}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </nav>

      <div className="cx-topbar-right">
        <span className="cx-chip" title="Days in a row with at least one submission">
          <Flame size={14} color="#f59e0b" /> {streak}
        </span>
        <span className="cx-chip" title="Problems solved">{solved}/{total} solved</span>
        <button type="button" className="cx-icon-btn" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} title="Toggle theme">
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <a className="cx-icon-btn" href={`${siteOrigin()}/`} aria-label="Back to CVMind" title="Back to CVMind"><LogOut size={17} /></a>
      </div>
    </header>
  );
}
