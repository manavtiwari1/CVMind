import { useState } from 'react';
import { AlertTriangle, Bug, CheckCircle2, ChevronDown, Clock, FlaskConical, Loader2, Sparkles, Terminal, XCircle } from 'lucide-react';
import type { TestCase } from '../../../data/codingProblems';
import { formatValue, type AiDebug, type AiReview, type JudgeResult } from '../codeApi';

export type ConsoleTab = 'testcase' | 'result' | 'debug' | 'review';

export interface AiState<T> { loading: boolean; data: T | null; error: string }
export interface ResultState { kind: 'run' | 'submit'; data: JudgeResult }

interface ConsolePaneProps {
  tab: ConsoleTab;
  onTab: (tab: ConsoleTab) => void;
  collapsed: boolean;
  onToggle: () => void;
  paramNames: string[];
  cases: TestCase[];
  selected: number;
  onSelect: (index: number) => void;
  customInput: string;
  onCustomInput: (value: string) => void;
  customError: string;
  busy: 'run' | 'submit' | null;
  result: ResultState | null;
  debug: AiState<AiDebug>;
  review: AiState<AiReview>;
  onDebug: () => void;
  onReview: () => void;
  onNextProblem?: () => void;
}

function ArgList({ args, names }: { args: unknown; names: string[] }) {
  const list = Array.isArray(args) ? args : [args];
  return (
    <div className="cx-args">
      {list.map((a, i) => (
        <div key={i} className="cx-arg">
          <span>{names[i] || `arg${i + 1}`} =</span>
          <code>{formatValue(a)}</code>
        </div>
      ))}
    </div>
  );
}

function verdictTone(v: string): 'ok' | 'bad' | 'warn' {
  if (v === 'Accepted' || v === 'Completed') return 'ok';
  if (v.includes('unverified') || v === 'Preview') return 'warn';
  return 'bad';
}

