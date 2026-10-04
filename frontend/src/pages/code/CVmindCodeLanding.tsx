import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, ExternalLink } from 'lucide-react';
import { CODING_PROBLEMS, TOPICS } from '../../data/codingProblems';
import { urlForPage } from '../../lib/hosts';
import './CVmindCodeLanding.css';

const PROBLEMS = CODING_PROBLEMS;
const COUNT = PROBLEMS.length;

const POPULAR_IDS = [
  'two-sum',
  'valid-parentheses',
  'best-time-to-buy-and-sell-stock',
  'longest-substring-without-repeating-characters',
  'merge-two-sorted-lists',
  'number-of-islands',
  'coin-change',
  'lru-cache',
];

type Lang = 'python' | 'javascript' | 'cpp';

const LANGS: { id: Lang; file: string }[] = [
  { id: 'python', file: 'solution.py' },
  { id: 'javascript', file: 'solution.js' },
  { id: 'cpp', file: 'solution.cpp' },
];

const SNIPPETS: Record<Lang, string[]> = {
  python: [
    'class Solution:',
    '    def twoSum(self, nums, target):',
    '        seen = {}',
    '        for i, n in enumerate(nums):',
    '            need = target - n',
    '            if need in seen:',
    '                return [seen[need], i]',
    '            seen[n] = i',
    '        return []',
  ],
  javascript: [
    'function twoSum(nums, target) {',
    '  const seen = new Map();',
    '  for (let i = 0; i < nums.length; i++) {',
    '    const need = target - nums[i];',
    '    if (seen.has(need)) {',
    '      return [seen.get(need), i];',
    '    }',
    '    seen.set(nums[i], i);',
    '  }',
    '  return [];',
    '}',
  ],
  cpp: [
    'class Solution {',
    'public:',
    '  vector<int> twoSum(vector<int>& nums, int target) {',
    '    unordered_map<int, int> seen;',
    '    for (int i = 0; i < nums.size(); ++i) {',
    '      int need = target - nums[i];',
    '      if (seen.count(need)) return {seen[need], i};',
    '      seen[nums[i]] = i;',
    '    }',
    '    return {};',
    '  }',
    '};',
  ],
};

// An example session on Two Sum, to show what the judge hands back.
const SESSION = [
  { run: 'Run 1', verdict: 'Wrong Answer', tone: 'bad', note: '2 / 3 sample cases passed' },
  { run: 'Run 2', verdict: 'Time Limit Exceeded', tone: 'warn', note: 'Nested loop, O(n²) on a large hidden case' },
  { run: 'Run 3', verdict: 'Accepted', tone: 'ok', note: 'Hash map, every case passed' },
];

const VERDICTS = [
  { name: 'Accepted', tone: 'ok', text: 'Every test passed, hidden ones included. This is the only verdict that counts as solved.' },
  { name: 'Wrong Answer', tone: 'bad', text: 'Your code ran, but the output was not what the test expected.' },
  { name: 'Runtime Error', tone: 'bad', text: 'Your code crashed on a test. The error message is shown so you can find the line.' },
  { name: 'Time Limit Exceeded', tone: 'warn', text: 'The answer may be right, but it took too long. Usually a sign to look for a better approach.' },
  { name: 'Compilation Error', tone: 'bad', text: 'The code could not be parsed or compiled, so no test was run.' },
];

const EXTRAS = [
  ['AI hints', 'Six levels, from a nudge toward the right idea up to complexity advice. Open as many as you want.'],
  ['Roadmap', 'Topics in a sensible order with progress on each, and a suggestion for what to solve next.'],
  ['Timed practice', 'Choose the time, the number of problems and the difficulty, then work against a countdown. Practice only, nothing is proctored.'],
  ['Profile', 'Solved by difficulty and topic, streaks and a submission heatmap.'],
  ['AI generator', 'More problems on one pattern when the set runs out.'],
];

const FAQS = [
  {
    q: 'Which languages run?',
    a: 'Python and JavaScript are judged against the tests. C++ has the editor and a starter template, but the judge does not run it yet.',
  },
  {
    q: 'Do I have to install anything?',
    a: 'No. The editor and the judge are in the page. Open the arena and start typing.',
  },
  {
    q: 'Where does my progress go?',
    a: 'Solved problems, streaks and drafts are stored on your device, and synced to your CVMind account when you are signed in.',
  },
  {
    q: 'Does it cost anything?',
    a: 'Practising on CVMind Code is free.',
  },
];

