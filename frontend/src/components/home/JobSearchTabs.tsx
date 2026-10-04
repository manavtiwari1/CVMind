import { useState, type ReactNode } from 'react';
import { ArrowRight, FileText, ListChecks, Mic, PenLine, Search, Send, Sparkles, LayoutTemplate, Gauge, Languages, ClipboardCheck, Target, Timer, Wand2 } from 'lucide-react';
import TemplatePreview from '../TemplatePreview';
import { TEMPLATES } from '../../data/resumeTemplates';
import { withSampleData } from '../../data/samplePreview';
import ScoreCard from './ScoreCard';

interface JobSearchTabsProps {
  setCurrentPage: (page: string) => void;
  onCheck: () => void;
}

const tpl = (id: string) => TEMPLATES.find((t) => t.id === id);

function TemplateVisual({ id }: { id: string }) {
  const t = tpl(id);
  if (!t) return null;
  return (
    <div className="hp-tab-paper">
      <TemplatePreview html={withSampleData(t)} name={t.name} eager aspect="700 / 720" pageWidth={700} />
    </div>
  );
}

function RowsVisual({ title, rows }: { title: string; rows: { main: string; sub: string; tag: string }[] }) {
  return (
    <div className="hp-rows-card">
      <div className="hp-float-eyebrow">{title} <em>Example</em></div>
      {rows.map((r) => (
        <div key={r.main} className="hp-rows-item">
          <span><b>{r.main}</b><small>{r.sub}</small></span>
          <span className="hp-rows-tag">{r.tag}</span>
        </div>
      ))}
    </div>
  );
}

interface Tab {
  label: string;
  icon: typeof FileText;
  heading: string;
  body: string;
  points: { icon: typeof FileText; text: string }[];
  cta: string;
  page: string | 'check';
  visual: ReactNode;
}

