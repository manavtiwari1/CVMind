import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, Check, CircleCheck, Contrast, Copy, Download, Eye, FileText, LayoutTemplate, Loader2,
  MessageSquare, Redo2, RotateCcw, Send, Sparkles, Undo2, X,
} from 'lucide-react';
import { DesignPanel } from '../../components/ResumeStudioPanels';
import { EntryToolbar, SelectionToolbar, StudioPreview } from '../../components/ResumeStudio';
import ResumeDownload from '../../components/ResumeDownload';
import { PhotoDialog, PhotoHover } from '../../components/ResumePhoto';
import TemplatePreview from '../../components/TemplatePreview';
import cvmindIcon from '../../assets/cvmind_icon.png';
import { authFetch } from '../../lib/authFetch';
import { API_BASE } from '../../lib/apiBase';
import { readUser } from '../../lib/currentUser';
import {
  DEFAULT_DESIGN, GOOGLE_FONTS_HREF, PAPER, applyFontFamily, applyFontScale, applyLineHeight, applyMargin, applySpacing,
  hasColor, isProfilePhoto, recolorHtml, type DesignState,
} from '../../lib/resumeDesign';
import { htmlForPdf } from '../../lib/printLayout';
import { TEMPLATES } from '../../data/resumeTemplates';
import {
  LETTER_DESIGNS, clearLetterDraft, completeLetter, designById, downloadLetterDoc, renderLetter, takeLetterDraft,
} from '../../lib/coverLetter';
import { getErrorMessage } from '../../utils/errors';
import type { LoadedWork } from '../../types/api';
import './CoverLetterPages.css';

interface CoverLetterEditorProps {
  customApiKey: string;
  loadedWork?: LoadedWork | null;
  setLoadedWork?: (work: LoadedWork | null) => void;
  setCurrentPage: (page: string) => void;
  onFocusChange?: (mode: false | 'flow' | 'studio') => void;
}

// Fix-only AI actions: they improve the letter as written and never retarget it to another job
const AI_FIXES: { label: string; prompt: string }[] = [
  { label: 'Fix spelling & grammar', prompt: 'Fix spelling, grammar and punctuation, and make unclear sentences clearer. Keep the meaning, facts, length and tone the same.' },
  { label: 'Make it concise', prompt: 'Make the letter more concise: cut filler and repetition so it reads in under a minute. Keep every fact and the overall structure.' },
  { label: 'More confident tone', prompt: 'Make the tone more confident and direct. Replace hedging ("I believe", "I think I could") with clear statements. Do not add new facts.' },
  { label: 'Stronger opening', prompt: 'Rewrite only the first body paragraph so it opens with a specific, engaging hook that names the role. Leave the rest of the letter unchanged.' },
  { label: 'Stronger closing', prompt: 'Rewrite only the final body paragraph so it ends with a confident, specific call to action. Leave the rest of the letter unchanged.' },
  { label: 'Remove clichés', prompt: 'Replace clichés and generic phrases ("team player", "passionate", "hard-working", "I am writing to express") with specific, natural wording based only on what the letter already says.' },
];

const stripFences = (s: string) => s.trim().replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();

/** The accent colour a document starts with: a cover letter design, or one of the older cover letter templates. */
function baseColorFor(templateId: string): string {
  if (LETTER_DESIGNS.some(d => d.id === templateId)) return designById(templateId).color;
  return TEMPLATES.find(t => t.id === templateId)?.color || LETTER_DESIGNS[0].color;
}

// With nothing handed over, the editor opens the first design with its sample letter
const blankHtml = () => LETTER_DESIGNS[0].render(LETTER_DESIGNS[0].sample);

// Thumbnails for the Templates drawer: each design with its own sample
const thumbHtml = (id: string) => designById(id).render(designById(id).sample);

