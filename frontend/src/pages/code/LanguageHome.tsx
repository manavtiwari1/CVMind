import { useMemo } from 'react';
import { ArrowRight, Keyboard, MousePointerClick, Repeat2, Trophy } from 'lucide-react';
import type { CodingProblem } from '../../data/codingProblems';
import { LEVELS, levelOf } from '../../data/codingLevels';
import { LEO_POSES } from '../../lib/leoPoses';
import jsLogo from '../../assets/langs/javascript.svg';
import pyLogo from '../../assets/langs/python.svg';
import cppLogo from '../../assets/langs/cpp.svg';
import { LANGUAGES, type Language } from './codeApi';
import { problemsFor, progressForLanguage, useAllProgress } from './codeStore';
import './code-home.css';

interface LanguageHomeProps {
  problems: CodingProblem[];
  /** The language used last time, shown first so returning users can carry on. */
  lastUsed: Language | null;
  onPick: (language: Language) => void;
}

type Token = [cls: string, text: string];

/** The real starter code shape of each language, pre-split so it can be coloured without an editor. */
const DETAILS: Record<Language, { logo: string; vibe: string; code: Token[][] }> = {
  javascript: {
    logo: jsLogo,
    vibe: 'Write a plain function and return the answer.',
    code: [
      [['k', 'function '], ['f', 'twoSum'], ['p', '(nums, target) {']],
      [['c', '  // your idea here']],
      [['p', '}']],
    ],
  },
  python: {
    logo: pyLogo,
    vibe: 'One method on class Solution. Short and readable.',
    code: [
      [['k', 'class '], ['f', 'Solution'], ['p', ':']],
      [['k', '    def '], ['f', 'twoSum'], ['p', '(self, nums, target):']],
      [['c', '        # your idea here']],
    ],
  },
  cpp: {
    logo: cppLogo,
    vibe: 'The whole STL is already included, so no #include lines.',
    code: [
      [['k', 'class '], ['f', 'Solution'], ['p', ' {']],
      [['k', 'public'], ['p', ':']],
      [['t', '    vector<int> '], ['f', 'twoSum'], ['p', '(...)']],
    ],
  },
};

const STEPS = [
  { icon: MousePointerClick, title: 'Pick a language', text: 'Every problem opens with starter code in it.' },
  { icon: Trophy, title: 'Solve at your pace', text: 'Each language keeps its own solved list and roadmap.' },
  { icon: Repeat2, title: 'Switch any time', text: 'Use the language chip in the top bar to come back here.' },
];

