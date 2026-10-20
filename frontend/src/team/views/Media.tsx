import { useEffect, useState } from 'react';
import { Download, ExternalLink, FileText, FolderOpen, Image as ImageIcon } from 'lucide-react';
import type { TeamFile } from '../api';
import { hrefFor, useLoad, useTeam } from '../store';
import { ago } from '../format';
import { Empty, Spinner } from '../ui';
import { fileUrl, formatBytes, isImage, openFile } from '../upload';

type MediaFile = TeamFile & { parentId: string | null; version: number | null };

const TYPES = [
  { id: '', label: 'All' },
  { id: 'image', label: 'Images' },
  { id: 'pdf', label: 'PDF' },
  { id: 'doc', label: 'Docs' },
  { id: 'text', label: 'Text' }
];

function sourceHref(f: MediaFile) {
  if (f.scope === 'channel' && f.scopeId) return hrefFor('chat', f.scopeId, f.parentId ? { thread: f.parentId } : { m: f.attachedTo?.id || '' });
  if (f.scope === 'task' && f.scopeId) return hrefFor('tasks', f.scopeId);
  if (f.scope === 'announcement' && f.attachedTo) return hrefFor('announcements', f.attachedTo.id);
  return '';
}

function Thumb({ file }: { file: MediaFile }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { fileUrl(file.id).then(setSrc).catch(() => {}); }, [file.id]);
  return src ? <img src={src} alt={file.name} loading="lazy" /> : <ImageIcon size={24} />;
}

export default function Media() {
  const { channels, people, nameOf, toast, me } = useTeam();
  const [type, setType] = useState('');
  const [scope, setScope] = useState('');
  const [uploadedBy, setUploadedBy] = useState('');
  const [page, setPage] = useState(1);
  const [scopeKind, scopeId] = scope.split(':');
  const { data, loading } = useLoad<{ data: MediaFile[]; total: number; limit: number }>('/media', { type, scope: scopeKind, scopeId, uploadedBy, page });

  const where = (f: MediaFile) => {
    if (f.scope === 'channel') {
      const c = channels.find((x) => x.id === f.scopeId);
      if (!c) return 'a conversation';
      return c.kind === 'dm' ? `DM with ${(c.memberIds || []).filter((m) => m !== me.id).map(nameOf).join(', ')}` : `#${c.name}`;
    }
    if (f.scope === 'task') return f.version ? `Task submission v${f.version}` : 'a task';
    return 'an announcement';
  };
  const open = (f: MediaFile, download = false) => openFile(f.id, download).catch((err: Error) => toast(err.message, 'error'));
  const images = data?.data.filter((f) => isImage(f.mime)) || [];
  const docs = data?.data.filter((f) => !isImage(f.mime)) || [];

  return (
    <div className="tm-page">
      <header className="tm-page-head"><h1>Media</h1><p className="tm-muted">Every file shared in chats, tasks and announcements you can see.</p></header>
      <div className="tm-filters">
        <div className="tm-segment" role="tablist">
          {TYPES.map((t) => <button key={t.id} type="button" role="tab" aria-selected={type === t.id} className={type === t.id ? 'active' : ''} onClick={() => { setType(t.id); setPage(1); }}>{t.label}</button>)}
        </div>
        <select className="tm-input sm" value={scope} onChange={(e) => { setScope(e.target.value); setPage(1); }} aria-label="Shared in">
          <option value="">Shared anywhere</option>
          <option value="task">Tasks</option>
          <option value="announcement">Announcements</option>
          {channels.filter((c) => c.kind !== 'dm').map((c) => <option key={c.id} value={`channel:${c.id}`}>#{c.name}</option>)}
        </select>
        <select className="tm-input sm" value={uploadedBy} onChange={(e) => { setUploadedBy(e.target.value); setPage(1); }} aria-label="Shared by">
          <option value="">Anyone</option>
          {[...people.values()].map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      {loading && !data && <div className="tm-center"><Spinner /></div>}
      {data && !data.data.length && <Empty icon={<FolderOpen size={22} />} title="No files yet" text="Files shared in chats, tasks and announcements appear here." />}
      {images.length > 0 && (
        <div className="tm-media-grid">
          {images.map((f) => (
            <figure key={f.id} className="tm-media-tile">
              <button type="button" onClick={() => open(f)} aria-label={`Open ${f.name}`}><Thumb file={f} /></button>
              <figcaption><span className="tm-clamp">{f.name}</span><span className="tm-muted small">{nameOf(f.uploadedBy)} · {ago(f.createdAt)}</span></figcaption>
            </figure>
          ))}
        </div>
      )}
      {docs.length > 0 && (
        <div className="tm-card tm-list">
          {docs.map((f) => {
            const href = sourceHref(f);
            return (
              <div key={f.id} className="tm-row">
                <FileText size={20} />
                <button type="button" className="tm-row-main tm-plain" onClick={() => open(f, f.mime.includes('wordprocessingml'))}>
                  <strong>{f.name}</strong>
                  <span className="tm-muted">{formatBytes(f.size)} · {nameOf(f.uploadedBy)} · {where(f)} · {ago(f.createdAt)}</span>
                </button>
                {href && <a className="tm-icon-btn sm" href={href} aria-label="Go to where it was shared" title="Go to where it was shared"><ExternalLink size={15} /></a>}
                <button type="button" className="tm-icon-btn sm" onClick={() => open(f, true)} aria-label={`Download ${f.name}`}><Download size={15} /></button>
              </div>
            );
          })}
        </div>
      )}
      {data && data.total > data.limit && (
        <div className="tm-pager">
          <button type="button" className="tm-btn sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="tm-muted">Page {page} of {Math.ceil(data.total / data.limit)}</span>
          <button type="button" className="tm-btn sm" disabled={page * data.limit >= data.total} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
