import { useEffect, useState } from 'react';
import {
  AlertTriangle, ArrowRight, CalendarRange, Clock, Compass, Download, Flag, ListChecks, Map as MapIcon, Milestone, Target, Wrench,
} from 'lucide-react';
import {
  CareerApp, CareerIntro, CareerNext, CareerWorking, CheckItem, Chips, CvPicker, Field, Panel, Progress,
} from '../../components/career/CareerKit';
import type { IntroCopy } from '../../components/career/CareerKit';
import { cvLabel, downloadText, postCareer, resultKey, useCareerRun, useChecklist, useCvInput } from '../../components/career/careerApi';
import { readUser } from '../../lib/currentUser';
import { parseSavedContent } from '../../utils/savedWork';
import type { LoadedWork } from '../../types/api';
import './CareerRoadmap.css';

// /api/career/roadmap (careerRoadmapSchema in backend/src/services/gemini.js); older saves only have steps
interface RoadmapStep {
  stepNumber: number;
  phaseName: string;
  timeframe: string;
  focus: string;
  actions: string[];
  milestone: string;
}

interface RoadmapResult {
  summary?: string;
  skillsToBuild?: string[];
  steps: RoadmapStep[];
  risks?: string[];
}

// Page state saved in a 'career-roadmap' work
interface SavedRoadmap {
  currentRole?: string;
  targetRole?: string;
  years?: string;
  hoursPerWeek?: string;
  result?: RoadmapResult | null;
}

interface CareerRoadmapProps {
  customApiKey: string;
  resumeText: string;
  setCurrentPage?: (page: string) => void;
  loadedWork?: LoadedWork | null;
  setLoadedWork?: (work: LoadedWork | null) => void;
  onFocusChange?: (mode: false | 'flow') => void;
}

const TOOL = { name: 'Career Roadmap', icon: MapIcon };
const PHASES = ['Reading where you are now', 'Mapping the route to your target', 'Setting milestones'];
const TIMEFRAMES = ['6 months', '1 year', '2 years', '3 years'];
const HOURS = ['Under 5 hrs/week', '5–10 hrs/week', '10–20 hrs/week', '20+ hrs/week'];

const COPY: IntroCopy = {
  title: <>A step-by-step plan <em>to the role you want</em></>,
  checks: [
    'Four phases from where you are to where you want to be, timed to your deadline.',
    'Concrete actions for each phase, sized to the hours you can actually give each week.',
    'A milestone for every phase, so you know when to move on. Tick actions off as you go.',
  ],
  formTitle: 'Plan my next move',
  steps: [
    { icon: Compass, title: 'Where you are and where you\'re going', text: 'Your current role and the one you want next.' },
    { icon: CalendarRange, title: 'Your time', text: 'How long you\'re giving it, and the hours you have each week.' },
    { icon: ListChecks, title: 'Work the plan', text: 'Tick off actions and milestones. Your progress is kept in this browser.' },
  ],
  gets: [
    { icon: MapIcon, title: 'Four timed phases', text: 'Each with a focus, two or three actions and a milestone that says you\'re ready for the next.' },
    { icon: Wrench, title: 'Skills to build', text: 'What the target role needs most, in order, so you start with what matters.' },
    { icon: AlertTriangle, title: 'What usually goes wrong', text: 'Common reasons moves like yours stall, and how to avoid them.' },
    { icon: Download, title: 'A plan you can keep', text: 'Download it as text, or reopen it any time from My Documents.' },
  ],
  faqs: [
    { q: 'Can I change careers completely?', a: 'Yes. Put your current role (or "Student", or your field of study) and the role you want. The plan builds the bridge, and says honestly if the timeframe is tight.' },
    { q: 'Why does it ask for hours per week?', a: 'Two years at 5 hours a week is a very different plan from two years at 20. The actions are sized to the time you have.' },
    { q: 'Do I need a resume?', a: 'No, but it helps. With your resume the plan starts from what you have already done instead of from scratch.' },
    { q: 'Is it saved?', a: 'When you are signed in, the roadmap is saved to My Documents. Actions you tick are remembered in this browser.' },
  ],
  finalTitle: 'Know your next step, and the one after',
  finalText: 'Tell us where you are and where you want to be. Your roadmap is ready in under a minute.',
};

