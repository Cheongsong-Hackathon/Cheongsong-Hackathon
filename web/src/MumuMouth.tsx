import type { Expression } from './CharacterExpression';

/** 현재 1~6단계의 감정별 입 모양. 삭제된 알 단계는 포함하지 않습니다. */
export default function MumuMouth({ level, y, mood, smiling }: { level: number; y: number; mood: Expression; smiling: boolean }) {
  // 1단계는 감정과 관계없이 입을 그리지 않습니다.
  if (level === 1) return null;

  const x = 101;
  const mouthY = y + 18;
  return <g data-mouth={smiling ? '기뻐' : mood} transform={`translate(${x} ${mouthY})`}>
    {level >= 2 && <path d="M-5-6q5-4 10 0L0-2Z" stroke="none" />}
    {smiling ? <><path d="M-8-1Q0 5 8-1Q7 10 0 10Q-7 10-8-1Z" /><path d="M-4 7q4-3 8 0" stroke="#e9a9b7" strokeWidth="2.5" /></>
      : mood === '불안해' ? <ellipse cx="0" cy="3" rx="3.5" ry="5" fill="none" />
      : mood === '답답해' ? <path d="M-8 3q3-5 5 0t5 0t5 0" fill="none" />
      : mood === '지쳤어' ? <path d="M-7 5q7-7 14 0" fill="none" />
      : mood === '심심해' ? <path d="M-6 2h12" fill="none" />
      : mood === '평온해' ? <path d="M-7 0q7 8 14 0" fill="none" />
  
      : <path d="M-9-3q4 7 9 0q5 7 9 0" fill="none" />}
  </g>;
}
