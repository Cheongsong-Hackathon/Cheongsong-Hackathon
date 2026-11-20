// 02 조건 확인 → 03 경험 추천: 체험 DB를 규칙으로 거르고, AI는 어울리는 순서와 "지금 적합한 이유"만 정한다.
import { z } from 'zod';
import { config } from '../config.js';
import { query, toId } from '../db.js';
import { searchPos, validLatLng, walkMinutes, type LatLng } from '../geo.js';
import { freePlaces, naverMapUrl, pickFree } from './kakao.js';
import { hasPhoto } from './googlePhoto.js';
import { BUNNY_PROMPT, callJson, defaultClient } from './llm.js';
import { memoryContext } from './memory.js';

export { walkMinutes };
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
  tags?: string[]; // 특징 태그 (match.ts의 TAGS). DB에서 읽을 때는 항상 있음
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
  mapUrl: string; // 예약하기: 네이버 지도에서 매장을 열어 거기서 예약 (우리 앱은 예약을 확정하지 않음)
  hasPhoto: boolean; // 실제 사진(구글)이 있는 매장: 화면이 그림 대신 사진 자리를 비워 두고 기다림
  live?: boolean; // 실시간 검색(카카오)으로 찾은 가게: 체험 DB에 없고 시간대·가격을 모름 (livePlaces.ts)
};
export type Cond = { minutes: number; walk: number; budget: number; energy: number; emotion: string | null };
export type Item = Candidate & { reason: string; surprise?: boolean };

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
    return [{ ...e, placeName: p.name, lat: p.lat, lng: p.lng, distanceM: p.distanceM, walkMinutes: walk, availableSlots: availableSlots(e.slots, now, walk), mapUrl: naverMapUrl(p.name), hasPhoto: hasPhoto(e.placeId) }];
  });
}

/**
 * 규칙 필터. 맞는 곳이 RECOMMEND_MIN보다 적으면 한 단계씩 넓힌다.
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
    if (items.length >= config.RECOMMEND_MIN) return { items: sort(items), widened: k > 0 };
  }
  return { items: sort(pool), widened: true };
}

const DEFAULT_REASON = '지금 조건에 맞고 가까워서 골라 봤어.';
// LLM이 없거나 이유를 비워 보냈을 때 쓰는 체험별 기본 이유
const REASON_BY_CATEGORY: Record<string, string> = {
  book: '말 없이 머물러도 되는 곳이라 지친 날에 딱이야.',
  cafe: '따뜻한 거 한 잔 앞에 두고 말 없이 머물러도 돼.',
  pottery: '손으로 흙을 만지다 보면 머릿속이 잠깐 조용해져.',
  perfume: '좋아하는 향을 고르다 보면 마음이 조금 풀릴 거야.',
  flower: '꽃을 고르는 30분이 생각보다 기분을 바꿔 줘.',
  drawing: '잘 그릴 필요 없어. 선만 그어도 괜찮아.',
  candle: '천천히 녹이고 기다리는 시간이 마음을 가라앉혀 줘.',
  cookie: '따뜻한 걸 만들어서 들고 오는 기분, 좋잖아.',
  meditation: '누워서 소리만 들으면 돼. 기운이 없어도 괜찮아.',
  tea: '차 한 잔 우리는 동안은 아무것도 안 해도 돼.',
  boardgame: '머리를 다른 데 쓰면 답답함이 좀 풀릴 거야.',
  karaoke: '소리 내서 부르고 나면 속이 시원해질 거야.',
  climbing: '몸을 쓰면 꽉 막힌 게 조금 빠져나가.',
};
const reasonOf = (c: Candidate) => REASON_BY_CATEGORY[c.category] ?? DEFAULT_REASON;

/**
 * "평소와 다른 하나": 맞춤 추천만 계속하면 아는 것 안에 갇히므로, 일부러 다른 것을 하나 섞는다 (탐색).
 * 오늘 감정에 어울리는 체험이 아니고 다녀온 적 없는 종류 중에서 무작위. 예산·시간은 지키고 거리·에너지만 조금 느슨하게.
 * 많이 지친 날(에너지 LOW_ENERGY 이하)에는 넣지 않는다 — 반대 활동을 권하는 건 재촉이 된다.
 */
