import { z } from 'zod';
import { config, type Energy, type Tier } from '../config.js';
import { query } from '../db.js';
import type { LatLng } from '../geo.js';
import { callJson, defaultClient, SNAIL_PROMPT } from './llm.js';
import { placeService, type Place } from './places.js';

export type Template = { id: string; title: string; tier: Tier; minutes: number; exp: number; placeId: string | null };
export type Item = {
  templateId: string;
  placeId?: string;
  title: string;
  tier: Tier;
  minutes: number;
  exp: number;
  distanceM?: number;
  isPartner: boolean;
  benefit?: string;
  place?: LatLng & { name: string };
  reason: string;
};
type Candidate = Omit<Item, 'reason'>;

const TIERS: Record<Energy, Tier[]> = { LOW: ['HOME'], MID: ['HOME', 'NEAR'], HIGH: ['NEAR', 'TOWN'] };
const DEFAULT_REASON: Record<Tier, string> = {
  HOME: '누운 자리에서 바로 할 수 있어.',
  NEAR: '잠깐 바람만 쐬고 와도 충분해.',
  TOWN: '천천히 다녀오기 좋은 거리야.',
};

/** 서버가 먼저 후보를 고른다: LOW → HOME, MID → HOME + NEAR, HIGH → NEAR + TOWN (TOWN은 넘겨받은 장소만) */
export function buildCandidates(energy: Energy, templates: Template[], places: Place[]): Candidate[] {
  const byId = new Map(places.map((p) => [p.id, p]));
  return templates.flatMap((t): Candidate[] => {
    if (!TIERS[energy].includes(t.tier)) return [];
    const base = { templateId: t.id, title: t.title, tier: t.tier, minutes: t.minutes, exp: t.exp };
    if (t.tier !== 'TOWN') return [{ ...base, isPartner: false }];
    const p = t.placeId ? byId.get(t.placeId) : undefined;
    if (!p) return [];
    return [
      {
        ...base,
        placeId: p.id,
        distanceM: p.distanceM,
        isPartner: p.isPartner,
        ...(p.isPartner && p.note ? { benefit: p.note } : {}),
        place: { name: p.name, lat: p.lat, lng: p.lng },
      },
    ];
  });
}

/**
 * LLM이 고른 것을 서버가 검증·보정한다.
 * - 후보에 없는 id는 버린다 (LLM이 장소를 지어내지 못하게)
 * - 2개 미만이면 후보에서 채우고, 3개를 넘으면 자른다
 * - 전부 제휴 매장이면 하나를 무료/비제휴 선택지로 바꾼다
 */
export function finalizePicks(
  candidates: Candidate[],
  picks: { id: string; reason: string }[] | null,
  exclude: string[] = [],
): Item[] {
  let pool = candidates.filter((c) => !exclude.includes(c.templateId));
  if (pool.length < 2) pool = candidates;
  const byId = new Map(pool.map((c) => [c.templateId, c]));

  const chosen = new Map<string, Item>();
  for (const p of picks ?? []) {
    const c = byId.get(p.id);
    if (c && chosen.size < 3) chosen.set(c.templateId, { ...c, reason: p.reason.trim() || DEFAULT_REASON[c.tier] });
  }
  const add = (c: Candidate) => chosen.set(c.templateId, { ...c, reason: DEFAULT_REASON[c.tier] });
  for (const c of pool) {
    if (chosen.size >= Math.min(2, pool.length)) break;
    if (!chosen.has(c.templateId)) add(c);
  }
  const items = [...chosen.values()];
  if (items.length && items.every((i) => i.isPartner)) {
    const free = pool.find((c) => !c.isPartner) ?? candidates.find((c) => !c.isPartner);
    if (free) items[items.length - 1] = { ...free, reason: DEFAULT_REASON[free.tier] };
  }
  return items;
}

const PickOut = z.object({ picks: z.array(z.object({ id: z.string(), reason: z.string() })) });
const PICK_FORMAT = `
지금은 친구의 상태에 맞는 활동을 골라 주는 차례야. 후보 목록에 있는 것 중에서만 2~3개를 골라.
후보에 없는 id나 장소를 지어내면 안 돼. 이유는 느리 말투로 한 줄.
아래 JSON 하나만 출력해. 다른 글은 쓰지 마.
{"picks":[{"id":"후보의 id","reason":"한 줄 이유"}]}`;

const shuffle = <T>(a: T[]) => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map(([, v]) => v);

export async function recommend(sessionId: number, center: LatLng | null, exclude: string[] = [], client = defaultClient) {
  const [s] = await query(
    `SELECT s.state, m.mood, m.energy, m.free_minutes AS "freeMinutes", m.budget
     FROM chat_sessions s LEFT JOIN mood_states m ON m.session_id = s.id WHERE s.id = $1 AND s.user_id = $2`,
    [sessionId, config.USER_ID],
  );
  if (!s) return { status: 404, body: { error: '세션을 찾을 수 없어.' } };
  if (s.state === 'SAFETY') return { status: 403, body: { blocked: true, state: 'SAFETY' } };
  if (!s.energy) return { status: 409, body: { needEnergy: true, error: '먼저 지금 기운을 알려 줘.' } };

  // 위치를 모르면 동네 장소(TOWN)는 추천하지 않는다
  const places = center ? await placeService.openNearby(center) : [];
  const templates = await query<Template>(
    `SELECT id, title, tier, minutes, exp, place_id AS "placeId" FROM activity_templates`,
  );
  const candidates = shuffle(buildCandidates(s.energy, templates, places));

  const user = `친구 상태: ${JSON.stringify({ mood: s.mood, energy: s.energy, freeMinutes: s.freeMinutes, budget: s.budget })}
후보: ${JSON.stringify(
    candidates
      .filter((c) => !exclude.includes(c.templateId))
      .map((c) => ({ id: c.templateId, title: c.title, tier: c.tier, minutes: c.minutes, distanceM: c.distanceM, isPartner: c.isPartner })),
  )}`;
  const out = await callJson(client, SNAIL_PROMPT + PICK_FORMAT, user, PickOut);

  if (s.state !== 'IN_PROGRESS') await query(`UPDATE chat_sessions SET state = 'RECOMMENDED' WHERE id = $1`, [sessionId]);
  return { status: 200, body: { items: finalizePicks(candidates, out?.picks ?? null, exclude), ...(out ? {} : { fallback: true }) } };
}
