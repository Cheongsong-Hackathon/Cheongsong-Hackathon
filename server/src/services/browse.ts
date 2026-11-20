// 둘러보기: 대화 없이 "어떤 기분 전환이 필요한지"만 골라 근처 실제 가게를 본다.
// 근거: 설문(86명) 가장 끌리는 기능 1위 "시간·거리·예산에 맞는 주변 장소 탐색" 74%, 자유 응답 "카테고리별로 먼저 보여 주기",
// "AI가 못 알아들으면 답답하다". 후보·점수는 대화 추천과 같은 것을 쓴다 (allCandidates, rankForPrefs).
import type { LatLng } from '../geo.js';
import { config } from '../config.js';
import { photoFirst, photoForItem, photoPool } from './googlePhoto.js';
import { allCandidates } from './livePlaces.js';
import { NEEDS, rankForPrefs, spread, type Need, type Prefs } from './match.js';

export const BROWSE_SHOW = 6; // 한 화면에 보여 줄 곳 (사진도 이만큼만 받는다)

export const parseNeed = (v: unknown): Need | null => ((NEEDS as readonly string[]).includes(String(v)) ? (v as Need) : null);

/** 기운·시간·예산은 모르니 거르지 않는다. 도보는 대화와 같은 기본 20분 (맞는 게 없으면 넓힘) */
export const browsePrefs = (need: Need | null): Prefs => ({ need, energy: null, want: [], avoid: [], minutes: Infinity, walk: 20, budget: Infinity });

export async function browse(pos: LatLng | null, need: Need | null) {
  const { items } = rankForPrefs(await allCandidates(pos), browsePrefs(need));
  const pool = spread(items).slice(0, photoPool(BROWSE_SHOW));
  const photos = await Promise.all(pool.map(photoForItem));
  return photoFirst(pool.map(({ why, fit, score, ...c }) => c), photos, BROWSE_SHOW, config.demoPin);
}
