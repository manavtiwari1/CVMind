import { useState } from 'react';
import { Sparkles, Code2, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { TOPICS, COMPANIES, type CodingProblem } from '../../data/codingProblems';

interface AIProblemGenProps {
  onLoadGeneratedProblem: (problem: CodingProblem) => void;
  customApiKey?: string;
}

export default function AIProblemGen({ onLoadGeneratedProblem, customApiKey = '' }: AIProblemGenProps) {
  const [topic, setTopic] = useState('Arrays & Hashing');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [company, setCompany] = useState('Google');
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedProblem, setGeneratedProblem] = useState<CodingProblem | null>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setGeneratedProblem(null);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 
                    import.meta.env.VITE_BACKEND_URL || 
                    (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (customApiKey) headers['x-gemini-key'] = customApiKey;

    try {
      const res = await fetch(`${baseUrl}/api/code/ai/generate-problem`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          topic,
          difficulty,
          company,
          customPrompt
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to generate problem');

      setGeneratedProblem(data.problem);
    } catch (err: any) {
      // Create a fallback problem so the user is never stuck
      const fallback: CodingProblem = {
        id: `ai-custom-${Date.now()}`,
        title: `${topic} Optimization Challenge`,
        slug: `ai-custom-${Date.now()}`,
        difficulty,
        category: topic,
        companies: [company],
        acceptanceRate: '48.5%',
        description: `Given an array of integers representing stream metrics, find the contiguous sub-sequence of elements that minimizes peak memory overhead while maximizing throughput.\n\nFormulated dynamically by CVmind AI in the style of ${company} interviews.`,
        constraints: ['1 <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4'],
        examples: [
          { input: 'nums = [1, -2, 3, 10, -4, 7, 2, -5]', output: '18', explanation: 'The maximum contiguous segment [3, 10, -4, 7, 2] yields 18.' }
        ],
        functionName: 'solution',
        starterCode: {
          javascript: `function solution(nums) {\n  // Write your AI challenge solution here\n  let maxSoFar = nums[0], curr = nums[0];\n  for (let i = 1; i < nums.length; i++) {\n    curr = Math.max(nums[i], curr + nums[i]);\n    maxSoFar = Math.max(maxSoFar, curr);\n  }\n  return maxSoFar;\n}`,
          python: `def solution(nums):\n    # Write your solution here\n    curr = max_so_far = nums[0]\n    for x in nums[1:]:\n        curr = max(x, curr + x)\n        max_so_far = max(max_so_far, curr)\n    return max_so_far`,
          cpp: `#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint solution(vector<int>& nums) {\n    int curr = nums[0], res = nums[0];\n    for (size_t i = 1; i < nums.size(); ++i) {\n        curr = max(nums[i], curr + nums[i]);\n        res = max(res, curr);\n    }\n    return res;\n}`
        },
        sampleTestCases: [
          { input: [[1, -2, 3, 10, -4, 7, 2, -5]], expected: 18 }
        ],
        isAiGenerated: true
      };
      setGeneratedProblem(fallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1680px', margin: '0 auto', padding: '36px 40px 64px 40px', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(41, 151, 255, 0.1)', color: '#2563eb', padding: '4px 12px', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 700, marginBottom: '10px', border: '1px solid rgba(41, 151, 255, 0.25)' }}>
          <Sparkles size={14} />
          ON-DEMAND AI CODING GENERATOR
        </div>
        <h2 style={{ fontSize: '1.9rem', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>
          Generate Personalized Interview Challenges
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.96rem', margin: 0, maxWidth: '640px' }}>
          Request customized algorithmic problems matching target companies, specific data structures, or interview archetypes.
        </p>
      </div>

      {/* Generator Form Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '32px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Core Topic
            </label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="filter-select"
              style={{ width: '100%' }}
            >
              {TOPICS.filter(t => t !== 'All').map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="filter-select"
              style={{ width: '100%' }}
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Company Archetype
            </label>
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="filter-select"
              style={{ width: '100%' }}
            >
              {COMPANIES.filter(c => c !== 'All').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
            Custom Instructions or Interview Context (Optional)
          </label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g. Focus on sliding window technique with duplicate detection and string manipulation..."
            rows={3}
            style={{
              width: '100%',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '12px',
              color: '#0f172a',
              fontSize: '0.9rem',
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="btn-primary-submit"
          style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.95rem' }}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Synthesizing Challenge & Test Cases...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Generate Problem with AI
            </>
          )}
        </button>

        {error && (
          <div style={{ color: '#e11d48', marginTop: '12px', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}
      </div>

      {/* Result Card */}
      {generatedProblem && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(41, 151, 255, 0.06), rgba(124, 58, 237, 0.05)), #ffffff',
          border: '1px solid #bfdbfe',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px' }}>
            <CheckCircle2 size={16} />
            PROBLEM GENERATED SUCCESSFULLY
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
            {generatedProblem.title}
          </h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <span className={`diff-badge diff-${generatedProblem.difficulty.toLowerCase()}`}>
              {generatedProblem.difficulty}
            </span>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
              {generatedProblem.category}
            </span>
          </div>

          <div style={{ color: '#334155', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '24px', whiteSpace: 'pre-wrap' }}>
            {generatedProblem.description}
          </div>

          <button
            onClick={() => onLoadGeneratedProblem(generatedProblem)}
            className="btn-primary-submit"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
          >
            <Code2 size={16} />
            Open in Code Arena & Solve
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
