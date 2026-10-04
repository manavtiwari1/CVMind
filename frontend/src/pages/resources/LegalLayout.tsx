import type { ReactNode } from 'react';
import { LEGAL_PAGES } from '../../data/legalPages';
import './Resources.css';

interface LegalLayoutProps {
  page: string;
  title: string;
  updated: string;
  setCurrentPage: (page: string) => void;
  /** Section headings to list in a table of contents above the document (ids match the h2s). */
  toc?: { id: string; label: string }[];
  children: ReactNode;
}

// Centred title, the legal pages listed on the left, the document on the right
export default function LegalLayout({ page, title, updated, setCurrentPage, toc, children }: LegalLayoutProps) {
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="rsc">
      <h1 className="rsc-title">{title}</h1>

      <div className="rsc-legal-grid">
        <nav className="rsc-legal-nav" aria-label="Legal pages">
          {LEGAL_PAGES.map(l => (
            <button
              key={l.page}
              type="button"
              aria-current={l.page === page ? 'page' : undefined}
              onClick={() => setCurrentPage(l.page)}
            >
              {l.label}
            </button>
          ))}
        </nav>

        <article className="rsc-doc">
          <p className="rsc-doc-updated">Last updated: {updated}</p>
          {toc && toc.length > 0 && (
            <nav className="rsc-doc-toc" aria-label="On this page">
              <p>Table of contents</p>
              <ol>
                {toc.map(t => (
                  <li key={t.id}>
                    <button type="button" onClick={() => jump(t.id)}>{t.label}</button>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          {children}
        </article>
      </div>
    </div>
  );
}
