import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, ArrowUpDown, Bold, Check, ChevronDown, ChevronUp, Plus, Trash2, Type, Clock, Download, Eye, FileText, Globe, Italic, LayoutTemplate,
  Link2, List, Loader2, MessageSquare, Redo2, ShieldCheck, Sparkles, Underline, Undo2, Wand2, X, Eraser, Contrast,
} from 'lucide-react';
import { isHeading } from '../lib/resumeDesign';
import './ResumeStudio.css';

export type StudioPanel = 'tailor' | 'assistant' | null;
export type StudioDrawer = 'design' | 'templates' | null;

interface StudioBarProps {
  title: string;
  onTitle: (v: string) => void;
  signedIn: boolean;
  saving: boolean;
  refining: boolean;
  panel: StudioPanel;
  onPanel: (p: StudioPanel) => void;
  drawer: StudioDrawer;
  onDrawer: (d: StudioDrawer) => void;
  onRearrange: () => void;
  onFix: () => void;
  onExit: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDownload: () => void;
}

export function StudioBar(p: StudioBarProps) {

  return (
    <header className="rs-bar">
      <div className="rs-bar-top">
        <button type="button" className="rs-home" onClick={p.onExit}><ArrowLeft size={15} /> Home</button>
        <span className="rs-sep" />
        <FileText size={16} className="rs-doc-ico" aria-hidden="true" />
        <input className="rs-title" value={p.title} onChange={e => p.onTitle(e.target.value)} placeholder="Untitled resume" aria-label="Resume name" />
        <span className="rs-saved">
          {!p.signedIn ? 'Sign in to save' : p.saving ? <><Loader2 size={12} className="rs-spin" /> Saving…</> : <><Check size={12} /> Saved</>}
        </span>

        <button type="button" className="rs-btn rs-btn--solid rs-dl" onClick={p.onDownload}>
          <Download size={14} /> Download
        </button>
      </div>

      <div className="rs-bar-tools">
        <div className="rs-tools">
          <button type="button" className="rs-tool" disabled={p.refining} onClick={p.onFix}>
            {p.refining ? <Loader2 size={15} className="rs-spin" /> : <Wand2 size={15} />} Fix Resume
          </button>
          <button type="button" className={`rs-tool${p.panel === 'tailor' ? ' is-on' : ''}`} onClick={() => p.onPanel(p.panel === 'tailor' ? null : 'tailor')}>
            <ShieldCheck size={15} /> Check &amp; Tailor
          </button>
          <button type="button" className="rs-tool" onClick={p.onRearrange}><ArrowUpDown size={15} /> Rearrange</button>
          <button type="button" className={`rs-tool${p.drawer === 'templates' ? ' is-on' : ''}`} aria-pressed={p.drawer === 'templates'} onClick={() => p.onDrawer(p.drawer === 'templates' ? null : 'templates')}>
            <LayoutTemplate size={15} /> Templates
          </button>
          <button type="button" className={`rs-tool${p.drawer === 'design' ? ' is-on' : ''}`} aria-pressed={p.drawer === 'design'} onClick={() => p.onDrawer(p.drawer === 'design' ? null : 'design')}>
            <Contrast size={15} /> Design &amp; Font
          </button>
        </div>

        <div className="rs-history">
          <button type="button" className="rs-icon" onClick={p.onUndo} aria-label="Undo"><Undo2 size={15} /></button>
          <button type="button" className="rs-icon" onClick={p.onRedo} aria-label="Redo"><Redo2 size={15} /></button>
        </div>
      </div>
    </header>
  );
}

interface RailProps {
  onPreview: () => void;
  onDownload: () => void;
  onShare: () => void;
  onAssistant: () => void;
  assistantOn: boolean;
}

/** Quick actions that sit beside the page. */
export function StudioRail({ onPreview, onDownload, onShare, onAssistant, assistantOn }: RailProps) {
  return (
    <div className="rs-rail" role="toolbar" aria-label="Page actions">
      <button type="button" onClick={onPreview} aria-label="Preview" title="Preview"><Eye size={16} /></button>
      <button type="button" onClick={onDownload} aria-label="Download PDF" title="Download PDF"><Download size={16} /></button>
      <button type="button" onClick={onShare} aria-label="Share as web page" title="Share as web page"><Globe size={16} /></button>
      <button type="button" className={assistantOn ? 'is-on' : ''} onClick={onAssistant} aria-label="AI assistant" title="AI assistant"><MessageSquare size={16} /></button>
    </div>
  );
}

