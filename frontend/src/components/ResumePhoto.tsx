import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloudUpload, EyeOff, X } from 'lucide-react';
import { isProfilePhoto } from '../lib/resumeDesign';
import './ResumePhoto.css';


/* ───────────────────────────── hover controls ───────────────────────────── */

interface PhotoHoverProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
  onUpload: (img: HTMLImageElement) => void;
  onHide: (img: HTMLImageElement) => void;
}

/** Upload / hide buttons that appear over the profile photo while it is hovered. */
export function PhotoHover({ editorRef, onUpload, onHide }: PhotoHoverProps) {
  const [hover, setHover] = useState<{ img: HTMLImageElement; rect: DOMRect } | null>(null);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const onOver = (e: MouseEvent) => {
      const t = e.target as Element;
      if (isProfilePhoto(t)) setHover({ img: t, rect: t.getBoundingClientRect() });
    };
    // Keep the buttons while the pointer is anywhere over the photo (including the buttons themselves).
    const onMove = (e: MouseEvent) => {
      setHover(h => {
        if (!h) return h;
        if (!h.img.isConnected) return null;
        const r = h.img.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        return inside ? (r.top === h.rect.top && r.left === h.rect.left ? h : { img: h.img, rect: r }) : null;
      });
    };
    const clear = () => setHover(null);
    ed.addEventListener('mouseover', onOver);
    document.addEventListener('mousemove', onMove);
    window.addEventListener('scroll', clear, true);
    return () => {
      ed.removeEventListener('mouseover', onOver);
      document.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', clear, true);
    };
  }, [editorRef]);

  if (!hover) return null;
  const { rect, img } = hover;
  return createPortal(
    <div className="rp-hover" style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}>
      <button type="button" className="rp-hover-btn rp-hover-btn--up" onClick={() => { setHover(null); onUpload(img); }} aria-label="Upload photo" title="Upload photo">
        <CloudUpload size={18} />
      </button>
      <button type="button" className="rp-hover-btn rp-hover-btn--hide" onClick={() => { setHover(null); onHide(img); }} aria-label="Hide photo" title="Hide photo">
        <EyeOff size={18} />
      </button>
    </div>,
    document.body,
  );
}

/* ───────────────────────────── upload + crop dialog ───────────────────────────── */

const VIEW = 270;   // crop window, px
const OUT = 400;    // saved photo, px (square)

interface PhotoDialogProps {
  currentSrc: string;
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}

type Step = 'preview' | 'crop' | 'loading' | 'processing';

