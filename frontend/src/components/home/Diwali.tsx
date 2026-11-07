import { useId, type CSSProperties } from 'react';
import './diwali.css';

// Diwali dressing for the hero prompt box: a marigold toran, two diyas, a rangoli and twinkles.
// All hand-drawn SVG (no images). HomeHero shows them only during the festival (lib/festive.ts).

/* ── Marigold toran: three drapes of flowers with mango-leaf drops between them ── */
const W = 1000;
const DRAPES = 3;
const PER_DRAPE = 15;
const SAG = 34;

const flowers = Array.from({ length: DRAPES }).flatMap((_, d) =>
  Array.from({ length: PER_DRAPE }, (_, i) => {
    const t = i / (PER_DRAPE - 1);
    const x = (d + t) * (W / DRAPES);
    const y = 8 + SAG * Math.sin(Math.PI * t);
    return { x, y, warm: (i + d) % 3 };
  }));

const COLORS = ['#ff8a00', '#ffb300', '#ff6d00'];

export function Toran() {
  const drops = Array.from({ length: DRAPES + 1 }, (_, i) => i * (W / DRAPES));
  return (
    <svg className="dw-toran" viewBox={`0 0 ${W} 92`} preserveAspectRatio="xMidYMin meet" aria-hidden="true">
      {/* the string */}
      {Array.from({ length: DRAPES }).map((_, d) => {
        const x0 = d * (W / DRAPES), x1 = x0 + W / DRAPES;
        return <path key={d} d={`M${x0},8 Q${(x0 + x1) / 2},${8 + SAG * 2} ${x1},8`} fill="none" stroke="#b45309" strokeWidth="1.5" opacity=".5" />;
      })}
      {flowers.map((f, i) => (
        <g key={i} transform={`translate(${f.x} ${f.y})`}>
          <circle r="9" fill={COLORS[f.warm]} />
          <circle r="6.2" fill={COLORS[(f.warm + 1) % 3]} opacity=".85" />
          <circle r="2.6" fill="#7c2d12" opacity=".55" />
        </g>
      ))}
      {drops.map((x, i) => (
        // Position on the outer group; the CSS swing animates the inner one (a CSS transform would replace the attribute)
        <g key={i} transform={`translate(${x} 10) scale(.8)`}>
        <g className="dw-drop" style={{ '--i': i } as CSSProperties}>
          <path d="M0,0 C-14,10 -12,26 0,34 C12,26 14,10 0,0 Z" fill="#2f9e44" />
          <path d="M0,4 L0,30" stroke="#1b6e2f" strokeWidth="1.4" />
        </g>
        </g>
      ))}
    </svg>
  );
}

/* ── Diya: a clay lamp with a flickering flame ── */
export function Diya({ className = '' }: { className?: string }) {
  // Gradient ids are per lamp: a hidden lamp's <defs> can't paint the visible ones
  const uid = useId().replace(/:/g, '');
  const glow = `dwGlow${uid}`, clay = `dwClay${uid}`, flame = `dwFlame${uid}`;
  return (
    <svg className={`dw-diya ${className}`} viewBox="0 0 120 110" aria-hidden="true">
      <defs>
        <radialGradient id={glow} cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="#ffd166" stopOpacity=".75" />
          <stop offset="60%" stopColor="#ff9f1c" stopOpacity=".18" />
          <stop offset="100%" stopColor="#ff9f1c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={clay} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d9692b" />
          <stop offset="100%" stopColor="#8a3412" />
        </linearGradient>
        <linearGradient id={flame} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#ff6b00" />
          <stop offset="55%" stopColor="#ffb703" />
          <stop offset="100%" stopColor="#fff3b0" />
        </linearGradient>
      </defs>
      <circle className="dw-glow" cx="60" cy="40" r="44" fill={`url(#${glow})`} />
      <g className="dw-flame">
        <path d="M60,8 C70,24 72,36 60,48 C48,36 50,24 60,8 Z" fill={`url(#${flame})`} />
        <path d="M60,26 C64,33 64,40 60,46 C56,40 56,33 60,26 Z" fill="#fffbe6" />
      </g>
      <path d="M14,58 Q60,52 106,58 Q100,92 60,96 Q20,92 14,58 Z" fill={`url(#${clay})`} />
      <path d="M14,58 Q60,66 106,58" fill="none" stroke="#f4a261" strokeWidth="3" strokeLinecap="round" />
      {[30, 45, 60, 75, 90].map((x) => <circle key={x} cx={x} cy={x === 60 ? 79 : 76} r="2.6" fill="#ffd166" />)}
      <path d="M40,86 Q60,92 80,86" fill="none" stroke="#ffd166" strokeWidth="1.6" strokeDasharray="2 4" />
    </svg>
  );
}

/* ── Rangoli: petals in three rings, slowly turning ── */
export function Rangoli({ className = '' }: { className?: string }) {
  const ring = (n: number, r: number, len: number, color: string, w: number) =>
    Array.from({ length: n }, (_, i) => (
      <ellipse key={`${color}${i}`} cx="0" cy={-r} rx={w} ry={len} fill={color} transform={`rotate(${(360 / n) * i})`} />
    ));
  return (
    <svg className={`dw-rangoli ${className}`} viewBox="-100 -100 200 200" aria-hidden="true">
      <g className="dw-rangoli-spin">
        {ring(16, 74, 16, '#7c3aed', 7)}
        {ring(12, 52, 18, '#ec4899', 9)}
        {ring(8, 30, 16, '#ff8a00', 9)}
        <circle r="16" fill="#ffc300" />
        <circle r="8" fill="#2dc08d" />
        {Array.from({ length: 24 }, (_, i) => (
          <circle key={i} r="2.4" fill="#ffd166" transform={`rotate(${15 * i}) translate(0 -92)`} />
        ))}
      </g>
    </svg>
  );
}

/* ── Twinkles: four-point stars that twinkle in turn ── */
const SPARKS = [
  { left: '-3%', top: '18%', size: 18, d: 0 },
  { left: '101%', top: '30%', size: 14, d: 0.6 },
  { left: '6%', top: '102%', size: 12, d: 1.1 },
  { left: '93%', top: '96%', size: 16, d: 1.6 },
  { left: '48%', top: '-14%', size: 10, d: 0.9 },
  { left: '-5%', top: '70%', size: 10, d: 2.1 },
];

export function Twinkles() {
  return (
    <>
      {SPARKS.map((s, i) => (
        <svg
          key={i}
          className="dw-spark"
          viewBox="0 0 24 24"
          width={s.size}
          height={s.size}
          style={{ left: s.left, top: s.top, animationDelay: `${s.d}s` }}
          aria-hidden="true"
        >
          <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z" fill="#ffb703" />
        </svg>
      ))}
    </>
  );
}
