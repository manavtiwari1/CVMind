import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { urlForPage } from '../lib/hosts';

interface PageLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  page: string;
  onNavigate: (page: string) => void;
}

// A real <a href> to one of our pages, so search engines can follow it and Ctrl/middle click opens a
// new tab. A plain click still navigates inside the app (onNavigate), without a page reload.
export default function PageLink({ page, onNavigate, onClick, ...rest }: PageLinkProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onNavigate(page);
  };
  return <a href={urlForPage(page)} onClick={handleClick} {...rest} />;
}
