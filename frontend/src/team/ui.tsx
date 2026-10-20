import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileText, Image as ImageIcon, Loader2, Paperclip, Smile, X } from 'lucide-react';
import type { Person, Priority, TaskStatus, TeamFile } from './api';
import type { PendingFile } from './attachments';
import { answerConfirm, currentConfirm, subscribeConfirm } from './confirm';
import { ago, EMOJIS, PRIORITY_LABELS, STATUS_LABELS } from './format';
import { useTeam } from './store';
import { ACCEPT, fileUrl, formatBytes, isImage, openFile } from './upload';

// ── Small pieces ─────────────────────────────────────────────────────────────
export const Spinner = ({ size = 16 }: { size?: number }) => <Loader2 size={size} className="tm-spin" aria-hidden />;

export function Empty({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="tm-empty">
      {icon && <div className="tm-empty-icon">{icon}</div>}
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

const COLORS = ['#2dc08d', '#7c3aed', '#2563eb', '#db2777', '#ea580c', '#0891b2', '#65a30d', '#9333ea'];
const colorFor = (s: string) => COLORS[[...s].reduce((n, c) => n + c.charCodeAt(0), 0) % COLORS.length];
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

function useFileUrl(fileId: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!fileId) return;
    let cancelled = false;
    fileUrl(fileId).then((u) => { if (!cancelled) setUrl(u); }).catch(() => {});
    return () => { cancelled = true; };
  }, [fileId]);
  return fileId ? url : null;
}

export function Avatar({ person, size = 32, presence = false }: { person?: Person; size?: number; presence?: boolean }) {
  const name = person?.name || '?';
  const src = useFileUrl(person?.avatarFileId);
  return (
    <span className="tm-avatar" style={{ width: size, height: size, fontSize: size * 0.4, background: src ? undefined : colorFor(person?.username || name) }} aria-hidden>
      {src ? <img src={src} alt="" /> : initials(name)}
      {presence && person && <span className={`tm-presence ${person.presence}`} />}
    </span>
  );
}

export function PresenceLabel({ person }: { person: Person }) {
  if (person.presence === 'online') return <span className="tm-muted">Online</span>;
  if (person.presence === 'away') return <span className="tm-muted">Away</span>;
  return <span className="tm-muted">{person.lastSeenAt ? `Last seen ${ago(person.lastSeenAt)}` : 'Offline'}</span>;
}