export function pickSurprise(all: Candidate[], picked: Item[], c: Cond, doneCategories: Set<string>, exclude: string[] = [], rand = Math.random): Item | null {
  if (c.energy <= config.LOW_ENERGY) return null;
  const taken = new Set([...picked.map((p) => p.id), ...exclude]);
  const pool = all.filter(
    (x) =>
      !taken.has(x.id) &&
      x.availableSlots.length > 0 &&
      x.minutes <= c.minutes &&
      x.price <= c.budget &&
      x.walkMinutes <= c.walk + 10 &&
      x.energyNeed <= c.energy + 20,
  );
  const different = pool.filter((x) => !(c.emotion && x.moods.includes(c.emotion)) && !doneCategories.has(x.category));
  const from = different.length ? different : pool;
  if (!from.length) return null;
  const x = from[Math.floor(rand() * from.length)];
  return { ...x, reason: '평소 고르던 것과는 좀 다른 거야. 의외로 잘 맞을지도 몰라.', surprise: true };
}

/** LLM이 고른 id 중 후보에 있는 것만 남기고(지어낸 체험 차단) 앞에 세운 뒤, 나머지 후보를 순서대로 붙인다. 많아도 RECOMMEND_MAX개. */
export function finalizePicks(cands: Candidate[], picks: { id: string; reason: string }[] | null, exclude: string[] = []): Item[] {
  // 안 본 것만 보여 주고, 너무 적으면 이미 본 것을 뒤에 붙인다
  const unseen = cands.filter((c) => !exclude.includes(c.id));
  const pool = unseen.length >= config.RECOMMEND_MIN ? unseen : [...unseen, ...cands.filter((c) => exclude.includes(c.id))];
  const byId = new Map(pool.map((c) => [c.id, c]));
  const chosen = new Map<string, Item>();
  for (const p of picks ?? []) {
    const c = byId.get(p.id);
    if (c && chosen.size < config.RECOMMEND_MAX) chosen.set(c.id, { ...c, reason: p.reason.trim() || reasonOf(c) });
  }
  for (const c of pool) {
    if (chosen.size >= config.RECOMMEND_MAX) break;
    if (!chosen.has(c.id)) chosen.set(c.id, { ...c, reason: reasonOf(c) });
  }
  return [...chosen.values()];
}

export const PickOut = z.object({ picks: z.array(z.object({ id: z.string(), reason: z.string().catch('') })) });
export const PICK_FORMAT = `
지금은 친구에게 오늘 할 만한 체험을 골라 주는 차례야. 후보 목록에 있는 것 중에서만, 지금 친구에게 어울리는 것을 어울리는 순서대로 골라. 개수는 정해져 있지 않지만 많아도 5개.
후보에 없는 id를 지어내면 안 돼. 이유는 "지금 친구 상태에 왜 맞는지"를 토끼 말투로 한 줄. 가격과 시간 숫자는 쓰지 마.
이유에는 친구가 한 말에 나온 사정(멀리 가기 싫음, 발표 걱정, 방에만 있었음 등)과 에너지를 반영해. 이유마다 표현을 다르게 써.
토끼가 기억하는 친구의 취향과, 다녀온 체험에서 기분이 많이 올랐던 것이 있으면 순서와 이유에 활용해 (예: "지난번 도자기 하고 기분이 4에서 8로 올랐잖아"). 기분이 오르지 않았던 체험은 뒤로 미뤄.
아래 JSON 하나만 출력해. 다른 글은 쓰지 마.
{"picks":[{"id":"후보의 id","reason":"한 줄 이유"}]}`;

const pick = <T>(v: unknown, allowed: readonly T[], d: T) => (allowed.includes(v as T) ? (v as T) : d);