export default function ConsolePane(props: ConsolePaneProps) {
  const { tab, onTab, collapsed, onToggle, paramNames, cases, selected, onSelect, customInput, onCustomInput, customError, busy, result, debug, review, onDebug, onReview, onNextProblem } = props;
  const [resultCase, setResultCase] = useState(0);

  const data = result?.data;
  const simulated = !!data?.simulated;
  const results = data?.results ?? [];
  const shownCase = results[Math.min(resultCase, Math.max(results.length - 1, 0))];
  const verdict = data ? (simulated ? 'Preview' : data.verdict) : '';
  const tone = data ? (simulated ? 'warn' : verdictTone(data.verdict)) : 'ok';

  return (
    <div className={`cx-pane cx-console${collapsed ? ' is-collapsed' : ''}`}>
      <div className="cx-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'testcase'} className={`cx-tab${tab === 'testcase' ? ' is-active' : ''}`} onClick={() => onTab('testcase')}>
          <FlaskConical size={15} /> Testcase
        </button>
        <button type="button" role="tab" aria-selected={tab === 'result'} className={`cx-tab${tab === 'result' ? ' is-active' : ''}`} onClick={() => onTab('result')}>
          <Terminal size={15} /> Result
          {data && <i className={`cx-dot cx-dot--${tone}`} />}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'debug'} className={`cx-tab${tab === 'debug' ? ' is-active' : ''}`} onClick={() => onTab('debug')}>
          <Bug size={15} /> AI Debug
        </button>
        <button type="button" role="tab" aria-selected={tab === 'review'} className={`cx-tab${tab === 'review' ? ' is-active' : ''}`} onClick={() => onTab('review')}>
          <Sparkles size={15} /> AI Review
        </button>
        <button type="button" className="cx-icon-btn cx-console-toggle" onClick={onToggle} aria-label={collapsed ? 'Expand console' : 'Collapse console'} aria-expanded={!collapsed}>
          <ChevronDown size={16} className={collapsed ? 'is-flipped' : ''} />
        </button>
      </div>

      {!collapsed && (
        <div className="cx-pane-body cx-console-body">
          {tab === 'testcase' && (
            <div>
              <div className="cx-case-chips">
                {cases.map((_, i) => (
                  <button key={i} type="button" className={`cx-case${selected === i ? ' is-active' : ''}`} onClick={() => onSelect(i)}>Case {i + 1}</button>
                ))}
                <button type="button" className={`cx-case${selected === -1 ? ' is-active' : ''}`} onClick={() => onSelect(-1)}>Custom</button>
              </div>
              {selected >= 0 && cases[selected] && (
                <div className="cx-case-detail">
                  <label>Input</label>
                  <ArgList args={cases[selected].input} names={paramNames} />
                  <label>Expected output</label>
                  <div className="cx-value cx-value--ok">{formatValue(cases[selected].expected)}</div>
                </div>
              )}
              {selected === -1 && (
                <div className="cx-case-detail">
                  <label htmlFor="cx-custom">Custom input: a JSON array with one item per argument{paramNames.length ? ` (${paramNames.join(', ')})` : ''}</label>
                  <textarea
                    id="cx-custom"
                    className="cx-textarea"
                    value={customInput}
                    onChange={(e) => onCustomInput(e.target.value)}
                    placeholder='[[2, 7, 11, 15], 9]'
                    rows={3}
                    spellCheck={false}
                  />
                  {customError && <div className="cx-alert cx-alert--error" role="alert">{customError}</div>}
                  <p className="cx-muted-text">Press Run to see your output. Custom inputs have no expected value.</p>
                </div>
              )}
            </div>
          )}

          {tab === 'result' && (
            <div>
              {busy && (
                <div className="cx-busy"><Loader2 size={18} className="cx-spin" /> {busy === 'run' ? 'Running your code…' : 'Judging your submission…'}</div>
              )}
              {!busy && !data && (
                <div className="cx-empty">
                  <h3>Nothing to show yet</h3>
                  <p>Press <b>Run</b> to test your code on the sample cases, or <b>Submit</b> to judge it on all tests.</p>
                </div>
              )}
              {!busy && data && (
                <div>
                  <div className={`cx-verdict cx-verdict--${tone}`}>
                    <div className="cx-verdict-main">
                      {tone === 'ok' ? <CheckCircle2 size={22} /> : tone === 'warn' ? <AlertTriangle size={22} /> : <XCircle size={22} />}
                      <h2>{verdict}</h2>
                      {data.runtimeMs !== undefined && !simulated && (
                        <span className="cx-verdict-stat"><Clock size={14} /> {data.runtimeMs} ms</span>
                      )}
                    </div>
                    {result?.kind === 'submit' && data.totalTests !== undefined && !simulated && (
                      <p>{data.passedTests ?? 0} / {data.totalTests} testcases passed</p>
                    )}
                    {result?.kind === 'run' && results.length > 0 && !simulated && (
                      <p>{results.filter((r) => r.passed || r.expected === null).length} / {results.length} cases passed</p>
                    )}
                  </div>

                  {simulated && (
                    <div className="cx-alert cx-alert--warn" role="status">
                      <AlertTriangle size={16} />
                      <div>
                        <b>This was not judged.</b> {data.error || 'The server cannot run this language right now.'}{' '}
                        It is not recorded as solved. Pick another language from CVMind Code home to get a real result.
                      </div>
                    </div>
                  )}

                  {data.error && !simulated && <pre className="cx-error-block">{data.error}</pre>}

                  {!simulated && result?.kind === 'submit' && data.verdict === 'Accepted' && onNextProblem && (
                    <button type="button" className="cx-btn cx-btn--primary" onClick={onNextProblem}>Next problem</button>
                  )}

                  {!simulated && results.length > 0 && (
                    <>
                      <div className="cx-case-chips">
                        {results.map((r, i) => (
                          <button key={i} type="button" className={`cx-case${resultCase === i ? ' is-active' : ''}`} onClick={() => setResultCase(i)}>
                            <i className={`cx-dot cx-dot--${r.passed || r.expected === null ? 'ok' : 'bad'}`} /> Case {i + 1}
                          </button>
                        ))}
                      </div>
                      {shownCase && (
                        <div className="cx-case-detail">
                          <label>Input</label>
                          <ArgList args={shownCase.input} names={paramNames} />
                          <label>Your output</label>
                          <div className={`cx-value ${shownCase.passed || shownCase.expected === null ? 'cx-value--ok' : 'cx-value--bad'}`}>{formatValue(shownCase.actual)}</div>
                          {shownCase.expected !== null && shownCase.expected !== undefined && (
                            <>
                              <label>Expected output</label>
                              <div className="cx-value">{formatValue(shownCase.expected)}</div>
                            </>
                          )}
                          {shownCase.error && <pre className="cx-error-block">{shownCase.error}</pre>}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'debug' && (
            <div>
              {!debug.data && !debug.loading && (
                <div className="cx-empty">
                  <h3>Stuck on a failing case?</h3>
                  <p>The AI reads your code and your latest result and points to the likely cause without giving away the solution.</p>
                  <button type="button" className="cx-btn cx-btn--primary" onClick={onDebug}><Bug size={15} /> Analyze my code</button>
                </div>
              )}
              {debug.loading && <div className="cx-busy"><Loader2 size={18} className="cx-spin" /> Looking at your logic…</div>}
              {debug.error && <div className="cx-alert cx-alert--error" role="alert">{debug.error}</div>}
              {debug.data && (
                <div className="cx-ai-card">
                  <h3>{debug.data.summary}</h3>
                  <p><b>Likely cause:</b> {debug.data.probableCause}</p>
                  <p><b>Suggested fix:</b> {debug.data.suggestedFix}</p>
                  <div className="cx-insight"><b>Edge case to try:</b> {debug.data.edgeCaseToTest}</div>
                  <button type="button" className="cx-btn cx-btn--sm" onClick={onDebug}>Analyze again</button>
                </div>
              )}
            </div>
          )}

          {tab === 'review' && (
            <div>
              {!review.data && !review.loading && (
                <div className="cx-empty">
                  <h3>Get a code review</h3>
                  <p>Check time and space complexity, readability and possible improvements.</p>
                  <button type="button" className="cx-btn cx-btn--primary" onClick={onReview}><Sparkles size={15} /> Review my code</button>
                </div>
              )}
              {review.loading && <div className="cx-busy"><Loader2 size={18} className="cx-spin" /> Reviewing your solution…</div>}
              {review.error && <div className="cx-alert cx-alert--error" role="alert">{review.error}</div>}
              {review.data && (
                <div className="cx-ai-card">
                  <div className="cx-review-stats">
                    <div><small>Verdict</small><b>{review.data.verdict}</b></div>
                    <div><small>Time</small><b>{review.data.timeComplexity}</b></div>
                    <div><small>Space</small><b>{review.data.spaceComplexity}</b></div>
                    <div><small>Quality</small><b>{review.data.qualityScore}/100</b></div>
                  </div>
                  {review.data.strengths && review.data.strengths.length > 0 && (
                    <><h4>Strengths</h4><ul>{review.data.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></>
                  )}
                  {review.data.optimizations && review.data.optimizations.length > 0 && (
                    <><h4>Could be better</h4><ul>{review.data.optimizations.map((s, i) => <li key={i}>{s}</li>)}</ul></>
                  )}
                  <button type="button" className="cx-btn cx-btn--sm" onClick={onReview}>Review again</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
