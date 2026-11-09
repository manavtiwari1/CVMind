import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Crown, Download, FileText, Loader2, Paperclip, PenLine, RotateCcw, TriangleAlert } from 'lucide-react';
import TemplatePreview from '../components/TemplatePreview';
import ResumeDownload from '../components/ResumeDownload';
import { RESUME_TEMPLATES, type Template } from '../data/resumeTemplates';
import { isProTemplate, requestUpgrade, userIsPro } from '../lib/billing';
import { exportHtml } from '../lib/branding';
import { downloadWord, fillTemplate, htmlToText, templateFor, workForEditor } from '../lib/resumeHandoff';
import type { SavedWork } from '../types/api';
import { trackResult, type ChoicesCard, type DocumentCard, type SummaryCard, type TemplatePickerCard } from './chatApi';

// Guided-flow cards (backend/src/leo/flows): the user taps instead of typing. Taps go to the
// server as actions, not as model messages, so they are instant and can't be misread.

export interface FlowActions {
  tap: (action: 'choose' | 'confirm' | 'template' | 'restore', value: Record<string, string>, label: string) => void;
  // Puts text in the message box for the user to finish
  compose: (text: string) => void;
  attachForFlow: () => void;
  openWork: (work: SavedWork) => void;
  built: (card: DocumentCard, html: string, workId: string) => void;
  signIn: () => void;
  isLoggedIn: boolean;
}

// Only the newest Leo message takes taps; older cards show what was picked
interface Props { live: boolean; busy: boolean; actions: FlowActions }

const wantsAttach = (option: string) => /old resume|attach|upload/i.test(option);

export function Choices({ card, live, busy, actions }: Props & { card: ChoicesCard }) {
  const [picked, setPicked] = useState('');
  return (
    <>
      {card.question && <div className="lc-kicker">{card.question}</div>}
      <div className="lc-choices" role="group" aria-label={card.question || 'Options'}>
        {card.options.map((option) => (
          <button
            key={option}
            type="button"
            className={`lc-choice ${picked === option ? 'is-picked' : ''}`}
            disabled={!live || busy}
            onClick={() => {
              setPicked(option);
              if (wantsAttach(option)) actions.attachForFlow();
              else actions.tap('choose', { field: card.field, label: option }, option);
            }}
          >
            {wantsAttach(option) && <Paperclip size={14} />} {option}
          </button>
        ))}
      </div>
    </>
  );
}

export function Summary({ card, live, busy, actions }: Props & { card: SummaryCard }) {
  return (
    <>
      <div className="lc-kicker">{card.title}</div>
      <dl className="lc-summary">
        {card.sections.map((s) => (
          <div key={s.title}>
            <dt>{s.title}</dt>
            {s.lines.filter(Boolean).map((line, i) => <dd key={i}>{line}</dd>)}
          </div>
        ))}
      </dl>
      {live && (
        <div className="lc-actions">
          <button type="button" className="lc-btn lc-btn-primary" disabled={busy} onClick={() => actions.tap('confirm', {}, 'Looks good')}><Check size={15} /> Looks good</button>
          <button type="button" className="lc-btn" disabled={busy} onClick={() => actions.compose('Change my ')}><PenLine size={15} /> Change something</button>
        </div>
      )}
    </>
  );
}

// Same templates and Pro badges as the builder page, ATS-friendly layouts first
const ATS_FIT = /ats|classic|minimal|clean|corporate|traditional/i;
const PICKER_TEMPLATES = [...RESUME_TEMPLATES].sort((a, b) => Number(!ATS_FIT.test(`${a.id} ${a.name} ${a.tag}`)) - Number(!ATS_FIT.test(`${b.id} ${b.name} ${b.tag}`)));
const FIRST_SHOWN = 6;

export function TemplatePicker({ card, live, busy, actions }: Props & { card: TemplatePickerCard }) {
  const [all, setAll] = useState(false);
  const [picked, setPicked] = useState(card.selected);
  const shown = all ? PICKER_TEMPLATES : PICKER_TEMPLATES.slice(0, FIRST_SHOWN);
  const pick = (t: Template) => {
    if (isProTemplate(t.id) && !userIsPro()) {
      requestUpgrade('template');
      return;
    }
    setPicked(t.id);
    actions.tap('template', { templateId: t.id, name: t.name }, `Use the ${t.name} template`);
  };
  return (
    <>
      <div className="lc-kicker">Pick a template · you can change it later</div>
      <div className="lc-templates">
        {shown.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`lc-template ${picked === t.id ? 'is-picked' : ''}`}
            disabled={!live || busy}
            onClick={() => pick(t)}
            aria-label={`Use ${t.name} template${isProTemplate(t.id) ? ' (Pro)' : ''}`}
          >
            <span className="lc-template-thumb">
              <TemplatePreview html={t.html} name={t.name} aspect="1 / 1.15" />
              {isProTemplate(t.id) && <span className="lc-template-pro"><Crown size={11} /> Pro</span>}
              {picked === t.id && <span className="lc-template-tick"><Check size={14} /></span>}
            </span>
            <span className="lc-template-name">{t.name}</span>
          </button>
        ))}
      </div>
      {!all && PICKER_TEMPLATES.length > FIRST_SHOWN && (
        <button type="button" className="lc-more" onClick={() => setAll(true)}>Show all {PICKER_TEMPLATES.length} templates</button>
      )}
    </>
  );
}

