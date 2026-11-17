// 02 조건 확인 → 03 경험 추천: 체험 DB를 규칙으로 거르고, AI는 3개를 고르고 "지금 적합한 이유"만 쓴다.
import { z } from 'zod';
import { config } from '../config.js';
import { query, toId } from '../db.js';
import { validLatLng, type LatLng } from '../geo.js';
import { BUNNY_PROMPT, callJson, defaultClient } from './llm.js';
import { placeService, type Place } from './places.js';
import { isSafeMode, SAFETY_BLOCK } from './safety.js';

export type Experience = {
  id: string;
  title: string;
  category: string;
  minutes: number;
  price: number;
  moods: string[];
  energyNeed: number;
  description: string;
  placeId: string;
  slots: string[];
};
export type Candidate = Experience & {
  placeName: string;
  lat: number;
  lng: number;
  distanceM: number;
  walkMinutes: number;
  availableSlots: string[];
};
export type Cond = { minutes: number; walk: number; budget: number; energy: number; emotion: string | null };
export type Item = Candidate & { reason: string };

export const walkMinutes = (m: number) => Math.max(1, Math.ceil(m / config.WALK_M_PER_MIN));
export const addMinutes = (hhmm: string, mins: number) => {
  const t = Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5)) + mins;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};
export const nowHHMM = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' });

/** 지금 출발해서 갈 수 있는 오늘 시간대. now가 null이면(체험 모드) 전부. */
export const availableSlots = (slots: string[], now: string | null, walk: number) =>
  now === null ? slots : slots.filter((s) => s >= addMinutes(now, walk));

/** 장소와 체험을 묶고 거리·도보 분·남은 시간대를 계산한다. */
export function toCandidates(exps: Experience[], places: Place[], now: string | null): Candidate[] {
  const byId = new Map(places.map((p) => [p.id, p]));
  return exps.flatMap((e) => {
    const p = byId.get(e.placeId);
    if (!p || p.distanceM == null) return [];
    const walk = walkMinutes(p.distanceM);
    return [{ ...e, placeName: p.name, lat: p.lat, lng: p.lng, distanceM: p.distanceM, walkMinutes: walk, availableSlots: availableSlots(e.slots, now, walk) }];
  });
}

/**
 * 규칙 필터. 3개가 안 되면 한 단계씩 넓힌다.
 * 0단계: 조건 그대로 / 1단계: 시간 +30분, 거리 +10분, 예산 +1만원, 에너지 +20% / 2단계: 가까운 순 전부
 * 정렬: 고른 감정에 어울리는 것 먼저, 그다음 가까운 순.
 */
export function filterExperiences(cands: Candidate[], c: Cond): { items: Candidate[]; widened: boolean } {
  const open = cands.filter((x) => x.availableSlots.length > 0);
  const pool = open.length ? open : cands;
  const fits = (x: Candidate, k: number) =>
    x.minutes <= c.minutes + 30 * k &&
    x.walkMinutes <= c.walk + 10 * k &&
    x.price <= c.budget + 10000 * k &&
    x.energyNeed <= c.energy + 20 * k;
  const sort = (xs: Candidate[]) =>
    [...xs].sort(
      (a, b) =>
        Number(!!c.emotion && b.moods.includes(c.emotion)) - Number(!!c.emotion && a.moods.includes(c.emotion)) ||
        a.walkMinutes - b.walkMinutes,
    );
  for (const k of [0, 1]) {
    const items = pool.filter((x) => fits(x, k));
    if (items.length >= config.RECOMMEND_COUNT) return { items: sort(items), widened: k > 0 };
  }
  return { items: sort(pool), widened: true };
}

const DEFAULT_REASON = '지금 조건에 맞고 가까워서 골라 봤어.';

/** LLM이 고른 id 중 후보에 있는 것만 남기고(지어낸 체험 차단), 모자라면 후보 순서대로 채운다. */
export function finalizePicks(cands: Candidate[], picks: { id: string; reason: string }[] | null, exclude: string[] = []): Item[] {
  // 안 본 것을 먼저, 모자라면 이미 본 것으로 채운다
  const pool = [...cands.filter((c) => !exclude.includes(c.id)), ...cands.filter((c) => exclude.includes(c.id))];
  const byId = new Map(pool.map((c) => [c.id, c]));
  const chosen = new Map<string, Item>();
  for (const p of picks ?? []) {
    const c = byId.get(p.id);
    if (c && chosen.size < config.RECOMMEND_COUNT) chosen.set(c.id, { ...c, reason: p.reason.trim() || DEFAULT_REASON });
  }
  for (const c of pool) {
    if (chosen.size >= config.RECOMMEND_COUNT) break;
    if (!chosen.has(c.id)) chosen.set(c.id, { ...c, reason: DEFAULT_REASON });
  }
  return [...chosen.values()];
}

