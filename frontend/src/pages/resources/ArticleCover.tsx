// Flat illustrated cover for a blog article: a labelled book on a coloured background,
// tinted by the article's tag. Drawn inline so it needs no image files.

const LABELS: Record<string, string> = {
  'how-to-create-an-ats-friendly-resume': 'GUIDE',
  'resume-keywords-guide': 'KEYWORDS',
  'ats-resume-checklist': 'CHECKLIST',
  'pdf-vs-docx-resume': 'PDF / DOCX',
  'resume-mistakes-to-avoid': 'MISTAKES',
  'resume-format-for-freshers': 'FRESHERS',
  'tell-me-about-yourself': 'INTERVIEW',
  'linkedin-profile-optimization': 'LINKEDIN',
};

interface Palette { bg: string; band: string; book: string; spine: string }

const PALETTES: Record<string, Palette> = {
  'Resume Guide': { bg: '#56cfa3', band: '#6bdab2', book: '#a594f0', spine: '#7c68dc' },
  Checklist: { bg: '#ffcf6b', band: '#ffdb8c', book: '#5aa9f5', spine: '#3a86d6' },
  Freshers: { bg: '#8fc3ff', band: '#a8d1ff', book: '#ff8f7a', spine: '#e46b56' },
  Interview: { bg: '#ff9f8c', band: '#ffb5a6', book: '#56cfa3', spine: '#2fae84' },
  LinkedIn: { bg: '#7aa7ff', band: '#94b9ff', book: '#ffcf6b', spine: '#e7ae3c' },
};

interface ArticleCoverProps {
  slug: string;
  tag: string;
  className?: string;
}

export default function ArticleCover({ slug, tag, className }: ArticleCoverProps) {
  const p = PALETTES[tag] || PALETTES['Resume Guide'];
  const label = LABELS[slug] || tag.toUpperCase();
  const fontSize = label.length > 8 ? 22 : label.length > 6 ? 26 : label.length > 5 ? 32 : 38;

  return (
    <svg className={className} viewBox="0 0 640 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`${tag} illustration`}>
      <rect width="640" height="400" fill={p.bg} />
      <path d="M0 250 C 140 205 260 215 380 190 S 560 150 640 165 L 640 400 L 0 400 Z" fill={p.band} />
      <path d="M0 340 C 160 330 420 335 640 345" stroke="#1f2933" strokeWidth="2" fill="none" />
      <path d="M560 0 C 540 120 470 190 400 220" stroke="#1f2933" strokeWidth="2" fill="none" />
      <path d="M640 230 C 560 240 520 300 520 360" stroke="#1f2933" strokeWidth="2" fill="none" />

      {/* sparkles */}
      <path d="M72 70 l5 15 15 5 -15 5 -5 15 -5 -15 -15 -5 15 -5z" fill="#ffffff" opacity="0.7" />
      <path d="M118 110 l4 11 11 4 -11 4 -4 11 -4 -11 -11 -4 11 -4z" fill="#ffffff" opacity="0.6" />
      <path d="M560 300 l4 11 11 4 -11 4 -4 11 -4 -11 -11 -4 11 -4z" fill="#ffffff" opacity="0.6" />

      {/* book */}
      <rect x="236" y="92" width="190" height="236" rx="10" fill="#ffffff" />
      <rect x="228" y="86" width="190" height="236" rx="10" fill={p.book} />
      <rect x="228" y="86" width="22" height="236" rx="8" fill={p.spine} />
      <path d="M380 70 v34 l10 -8 10 8 v-34z" fill="#ff6b81" />
      <text x="334" y="168" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="800" fontSize={fontSize} fill="#ffffff" letterSpacing="1">
        {label}
      </text>
      <circle cx="334" cy="228" r="30" fill="#ffb347" />
      <circle cx="334" cy="228" r="21" fill="#ffcf6b" />
      <path d="M334 214 l4.4 9 9.8 1.4 -7.1 6.9 1.7 9.7 -8.8 -4.6 -8.8 4.6 1.7 -9.7 -7.1 -6.9 9.8 -1.4z" fill="#ff9f1c" />
      <path d="M318 252 l-10 34 14 -6 8 12 6 -36z M350 252 l10 34 -14 -6 -8 12 -6 -36z" fill="#ffb347" />

      {/* reader with a laptop */}
      <circle cx="170" cy="262" r="14" fill="#2b2b2b" />
      <rect x="152" y="278" width="36" height="34" rx="10" fill="#3b4a8a" />
      <rect x="138" y="300" width="64" height="22" rx="10" fill="#ff6b81" />
      <rect x="154" y="290" width="34" height="20" rx="3" fill="#c9ced6" />
      <path d="M130 322 h80" stroke="#1f2933" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