export default function LanguageHome({ problems, lastUsed, onPick }: LanguageHomeProps) {
  const all = useAllProgress();

  const tracks = useMemo(() => LANGUAGES.map((l) => {
    const pool = problemsFor(problems, l.id);
    const view = progressForLanguage(all, l.id);
    const solved = pool.filter((p) => view.solved[p.id]).length;
    return { ...l, ...DETAILS[l.id], total: pool.length, solved, started: view.submissions.length > 0 };
  }), [problems, all]);

  const topics = useMemo(() => {
    const counts = new Map<string, number>();
    problems.forEach((p) => counts.set(p.category, (counts.get(p.category) || 0) + 1));
    return [...counts.entries()];
  }, [problems]);
  const topicCount = topics.length;
  const levels = useMemo(() => LEVELS.map((name) => ({ name, count: problems.filter((p) => levelOf(p) === name).length })), [problems]);
  const maxLevel = Math.max(1, ...levels.map((l) => l.count));
  const last = tracks.find((t) => t.id === lastUsed);

  return (
    <div className="cx-home-shell">
      <div className="cx-home-glow" aria-hidden="true">
        <span className="g1" /><span className="g2" /><span className="g3" />
      </div>
      <div className="cx-home">

      <section className="cx-home-hero">
        <div className="cx-home-copy">
          <span className="cx-home-pill">✦ CVMind Code</span>
          <h1>
            Pick a language,<br />
            <span className="cx-home-mark">let&apos;s start coding</span>
          </h1>
          <p>
            {problems.length} problems across {topicCount} topics, from easy warm-ups to the tough ones.
            Choose one language and every problem opens in it.
          </p>
          {last && (
            <button type="button" className="cx-home-resume" onClick={() => onPick(last.id)}>
              Continue in {last.label} <ArrowRight size={16} />
            </button>
          )}
        </div>

        <div className="cx-home-leo">
          <div className="cx-home-bubble">
            {last ? <>Welcome back! <b>{last.label}</b> again, or something new today?</> : <>Hi, I&apos;m Leo! Which language are we coding in today?</>}
          </div>
          <img src={LEO_POSES.typing} alt="Leo, the CVMind guide, typing on a laptop" width={220} height={220} />
          <span className="cx-home-spark s1" aria-hidden="true">✦</span>
          <span className="cx-home-spark s2" aria-hidden="true">✧</span>
          <span className="cx-home-spark s3" aria-hidden="true">♡</span>
        </div>

        <aside className="cx-home-inside" aria-label="What is inside">
          <b className="cx-home-inside-title">What&apos;s inside</b>
          <ul className="cx-home-levels">
            {levels.map((l) => (
              <li key={l.name} data-level={l.name.toLowerCase()}>
                <span className="nm">{l.name}</span>
                <span className="bar"><i style={{ width: `${(l.count / maxLevel) * 100}%` }} /></span>
                <span className="ct">{l.count}</span>
              </li>
            ))}
          </ul>
          <div className="cx-home-topics">
            {topics.map(([name, count]) => <span key={name}>{name} <em>{count}</em></span>)}
          </div>
        </aside>
      </section>

      <div className="cx-home-grid">
        {tracks.map((t, i) => {
          const pct = t.total ? Math.round((t.solved / t.total) * 100) : 0;
          return (
            <button
              key={t.id}
              type="button"
              className={`cx-track${t.id === lastUsed ? ' is-last' : ''}`}
              data-lang={t.id}
              style={{ animationDelay: `${120 + i * 90}ms` }}
              onClick={() => onPick(t.id)}
            >
              {t.id === lastUsed && <span className="cx-track-last">Last used</span>}

              <div className="cx-track-top">
                <span className="cx-track-mark" aria-hidden="true"><img src={t.logo} alt="" width={30} height={30} /></span>
                <div className="cx-track-name">
                  <b>{t.label}</b>
                  <span>{t.total} problems</span>
                </div>
              </div>

              <p className="cx-track-vibe">{t.vibe}</p>

              <pre className="cx-track-code" aria-hidden="true">
                {t.code.map((line, li) => (
                  <span key={li} className="ln">
                    {line.map(([cls, text], ti) => <span key={ti} className={`tk-${cls}`}>{text}</span>)}
                  </span>
                ))}
              </pre>

              <div className="cx-track-progress">
                <div className="cx-track-bar"><span style={{ width: `${Math.max(pct, t.solved ? 3 : 0)}%` }} /></div>
                <span>{t.solved ? `${t.solved}/${t.total} solved` : 'Not started yet'}</span>
              </div>

              <span className="cx-track-cta">
                {t.started ? 'Continue' : 'Start'} in {t.label} <ArrowRight size={16} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="cx-home-foot">
      <section className="cx-home-steps" aria-label="How it works">
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <div key={title} className="cx-home-step">
            <span className="cx-home-step-icon"><Icon size={18} /></span>
            <div>
              <b><em>{i + 1}</em> {title}</b>
              <span>{text}</span>
            </div>
          </div>
        ))}
      </section>

      <div className="cx-home-tip">
        <img src={LEO_POSES.idea} alt="" width={56} height={56} />
        <p>
          <Keyboard size={15} /> <b>Leo&apos;s tip:</b> in the editor, <kbd>Ctrl</kbd> + <kbd>&apos;</kbd> runs your code
          and <kbd>Ctrl</kbd> + <kbd>Enter</kbd> submits it.
        </p>
      </div>
      </div>
      </div>
    </div>
  );
}