const PickOut = z.object({ picks: z.array(z.object({ id: z.string(), reason: z.string().catch('') })) });
const PICK_FORMAT = `
지금은 친구에게 오늘 할 만한 체험을 골라 주는 차례야. 후보 목록에 있는 것 중에서만 3개를 골라.
후보에 없는 id를 지어내면 안 돼. 이유는 "지금 친구 상태에 왜 맞는지"를 토끼 말투로 한 줄. 가격과 시간 숫자는 쓰지 마.
아래 JSON 하나만 출력해. 다른 글은 쓰지 마.
{"picks":[{"id":"후보의 id","reason":"한 줄 이유"}]}`;

const pick = <T>(v: unknown, allowed: readonly T[], d: T) => (allowed.includes(v as T) ? (v as T) : d);

export async function loadExperiences(): Promise<Experience[]> {
  return query<Experience>(
    `SELECT e.id, e.title, e.category, e.minutes, e.price, e.moods, e.energy_need AS "energyNeed", e.description,
            e.place_id AS "placeId",
            COALESCE(array_agg(s.start_time ORDER BY s.start_time) FILTER (WHERE s.start_time IS NOT NULL), '{}') AS slots
     FROM experiences e LEFT JOIN experience_slots s ON s.experience_id = e.id GROUP BY e.id ORDER BY e.id`,
  );
}

/** 위치가 없거나(동의 안 함), 체험 모드에서 주변에 매장이 없으면 DEMO_CENTER 기준으로 찾는다. */
export async function nearbyCandidates(pos: LatLng | null) {
  const now = config.demoMode ? null : nowHHMM();
  let center = pos ?? config.demoCenter;
  let places = await placeService.openNearby(center);
  if (!places.length && pos && config.demoMode) {
    center = config.demoCenter;
    places = await placeService.openNearby(center);
  }
  const source = pos && center === pos ? 'here' : 'demo';
  return { cands: toCandidates(await loadExperiences(), places, now), source };
}

export async function recommend(body: any, client = defaultClient) {
  if (await isSafeMode()) return SAFETY_BLOCK;
  const [ck] = await query(
    `SELECT id, text, emotion, energy, mood_score AS mood FROM checkins WHERE id = $1 AND user_id = $2`,
    [toId(body?.checkinId), config.USER_ID],
  );
  if (!ck) return { status: 409, body: { needCheckin: true, error: '먼저 오늘 마음을 알려 줘.' } };

  const cond: Cond = {
    minutes: pick(body?.minutes, [30, 60, 90], 60),
    walk: pick(body?.walk, [10, 20, 30], 20),
    budget: pick(body?.budget, [10000, 20000, 30000], 20000),
    energy: ck.energy ?? 50,
    emotion: ck.emotion,
  };
  await query(`UPDATE checkins SET minutes = $2, walk_minutes = $3, budget = $4 WHERE id = $1`, [ck.id, cond.minutes, cond.walk, cond.budget]);

  const { cands, source } = await nearbyCandidates(validLatLng(body?.lat, body?.lng));
  const { items, widened } = filterExperiences(cands, cond);
  const exclude: string[] = Array.isArray(body?.exclude) ? body.exclude.filter((x: unknown) => typeof x === 'string').slice(0, 50) : [];

  const state = { 한줄: ck.text, 감정: ck.emotion, 에너지: `${cond.energy}%`, 기분점수: ck.mood, 쓸수있는시간: `${cond.minutes}분`, 도보: `${cond.walk}분 이내`, 예산: `${cond.budget}원` };
  const list = items
    .filter((c) => !exclude.includes(c.id))
    .slice(0, 8)
    .map((c) => ({ id: c.id, title: c.title, minutes: c.minutes, walkMinutes: c.walkMinutes, price: c.price, 어울리는감정: c.moods, 설명: c.description }));
  const out = list.length ? await callJson(client, BUNNY_PROMPT + PICK_FORMAT, `친구 상태: ${JSON.stringify(state)}\n후보: ${JSON.stringify(list)}`, PickOut) : null;

  // 기다리는 사이 안전 모드가 됐으면 추천을 내보내지 않는다
  if (await isSafeMode()) return SAFETY_BLOCK;
  return {
    status: 200,
    body: { items: finalizePicks(items, out?.picks ?? null, exclude), widened, locationSource: source, ...(out ? {} : { fallback: true }) },
  };
}
