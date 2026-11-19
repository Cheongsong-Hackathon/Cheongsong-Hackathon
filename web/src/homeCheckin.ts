import type { Expression } from './CharacterExpression';

const EMOTIONS = ['지쳤어', '답답해', '불안해', '심심해', '평온해'];
export type SavedCheckin = { emotion: string | null; energy: number; mood: number };
export function checkinStorageKey() {
  try { return `moodpass.checkin.${localStorage.getItem('moodpass-user') ?? 'guest'}`; }
  catch { return 'moodpass.checkin.guest'; }
}
export function readCheckin(key: string, expression: Expression): SavedCheckin {
  const fallback = { emotion: EMOTIONS.includes(expression) ? expression : null, energy: 40, mood: 5 };
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (!value || typeof value !== 'object') return fallback;
    return {
      emotion: EMOTIONS.includes(value.emotion) ? value.emotion : fallback.emotion,
      energy: Number.isFinite(value.energy) ? Math.max(0, Math.min(100, value.energy)) : 40,
      mood: Number.isFinite(value.mood) ? Math.max(1, Math.min(10, value.mood)) : 5,
    };
  } catch { return fallback; }
}
export function saveCheckin(key: string, value: SavedCheckin) {
  try { localStorage.setItem(key, JSON.stringify({ emotion: value.emotion, energy: value.energy, mood: value.mood })); } catch {}
}
