import { useEffect, useState } from 'react';
import {
  BookOpen, CheckCircle2, Clock, Download, ExternalLink, GraduationCap, Hammer, ListChecks, Search, ShieldCheck, Target, TrendingUp,
} from 'lucide-react';
import {
  CareerApp, CareerIntro, CareerNext, CareerWorking, CheckItem, Chips, CvPicker, Field, Panel, Progress, ScoreCard,
} from '../../components/career/CareerKit';
import type { IntroCopy } from '../../components/career/CareerKit';
import { cvLabel, downloadText, postCareer, resultKey, useCareerRun, useChecklist, useCvInput } from '../../components/career/careerApi';
import { readUser } from '../../lib/currentUser';
import { parseSavedContent } from '../../utils/savedWork';
import type { LoadedWork } from '../../types/api';
import './CareerCourses.css';

// /api/career/courses (careerCoursesSchema in backend/src/services/gemini.js); older saves only have gaps and courses
interface CourseSuggestion {
  title: string;
  platform: string;
  skillsCovered: string[];
  reason: string;
  duration: string;
  level?: string;
}

interface GapDetail {
  skill: string;
  priority: 'High' | 'Medium' | 'Low' | string;
  why: string;
}

interface CoursesResult {
  readiness?: number;
  summary?: string;
  strengths?: string[];
  gaps: string[];
  gapDetails?: GapDetail[];
  courses: CourseSuggestion[];
  projects?: { title: string; description: string }[];
}

// Page state saved in a 'career-courses' work
interface SavedCourses {
  targetJob?: string;
  skills?: string;
  level?: string;
  result?: CoursesResult | null;
}

interface CareerCoursesProps {
  customApiKey: string;
  resumeText: string;
  setCurrentPage?: (page: string) => void;
  loadedWork?: LoadedWork | null;
  setLoadedWork?: (work: LoadedWork | null) => void;
  onFocusChange?: (mode: false | 'flow') => void;
}

const TOOL = { name: 'Skill Gaps & Courses', icon: GraduationCap };
const PHASES = ['Reading your skills', 'Comparing them with the role', 'Picking courses and projects'];
const LEVELS = ['Entry level', 'Mid-level', 'Senior'];

// Search pages on each platform; the AI names the course, the link finds it
const PLATFORM_SEARCH: { match: RegExp; url: (q: string) => string }[] = [
  { match: /coursera/i, url: q => `https://www.coursera.org/search?query=${q}` },
  { match: /udemy/i, url: q => `https://www.udemy.com/courses/search/?q=${q}` },
  { match: /edx/i, url: q => `https://www.edx.org/search?q=${q}` },
  { match: /linkedin/i, url: q => `https://www.linkedin.com/learning/search?keywords=${q}` },
  { match: /pluralsight/i, url: q => `https://www.pluralsight.com/search?q=${q}` },
  { match: /freecodecamp/i, url: q => `https://www.freecodecamp.org/news/search/?query=${q}` },
  { match: /aws|amazon/i, url: q => `https://skillbuilder.aws/search?searchText=${q}` },
  { match: /microsoft/i, url: q => `https://learn.microsoft.com/en-us/search/?terms=${q}` },
];

function courseLink(c: CourseSuggestion): string {
  const q = encodeURIComponent(c.title);
  const site = PLATFORM_SEARCH.find(p => p.match.test(c.platform));
  return site ? site.url(q) : `https://www.google.com/search?q=${encodeURIComponent(`${c.title} ${c.platform} course`)}`;
}

const priorityTone = (p: string) => (/high/i.test(p) ? 'high' : /low/i.test(p) ? 'low' : 'medium');

const COPY: IntroCopy = {
  title: <>Know exactly <em>what to learn next</em></>,
  checks: [
    'See how ready you are for the role you want, and what you already have that it needs.',
    'Get the missing skills ranked by how much they hold you back.',
    'Courses from Coursera, Udemy, edX and more, plus practice projects that prove the skills.',
  ],
  formTitle: 'Find my skill gaps',
  steps: [
    { icon: Target, title: 'Name the role', text: 'The job you want next, and the level you are aiming for.' },
    { icon: BookOpen, title: 'Add your skills or resume', text: 'Your resume gives the most accurate picture. A list of skills works too.' },
    { icon: ListChecks, title: 'Learn and tick off', text: 'Open each course, mark it done, and watch your plan fill up.' },
  ],
  gets: [
    { icon: TrendingUp, title: 'A readiness score', text: 'How close you are to the role today, so you can see the gap shrink as you learn.' },
    { icon: Target, title: 'Gaps in priority order', text: 'Each missing skill marked high, medium or low, with why the role needs it.' },
    { icon: GraduationCap, title: 'Courses you can open', text: 'Each one links to a search on its platform, with level and time to finish.' },
    { icon: Hammer, title: 'Projects to prove it', text: 'Two practice projects that show employers the new skills, not just a certificate.' },
  ],
  faqs: [
    { q: 'Are the courses real?', a: 'The AI is told to suggest only well-known courses it is confident exist, and the link searches the platform for the title so you land on the real page. Courses change, so check the details and price on the platform before you sign up.' },
    { q: 'Are the courses free?', a: 'Some are, some are paid, and many paid ones let you audit for free. CVMind doesn\'t sell courses or earn from these links.' },
    { q: 'How is readiness worked out?', a: 'The AI compares your resume or skills with what the role usually asks for and gives an estimate from 0 to 100. It is a guide to track progress, not a hiring decision.' },
    { q: 'Is it saved?', a: 'When you are signed in, the plan is saved to My Documents so you can reopen it. Courses you mark as done are remembered in this browser.' },
  ],
  finalTitle: 'Stop guessing what to learn',
  finalText: 'Name the role you want and get a learning plan in under a minute.',
};

