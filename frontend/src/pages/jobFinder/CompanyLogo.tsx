import { useState } from 'react';

// The company's logo from the job listing, else its site's icon, else its initials
export default function CompanyLogo({ company, logo, domain, size = 44 }: { company: string; logo?: string; domain?: string; size?: number }) {
  const sources = [logo, domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128` : ''].filter(Boolean) as string[];
  const [index, setIndex] = useState(0);
  const initials = company.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

  return (
    <span className="jf-logo" style={{ width: size, height: size }} aria-hidden="true">
      {index < sources.length
        ? <img src={sources[index]} alt="" loading="lazy" onError={() => setIndex((i) => i + 1)} />
        : <span className="jf-logo-initials">{initials}</span>}
    </span>
  );
}
