import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Lock, X } from 'lucide-react';
import type { Template } from '../data/resumeTemplates';
import TemplatePreview from './TemplatePreview';
import {
  ACCENTS, FONT_OPTIONS, PAPER,
  type Column, type DesignState, type PaperSize, type Section,
} from '../lib/resumeDesign';
import './ResumeStudioPanels.css';

/* ───────────────────────────── Slider helper ───────────────────────────── */

interface LevelProps { label: string; value: number; low: string; high: string; onChange: (v: number) => void }
function Level({ label, value, low, high, onChange }: LevelProps) {
  return (
    <div className="rsp-field">
      <span className="rsp-label">{label}: {value - 1}</span>
      <div className="rsp-slider">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`Decrease ${label}`}>−</button>
        <input type="range" min={0} max={4} step={1} value={value} onChange={e => onChange(Number(e.target.value))} aria-label={label} />
        <button type="button" onClick={() => onChange(Math.min(4, value + 1))} aria-label={`Increase ${label}`}>+</button>
      </div>
      <div className="rsp-ends"><span>{low}</span><span>{high}</span></div>
    </div>
  );
}

/* ───────────────────────────── Design & Font drawer ───────────────────────────── */

interface DesignPanelProps {
  design: DesignState;
  accentFrom: string;
  accentAvailable: boolean;
  onChange: (next: Partial<DesignState>) => void;
  onClose: () => void;
}

