import type { Tier } from './api';

const SHELL = { x: 132, y: 80 };
// 껍데기 위에 무늬를 하나씩 놓는다 (황금각으로 고르게 퍼지게, 얼굴에 가리지 않는 오른쪽 위주)
const patternPos = (i: number) => {
  const a = -1.9 + ((i * 2.39996) % 3.6);
  const r = 16 + ((i * 11) % 26);
  return { x: SHELL.x + Math.cos(a) * r, y: SHELL.y + Math.sin(a) * r };
};

function Mark({ tier, x, y }: { tier: Tier; x: number; y: number }) {
  if (tier === 'HOME') return <circle cx={x} cy={y} r="3.4" className="mark" />;
  if (tier === 'NEAR') return <path d={`M${x} ${y + 3.6}c-7-4.6-4-9.6 0-6 4-3.600 7 1.400 0 6z`} className="mark" />;
  return (
    <path className="mark" d={`M${x} ${y - 5}l1.500 3.400 3.700.4-2.800 2.500.8 3.700L${x} ${y + 3.1}l-3.200 1.900.8-3.700-2.800-2.500 3.700-.4z`} />
  );
}

const BODY = '#ffe6c2';
const LINE = '#d9a05b';
const INK = '#4a3b2a';

/** 달팽이 느리. 얼굴이 크고 눈이 얼굴에 붙은 통통한 형태. */
export default function Snail({
  stage = 1,
  patterns = [],
  size = 220,
  happy = false,
}: {
  stage?: number;
  patterns?: { tier: Tier }[];
  size?: number;
  happy?: boolean;
}) {
  const scale = 0.8 + stage * 0.05; // 단계가 오를수록 조금씩 커진다
  return (
    <svg
      viewBox="0 0 220 170"
      width={size}
      height={(size * 170) / 220}
      className={`snail${happy ? ' happy' : ''}`}
      role="img"
      aria-label={`달팽이 느리, ${stage}단계`}
    >
      <ellipse cx="112" cy="157" rx="80" ry="7" className="shadow" />
      <g transform={`translate(110 152) scale(${scale}) translate(-110 -152)`}>
        <g className="breathe">
          {/* 꼬리와 발 */}
          <path
            d="M46 152c-12 0-16-9-12-16h150c14 0 22 4 20 10-1 4-6 6-14 6z"
            fill={BODY}
            stroke={LINE}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* 껍데기 */}
          <circle cx={SHELL.x} cy={SHELL.y} r="56" fill="#c5d79a" stroke="#7d9148" strokeWidth="3.5" />
          <circle cx={SHELL.x - 18} cy={SHELL.y - 24} r="13" fill="#fff" opacity=".28" />
          <path
            d="M132 80c0-8 12-8 12 1 0 15-24 15-24-2 0-24 37-24 37 3 0 33-51 33-51-4"
            fill="none"
            stroke="#7d9148"
            strokeWidth="4.5"
            strokeLinecap="round"
            opacity=".6"
          />
          {patterns.slice(-40).map((p, i) => (
            <Mark key={i} tier={p.tier} {...patternPos(i)} />
          ))}
          {stage >= 3 && (
            <path d="M132 24c-3-15 8-23 21-23-1 14-9 23-21 23zM132 26v-9" fill="#9cc25a" stroke="#6a8a34" strokeWidth="2.5" strokeLinejoin="round" />
          )}
          {stage >= 4 && (
            <g>
              {[0, 72, 144, 216, 288].map((a) => (
                <circle key={a} cx="168" cy="26" r="6" fill="#fff" stroke="#f3a6b5" strokeWidth="1.5" transform={`rotate(${a} 168 35)`} />
              ))}
              <circle cx="168" cy="35" r="4.5" fill="#f7cf5c" />
            </g>
          )}
          {/* 더듬이 */}
          <path d="M50 76l-7-20M82 74l6-20" stroke={LINE} strokeWidth="6" strokeLinecap="round" />
          <circle cx="42" cy="53" r="7.5" fill={BODY} stroke={LINE} strokeWidth="3" />
          <circle cx="89" cy="51" r="7.5" fill={BODY} stroke={LINE} strokeWidth="3" />
          {stage >= 2 && (
            <path d="M66 66c-1-9 4-14 12-14 0 8-5 13-12 14zM66 66c-5-5-11-5-15-2 4 4 10 5 15 2z" fill="#9cc25a" stroke="#6a8a34" strokeWidth="2" strokeLinejoin="round" />
          )}
          {/* 얼굴 */}
          <circle cx="66" cy="108" r="44" fill={BODY} stroke={LINE} strokeWidth="3.5" />
          <ellipse cx="38" cy="122" rx="9" ry="5.500" fill="#ffb3a7" opacity=".75" />
          <ellipse cx="96" cy="122" rx="9" ry="5.500" fill="#ffb3a7" opacity=".75" />
          {happy ? (
            <>
              <path d="M42 110q8-10 16 0M76 110q8-10 16 0" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
              <path d="M59 119q8 12 16 0z" fill="#e8786f" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
            </>
          ) : (
            <>
              <g className="eyes">
                <ellipse cx="50" cy="108" rx="7.500" ry="9.500" fill={INK} />
                <ellipse cx="84" cy="108" rx="7.500" ry="9.500" fill={INK} />
                <circle cx="52.500" cy="104" r="3.200" fill="#fff" />
                <circle cx="86.500" cy="104" r="3.200" fill="#fff" />
                <circle cx="47.500" cy="112" r="1.500" fill="#fff" />
                <circle cx="81.500" cy="112" r="1.500" fill="#fff" />
              </g>
              <path d="M61 119q3 4 6 0q3 4 6 0" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}
        </g>
      </g>
    </svg>
  );
}