export default function CoverLetterEditor({ customApiKey, loadedWork, setLoadedWork, setCurrentPage, onFocusChange }: CoverLetterEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  // The document this editor opened with: a saved work, a hand-off from the generator / builder, or a blank letter
  const [initial] = useState(() => {
    if (loadedWork && !loadedWork.deleted) {
      return { html: loadedWork.htmlContent, templateId: loadedWork.templateId, title: loadedWork.title, workId: loadedWork.id || loadedWork._id || null, prompt: '' };
    }
    const draft = takeLetterDraft();
    if (draft) return { ...draft, workId: null };
    return { html: blankHtml(), templateId: LETTER_DESIGNS[0].id, title: 'Untitled Cover Letter', workId: null, prompt: '' };
  });
  const [title, setTitle] = useState(initial.title || 'Untitled Cover Letter');
  const [workId, setWorkId] = useState<string | null>(initial.workId);
  const [templateId, setTemplateId] = useState(initial.templateId);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'local'>(readUser() ? 'saved' : 'local');
  const [drawer, setDrawer] = useState<'design' | 'templates' | null>(null);
  // A letter from the Cover Letter Builder opens with the AI Assistant and a suggestion built from the user's answers
  const [panel, setPanel] = useState<'fix' | 'assistant' | null>(initial.prompt ? 'assistant' : null);
  const [design, setDesign] = useState<DesignState>(DEFAULT_DESIGN);
  const [words, setWords] = useState(0);
  const [aiBusy, setAiBusy] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiPrompt, setAiPrompt] = useState(initial.prompt || '');
  const [beforeAi, setBeforeAi] = useState('');
  const [showDownload, setShowDownload] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [copied, setCopied] = useState(false);
  // Snapshots for changes outside the browser's own undo stack (+ Entry, delete, move)
  const structHistory = useRef<{ before: string; after: string }[]>([]);
  const baseColor = baseColorFor(templateId);

  // Full-screen editor without the site chrome
  useEffect(() => {
    onFocusChange?.('studio');
    return () => onFocusChange?.(false);
  }, [onFocusChange]);

  useEffect(() => {
    if (loadedWork) setLoadedWork?.(null);
  }, [loadedWork, setLoadedWork]);

  useEffect(() => {
    clearLetterDraft();
    if (document.getElementById('cvmind-studio-fonts')) return;
    document.head.appendChild(Object.assign(document.createElement('link'), { id: 'cvmind-studio-fonts', rel: 'stylesheet', href: GOOGLE_FONTS_HREF }));
  }, []);

  const countWords = useCallback(() => {
    const t = editorRef.current?.innerText || '';
    setWords(t.trim() ? t.trim().split(/\s+/).length : 0);
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initial.html;
      countWords();
    }
  }, [initial, countWords]);

  // Autosave to My Documents every few seconds while signed in
  const titleRef = useRef(title);
  const workIdRef = useRef(workId);
  const templateRef = useRef(templateId);
  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { workIdRef.current = workId; }, [workId]);
  useEffect(() => { templateRef.current = templateId; }, [templateId]);
  useEffect(() => {
    // A saved work starts as saved; a new letter is saved on the first tick
    let last = initial.workId ? { html: initial.html, title: initial.title } : { html: '', title: '' };
    const t = setInterval(async () => {
      const html = editorRef.current?.innerHTML || '';
      const name = titleRef.current.trim() || 'Untitled Cover Letter';
      const user = readUser();
      const userId = user?.id || user?._id;
      if (!userId || !html.trim() || (html === last.html && name === last.title)) return;
      setSaveState('saving');
      try {
        const res = await authFetch(`${API_BASE}/api/user/work`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, title: name, type: 'cover-letter', templateId: templateRef.current, htmlContent: html, workId: workIdRef.current }),
        });
        const data = await res.json();
        if (res.ok && data.data) {
          last = { html, title: name };
          setWorkId(data.data.id || data.data._id || workIdRef.current);
          setSaveState('saved');
        } else {
          setSaveState('idle');
        }
      } catch {
        setSaveState('idle');
      }
    }, 4000);
    return () => clearInterval(t);
  }, [initial]);

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val ?? '');
    countWords();
  };

  const recordStructural = (mutate: () => void) => {
    const ed = editorRef.current;
    if (!ed) return;
    const before = ed.innerHTML;
    mutate();
    structHistory.current = [...structHistory.current.slice(-29), { before, after: ed.innerHTML }];
    countWords();
  };

  const undo = () => {
    const ed = editorRef.current;
    const last = structHistory.current[structHistory.current.length - 1];
    if (ed && last && ed.innerHTML === last.after) {
      ed.innerHTML = last.before;
      structHistory.current = structHistory.current.slice(0, -1);
      countWords();
      return;
    }
    exec('undo');
  };

  const addLink = () => {
    const url = window.prompt('Link address (https://…)');
    if (url && /^https?:\/\//i.test(url.trim())) exec('createLink', url.trim());
  };

  const handleDesign = (next: Partial<DesignState>) => {
    const ed = editorRef.current;
    if (!ed) return;
    recordStructural(() => {
      if (next.margin !== undefined) applyMargin(ed, next.margin);
      if (next.spacing !== undefined) applySpacing(ed, next.spacing);
      if (next.lineHeight !== undefined) applyLineHeight(ed, next.lineHeight);
      if (next.fontSize !== undefined) applyFontScale(ed, next.fontSize);
      if (next.font) applyFontFamily(ed, next.font);
      if (next.accent) ed.innerHTML = recolorHtml(ed.innerHTML, design.accent ?? baseColor, next.accent);
    });
    setDesign(d => ({ ...d, ...next }));
  };

  /** Sends the letter (or a template plus instructions) to the AI and puts the result on the page. */
  const runAi = async (label: string, instructions: string, documentHtml?: string) => {
    const ed = editorRef.current;
    const html = ed?.innerHTML || '';
    if (!ed || !html.trim() || aiBusy) return false;
    setAiBusy(label);
    setAiError('');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) headers['x-gemini-key'] = customApiKey;
      const res = await authFetch(`${API_BASE}/api/cover-letter/refine`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          coverLetterText: documentHtml ?? html,
          instructions: `${instructions} This is a finished cover letter: do not change which job or company it is for, and do not add experience that is not already in it.`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'The AI could not edit your letter. Please try again.');
      const out = stripFences(String(data?.data?.refinedLetter || ''));
      if (!out || out.length < 40) throw new Error('The AI sent back an empty letter. Please try again.');
      setBeforeAi(html);
      ed.innerHTML = out;
      countWords();
      return true;
    } catch (err) {
      setAiError(getErrorMessage(err) || 'Something went wrong. Please try again.');
      return false;
    } finally {
      setAiBusy('');
    }
  };

  // Moving the letter into another design: the AI fills the empty design with the letter's own words
  const applyTemplate = async (id: string) => {
    if (id === templateId || aiBusy) return;
    const text = editorRef.current?.innerText || '';
    const photoEl = editorRef.current ? Array.from(editorRef.current.querySelectorAll('img')).find(isProfilePhoto) : undefined;
    const oldPhoto = photoEl && !photoEl.src.startsWith('data:image/svg') ? photoEl.src : '';
    const target = renderLetter(id, completeLetter({ name: 'NAME', title: 'TITLE', email: 'EMAIL', phone: 'PHONE', location: 'LOCATION', linkedin: 'LINK', date: 'DATE', recipient: 'RECIPIENT', company: 'COMPANY', recipientAddress: 'ADDRESS', subject: 'SUBJECT', greeting: 'GREETING', paragraphs: ['PARAGRAPH'], closing: 'CLOSING' }));
    const ok = await runAi(`template:${id}`, `The document is an empty cover letter template with UPPERCASE placeholders. Fill it with the letter below: sender name, title and contact details, date, recipient and company, greeting, every body paragraph (repeat the paragraph <p> element for each one, with the same inline style) and the sign-off. Use the letter's words exactly as written. Remove any placeholder the letter has no value for. Keep every <img> exactly as it is.

Letter:
"""
${text.slice(0, 6000)}
"""`, target);
    if (ok) {
      // Keep the user's own photo in the new design
      const ed = editorRef.current;
      const newPhoto = ed ? Array.from(ed.querySelectorAll('img')).find(isProfilePhoto) : undefined;
      if (oldPhoto && newPhoto) newPhoto.src = oldPhoto;
      setTemplateId(id);
      setDesign(DEFAULT_DESIGN);
    }
  };

  const undoAi = () => {
    if (!beforeAi || !editorRef.current) return;
    editorRef.current.innerHTML = beforeAi;
    setBeforeAi('');
    countWords();
  };

  const sendPrompt = () => {
    const p = aiPrompt.trim();
    if (!p) return;
    runAi('prompt', `Edit the letter as follows: ${p}`);
    setAiPrompt('');
  };

  const copyText = () => {
    navigator.clipboard.writeText((editorRef.current?.innerText || '').trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Profile photo: the same upload, crop and hide controls as the resume builder
  const [photoTarget, setPhotoTarget] = useState<HTMLImageElement | null>(null);
  const onPageClick = (e: React.MouseEvent) => {
    const el = e.target as HTMLElement;
    if (el.closest('[contenteditable="false"]')) return;
    if (isProfilePhoto(el)) {
      e.preventDefault();
      setPhotoTarget(el);
    }
  };

  const togglePanel = (p: 'fix' | 'assistant') => setPanel(cur => (cur === p ? null : p));
  const exit = () => setCurrentPage(workId ? 'my-documents' : 'cover-letter-builder');

  return (
    <div className="clx clx-editor rs-page">
      <header className="rs-bar">
        <div className="rs-bar-top">
          <button type="button" className="clx-ed-logo" onClick={exit} aria-label="Back"><img src={cvmindIcon} alt="" /></button>
          <button type="button" className="rs-home" onClick={exit}><ArrowLeft size={15} /> Home</button>
          <span className="rs-sep" />
          <FileText size={16} className="rs-doc-ico" aria-hidden="true" />
          <input className="rs-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Untitled cover letter" aria-label="Cover letter name" maxLength={100} />
          <span className="rs-saved">
            {saveState === 'local' ? 'Sign in to save' : saveState === 'saving' ? <><Loader2 size={12} className="rs-spin" /> Saving…</> : '(Saved)'}
          </span>
          <button type="button" className="rs-btn rs-btn--solid rs-dl" onClick={() => setShowDownload(true)}><Download size={14} /> Download</button>
        </div>

        <div className="rs-bar-tools">
          <div className="rs-tools">
            <button type="button" className={`rs-tool${panel === 'fix' ? ' is-on' : ''}`} aria-pressed={panel === 'fix'} onClick={() => togglePanel('fix')}>
              <CircleCheck size={15} /> Fix Mistakes
            </button>
            <span className="clx-tool-sep" aria-hidden="true" />
            <button type="button" className={`rs-tool${drawer === 'templates' ? ' is-on' : ''}`} aria-pressed={drawer === 'templates'} onClick={() => setDrawer(d => (d === 'templates' ? null : 'templates'))}>
              <LayoutTemplate size={15} /> Templates
            </button>
            <button type="button" className={`rs-tool${drawer === 'design' ? ' is-on' : ''}`} aria-pressed={drawer === 'design'} onClick={() => setDrawer(d => (d === 'design' ? null : 'design'))}>
              <Contrast size={15} /> Design &amp; Font
            </button>
          </div>
          <div className="rs-history">
            <button type="button" className="rs-icon" onClick={undo} aria-label="Undo"><Undo2 size={15} /></button>
            <button type="button" className="rs-icon" onClick={() => exec('redo')} aria-label="Redo"><Redo2 size={15} /></button>
          </div>
        </div>
      </header>

      <div className="rs-stage clx-stage">
        {drawer === 'design' && (
          <DesignPanel
            design={design}
            accentFrom={design.accent ?? baseColor}
            accentAvailable={design.accent !== null || hasColor(initial.html, baseColor) || LETTER_DESIGNS.some(d => d.id === templateId)}
            onChange={handleDesign}
            onClose={() => setDrawer(null)}
          />
        )}
        {drawer === 'templates' && (
          <aside className="rsp-drawer clx-tpl-drawer" aria-label="Templates">
            <header><strong>Templates</strong><button type="button" className="rsp-x" onClick={() => setDrawer(null)} aria-label="Close"><X size={18} /></button></header>
            <div className="rsp-scroll">
              <p className="clx-muted">Your text moves into the new design. You can undo it.</p>
              {LETTER_DESIGNS.map(d => (
                <button key={d.id} type="button" className={`clx-tpl${templateId === d.id ? ' is-on' : ''}`} disabled={Boolean(aiBusy)} onClick={() => applyTemplate(d.id)} aria-pressed={templateId === d.id}>
                  <TemplatePreview html={thumbHtml(d.id)} name={`${d.name} design`} aspect="1 / 0.8" />
                  <span>{aiBusy === `template:${d.id}` ? <Loader2 size={14} className="rs-spin" /> : templateId === d.id ? <Check size={14} /> : null} {d.name}</span>
                </button>
              ))}
            </div>
          </aside>
        )}

        <div className="rs-canvas clx-canvas">
          <div className="clx-backdrop">
            <div
              ref={editorRef}
              className="clx-doc"
              contentEditable
              suppressContentEditableWarning
              spellCheck
              onInput={countWords}
              onKeyDown={e => {
                const last = structHistory.current[structHistory.current.length - 1];
                if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && last && editorRef.current?.innerHTML === last.after) {
                  e.preventDefault();
                  undo();
                }
              }}
              onClick={onPageClick}
              aria-label="Cover letter"
            />

          </div>
          <p className="clx-count">{words} words{words > 450 ? ' · most cover letters are 250–400 words' : ''}</p>
        </div>

        <div className="rs-rail" role="toolbar" aria-label="Page actions">
          <button type="button" onClick={() => setPreviewHtml(editorRef.current?.innerHTML || '')} aria-label="Preview" title="Preview"><Eye size={16} /></button>
          <button type="button" onClick={() => setShowDownload(true)} aria-label="Download" title="Download"><Download size={16} /></button>
          <button type="button" onClick={copyText} aria-label="Copy text" title={copied ? 'Copied' : 'Copy text'}>{copied ? <Check size={16} /> : <Copy size={16} />}</button>
          <button type="button" className={panel === 'assistant' ? 'is-on' : ''} onClick={() => togglePanel('assistant')} aria-label="AI assistant" title="AI assistant"><MessageSquare size={16} /></button>
        </div>

        {panel && (
          <aside className="rs-panel clx-ai" aria-label={panel === 'fix' ? 'Fix mistakes' : 'AI assistant'}>
            <header>
              <strong>{panel === 'fix' ? 'Fix Mistakes' : 'AI Assistant'}</strong>
              <button type="button" className="rs-icon" onClick={() => setPanel(null)} aria-label="Close panel"><X size={16} /></button>
            </header>
            {panel === 'fix' ? (
              <>
                <p>Fix the letter you have. The AI keeps your facts and the job you are applying for.</p>
                <div className="clx-ai-fixes">
                  {AI_FIXES.map(f => (
                    <button key={f.label} type="button" disabled={Boolean(aiBusy)} onClick={() => runAi(f.label, f.prompt)}>
                      {aiBusy === f.label ? <Loader2 size={15} className="rs-spin" /> : <Sparkles size={15} />} {f.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p>Tell the AI what to change in your letter.</p>
                <div className="clx-ai-prompt">
                  <textarea
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPrompt(); } }}
                    placeholder="e.g. Mention my AWS certification in the second paragraph"
                    maxLength={500}
                    disabled={Boolean(aiBusy)}
                    aria-label="What should the AI change?"
                  />
                  <button type="button" onClick={sendPrompt} disabled={!aiPrompt.trim() || Boolean(aiBusy)} aria-label="Send">
                    {aiBusy === 'prompt' ? <Loader2 size={16} className="rs-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </>
            )}
            {aiError && <p className="clx-error"><AlertTriangle size={15} /> {aiError}</p>}
            {beforeAi && !aiBusy && <button type="button" className="clx-undo-ai" onClick={undoAi}><RotateCcw size={15} /> Undo last AI change</button>}
          </aside>
        )}
        {!panel && aiError && <p className="clx-error clx-float-error"><AlertTriangle size={15} /> {aiError}</p>}
      </div>

      <EntryToolbar editorRef={editorRef} exec={exec} onStructural={recordStructural} />
      <SelectionToolbar editorRef={editorRef} exec={exec} onLink={addLink} />
      <PhotoHover editorRef={editorRef} onUpload={setPhotoTarget} onHide={img => recordStructural(() => img.remove())} />
      {photoTarget && (
        <PhotoDialog
          currentSrc={photoTarget.src}
          onSave={src => { const img = photoTarget; recordStructural(() => { img.src = src; }); setPhotoTarget(null); }}
          onClose={() => setPhotoTarget(null)}
        />
      )}
      {previewHtml && <StudioPreview html={previewHtml} onClose={() => setPreviewHtml('')} />}

      {showDownload && (
        <ResumeDownload
          docLabel="Cover Letter"
          defaultName={title}
          paper="a4"
          getHtml={() => (editorRef.current ? htmlForPdf(editorRef.current, PAPER.a4.height) : '')}
          getText={() => editorRef.current?.innerText || ''}
          customApiKey={customApiKey}
          onWord={name => downloadLetterDoc(editorRef.current?.innerHTML || '', name)}
          onClose={() => setShowDownload(false)}
        />
      )}
    </div>
  );
}