const TABS: Tab[] = [
  {
    label: 'Resume Builder',
    icon: FileText,
    heading: 'Start with a resume that gets read',
    body: 'Pick a template, fill in your details and let the AI tighten each section. It is the quickest way from a blank page to something you can send.',
    points: [
      { icon: LayoutTemplate, text: '20+ sections and ATS-tested layouts to choose from.' },
      { icon: Sparkles, text: 'AI rewrites weak bullets into clear, results-first lines.' },
      { icon: Languages, text: 'Edit freely in a Word-style editor and export to DOCX or PDF.' },
    ],
    cta: 'Open the builder',
    page: 'resume-builder',
    visual: <TemplateVisual id="cv-modern" />,
  },
  {
    label: 'Resume Checker',
    icon: Gauge,
    heading: 'Know where your resume stands',
    body: 'Upload a PDF, DOCX or TXT file and get a score with the keywords, structure and wording that are holding it back.',
    points: [
      { icon: Target, text: 'Keyword coverage against the role you want.' },
      { icon: ClipboardCheck, text: 'Formatting checks for headings, dates and layout.' },
      { icon: Wand2, text: 'One-click AI fix that rewrites the resume with the suggestions applied.' },
    ],
    cta: 'Check my resume',
    page: 'check',
    visual: <div className="hp-tab-center"><ScoreCard score={72} matched={['Python', 'SQL', 'Dashboards']} missing={['A/B testing', 'Stakeholder reporting']} compact /></div>,
  },
  {
    label: 'Cover Letters',
    icon: PenLine,
    heading: 'A cover letter that matches your resume',
    body: 'Start from a cover letter layout that pairs with your resume design, then let the AI draft the body from the job description.',
    points: [
      { icon: LayoutTemplate, text: 'Twelve layouts, from classic to creative.' },
      { icon: Sparkles, text: 'AI drafts a first version from the job description.' },
      { icon: PenLine, text: 'Edit every line in the same editor as your resume.' },
    ],
    cta: 'Write a cover letter',
    page: 'resume-editor',
    visual: <TemplateVisual id="modern-cl" />,
  },
  {
    label: 'Job Finder',
    icon: Search,
    heading: 'Find roles that fit your profile',
    body: 'Match your resume against open roles and see why each one fits, with the skills you have and the ones you would need.',
    points: [
      { icon: Gauge, text: 'A compatibility score for every role.' },
      { icon: Target, text: 'Matched and missing skills shown side by side.' },
      { icon: Send, text: 'Direct links to apply on the original posting.' },
    ],
    cta: 'Find jobs',
    page: 'job-finder',
    visual: (
      <RowsVisual
        title="Matches"
        rows={[
          { main: 'Frontend Engineer', sub: 'Remote · 3 to 5 yrs', tag: '86% match' },
          { main: 'React Developer', sub: 'Hybrid · Bengaluru', tag: '78% match' },
          { main: 'Product Engineer', sub: 'On-site · Pune', tag: '71% match' },
        ]}
      />
    ),
  },
  {
    label: 'Interview Prep',
    icon: Mic,
    heading: 'Practise before it counts',
    body: 'Rehearse behavioural questions with an AI coach. Answer in text or by voice and get feedback on structure and clarity.',
    points: [
      { icon: ListChecks, text: 'Feedback shaped around the STAR method.' },
      { icon: Mic, text: 'Speak your answers and get notes on delivery.' },
      { icon: Timer, text: 'Short sessions you can fit in before a call.' },
    ],
    cta: 'Start practising',
    page: 'prep',
    visual: (
      <RowsVisual
        title="Practice question"
        rows={[
          { main: 'Tell me about a time you handled a tight deadline.', sub: 'Behavioural', tag: 'Situation ✓' },
          { main: 'What was your specific role?', sub: 'Follow-up', tag: 'Task ✓' },
          { main: 'What was the measurable result?', sub: 'Follow-up', tag: 'Add a number' },
        ]}
      />
    ),
  },
  {
    label: 'Auto Apply',
    icon: Send,
    heading: 'Let the agent handle the repetitive part',
    body: 'Set your preferences once. The agent finds matching jobs and prepares applications for you to review.',
    points: [
      { icon: Target, text: 'Preferences for role, location and salary.' },
      { icon: ClipboardCheck, text: 'Applications queued for your review.' },
      { icon: Gauge, text: 'A tracker so nothing slips through.' },
    ],
    cta: 'Open Auto Apply',
    page: 'auto-apply',
    visual: (
      <RowsVisual
        title="Application queue"
        rows={[
          { main: 'Frontend Engineer', sub: 'Ready to review', tag: 'Queued' },
          { main: 'UI Engineer', sub: 'Resume tailored', tag: 'Ready' },
          { main: 'React Developer', sub: 'Submitted', tag: 'Applied' },
        ]}
      />
    ),
  },
];

export default function JobSearchTabs({ setCurrentPage, onCheck }: JobSearchTabsProps) {
  const [active, setActive] = useState(0);
  const tab = TABS[active];

  return (
    <section className="hp-tabs">
      <div className="hp-wrap">
        <h2 className="hp-h2 hp-h2--light hp-center">One place to run your entire job search</h2>
        <p className="hp-body hp-body--light hp-center hp-tabs-sub">
          Building, checking, tailoring, applying and interview prep, without juggling four different tools.
        </p>

        <div className="hp-tab-pills" role="tablist">
          {TABS.map((t, i) => (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={i === active}
              className={`hp-tab-pill${i === active ? ' is-active' : ''}`}
              onClick={() => setActive(i)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="hp-tab-panel" role="tabpanel" key={tab.label}>
          <div className="hp-tab-copy">
            <h3 className="hp-h3 hp-h3--light">{tab.heading}</h3>
            <p className="hp-body hp-body--light">{tab.body}</p>
            <ul className="hp-tab-points">
              {tab.points.map(({ icon: Icon, text }) => (
                <li key={text}><span className="hp-tab-point-icon"><Icon size={18} /></span>{text}</li>
              ))}
            </ul>
            <button type="button" className="hp-btn hp-btn--primary" onClick={() => (tab.page === 'check' ? onCheck() : setCurrentPage(tab.page))}>
              {tab.cta} <ArrowRight size={16} />
            </button>
          </div>
          <div className="hp-tab-visual">{tab.visual}</div>
        </div>
      </div>
    </section>
  );
}
