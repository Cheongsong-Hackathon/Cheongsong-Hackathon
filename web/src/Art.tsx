// 체험 카드 그림: 이미지 파일 없이 분류별 SVG 삽화
import type { ReactNode } from 'react';

const S = { stroke: '#3b2f63', strokeWidth: 2.4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

const ART: Record<string, [string, string, ReactNode]> = {
  book: ['#f6e7d4', '#e9cfae', (
    <>
      <rect x="22" y="58" width="76" height="8" rx="3" fill="#b9875a" />
      <path d="M30 56q15-8 30 0V30q-15-8-30 0zM60 56q15-8 30 0V30q-15-8-30 0z" fill="#fffaf2" {...S} />
      <path d="M36 36h16M36 43h16M66 36h16M66 43h16" {...S} strokeWidth={1.6} />
      <path d="M86 50h12v10a6 6 0 0 1-6 6h0a6 6 0 0 1-6-6z" fill="#fff" {...S} />
    </>
  )],
  pottery: ['#f3e2d5', '#e3c0a6', (
    <>
      <ellipse cx="60" cy="66" rx="34" ry="7" fill="#b48a6c" />
      <path d="M40 36h40l-4 26q-16 6-32 0z" fill="#d9a483" {...S} />
      <ellipse cx="60" cy="36" rx="20" ry="5" fill="#c58e6c" {...S} />
      <path d="M48 46q12 4 24 0" {...S} />
    </>
  )],
  perfume: ['#efe6ff', '#d9c8ff', (
    <>
      <rect x="44" y="34" width="32" height="34" rx="9" fill="#ffd2e2" {...S} />
      <rect x="53" y="24" width="14" height="10" rx="3" fill="#c9b3ff" {...S} />
      <path d="M50 52q10 6 20 0" {...S} />
      <path d="M86 30l6-4M88 40h8M84 22l2-7" {...S} />
      <circle cx="30" cy="40" r="4" fill="#b495ff" /><circle cx="24" cy="52" r="3" fill="#b495ff" />
    </>
  )],
  flower: ['#ffe9ef', '#ffd0dd', (
    <>
      <path d="M60 70V44M60 58q-12-4-16-14M60 60q12-4 16-14" {...S} stroke="#5c8a3a" />
      {[[-14, 0], [0, -8], [14, 0]].map(([dx, dy], i) => (
        <g key={i} transform={`translate(${60 + dx} ${36 + dy})`}>
          {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cy="-6" rx="4.5" ry="6.5" fill={['#ff8fb0', '#ffd45e', '#b495ff'][i]} transform={`rotate(${a})`} />)}
          <circle r="3.5" fill="#fff6c9" />
        </g>
      ))}
      <path d="M46 66h28l-4 8H50z" fill="#c9e3a8" {...S} />
    </>
  )],
  drawing: ['#e6f2ff', '#c8e0ff', (
    <>
      <rect x="28" y="22" width="56" height="46" rx="4" fill="#fff" {...S} />
      <path d="M36 58l12-14 10 10 8-8 10 12" fill="#bfe3c4" {...S} />
      <circle cx="70" cy="34" r="5" fill="#ffd45e" />
      <path d="M90 28l8 34-4 2-8-34z" fill="#ff9d7a" {...S} />
    </>
  )],
  candle: ['#fff3dc', '#ffe1a8', (
    <>
      <path d="M60 18q8 10 0 18q-8-8 0-18z" fill="#ffb347" {...S} />
      <path d="M60 36v4" {...S} />
      <rect x="42" y="40" width="36" height="30" rx="6" fill="#fffaf0" {...S} />
      <path d="M42 48h36" {...S} stroke="#e8c9a0" />
    </>
  )],
  cookie: ['#fbecd9', '#f0d2a8', (
    <>
      <ellipse cx="60" cy="64" rx="38" ry="6" fill="#d9b48c" />
      <circle cx="46" cy="46" r="16" fill="#e0a96a" {...S} />
      <circle cx="74" cy="50" r="14" fill="#e0a96a" {...S} />
      {[[42, 42], [50, 50], [44, 52], [72, 46], [78, 54]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="2.4" fill="#6b4226" />)}
    </>
  )],
  meditation: ['#ece9ff', '#d7d0ff', (
    <>
      <path d="M32 46q28 34 56 0z" fill="#c7a46a" {...S} />
      <ellipse cx="60" cy="46" rx="28" ry="6" fill="#e2c58f" {...S} />
      <path d="M24 30q6-6 12 0M84 30q6-6 12 0M54 22q6-6 12 0" {...S} stroke="#8a74e0" />
      <path d="M62 50l20-26" {...S} strokeWidth={4} stroke="#8b5e3c" />
    </>
  )],
  tea: ['#eef5e6', '#d6e8c4', (
    <>
      <path d="M38 40h44v8a22 22 0 0 1-44 0z" fill="#fff" {...S} />
      <path d="M82 44h6a6 6 0 0 1 0 12h-8" fill="none" {...S} />
      <ellipse cx="60" cy="40" rx="22" ry="4" fill="#9cc56f" {...S} />
      <path d="M52 30q-4-6 0-12M64 30q-4-6 0-12" fill="none" {...S} stroke="#9a9ab0" />
      <ellipse cx="60" cy="74" rx="30" ry="4" fill="#cfe0bb" />
    </>
  )],
  boardgame: ['#e7f6f2', '#c4eadf', (
    <>
      <rect x="26" y="40" width="30" height="30" rx="6" fill="#fff" {...S} transform="rotate(-10 41 55)" />
      {[[34, 50], [44, 58], [40, 46]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3" fill="#3b2f63" />)}
      <path d="M78 24a8 8 0 0 1 8 8q0 6-6 9l4 14H72l4-14q-6-3-6-9a8 8 0 0 1 8-8z" fill="#ff8fb0" {...S} />
      <rect x="66" y="56" width="24" height="8" rx="3" fill="#ff8fb0" {...S} />
    </>
  )],
  karaoke: ['#ffe8f4', '#ffc8e3', (
    <>
      <rect x="50" y="20" width="20" height="30" rx="10" fill="#b495ff" {...S} />
      <path d="M54 30h12M54 38h12" {...S} />
      <path d="M60 50v20M50 70h20" {...S} />
      <path d="M28 32v18M28 50a5 4 0 1 1-1-1M88 26v18M88 44a5 4 0 1 1-1-1" {...S} />
    </>
  )],
  climbing: ['#fff0e3', '#ffd6b5', (
    <>
      <path d="M20 76L44 14h56v62z" fill="#f2c79e" {...S} />
      {[[52, 28, '#ff8fb0'], [72, 22, '#7cc3ff'], [62, 44, '#ffd45e'], [84, 40, '#9be08a'], [56, 62, '#b495ff'], [80, 60, '#ff8fb0']].map(([x, y, c]) => (
        <ellipse key={`${x}${y}`} cx={x as number} cy={y as number} rx="6" ry="4.5" fill={c as string} {...S} strokeWidth={1.8} />
      ))}
    </>
  )],
  bowling: ['#eaf0ff', '#cbd8ff', (
    <>
      <ellipse cx="62" cy="70" rx="42" ry="5" fill="#b3c2f0" />
      {[[82, 20], [72, 26], [92, 26]].map(([x, y]) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <path d="M0 0c4 0 5 4 4 8l-1.5 4c5 4 7 10 6 18c-.5 6-2 10-3 12h-11c-1-2-2.5-6-3-12c-1-8 1-14 6-18l-1.5-4c-1-4 0-8 4-8z" fill="#fff" {...S} />
          <path d="M-3 10h6" fill="none" {...S} stroke="#ff6b8a" />
        </g>
      ))}
      <circle cx="40" cy="56" r="14" fill="#8a7cff" {...S} />
      <circle cx="36" cy="50" r="2.2" fill="#3b2f63" /><circle cx="43" cy="49" r="2.2" fill="#3b2f63" /><circle cx="40" cy="56" r="2.2" fill="#3b2f63" />
      <path d="M31 60q2 4 6 5" fill="none" {...S} stroke="#fff" />
    </>
  )],
  camera: ['#fff0f0', '#ffd0d6', (
    <>
      <g transform="rotate(-8 37 46)">
        <rect x="24" y="14" width="26" height="64" rx="3" fill="#fff" {...S} />
        {['#ffd2e2', '#c9e3ff', '#fff1b8', '#d9c8ff'].map((c, i) => <rect key={c} x="28" y={18 + i * 14} width="18" height="11" rx="1.5" fill={c} {...S} strokeWidth={1.6} />)}
      </g>
      <rect x="70" y="30" width="12" height="7" rx="2" fill="#ffd45e" {...S} />
      <rect x="62" y="36" width="40" height="28" rx="6" fill="#ff9db5" {...S} />
      <circle cx="82" cy="50" r="9" fill="#fff" {...S} />
      <circle cx="82" cy="50" r="4.5" fill="#7cc3ff" />
      <rect x="92" y="40" width="5" height="4" rx="1" fill="#fff6c9" />
    </>
  )],
  park: ['#f1f9e2', '#d2ecae', (
    <>
      <ellipse cx="60" cy="72" rx="46" ry="6" fill="#a9d98a" />
      <rect x="33" y="44" width="6" height="28" rx="2" fill="#a5764f" {...S} />
      <circle cx="36" cy="36" r="14" fill="#8fd16f" {...S} />
      <rect x="85" y="50" width="5" height="22" rx="2" fill="#a5764f" {...S} />
      <circle cx="87.5" cy="44" r="10" fill="#b8e28f" {...S} />
      <path d="M52 53v5M74 53v5M52 63v8M74 63v8" {...S} />
      <rect x="48" y="48" width="30" height="5" rx="2" fill="#e0a96a" {...S} />
      <rect x="48" y="58" width="30" height="5" rx="2" fill="#e0a96a" {...S} />
      <path d="M29 31q3-5 8-6" fill="none" {...S} stroke="#fff" />
    </>
  )],
  library: ['#eef1f8', '#d3dbee', (
    <>
      <rect x="30" y="14" width="60" height="62" rx="4" fill="#d7a878" {...S} />
      <rect x="35" y="19" width="50" height="24" fill="#f4dcc0" />
      <rect x="35" y="48" width="50" height="23" fill="#f4dcc0" />
      {([[38, 24, 7, '#ff8fb0'], [45, 27, 6, '#7cc3ff'], [51, 22, 8, '#ffd45e'], [72, 26, 6, '#9be08a'], [78, 29, 5, '#ff8fb0'],
        [40, 52, 8, '#b495ff'], [48, 55, 6, '#ff9d7a'], [54, 51, 7, '#7cc3ff']] as const).map(([x, y, w, c]) => (
        <rect key={`${x}${y}`} x={x} y={y} width={w} height={(y < 45 ? 43 : 71) - y} rx="1.5" fill={c} {...S} strokeWidth={1.8} />
      ))}
      <rect x="65" y="66" width="18" height="5" rx="1.5" fill="#ffd45e" {...S} strokeWidth={1.8} />
      <rect x="67" y="61" width="14" height="5" rx="1.5" fill="#ff8fb0" {...S} strokeWidth={1.8} />
    </>
  )],
  cafe: ['#f8ede8', '#e9cfc4', (
    <>
      <ellipse cx="60" cy="70" rx="30" ry="6" fill="#fff" {...S} />
      <path d="M76 42h4a7 7 0 0 1 0 14h-4" fill="none" {...S} />
      <path d="M40 36h36v18a14 14 0 0 1-14 14h-8a14 14 0 0 1-14-14z" fill="#ffc9a8" {...S} />
      <ellipse cx="58" cy="36" rx="18" ry="4" fill="#a8704a" {...S} />
      <path d="M58 57c-6-4-7-8-4-10c2-1 4 0 4 2c0-2 2-3 4-2c3 2 2 6-4 10z" fill="#ff8fb0" />
      <path d="M50 28q-4-4 0-8t0-8M58 26q-4-4 0-8t0-8M66 28q-4-4 0-8t0-8" fill="none" {...S} stroke="#9a9ab0" />
    </>
  )],
  gallery: ['#eef5f6', '#cde0e5', (
    <>
      <path d="M44 18h6l16 40H28z" fill="#fff6c9" opacity=".8" />
      <rect x="27" y="26" width="40" height="32" rx="2" fill="#f2c26b" {...S} />
      <rect x="32" y="31" width="30" height="22" fill="#fff" {...S} strokeWidth={1.6} />
      <circle cx="55" cy="37" r="3.5" fill="#ffd45e" />
      <path d="M32 53q8-9 15-4t15-3v7z" fill="#9fd3a8" {...S} strokeWidth={1.6} />
      <path d="M42 11h10l-1.5 7h-7z" fill="#8a74e0" {...S} />
      <rect x="75" y="32" width="18" height="24" rx="2" fill="#b495ff" {...S} />
      <rect x="79" y="36" width="10" height="16" fill="#fff" />
      <circle cx="84" cy="42" r="3" fill="#ff8fb0" />
      <path d="M81 49h6" {...S} strokeWidth={1.6} />
      <path d="M30 64v10M90 64v10" {...S} />
      <path d="M30 66q30 10 60 0" fill="none" {...S} stroke="#e06a7a" />
      <circle cx="30" cy="64" r="2.5" fill="#f2c26b" {...S} strokeWidth={1.8} /><circle cx="90" cy="64" r="2.5" fill="#f2c26b" {...S} strokeWidth={1.8} />
    </>
  )],
};

export default function Art({ category, className = '' }: { category: string; className?: string }) {
  const [bg, bg2, body] = ART[category] ?? ART.book;
  const gid = `g-${category}`;
  return (
    <svg viewBox="0 0 120 90" className={`art ${className}`} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={bg} />
          <stop offset="1" stopColor={bg2} />
        </linearGradient>
      </defs>
      <rect width="120" height="90" fill={`url(#${gid})`} />
      {body}
    </svg>
  );
}
