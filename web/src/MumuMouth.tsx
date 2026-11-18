import type { Expression } from './CharacterExpression';

/** Every emotion has its own mouth, including the egg form beside its pacifier. */
export default function MumuMouth({ level, y, mood, smiling }: { level: number; y: number; mood: Expression; smiling: boolean }) {
  const x = level === 1 ? 115 : 101;
  const mouthY = y + (level === 1 ? 12 : 18);
  return <g data-mouth={smiling ? '기뻐' : mood} transform={`translate(${x} ${mouthY})`}>
    {level >= 3 && <path d="M-5-6q5-4 10 0L0-2Z" stroke="none" />}
    {smiling ? <><path d="M-8-1Q0 5 8-1Q7 10 0 10Q-7 10-8-1Z" /><path d="M-4 7q4-3 8 0" stroke="#e9a9b7" strokeWidth="2.5" /></>
      : mood === '불안해' ? <ellipse cx="0" cy="3" rx="3.5" ry="5" fill="none" />
      : mood === '답답해' ? <path d="M-8 3q3-5 5 0t5 0t5 0" fill="none" />
      : mood === '지쳤어' ? <path d="M-7 5q7-7 14 0" fill="none" />
      : mood === '심심해' ? <path d="M-6 2h12" fill="none" />
      : mood === '평온해' ? <path d="M-7 0q7 8 14 0" fill="none" />
      : level === 1 ? <path d="M-3 0q3 4 6 0" fill="none" />
      : level === 2 ? <path d="M-7-2q7 6 14 0q0 10-7 10q-7 0-7-10Z" stroke="none" />
      : <path d="M-9-3q4 7 9 0q5 7 9 0" fill="none" />}
  </g>;
}
