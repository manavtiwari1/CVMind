import { useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, Info, Inbox, Loader2, Minus, Search, X, XCircle } from 'lucide-react';
import { ToastContext } from './hooks';
import type { ToastFn } from './hooks';
import { count, initials } from './format';

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="ad-page-head">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="ad-page-actions">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, actions, children, className = '', bodyClass = '' }: {
  title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClass?: string | false;
}) {
  return (
    <section className={`ad-card ${className}`}>
      {(title || actions) && (
        <div className="ad-card-head">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {bodyClass === false ? children : <div className={`ad-card-body ${bodyClass}`}>{children}</div>}
    </section>
  );
}

export function StatCard({ label, value, icon, tone = 'green', delta, foot, loading }: {
  label: string; value: ReactNode; icon?: ReactNode; tone?: 'green' | 'purple' | 'blue' | 'amber' | 'red';
  delta?: number | null; foot?: ReactNode; loading?: boolean;
}) {
  return (
    <div className="ad-card ad-stat">
      <div className="ad-stat-top">
        <span className="ad-stat-label">{label}</span>
        {icon && <span className={`ad-stat-icon ${tone}`}>{icon}</span>}
      </div>
      <div className="ad-stat-value">{loading ? <span className="ad-skeleton" style={{ display: 'block', width: 90, height: 30 }} /> : value}</div>
      {(delta !== undefined || foot) && (
        <div className="ad-stat-foot">
          {delta !== undefined && <Delta value={delta} />}
          {foot}
        </div>
      )}
    </div>
  );
}

export function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="ad-delta flat">new</span>;
  if (value === 0) return <span className="ad-delta flat"><Minus size={11} />0%</span>;
  return value > 0
    ? <span className="ad-delta up"><ArrowUpRight size={12} />{value}%</span>
    : <span className="ad-delta down"><ArrowDownRight size={12} />{Math.abs(value)}%</span>;
}

export type Tone = 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'gray';

export function Badge({ tone = 'gray', children, dot }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return <span className={`ad-badge ${tone}${dot ? ' dot' : ''}`}>{children}</span>;
}

const STATUS_TONES: Record<string, Tone> = {
  active: 'green', live: 'green', success: 'green', resolved: 'green', submitted: 'green', ok: 'green', actioned: 'green', hired: 'green', verified: 'green', succeeded: 'green', connected: 'green',
  suspended: 'amber', pending: 'amber', scheduled: 'blue', open: 'blue', new: 'purple', queued: 'blue', running: 'blue', matched: 'blue', tailoring: 'blue', ready_for_review: 'purple', interview: 'purple', shortlisted: 'blue', paused: 'amber', recommended: 'amber',
  banned: 'red', failed: 'red', refunded: 'amber', dead: 'red', rejected: 'red', expired: 'gray', retired: 'gray', 'used-up': 'gray', dismissed: 'gray', closed: 'gray', hidden: 'red', required: 'red', urgent: 'red', high: 'amber', normal: 'gray', low: 'gray'
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const key = String(status || '').toLowerCase();
  const text = label || key.replace(/[_-]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  return <Badge tone={STATUS_TONES[key] || 'gray'} dot>{text}</Badge>;
}

export function Avatar({ name, email, src, size }: { name?: string; email?: string; src?: string; size?: 'lg' }) {
  return (
    <span className={`ad-avatar${size ? ` ${size}` : ''}`} aria-hidden="true">
      {src ? <img src={src} alt="" /> : initials(name || '', email || '')}
    </span>
  );
}

export function Person({ name, email, avatar, onClick }: { name?: string; email?: string; avatar?: string; onClick?: () => void }) {
  const body = (
    <span className="ad-person">
      <Avatar name={name} email={email} src={avatar} />
      <div>
        <div className="ad-cell-title">{name || email || 'Unknown'}</div>
        {email && name && <div className="ad-cell-sub">{email}</div>}
      </div>
    </span>
  );
  return onClick ? <button type="button" className="ad-link" style={{ color: 'inherit', fontWeight: 'inherit', textAlign: 'left' }} onClick={onClick}>{body}</button> : body;
}

export function SearchInput({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="ad-search">
      <Search size={15} />
      <input className="ad-input" type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-label={placeholder} />
    </div>
  );
}

export function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }>; label: string }) {
  return (
    <select className="ad-select" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function Tabs<T extends string>({ tabs, active, onChange }: { tabs: Array<{ id: T; label: string; count?: number }>; active: T; onChange: (id: T) => void }) {
  return (
    <div className="ad-tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={active === t.id} className={`ad-tab${active === t.id ? ' active' : ''}`} onClick={() => onChange(t.id)}>
          {t.label}
          {t.count !== undefined && <span className="ad-tab-count">{count(t.count)}</span>}
        </button>
      ))}
    </div>
  );
}