function openArena(tab?: string, problemId?: string) {
  const params = new URLSearchParams();
  if (tab) params.set('tab', tab);
  if (problemId) params.set('problem', problemId);
  const qs = params.toString();
  window.open(urlForPage('code-arena', qs ? `?${qs}` : ''), '_blank', 'noopener,noreferrer');
}

export default function CVmindCodeLanding() {
  const [lang, setLang] = useState<Lang>('python');
  const [topic, setTopic] = useState('Popular');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Edge-to-edge page: lift the default content width cap while mounted.
  useEffect(() => {
    const main = document.querySelector('.main-content') as HTMLElement | null;
    if (!main) return;
    main.style.maxWidth = 'none';
    main.style.padding = '0';
    main.style.margin = '0';
    return () => {
      main.style.maxWidth = '';
      main.style.padding = '';
      main.style.margin = '';
    };
  }, []);

  const stats = useMemo(() => {
    const byDiff = { Easy: 0, Medium: 0, Hard: 0 };
    const byTopic = new Map<string, number>();
    PROBLEMS.forEach((p) => {
      byDiff[p.difficulty] += 1;
      byTopic.set(p.category, (byTopic.get(p.category) ?? 0) + 1);
    });
    return { byDiff, byTopic };
  }, []);

  const topics = TOPICS.filter((t) => t !== 'All' && stats.byTopic.has(t));

  const rows = useMemo(() => {
    const list =
      topic === 'Popular'
        ? POPULAR_IDS.map((id) => PROBLEMS.find((p) => p.id === id)).filter((p): p is (typeof PROBLEMS)[number] => !!p)
        : PROBLEMS.filter((p) => p.category === topic).slice(0, 8);
    return list.map((p) => ({ p, no: PROBLEMS.indexOf(p) + 1 }));
  }, [topic]);

  const twoSum = PROBLEMS.find((p) => p.id === 'two-sum');
  const code = SNIPPETS[lang];
  const total = COUNT || 1;

  return (
    <div className="ccl-page">
      {/* ── HERO ─────────────────────────────────────────── */}
      <header className="ccl-hero">
        <div className="ccl-hero-copy">
          <p className="ccl-kicker">CVMind Code · in-browser judge</p>
          <h1 className="ccl-h1">
            Write it.<br />
            Run it.<br />
            Get <span className="ccl-stamp">Accepted</span>
          </h1>
          <p className="ccl-lead">
            {COUNT} data structure and algorithm problems with an editor and a judge in the same tab. Submit, read the
            verdict, fix it, submit again. Open a hint only when you are stuck.
          </p>
          <div className="ccl-actions">
            <button className="ccl-btn ccl-btn--solid" id="btn-cvmind-code-hero" onClick={() => openArena()}>
              Open the arena <ExternalLink size={15} />
            </button>
            <button className="ccl-btn ccl-btn--text" onClick={() => openArena('roadmap')}>
              See the roadmap <ArrowRight size={15} />
            </button>
          </div>
        </div>

        <div className="ccl-hero-visual" aria-hidden="true">
          <div className="ccl-ide">
            <div className="ccl-ide-head">
              <span className="ccl-ide-title">
                <i>{(twoSum ? PROBLEMS.indexOf(twoSum) : 0) + 1}.</i> {twoSum?.title ?? 'Two Sum'}
              </span>
              <span className="ccl-ide-meta">
                <b className="ccl-d ccl-d--easy">Easy</b> {twoSum?.category ?? 'Arrays & Hashing'}
              </span>
            </div>
            <div className="ccl-files">
              {LANGS.map((l) => (
                <button key={l.id} type="button" tabIndex={-1} className={`ccl-file${lang === l.id ? ' is-on' : ''}`} onClick={() => setLang(l.id)}>
                  {l.file}
                </button>
              ))}
            </div>
            <pre className="ccl-code">
              {code.map((line, i) => (
                <span key={i} className="ccl-line"><i>{i + 1}</i>{line}{'\n'}</span>
              ))}
            </pre>
            <div className="ccl-sub-list">
              <div className="ccl-sub-title">Example session <small>{lang === 'cpp' ? 'C++ is editor-only for now' : 'what the judge sends back'}</small></div>
              {SESSION.map((s) => (
                <div key={s.run} className="ccl-sub">
                  <span className="ccl-sub-run">{s.run}</span>
                  <span className={`ccl-verdict ccl-verdict--${s.tone}`}>{s.verdict}</span>
                  <span className="ccl-sub-note">{s.note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ── SCOREBOARD ───────────────────────────────────── */}
      <section className="ccl-board" aria-label="Problem set at a glance">
        <div className="ccl-board-row">
          <span><b>{COUNT}</b> problems</span>
          <span><b>{topics.length}</b> topics</span>
          <span className="ccl-board-key"><i className="ccl-sw ccl-sw--easy" />Easy <b>{stats.byDiff.Easy}</b></span>
          <span className="ccl-board-key"><i className="ccl-sw ccl-sw--med" />Medium <b>{stats.byDiff.Medium}</b></span>
          <span className="ccl-board-key"><i className="ccl-sw ccl-sw--hard" />Hard <b>{stats.byDiff.Hard}</b></span>
        </div>
        <div className="ccl-bar" aria-hidden="true">
          <span style={{ width: `${(stats.byDiff.Easy / total) * 100}%` }} className="ccl-bar-easy" />
          <span style={{ width: `${(stats.byDiff.Medium / total) * 100}%` }} className="ccl-bar-med" />
          <span style={{ width: `${(stats.byDiff.Hard / total) * 100}%` }} className="ccl-bar-hard" />
        </div>
      </section>

      {/* ── PROBLEM SET ──────────────────────────────────── */}
      <section className="ccl-set">
        <aside className="ccl-set-side">
          <h2 className="ccl-h2">Problem set</h2>
          <p className="ccl-sub-copy">Pick a topic, then a row. It opens in the arena.</p>
          <ul className="ccl-topics">
            {['Popular', ...topics].map((t) => (
              <li key={t}>
                <button className={`ccl-topic${topic === t ? ' is-on' : ''}`} onClick={() => setTopic(t)}>
                  <span>{t}</span>
                  <em>{t === 'Popular' ? POPULAR_IDS.length : stats.byTopic.get(t)}</em>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="ccl-set-main">
          <div className="ccl-tr ccl-tr--head">
            <span>#</span>
            <span>Title</span>
            <span>Level</span>
            <span />
          </div>
          {rows.map(({ p, no }) => (
            <button key={p.id} className="ccl-tr" onClick={() => openArena('arena', p.id)}>
              <span className="ccl-td-no">{no}</span>
              <span className="ccl-td-title">{p.title}<small>{p.category}</small></span>
              <span className={`ccl-d ccl-d--${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
              <span className="ccl-td-go"><ArrowRight size={16} /></span>
            </button>
          ))}
          <button className="ccl-btn ccl-btn--text ccl-more" onClick={() => openArena('problems')}>
            All {COUNT} problems <ArrowRight size={15} />
          </button>
        </div>
      </section>

      {/* ── VERDICTS ─────────────────────────────────────── */}
      <section className="ccl-verdicts">
        <div className="ccl-verdicts-intro">
          <h2 className="ccl-h2">Five things the judge can tell you</h2>
          <p className="ccl-sub-copy">
            Same verdicts as the contest sites, so reading them is a skill you carry into a real online assessment.
          </p>
        </div>
        <dl className="ccl-vlist">
          {VERDICTS.map((v) => (
            <div key={v.name} className="ccl-vrow">
              <dt className={`ccl-verdict ccl-verdict--${v.tone}`}>{v.name}</dt>
              <dd>{v.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── EXTRAS ───────────────────────────────────────── */}
      <section className="ccl-extras">
        <h2 className="ccl-h2">Around the editor</h2>
        <dl className="ccl-xlist">
          {EXTRAS.map(([term, text]) => (
            <div key={term} className="ccl-xrow">
              <dt>{term}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="ccl-faq-wrap">
        <h2 className="ccl-h2">Before you start</h2>
        <div className="ccl-faq">
          {FAQS.map((f, i) => (
            <div key={f.q} className={`ccl-faq-item${openFaq === i ? ' is-open' : ''}`}>
              <button className="ccl-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}>
                {f.q}
                <ChevronDown size={18} />
              </button>
              {openFaq === i && <p className="ccl-faq-a">{f.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ── CLOSING ──────────────────────────────────────── */}
      <section className="ccl-close">
        <h2>Your first Accepted is one problem away.</h2>
        <button className="ccl-btn ccl-btn--go" id="btn-cvmind-code-bottom" onClick={() => openArena()}>
          Open CVMind Code <ExternalLink size={15} />
        </button>
      </section>
    </div>
  );
}
