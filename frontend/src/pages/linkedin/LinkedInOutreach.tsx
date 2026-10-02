import { useEffect, useState } from 'react';
import {
  Building2, CalendarClock, CheckCircle2, Clock, Download, ExternalLink, Handshake, Mail, MessageSquareReply, MessagesSquare,
  PencilLine, Search, Send, UserPlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  CareerApp, CareerIntro, CareerNext, CareerWorking, CharCount, Chips, CopyButton, CvPicker, Field, Panel,
} from '../../components/career/CareerKit';
import type { IntroCopy } from '../../components/career/CareerKit';
import { cvLabel, downloadText, postCareer, resultKey, useCareerRun, useCvInput, wordCount } from '../../components/career/careerApi';
import { readUser } from '../../lib/currentUser';
import { parseSavedContent } from '../../utils/savedWork';
import type { LoadedWork } from '../../types/api';

// /api/linkedin/outreach (outreachSchema in backend/src/services/gemini.js); the last two are missing on older saves
interface OutreachResult {
  connectionRequest: string;
  referralPitch: string;
  recruiterDM: string;
  inMailSubject?: string;
  followUp?: string;
}

// Page state saved in a 'linkedin-outreach' work
interface SavedOutreach {
  jobTitle?: string;
  companyName?: string;
  targetName?: string;
  context?: string;
  tone?: string;
  result?: OutreachResult | null;
}

interface LinkedInOutreachProps {
  customApiKey: string;
  resumeText: string;
  setCurrentPage?: (page: string) => void;
  loadedWork?: LoadedWork | null;
  setLoadedWork?: (work: LoadedWork | null) => void;
  onFocusChange?: (mode: false | 'flow') => void;
}

const TOOL = { name: 'Outreach & DM Writer', icon: MessagesSquare };
const PHASES = ['Reading your background', 'Finding what to mention', 'Writing your messages'];
const TONES = ['Warm', 'Formal', 'Short and direct'];
// LinkedIn's limit for a connection note
const NOTE_MAX = 300;

type MessageId = 'connectionRequest' | 'referralPitch' | 'recruiterDM' | 'followUp';
const MESSAGES: { id: MessageId; label: string; icon: LucideIcon; to: string; when: string; limit?: number }[] = [
  { id: 'connectionRequest', label: 'Connection note', icon: UserPlus, to: 'Anyone at the company', when: 'Paste it in "Add a note" when you click Connect.', limit: NOTE_MAX },
  { id: 'referralPitch', label: 'Referral ask', icon: Handshake, to: 'Someone who works there', when: 'Send it once they accept your request. Ask for a short chat before asking for a referral.' },
  { id: 'recruiterDM', label: 'Recruiter message', icon: Send, to: 'The recruiter or hiring manager', when: 'Send as a message, an InMail or an email, with the subject line above.' },
  { id: 'followUp', label: 'Follow-up', icon: MessageSquareReply, to: 'Anyone who hasn\'t replied', when: 'Wait about a week. Send it once, then move on.' },
];

const COPY: IntroCopy = {
  title: <>Messages that <em>get a reply</em></>,
  checks: [
    'A connection note under LinkedIn\'s 300-character limit, a referral ask and a recruiter message.',
    'Written from your resume, so each one mentions something real about you.',
    'Edit any message on the page, then copy it. A follow-up for a week later is included.',
  ],
  formTitle: 'Write my messages',
  steps: [
    { icon: Building2, title: 'Add the role and company', text: 'And the person\'s name, if you know who you are writing to.' },
    { icon: UserPlus, title: 'Add your resume', text: 'Optional, so the messages mention your real experience instead of general claims.' },
    { icon: Send, title: 'Edit, copy, send', text: 'Tweak any line, copy it, and send it on LinkedIn or by email.' },
  ],
  gets: [
    { icon: UserPlus, title: 'Connection note that fits', text: 'Counted against LinkedIn\'s 300-character limit for notes, so it is never cut off.' },
    { icon: Handshake, title: 'A referral ask that isn\'t pushy', text: 'Asks for a short chat first, the way people who work there are most likely to say yes.' },
    { icon: Mail, title: 'Recruiter message with a subject', text: 'Ready for a LinkedIn message, an InMail or an email.' },
    { icon: CalendarClock, title: 'A follow-up for next week', text: 'One short, polite nudge for anyone who hasn\'t replied.' },
  ],
  faqs: [
    { q: 'Does CVMind send the messages?', a: 'No. CVMind never connects to your LinkedIn account. You copy each message and send it yourself, so nothing goes out without you.' },
    { q: 'Why is the connection note so short?', a: 'LinkedIn limits connection notes to 300 characters (some free accounts have a lower monthly allowance of notes). The counter turns red if your edits go over.' },
    { q: 'Do I need to know who I\'m writing to?', a: 'No. Add a name if you have one and the messages will use it. Without one, they are written so you can send them to anyone in that role.' },
    { q: 'Is it saved?', a: 'When you are signed in, the messages are saved to My Documents so you can reopen them. Your resume text is sent to our AI provider to write them. We don\'t sell your data.' },
  ],
  finalTitle: 'The right message opens the door',
  finalText: 'Add the role and company and get four messages in under a minute.',
};

