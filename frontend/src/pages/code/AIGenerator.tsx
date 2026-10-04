import { useState } from 'react';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { COMPANIES, TOPICS, type CodingProblem } from '../../data/codingProblems';
import { getErrorMessage } from '../../utils/errors';
import { generateProblem } from './codeApi';
import RichText from './RichText';
import './code-pages.css';

interface AIGeneratorProps {
  onUse: (problem: CodingProblem) => void;
  customApiKey?: string;
}

/** The model output is untrusted: only accept it if it has everything the workspace needs. */
function asProblem(value: unknown): CodingProblem | null {
  const p = value as Partial<CodingProblem> | null;
  if (!p || typeof p !== 'object') return null;
  const ok =
    typeof p.id === 'string' && typeof p.title === 'string' && typeof p.description === 'string' &&
    !!p.starterCode && typeof p.starterCode.javascript === 'string' &&
    Array.isArray(p.sampleTestCases) && p.sampleTestCases.length > 0 &&
    ['Easy', 'Medium', 'Hard'].includes(p.difficulty as string);
  if (!ok) return null;
  const base = p as CodingProblem;
  return {
    ...base,
    slug: base.slug || base.id,
    category: base.category || 'Custom',
    companies: base.companies ?? [],
    acceptanceRate: base.acceptanceRate ?? '',
    constraints: base.constraints ?? [],
    examples: base.examples ?? [],
    functionName: base.functionName || 'solution',
    starterCode: { javascript: base.starterCode.javascript, python: base.starterCode.python ?? '', cpp: base.starterCode.cpp ?? '' },
    isAiGenerated: true,
  };
}

export default function AIGenerator({ onUse, customApiKey = '' }: AIGeneratorProps) {
  const [topic, setTopic] = useState('Arrays & Hashing');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [company, setCompany] = useState('Google');
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState<CodingProblem | null>(null);
  const [error, setError] = useState('');

  const generate = async () => {
    setLoading(true);
    setError('');
    setProblem(null);
    try {
      const raw = await generateProblem({ topic, difficulty, company, customPrompt }, customApiKey);
      const parsed = asProblem(raw);
      if (!parsed) throw new Error('The AI returned an incomplete problem. Please try again.');
      setProblem(parsed);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cx-page cx-narrow">
      <div className="cx-page-head">
        <div>
          <h1>AI problem generator</h1>
          <p>Describe what you want to practise and the AI writes a new problem with test cases. Generated problems are marked as AI generated and are kept on this device.</p>
        </div>
      </div>

      <section className="cx-card cx-panel cx-setup">
        <div className="cx-field">
          <label htmlFor="ai-topic">Topic</label>
          <select id="ai-topic" className="cx-select" value={topic} onChange={(e) => setTopic(e.target.value)}>
            {TOPICS.filter((t) => t !== 'All').map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="cx-field">
          <label htmlFor="ai-diff">Difficulty</label>
          <select id="ai-diff" className="cx-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value as 'Easy' | 'Medium' | 'Hard')}>
            <option>Easy</option><option>Medium</option><option>Hard</option>
          </select>
        </div>
        <div className="cx-field">
          <label htmlFor="ai-company">Interview style</label>
          <select id="ai-company" className="cx-select" value={company} onChange={(e) => setCompany(e.target.value)}>
            {COMPANIES.filter((c) => c !== 'All').map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="cx-field cx-field--wide">
          <label htmlFor="ai-prompt">Extra instructions (optional)</label>
          <textarea id="ai-prompt" className="cx-textarea" rows={3} value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="For example: use a sliding window and handle duplicate characters" />
        </div>
        <button type="button" className="cx-btn cx-btn--primary cx-setup-start" onClick={() => void generate()} disabled={loading}>
          {loading ? <><Loader2 size={15} className="cx-spin" /> Writing your problem…</> : <><Sparkles size={15} /> Generate problem</>}
        </button>
        {error && <div className="cx-alert cx-alert--error cx-setup-error" role="alert">{error}</div>}
      </section>

      {problem && (
        <section className="cx-card cx-panel cx-generated">
          <div className="cx-generated-head"><CheckCircle2 size={16} /> Problem ready</div>
          <h2>{problem.title}</h2>
          <div className="cx-problem-meta-row">
            <span className={`cx-pill cx-pill--${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
            <span className="cx-tag">{problem.category}</span>
          </div>
          <RichText text={problem.description} />
          <button type="button" className="cx-btn cx-btn--primary" onClick={() => onUse(problem)}>Open in the workspace</button>
        </section>
      )}
    </div>
  );
}