export function Segment<T extends string>({ options, value, onChange }: { options: Array<{ value: T; label: string }>; value: T; onChange: (v: T) => void }) {
  return (
    <div className="ad-segment" role="group">
      {options.map((o) => (
        <button key={o.value} type="button" className={value === o.value ? 'active' : ''} aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="ad-switch" disabled={disabled} onClick={() => onChange(!checked)} />;
}

export function Empty({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="ad-empty">
      <span className="ad-empty-icon">{icon || <Inbox size={20} />}</span>
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Notice({ tone = 'blue', children }: { tone?: 'blue' | 'amber' | 'red' | 'green'; children: ReactNode }) {
  const Icon = tone === 'red' ? XCircle : tone === 'amber' ? AlertTriangle : tone === 'green' ? CheckCircle2 : Info;
  return (
    <div className={`ad-notice ${tone === 'blue' ? '' : tone}`} role={tone === 'red' ? 'alert' : undefined}>
      <Icon size={16} />
      <div>{children}</div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Empty
      icon={<AlertTriangle size={20} />}
      title="Couldn't load this"
      text={message}
      action={onRetry && <button type="button" className="ad-btn sm" onClick={onRetry}>Try again</button>}
    />
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="ad-spin" aria-hidden="true" />;
}

export function SkeletonRows({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c}><span className="ad-skeleton" style={{ display: 'block', height: 14, width: c === 0 ? '70%' : '50%' }} /></td>
          ))}
        </tr>
      ))}
    </>
  );
}

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
}

