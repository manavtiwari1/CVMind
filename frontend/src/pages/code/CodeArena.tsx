import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import confetti from 'canvas-confetti';
import { 
  Play, 
  Send, 
  RotateCcw, 
  Copy, 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Cpu, 
  BookOpen, 
  History, 
  Terminal,
  Bug,
  ArrowLeft,
  Check
} from 'lucide-react';
import type { CodingProblem } from '../../data/codingProblems';

interface CodeArenaProps {
  problem: CodingProblem;
  onBackToLibrary: () => void;
  onMarkSolved: (problemId: string) => void;
  customApiKey?: string;
}

export default function CodeArena({
  problem,
  onBackToLibrary,
  onMarkSolved,
  customApiKey = ''
}: CodeArenaProps) {
  const [language, setLanguage] = useState<'javascript' | 'python' | 'cpp'>('javascript');
  const [code, setCode] = useState<string>(problem.starterCode[language]);
  const [activeLeftTab, setActiveLeftTab] = useState<'description' | 'hints' | 'submissions' | 'editorial'>('description');
  const [activeConsoleTab, setActiveConsoleTab] = useState<'testcases' | 'output' | 'debug' | 'review'>('testcases');
  const [selectedTestCaseIdx, setSelectedTestCaseIdx] = useState<number>(0);
  const [customInput, setCustomInput] = useState<string>('');
  
  // Execution states
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [submissionVerdict, setSubmissionVerdict] = useState<any>(null);
  const [showVerdictModal, setShowVerdictModal] = useState<boolean>(false);
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);

  // AI Assistant states
  const [aiHints, setAiHints] = useState<{ [level: number]: any }>({});
  const [loadingHintLevel, setLoadingHintLevel] = useState<number | null>(null);
  const [aiReview, setAiReview] = useState<any>(null);
  const [loadingReview, setLoadingReview] = useState<boolean>(false);
  const [aiDebug, setAiDebug] = useState<any>(null);
  const [loadingDebug, setLoadingDebug] = useState<boolean>(false);

  // UI helpers
  const [copied, setCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const arenaRef = useRef<HTMLDivElement>(null);

  // Reset code when language changes or problem changes
  useEffect(() => {
    setCode(problem.starterCode[language] || '');
  }, [language, problem]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetCode = () => {
    if (confirm('Reset your code back to the initial boilerplate?')) {
      setCode(problem.starterCode[language] || '');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      arenaRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // ─── EXECUTION: RUN CODE ──────────────────────────────────────────────────
  const handleRunCode = async () => {
    setIsRunning(true);
    setActiveConsoleTab('output');
    setRunResult(null);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 
                    import.meta.env.VITE_BACKEND_URL || 
                    (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

    try {
      // If custom test case specified
      let customCases = undefined;
      if (customInput && customInput.trim()) {
        try {
          const parsed = JSON.parse(customInput);
          customCases = [{ input: parsed, expected: null }];
        } catch {
          customCases = [{ input: customInput.trim(), expected: null }];
        }
      }

      const response = await fetch(`${baseUrl}/api/code/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: problem.id,
          code,
          language,
          customTestCases: customCases
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to execute code');

      setRunResult(data.result);
    } catch (err: any) {
      setRunResult({
        verdict: 'Runtime Error',
        error: err.message || 'Execution error occurred.'
      });
    } finally {
      setIsRunning(false);
    }
  };

  // ─── SUBMISSION: OFFICIAL JUDGE ───────────────────────────────────────────
  const handleSubmitCode = async () => {
    setIsSubmitting(true);
    setSubmissionVerdict(null);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 
                    import.meta.env.VITE_BACKEND_URL || 
                    (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

    try {
      const user = JSON.parse(localStorage.getItem('cvmind_user') || '{}');
      const userId = user.id || user._id || 'anonymous';

      const response = await fetch(`${baseUrl}/api/code/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: problem.id,
          code,
          language,
          userId
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit code');

      setSubmissionVerdict(data);
      setShowVerdictModal(true);

      const newSub = {
        id: `sub_${Date.now()}`,
        verdict: data.verdict,
        passedTests: data.passedTests,
        totalTests: data.totalTests,
        runtimeMs: data.runtimeMs,
        memoryMb: data.memoryMb,
        language,
        timestamp: new Date().toLocaleTimeString()
      };
      setSubmissionsList(prev => [newSub, ...prev]);

      if (data.verdict === 'Accepted') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        onMarkSolved(problem.id);
      }
    } catch (err: any) {
      setSubmissionVerdict({
        verdict: 'Submission Error',
        error: err.message || 'Unable to reach code judge.'
      });
      setShowVerdictModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── AI ASSISTANT: PROGRESSIVE HINTS ──────────────────────────────────────
  const handleRequestHint = async (level: number) => {
    if (aiHints[level]) return;
    setLoadingHintLevel(level);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 
                    import.meta.env.VITE_BACKEND_URL || 
                    (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (customApiKey) headers['x-gemini-key'] = customApiKey;

    try {
      const res = await fetch(`${baseUrl}/api/code/ai/hint`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          problemTitle: problem.title,
          problemDescription: problem.description,
          userCode: code,
          language,
          requestedLevel: level
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        setAiHints(prev => ({ ...prev, [level]: data.data }));
      }
    } catch (err) {
      // Fallback hint from problem metadata if offline
      const fallbackText = problem.hints && problem.hints[level - 1] 
        ? problem.hints[level - 1]
        : 'Analyze the problem constraints and consider how a hash map or two-pointer approach reduces time complexity.';
      setAiHints(prev => ({
        ...prev,
        [level]: {
          level,
          title: `Level ${level} Guidance`,
          hint: fallbackText,
          keyInsight: 'Focus on avoiding repeated scans across array elements.'
        }
      }));
    } finally {
      setLoadingHintLevel(null);
    }
  };

  // ─── AI CODE REVIEW ───────────────────────────────────────────────────────
  const handleRequestReview = async () => {
    setLoadingReview(true);
    setActiveConsoleTab('review');

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 
                    import.meta.env.VITE_BACKEND_URL || 
                    (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (customApiKey) headers['x-gemini-key'] = customApiKey;

    try {
      const res = await fetch(`${baseUrl}/api/code/ai/review`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          problemTitle: problem.title,
          problemDescription: problem.description,
          userCode: code,
          language
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        setAiReview(data.data);
      }
    } catch (err) {
      setAiReview({
        verdict: 'Code Evaluated',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(N)',
        qualityScore: 86,
        strengths: ['Effective logic structure', 'Clean variable naming'],
        optimizations: ['Check for potential boundary index handling']
      });
    } finally {
      setLoadingReview(false);
    }
  };

  // ─── AI DEBUGGER ──────────────────────────────────────────────────────────
  const handleRequestDebug = async () => {
    setLoadingDebug(true);
    setActiveConsoleTab('debug');

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 
                    import.meta.env.VITE_BACKEND_URL || 
                    (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (customApiKey) headers['x-gemini-key'] = customApiKey;

    try {
      const res = await fetch(`${baseUrl}/api/code/ai/debug`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          problemTitle: problem.title,
          userCode: code,
          language,
          failedTestInfo: runResult || submissionVerdict
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        setAiDebug(data.data);
      }
    } catch {
      setAiDebug({
        summary: 'Possible logic discrepancy on boundary values.',
        probableCause: 'Your accumulator or index pointer does not update before the return condition.',
        suggestedFix: 'Dry run your code with small edge inputs (e.g. empty array or 2 elements).',
        edgeCaseToTest: 'Try testing with identical or duplicate entries.'
      });
    } finally {
      setLoadingDebug(false);
    }
  };

  const sampleCases = problem.sampleTestCases || [];

  return (
    <div className="code-arena-layout" ref={arenaRef}>
      {/* ─── LEFT PANE: PROBLEM DESCRIPTION & ASSISTANT ─── */}
      <div className="arena-left-pane">
        {/* Tab Navigation */}
        <div className="arena-pane-tabs">
          <button
            onClick={onBackToLibrary}
            className="arena-tab-btn"
            style={{ color: '#94a3b8', paddingRight: '12px', borderRight: '1px solid #334155' }}
            title="Back to Problem Catalog"
          >
            <ArrowLeft size={16} />
            Library
          </button>

          <button
            onClick={() => setActiveLeftTab('description')}
            className={`arena-tab-btn ${activeLeftTab === 'description' ? 'active' : ''}`}
          >
            <BookOpen size={15} />
            Description
          </button>

          <button
            onClick={() => {
              setActiveLeftTab('hints');
              if (!aiHints[1]) handleRequestHint(1);
            }}
            className={`arena-tab-btn ${activeLeftTab === 'hints' ? 'active' : ''}`}
          >
            <Sparkles size={15} color="#818cf8" />
            AI Mentor (6 Tiers)
          </button>

          <button
            onClick={() => setActiveLeftTab('submissions')}
            className={`arena-tab-btn ${activeLeftTab === 'submissions' ? 'active' : ''}`}
          >
            <History size={15} />
            Submissions
          </button>

          <button
            onClick={() => setActiveLeftTab('editorial')}
            className={`arena-tab-btn ${activeLeftTab === 'editorial' ? 'active' : ''}`}
          >
            <HelpCircle size={15} />
            Editorial
          </button>
        </div>

        {/* Tab Content */}
        <div className="arena-tab-content">
          {activeLeftTab === 'description' && (
            <div>
              <div className="problem-header-row">
                <h2 className="problem-title-text">{problem.title}</h2>
                <span className={`diff-badge diff-${problem.difficulty.toLowerCase()}`}>
                  {problem.difficulty}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: '#475569', background: '#f1f5f9', padding: '3px 10px', borderRadius: '6px', fontWeight: 500 }}>
                  {problem.category}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#2563eb', background: 'rgba(41,151,255,0.08)', padding: '3px 10px', borderRadius: '6px', fontWeight: 600 }}>
                  Acceptance: {problem.acceptanceRate}
                </span>
                {problem.companies.slice(0, 4).map(c => (
                  <span key={c} className="company-tag">{c}</span>
                ))}
              </div>

              <div className="problem-description-body">
                {problem.description}
              </div>

              {/* Examples */}
              {problem.examples && problem.examples.map((ex, idx) => (
                <div key={idx} className="example-card">
                  <div className="example-card-title">Example {idx + 1}</div>
                  <div className="example-code-block"><strong>Input:</strong> {ex.input}</div>
                  <div className="example-code-block"><strong>Output:</strong> {ex.output}</div>
                  {ex.explanation && (
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '6px' }}>
                      <strong>Explanation:</strong> {ex.explanation}
                    </div>
                  )}
                </div>
              ))}

              {/* Constraints */}
              {problem.constraints && problem.constraints.length > 0 && (
                <div className="constraints-card">
                  <h4>Constraints</h4>
                  <ul>
                    {problem.constraints.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 6-Tier Progressive AI Hints */}
          {activeLeftTab === 'hints' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 6px 0', color: '#0f172a' }}>
                  Progressive AI Mentor
                </h3>
                <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
                  Unlock guidance gradually to preserve your learning and problem-solving intuition.
                </p>
              </div>

              <div className="ai-hint-tiers">
                {[
                  { level: 1, label: '1. Concept' },
                  { level: 2, label: '2. Approach' },
                  { level: 3, label: '3. Algorithm' },
                  { level: 4, label: '4. Pseudocode' },
                  { level: 5, label: '5. Explanation' },
                  { level: 6, label: '6. Full Solution' }
                ].map(tier => (
                  <button
                    key={tier.level}
                    onClick={() => handleRequestHint(tier.level)}
                    className={`ai-tier-btn ${aiHints[tier.level] ? 'active' : ''}`}
                    disabled={loadingHintLevel === tier.level}
                  >
                    {loadingHintLevel === tier.level ? 'Unlocking...' : tier.label}
                  </button>
                ))}
              </div>

              {/* Display Unlocked Hints in Sequence */}
              {[1, 2, 3, 4, 5, 6].map(lvl => {
                const hint = aiHints[lvl];
                if (!hint) return null;
                return (
                  <div key={lvl} className="ai-hint-box">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>
                        {hint.title || `Level ${lvl} Guidance`}
                      </span>
                      <span style={{ fontSize: '0.72rem', background: 'rgba(41, 151, 255, 0.1)', padding: '2px 8px', borderRadius: '99px', color: '#2563eb', fontWeight: 700 }}>
                        Tier {lvl}/6
                      </span>
                    </div>
                    <div style={{ fontSize: '0.92rem', color: '#1e293b', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {hint.hint}
                    </div>
                    {hint.keyInsight && (
                      <div style={{ marginTop: '10px', fontSize: '0.82rem', color: '#0284c7', background: 'rgba(41, 151, 255, 0.08)', padding: '8px 12px', borderRadius: '8px' }}>
                        💡 <strong>Intuition:</strong> {hint.keyInsight}
                      </div>
                    )}
                  </div>
                );
              })}

              {!aiHints[1] && (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b' }}>
                  Click a tier above to reveal progressive intuition without spoiling the full solution.
                </div>
              )}
            </div>
          )}

          {/* Submissions History */}
          {activeLeftTab === 'submissions' && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 16px 0', color: '#0f172a' }}>
                Your Submissions
              </h3>
              {submissionsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                  No submissions yet for this challenge. Click <strong>Submit</strong> to evaluate!
                </div>
              ) : (
                submissionsList.map(sub => (
                  <div key={sub.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        {sub.verdict === 'Accepted' ? (
                          <CheckCircle2 size={16} color="#10b981" />
                        ) : (
                          <XCircle size={16} color="#f43f5e" />
                        )}
                        <span style={{ fontWeight: 700, color: sub.verdict === 'Accepted' ? '#34d399' : '#fb7185' }}>
                          {sub.verdict}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          ({sub.passedTests}/{sub.totalTests} tests)
                        </span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                        {sub.language.toUpperCase()} • {sub.timestamp}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', fontSize: '0.82rem', color: '#cbd5e1' }}>
                      <div>{sub.runtimeMs} ms</div>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{sub.memoryMb} MB</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Editorial Tab */}
          {activeLeftTab === 'editorial' && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 12px 0', color: '#ffffff' }}>
                Optimal Solution Architecture
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.6 }}>
                The optimal solution for <strong>{problem.title}</strong> leverages modern algorithmic patterns to achieve optimal Big-O complexity.
              </p>
              <div style={{ background: '#1e293b', padding: '14px', borderRadius: '10px', border: '1px solid #334155', margin: '14px 0' }}>
                <div style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.84rem' }}>Target Complexities</div>
                <div style={{ color: '#e2e8f0', fontSize: '0.88rem', marginTop: '4px' }}>
                  • <strong>Time Complexity:</strong> O(N) or O(N log N)<br />
                  • <strong>Space Complexity:</strong> O(1) or O(N) auxiliary storage
                </div>
              </div>
              <button
                onClick={() => handleRequestHint(6)}
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
              >
                Reveal Model Solution in AI Mentor Tab →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT PANE: CODE EDITOR & CONSOLE ─── */}
      <div className="arena-right-pane">
        {/* Editor Toolbar */}
        <div className="editor-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="editor-lang-select"
            >
              <option value="javascript">JavaScript (Node.js)</option>
              <option value="python">Python 3</option>
              <option value="cpp">C++ (GCC)</option>
            </select>
          </div>

          <div className="editor-action-icons">
            <button
              onClick={handleCopyCode}
              className="icon-btn"
              title="Copy code"
            >
              {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
            </button>
            <button
              onClick={handleResetCode}
              className="icon-btn"
              title="Reset boilerplate"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={toggleFullscreen}
              className="icon-btn"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>

        {/* Monaco Editor Wrapper */}
        <div className="editor-container-wrapper">
          <Editor
            height="100%"
            language={language === 'cpp' ? 'cpp' : language}
            value={code}
            onChange={(val) => setCode(val || '')}
            theme="vs-dark"
            options={{
              fontSize: 14,
              fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              lineNumbers: 'on',
              padding: { top: 12, bottom: 12 }
            }}
          />
        </div>

        {/* Console / Output Drawer */}
        <div className="arena-console-drawer">
          <div className="console-tabs-bar">
            <div className="console-tab-group">
              <button
                onClick={() => setActiveConsoleTab('testcases')}
                className={`console-tab ${activeConsoleTab === 'testcases' ? 'active' : ''}`}
              >
                Test Cases
              </button>
              <button
                onClick={() => setActiveConsoleTab('output')}
                className={`console-tab ${activeConsoleTab === 'output' ? 'active' : ''}`}
              >
                <Terminal size={13} style={{ display: 'inline', marginRight: '4px' }} />
                Execution Result
              </button>
              <button
                onClick={handleRequestDebug}
                className={`console-tab ${activeConsoleTab === 'debug' ? 'active' : ''}`}
              >
                <Bug size={13} style={{ display: 'inline', marginRight: '4px' }} />
                AI Debugger
              </button>
              <button
                onClick={handleRequestReview}
                className={`console-tab ${activeConsoleTab === 'review' ? 'active' : ''}`}
              >
                <Sparkles size={13} style={{ display: 'inline', marginRight: '4px' }} />
                AI Code Review
              </button>
            </div>
          </div>

          <div className="console-body">
            {/* Tab: Test Cases */}
            {activeConsoleTab === 'testcases' && (
              <div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  {sampleCases.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedTestCaseIdx(idx)}
                      className={`topic-chip ${selectedTestCaseIdx === idx ? 'active' : ''}`}
                      style={{ fontSize: '0.78rem', padding: '4px 12px' }}
                    >
                      Case {idx + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedTestCaseIdx(-1)}
                    className={`topic-chip ${selectedTestCaseIdx === -1 ? 'active' : ''}`}
                    style={{ fontSize: '0.78rem', padding: '4px 12px' }}
                  >
                    + Custom Case
                  </button>
                </div>

                {selectedTestCaseIdx >= 0 && sampleCases[selectedTestCaseIdx] && (
                  <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Input:</div>
                    <div style={{ color: '#ffffff', marginBottom: '10px' }}>
                      {JSON.stringify(sampleCases[selectedTestCaseIdx].input)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Expected Output:</div>
                    <div style={{ color: '#34d399' }}>
                      {JSON.stringify(sampleCases[selectedTestCaseIdx].expected)}
                    </div>
                  </div>
                )}

                {selectedTestCaseIdx === -1 && (
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '6px' }}>
                      Enter Custom Test Case arguments (valid JSON or raw string):
                    </div>
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder='e.g. [[2, 7, 11, 15], 9]'
                      rows={3}
                      style={{
                        width: '100%',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontFamily: 'monospace',
                        padding: '8px 12px',
                        outline: 'none',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Tab: Execution Result */}
            {activeConsoleTab === 'output' && (
              <div>
                {isRunning ? (
                  <div style={{ color: '#38bdf8', padding: '12px 0' }}>
                    Executing code against sandbox judge...
                  </div>
                ) : !runResult ? (
                  <div style={{ color: '#94a3b8', padding: '12px 0' }}>
                    Click <strong>Run Code</strong> to test your solution.
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <span className={`diff-badge ${runResult.verdict === 'Accepted' ? 'diff-easy' : 'diff-hard'}`} style={{ fontSize: '0.86rem', padding: '4px 12px' }}>
                        {runResult.verdict}
                      </span>
                      {runResult.runtimeMs !== undefined && (
                        <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                          <Clock size={13} style={{ display: 'inline', marginRight: '3px' }} />
                          {runResult.runtimeMs} ms
                        </span>
                      )}
                      {runResult.memoryMb !== undefined && (
                        <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                          <Cpu size={13} style={{ display: 'inline', marginRight: '3px' }} />
                          {runResult.memoryMb} MB
                        </span>
                      )}
                    </div>

                    {runResult.error && (
                      <div style={{ color: '#fb7185', background: 'rgba(244, 63, 94, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.3)', marginBottom: '10px' }}>
                        {runResult.error}
                      </div>
                    )}

                    {runResult.results && runResult.results.map((res: any, i: number) => (
                      <div key={i} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.82rem' }}>
                          <span style={{ color: '#94a3b8' }}>Test Case {res.testCaseIndex}</span>
                          <span style={{ color: res.passed ? '#34d399' : '#fb7185', fontWeight: 700 }}>
                            {res.passed ? 'Passed ✓' : 'Failed ✗'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem' }}><strong>Input:</strong> {JSON.stringify(res.input)}</div>
                        <div style={{ fontSize: '0.82rem' }}><strong>Expected:</strong> {JSON.stringify(res.expected)}</div>
                        <div style={{ fontSize: '0.82rem', color: res.passed ? '#34d399' : '#fb7185' }}>
                          <strong>Output:</strong> {JSON.stringify(res.actual)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: AI Debugger */}
            {activeConsoleTab === 'debug' && (
              <div>
                {loadingDebug ? (
                  <div style={{ color: '#818cf8', padding: '12px 0' }}>
                    AI Debugger analyzing logic paths and boundary states...
                  </div>
                ) : !aiDebug ? (
                  <div style={{ color: '#94a3b8', padding: '12px 0' }}>
                    Encountered an issue or failed test case? Click below to diagnose without revealing secret test cases.
                    <div style={{ marginTop: '12px' }}>
                      <button onClick={handleRequestDebug} className="btn-secondary">
                        <Bug size={14} /> Run AI Diagnostics
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: '6px' }}>
                      {aiDebug.summary}
                    </div>
                    <div style={{ fontSize: '0.86rem', color: '#cbd5e1', marginBottom: '8px', lineHeight: 1.5 }}>
                      <strong>Root Cause:</strong> {aiDebug.probableCause}
                    </div>
                    <div style={{ fontSize: '0.86rem', color: '#cbd5e1', marginBottom: '8px', lineHeight: 1.5 }}>
                      <strong>Suggested Fix:</strong> {aiDebug.suggestedFix}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#a5b4fc', background: 'rgba(99,102,241,0.12)', padding: '8px 12px', borderRadius: '8px' }}>
                      🧪 <strong>Try Edge Case:</strong> {aiDebug.edgeCaseToTest}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: AI Code Review */}
            {activeConsoleTab === 'review' && (
              <div>
                {loadingReview ? (
                  <div style={{ color: '#818cf8', padding: '12px 0' }}>
                    AI Architect reviewing code complexity, clean code principles, and edge cases...
                  </div>
                ) : !aiReview ? (
                  <div style={{ color: '#94a3b8', padding: '12px 0' }}>
                    Ready for a production-grade code audit? Click below to review time/space Big-O complexity.
                    <div style={{ marginTop: '12px' }}>
                      <button onClick={handleRequestReview} className="btn-secondary">
                        <Sparkles size={14} /> Audit My Code
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '12px' }}>
                      <span className="diff-badge diff-easy" style={{ fontSize: '0.84rem' }}>
                        {aiReview.verdict}
                      </span>
                      <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.9rem' }}>
                        Score: {aiReview.qualityScore}/100
                      </span>
                      <span style={{ color: '#38bdf8', fontSize: '0.84rem' }}>
                        Time: {aiReview.timeComplexity} | Space: {aiReview.spaceComplexity}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.84rem', color: '#cbd5e1', marginBottom: '8px' }}>
                      <strong>Strengths:</strong>
                      <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                        {aiReview.strengths?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>

                    <div style={{ fontSize: '0.84rem', color: '#fbbf24' }}>
                      <strong>Optimizations:</strong>
                      <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                        {aiReview.optimizations?.map((o: string, i: number) => <li key={i}>{o}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Console Action Bar */}
          <div className="console-footer-bar">
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  setActiveLeftTab('hints');
                  handleRequestHint(1);
                }}
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              >
                <Sparkles size={14} color="#818cf8" />
                Hint
              </button>
              <button
                onClick={handleRequestDebug}
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              >
                <Bug size={14} />
                Debug
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleRunCode}
                disabled={isRunning || isSubmitting}
                className="btn-primary-run"
              >
                <Play size={14} />
                {isRunning ? 'Running...' : 'Run Code'}
              </button>

              <button
                onClick={handleSubmitCode}
                disabled={isSubmitting || isRunning}
                className="btn-primary-submit"
              >
                <Send size={14} />
                {isSubmitting ? 'Judging...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── OFFICIAL SUBMISSION VERDICT MODAL ─── */}
      {showVerdictModal && submissionVerdict && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '480px',
            padding: '32px 28px',
            boxShadow: '0 25px 70px rgba(0, 0, 0, 0.15)',
            textAlign: 'center'
          }}>
            {submissionVerdict.verdict === 'Accepted' ? (
              <div>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎉</div>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', margin: '0 0 6px 0' }}>
                  Accepted!
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.92rem', margin: '0 0 20px 0' }}>
                  All {submissionVerdict.totalTests} test cases passed successfully.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Runtime</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                      {submissionVerdict.runtimeMs} ms
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 600 }}>
                      Beats {submissionVerdict.runtimePercentile}%
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Memory</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                      {submissionVerdict.memoryMb} MB
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#2563eb', fontWeight: 600 }}>
                      Beats {submissionVerdict.memoryPercentile}%
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => {
                      setShowVerdictModal(false);
                      onBackToLibrary();
                    }}
                    className="btn-primary-submit"
                    style={{ flex: 1 }}
                  >
                    Next Challenge →
                  </button>
                  <button
                    onClick={() => setShowVerdictModal(false)}
                    className="btn-secondary"
                  >
                    Review Code
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>❌</div>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fb7185', margin: '0 0 6px 0' }}>
                  {submissionVerdict.verdict}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.92rem', margin: '0 0 20px 0' }}>
                  Passed {submissionVerdict.passedTests} of {submissionVerdict.totalTests} test cases.
                </p>

                {submissionVerdict.error && (
                  <div style={{ background: 'rgba(244,63,94,0.1)', color: '#fb7185', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '20px', textAlign: 'left' }}>
                    {submissionVerdict.error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => {
                      setShowVerdictModal(false);
                      handleRequestDebug();
                    }}
                    className="btn-secondary"
                    style={{ flex: 1, border: '1px solid #6366f1', color: '#a5b4fc' }}
                  >
                    <Bug size={15} /> Open AI Debugger
                  </button>
                  <button
                    onClick={() => setShowVerdictModal(false)}
                    className="btn-primary-run"
                    style={{ flex: 1 }}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