export function PhotoDialog({ currentSrc, onSave, onClose }: PhotoDialogProps) {
  const [step, setStep] = useState<Step>('preview');
  const [preview, setPreview] = useState(currentSrc);
  const [changed, setChanged] = useState(false);
  const [error, setError] = useState('');
  const [source, setSource] = useState<{ img: HTMLImageElement; url: string } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [progress, setProgress] = useState(0);
  const result = useRef<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const baseScale = source ? VIEW / Math.min(source.img.naturalWidth, source.img.naturalHeight) : 1;
  const scale = baseScale * zoom;
  const dispW = source ? source.img.naturalWidth * scale : VIEW;
  const dispH = source ? source.img.naturalHeight * scale : VIEW;

  /** Keeps the image covering the whole crop window. */
  const clamp = (x: number, y: number, w = dispW, h = dispH) => ({
    x: Math.min(0, Math.max(VIEW - w, x)),
    y: Math.min(0, Math.max(VIEW - h, y)),
  });

  const pickFile = (file: File) => {
    setError('');
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) { setError('Please choose a JPG, PNG or WebP image.'); return; }
    if (file.size > 8 * 1024 * 1024) { setError('That image is larger than 8 MB. Please pick a smaller one.'); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = VIEW / Math.min(img.naturalWidth, img.naturalHeight);
      setSource({ img, url });
      setZoom(1);
      setOffset({ x: (VIEW - img.naturalWidth * s) / 2, y: (VIEW - img.naturalHeight * s) / 2 });
      setStep('crop');
    };
    img.onerror = () => { setError('We could not open that image.'); URL.revokeObjectURL(url); };
    img.src = url;
  };

  const changeZoom = (z: number) => {
    if (!source) return;
    // zoom around the centre of the crop window
    const cx = (VIEW / 2 - offset.x) / scale;
    const cy = (VIEW / 2 - offset.y) / scale;
    const ns = baseScale * z;
    const w = source.img.naturalWidth * ns;
    const h = source.img.naturalHeight * ns;
    setZoom(z);
    setOffset(clamp(VIEW / 2 - cx * ns, VIEW / 2 - cy * ns, w, h));
  };

  // Crop right away, then show loading (1-100%) and "Processing image..." before the new photo appears.
  const accept = () => {
    if (!source) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setError('Your browser could not process the image.'); setStep('preview'); return; }
    const k = OUT / VIEW;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, OUT, OUT);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source.img, offset.x * k, offset.y * k, dispW * k, dispH * k);
    result.current = canvas.toDataURL('image/jpeg', 0.9);
    URL.revokeObjectURL(source.url);
    setSource(null);
    setProgress(1);
    setStep('loading');
  };

  useEffect(() => {
    if (step === 'loading') {
      const t = setInterval(() => setProgress(p => Math.min(100, p + Math.max(2, Math.round((100 - p) / 7)))), 60);
      return () => clearInterval(t);
    }
    if (step === 'processing') {
      const t = setTimeout(() => {
        if (result.current) { setPreview(result.current); setChanged(true); }
        setStep('preview');
      }, 700);
      return () => clearTimeout(t);
    }
  }, [step]);

  useEffect(() => {
    if (step !== 'loading' || progress < 100) return;
    const t = setTimeout(() => setStep('processing'), 250);
    return () => clearTimeout(t);
  }, [step, progress]);

  const onKeyPan = (e: React.KeyboardEvent) => {
    const d = e.shiftKey ? 20 : 6;
    const moves: Record<string, [number, number]> = { ArrowLeft: [d, 0], ArrowRight: [-d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    setOffset(o => clamp(o.x + m[0], o.y + m[1]));
  };

  return createPortal(
    <div className="rp-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`rp-dialog rp-dialog--${step}`} ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="rp-title">
        <button type="button" className="rp-x" onClick={onClose} aria-label="Close"><X size={20} /></button>
        <h2 id="rp-title">Upload photo:</h2>

        {step === 'preview' && (
          <>
            <img className="rp-current" src={preview} alt="Current profile photo" />
            <p className="rp-hint">Square images work best.</p>
            {error && <p className="rp-error" role="alert">{error}</p>}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden
              onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ''; }} />
            <div className="rp-actions">
              <button type="button" className="rp-btn rp-btn--outline" onClick={() => fileRef.current?.click()}>Upload</button>
              <button type="button" className="rp-btn rp-btn--solid" onClick={() => (changed ? onSave(preview) : onClose())}>Save</button>
            </div>
          </>
        )}

        {step === 'crop' && source && (
          <>
            <div
              className="rp-crop"
              style={{ width: VIEW, height: VIEW }}
              tabIndex={0}
              role="application"
              aria-label="Drag to position your photo. Use arrow keys to move it."
              onKeyDown={onKeyPan}
              onPointerDown={e => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }; }}
              onPointerMove={e => { const d = drag.current; if (d) setOffset(clamp(d.ox + e.clientX - d.x, d.oy + e.clientY - d.y)); }}
              onPointerUp={() => { drag.current = null; }}
              onPointerCancel={() => { drag.current = null; }}
            >
              <img src={source.url} alt="" draggable={false} style={{ width: dispW, height: dispH, transform: `translate(${offset.x}px, ${offset.y}px)` }} />
              <span className="rp-ring" aria-hidden="true" />
            </div>
            <input className="rp-zoom" type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => changeZoom(Number(e.target.value))} aria-label="Zoom" />
            <div className="rp-stack">
              <button type="button" className="rp-btn rp-btn--outline" onClick={() => { URL.revokeObjectURL(source.url); setSource(null); setStep('preview'); }}>Back</button>
              <button type="button" className="rp-btn rp-btn--solid" onClick={accept}>Accept</button>
            </div>
          </>
        )}

        {step === 'loading' && (
          <div className="rp-loading" aria-live="polite">
            <p>Uploading photo... {progress}%</p>
            <div className="rp-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div>
          </div>
        )}

        {step === 'processing' && <p className="rp-processing" aria-live="polite">Processing image...</p>}
      </div>
    </div>,
    document.body,
  );
}