export function DesignPanel({ design, accentFrom, accentAvailable, onChange, onClose }: DesignPanelProps) {
  const current = design.accent ?? accentFrom;
  return (
    <aside className="rsp-drawer" aria-label="Design and font">
      <header><strong>Design &amp; Font</strong><button type="button" className="rsp-x" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
      <div className="rsp-scroll">
        <Level label="Page margins" value={design.margin} low="narrow" high="wide" onChange={v => onChange({ margin: v })} />
        <Level label="Section spacing" value={design.spacing} low="compact" high="more space" onChange={v => onChange({ spacing: v })} />
        <hr />

        <div className="rsp-field">
          <span className="rsp-label">Colors</span>
          {accentAvailable ? (
            <>
              <div className="rsp-swatches" role="radiogroup" aria-label="Accent color">
                {ACCENTS.map(c => (
                  <button key={c} type="button" role="radio" aria-checked={current.toLowerCase() === c} aria-label={`Color ${c}`}
                    className={`rsp-swatch${current.toLowerCase() === c ? ' is-on' : ''}`} style={{ background: c }} onClick={() => onChange({ accent: c })}>
                    {current.toLowerCase() === c && <Check size={14} strokeWidth={3} />}
                  </button>
                ))}
              </div>
              <label className="rsp-custom">Use custom color
                <input type="color" value={/^#[0-9a-f]{6}$/i.test(current) ? current : '#2563eb'} onChange={e => onChange({ accent: e.target.value })} />
              </label>
            </>
          ) : (
            <p className="rsp-note">This template is black and white, so it has no accent color to change.</p>
          )}
        </div>
        <hr />

        <div className="rsp-field">
          <span className="rsp-label">Font style</span>
          <div className="rsp-fonts" role="listbox" aria-label="Font">
            {FONT_OPTIONS.map(f => (
              <button key={f.value} type="button" role="option" aria-selected={design.font === f.value}
                className={`rsp-font${design.font === f.value ? ' is-on' : ''}`} style={{ fontFamily: f.value }} onClick={() => onChange({ font: f.value })}>
                {f.label}{design.font === f.value && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>

        <Level label="Font size" value={design.fontSize} low="smaller" high="larger" onChange={v => onChange({ fontSize: v })} />
        <Level label="Line height" value={design.lineHeight} low="condensed" high="spacious" onChange={v => onChange({ lineHeight: v })} />
      </div>
    </aside>
  );
}

/* ───────────────────────────── Templates drawer ───────────────────────────── */

interface TemplatesPanelProps {
  templates: Template[];
  currentId: string;
  paper: PaperSize;
  busy: boolean;
  onPaper: (p: PaperSize) => void;
  onApply: (t: Template) => void;
  onClose: () => void;
}

export function TemplatesPanel({ templates, currentId, paper, busy, onPaper, onApply, onClose }: TemplatesPanelProps) {
  const [picked, setPicked] = useState(currentId);
  const chosen = templates.find(t => t.id === picked);
  const changed = picked !== currentId;

  return (
    <aside className="rsp-drawer" aria-label="Select a template">
      <header><strong>Select a template</strong><button type="button" className="rsp-x" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
      <div className="rsp-scroll rsp-templates">
        {templates.map(t => (
          <button key={t.id} type="button" className={`rsp-tpl${picked === t.id ? ' is-on' : ''}`} aria-pressed={picked === t.id} onClick={() => setPicked(t.id)}>
            <span className="rsp-tpl-thumb">
              <TemplatePreview html={t.html} name={t.name} />
              {picked === t.id && <span className="rsp-tpl-check"><Check size={14} strokeWidth={3} /></span>}
            </span>
            <span className="rsp-tpl-name">{t.name}</span>
          </button>
        ))}
      </div>
      <footer>
        <button type="button" className="rsp-continue" disabled={busy} onClick={() => (changed && chosen ? onApply(chosen) : onClose())}>
          {changed ? 'Apply template' : 'Continue Editing'}
        </button>
        {changed && <small>Your content moves to the new template. The AI re-fills it, which can take a few seconds.</small>}
        <div className="rsp-size">
          <span>Document size:</span>
          <div role="group" aria-label="Document size">
            {(Object.keys(PAPER) as PaperSize[]).map(k => (
              <button key={k} type="button" aria-pressed={paper === k} className={paper === k ? 'is-on' : ''} onClick={() => onPaper(k)}>{PAPER[k].label}</button>
            ))}
          </div>
        </div>
      </footer>
    </aside>
  );
}

/* ───────────────────────────── Rearrange modal ───────────────────────────── */

interface RearrangeProps {
  /** Sections found in the page when the dialog was opened. */
  initial: Column[];
  pageHeight: number;
  onApply: (columns: Column[]) => void;
  onClose: () => void;
}

export function RearrangeModal({ initial, pageHeight, onApply, onClose }: RearrangeProps) {
  const [columns, setColumns] = useState<Column[]>(initial);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [over, setOver] = useState<{ key: string; after: boolean } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const scale = 330 / Math.max(1, pageHeight);
  const boxHeight = (s: Section) => Math.max(30, Math.round(s.height * scale));

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  /** Moves a section next to another (or to the end of a column) and returns the new column list. */
  const move = (key: string, targetCol: number, beforeKey: string | null, after = false) => {
    setColumns(prev => {
      let moving: Section | undefined;
      const stripped = prev.map(c => ({ ...c, sections: c.sections.filter(s => { if (s.key === key) { moving = s; return false; } return true; }) }));
      if (!moving) return prev;
      const col = stripped[targetCol];
      let idx = beforeKey ? col.sections.findIndex(s => s.key === beforeKey) : col.sections.length;
      if (idx < 0) idx = col.sections.length;
      if (beforeKey && after) idx += 1;
      col.sections.splice(idx, 0, moving);
      return stripped;
    });
  };

  const nudge = (colIdx: number, key: string, dir: -1 | 1) => {
    const list = columns[colIdx].sections;
    const i = list.findIndex(s => s.key === key);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    move(key, colIdx, list[j].key, dir === 1);
  };
  const shift = (colIdx: number, key: string, dir: -1 | 1) => {
    const target = colIdx + dir;
    if (target < 0 || target >= columns.length) return;
    move(key, target, null);
  };

  const onDrop = (e: React.DragEvent, colIdx: number, targetKey: string | null) => {
    e.preventDefault();
    const key = dragKey;
    setDragKey(null);
    setOver(null);
    if (!key || key === targetKey) return;
    move(key, colIdx, targetKey, over?.after ?? false);
  };

  const apply = () => onApply(columns);
  const empty = columns.every(c => c.sections.length === 0);

  // Portal to <body>: the editor page is animated with a transform, which would trap position:fixed.
  return createPortal(
    <div className="rsp-modal" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rsp-dialog" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="rsp-arr-title">
        <button type="button" className="rsp-x rsp-dialog-x" onClick={onClose} aria-label="Close"><X size={20} /></button>
        <h2 id="rsp-arr-title">Hold &amp; drag the boxes to rearrange the sections</h2>

        {empty ? (
          <p className="rsp-note rsp-center">We could not find movable sections in this resume. Try a different template, or use the arrows on each entry.</p>
        ) : (
          <>
            <p className="rsp-page-label">Page 1 of 1</p>
            <div className="rsp-page">
              <div className="rsp-box rsp-box--locked"><Lock size={12} /> Header</div>
              <div className="rsp-cols">
                {columns.map((col, ci) => (
                  <div key={ci} className="rsp-col" style={{ flex: `${col.weight} 1 0` }}
                    onDragOver={e => { e.preventDefault(); }} onDrop={e => onDrop(e, ci, null)}>
                    {col.sections.map(s => (
                      <div key={s.key}
                        className={`rsp-box${dragKey === s.key ? ' is-drag' : ''}${over?.key === s.key ? (over.after ? ' is-after' : ' is-before') : ''}`}
                        style={{ minHeight: boxHeight(s) }}
                        draggable
                        onDragStart={e => { setDragKey(s.key); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', s.key); }}
                        onDragEnd={() => { setDragKey(null); setOver(null); }}
                        onDragOver={e => {
                          e.preventDefault(); e.stopPropagation();
                          const r = e.currentTarget.getBoundingClientRect();
                          setOver({ key: s.key, after: e.clientY > r.top + r.height / 2 });
                        }}
                        onDrop={e => { e.stopPropagation(); onDrop(e, ci, s.key); }}>
                        <span className="rsp-grip" aria-hidden="true">⋮⋮</span>
                        <span className="rsp-box-title">{s.title}</span>
                        <span className="rsp-move">
                          <button type="button" onClick={() => nudge(ci, s.key, -1)} aria-label={`Move ${s.title} up`}><ArrowUp size={12} /></button>
                          <button type="button" onClick={() => nudge(ci, s.key, 1)} aria-label={`Move ${s.title} down`}><ArrowDown size={12} /></button>
                          {columns.length > 1 && ci > 0 && <button type="button" onClick={() => shift(ci, s.key, -1)} aria-label={`Move ${s.title} to the previous column`}><ArrowLeft size={12} /></button>}
                          {columns.length > 1 && ci < columns.length - 1 && <button type="button" onClick={() => shift(ci, s.key, 1)} aria-label={`Move ${s.title} to the next column`}><ArrowRight size={12} /></button>}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <button type="button" className="rsp-continue rsp-dialog-cta" onClick={empty ? onClose : apply}>Continue Editing</button>
      </div>
    </div>,
    document.body,
  );
}