export default function CareerRoadmap({ customApiKey, resumeText, setCurrentPage, loadedWork, setLoadedWork, onFocusChange }: CareerRoadmapProps) {
  const runner = useCareerRun<RoadmapResult>(onFocusChange);
  const { stage, result, show, run } = runner;
  const cvState = useCvInput(resumeText);
  const [currentRole, setCurrentRole] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [years, setYears] = useState('1 year');
  const [hours, setHours] = useState('5–10 hrs/week');
  const [sourceName, setSourceName] = useState('');

  const [handledWork, setHandledWork] = useState<LoadedWork | null>(null);
  if (loadedWork && loadedWork !== handledWork) {
    setHandledWork(loadedWork);
    if (!loadedWork.deleted && loadedWork.type === 'career-roadmap') {
      const saved = parseSavedContent<SavedRoadmap>(loadedWork.htmlContent);
      if (saved?.result?.steps?.length) {
        setCurrentRole(saved.currentRole || '');
        setTargetRole(saved.targetRole || '');
        setYears(saved.years || '1 year');
        setHours(saved.hoursPerWeek || '5–10 hrs/week');
        setSourceName('');
        show(saved.result);
      }
    }
  }
  useEffect(() => {
    if (loadedWork) setLoadedWork?.(null);
  }, [loadedWork, setLoadedWork]);

  const generate = () => {
    const target = targetRole.trim();
    if (!target || !cvState.ready) return;
    run(async () => {
      const data = await postCareer<RoadmapResult>('/api/career/roadmap', {
        currentRole: currentRole.trim(), targetRole: target, years, hoursPerWeek: hours,
      }, cvState, customApiKey);
      if (!data.steps?.length) throw new Error('The AI did not finish the roadmap this time. Please try again.');
      setSourceName(cvLabel(cvState));
      return data;
    });
  };

  if (stage === 'working') {
    return <CareerWorking tool={TOOL} title="Planning your route…" phases={PHASES} phase={runner.phase} error={runner.error} onRetry={runner.retry} onEdit={runner.toIntro} />;
  }

  if (stage === 'result' && result) {
    return (
      <RoadmapView
        result={result}
        currentRole={currentRole}
        targetRole={targetRole}
        meta={[years, hours, sourceName].filter(Boolean).join(' · ')}
        onAgain={runner.toIntro}
        setCurrentPage={setCurrentPage}
      />
    );
  }

  return (
    <CareerIntro
      tool={TOOL}
      copy={COPY}
      setCurrentPage={setCurrentPage}
      resumeResult={result ? { label: 'Back to your roadmap', onClick: runner.toResult } : null}
      submit={{ label: 'Plan my route', disabled: !targetRole.trim() || !cvState.ready, onClick: generate, hint: targetRole.trim() ? undefined : 'Add the role you want to start.' }}
    >
      <div className="crt-row">
        <Field label="Where you are now" optional>
          <input className="tlr-input" value={currentRole} onChange={e => setCurrentRole(e.target.value)} placeholder="e.g. Support Engineer" maxLength={120} />
        </Field>
        <Field label="Where you want to be">
          <input className="tlr-input" value={targetRole} onChange={e => setTargetRole(e.target.value)} placeholder="e.g. Product Manager" maxLength={120} />
        </Field>
      </div>
      <Chips label="Timeframe" options={TIMEFRAMES} value={years} onChange={setYears} />
      <Chips label="Time you can give" options={HOURS} value={hours} onChange={setHours} />
      <CvPicker state={cvState} why="Your resume lets the plan start from what you've already done." />
    </CareerIntro>
  );
}

interface RoadmapViewProps {
  result: RoadmapResult;
  currentRole: string;
  targetRole: string;
  meta: string;
  onAgain: () => void;
  setCurrentPage?: (page: string) => void;
}

