import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Construction, X } from 'lucide-react';
import { internalPage, useSiteConfig, useSiteContent } from '../lib/siteContent';
import type { ContentBlock } from '../lib/siteContent';
import './SiteBanner.css';

interface SiteBannerProps {
  setCurrentPage: (page: string) => void;
}

const dismissKey = (b: ContentBlock) => `cvmind_banner_dismissed_${b.id}`;

function wasDismissed(b: ContentBlock) {
  try {
    return localStorage.getItem(dismissKey(b)) === '1';
  } catch {
    return false;
  }
}

// Top-of-page bar: maintenance notice when the site is down, otherwise the admin's announcement
export default function SiteBanner({ setCurrentPage }: SiteBannerProps) {
  const config = useSiteConfig();
  const [announcement] = useSiteContent('announcement');
  const [dismissed, setDismissed] = useState<string | null>(null);

  if (config?.maintenance.enabled) {
    return (
      <TopBar>
        <div className="site-banner warning" role="status">
          <Construction size={16} />
          <span>{config.maintenance.message || 'CVMind is down for maintenance. We will be back shortly.'}</span>
        </div>
      </TopBar>
    );
  }

  if (!announcement || dismissed === announcement.id || wasDismissed(announcement)) return null;

  return (
    <TopBar>
      <ContentBanner block={announcement} setCurrentPage={setCurrentPage} onDismiss={() => {
        try { localStorage.setItem(dismissKey(announcement), '1'); } catch { /* storage blocked */ }
        setDismissed(announcement.id);
      }} />
    </TopBar>
  );
}

// The navbar is fixed at the top, so it moves down by the part of the bar still on screen
function TopBar({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const update = () => root.style.setProperty('--site-banner-offset', `${Math.max(0, el.offsetHeight - window.scrollY)}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', update);
      root.style.removeProperty('--site-banner-offset');
    };
  }, []);
  return <div ref={ref}>{children}</div>;
}

export function ContentBanner({ block, setCurrentPage, onDismiss, className = '' }: { block: ContentBlock; setCurrentPage: (page: string) => void; onDismiss?: () => void; className?: string }) {
  const page = block.ctaUrl ? internalPage(block.ctaUrl) : null;
  return (
    <div className={`site-banner ${block.tone} ${className}`} role="region" aria-label="Announcement">
      <span className="site-banner-text">
        <strong>{block.title}</strong>
        {block.body && <span className="site-banner-body"> {block.body}</span>}
      </span>
      {block.ctaLabel && block.ctaUrl && (
        page
          ? <button type="button" className="site-banner-cta" onClick={() => setCurrentPage(page)}>{block.ctaLabel} →</button>
          : <a className="site-banner-cta" href={block.ctaUrl} target="_blank" rel="noreferrer">{block.ctaLabel} →</a>
      )}
      {onDismiss && (
        <button type="button" className="site-banner-close" onClick={onDismiss} aria-label="Dismiss announcement"><X size={15} /></button>
      )}
    </div>
  );
}

// A banner inside a page (home banner, pricing promo); renders nothing until the admin adds one
export function SlotBanner({ slot, setCurrentPage }: { slot: 'home-banner' | 'promo'; setCurrentPage: (page: string) => void }) {
  const [block] = useSiteContent(slot);
  if (!block) return null;
  return <ContentBanner block={block} setCurrentPage={setCurrentPage} className="inline" />;
}
