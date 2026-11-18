import { useAccessoryColors } from './AccessoryColors';
/** Clothing thumbnails intentionally show the item alone, never another mascot. */
export default function ClothingIcon({ id, color }: { id: string; color?: string }) {
  const { colors } = useAccessoryColors();
  const ink = '#8d7aa4';
  const fill = color ?? (id in colors ? colors[id as keyof typeof colors] : id === 'cape' ? '#b5d9cc' : '#b59bd8');
  return <svg viewBox="0 0 80 70" className="mumu-clothing-icon" aria-hidden="true" fill={fill} stroke={ink} strokeWidth="2.3" strokeLinejoin="round" strokeLinecap="round">
    {id === 'vest' && <><path d="M21 11l10-4 9 13 9-13 10 4 9 14-13 8-1 27H26l-1-27-13-8Z" /><path d="M40 22v36M30 47h6m8 0h6" fill="none" /><path d="M26 55h28" stroke="#fff7" /></>}
    {id === 'cape' && <><path d="M30 12q10 6 20 0L70 53Q40 68 10 53Z" /><path d="M29 13q-2 13 11 14q13-1 11-14M40 27v33" fill="none" /><circle cx="40" cy="31" r="2" fill="#fff" /></>}
    {id === 'glasses' && <g fill="none" stroke={fill} strokeWidth="4"><circle cx="24" cy="35" r="16" /><circle cx="59" cy="35" r="16" /><path d="M40 32h3M8 30L3 26m72 4 3-4" /></g>}
    {id === 'ribbon' && <><path d="M39 34L13 15q-8 18 0 38Zm2 0 26-19q8 18 0 38Z" /><circle cx="40" cy="34" r="8" /><path d="M19 27l11 6m30-6-11 6" fill="none" stroke="#fff9" /></>}
    {id === 'scarf' && <><path d="M46 34l7 30 15-6-10-29Z" /><path d="M11 17q29 12 57 0v22q-28 13-57 0Z" /><path d="M17 32q23 7 45 0m-8 24 10-3" fill="none" stroke="#fff8" /></>}
    {id === 'beret' && <><ellipse cx="40" cy="34" rx="31" ry="16" transform="rotate(-8 40 34)" /><path d="M38 18l4-9" fill="none" /><path d="M18 31q9-7 20-7" fill="none" stroke="#fff8" strokeWidth="3" /></>}
  </svg>;
}
