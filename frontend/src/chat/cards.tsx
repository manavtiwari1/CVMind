import { useState } from 'react';
import { ArrowRight, Briefcase, Check, ChevronDown, Copy, ExternalLink, Lock, MapPin, Paperclip, TriangleAlert } from 'lucide-react';
import type { AtsCard, Card, CoverLetterCard, InterviewCard, JobsCard, LockedCard, PortfolioCard, RoadmapCard, TailorCard } from './chatApi';
import { Choices, ResumeResult, Summary, TemplatePicker, type FlowActions } from './flowCards';
import PortfolioResult, { PortfolioLooks } from './PortfolioResult';
import MissionResult, { CareerProfileView, ProfileNote } from './MissionResult';
import CoverLetterResult, { type LetterText } from './CoverLetterResult';
import { ApplyPackView, ConnectView, JobPickView, RemindersView, TailorDocument, WritingView } from './AgentCards';

// The result cards Leo's tools return (backend/src/leo/tools.js, leo/flows). Every card shows the
// real result in the chat, plus a way into the full tool.

export interface CardActions extends FlowActions {
  go: (page: string) => void;
  attach: () => void;
  followUp: (prompt: string) => void;
  portfolioSaved: (card: PortfolioCard, workId: string) => void;
  // The letter's words or design changed: kept with the card so a reopened chat shows them
  letterSaved: (card: CoverLetterCard, text: LetterText, html: string, designId: string, workId: string) => void;
  // A tool was connected from a card: updates the count and sends the user's request again
  connectorsChanged: (connectedCount: number) => void;
  retryLast: () => void;
  // The newest portfolio in this chat; older cards can't publish
  latestPortfolioId?: string;
}

// live: the card is in the newest Leo message, so it takes taps. fresh: it arrived in this visit.
interface Where { live: boolean; fresh: boolean; busy: boolean }

function scoreTone(score: number) {
  if (score >= 75) return 'good';
  if (score >= 50) return 'ok';
  return 'low';
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const value = Math.max(0, Math.min(100, Math.round(score)));
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className={`lc-ring lc-${scoreTone(value)}`} role="img" aria-label={`${label}: ${value} out of 100`}>
      <svg viewBox="0 0 72 72" width="72" height="72" aria-hidden="true">
        <circle cx="36" cy="36" r={r} className="lc-ring-track" />
        <circle cx="36" cy="36" r={r} className="lc-ring-value" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <span className="lc-ring-num">{value}</span>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="lc-bar">
      <span className="lc-bar-label">{label}</span>
      <span className="lc-bar-track"><span className={`lc-bar-fill lc-${scoreTone(v)}`} style={{ width: `${v}%` }} /></span>
      <span className="lc-bar-num">{v}</span>
    </div>
  );
}

function Chips({ items, tone }: { items: string[]; tone?: 'good' | 'low' }) {
  if (!items.length) return null;
  return <div className="lc-chips">{items.map((item) => <span key={item} className={`lc-chip ${tone ? `lc-chip-${tone}` : ''}`}>{item}</span>)}</div>;
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="lc-section">
      <h4>{title}</h4>
      <ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </div>
  );
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="lc-btn"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
      }}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : label}
    </button>
  );
}

const FollowUps = ({ prompts, actions }: { prompts: string[]; actions: CardActions }) => (
  <div className="lc-followups">
    {prompts.map((p) => <button key={p} type="button" className="lc-follow" onClick={() => actions.followUp(p)}>{p}</button>)}
  </div>
);

function Ats({ card, actions }: { card: AtsCard; actions: CardActions }) {
  return (
    <>
      <div className="lc-head">
        <ScoreRing score={card.score} label="ATS score" />
        <div>
          <div className="lc-kicker">ATS score</div>
          <div className="lc-title">{card.score >= 75 ? 'Strong resume' : card.score >= 50 ? 'Good start, needs work' : 'Needs a lot of work'}</div>
        </div>
      </div>
      <div className="lc-bars">
        <Bar label="Keywords" value={card.sections.keywords} />
        <Bar label="Impact" value={card.sections.impact} />
        <Bar label="Formatting" value={card.sections.formatting} />
      </div>
      {card.summary && <p className="lc-text">{card.summary}</p>}
      <List title="What works" items={card.strengths} />
      <List title="What to fix" items={card.weaknesses} />
      {card.missing.length > 0 && <div className="lc-section"><h4>Missing keywords</h4><Chips items={card.missing} tone="low" /></div>}
      {card.rewrites.length > 0 && (
        <div className="lc-section">
          <h4>Stronger bullets</h4>
          {card.rewrites.map((r, i) => (
            <div key={i} className="lc-rewrite">
              <p className="lc-before">{r.original}</p>
              <p className="lc-after">{r.improved}</p>
            </div>
          ))}
        </div>
      )}
      <FollowUps actions={actions} prompts={['Fix my resume for me', 'Rewrite my weakest bullets', 'Tailor my resume to a job', 'Interview questions from my resume']} />
    </>
  );
}