export default function LinkedInOutreach({ customApiKey, resumeText, setCurrentPage, loadedWork, setLoadedWork, onFocusChange }: LinkedInOutreachProps) {
  const runner = useCareerRun<OutreachResult>(onFocusChange);
  const { stage, result, show, run } = runner;
  const cvState = useCvInput(resumeText);
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [targetName, setTargetName] = useState('');
  const [context, setContext] = useState('');
  const [tone, setTone] = useState('Warm');
  const [sourceName, setSourceName] = useState('');

  const [handledWork, setHandledWork] = useState<LoadedWork | null>(null);
  if (loadedWork && loadedWork !== handledWork) {
    setHandledWork(loadedWork);
    if (!loadedWork.deleted && loadedWork.type === 'linkedin-outreach') {
      const saved = parseSavedContent<SavedOutreach>(loadedWork.htmlContent);
      if (saved?.result) {
        setJobTitle(saved.jobTitle || '');
        setCompanyName(saved.companyName || '');
        setTargetName(saved.targetName || '');
        setContext(saved.context || '');
        setTone(saved.tone || 'Warm');
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
      const data = await postCareer<OutreachResult>('/api/linkedin/outreach', {
        jobTitle: role, companyName: companyName.trim(), targetName: targetName.trim(), context: context.trim(), tone,
      }, cvState, customApiKey);
      if (!data.connectionRequest && !data.recruiterDM) throw new Error('The AI did not write the messages this time. Please try again.');
      setSourceName(cvLabel(cvState));
      return data;
    });
  };

  if (stage === 'working') {
    return <CareerWorking tool={TOOL} title="Writing your messages…" phases={PHASES} phase={runner.phase} error={runner.error} onRetry={runner.retry} onEdit={runner.toIntro} />;
  }

  if (stage === 'result' && result) {
    return (
      <OutreachView
        key={resultKey('linkedin-outreach', result)}
        result={result}
        jobTitle={jobTitle}
        companyName={companyName}
        meta={[jobTitle, companyName, targetName && `To ${targetName}`, tone, sourceName].filter(Boolean).join(' · ')}
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
      resumeResult={result ? { label: 'Back to your messages', onClick: runner.toResult } : null}
      submit={{ label: 'Write my messages', disabled: !jobTitle.trim() || !cvState.ready, onClick: generate, hint: jobTitle.trim() ? undefined : 'Add the role you want to start.' }}
    >
      <div className="crt-row">
        <Field label="Role you want">
          <input className="tlr-input" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Data Analyst" maxLength={120} />
        </Field>
        <Field label="Company" optional>
          <input className="tlr-input" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Razorpay" maxLength={120} />
        </Field>
      </div>
      <Field label="Their name" optional>
        <input className="tlr-input" value={targetName} onChange={e => setTargetName(e.target.value)} placeholder="e.g. Priya Sharma" maxLength={80} />
      </Field>
      <Field label="Anything to mention" optional hint="How you found them, a post they wrote, a shared college or a mutual contact.">
        <textarea className="tlr-textarea" value={context} onChange={e => setContext(e.target.value)} placeholder="e.g. I read her post about the analytics team hiring freshers" maxLength={1000} />
      </Field>
      <Chips label="Tone" options={TONES} value={tone} onChange={setTone} />
      <CvPicker state={cvState} why="Your resume lets each message mention your real experience." />
    </CareerIntro>
  );
}

interface OutreachViewProps {
  result: OutreachResult;
  jobTitle: string;
  companyName: string;
  meta: string;
  onAgain: () => void;
  setCurrentPage?: (page: string) => void;
}

function OutreachView({ result, jobTitle, companyName, meta, onAgain, setCurrentPage }: OutreachViewProps) {
  const available = MESSAGES.filter(m => result[m.id]);
  const [active, setActive] = useState<MessageId>(available[0]?.id ?? 'connectionRequest');
  // Messages can be edited before copying
  const [texts, setTexts] = useState<Record<MessageId, string>>(() => ({
    connectionRequest: result.connectionRequest || '',
    referralPitch: result.referralPitch || '',
    recruiterDM: result.recruiterDM || '',
    followUp: result.followUp || '',
  }));
  const [subject, setSubject] = useState(result.inMailSubject || '');
  const msg = MESSAGES.find(m => m.id === active) ?? MESSAGES[0];
  const text = texts[active];
  const edited = text !== (result[active] || '');
  const words = wordCount(text);
  const recruiterSearch = companyName.trim()
    ? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`recruiter ${companyName.trim()}`)}`
    : '';

  const allText = () => available.map(m => [
    m.label.toUpperCase(),
    m.id === 'recruiterDM' && subject ? `Subject: ${subject}` : '',
    texts[m.id],
    '',
  ].filter(Boolean).join('\n')).join('\n');

  return (
    <CareerApp
      tool={TOOL}
      againLabel="Change my details"
      onAgain={onAgain}
      onExit={onAgain}
      heading={`Your ${available.length} messages are ready`}
      summary="Edit any of them right here, then copy it into LinkedIn. Each one has a note on when to send it."
      meta={meta}
      actions={
        <>
          <CopyButton text={text} label={`Copy ${msg.label.toLowerCase()}`} />
          <button type="button" className="tlr-btn tlr-btn--outline" onClick={() => downloadText(`LinkedIn messages - ${jobTitle}${companyName ? ` at ${companyName}` : ''}`, allText())}><Download size={17} /> Download all .txt</button>
        </>
      }
      footnote={readUser() ? 'Saved to My Documents. Your edits stay on this page.' : 'Sign in to save it to My Documents.'}
    >
      <div className="crt-layout">
        <div className="crt-main">
          <div className="crt-tabs" role="tablist" aria-label="Messages">
            {available.map(m => (
              <button key={m.id} type="button" role="tab" aria-selected={active === m.id} className={active === m.id ? 'is-on' : ''} onClick={() => setActive(m.id)}>
                <m.icon size={15} /> {m.label}
              </button>
            ))}
          </div>

          <Panel
            title={msg.label}
            icon={msg.icon}
            action={
              <div className="crt-actions-row">
                {msg.limit ? <CharCount text={text} limit={msg.limit} /> : <small className="crt-count">{words} words</small>}
                {edited && <button type="button" className="crt-copy" onClick={() => setTexts(t => ({ ...t, [active]: result[active] || '' }))}>Undo my edits</button>}
                <CopyButton text={text} small />
              </div>
            }
          >
            <p className="crt-text"><b>To:</b> {msg.to}</p>
            {active === 'recruiterDM' && subject !== '' && (
              <div className="crt-field">
                <span className="crt-label">Subject line</span>
                <div className="crt-actions-row">
                  <input className="tlr-input crt-grow" value={subject} onChange={e => setSubject(e.target.value)} aria-label="Subject line" />
                  <CopyButton text={subject} small />
                </div>
              </div>
            )}
            <textarea
              className="crt-edit"
              value={text}
              onChange={e => setTexts(t => ({ ...t, [active]: e.target.value }))}
              aria-label={`${msg.label}, editable`}
              rows={active === 'connectionRequest' ? 5 : 10}
            />
            {msg.limit && text.length > msg.limit && <p className="tlr-error">LinkedIn cuts connection notes at {msg.limit} characters. Shorten it before you send it.</p>}
            <p className="tlr-fine"><Clock size={13} /> {msg.when}</p>
          </Panel>
        </div>

        <aside className="crt-side">
          <section className="tlr-card">
            <h3>Who to send them to</h3>
            <ul className="crt-bullets">
              <li><CheckCircle2 size={15} />Recruiters and hiring managers for {jobTitle || 'the role'}{companyName ? ` at ${companyName}` : ''}.</li>
              <li><CheckCircle2 size={15} />People in the team you want to join, for the referral ask.</li>
              <li><CheckCircle2 size={15} />Alumni from your college: they reply more often.</li>
            </ul>
            {recruiterSearch && (
              <a className="tlr-btn tlr-btn--outline tlr-btn--block crt-mt" href={recruiterSearch} target="_blank" rel="noopener noreferrer">
                <Search size={16} /> Find recruiters at {companyName.trim()} <ExternalLink size={14} />
              </a>
            )}
          </section>
          <section className="tlr-card">
            <h3>Before you send</h3>
            <ul className="crt-bullets">
              <li><PencilLine size={15} />Read it once and change anything that doesn't sound like you.</li>
              <li><PencilLine size={15} />Send on a weekday morning, their time.</li>
              <li><PencilLine size={15} />Follow up once after a week. If there's still no reply, move on.</li>
            </ul>
          </section>
          <CareerNext current="linkedin-outreach" setCurrentPage={setCurrentPage} pick={['linkedin', 'linkedin-bio', 'elevator-pitch']} />
        </aside>
      </div>
    </CareerApp>
  );
}