interface SelectionToolbarProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
  exec: (cmd: string, val?: string) => void;
  onLink: () => void;
}

/** Small formatting bar that floats above selected text, so users never need a full toolbar. */
export function SelectionToolbar({ editorRef, exec, onLink }: SelectionToolbarProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const update = () => {
      const sel = window.getSelection();
      const editor = editorRef.current;
      if (!sel || sel.isCollapsed || !sel.rangeCount || !editor || !editor.contains(sel.anchorNode)) {
        setPos(null);
        return;
      }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      if (!r.width && !r.height) { setPos(null); return; }
      setPos({ x: r.left + r.width / 2, y: r.top });
    };
    document.addEventListener('selectionchange', update);
    window.addEventListener('scroll', update, true);
    return () => { document.removeEventListener('selectionchange', update); window.removeEventListener('scroll', update, true); };
  }, [editorRef]);

  if (!pos) return null;
  const keep = (e: React.MouseEvent) => e.preventDefault(); // keep the text selected while clicking
  return createPortal(
    <div className="rs-sel" style={{ left: pos.x, top: Math.max(8, pos.y - 46) }} onMouseDown={keep} role="toolbar" aria-label="Format selected text">
      <button type="button" onClick={() => exec('bold')} aria-label="Bold"><Bold size={14} /></button>
      <button type="button" onClick={() => exec('italic')} aria-label="Italic"><Italic size={14} /></button>
      <button type="button" onClick={() => exec('underline')} aria-label="Underline"><Underline size={14} /></button>
      <span />
      <button type="button" onClick={() => exec('insertUnorderedList')} aria-label="Bullet list"><List size={14} /></button>
      <button type="button" onClick={onLink} aria-label="Add link"><Link2 size={14} /></button>
      <button type="button" onClick={() => exec('removeFormat')} aria-label="Clear formatting"><Eraser size={14} /></button>
    </div>,
    document.body,
  );
}

/** Siblings built the same way (same tag and the same styled lines inside) are "entries": a job, a bullet, a course... */
const norm = (st: string | null) => (st || '').replace(/\s+/g, '');
const entrySig = (el: Element) =>
  `${el.tagName}.${el.className}|${Array.from(el.children).map(c => `${c.tagName}{${norm(c.getAttribute('style'))}}`).join(',')}`;
const INLINE_TAGS = /^(SPAN|A|B|STRONG|EM|I|CODE|SMALL)$/;

function findEntry(node: Node | null, editor: HTMLElement): HTMLElement | null {
  let el: Element | null = node instanceof Element ? node : node?.parentElement ?? null;
  while (el && el !== editor && editor.contains(el)) {
    const parent: Element | null = el.parentElement;
    if (!parent || parent === editor) return null;
    if (el.closest('[contenteditable="false"]')) return null;
    const isRow = el.tagName === 'LI' || el.tagName === 'TR';
    const st = el.getAttribute('style') || '';
    // Inline bits only count when they look like a tag/pill (skills), not like "Date · Location" labels.
    const chip = INLINE_TAGS.test(el.tagName) && /(background|border)/.test(st);
    const block = chip || (!INLINE_TAGS.test(el.tagName) && getComputedStyle(el).display !== 'inline');
    const substantial = isRow || chip || el.children.length >= 2 || (el.textContent || '').trim().length > 40;
    // A block that holds a section title is a whole section, not an entry.
    const holdsHeading = isHeading(el) || Array.from(el.querySelectorAll('div,p,span,b,strong,h1,h2,h3,h4')).some(isHeading);
    if (block && substantial && !holdsHeading) {
      const sig = entrySig(el);
      const twins = Array.from(parent.children).filter(c => entrySig(c) === sig);
      if (twins.length >= 2) return el as HTMLElement;
      // The only item right under a section title (one job, one degree) can still get "+ Entry".
      if (el.previousElementSibling && isHeading(el.previousElementSibling)) return el as HTMLElement;
    }
    if (holdsHeading) return null;
    el = parent;
  }
  return null;
}