export async function loadExperiences(): Promise<Experience[]> {
  return query<Experience>(
    `SELECT e.id, e.title, e.category, e.minutes, e.price, e.moods, e.energy_need AS "energyNeed", e.description, e.tags,
            e.place_id AS "placeId",
            COALESCE(array_agg(s.start_time ORDER BY s.start_time) FILTER (WHERE s.start_time IS NOT NULL), '{}') AS slots
     FROM experiences e LEFT JOIN experience_slots s ON s.experience_id = e.id GROUP BY e.id ORDER BY e.id`,
  );
}

/** 위치가 있으면 그 위치 기준으로만 찾는다 (주변에 제휴 매장이 없으면 없는 대로).
 *  위치 동의를 안 했을 때만 DEMO_CENTER(기본 동네) 기준. */
export async function nearbyCandidates(pos: LatLng | null) {
  const now = config.demoMode ? null : nowHHMM();
  const center = pos ?? config.demoCenter;
  const places = await placeService.openNearby(center);
  return { cands: toCandidates(await loadExperiences(), places, now), center, source: pos ? 'here' : 'demo' };
}

export async function recommend(userId: number, body: any, client = defaultClient) {
  if (await isSafeMode(userId)) return SAFETY_BLOCK;
  const [ck] = await query(
    `SELECT id, text, emotion, energy, mood_score AS mood FROM checkins WHERE id = $1 AND user_id = $2`,
    [toId(body?.checkinId), userId],
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

  const { cands, center, source } = await nearbyCandidates(searchPos(validLatLng(body?.lat, body?.lng)));
  const { items, widened } = filterExperiences(cands, cond);
  // 같은 위치 기준의 무료 장소 (카카오). 제휴 매장이 없는 동네에서는 이것만 추천된다.
  const freeP = freePlaces(center).then((f) => pickFree(f ?? [], cond.walk));
  const exclude: string[] = Array.isArray(body?.exclude) ? body.exclude.filter((x: unknown) => typeof x === 'string').slice(0, 50) : [];

  const state = { 한줄: ck.text, 감정: ck.emotion, 에너지: `${cond.energy}%`, 기분점수: ck.mood, 쓸수있는시간: `${cond.minutes}분`, 도보: `${cond.walk}분 이내`, 예산: `${cond.budget}원` };
  const list = items
    .filter((c) => !exclude.includes(c.id))
    .slice(0, 8)
    .map((c) => ({ id: c.id, title: c.title, minutes: c.minutes, walkMinutes: c.walkMinutes, price: c.price, 어울리는감정: c.moods, 설명: c.description }));
  const out = list.length
    ? await callJson(client, BUNNY_PROMPT + PICK_FORMAT, `${await memoryContext(userId)}친구 상태: ${JSON.stringify(state)}\n후보: ${JSON.stringify(list)}`, PickOut)
    : null;

  // 기다리는 사이 안전 모드가 됐으면 추천을 내보내지 않는다
  const free = await freeP;
  if (await isSafeMode(userId)) return SAFETY_BLOCK;

  const picked = finalizePicks(items, out?.picks ?? null, exclude);
  // 맞춤 추천 끝에 "평소와 다른 하나" (config.SURPRISE_PICK, 지금은 꺼 둠). 자리가 없으면 마지막 것과 바꾼다
  if (config.SURPRISE_PICK && picked.length) {
    const doneCats = await query<{ category: string }>(
      `SELECT DISTINCT e.category FROM bookings b JOIN experiences e ON e.id = b.experience_id WHERE b.user_id = $1 AND b.status = 'DONE'`,
      [userId],
    );
    const surprise = pickSurprise(cands, picked, cond, new Set(doneCats.map((d) => d.category)), exclude);
    if (surprise) picked.splice(Math.min(picked.length, config.RECOMMEND_MAX - 1), 1, surprise);
  }
  return {
    status: 200,
    body: {
      items: picked,
      free,
      widened: widened && items.length > 0,
      locationSource: source,
      ...(out ? {} : { fallback: true }),
    },
  };
}