// Table with loading, error and empty states built in
export function DataTable<T>({ columns, rows, rowKey, loading, error, onRetry, onRowClick, empty }: {
  columns: Array<Column<T>>;
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
}) {
  if (error && !rows?.length) return <ErrorState message={error} onRetry={onRetry} />;
  // No rows yet means still loading, whether or not the caller passes `loading`
  const showSkeleton = !rows;
  if (!showSkeleton && rows && rows.length === 0) return <>{empty || <Empty title="Nothing here yet" />}</>;
  return (
    <div className="ad-table-wrap" style={{ opacity: loading && rows ? 0.6 : 1, transition: 'opacity 0.15s' }}>
      <table className="ad-table">
        <thead>
          <tr>{columns.map((c) => <th key={c.key} className={c.className}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {showSkeleton ? <SkeletonRows cols={columns.length} /> : rows!.map((row) => (
            <tr
              key={rowKey(row)}
              className={onRowClick ? 'clickable' : undefined}
              onClick={onRowClick ? (e) => {
                // Buttons and links inside the row do their own thing
                if ((e.target as HTMLElement).closest('button, a, input, select')) return;
                onRowClick(row);
              } : undefined}
            >
              {columns.map((c) => <td key={c.key} className={c.className}>{c.render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, limit, total, onPage }: { page: number; limit: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (total <= limit) return total ? <div className="ad-pagination"><span>{count(total)} {total === 1 ? 'result' : 'results'}</span></div> : null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <div className="ad-pagination">
      <span>{count(from)}–{count(to)} of {count(total)}</span>
      <div className="ad-pagination-btns">
        <button type="button" className="ad-btn sm icon" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={15} /></button>
        <button type="button" className="ad-btn sm icon" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={15} /></button>
      </div>
    </div>
  );
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
}

export function Drawer({ title, subtitle, onClose, children, footer }: { title: ReactNode; subtitle?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEscape(onClose);
  const id = useId();
  return createPortal(
    <div className="ad-app-portal">
      <div className="ad-backdrop" onClick={onClose} />
      <aside className="ad-drawer" role="dialog" aria-modal="true" aria-labelledby={id}>
        <div className="ad-drawer-head">
          <div style={{ minWidth: 0 }}>
            <h2 id={id}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="ad-btn ghost icon" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="ad-drawer-body">{children}</div>
        {footer && <div className="ad-drawer-foot">{footer}</div>}
      </aside>
    </div>,
    document.querySelector('.ad-app') || document.body
  );
}

export function Modal({ title, description, onClose, children, footer, wide }: { title: ReactNode; description?: ReactNode; onClose: () => void; children?: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEscape(onClose);
  const id = useId();
  return createPortal(
    <div className="ad-app-portal">
      <div className="ad-backdrop" onClick={onClose} />
      <div className={`ad-modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={id}>
        <div className="ad-modal-head">
          <h2 id={id}>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {children && <div className="ad-modal-body">{children}</div>}
        {footer && <div className="ad-modal-foot">{footer}</div>}
      </div>
    </div>,
    document.querySelector('.ad-app') || document.body
  );
}

// Confirmation with an optional reason field and an optional "type this to confirm" guard
export function ConfirmDialog({ title, description, confirmLabel, danger, reason, typeToConfirm, busy, onConfirm, onClose }: {
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  reason?: { label: string; placeholder?: string; required?: boolean };
  typeToConfirm?: string;
  busy?: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const [typed, setTyped] = useState('');
  const blocked = (reason?.required && !text.trim()) || (typeToConfirm && typed.trim().toLowerCase() !== typeToConfirm.toLowerCase());
  return (
    <Modal
      title={title}
      description={description}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ad-btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className={`ad-btn ${danger ? 'danger' : 'primary'}`} disabled={!!blocked || busy} onClick={() => onConfirm(text.trim())}>
            {busy && <Spinner size={14} />}{confirmLabel}
          </button>
        </>
      }
    >
      {(reason || typeToConfirm) && (
        <>
          {reason && (
            <div className="ad-field">
              <label htmlFor="ad-confirm-reason">{reason.label}</label>
              <textarea id="ad-confirm-reason" className="ad-textarea" style={{ minHeight: 80 }} value={text} placeholder={reason.placeholder} onChange={(e) => setText(e.target.value)} autoFocus />
            </div>
          )}
          {typeToConfirm && (
            <div className="ad-field">
              <label htmlFor="ad-confirm-type">Type <strong>{typeToConfirm}</strong> to confirm</label>
              <input id="ad-confirm-type" className="ad-input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus={!reason} />
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

interface ToastItem { id: number; message: string; tone: 'success' | 'error' }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push: ToastFn = (message, tone = 'success') => {
    const id = Date.now() + Math.random();
    setItems((list) => [...list, { id, message, tone }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), tone === 'error' ? 6000 : 3500);
  };
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="ad-toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`ad-toast ${t.tone}`}>
            {t.tone === 'error' ? <XCircle size={16} /> : <CheckCircle2 size={16} color="#34d399" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function BarList({ items, tone }: { items: Array<{ label: string; value: number; hint?: string }>; tone?: 'purple' }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="ad-bar-list">
      {items.map((i) => (
        <div className="ad-bar-row" key={i.label}>
          <span>{i.label}</span>
          <strong>{count(i.value)}{i.hint && <span className="ad-muted" style={{ fontWeight: 400 }}> {i.hint}</span>}</strong>
          <div className="ad-bar-track"><div className={`ad-bar-fill${tone ? ` ${tone}` : ''}`} style={{ width: `${(i.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}
