import { useEffect, useRef, useState } from 'react';
import {
  Building2, Clock, Download, Lightbulb, Mic, Palette, Pause, Play, Presentation, RotateCcw, Rocket, Square, Timer, Volume2, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  CareerApp, CareerIntro, CareerNext, CareerWorking, Chips, CopyButton, CvPicker, Field, Panel,
} from '../../components/career/CareerKit';
import type { IntroCopy } from '../../components/career/CareerKit';
import { cvLabel, downloadText, postCareer, resultKey, useCareerRun, useCvInput, wordCount } from '../../components/career/careerApi';
import { readUser } from '../../lib/currentUser';
import { parseSavedContent } from '../../utils/savedWork';
import type { LoadedWork } from '../../types/api';
import './ElevatorPitch.css';

// /api/career/pitch (elevatorPitchSchema in backend/src/services/gemini.js); the last two are missing on older saves
interface PitchResult {
  corporate: string;
  startup: string;
  creative: string;
  oneLiner?: string;
  tips?: string[];
}

// Page state saved in an 'elevator-pitch' work
interface SavedPitch {
  jobTitle?: string;
  details?: string;
  setting?: string;
  result?: PitchResult | null;
}

interface ElevatorPitchProps {
  customApiKey: string;
  resumeText: string;
  setCurrentPage?: (page: string) => void;
  loadedWork?: LoadedWork | null;
  setLoadedWork?: (work: LoadedWork | null) => void;
  onFocusChange?: (mode: false | 'flow') => void;
}

const TOOL = { name: 'Elevator Pitch Builder', icon: Presentation };
const PHASES = ['Reading your background', 'Finding your strongest story', 'Writing three pitches'];
const SETTINGS = ['Networking event', 'Job interview', 'Career fair', 'Online intro'];
// A relaxed speaking pace; the pitches are written for about a minute
const WORDS_PER_MINUTE = 140;
const TARGET_SECONDS = 60;

type Style = 'corporate' | 'startup' | 'creative';
const STYLES: { id: Style; label: string; icon: LucideIcon; for: string }[] = [
  { id: 'corporate', label: 'Corporate', icon: Building2, for: 'Large companies, banks, consulting: results and numbers first.' },
  { id: 'startup', label: 'Startup', icon: Rocket, for: 'Startups and product teams: speed, ownership and impact.' },
  { id: 'creative', label: 'Story', icon: Palette, for: 'Meetups and informal chats: a short story people remember.' },
];

const COPY: IntroCopy = {
  title: <>Introduce yourself <em>in under a minute</em></>,
  checks: [
    'Three pitches built from your resume: corporate, startup and story, each about 60 seconds out loud.',
    'A 10-second one-liner for when you only get a moment.',
    'Practise with a timer, or listen to it read aloud, until it sounds like you.',
  ],
  formTitle: 'Build my pitch',
  steps: [
    { icon: Presentation, title: 'Say where you\'ll use it', text: 'A networking event, an interview, a career fair or an online intro.' },
    { icon: Mic, title: 'Add your background', text: 'Your resume or a few lines about what you have done and want next.' },
    { icon: Timer, title: 'Practise it out loud', text: 'Edit, then run the timer while you say it. Aim for under a minute.' },
  ],
  gets: [
    { icon: Building2, title: 'Three styles', text: 'Pick the one that fits the room: corporate, startup or story.' },
    { icon: Zap, title: 'A 10-second one-liner', text: 'Your name, what you do and what you are looking for, in one breath.' },
    { icon: Clock, title: 'Timing you can trust', text: 'Each pitch shows its word count and roughly how long it takes to say.' },
    { icon: Volume2, title: 'Practice mode', text: 'A timer and read-aloud, both running in your browser.' },
  ],
  faqs: [
    { q: 'How long should an elevator pitch be?', a: 'About 30 to 60 seconds, or 70 to 140 words. Each pitch shows its word count and the time it takes at a relaxed pace, so you can trim it.' },
    { q: 'Can I use it for "Tell me about yourself"?', a: 'Yes. Pick Job interview as the setting and the pitches are written as an answer to that question.' },
    { q: 'How does read-aloud work?', a: 'It uses your browser\'s built-in voice, so nothing is recorded or sent anywhere. Some browsers have more natural voices than others.' },
    { q: 'Is it saved?', a: 'When you are signed in, the pitches are saved to My Documents so you can reopen them. Your resume text is sent to our AI provider to write them. We don\'t sell your data.' },
  ],
  finalTitle: 'The next "So, what do you do?" is coming',
  finalText: 'Get a pitch you can say with confidence in under a minute.',
};

