// 시안(2026-11-20)의 추천 흐름: 기분 카드 6개 → 조건(이동 시간·활동 유형·혼자/함께) → 무무 AI 맞춤 추천.
// 홈(추천 3곳), 탐색·내 주변(거리순 목록)이 모두 이 하나를 쓴다. 후보·점수는 대화 추천과 같은 것(allCandidates, rankForPrefs).
// 예산은 받지 않는다: 실시간 가게의 가격을 모르기 때문 (가격은 네이버에서 확인).
import { config } from '../config.js';
import type { LatLng } from '../geo.js';
import { photoForItem } from './googlePhoto.js';
import { allCandidates } from './livePlaces.js';
import { rankForPrefs, spread, type Energy, type Need, type Prefs, type Scored, type Tag } from './match.js';

/** 기분 카드 → 필요·기운. 한마디·칩·작은 제안은 AI 없이 정해 둔 문장 (빠르고 실패하지 않게) */
export const MOODS = {
  tired: { label: '지치고 피곤해', sub: '조용히 쉬고 싶어', need: '쉬기', energy: '낮음', headline: '오늘은 많이 지쳤구나', chip: '지친 기분 회복', suggestion: '30분만 밖에 나가볼까? 짧은 외출도 기분을 바꿔 줄 수 있어.' },
  low: { label: '우울하고 무기력해', sub: '기분을 환기하고 싶어', need: '비우기', energy: '낮음', headline: '마음이 좀 무거운 날이구나', chip: '기분 환기', suggestion: '가까운 데서 바람만 쐬고 와도 충분해.' },
  stressed: { label: '답답하고 스트레스 받아', sub: '신나게 풀고 싶어', need: '풀기', energy: '보통', headline: '오늘 많이 답답했구나', chip: '스트레스 풀기', suggestion: '소리 내거나 몸을 움직이면 조금 시원해질 거야.' },
  bored: { label: '심심하고 지루해', sub: '새로운 경험을 하고 싶어', need: '즐기기', energy: '보통', headline: '오늘 좀 심심했구나', chip: '새로운 재미', suggestion: '안 가 본 곳 하나만 가 볼까?' },
  good: { label: '기분이 좋아', sub: '이 기분을 이어가고 싶어', need: '연결', energy: '높음', headline: '기분 좋은 날이구나!', chip: '좋은 기분 이어가기', suggestion: '좋은 기분일 때 누구랑 같이 가 보는 것도 좋아.' },
  plain: { label: '그냥 평범해', sub: '소소한 변화를 주고 싶어', need: '몰입', energy: '보통', headline: '평범한 하루였구나', chip: '소소한 변화', suggestion: '손으로 뭔가 만들어 보면 하루가 조금 달라져.' },
} satisfies Record<string, { label: string; sub: string; need: Need; energy: Energy; headline: string; chip: string; suggestion: string }>;
export type MoodKey = keyof typeof MOODS;
export const parseMood = (v: unknown): MoodKey | null => (typeof v === 'string' && v in MOODS ? (v as MoodKey) : null);

/** 시안의 활동 유형 */
export const GROUPS = { cafe: '카페', exhibit: '전시/미술관', class: '원데이클래스', popup: '팝업/체험', nature: '산책/자연', etc: '기타' } as const;
export type GroupKey = keyof typeof GROUPS;
const KIND_GROUP: Record<string, GroupKey> = {
  comic: 'cafe', cafe: 'cafe', museum: 'exhibit', gallery: 'exhibit', pottery: 'class',
  photo: 'popup', escape: 'popup', board: 'popup', karaoke: 'popup', bowling: 'popup', climbing: 'popup',
  park: 'nature', flower: 'nature', sauna: 'etc', library: 'etc',
};
const EXP_GROUP: Record<string, GroupKey> = {
  'quiet-cafe': 'cafe', 'mini-pottery': 'class', 'my-scent': 'class', calligraphy: 'class', candle: 'class',
  'mini-bouquet': 'nature', meditation: 'etc', boardgame: 'popup', karaoke: 'popup', climbing: 'popup',
};
/** 예시 매장 체험은 id로, 실시간 가게(live:종류:카카오id)는 종류로 */
export const groupOf = (c: { id: string; live?: boolean }): GroupKey =>
  (c.live ? KIND_GROUP[c.id.split(':')[1] ?? ''] : EXP_GROUP[c.id]) ?? 'etc';
