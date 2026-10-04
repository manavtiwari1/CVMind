import { useEffect, useState } from 'react';
import { API_BASE } from './apiBase';

// Content and switches managed from the admin panel (Site content, App config)

export interface ContentBlock {
  id: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  tone: 'info' | 'success' | 'warning' | 'promo';
  endsAt: string | null;
}

export type ContentSlot = 'announcement' | 'home-banner' | 'promo' | 'faq';

export interface SiteConfig {
  maintenance: { enabled: boolean; message: string };
  disabledFeatures: string[];
}

// One request per page load, shared by every component that asks
let contentPromise: Promise<Record<ContentSlot, ContentBlock[]>> | null = null;
let configPromise: Promise<SiteConfig> | null = null;

function loadContent() {
  if (!contentPromise) {
    contentPromise = fetch(`${API_BASE}/api/content`)
      .then((r) => (r.ok ? r.json() : { data: {} }))
      .then((d) => d.data || {})
      .catch(() => ({} as Record<ContentSlot, ContentBlock[]>));
  }
  return contentPromise;
}

export function loadSiteConfig() {
  if (!configPromise) {
    configPromise = fetch(`${API_BASE}/api/config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => ({ maintenance: d?.maintenance || { enabled: false, message: '' }, disabledFeatures: d?.disabledFeatures || [] }))
      .catch(() => ({ maintenance: { enabled: false, message: '' }, disabledFeatures: [] }));
  }
  return configPromise;
}

// Blocks for one slot; empty until loaded, and empty when the admin hasn't added any
export function useSiteContent(slot: ContentSlot): ContentBlock[] {
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  useEffect(() => {
    let cancelled = false;
    loadContent().then((all) => { if (!cancelled) setBlocks(all[slot] || []); });
    return () => { cancelled = true; };
  }, [slot]);
  return blocks;
}

export function useSiteConfig(): SiteConfig | null {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadSiteConfig().then((c) => { if (!cancelled) setConfig(c); });
    return () => { cancelled = true; };
  }, []);
  return config;
}

// Internal links ("/tailor") navigate inside the app; anything else opens normally
export function internalPage(url: string): string | null {
  if (!url.startsWith('/') || url.startsWith('//')) return null;
  return url.replace(/^\/+/, '').split(/[?#]/)[0] || 'home';
}
