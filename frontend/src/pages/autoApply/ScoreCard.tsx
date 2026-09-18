import { useState } from 'react';
import { AlertCircle, CheckCircle2, MinusCircle, RefreshCw, ThumbsDown, ThumbsUp, XCircle } from 'lucide-react';
import type { AgentApplication, GateResult, Recommendation, ScoreComponentKey } from '../../types/agent';

const COMPONENTS: { key: ScoreComponentKey; label: string; hint: string }[] = [
  { key: 'skills', label: 'Skills match', hint: 'Required and nice-to-have skills found on your resume' },
  { key: 'semantic', label: 'Experience relevance', hint: 'How closely your achievements match the job’s responsibilities' },
  { key: 'title', label: 'Title fit', hint: 'Job title versus your target and recent titles' },
  { key: 'seniority', label: 'Seniority fit', hint: 'Job level versus the level you want or have' },
  { key: 'preferences', label: 'Your preferences', hint: 'Location, work mode, job type, salary and industry' }
];

const GATE_LABELS: Record<string, string> = {
  min_years: 'Experience',
  education: 'Education',
  sponsorship: 'Visa sponsorship',
  excluded_company: 'Excluded company',
  excluded_industry: 'Excluded industry'
};

const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  strong: 'Strong fit',
  good: 'Good fit',
  weak: 'Weak fit',
  not_recommended: 'Not recommended'
};

function GateIcon({ result }: { result: GateResult }) {
  if (result === 'pass') return <CheckCircle2 size={16} className="aa-gate-icon is-pass" />;
  if (result === 'fail') return <XCircle size={16} className="aa-gate-icon is-fail" />;
  if (result === 'n_a') return <MinusCircle size={16} className="aa-gate-icon is-na" />;
  return <AlertCircle size={16} className="aa-gate-icon is-warn" />;
}

function scoreTone(total: number) {
  if (total >= 75) return 'is-strong';
  if (total >= 55) return 'is-good';
  return 'is-weak';
}

interface ScoreCardProps {
  application: AgentApplication;
  busy: boolean;
  onDecide: (action: 'approve' | 'skip', overrideGates: boolean) => void;
  onRescore: () => void;
}

export default function ScoreCard({ application, busy, onDecide, onRescore }: ScoreCardProps) {
  const [confirmOverride, setConfirmOverride] = useState(false);
  const score = application.score;
  if (!score) return null;

  const gatesFailed = score.gatesPassed === false;
  const decision = application.decision?.state ?? 'undecided';
  const canDecide = application.status === 'matched';
  const recommendation = score.recommendation;

  return (
    <section className="aa-score-card">
      <div className="aa-score-head">
        <div className={`aa-score-total ${scoreTone(score.total)}`}>
          <strong>{score.total}</strong>
          <span>/100</span>
        </div>
        <div>
          {recommendation && <div className={`aa-score-reco is-${recommendation}`}>{RECOMMENDATION_LABELS[recommendation]}</div>}
          <p className="aa-label-hint">
            {score.scoringVersion === 'legacy' ? 'Score from the earlier matcher.' : 'Skills 40% · experience 40% · title, seniority and preferences 20%.'}
          </p>
        </div>
      </div>

      {score.components && (
        <div className="aa-score-bars">
          {COMPONENTS.map(({ key, label, hint }) => {
            const value = score.components?.[key] ?? null;
            return (
              <div key={key} className="aa-score-bar-row" title={hint}>
                <span className="aa-score-bar-label">{label}</span>
                {value === null ? (
                  <span className="aa-label-hint">Not enough information</span>
                ) : (
                  <>
                    <div className="aa-score-bar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-label={label}>
                      <span style={{ width: `${Math.round(value * 100)}%` }} />
                    </div>
                    <span className="aa-score-bar-value">{Math.round(value * 100)}%</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!!score.gates?.length && (
        <div>
          <h4 className="aa-score-subtitle">Hard requirements</h4>
          <ul className="aa-gates">
            {score.gates.map(gate => (
              <li key={gate.key} className={`aa-gate is-${gate.result}`}>
                <GateIcon result={gate.result} />
                <span><strong>{GATE_LABELS[gate.key] ?? gate.key}:</strong> {gate.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(!!score.matchedSkills?.length || !!score.impliedSkills?.length || !!score.missingSkills?.length) && (
        <div>
          <h4 className="aa-score-subtitle">Skills</h4>
          <div className="aa-skills-block">
            {score.matchedSkills?.map(skill => <span key={`m-${skill}`} className="aa-skill-match">{skill}</span>)}
            {score.impliedSkills?.map(skill => <span key={`i-${skill}`} className="aa-skill-implied" title="Partial credit from a related skill">{skill}</span>)}
            {score.missingSkills?.map(skill => (
              <span key={`x-${skill}`} className="aa-skill-miss" title={score.missingMustHave?.includes(skill) ? 'Required' : 'Nice to have'}>
                {skill}{score.missingMustHave?.includes(skill) ? ' *' : ''}
              </span>
            ))}
          </div>
          {!!score.missingMustHave?.length && <p className="aa-label-hint">* Required by the job but not found on your resume.</p>}
        </div>
      )}

      {!!score.topMatches?.length && (
        <div>
          <h4 className="aa-score-subtitle">Where your experience matches</h4>
          <ul className="aa-matches">
            {score.topMatches.slice(0, 5).map(match => (
              <li key={`${match.responsibility}-${match.bulletId}`}>
                <span className="aa-match-job">{match.responsibility}</span>
                <span className="aa-match-resume">“{match.bulletText}”</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {canDecide && (
        <div className="aa-score-actions">
          {decision !== 'undecided' && (
            <p className={`aa-decision is-${decision}`}>
              {decision === 'approved' ? `You approved this job${application.decision.overrideGates ? ' despite a failed requirement' : ''}.` : 'You skipped this job.'}
            </p>
          )}
          {gatesFailed && decision !== 'approved' && (
            <label className="aa-resume-check">
              <input type="checkbox" checked={confirmOverride} onChange={e => setConfirmOverride(e.target.checked)} />
              I understand this job fails a hard requirement and still want to approve it
            </label>
          )}
          <div className="aa-resume-actions">
            {decision !== 'approved' && (
              <button className="aa-btn-primary aa-btn-sm" disabled={busy || (gatesFailed && !confirmOverride)} onClick={() => onDecide('approve', gatesFailed)}>
                <ThumbsUp size={14} /> Approve
              </button>
            )}
            {decision !== 'skipped' && (
              <button className="aa-btn-ghost aa-btn-sm" disabled={busy} onClick={() => onDecide('skip', false)}>
                <ThumbsDown size={14} /> Skip
              </button>
            )}
            <button className="aa-btn-ghost aa-btn-sm" disabled={busy} onClick={onRescore}>
              <RefreshCw size={14} /> Re-score
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