function RoadmapView({ result, currentRole, targetRole, meta, onAgain, setCurrentPage }: RoadmapViewProps) {
  const steps = [...(result.steps ?? [])].sort((a, b) => (a.stepNumber || 0) - (b.stepNumber || 0));
  const skills = result.skillsToBuild ?? [];
  const risks = result.risks ?? [];
  const { done, toggle } = useChecklist(resultKey('career-roadmap', result));
  const ids = steps.flatMap((s, i) => [...(s.actions ?? []).map((_, j) => `a-${i}-${j}`), `m-${i}`]);
  const doneCount = ids.filter(id => done.has(id)).length;
  // The phase to work on: the first one whose milestone isn't ticked
  const current = steps.findIndex((_, i) => !done.has(`m-${i}`));

  const plan = () => [
    `Career roadmap: ${currentRole ? `${currentRole} → ` : ''}${targetRole}`,
    meta,
    '',
    result.summary || '',
    '',
    ...(skills.length ? [`SKILLS TO BUILD: ${skills.join(', ')}`, ''] : []),
    ...steps.flatMap((s, i) => [
      `PHASE ${i + 1}: ${s.phaseName} (${s.timeframe})`,
      `Focus: ${s.focus}`,
      ...(s.actions ?? []).map(a => `- ${a}`),
      `Milestone: ${s.milestone}`,
      '',
    ]),
    ...(risks.length ? ['WATCH OUT FOR', ...risks.map(r => `- ${r}`)] : []),
  ].join('\n');

  return (
    <CareerApp
      tool={TOOL}
      againLabel="Change my details"
      onAgain={onAgain}
      onExit={onAgain}
      heading={`${currentRole ? `${currentRole} → ` : 'Your route to '}${targetRole}`}
      summary={result.summary || `${steps.length} phases, each with actions and a milestone.`}
      meta={meta}
      actions={<button type="button" className="tlr-btn tlr-btn--outline" onClick={() => downloadText(`Career roadmap - ${targetRole}`, plan())}><Download size={17} /> Download .txt</button>}
      footnote={readUser() ? 'Saved to My Documents. Ticks are kept in this browser.' : 'Sign in to save it to My Documents.'}
    >
      <div className="crt-layout">
        <div className="crt-main">
          <ol className="rm-steps">
            {steps.map((s, i) => {
              const milestoneDone = done.has(`m-${i}`);
              return (
                <li key={`${s.phaseName}-${i}`} className={`rm-step${milestoneDone ? ' is-done' : ''}${i === current ? ' is-now' : ''}`}>
                  <span className="rm-dot" aria-hidden="true">{i + 1}</span>
                  <div className="crt-panel rm-card">
                    <header className="crt-panel-head">
                      <div>
                        <span className="crt-sub">Phase {i + 1}{i === current ? ' · You are here' : milestoneDone ? ' · Done' : ''}</span>
                        <h2>{s.phaseName}</h2>
                      </div>
                      <span className="crt-tag"><Clock size={12} /> {s.timeframe}</span>
                    </header>
                    <p className="crt-text"><Target size={14} className="rm-inline" /> {s.focus}</p>
                    <ul className="crt-checks">
                      {(s.actions ?? []).map((a, j) => (
                        <CheckItem key={a} checked={done.has(`a-${i}-${j}`)} onToggle={() => toggle(`a-${i}-${j}`)}>{a}</CheckItem>
                      ))}
                    </ul>
                    <button type="button" className={`rm-milestone${milestoneDone ? ' is-on' : ''}`} aria-pressed={milestoneDone} onClick={() => toggle(`m-${i}`)}>
                      <Flag size={16} />
                      <span><b>Milestone</b>{s.milestone}</span>
                      <em>{milestoneDone ? 'Reached' : 'Mark reached'}</em>
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <aside className="crt-side">
          <section className="tlr-card">
            <h3>Your progress</h3>
            <Progress done={doneCount} total={ids.length} label="Actions and milestones" />
            {current >= 0 && steps[current] && (
              <p className="tlr-fine crt-mt"><ArrowRight size={13} /> Now: {steps[current].phaseName}</p>
            )}
            {current < 0 && <p className="tlr-fine crt-mt"><Milestone size={13} /> Every milestone reached. Time to apply.</p>}
          </section>
          {skills.length > 0 && (
            <section className="tlr-card">
              <h3>Skills to build</h3>
              <ol className="rm-skills">{skills.map(s => <li key={s}>{s}</li>)}</ol>
            </section>
          )}
          {risks.length > 0 && (
            <Panel title="Watch out for" icon={AlertTriangle} className="rm-risks">
              <ul className="crt-bullets crt-bullets--warn">{risks.map(r => <li key={r}><AlertTriangle size={15} />{r}</li>)}</ul>
            </Panel>
          )}
          <CareerNext current="career-roadmap" setCurrentPage={setCurrentPage} pick={['career-courses', 'linkedin', 'elevator-pitch']} />
        </aside>
      </div>
    </CareerApp>
  );
}