export const parseGroups = (v: unknown): GroupKey[] =>
  typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter((s): s is GroupKey => s in GROUPS) : [];

/** 혼자 / 둘이서 / 여럿이서: 거르지 않고 맞는 특징의 점수만 올린다 */
export const WITH = { solo: '혼자', pair: '둘이서', group: '여럿이서' } as const;
export type WithKey = keyof typeof WITH;
export const parseWith = (v: unknown): WithKey | null => (typeof v === 'string' && v in WITH ? (v as WithKey) : null);
export const withTags = (w: unknown): Tag[] => (w === 'solo' ? ['혼자 가능'] : w === 'pair' || w === 'group' ? ['같이 하기'] : []);

/** 이동 시간 15·30·60분. 그 밖이면 설문 근거 기본값 20분 (docs/설계근거_점검.md). 대중교통은 계산하지 못해 도보 기준 */
export const travelMinutes = (v: unknown) => ([15, 30, 60].includes(Number(v)) ? Number(v) : 20);

export const picksPrefs = (mood: MoodKey | null, w: unknown, walk: number): Prefs => ({
  need: mood ? MOODS[mood].need : null,
  energy: mood ? MOODS[mood].energy : null,
  want: withTags(w),
  avoid: [],
  minutes: Infinity,
  walk,
  budget: Infinity,
});

const TAG_CHIP: [Tag, string][] = [
  ['조용함', '조용한 분위기'], ['몸 쓰기', '몸을 움직이기'], ['소리 내기', '소리 내며 풀기'],
  ['손으로 만들기', '손으로 만들기'], ['가만히 쉬기', '가만히 쉬기'], ['바깥', '바깥 바람'],
];
/** 추천 이유 칩 (많아도 3개): 기분에 맞음 → 이동 시간 → 특징 하나 */
export function reasonChips(s: Scored, mood: MoodKey | null, walk: number, w: unknown): string[] {
  const chips: string[] = [];
  if (mood && s.why.some((x) => x.startsWith(MOODS[mood].need))) chips.push(MOODS[mood].chip);
  chips.push(s.walkMinutes <= walk ? `${walk}분 이내` : `도보 ${s.walkMinutes}분`);
  const feature =
    (w === 'solo' && s.tags.includes('혼자 가능') && '혼자 가기 좋음') ||
    ((w === 'pair' || w === 'group') && s.tags.includes('같이 하기') && '같이 가기 좋음') ||
    TAG_CHIP.find(([t]) => s.tags.includes(t))?.[1];
  if (feature) chips.push(feature);
  return chips.slice(0, 3);
}

export type PicksQuery = { mood: MoodKey | null; groups: GroupKey[]; with: WithKey | null; travel: number; sort: 'score' | 'distance'; limit: number };

export async function picks(pos: LatLng | null, q: PicksQuery) {
  // 이동 시간이 길면 실시간 검색 반경도 넓힌다 (도보 1시간 ≈ 4km, 카카오 최대 20km 안에서 5km로 막음)
  const radius = Math.min(5000, Math.max(config.SEARCH_RADIUS_M, q.travel * config.WALK_M_PER_MIN + 200));
  const cands = (await allCandidates(pos, radius)).filter((c) => !q.groups.length || q.groups.includes(groupOf(c)));
  const { items } = rankForPrefs(cands, picksPrefs(q.mood, q.with, q.travel));
  const ordered = q.sort === 'distance' ? [...items].sort((a, b) => a.distanceM - b.distanceM) : spread(items);
  const top = ordered.slice(0, q.limit);
  const photos = await Promise.all(top.map(photoForItem));
  const m = q.mood ? MOODS[q.mood] : null;
  return {
    mood: q.mood && m ? { key: q.mood, label: m.label } : null,
    headline: m?.headline ?? '근처에서 기분 전환할 거리를 찾아봤어',
    // "AI 분석 결과" 칩: 고른 것 그대로
    chips: [m?.label, `${q.travel}분 이내`, q.with ? WITH[q.with] : null, ...q.groups.map((g) => GROUPS[g])].filter(Boolean) as string[],
    suggestion: m?.suggestion ?? '가까운 데서 잠깐 바람 쐬고 올까?',
    items: top.map(({ why, fit, score, ...c }, i) => ({
      ...c,
      group: groupOf(c),
      groupLabel: GROUPS[groupOf(c)],
      reasonChips: reasonChips({ ...c, why, fit, score }, q.mood, q.travel, q.with),
      photo: photos[i],
    })),
  };
}