interface EntryToolbarProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
  exec: (cmd: string, val?: string) => void;
  /** Runs a structural change (add / move / delete) so the editor can record it for Undo. */
  onStructural: (mutate: () => void) => void;
}

/** Floating "+ Entry / move / clear / delete" bar for the repeated block (job, bullet, course...) the cursor is in. */
export function EntryToolbar({ editorRef, exec, onStructural }: EntryToolbarProps) {
  const entryRef = useRef<HTMLElement | null>(null);
  const [box, setBox] = useState<{ el: HTMLElement; left: number; top: number; width: number; height: number; count: number; index: number } | null>(null);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const update = () => {
      const editor = editorRef.current;
      const sel = window.getSelection();
      if (!editor || !sel || !sel.rangeCount || !sel.isCollapsed || !editor.contains(sel.anchorNode)) {
        entryRef.current = null; setBox(null); setMenu(false);
        return;
      }
      const entry = sel.anchorNode && sel.anchorNode.isConnected ? findEntry(sel.anchorNode, editor) : null;
      if (!entry) { entryRef.current = null; setBox(null); setMenu(false); return; }
      if (entry !== entryRef.current) setMenu(false);
      entryRef.current = entry;
      const r = entry.getBoundingClientRect();
      const twins = Array.from(entry.parentElement!.children).filter(c => entrySig(c) === entrySig(entry));
      setBox({ el: entry, left: r.left, top: r.top, width: r.width, height: r.height, count: twins.length, index: twins.indexOf(entry) });
    };
    document.addEventListener('selectionchange', update);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    // Typing, rearranging or AI edits move things around without changing the selection.
    const observer = new MutationObserver(update);
    if (editorRef.current) observer.observe(editorRef.current, { childList: true, subtree: true, characterData: true });
    return () => {
      document.removeEventListener('selectionchange', update);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      observer.disconnect();
    };
  }, [editorRef]);

  if (!box) return null;

  // Structural edits change the DOM directly: execCommand('insertHTML') mangles styled blocks.
  const placeCaret = (node: Node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    editorRef.current?.focus();
  };
  const run = (mutate: () => Node | null) => {
    let target: Node | null = null;
    onStructural(() => { target = mutate(); });
    setMenu(false);
    if (target) placeCaret(target);
  };
  const sameKind = (el: Element | null, ref: HTMLElement) => !!el && entrySig(el) === entrySig(ref);

  const entry = box.el;
  const add = () => run(() => { const copy = entry.cloneNode(true); entry.after(copy); return copy; });
  const remove = () => {
    if (box.count < 2) return;
    run(() => {
      const prev = entry.previousElementSibling;
      const next = entry.nextElementSibling;
      const target = sameKind(prev, entry) ? prev : sameKind(next, entry) ? next : null;
      entry.remove();
      return target;
    });
  };
  const moveUp = () => { const prev = entry.previousElementSibling; if (sameKind(prev, entry)) run(() => { prev!.before(entry); return entry; }); };
  const moveDown = () => { const next = entry.nextElementSibling; if (sameKind(next, entry)) run(() => { next!.after(entry); return entry; }); };
  const clearFormat = () => {
    const range = document.createRange();
    range.selectNodeContents(entry);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    exec('removeFormat');
    sel?.collapseToEnd();
  };
  const keep = (e: React.MouseEvent) => e.preventDefault();

  return createPortal(
    <>
      <div className="rs-entry-box" style={{ left: box.left - 4, top: box.top - 3, width: box.width + 8, height: box.height + 6 }} aria-hidden="true" />
      <div className="rs-entry" style={{ left: Math.max(8, box.left), top: Math.max(8, box.top - 50) }} onMouseDown={keep} role="toolbar" aria-label="Edit this entry">
        <button type="button" className="rs-entry-add" onClick={add}><Plus size={15} strokeWidth={3} /> Entry</button>
        <div className="rs-entry-more">
          <button type="button" className="rs-entry-ico" onClick={() => setMenu(m => !m)} aria-label="Move entry" aria-expanded={menu}><ChevronDown size={16} /></button>
          {menu && (
            <div className="rs-pop rs-entry-menu" role="menu">
              <button type="button" role="menuitem" disabled={box.index === 0} onClick={moveUp}><ChevronUp size={14} /> Move up</button>
              <button type="button" role="menuitem" disabled={box.index >= box.count - 1} onClick={moveDown}><ChevronDown size={14} /> Move down</button>
            </div>
          )}
        </div>
        <button type="button" className="rs-entry-ico" onClick={clearFormat} aria-label="Clear formatting" title="Clear formatting"><Type size={16} /></button>
        <button type="button" className="rs-entry-ico" onClick={() => exec('insertUnorderedList')} aria-label="Bullet list" title="Bullet list"><List size={16} /></button>
        <button type="button" className="rs-entry-ico rs-entry-del" disabled={box.count < 2} onClick={remove} aria-label="Delete entry" title={box.count < 2 ? 'The last entry cannot be deleted' : 'Delete entry'}><Trash2 size={16} /></button>
      </div>
    </>,
    document.body,
  );
}

