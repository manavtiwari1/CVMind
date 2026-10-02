import { useEffect, useRef, useState } from 'react';
import { GOOGLE_FONTS_HREF } from '../lib/resumeDesign';
import { PAGE_H, PAGE_W } from '../lib/resumeHandoff';

/** A finished resume at real size, scaled to fit. Sandboxed with no scripts. Styled by Tailor.css (.tlr-sheet). */
export default function ResumeSheet({ html, title = 'Resume preview' }: { html: string; title?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0);
  const [height, setHeight] = useState(PAGE_H);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / PAGE_W));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const measure = () => {
    const d = frameRef.current?.contentDocument;
    if (d) setHeight(Math.max(PAGE_H, d.documentElement.scrollHeight));
  };

  const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${GOOGLE_FONTS_HREF}">
<style>:root{--rs-h:${PAGE_H}px}html,body{margin:0;background:#fff}body{font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#111}*{box-sizing:border-box}</style>
</head><body>${html}</body></html>`;

  return (
    <div ref={wrapRef} className="tlr-sheet" style={{ height: scale ? height * scale : undefined }}>
      {scale > 0 && (
        <iframe
          ref={frameRef}
          title={title}
          sandbox="allow-same-origin"
          srcDoc={doc}
          onLoad={() => { measure(); setTimeout(measure, 700); }}
          style={{ width: PAGE_W, height, transform: `scale(${scale})` }}
        />
      )}
    </div>
  );
}
