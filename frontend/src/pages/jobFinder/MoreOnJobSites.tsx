import { ExternalLink } from 'lucide-react';

// Opens the same search on the big job sites. These are plain search links: we don't read those
// sites or know how many jobs they have, so the copy never claims a count.

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function jobSiteLinks(keywords: string, location: string) {
  const k = keywords.trim();
  const l = location.trim();
  const linkedin = new URL('https://www.linkedin.com/jobs/search/');
  linkedin.searchParams.set('keywords', k);
  linkedin.searchParams.set('location', l || 'India');

  // Naukri's search pages are addressed by slug ("react-developer-jobs-in-pune"); k and l fill its search box
  const naukri = new URL(`https://www.naukri.com/${slug(k) || 'all'}-jobs${l ? `-in-${slug(l)}` : ''}`);
  naukri.searchParams.set('k', k);
  if (l) naukri.searchParams.set('l', l);

  const indeed = new URL('https://in.indeed.com/jobs');
  indeed.searchParams.set('q', k);
  if (l) indeed.searchParams.set('l', l);

  return [
    { name: 'LinkedIn', href: linkedin.toString() },
    { name: 'Naukri', href: naukri.toString() },
    { name: 'Indeed', href: indeed.toString() }
  ];
}

export default function MoreOnJobSites({ keywords, location }: { keywords: string; location: string }) {
  if (!keywords.trim()) return null;
  return (
    <div className="jf-elsewhere">
      <span>Search “{keywords.trim()}”{location.trim() ? ` in ${location.trim()}` : ''} on:</span>
      {jobSiteLinks(keywords, location).map((site) => (
        <a key={site.name} className="jf-elsewhere-link" href={site.href} target="_blank" rel="noopener noreferrer">
          {site.name} <ExternalLink size={13} />
        </a>
      ))}
    </div>
  );
}
