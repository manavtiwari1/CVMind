import { Check, X } from 'lucide-react';

interface ScoreCardProps {
  title?: string;
  score: number;
  matched: string[];
  missing: string[];
  compact?: boolean;
}

/**
 * Mirrors the structure of the real ATS report (score, matched keywords, missing keywords).
 * The numbers here are illustrative sample data.
 */
export default function ScoreCard({ title = 'ATS check', score, matched, missing, compact = false }: ScoreCardProps) {
  return (
    <div className={`hp-score${compact ? ' hp-score--compact' : ''}`}>
      <div className="hp-score-title">{title}</div>
      <div className="hp-score-row">
        <span className="hp-score-num">{score}%</span>
        <div className="hp-score-track"><div className="hp-score-fill" style={{ width: `${score}%` }} /></div>
      </div>
      <div className="hp-score-group">
        <div className="hp-score-label">Found in your resume</div>
        <div className="hp-kw-list">
          {matched.map((k) => <span key={k} className="hp-kw hp-kw--ok"><Check size={11} /> {k}</span>)}
        </div>
      </div>
      <div className="hp-score-group">
        <div className="hp-score-label">Missing from your resume</div>
        <div className="hp-kw-list">
          {missing.map((k) => <span key={k} className="hp-kw hp-kw--miss"><X size={11} /> {k}</span>)}
        </div>
      </div>
    </div>
  );
}
