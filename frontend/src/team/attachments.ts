import { useState } from 'react';
import type { TeamFile } from './api';
import { useTeam } from './store';
import { checkFile, uploadFile } from './upload';
import type { UploadScope } from './upload';

export interface PendingFile { key: string; name: string; size: number; progress: number; file?: TeamFile; error?: string; abort: AbortController }

// Files being attached to something not sent yet. `ready` holds the uploaded ids.
export function useAttachments(target: UploadScope | null, { max = 10, maxBytes }: { max?: number; maxBytes?: number } = {}) {
  const [items, setItems] = useState<PendingFile[]>([]);
  const { toast } = useTeam();
  const add = (files: FileList | File[]) => {
    if (!target) return;
    const list = [...files];
    if (items.length + list.length > max) { toast(`Attach up to ${max} files.`, 'error'); return; }
    for (const file of list) {
      const problem = checkFile(file, maxBytes);
      if (problem) { toast(problem, 'error'); continue; }
      const key = `${file.name}-${Math.random()}`;
      const abort = new AbortController();
      setItems((prev) => [...prev, { key, name: file.name, size: file.size, progress: 0, abort }]);
      const patch = (p: Partial<PendingFile>) => setItems((prev) => prev.map((x) => (x.key === key ? { ...x, ...p } : x)));
      uploadFile(file, target, (progress) => patch({ progress }), abort.signal)
        .then((uploaded) => patch({ file: uploaded, progress: 100 }))
        .catch((err: Error) => {
          if (err.name === 'AbortError') return;
          patch({ error: err.message });
          toast(`${file.name}: ${err.message}`, 'error');
        });
    }
  };
  const remove = (key: string) => setItems((prev) => {
    prev.find((x) => x.key === key)?.abort.abort();
    return prev.filter((x) => x.key !== key);
  });
  const clear = () => setItems([]);
  const uploading = items.some((x) => !x.file && !x.error);
  const ready = items.filter((x) => x.file).map((x) => x.file!.id);
  return { items, add, remove, clear, uploading, ready };
}