const speakTime = (words: number) => Math.round((words / WORDS_PER_MINUTE) * 60);
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function ElevatorPitch({ customApiKey, resumeText, setCurrentPage, loadedWork, setLoadedWork, onFocusChange }: ElevatorPitchProps) {
  const runner = useCareerRun<PitchResult>(onFocusChange);
  const { stage, result, show, run } = runner;
  const cvState = useCvInput(resumeText);
  const [jobTitle, setJobTitle] = useState('');
  const [details, setDetails] = useState('');
  const [setting, setSetting] = useState('Networking event');
  const [sourceName, setSourceName] = useState('');

  const [handledWork, setHandledWork] = useState<LoadedWork | null>(null);
  if (loadedWork && loadedWork !== handledWork) {
    setHandledWork(loadedWork);
    if (!loadedWork.deleted && loadedWork.type === 'elevator-pitch') {
      const saved = parseSavedContent<SavedPitch>(loadedWork.htmlContent);
      if (saved?.result) {
        setJobTitle(saved.jobTitle || '');
        setDetails(saved.details || '');
        setSetting(saved.setting || 'Networking event');
        setSourceName('');
        show(saved.result);
      }
    }
  }
  useEffect(() => {
    if (loadedWork) setLoadedWork?.(null);
  }, [loadedWork, setLoadedWork]);

  const generate = () => {
    const role = jobTitle.trim();
    if (!role || !cvState.ready) return;
    run(async () => {
      const data = await postCareer<PitchResult>('/api/career/pitch', { jobTitle: role, details: details.trim(), setting }, cvState, customApiKey);
      if (!data.corporate && !data.startup) throw new Error('The AI did not write the pitches this time. Please try again.');
      setSourceName(cvLabel(cvState));
      return data;
    });
  };

  if (stage === 'working') {
    return <CareerWorking tool={TOOL} title="Writing your pitches…" phases={PHASES} phase={runner.phase} error={runner.error} onRetry={runner.retry} onEdit={runner.toIntro} />;
  }

  if (stage === 'result' && result) {
    return (
      <PitchView
        key={resultKey('elevator-pitch', result)}
        result={result}
        jobTitle={jobTitle}
        meta={[jobTitle, setting, sourceName].filter(Boolean).join(' · ')}
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
      resumeResult={result ? { label: 'Back to your pitches', onClick: runner.toResult } : null}
      submit={{ label: 'Build my pitch', disabled: !jobTitle.trim() || !cvState.ready, onClick: generate, hint: jobTitle.trim() ? undefined : 'Add the role you want to start.' }}
    >
      <Field label="Role you want">
        <input className="tlr-input" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Marketing Manager" maxLength={120} />
      </Field>
      <Chips label="Where you'll use it" options={SETTINGS} value={setting} onChange={setSetting} />
      <Field label="Anything to include" optional hint="A win you're proud of, why you're switching, or what you're looking for.">
        <textarea className="tlr-textarea" value={details} onChange={e => setDetails(e.target.value)} placeholder="e.g. Grew our Instagram from 2k to 40k; want to move into brand strategy" maxLength={1500} />
      </Field>
      <CvPicker state={cvState} why="Your resume gives the pitch real achievements to talk about." />
    </CareerIntro>
  );
}

interface PitchViewProps {
  result: PitchResult;
  jobTitle: string;
  meta: string;
  onAgain: () => void;
  setCurrentPage?: (page: string) => void;
}

function PitchView({ result, jobTitle, meta, onAgain, setCurrentPage }: PitchViewProps) {
  const styles = STYLES.filter(s => result[s.id]);
  const [active, setActive] = useState<Style>(styles[0]?.id ?? 'corporate');
  // Pitches can be edited; practice and copy use the edited text
  const [texts, setTexts] = useState<Record<Style, string>>(() => ({ corporate: result.corporate || '', startup: result.startup || '', creative: result.creative || '' }));
  const [practice, setPractice] = useState(false);
  const style = STYLES.find(s => s.id === active) ?? STYLES[0];
  const text = texts[active];
  const words = wordCount(text);
  const seconds = speakTime(words);
  const tips = result.tips ?? [];

  const allText = () => [
    `Elevator pitch${jobTitle ? ` - ${jobTitle}` : ''}`,
    '',
    ...(result.oneLiner ? ['ONE-LINER (10 SECONDS)', result.oneLiner, ''] : []),
    ...styles.flatMap(s => [`${s.label.toUpperCase()} PITCH`, texts[s.id], '']),
    ...(tips.length ? ['DELIVERY TIPS', ...tips.map(t => `- ${t}`)] : []),
  ].join('\n');

  return (
    <CareerApp
      tool={TOOL}
      againLabel="Change my details"
      onAgain={onAgain}
      onExit={onAgain}
      heading="Your elevator pitches are ready"
      summary="Pick the style that fits the room, make it sound like you, then practise it out loud."
      meta={meta}
      actions={
        <>
          <button type="button" className="tlr-btn" onClick={() => setPractice(true)}><Timer size={17} /> Practise out loud</button>
          <CopyButton text={text} label={`Copy ${style.label.toLowerCase()} pitch`} />
          <button type="button" className="tlr-btn tlr-btn--outline" onClick={() => downloadText(`Elevator pitch${jobTitle ? ` - ${jobTitle}` : ''}`, allText())}><Download size={17} /> Download .txt</button>
        </>
      }
      footnote={readUser() ? 'Saved to My Documents. Your edits stay on this page.' : 'Sign in to save it to My Documents.'}
    >
      <div className="crt-layout">
        <div className="crt-main">
          {result.oneLiner && (
            <section className="ep-oneliner">
              <div className="crt-actions-row">
                <span className="crt-sub"><Zap size={13} /> 10-second version</span>
                <span className="crt-spacer" />
                <CopyButton text={result.oneLiner} small />
              </div>
              <p>{result.oneLiner}</p>
            </section>
          )}

          <div className="crt-tabs" role="tablist" aria-label="Pitch styles">
            {styles.map(s => (
              <button key={s.id} type="button" role="tab" aria-selected={active === s.id} className={active === s.id ? 'is-on' : ''} onClick={() => { setActive(s.id); setPractice(false); }}>
                <s.icon size={15} /> {s.label}
              </button>
            ))}
          </div>

          {practice ? (
            <Practice text={text} onClose={() => setPractice(false)} />
          ) : (
            <Panel
              title={`${style.label} pitch`}
              icon={style.icon}
              action={
                <div className="crt-actions-row">
                  <small className={`crt-count${seconds > TARGET_SECONDS + 10 ? ' is-over' : ''}`}>{words} words · about {seconds}s</small>
                  {text !== (result[active] || '') && <button type="button" className="crt-copy" onClick={() => setTexts(t => ({ ...t, [active]: result[active] || '' }))}><RotateCcw size={13} /> Undo my edits</button>}
                  <CopyButton text={text} small />
                </div>
              }
            >
              <p className="crt-text">{style.for}</p>
              <textarea className="crt-edit ep-edit" value={text} onChange={e => setTexts(t => ({ ...t, [active]: e.target.value }))} aria-label={`${style.label} pitch, editable`} />
              {seconds > TARGET_SECONDS + 10 && <p className="tlr-fine">A little long for a minute. Try cutting one sentence.</p>}
              <button type="button" className="tlr-btn tlr-btn--purple ep-practise" onClick={() => setPractice(true)}><Timer size={17} /> Practise this one</button>
            </Panel>
          )}
        </div>

        <aside className="crt-side">
          {tips.length > 0 && (
            <section className="tlr-card">
              <h3>Delivery tips</h3>
              <ul className="crt-bullets">{tips.map(t => <li key={t}><Lightbulb size={15} />{t}</li>)}</ul>
            </section>
          )}
          <section className="tlr-card">
            <h3>Make it yours</h3>
            <ul className="crt-bullets">
              <li><Mic size={15} />Say it out loud three times. Change any word you trip over.</li>
              <li><Mic size={15} />End with a question, so it turns into a conversation.</li>
              <li><Mic size={15} />Don't learn it word for word. Learn the three points.</li>
            </ul>
          </section>
          <CareerNext current="elevator-pitch" setCurrentPage={setCurrentPage} pick={['linkedin-bio', 'linkedin-outreach', 'career-roadmap']} />
        </aside>
      </div>
    </CareerApp>
  );
}

/** Teleprompter with a timer and the browser's read-aloud voice. */
function Practice({ text, onClose }: { text: string; onClose: () => void }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const startedAt = useRef(0);

  useEffect(() => {
    if (!running) return;
    startedAt.current = Date.now() - elapsed * 1000;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 250);
    return () => clearInterval(id);
    // elapsed is read once when the timer starts or resumes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // Stop the voice when leaving practice
  useEffect(() => () => { if (canSpeak) window.speechSynthesis.cancel(); }, [canSpeak]);

  const listen = () => {
    if (!canSpeak) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };

  const pct = Math.min(100, (elapsed / TARGET_SECONDS) * 100);
  const over = elapsed > TARGET_SECONDS;

  return (
    <section className="crt-panel ep-practice">
      <header className="crt-panel-head">
        <h2><Timer size={18} /> Practice</h2>
        <button type="button" className="crt-copy" onClick={onClose}><Square size={13} /> Back to editing</button>
      </header>
      <div className={`ep-clock${over ? ' is-over' : ''}`} aria-live="off">
        <b>{clock(elapsed)}</b>
        <span>{over ? 'Over a minute: wrap up' : `Aim for under ${clock(TARGET_SECONDS)}`}</span>
        <i><em style={{ width: `${pct}%` }} /></i>
      </div>
      <div className="ep-prompter">{text}</div>
      <div className="crt-actions-row ep-controls">
        <button type="button" className="tlr-btn" onClick={() => setRunning(r => !r)}>
          {running ? <><Pause size={17} /> Pause</> : <><Play size={17} /> {elapsed ? 'Resume' : 'Start timer'}</>}
        </button>
        <button type="button" className="tlr-btn tlr-btn--outline" onClick={() => { setRunning(false); setElapsed(0); }} disabled={!elapsed}><RotateCcw size={17} /> Reset</button>
        {canSpeak && (
          <button type="button" className="tlr-btn tlr-btn--outline" onClick={listen}>
            {speaking ? <><Square size={16} /> Stop</> : <><Volume2 size={17} /> Listen</>}
          </button>
        )}
      </div>
    </section>
  );
}
