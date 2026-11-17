import type { Tier } from './api';

// 껍데기 나선 위에 무늬를 하나씩 놓는다 (황금각으로 고르게 퍼지게)
const patternPos = (i: number) => {
  const a = i * 2.39996;
  const r = 10 + ((i * 7) % 5) * 5 + Math.min(i, 12);
  return { x: 118 + Math.cos(a) * Math.min(r, 36), y: 82 + Math.sin(a) * Math.min(r, 36) };
};

function Mark({ tier, x, y }: { tier: Tier; x: number; y: number }) {
  if (tier === 'HOME') return <circle cx={x} cy={y} r="3.2" className="mark" />;
  if (tier === 'NEAR') return <path d={`M${x - 4} ${y}q4 -7 8 0q-4 7 -8 0z`} className="mark" />;
  return (
    <path
      className="mark"
      d={`M${x} ${y - 5}l1.5 3.4 3.7.4-2.8 2.5.8 3.7L${x} ${y + 3.1}l-3.2 1.9.8-3.7-2.8-2.5 3.7-.4z`}
    />
  );
}

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
  const scale = 0.78 + stage * 0.055; // 단계가 오를수록 조금씩 커진다
  return (
    <svg
      viewBox="0 0 220 170"
      width={size}
      height={(size * 170) / 220}
      className={`snail${happy ? ' happy' : ''}`}
      role="img"
      aria-label={`달팽이 느리, ${stage}단계`}
    >
      <ellipse cx="112" cy="156" rx="78" ry="7" className="shadow" />
      <g transform={`translate(110 150) scale(${scale}) translate(-110 -150)`}>
        <g className="breathe">
          {/* 몸 */}
          <path
            className="body"
            d="M30 150c-10 0-14-10-8-18 6-9 18-8 24-20 5-11 2-30 16-36 14-5 24 6 24 20v30h86c12 0 18 8 16 15-2 6-8 9-16 9z"
          />
          {/* 껍데기 */}
          <g className="shell-wrap">
            <circle cx="118" cy="82" r="50" className="shell" />
            <path
              className="spiral"
              d="M118 82c0-7 10-7 10 1 0 13-20 13-20-2 0-20 31-20 31 3 0 28-43 28-43-4 0-36 55-36 55 4"
            />
            {patterns.slice(-40).map((p, i) => (
              <Mark key={i} tier={p.tier} {...patternPos(i)} />
            ))}
          </g>
          {/* 더듬이와 눈 */}
          <path className="stalk" d="M56 80c-2-12-6-22-10-30M70 78c2-12 5-21 10-29" />
          <g className="eyes">
            <circle cx="45" cy="46" r="11" className="eye" />
            <circle cx="81" cy="45" r="11" className="eye" />
            <circle cx="47" cy="47" r="5" className="pupil" />
            <circle cx="83" cy="46" r="5" className="pupil" />
            <circle cx="49" cy="45" r="1.6" fill="#fff" />
            <circle cx="85" cy="44" r="1.6" fill="#fff" />
          </g>
          <path className="mouth" d={happy ? 'M52 100q9 11 18 0' : 'M54 101q7 6 14 0'} />
          {stage >= 2 && (
            <>
              <ellipse cx="46" cy="98" rx="5" ry="3" className="blush" />
              <ellipse cx="76" cy="98" rx="5" ry="3" className="blush" />
            </>
          )}
          {stage >= 3 && <path className="leaf" d="M118 32c-2-14 8-22 20-22-1 13-8 22-20 22zM118 32v-10" />}
          {stage >= 4 && (
            <g className="flower">
              {[0, 72, 144, 216, 288].map((a) => (
                <circle key={a} cx="96" cy="22" r="5" transform={`rotate(${a} 96 30)`} />
              ))}
              <circle cx="96" cy="30" r="4" className="flower-mid" />
            </g>
          )}
        </g>
      </g>
    </svg>
  );
}