interface PanelProps {
  panel: Exclude<StudioPanel, null>;
  refining: boolean;
  prompt: string;
  onPrompt: (v: string) => void;
  onTailor: (jobDescription: string) => void;
  onRefine: () => void;
  onRestore: (() => void) | null;
  onClose: () => void;
  /** Job description to start with (from the download dialog's "Will it beat the ATS?" box). */
  initialJd?: string;
}

/** Side panel: paste a job ad to tailor to, or give the AI a free-form instruction. */
export function StudioPanelView({ panel, refining, prompt, onPrompt, onTailor, onRefine, onRestore, onClose, initialJd = '' }: PanelProps) {
  const [jd, setJd] = useState(initialJd);
  const presets = ['Make it more concise', 'Highlight leadership and results', 'Add measurable outcomes', 'Use stronger action verbs'];

  return (
    <aside className="rs-panel" aria-label={panel === 'tailor' ? 'Check and tailor' : 'AI assistant'}>
      <header>
        <strong>{panel === 'tailor' ? 'Check & Tailor' : 'AI Assistant'}</strong>
        <button type="button" className="rs-icon" onClick={onClose} aria-label="Close panel"><X size={16} /></button>
      </header>

      {panel === 'tailor' ? (
        <>
          <p>Paste the job description. The AI will adjust your summary, skills and bullet points toward it. You can undo the change.</p>
          <label htmlFor="rs-jd">Job description</label>
          <textarea id="rs-jd" value={jd} onChange={e => setJd(e.target.value)} placeholder="Paste the job requirements here…" rows={10} />
          <button type="button" className="rs-btn rs-btn--solid rs-wide" disabled={refining || jd.trim().length < 30} onClick={() => onTailor(jd.trim())}>
            {refining ? <Loader2 size={14} className="rs-spin" /> : <Sparkles size={14} />} Tailor my resume
          </button>
          {jd.trim().length > 0 && jd.trim().length < 30 && <small>Paste a little more of the job ad.</small>}
        </>
      ) : (
        <>
          <p>Tell the AI what to change. It rewrites your resume following your instruction.</p>
          <textarea value={prompt} onChange={e => onPrompt(e.target.value)} placeholder="e.g. Rewrite my summary to sound like a tech lead" rows={5} aria-label="Instruction for the AI" />
          <div className="rs-chips">
            {presets.map(t => <button key={t} type="button" onClick={() => onPrompt(t)}>{t}</button>)}
          </div>
          <button type="button" className="rs-btn rs-btn--solid rs-wide" disabled={refining || !prompt.trim()} onClick={onRefine}>
            {refining ? <Loader2 size={14} className="rs-spin" /> : <Sparkles size={14} />} Apply
          </button>
        </>
      )}

      {onRestore && (
        <button type="button" className="rs-undo" onClick={onRestore}><Clock size={13} /> Undo last AI change</button>
      )}
    </aside>
  );
}

interface PreviewProps { html: string; onClose: () => void }

/** Read-only full preview of the resume. */
export function StudioPreview({ html, onClose }: PreviewProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="rs-preview" role="dialog" aria-modal="true" aria-label="Resume preview" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <button type="button" className="rs-preview-close" onClick={onClose} aria-label="Close preview"><X size={18} /></button>
      {/* The HTML is the user's own editor content. */}
      <div className="rs-preview-paper" dangerouslySetInnerHTML={{ __html: html }} />
    </div>,
    document.body,
  );
}
