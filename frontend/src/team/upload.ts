import { api } from './api';
import type { TeamFile } from './api';

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const ACCEPT = '.pdf,.txt,.docx,.png,.jpg,.jpeg,.webp';

const TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp'
};

export const isImage = (mime: string) => mime.startsWith('image/');

// The type the server expects for this file name, or '' when the type isn't allowed
export function mimeFor(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return TYPES[ext] || '';
}

export function checkFile(file: File, max = MAX_FILE_BYTES): string {
  if (!mimeFor(file)) return `${file.name}: only PDF, TXT, DOCX, PNG and JPG files are allowed.`;
  if (file.size === 0) return `${file.name} is empty.`;
  if (file.size > max) return `${file.name} is larger than ${Math.round(max / 1024 / 1024)} MB.`;
  return '';
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export type UploadScope = { scope: 'channel' | 'task' | 'announcement' | 'avatar' | 'meeting'; scopeId?: string | null };

// Meeting recordings only (never offered for chat or task attachments)
const RECORDING_TYPES: Record<string, string> = { webm: 'video/webm', mp4: 'video/mp4' };
export const MAX_RECORDING_BYTES = 1024 * 1024 * 1024;

// Presign → PUT straight to storage (with progress) → confirm. Abort with the signal to cancel.
export async function uploadFile(file: File, target: UploadScope, onProgress?: (pct: number) => void, signal?: AbortSignal): Promise<TeamFile> {
  const mime = target.scope === 'meeting' ? RECORDING_TYPES[file.name.split('.').pop()?.toLowerCase() || ''] || '' : mimeFor(file);
  const { file: record, uploadUrl, headers } = await api<{ file: TeamFile; uploadUrl: string; headers: Record<string, string> }>('/files/upload-url', {
    method: 'POST',
    body: { name: file.name, mime, size: file.size, scope: target.scope, scopeId: target.scopeId || null }
  });
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status}).`)));
    xhr.onerror = () => reject(new Error('Upload failed. Check your connection.'));
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));
    signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(file);
  });
  const done = await api<{ file: TeamFile }>(`/files/${record.id}/complete`, { method: 'POST' });
  return done.file;
}

// Opens a file in a new tab (or downloads it) through a short-lived link
export async function openFile(fileId: string, download = false) {
  const tab = download ? null : window.open('', '_blank');
  try {
    const { url } = await api<{ url: string }>(`/files/${fileId}`, { query: { download: download ? 1 : undefined } });
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch (err) {
    tab?.close();
    throw err;
  }
}

// Short-lived link for showing an image inline; cached for a few minutes
const urlCache = new Map<string, { url: string; at: number }>();
export async function fileUrl(fileId: string) {
  const hit = urlCache.get(fileId);
  if (hit && Date.now() - hit.at < 4 * 60 * 1000) return hit.url;
  const { url } = await api<{ url: string }>(`/files/${fileId}`);
  urlCache.set(fileId, { url, at: Date.now() });
  return url;
}
