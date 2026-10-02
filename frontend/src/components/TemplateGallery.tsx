import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Eye, Search, ShieldCheck, X } from 'lucide-react';
import type { Template } from '../data/resumeTemplates';
import TemplatePreview from './TemplatePreview';
import './TemplateGallery.css';

interface TemplateGalleryProps {
  templates: Template[];
  kind: 'resume' | 'cover-letter';
  onSelect: (template: Template) => void;
}

const CATEGORIES: { label: string; match: RegExp }[] = [
  { label: 'All', match: /./ },
  { label: 'Tech & Data', match: /tech|dev|data|engineer|product|startup|ml\b/i },
  { label: 'Business & Finance', match: /finance|consult|sales|corporate|management|executive|c-suite|legal|law|banking/i },
  { label: 'Creative', match: /creative|design|ux|brand|elegant/i },
  { label: 'Healthcare & Service', match: /health|clinical|nursing|medical|hospitality/i },
  { label: 'Students & Academic', match: /graduate|academic|academia|entry|intern/i },
  { label: 'ATS-Safe', match: /ats|classic|minimal|traditional|plain/i },
];

const searchText = (t: Template) => `${t.id} ${t.name} ${t.tag} ${t.description} ${t.highlights.join(' ')}`;

export default function TemplateGallery({ templates, kind, onSelect }: TemplateGalleryProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [previewId, setPreviewId] = useState<string | null>(null);

  const noun = kind === 'resume' ? 'resume' : 'cover letter';

  const filtered = useMemo(() => {
    const cat = CATEGORIES.find((c) => c.label === category) ?? CATEGORIES[0];
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      const text = searchText(t);
      return cat.match.test(text) && (!q || text.toLowerCase().includes(q));
    });
  }, [templates, query, category]);

  // Only offer categories that actually have templates for this tab.
  const visibleCategories = useMemo(
    () => CATEGORIES.filter((c) => c.label === 'All' || templates.some((t) => c.match.test(searchText(t)))),
    [templates],
  );

  const previewIndex = previewId ? filtered.findIndex((t) => t.id === previewId) : -1;
  const previewTemplate = previewIndex >= 0 ? filtered[previewIndex] : null;

  const step = useCallback(
    (dir: 1 | -1) => {
      if (!filtered.length || previewIndex < 0) return;
      setPreviewId(filtered[(previewIndex + dir + filtered.length) % filtered.length].id);
    },
    [filtered, previewIndex],
  );
  const closePreview = useCallback(() => setPreviewId(null), []);
  const prev = useCallback(() => step(-1), [step]);
  const next = useCallback(() => step(1), [step]);

  return (
    <section className="tg-root" aria-label={`${noun} templates`}>
      <div className="tg-toolbar">
        <label className="tg-search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${templates.length} ${noun} templates…`}
            aria-label={`Search ${noun} templates`}
          />
        </label>
        <div className="tg-chips" role="group" aria-label="Filter by category">
          {visibleCategories.map((c) => (
            <button
              key={c.label}
              type="button"
              className={`tg-chip${category === c.label ? ' is-active' : ''}`}
              aria-pressed={category === c.label}
              onClick={() => setCategory(c.label)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <p className="tg-count" aria-live="polite">
        Showing {filtered.length} of {templates.length} templates
      </p>

      {filtered.length === 0 ? (
        <div className="tg-empty">
          <p>No templates match your search.</p>
          <button type="button" className="tg-chip is-active" onClick={() => { setQuery(''); setCategory('All'); }}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="tg-grid">
          {filtered.map((t, i) => (
            <article
              key={t.id}
              id={`template-${t.id}`}
              className="tg-card"
              style={{ '--tg-color': t.color, '--tg-accent': t.accent, '--tg-delay': `${Math.min(i, 8) * 45}ms` } as React.CSSProperties}
            >
              <button type="button" className="tg-thumb" onClick={() => setPreviewId(t.id)} aria-label={`Preview ${t.name}`}>
                <TemplatePreview html={t.html} name={t.name} />
                <span className="tg-thumb-overlay">
                  <span className="tg-pill"><Eye size={13} /> Quick preview</span>
                </span>
              </button>
              <div className="tg-meta">
                <div className="tg-meta-top">
                  <h3 className="tg-name">{t.name}</h3>
                  <span className="tg-tag" style={{ color: t.color, background: t.accent }}>{t.tag}</span>
                </div>
                <button type="button" className="tg-use" onClick={() => onSelect(t)}>
                  Use this template <ArrowRight size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {previewTemplate && (
        <PreviewModal
          template={previewTemplate}
          position={previewIndex + 1}
          total={filtered.length}
          noun={noun}
          onClose={closePreview}
          onPrev={prev}
          onNext={next}
          onUse={() => onSelect(previewTemplate)}
        />
      )}
    </section>
  );
}

interface PreviewModalProps {
  template: Template;
  position: number;
  total: number;
  noun: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onUse: () => void;
}

function PreviewModal({ template: t, position, total, noun, onClose, onPrev, onNext, onUse }: PreviewModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onPrev();
      else if (e.key === 'ArrowRight') onNext();
      else if (e.key === 'Tab' && dialogRef.current) {
        // keep keyboard focus inside the dialog
        const items = dialogRef.current.querySelectorAll<HTMLElement>('button');
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div className="tg-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={dialogRef}
        className="tg-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${t.name} preview`}
        tabIndex={-1}
        style={{ '--tg-color': t.color, '--tg-accent': t.accent } as React.CSSProperties}
      >
        <button type="button" className="tg-modal-close" onClick={onClose} aria-label="Close preview"><X size={18} /></button>

        <div className="tg-modal-stage">
          <button type="button" className="tg-nav tg-nav--prev" onClick={onPrev} aria-label="Previous template"><ChevronLeft size={20} /></button>
          <div className="tg-modal-scroll">
            <div className="tg-modal-paper" key={t.id}>
              <TemplatePreview html={t.html} name={t.name} eager />
            </div>
          </div>
          <button type="button" className="tg-nav tg-nav--next" onClick={onNext} aria-label="Next template"><ChevronRight size={20} /></button>
        </div>

        <aside className="tg-modal-info">
          <span className="tg-tag" style={{ color: t.color, background: t.accent }}>{t.tag}</span>
          <h2 className="tg-modal-title">{t.name}</h2>
          <p className="tg-modal-desc">{t.description}</p>
          <ul className="tg-modal-list">
            {t.highlights.map((h) => (
              <li key={h}><CheckCircle2 size={14} style={{ color: t.color }} /> {h}</li>
            ))}
          </ul>
          <p className="tg-modal-ats"><ShieldCheck size={14} /> Recruiter-friendly, ATS-tested layout</p>
          <button type="button" className="tg-modal-cta" onClick={onUse}>
            Use this {noun} <ArrowRight size={16} />
          </button>
          <p className="tg-modal-hint">{position} / {total} · use ← → to browse, Esc to close</p>
        </aside>
      </div>
    </div>
  );
}
