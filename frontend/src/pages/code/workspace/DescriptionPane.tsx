import { useState } from 'react';
import { BookOpen, Building2, Check, ChevronDown, History, Lock, Sparkles, Undo2 } from 'lucide-react';
import type { CodingProblem } from '../../../data/codingProblems';
import type { AiHint } from '../codeApi';
import { timeAgo, type SubmissionRecord } from '../codeStore';
import RichText from '../RichText';

export type LeftTab = 'description' | 'submissions' | 'mentor';

interface DescriptionPaneProps {
  problem: CodingProblem;
  number: number;
  solved: boolean;
  tab: LeftTab;
  onTab: (tab: LeftTab) => void;
  submissions: SubmissionRecord[];
  onRestore: (code: string, language: string) => void;
  hints: Record<number, AiHint>;
  loadingLevel: number | null;
  hintError: string;
  onRequestHint: (level: number) => void;
}

const TIERS = [
  { level: 1, label: 'Concept', blurb: 'The idea behind the problem' },
  { level: 2, label: 'Approach', blurb: 'A direction to start from' },
  { level: 3, label: 'Algorithm', blurb: 'The steps of the solution' },
  { level: 4, label: 'Pseudocode', blurb: 'Language-independent outline' },
  { level: 5, label: 'Explanation', blurb: 'Why it works and its complexity' },
  { level: 6, label: 'Full solution', blurb: 'Shows the complete answer' },
];

function verdictClass(v: string) {
  return v.startsWith('Accepted') ? 'is-ok' : 'is-bad';
}

export default function DescriptionPane({
  problem, number, solved, tab, onTab, submissions, onRestore, hints, loadingLevel, hintError, onRequestHint,
}: DescriptionPaneProps) {
  const [openSub, setOpenSub] = useState<string | null>(null);
  const [showCompanies, setShowCompanies] = useState(false);

  return (
    <div className="cx-pane cx-left">
      <div className="cx-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'description'} className={`cx-tab${tab === 'description' ? ' is-active' : ''}`} onClick={() => onTab('description')}>
          <BookOpen size={15} /> Description
        </button>
        <button type="button" role="tab" aria-selected={tab === 'submissions'} className={`cx-tab${tab === 'submissions' ? ' is-active' : ''}`} onClick={() => onTab('submissions')}>
          <History size={15} /> Submissions{submissions.length > 0 && <span className="cx-count">{submissions.length}</span>}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'mentor'} className={`cx-tab${tab === 'mentor' ? ' is-active' : ''}`} onClick={() => onTab('mentor')}>
          <Sparkles size={15} /> AI Mentor
        </button>
      </div>

      <div className="cx-pane-body">
        {tab === 'description' && (
          <article>
            <h1 className="cx-problem-title">{number}. {problem.title}</h1>
            <div className="cx-problem-meta">
              <span className={`cx-pill cx-pill--${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
              <span className="cx-tag">{problem.category}</span>
              {solved && <span className="cx-pill cx-pill--solved"><Check size={12} /> Solved</span>}
              {problem.isAiGenerated && <span className="cx-tag cx-tag--ai"><Sparkles size={11} /> AI generated</span>}
            </div>

            <RichText text={problem.description} />

            {problem.examples?.map((ex, i) => (
              <section key={i} className="cx-example">
                <h4>Example {i + 1}</h4>
                <div className="cx-example-box">
                  <div><b>Input:</b> <code>{ex.input}</code></div>
                  <div><b>Output:</b> <code>{ex.output}</code></div>
                  {ex.explanation && <div><b>Explanation:</b> {ex.explanation}</div>}
                </div>
              </section>
            ))}

            {problem.constraints?.length > 0 && (
              <section className="cx-constraints">
                <h4>Constraints</h4>
                <ul>
                  {problem.constraints.map((c, i) => <li key={i}><code>{c}</code></li>)}
                </ul>
              </section>
            )}

            {problem.companies?.length > 0 && (
              <section className="cx-disclosure">
                <button type="button" onClick={() => setShowCompanies((v) => !v)} aria-expanded={showCompanies}>
                  <Building2 size={15} /> Companies <span className="cx-count">{problem.companies.length}</span>
                  <ChevronDown size={15} className={showCompanies ? 'is-open' : ''} />
                </button>
                {showCompanies && (
                  <div className="cx-company-list">
                    {problem.companies.map((c) => <span key={c} className="cx-tag">{c}</span>)}
                  </div>
                )}
              </section>
            )}
          </article>
        )}

        {tab === 'submissions' && (
          <div>
            {submissions.length === 0 ? (
              <div className="cx-empty">
                <h3>No submissions yet</h3>
                <p>Write your solution and press Submit. Your attempts will be listed here.</p>
              </div>
            ) : (
              <ul className="cx-sub-list">
                {submissions.map((s) => (
                  <li key={s.id} className="cx-sub">
                    <button type="button" className="cx-sub-row" onClick={() => setOpenSub(openSub === s.id ? null : s.id)} aria-expanded={openSub === s.id}>
                      <span className={`cx-sub-verdict ${verdictClass(s.verdict)}`}>{s.verdict}</span>
                      <span className="cx-sub-meta">{s.language}</span>
                      <span className="cx-sub-meta">{s.runtimeMs != null ? `${s.runtimeMs} ms` : '-'}</span>
                      <span className="cx-sub-time">{timeAgo(s.at)}</span>
                    </button>
                    {openSub === s.id && (
                      <div className="cx-sub-detail">
                        <div className="cx-sub-tests">{s.passedTests ?? 0} / {s.totalTests ?? 0} testcases passed</div>
                        {s.code ? (
                          <>
                            <pre className="cx-pre"><code>{s.code}</code></pre>
                            <button type="button" className="cx-btn cx-btn--sm" onClick={() => onRestore(s.code as string, s.language)}>
                              <Undo2 size={14} /> Restore this code
                            </button>
                          </>
                        ) : (
                          <p className="cx-muted-text">The code for older submissions is not kept.</p>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'mentor' && (
          <div className="cx-mentor">
            <h2>AI Mentor</h2>
            <p className="cx-muted-text">Unlock guidance one step at a time. Start at the top and stop as soon as you are unstuck.</p>
            <ol className="cx-tiers">
              {TIERS.map((t) => {
                const hint = hints[t.level];
                const loading = loadingLevel === t.level;
                const locked = !hint && t.level > 1 && !hints[t.level - 1];
                return (
                  <li key={t.level} className={`cx-tier${hint ? ' is-open' : ''}`}>
                    <div className="cx-tier-head">
                      <span className="cx-tier-num">{t.level}</span>
                      <div>
                        <b>{t.label}</b>
                        <small>{t.blurb}</small>
                      </div>
                      {!hint && (
                        <button type="button" className="cx-btn cx-btn--sm" disabled={locked || loading} onClick={() => onRequestHint(t.level)}>
                          {locked ? <><Lock size={13} /> Locked</> : loading ? 'Thinking…' : 'Reveal'}
                        </button>
                      )}
                    </div>
                    {hint && (
                      <div className="cx-tier-body">
                        <RichText text={hint.hint} />
                        {hint.keyInsight && <div className="cx-insight"><b>Key idea:</b> {hint.keyInsight}</div>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            {hintError && <div className="cx-alert cx-alert--error" role="alert">{hintError}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
