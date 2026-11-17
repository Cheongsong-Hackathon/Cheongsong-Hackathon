// 무드패스 토끼: 사업계획서의 보라색 토끼를 SVG로 그렸다.
const FUR = '#ece4ff';
const LINE = '#7c5ce0';
const INK = '#2a2350';
const PINK = '#ffb8cc';

function Item({ id }: { id: string | null }) {
  if (id === 'ribbon')
    return (
      <g transform="translate(140 66) rotate(18)">
        <path d="M0 0l-17-10v20zM0 0l17-10v20z" fill="#ff8fb3" stroke="#e0628f" strokeWidth="2.5" strokeLinejoin="round" />
        <circle r="5.5" fill="#ff8fb3" stroke="#e0628f" strokeWidth="2.5" />
      </g>
    );
  if (id === 'scarf')
    return (
      <g stroke="#e0a92a" strokeWidth="2.5" strokeLinejoin="round">
        <path d="M54 150q46 22 92 0l2 14q-48 22-96 0z" fill="#ffd45e" />
        <path d="M120 160l6 26 14-4-6-24z" fill="#ffd45e" />
      </g>
    );
  if (id === 'beret')
    return (
      <g stroke="#4c34a8" strokeWidth="2.5" strokeLinejoin="round">
        <ellipse cx="96" cy="74" rx="42" ry="15" fill="#6a4bd8" transform="rotate(-8 96 74)" />
        <path d="M94 59l4-9" strokeLinecap="round" />
      </g>
    );
  return null;
}

export default function Bunny({
  size = 200,
  happy = false,
  item = null,
  stage = 1,
  peek = false,
}: {
  size?: number;
  happy?: boolean;
  item?: string | null;
  stage?: number;
  /** 화면 아래에서 고개만 내민 모습 */
  peek?: boolean;
}) {
  const scale = 0.86 + stage * 0.035;
  return (
    <svg
      viewBox={peek ? '0 0 200 150' : '0 0 200 200'}
      width={size}
      height={peek ? (size * 150) / 200 : size}
      className={`bunny${happy ? ' happy' : ''}`}
      role="img"
      aria-label={happy ? '기뻐하는 무드패스 토끼' : '무드패스 토끼'}
    >
      {!peek && <ellipse cx="100" cy="188" rx="58" ry="7" fill="#7c5ce014" />}
      <g transform={`translate(100 186) scale(${scale}) translate(-100 -186)`}>
        <g className="breathe">
          {/* 귀 */}
          <g className="ears">
            <ellipse cx="74" cy="56" rx="17" ry="44" fill={FUR} stroke={LINE} strokeWidth="5" transform="rotate(-12 74 56)" />
            <ellipse cx="74" cy="60" rx="7.5" ry="30" fill={PINK} transform="rotate(-12 74 60)" />
            <ellipse cx="126" cy="56" rx="17" ry="44" fill={FUR} stroke={LINE} strokeWidth="5" transform="rotate(12 126 56)" />
            <ellipse cx="126" cy="60" rx="7.5" ry="30" fill={PINK} transform="rotate(12 126 60)" />
          </g>
          {/* 얼굴 */}
          <ellipse cx="100" cy="128" rx="64" ry="56" fill={FUR} stroke={LINE} strokeWidth="5" />
          <ellipse cx="70" cy="102" rx="14" ry="8" fill="#fff" opacity=".6" />
          <ellipse cx="64" cy="140" rx="11" ry="6.5" fill={PINK} opacity=".8" />
          <ellipse cx="136" cy="140" rx="11" ry="6.5" fill={PINK} opacity=".8" />
          {happy ? (
            <>
              <path d="M70 126q9-11 18 0M112 126q9-11 18 0" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
              <path d="M91 138q9 14 18 0z" fill="#ff8fa8" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
            </>
          ) : (
            <>
              <g className="eyes">
                <circle cx="79" cy="124" r="6.5" fill={INK} />
                <circle cx="121" cy="124" r="6.5" fill={INK} />
                <circle cx="81" cy="121.5" r="2.2" fill="#fff" />
                <circle cx="123" cy="121.5" r="2.2" fill="#fff" />
              </g>
              <path d="M92 137q4 5 8 0q4 5 8 0" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}
          {/* 앞발 */}
          {!peek && (
            <>
              <ellipse cx="78" cy="180" rx="16" ry="11" fill={FUR} stroke={LINE} strokeWidth="5" />
              <ellipse cx="122" cy="180" rx="16" ry="11" fill={FUR} stroke={LINE} strokeWidth="5" />
            </>
          )}
          <Item id={item} />
        </g>
      </g>
    </svg>
  );
}