const BUILD_STEPS = ['Reading your answers', 'Writing strong bullet points', 'Filling your template', 'Checking the layout'];

/**
 * The finished resume. A card that just arrived fills its template in the browser (the same
 * /api/resume/generate call and limits as the builder page), saves it to My Documents and hands
 * the HTML back to the chat, so a reopened chat shows it without building again.
 */
export function ResumeResult({ card, fresh, actions }: { card: DocumentCard; fresh: boolean; actions: FlowActions }) {
  const [html, setHtml] = useState(card.html || '');
  const [workId, setWorkId] = useState(card.workId || '');
  const [error, setError] = useState('');
  const [building, setBuilding] = useState(false);
  const [stepAt, setStepAt] = useState(0);
  const [download, setDownload] = useState(false);
  const started = useRef(false);
  const template = templateFor(card.templateId);
  const fileName = (card.data.personalInfo?.fullName || 'Resume').trim();

  const build = useCallback(async () => {
    setBuilding(true);
    setError('');
    setStepAt(0);
    try {
      const filled = await fillTemplate(card.data, card.templateId, {}, card.keepFacts);
      const work = await workForEditor(filled, card.templateId, card.title, 'leo-chat');
      const id = String(work._id || work.id || '');
      setHtml(filled);
      setWorkId(id);
      actions.built(card, filled, id);
    } catch (err) {
      setError((err as Error).message || 'Could not build your resume.');
    } finally {
      setBuilding(false);
    }
  }, [card, actions]);

  useEffect(() => {
    if (started.current || html || !fresh || !actions.isLoggedIn) return;
    started.current = true;
    void build();
  }, [build, html, fresh, actions.isLoggedIn]);

  useEffect(() => {
    if (!building) return;
    const t = setInterval(() => setStepAt((i) => Math.min(i + 1, BUILD_STEPS.length - 1)), 2600);
    return () => clearInterval(t);
  }, [building]);

  const work = (): SavedWork => ({ ...(workId ? { _id: workId } : {}), title: card.title, type: 'resume', templateId: card.templateId, htmlContent: html, source: 'leo-chat' });

  if (!html) {
    return (
      <div className="lc-build">
        {building ? (
          <>
            <Loader2 size={18} className="lx-spin" />
            <div>
              <div className="lc-title">{BUILD_STEPS[stepAt]}…</div>
              <p className="lc-text">Building your resume with the {template.name} template. This takes about 20 seconds.</p>
            </div>
          </>
        ) : error ? (
          <>
            <TriangleAlert size={18} />
            <div>
              <p className="lc-text">{error}</p>
              <button type="button" className="lc-btn lc-btn-primary" onClick={() => void build()}><RotateCcw size={15} /> Try again</button>
            </div>
          </>
        ) : !actions.isLoggedIn ? (
          <>
            <FileText size={18} />
            <div>
              <p className="lc-text">Sign in to build and download this resume.</p>
              <button type="button" className="lc-btn lc-btn-primary" onClick={actions.signIn}>Sign in free</button>
            </div>
          </>
        ) : (
          <>
            <FileText size={18} />
            <div>
              <div className="lc-title">{card.title}</div>
              <button type="button" className="lc-btn lc-btn-primary" onClick={() => void build()}>Build it</button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="lc-doc">
      <div className="lc-doc-preview">
        <TemplatePreview html={html} name={card.title} eager />
      </div>
      <div className="lc-doc-side">
        <div className="lc-kicker">Your resume · {template.name}</div>
        <div className="lc-title">{card.title}</div>
        {workId && <p className="lc-text lc-saved"><Check size={14} /> Saved to My Documents</p>}
        <div className="lc-doc-actions">
          <button type="button" className="lc-btn lc-btn-primary" onClick={() => { trackResult(card.product, 'edit'); actions.openWork(work()); }}>
            <PenLine size={15} /> Edit in Editor
          </button>
          <button type="button" className="lc-btn" onClick={() => { trackResult(card.product, 'pdf'); setDownload(true); }}>
            <Download size={15} /> Download PDF
          </button>
          <button type="button" className="lc-btn" onClick={() => { trackResult(card.product, 'word'); downloadWord(exportHtml(html), fileName.replace(/\s+/g, '_')); }}>
            <FileText size={15} /> Download Word
          </button>
        </div>
      </div>
      {download && (
        <ResumeDownload
          defaultName={fileName}
          paper="a4"
          getHtml={() => html}
          getText={() => htmlToText(html)}
          customApiKey=""
          onWord={(name, exported) => downloadWord(exported, name)}
          onClose={() => setDownload(false)}
        />
      )}
    </div>
  );
}
