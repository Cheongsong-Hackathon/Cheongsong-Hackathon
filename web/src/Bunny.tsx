import { tint, useAccessoryColors } from './AccessoryColors';
import { useCharacterExpression, type Expression } from './CharacterExpression';
import { useOutfit } from './Outfit';

// 무드패스 토끼: 사업계획서의 보라색 토끼를 SVG로 그렸다.
const FUR = '#ece4ff';
const LINE = '#7c5ce0';
const INK = '#2a2350';
const PINK = '#ffb8cc';
const STAGES = [
  { fur: FUR, name: '작은 시작' },
  { fur: '#e6dcff', name: '조금씩 자라는 중' },
  { fur: '#ded0ff', name: '반짝이는 한 걸음' },
  { fur: '#d5c3ff', name: '활짝 자란 토끼' },
];
const ITEM_NAMES: Record<string, string> = { ribbon: '리본', scarf: '목도리', beret: '베레모' };

function Sparkle({ x, y, size = 6 }: { x: number; y: number; size?: number }) {
  return <path d={`M${x} ${y - size}q0 ${size} ${size} ${size}q-${size} 0 -${size} ${size}q0 -${size} -${size} -${size}q${size} 0 ${size} -${size}`} fill="#e7b550" />;
}

function Item({ id }: { id: string | null }) {
  const { colors } = useAccessoryColors();
  const ribbon = colors.ribbon;
  const scarf = colors.scarf;
  const beret = colors.beret;
  if (id === 'ribbon')
    return (
      <g transform="translate(146 94) rotate(18) scale(1.5)">
        <path d="M0 0l-17-10v20zM0 0l17-10v20z" fill={ribbon} stroke={tint(ribbon, -.25)} strokeWidth="2.5" strokeLinejoin="round" />
        <circle r="5.5" fill={ribbon} stroke={tint(ribbon, -.25)} strokeWidth="2.5" />
        <path d="M-12-4l6 3M12-4L6-1" stroke={tint(ribbon, .65)} strokeWidth="2" strokeLinecap="round" />
      </g>
    );
  if (id === 'scarf')
    return (
      <g stroke={tint(scarf, -.28)} strokeWidth="3" strokeLinejoin="round">
        <path d="M114 174l8 49q12 6 23-2l-10-47z" fill={scarf} />
        <path d="M53 146q47 10 94 0l2 37q-49 22-98 0z" fill={scarf} />
        <path d="M57 167q43 15 86 0M58 177q28 10 54 7M124 211l16-2" fill="none" stroke={tint(scarf, .5)} strokeLinecap="round" />
        <path d="M125 221v6m7-6v7m7-8v6" fill="none" strokeLinecap="round" />
      </g>
    );
  if (id === 'beret')
    return (
      <g stroke={tint(beret, -.28)} strokeWidth="2.5" strokeLinejoin="round">
        <ellipse cx="96" cy="74" rx="42" ry="15" fill={beret} transform="rotate(-8 96 74)" />
        <path d="M94 59l4-9" strokeLinecap="round" />
        <path d="M66 69q10-6 22-6" fill="none" stroke={tint(beret, .5)} strokeWidth="3" strokeLinecap="round" />
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
  faceOnly = false,
  expression: expressionOverride,
  layerScarf = false,
}: {
  size?: number;
  happy?: boolean;
  item?: string | null;
  stage?: number;
  /** 화면 아래에서 고개만 내민 모습 */
  peek?: boolean;
  /** 귀와 턱까지 얼굴 전체를 보여 주는 대화용 초상 */
  faceOnly?: boolean;
  expression?: Expression;
  layerScarf?: boolean;
}) {
  const outfit = useOutfit();
  const { expression: selectedExpression } = useCharacterExpression();
  const expression = expressionOverride ?? selectedExpression;
  const smiling = happy || expression === '기뻐';
  const level = Math.max(1, Math.min(4, Math.round(stage) || 1));
  const appearance = STAGES[level - 1];
  const fur = appearance.fur;
  const scale = 0.86 + level * 0.035;
  const headOnly = peek || faceOnly;
  return (
    <svg
      viewBox={faceOnly ? '0 0 200 200' : peek ? '0 0 200 150' : '-20 0 240 260'}
      width={size}
      height={peek && !faceOnly ? (size * 150) / 200 : size}
      className={`bunny${smiling ? ' happy' : ''}`}
      role="img"
      aria-label={`무드패스 토끼 · ${smiling ? '기뻐' : expression} 표정 · ${level}단계 · ${appearance.name}${item && ITEM_NAMES[item] ? ` · ${ITEM_NAMES[item]} 착용` : ''}`}
    >
      {!headOnly && <ellipse cx="100" cy="249" rx="65" ry="8" fill="#7c5ce014" />}
      {!headOnly && level >= 2 && <g aria-hidden="true">
        <Sparkle x={24} y={105} size={level >= 3 ? 7 : 5} />
        {level >= 3 && <Sparkle x={176} y={88} size={7} />}
        {level >= 4 && <><Sparkle x={173} y={151} size={5} /><circle cx="28" cy="151" r="3" fill={PINK} /></>}
      </g>}
      <g transform={`translate(100 186) scale(${scale}) translate(-100 -186)`}>
        <g className="breathe">
          {!headOnly && <>
            {/* 통통한 몸통과 옆으로 모은 뒷다리: 앉아 있는 자세 */}
            <circle cx="144" cy="216" r="16" fill={fur} stroke={LINE} strokeWidth="5" />
            <ellipse cx="100" cy="207" rx="43" ry="37" fill={fur} stroke={LINE} strokeWidth="5" />
            <ellipse cx="64" cy="226" rx="22" ry="20" fill={fur} stroke={LINE} strokeWidth="5" />
            <ellipse cx="136" cy="226" rx="22" ry="20" fill={fur} stroke={LINE} strokeWidth="5" />
          </>}
          {/* 귀 */}
          <g className="ears">
            <ellipse cx="74" cy="56" rx="17" ry="44" fill={fur} stroke={LINE} strokeWidth="5" transform="rotate(-12 74 56)" />
            <ellipse cx="74" cy="60" rx="7.5" ry="30" fill={PINK} transform="rotate(-12 74 60)" />
            <ellipse cx="126" cy="56" rx="17" ry="44" fill={fur} stroke={LINE} strokeWidth="5" transform="rotate(12 126 56)" />
            <ellipse cx="126" cy="60" rx="7.5" ry="30" fill={PINK} transform="rotate(12 126 60)" />
          </g>
          {/* 얼굴 */}
          <ellipse cx="100" cy="128" rx="64" ry="56" fill={fur} stroke={LINE} strokeWidth="5" />
          <ellipse cx="70" cy="102" rx="14" ry="8" fill="#fff" opacity=".6" />
          <ellipse cx="64" cy="140" rx="11" ry="6.5" fill={PINK} opacity=".8" />
          <ellipse cx="136" cy="140" rx="11" ry="6.5" fill={PINK} opacity=".8" />
          {smiling ? (
            <>
              <path d="M70 126q9-11 18 0M112 126q9-11 18 0" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
              <path d="M91 138q9 14 18 0z" fill="#ff8fa8" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
            </>
          ) : (
            <>
              <g className="eyes">
                {expression === '지쳤어' || expression === '평온해' ? (
                  <path d={expression === '지쳤어' ? 'M69 124q10 6 20 0M111 124q10 6 20 0' : 'M69 125q10-10 20 0M111 125q10-10 20 0'} fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
                ) : <>
                <circle cx="79" cy="124" r="9.75" fill={INK} />
                <circle cx="121" cy="124" r="9.75" fill={INK} />
                <circle cx={expression === '심심해' ? 76 : 82} cy="120.25" r="3.3" fill="#fff" />
                <circle cx={expression === '심심해' ? 118 : 124} cy="120.25" r="3.3" fill="#fff" />
                </>}
              </g>
              {expression === '답답해' && <path d="M68 106l19 5m26 0l19-5" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />}
              {expression === '불안해' && <path d="M68 110q11 0 18-7m28 0q7 7 18 7" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />}
              <path d={expression === '지쳤어' ? 'M94 142h12' : expression === '답답해' ? 'M93 143q7-6 14 0' : expression === '불안해' ? 'M92 141q4-4 8 0t8 0' : expression === '심심해' ? 'M96 138q-4 5 0 7q5 1 6-3q0-4-6-4' : expression === '평온해' ? 'M92 138q8 9 16 0' : 'M92 137q4 5 8 0q4 5 8 0'} fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}
          {/* 배 앞에 모은 손과 바닥에 나란히 놓인 발 */}
          {!headOnly && (
            <>
              <ellipse cx="78" cy="203" rx="12" ry="21" fill={fur} stroke={LINE} strokeWidth="4" transform="rotate(-22 78 203)" />
              <ellipse cx="122" cy="203" rx="12" ry="21" fill={fur} stroke={LINE} strokeWidth="4" transform="rotate(22 122 203)" />
              <ellipse cx="67" cy="239" rx="23" ry="13" fill={fur} stroke={LINE} strokeWidth="5" />
              <ellipse cx="133" cy="239" rx="23" ry="13" fill={fur} stroke={LINE} strokeWidth="5" />
              <path d="M59 238v5m8-6v6m66-6v6m8-5v5" stroke={LINE} strokeWidth="2.5" strokeLinecap="round" opacity=".55" />
            </>
          )}
          {layerScarf ? <>
            {!headOnly && outfit.scarf && <Item id="scarf" />}
            {item !== 'scarf' && <Item id={item} />}
          </> : (!headOnly || item !== 'scarf') && <Item id={item} />}
        </g>
      </g>
    </svg>
  );
}