export default function CareerCourses({ customApiKey, resumeText, setCurrentPage, loadedWork, setLoadedWork, onFocusChange }: CareerCoursesProps) {
  const runner = useCareerRun<CoursesResult>(onFocusChange);
  const { stage, result, show, run } = runner;
  const cvState = useCvInput(resumeText);
  const [targetJob, setTargetJob] = useState('');
  const [skills, setSkills] = useState('');
  const [level, setLevel] = useState('Mid-level');
  const [sourceName, setSourceName] = useState('');

  const [handledWork, setHandledWork] = useState<LoadedWork | null>(null);
  if (loadedWork && loadedWork !== handledWork) {
    setHandledWork(loadedWork);
    if (!loadedWork.deleted && loadedWork.type === 'career-courses') {
      const saved = parseSavedContent<SavedCourses>(loadedWork.htmlContent);
      if (saved?.result) {
        setTargetJob(saved.targetJob || '');
        setSkills(saved.skills || '');
        setLevel(saved.level || 'Mid-level');
        setSourceName('');
        show(saved.result);
      }
    }
  }
  useEffect(() => {
    if (loadedWork) setLoadedWork?.(null);
  }, [loadedWork, setLoadedWork]);

  const hasInput = Boolean(skills.trim()) || cvState.cv.source !== 'none';
  const generate = () => {
    const role = targetJob.trim();
    if (!role || !cvState.ready || !hasInput) return;
    run(async () => {
      const data = await postCareer<CoursesResult>('/api/career/courses', { targetJob: role, skills: skills.trim(), level }, cvState, customApiKey);
      if (!data.courses?.length && !data.gaps?.length) throw new Error('The AI did not finish the plan this time. Please try again.');
      setSourceName(cvLabel(cvState));
      return data;
    });
  };

  if (stage === 'working') {
    return <CareerWorking tool={TOOL} title="Finding your skill gaps…" phases={PHASES} phase={runner.phase} error={runner.error} onRetry={runner.retry} onEdit={runner.toIntro} />;
  }

  if (stage === 'result' && result) {
    return (
      <CoursesView
        result={result}
        targetJob={targetJob}
        meta={[targetJob, level, sourceName].filter(Boolean).join(' · ')}
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
      resumeResult={result ? { label: 'Back to your learning plan', onClick: runner.toResult } : null}
      submit={{
        label: 'Find my skill gaps',
        disabled: !targetJob.trim() || !cvState.ready || !hasInput,
        onClick: generate,
        hint: !targetJob.trim() ? 'Add the role you want to start.' : !hasInput ? 'Add your skills or your resume so there is something to compare.' : undefined,
      }}
    >
      <Field label="Role you want">
        <input className="tlr-input" value={targetJob} onChange={e => setTargetJob(e.target.value)} placeholder="e.g. Machine Learning Engineer" maxLength={120} />
      </Field>
      <Chips label="Level" options={LEVELS} value={level} onChange={setLevel} />
      <Field label="Skills you have" optional hint="Needed if you skip the resume.">
        <textarea className="tlr-textarea" value={skills} onChange={e => setSkills(e.target.value)} placeholder="e.g. Python, SQL, pandas, basic statistics" maxLength={600} />
      </Field>
      <CvPicker state={cvState} why="Your resume shows what you already know, so the gaps are accurate." />
    </CareerIntro>
  );
}

interface CoursesViewProps {
  result: CoursesResult;
  targetJob: string;
  meta: string;
  onAgain: () => void;
  setCurrentPage?: (page: string) => void;
}

function CoursesView({ result, targetJob, meta, onAgain, setCurrentPage }: CoursesViewProps) {
  const courses = result.courses ?? [];
  const strengths = result.strengths ?? [];
  const projects = result.projects ?? [];
  const gaps: GapDetail[] = result.gapDetails?.length
    ? result.gapDetails
    : (result.gaps ?? []).map(g => ({ skill: g, priority: '', why: '' }));
  const { done, toggle } = useChecklist(resultKey('career-courses', result));
  const items = [...courses.map((_, i) => `course-${i}`), ...projects.map((_, i) => `project-${i}`)];
  const doneCount = items.filter(id => done.has(id)).length;
  const hasReadiness = typeof result.readiness === 'number';

  const plan = () => [
    `Learning plan for ${targetJob}`,
    hasReadiness ? `Readiness today: ${result.readiness}/100` : '',
    result.summary || '',
    '',
    strengths.length ? `YOU ALREADY HAVE: ${strengths.join(', ')}` : '',
    '',
    'SKILL GAPS',
    ...gaps.map(g => `- ${g.skill}${g.priority ? ` (${g.priority})` : ''}${g.why ? `: ${g.why}` : ''}`),
    '',
    'COURSES',
    ...courses.map((c, i) => `${i + 1}. ${c.title} (${c.platform}${c.level ? `, ${c.level}` : ''}, ${c.duration})\n   ${c.reason}\n   ${courseLink(c)}`),
    '',
    ...(projects.length ? ['PRACTICE PROJECTS', ...projects.map(p => `- ${p.title}: ${p.description}`)] : []),
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');

  return (
    <CareerApp
      tool={TOOL}
      againLabel="Change my details"
      onAgain={onAgain}
      onExit={onAgain}
      heading={`Your learning plan for ${targetJob || 'your next role'}`}
      summary={result.summary || `${gaps.length} skills to build and ${courses.length} courses to close the gap.`}
      meta={meta}
      actions={<button type="button" className="tlr-btn tlr-btn--outline" onClick={() => downloadText(`Learning plan - ${targetJob}`, plan())}><Download size={17} /> Download .txt</button>}
      footnote={readUser() ? 'Saved to My Documents. Ticks are kept in this browser.' : 'Sign in to save it to My Documents.'}
    >
      <div className="crt-layout">
        <div className="crt-main">
          <Panel title="Skill gaps" icon={Target}>
            <ul className="cc-gaps">
              {gaps.map(g => (
                <li key={g.skill}>
                  <div className="cc-gap-top">
                    <strong>{g.skill}</strong>
                    {g.priority && <span className={`crt-tag crt-tag--${priorityTone(g.priority)}`}>{g.priority} priority</span>}
                  </div>
                  {g.why && <p>{g.why}</p>}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Courses" icon={GraduationCap}>
            <ul className="cc-courses">
              {courses.map((c, i) => {
                const id = `course-${i}`;
                const isDone = done.has(id);
                return (
                  <li key={`${c.title}-${i}`} className={isDone ? 'is-done' : ''}>
                    <div className="cc-course-top">
                      <span className="crt-tag crt-tag--green">{c.platform}</span>
                      {c.level && <span className="crt-tag">{c.level}</span>}
                      {c.duration && <span className="cc-time"><Clock size={13} /> {c.duration}</span>}
                    </div>
                    <h3>{c.title}</h3>
                    <p>{c.reason}</p>
                    {c.skillsCovered?.length > 0 && <div className="tlr-chips">{c.skillsCovered.map(s => <span key={s} className="tlr-chip tlr-chip--ok">{s}</span>)}</div>}
                    <div className="crt-actions-row">
                      <a className="crt-copy" href={courseLink(c)} target="_blank" rel="noopener noreferrer"><Search size={14} /> Find on {c.platform} <ExternalLink size={12} /></a>
                      <span className="crt-spacer" />
                      <button type="button" className={`crt-pick${isDone ? ' is-on' : ''}`} aria-pressed={isDone} onClick={() => toggle(id)}>
                        {isDone ? <><CheckCircle2 size={13} /> Done</> : 'Mark as done'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="tlr-fine">Links search the platform for the course title. Check the price and syllabus there before you enrol.</p>
          </Panel>

          {projects.length > 0 && (
            <Panel title="Practice projects" icon={Hammer}>
              <ul className="crt-checks">
                {projects.map((p, i) => (
                  <CheckItem key={p.title} checked={done.has(`project-${i}`)} onToggle={() => toggle(`project-${i}`)}>
                    <b>{p.title}.</b> {p.description}
                  </CheckItem>
                ))}
              </ul>
              <p className="tlr-fine">Put finished projects on GitHub and add them to your resume and LinkedIn.</p>
            </Panel>
          )}
        </div>

        <aside className="crt-side">
          {hasReadiness && <ScoreCard score={result.readiness ?? 0} title="Readiness" note={`How ready you are for ${targetJob || 'this role'} today, estimated by AI.`} />}
          {items.length > 0 && (
            <section className="tlr-card">
              <h3>Your progress</h3>
              <Progress done={doneCount} total={items.length} label="Courses and projects done" />
            </section>
          )}
          {strengths.length > 0 && (
            <section className="tlr-card">
              <h3>What you already have</h3>
              <ul className="crt-bullets">{strengths.map(s => <li key={s}><ShieldCheck size={15} />{s}</li>)}</ul>
            </section>
          )}
          <CareerNext current="career-courses" setCurrentPage={setCurrentPage} pick={['career-roadmap', 'linkedin', 'elevator-pitch']} />
        </aside>
      </div>
    </CareerApp>
  );
}