function Tailor({ card, actions }: { card: TailorCard; actions: CardActions }) {
  const copyText = [card.summary, ...card.bullets.flatMap((b) => [b.role, ...b.points.map((p) => `• ${p}`)])].filter(Boolean).join('\n');
  return (
    <>
      <div className="lc-head">
        <ScoreRing score={card.matchScore} label="Job match" />
        <div>
          <div className="lc-kicker">Tailored resume</div>
          <div className="lc-title">Job match {Math.round(card.matchScore)}/100</div>
        </div>
      </div>
      <List title="What changed" items={card.insights} />
      {card.matched.length > 0 && <div className="lc-section"><h4>Skills you match</h4><Chips items={card.matched} tone="good" /></div>}
      {card.missing.length > 0 && <div className="lc-section"><h4>Skills the job wants that you're missing</h4><Chips items={card.missing} tone="low" /></div>}
      {card.summary && <div className="lc-section"><h4>New summary</h4><p className="lc-text">{card.summary}</p></div>}
      {card.bullets.map((b) => (
        <div key={b.role} className="lc-section">
          <h4>{b.role}</h4>
          <ul>{b.points.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </div>
      ))}
      <div className="lc-actions">
        <CopyButton text={copyText} />
        {!card.data && <button type="button" className="lc-btn lc-btn-primary" onClick={() => actions.go('tailor')}>Make the full resume in Tailor <ArrowRight size={15} /></button>}
      </div>
      <TailorDocument card={card} actions={actions} />
    </>
  );
}

function Interview({ card, actions }: { card: InterviewCard; actions: CardActions }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <>
      <div className="lc-kicker">Interview questions · {card.role.toLowerCase().includes(card.level.toLowerCase().replace('-level', '')) ? card.role : `${card.level} ${card.role}`}</div>
      <ol className="lc-questions">
        {card.questions.map((q, i) => (
          <li key={i} className={open === i ? 'is-open' : ''}>
            <button type="button" className="lc-q" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
              <span className="lc-q-num">{i + 1}</span>
              <span className="lc-q-text">{q.question}</span>
              <ChevronDown size={16} className="lc-q-chev" />
            </button>
            {open === i && (
              <div className="lc-q-body">
                <div className="lc-q-tags"><span>{q.category}</span><span>{q.difficulty}</span></div>
                {q.wants && <p className="lc-text">{q.wants}</p>}
                {q.keyPoints.length > 0 && <ul>{q.keyPoints.map((k, j) => <li key={j}>{k}</li>)}</ul>}
              </div>
            )}
          </li>
        ))}
      </ol>
      <div className="lc-actions">
        <button type="button" className="lc-btn" onClick={() => actions.followUp(`Let me practise: ask me question 1 and give feedback on my answer`)}>Practise here</button>
        <button type="button" className="lc-btn lc-btn-primary" onClick={() => actions.go('voice-prep')}>Voice mock interview <ArrowRight size={15} /></button>
      </div>
    </>
  );
}

function Roadmap({ card }: { card: RoadmapCard }) {
  return (
    <>
      <div className="lc-kicker">Roadmap to {card.targetRole}</div>
      {card.summary && <p className="lc-text">{card.summary}</p>}
      <ol className="lc-steps">
        {card.steps.map((s, i) => (
          <li key={i}>
            <span className="lc-step-dot">{i + 1}</span>
            <div>
              <div className="lc-step-name">{s.name} <span>{s.timeframe}</span></div>
              {s.focus && <p className="lc-text">{s.focus}</p>}
              {s.actions.length > 0 && <ul>{s.actions.map((a, j) => <li key={j}>{a}</li>)}</ul>}
              {s.milestone && <p className="lc-milestone"><Check size={14} /> {s.milestone}</p>}
            </div>
          </li>
        ))}
      </ol>
      {card.skills.length > 0 && <div className="lc-section"><h4>Skills to build</h4><Chips items={card.skills} /></div>}
    </>
  );
}

function Jobs({ card, actions }: { card: JobsCard; actions: CardActions }) {
  if (!card.jobs.length) {
    return (
      <>
        <p className="lc-text">No open jobs matched “{card.query}” on the company career pages we check.</p>
        <div className="lc-actions"><button type="button" className="lc-btn lc-btn-primary" onClick={() => actions.go('job-finder')}>Search in Job Finder <ArrowRight size={15} /></button></div>
      </>
    );
  }
  return (
    <>
      <div className="lc-kicker">
        {card.loose ? `No exact matches for “${card.query}” · related openings` : `${card.total} open job${card.total === 1 ? '' : 's'} for “${card.query}”`}
      </div>
      <ul className="lc-jobs">
        {card.jobs.map((j) => (
          <li key={j.id}>
            <span className="lc-job-logo" aria-hidden="true"><Briefcase size={16} /></span>
            <div className="lc-job-main">
              <div className="lc-job-title">{j.title}</div>
              <div className="lc-job-meta">{j.company}{j.location && <> · <MapPin size={12} /> {j.location}</>}{j.remote && ' · Remote'}</div>
            </div>
            {j.url && <a className="lc-btn" href={j.url} target="_blank" rel="noopener noreferrer">Apply <ExternalLink size={14} /></a>}
          </li>
        ))}
      </ul>
      <div className="lc-actions">
        <button type="button" className="lc-btn lc-btn-primary" onClick={() => actions.go('job-finder')}>More jobs in Job Finder <ArrowRight size={15} /></button>
      </div>
    </>
  );
}

function Locked({ card, actions }: { card: LockedCard; actions: CardActions }) {
  const button = card.action === 'attach'
    ? <button type="button" className="lc-btn lc-btn-primary" onClick={actions.attach}><Paperclip size={15} /> Attach resume</button>
    : card.action === 'signin'
      ? <button type="button" className="lc-btn lc-btn-primary" onClick={actions.signIn}>Sign in free</button>
      : card.action === 'upgrade'
        ? <button type="button" className="lc-btn lc-btn-primary" onClick={() => actions.go('pricing')}>See CVMind Pro</button>
        : null;
  return (
    <div className="lc-locked">
      {card.action === 'attach' ? <Paperclip size={18} /> : <Lock size={18} />}
      <p>{card.message}</p>
      {button}
    </div>
  );
}

export default function ResultCard({ card, actions, live, fresh, busy }: { card: Card; actions: CardActions } & Where) {
  if (card.type === 'mission') return <MissionResult card={card} actions={actions} fresh={fresh} busy={busy} />;
  if (card.type === 'profile_note') return <ProfileNote card={card} actions={actions} />;
  if (card.type === 'career_profile') return <CareerProfileView card={card} actions={actions} />;
  if (card.type === 'connect') return <div className="lc-card"><ConnectView card={card} actions={actions} live={live} busy={busy} /></div>;
  if (card.type === 'writing') return <div className="lc-card"><WritingView card={card} /></div>;
  if (card.type === 'job_pick') return <div className="lc-card"><JobPickView card={card} /></div>;
  if (card.type === 'apply_pack') return <div className="lc-card"><ApplyPackView card={card} actions={actions} fresh={fresh} busy={busy} /></div>;
  if (card.type === 'reminders') return <div className="lc-card"><RemindersView card={card} /></div>;
  if (card.type === 'choices') return <div className="lc-card lc-card-choices"><Choices card={card} live={live} busy={busy} actions={actions} /></div>;
  if (card.type === 'summary_confirm') return <div className="lc-card"><Summary card={card} live={live} busy={busy} actions={actions} /></div>;
  if (card.type === 'template_picker') return <div className="lc-card"><TemplatePicker card={card} live={live} busy={busy} actions={actions} /></div>;
  if (card.type === 'document') return <div className="lc-card lc-card-document"><ResumeResult card={card} fresh={fresh} actions={actions} /></div>;
  if (card.type === 'portfolio') return <div className="lc-card lc-card-portfolio"><PortfolioResult card={card} actions={actions} latest={actions.latestPortfolioId === card.id} busy={busy} /></div>;
  if (card.type === 'portfolio_looks') return <div className="lc-card lc-card-choices"><PortfolioLooks card={card} live={live} busy={busy} tap={(label) => actions.tap('choose', { field: '', label }, label)} /></div>;
  if (card.type === 'link') {
    return (
      <button type="button" className="lc-link" onClick={() => actions.go(card.page)}>
        <span>
          <strong>{card.label}</strong>
          {card.reason && <small>{card.reason}</small>}
        </span>
        <ArrowRight size={18} />
      </button>
    );
  }
  if (card.type === 'error') {
    return <div className="lc-card lc-error"><TriangleAlert size={16} /> {card.message}</div>;
  }
  return (
    <div className={`lc-card lc-card-${card.type}`}>
      {card.type === 'ats' && <Ats card={card} actions={actions} />}
      {card.type === 'tailor' && <Tailor card={card} actions={actions} />}
      {card.type === 'cover_letter' && <CoverLetterResult card={card} actions={actions} />}
      {card.type === 'interview' && <Interview card={card} actions={actions} />}
      {card.type === 'roadmap' && <Roadmap card={card} />}
      {card.type === 'jobs' && <Jobs card={card} actions={actions} />}
      {card.type === 'locked' && <Locked card={card} actions={actions} />}
    </div>
  );
}
