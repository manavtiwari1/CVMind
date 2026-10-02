import { useEffect, useRef, useState } from 'react';
import './TemplatePreview.css';

/** A4 at 96dpi. Templates are authored against this width and scaled down to fit. */
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = Math.round(PAGE_WIDTH * 1.4142);

interface TemplatePreviewProps {
  html: string;
  name: string;
  /** Render immediately instead of waiting until scrolled into view. */
  eager?: boolean;
  /** CSS aspect-ratio of the visible window. Defaults to a full A4 page; use a wider ratio to crop trailing whitespace. */
  aspect?: string;
  /** Design width to scale from. Lower than A4 zooms in slightly, which trims side margins but makes text more legible on small cards. */
  pageWidth?: number;
}

/**
 * Renders the real template markup, scaled to whatever width its container has.
 * The preview is therefore always identical to what opens in the editor.
 * Rendering is deferred until the card is near the viewport, so a gallery of
 * 30+ full-size documents does not block the first paint.
 */
export default function TemplatePreview({ html, name, eager = false, aspect, pageWidth = PAGE_WIDTH }: TemplatePreviewProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [visible, setVisible] = useState(eager);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / pageWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pageWidth]);

  useEffect(() => {
    if (visible) return;
    const el = frameRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return (
    <div
      ref={frameRef}
      className={`tp-frame${visible && scale > 0 ? ' tp-ready' : ''}`}
      style={aspect ? { aspectRatio: aspect } : undefined}
      role="img"
      aria-label={`${name} template preview`}
    >
      <div className="tp-skeleton" aria-hidden="true" />
      {visible && scale > 0 && (
        <div
          className="tp-page"
          aria-hidden="true"
          style={{ width: pageWidth, height: PAGE_HEIGHT, transform: `scale(${scale})` }}
          // Template markup is a static, first-party constant (data/resumeTemplates.ts), never user input.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}