export function Modal({ title, onClose, children, footer, wide }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="tm-app tm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`tm-modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
        <header className="tm-modal-head">
          <h2>{title}</h2>
          <button type="button" className="tm-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="tm-modal-body">{children}</div>
        {footer && <footer className="tm-modal-foot">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

// Shows whatever confirmDialog() asked for, inside the app instead of the browser's popup
export function ConfirmHost() {
  const request = useSyncExternalStore(subscribeConfirm, currentConfirm);
  if (!request) return null;
  return (
    <Modal title={request.title} onClose={() => answerConfirm(false)} footer={<>
      <button type="button" className="tm-btn" onClick={() => answerConfirm(false)}>Cancel</button>
      <button type="button" className={`tm-btn ${request.danger ? 'danger' : 'primary'}`} onClick={() => answerConfirm(true)} autoFocus>{request.confirmLabel || 'OK'}</button>
    </>}>
      {request.message && <p className="tm-muted">{request.message}</p>}
    </Modal>
  );
}

export const StatusBadge = ({ status }: { status: TaskStatus }) => <span className={`tm-badge status-${status}`}>{STATUS_LABELS[status]}</span>;
export const PriorityBadge = ({ priority }: { priority: Priority }) => <span className={`tm-badge prio-${priority}`}>{PRIORITY_LABELS[priority]}</span>;

// ── Message text ─────────────────────────────────────────────────────────────
// **bold**, _italic_, `code`, links and @mentions, rendered as React nodes (never as HTML)
const TOKEN = /(\*\*[^*\n]+\*\*|_[^_\n]+_|`[^`\n]+`|https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]|(?:^|(?<=[\s(]))@[a-z0-9._-]{2,40})/gi;

export function RichText({ text }: { text: string }) {
  const { people, me } = useTeam();
  const byUsername = useMemo(() => new Map([...people.values()].map((p) => [p.username, p])), [people]);
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>
          {line.split(TOKEN).map((part, j) => {
            if (!part) return null;
            if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={j}>{part.slice(2, -2)}</strong>;
            if (part.startsWith('_') && part.endsWith('_') && part.length > 2) return <em key={j}>{part.slice(1, -1)}</em>;
            if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={j}>{part.slice(1, -1)}</code>;
            if (/^https?:\/\//i.test(part)) return <a key={j} href={part} target="_blank" rel="noreferrer noopener">{part}</a>;
            if (part.startsWith('@')) {
              const name = part.slice(1).toLowerCase();
              const p = byUsername.get(name);
              if (p || name === 'channel' || name === 'here') return <span key={j} className={`tm-mention ${p?.id === me.id ? 'me' : ''}`}>@{p ? p.name : name}</span>;
            }
            return <span key={j}>{part}</span>;
          })}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

// ── Files ────────────────────────────────────────────────────────────────────
function ImageThumb({ file }: { file: TeamFile }) {
  const src = useFileUrl(file.id);
  return (
    <button type="button" className="tm-thumb" onClick={() => openFile(file.id).catch(() => {})} title={file.name}>
      {src ? <img src={src} alt={file.name} loading="lazy" /> : <ImageIcon size={20} />}
    </button>
  );
}

export function FileList({ files }: { files: TeamFile[] }) {
  const { toast } = useTeam();
  if (!files.length) return null;
  const images = files.filter((f) => isImage(f.mime));
  const docs = files.filter((f) => !isImage(f.mime));
  const open = (f: TeamFile, download = false) => openFile(f.id, download).catch((err: Error) => toast(err.message, 'error'));
  return (
    <div className="tm-files">
      {images.length > 0 && <div className="tm-thumbs">{images.map((f) => <ImageThumb key={f.id} file={f} />)}</div>}
      {docs.map((f) => (
        <div key={f.id} className="tm-file">
          <FileText size={18} aria-hidden />
          <button type="button" className="tm-file-name" onClick={() => open(f, f.mime.includes('wordprocessingml'))}>{f.name}</button>
          <span className="tm-muted">{formatBytes(f.size)}</span>
          <button type="button" className="tm-icon-btn sm" onClick={() => open(f, true)} aria-label={`Download ${f.name}`}><Download size={14} /></button>
        </div>
      ))}
    </div>
  );
}

export function AttachButton({ onFiles, disabled, label = 'Attach files' }: { onFiles: (f: FileList) => void; disabled?: boolean; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className="tm-icon-btn" onClick={() => input.current?.click()} disabled={disabled} aria-label={label} title={`${label} (PDF, TXT, DOCX, PNG, JPG · up to 20 MB)`}><Paperclip size={18} /></button>
      <input ref={input} type="file" accept={ACCEPT} multiple hidden onChange={(e) => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = ''; }} />
    </>
  );
}

export function PendingFiles({ items, onRemove }: { items: PendingFile[]; onRemove: (key: string) => void }) {
  if (!items.length) return null;
  return (
    <div className="tm-pending">
      {items.map((x) => (
        <div key={x.key} className={`tm-pending-item ${x.error ? 'error' : ''}`}>
          <FileText size={14} aria-hidden />
          <span className="tm-pending-name">{x.name}</span>
          <span className="tm-muted">{x.error ? 'Failed' : x.file ? formatBytes(x.size) : `${x.progress}%`}</span>
          {!x.file && !x.error && <span className="tm-progress"><span style={{ width: `${x.progress}%` }} /></span>}
          <button type="button" className="tm-icon-btn sm" onClick={() => onRemove(x.key)} aria-label={x.file ? `Remove ${x.name}` : `Cancel ${x.name}`}><X size={13} /></button>
        </div>
      ))}
    </div>
  );
}

// ── Emoji ────────────────────────────────────────────────────────────────────
export function EmojiPicker({ onPick, label = 'Add reaction' }: { onPick: (e: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div className="tm-emoji" ref={ref}>
      <button type="button" className="tm-icon-btn sm" onClick={() => setOpen((v) => !v)} aria-label={label} title={label}><Smile size={16} /></button>
      {open && (
        <div className="tm-emoji-pop" role="menu">
          {EMOJIS.map((e) => <button key={e} type="button" role="menuitem" onClick={() => { onPick(e); setOpen(false); }}>{e}</button>)}
        </div>
      )}
    </div>
  );
}

// ── @mention text box ────────────────────────────────────────────────────────
// A textarea that suggests teammates after "@". Enter sends (Shift+Enter for a new line) when onSubmit is given.
export function MentionInput({ value, onChange, onSubmit, placeholder, rows = 1, autoFocus, onTyping, allowChannel, label, candidates }: {
  value: string; onChange: (v: string) => void; onSubmit?: () => void; placeholder?: string; rows?: number; autoFocus?: boolean;
  onTyping?: () => void; allowChannel?: boolean; label: string; candidates?: string[];
}) {
  const { people, me } = useTeam();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);

  const options = useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    const list: Array<{ username: string; name: string; person?: Person }> = [...people.values()]
      .filter((p) => p.active && p.id !== me.id && (!candidates || candidates.includes(p.id)))
      .filter((p) => p.username.startsWith(q) || p.name.toLowerCase().includes(q))
      .slice(0, 6)
      .map((p) => ({ username: p.username, name: p.name, person: p }));
    if (allowChannel && 'channel'.startsWith(q)) list.push({ username: 'channel', name: 'Notify everyone in this channel' });
    return list;
  }, [query, people, me.id, allowChannel, candidates]);

  // Auto-grow
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);

  const detect = (text: string, caret: number) => {
    const m = /(^|\s)@([a-z0-9._-]*)$/i.exec(text.slice(0, caret));
    setQuery(m ? m[2] : null);
    setActive(0);
  };

  const pick = (username: string) => {
    const el = ref.current;
    if (!el) return;
    const caret = el.selectionStart;
    const before = value.slice(0, caret).replace(/@([a-z0-9._-]*)$/i, `@${username} `);
    const next = before + value.slice(caret);
    onChange(next);
    setQuery(null);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(before.length, before.length); });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (options.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % options.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a - 1 + options.length) % options.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(options[active].username); return; }
      if (e.key === 'Escape') { setQuery(null); return; }
    }
    if (onSubmit && e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="tm-mention-box">
      <textarea
        ref={ref}
        className="tm-input tm-textarea"
        value={value}
        rows={rows}
        placeholder={placeholder}
        aria-label={label}
        autoFocus={autoFocus}
        onChange={(e) => { onChange(e.target.value); detect(e.target.value, e.target.selectionStart); onTyping?.(); }}
        onKeyDown={onKeyDown}
        onClick={(e) => detect(value, e.currentTarget.selectionStart)}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
      />
      {options.length > 0 && (
        <div className="tm-suggest" role="listbox" aria-label="Mention someone">
          {options.map((o, i) => (
            <button key={o.username} type="button" role="option" aria-selected={i === active} className={i === active ? 'active' : ''} onMouseDown={(e) => { e.preventDefault(); pick(o.username); }}>
              {o.person ? <Avatar person={o.person} size={22} /> : <span className="tm-avatar" style={{ width: 22, height: 22, fontSize: 11, background: '#6b7280' }}>@</span>}
              <span>{o.name}</span>
              <span className="tm-muted">@{o.username}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── People picker (assignees, channel members, DMs) ──────────────────────────
export function PeoplePicker({ value, onChange, exclude = [], label, max }: { value: string[]; onChange: (ids: string[]) => void; exclude?: string[]; label: string; max?: number }) {
  const { people } = useTeam();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const options = [...people.values()]
    .filter((p) => p.active && !exclude.includes(p.id) && !value.includes(p.id))
    .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.username.includes(q.toLowerCase().replace(/^@/, '')))
    .slice(0, 8);
  const full = max !== undefined && value.length >= max;
  return (
    <div className="tm-picker">
      <div className="tm-chips">
        {value.map((id) => {
          const p = people.get(id);
          return (
            <span key={id} className="tm-chip">
              <Avatar person={p} size={18} /> {p?.name || 'Former member'}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== id))} aria-label={`Remove ${p?.name}`}><X size={12} /></button>
            </span>
          );
        })}
        {!full && (
          <input
            className="tm-chip-input"
            value={q}
            placeholder={value.length ? 'Add more…' : 'Type @name…'}
            aria-label={label}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && options[0]) { e.preventDefault(); onChange([...value, options[0].id]); setQ(''); }
              if (e.key === 'Backspace' && !q && value.length) onChange(value.slice(0, -1));
            }}
          />
        )}
      </div>
      {open && !full && options.length > 0 && (
        <div className="tm-suggest" role="listbox" aria-label={label}>
          {options.map((p) => (
            <button key={p.id} type="button" role="option" aria-selected={false} onMouseDown={(e) => { e.preventDefault(); onChange([...value, p.id]); setQ(''); }}>
              <Avatar person={p} size={22} presence /> <span>{p.name}</span> <span className="tm-muted">@{p.username} · {p.roleLabel}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
