import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, Circle, ArrowRight, EyeOff, ListChecks } from 'lucide-react';
import { LEO_POSES, type LeoPose } from '../../lib/leoPoses';
import { getPlan, setPlanHidden, type PlanProgress, type PlanStepId } from '../../lib/growthApi';
import './growth.css';

// "Your plan" on My Documents: the steps from a new account to a first application, worked out
// on the server from what the user has saved. Leo points at the next step.

const STEPS: Record<PlanStepId, { label: string; pose: LeoPose; line: string; cta: string }> = {
  resume: { label: 'Create your resume', pose: 'resume', line: 'Start with a resume. Pick a template, or upload the one you have.', cta: 'Create resume' },
  ats: { label: "Check your resume's ATS score", pose: 'checklist', line: 'Next: see how applicant tracking systems read your resume.', cta: 'Check score' },
  tailor: { label: 'Tailor it to a job', pose: 'idea', line: 'Next: tailor your resume to a job you like.', cta: 'Tailor resume' },
  practise: { label: 'Practise an interview', pose: 'support', line: 'Next: practise an interview before the real one.', cta: 'Practise' },
  apply: { label: 'Apply to a job', pose: 'thumbs', line: 'Last step: find a job that matches you and apply.', cta: 'Find jobs' },
};

const CELEBRATED_KEY = 'cvmind_plan_celebrated';

function celebrateOnce(userKey: string) {
  try {
    if (localStorage.getItem(CELEBRATED_KEY) === userKey) return;
    localStorage.setItem(CELEBRATED_KEY, userKey);
  } catch { /* storage blocked: celebrate anyway */ }
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  confetti({ particleCount: 90, spread: 70, origin: { x: 0.85, y: 0.35 }, colors: ['#2dc08d', '#7c3aed', '#a78bfa', '#5eead4', '#f59e0b'] });
}

interface YourPlanProps {
  userKey: string;
  setCurrentPage: (page: string) => void;
}

export default function YourPlan({ userKey, setCurrentPage }: YourPlanProps) {
  const [plan, setPlan] = useState<PlanProgress | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    getPlan()
      .then(p => { if (alive) setPlan(p); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [userKey]);

  useEffect(() => {
    if (plan?.complete && !plan.hidden) celebrateOnce(userKey);
  }, [plan?.complete, plan?.hidden, userKey]);

  const toggleHidden = async (hidden: boolean) => {
    setSaving(true);
    try {
      setPlan(await setPlanHidden(hidden));
    } catch {
      /* keep the current view; the next visit reloads it */
    } finally {
      setSaving(false);
    }
  };

  if (failed || !plan || plan.steps.length === 0) return null;

  if (plan.hidden) {
    return (
      <button type="button" className="yp-show" onClick={() => toggleHidden(false)} disabled={saving}>
        <ListChecks size={15} /> Show your plan ({plan.doneCount} of {plan.steps.length} done)
      </button>
    );
  }

  const next = plan.steps.find(s => !s.done);
  const pose: LeoPose = next ? STEPS[next.id].pose : 'cheer';
  const line = next ? STEPS[next.id].line : 'You finished your plan. Good luck with your applications!';
  const percent = Math.round((plan.doneCount / plan.steps.length) * 100);

  return (
    <section className="md-section">
      <div className="md-section-head">
        <h2>Your plan</h2>
        <button type="button" className="yp-hide" onClick={() => toggleHidden(true)} disabled={saving} title="Hide your plan">
          <EyeOff size={14} /> Hide
        </button>
      </div>
      <div className="md-panel yp-card">
        <div className="yp-progress">
          <div className="yp-progress-text">
            <strong>{plan.doneCount} of {plan.steps.length} done</strong>
            <span>{percent}%</span>
          </div>
          <div className="yp-bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Plan progress">
            <span style={{ width: `${percent}%` }} />
          </div>
        </div>

        <div className="yp-leo">
          <img src={LEO_POSES[pose]} alt="" width={56} height={56} />
          <p className="yp-bubble">{line}</p>
        </div>

        <ol className="yp-steps">
          {plan.steps.map(step => {
            const meta = STEPS[step.id];
            const isNext = next?.id === step.id;
            return (
              <li key={step.id} className={`${step.done ? 'done' : ''}${isNext ? ' next' : ''}`}>
                {step.done ? <CheckCircle2 size={18} className="yp-icon done" /> : <Circle size={18} className="yp-icon" />}
                <span className="yp-label">{meta.label}</span>
                {isNext && (
                  <button type="button" className="md-btn md-btn--solid yp-cta" onClick={() => setCurrentPage(step.page)}>
                    {meta.cta} <ArrowRight size={14} />
                  </button>
                )}
                {!step.done && !isNext && (
                  <button type="button" className="yp-later" onClick={() => setCurrentPage(step.page)} aria-label={meta.cta}>
                    <ArrowRight size={14} />
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
