// 홈과 도감에서 같은 컬러 이모티콘을 사용한다. API에 보내는 감정 값은 그대로 둔다.
export const MOOD_ICONS = { healing: '🥹', warmth: '💜', sparkle: '✨', rest: '🌿' };
export const JOURNAL_MOODS = [
  ['힐링', MOOD_ICONS.healing], ['설렘', MOOD_ICONS.warmth],
  ['뿌듯함', MOOD_ICONS.sparkle], ['여유로움', MOOD_ICONS.rest],
] as const;
export const HOME_MOOD_ICONS: Record<string, string> = {
  '지쳤어': MOOD_ICONS.healing, '답답해': MOOD_ICONS.warmth,
  '불안해': MOOD_ICONS.healing, '심심해': MOOD_ICONS.sparkle, '평온해': MOOD_ICONS.rest,
};
export default function MoodLabel({ label, emoji }: { label: string; emoji: string }) {
  return <span className="mood-option-label"><span>{label}</span><span className="ui-emoji" aria-hidden="true">{emoji}</span></span>;
}
