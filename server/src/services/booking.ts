// 04 예약·체험 → 05 기분 기록. 실제 예약은 네이버 지도(네이버 예약)에서 하고, 여기서는 "가기로 한 것"만 기록한다 (기분 전후 기록·토끼 성장용).
import { config } from '../config.js';
import { query, toId, tx } from '../db.js';
import { haversineM, validLatLng } from '../geo.js';
import { GrowthService } from './growth.js';
import { naverMapUrl } from './kakao.js';
import { LIVE_KINDS, parseLiveBooking } from './livePlaces.js';
import { nowHHMM } from './recommend.js';
import { isSafeMode, SAFETY_BLOCK } from './safety.js';

const fail = (status: number, error: string) => ({ status, body: { error } });
const mood = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 10 ? v : null);
/** 체험 전 기분: 예약할 때 고른 값이 먼저, 없으면 마음 확인 점수 */
export const moodBeforeOf = (body: any, ck?: { mood_score: number | null }) => mood(body?.moodBefore) ?? ck?.mood_score ?? null;
/** 미루기 경험치는 하루(한국 시간)에 한 번만. 오늘 이미 미룬 횟수를 받는다 */
export const postponeExp = (todayCount: number) => (todayCount > 0 ? 0 : config.EXP_POSTPONE);

const BOOKING_COLS = `b.id, b.status, b.slot_time AS "slotTime", b.price, b.mood_before AS "moodBefore", b.mood_after AS "moodAfter",
  b.created_at AS "createdAt", b.completed_at AS "completedAt", b.arrived_at AS "arrivedAt", e.id AS "experienceId", e.title, e.category, e.minutes,
  COALESCE(p.name, b.live_place) AS "placeName", b.live_kind AS "liveKind"`;
/** 실시간 가게 기록은 제목·그림을 서버 목록(LIVE_KINDS)에서 채운다 */
const fillLive = (b: any) => {
  const k = b.liveKind ? LIVE_KINDS[b.liveKind] : undefined;
  return k ? { ...b, title: k.title, category: k.art } : b;
};
/** 다시 예약하러 갈 수 있게 네이버 지도 링크를 붙인다 */
const withMap = <T extends { placeName: string }>(b: T | undefined) => (b ? { ...fillLive(b), mapUrl: naverMapUrl(b.placeName) } : null);
const BOOKING_FROM = `FROM bookings b LEFT JOIN experiences e ON e.id = b.experience_id LEFT JOIN places p ON p.id = e.place_id`;

export async function createBooking(userId: number, body: any) {
  if (await isSafeMode(userId)) return SAFETY_BLOCK;
  if (String(body?.experienceId ?? '').startsWith('live:')) return createLiveBooking(userId, body);
  const [exp] = await query(
    `SELECT e.id, e.price, array_agg(s.start_time) AS slots FROM experiences e
     JOIN experience_slots s ON s.experience_id = e.id WHERE e.id = $1 GROUP BY e.id`,
    [String(body?.experienceId ?? '')],
  );
  if (!exp) return fail(404, '그런 체험은 없어.');
  const slot = String(body?.slotTime ?? '');
  // 시간과 가격은 체험 DB에 있는 값만 쓴다
  if (!exp.slots.includes(slot)) return fail(400, '그 시간은 예약할 수 없어. 다른 시간을 골라 줘.');
  if (!config.demoMode && slot <= nowHHMM()) return fail(400, '이미 지난 시간이야. 다른 시간을 골라 줘.');

  const [ck] = await query(`SELECT id, mood_score FROM checkins WHERE id = $1 AND user_id = $2`, [toId(body?.checkinId), userId]);
  const id = await tx(async (q) => {
    // 진행 중인 예약 요청은 하나만. 이전 것은 조용히 취소한다 (불이익 없음).
    await q(`UPDATE bookings SET status = 'CANCELED' WHERE user_id = $1 AND status = 'REQUESTED'`, [userId]);
    const [b] = await q(
      `INSERT INTO bookings(user_id, checkin_id, experience_id, slot_time, price, mood_before) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [userId, ck?.id ?? null, exp.id, slot, exp.price, moodBeforeOf(body, ck)],
    );
    return b.id as number;
  });
  return { status: 200, body: await getBooking(userId, id) };
}

/** 실시간으로 찾은 가게를 "가기로 한 곳"으로. 시간대·가격은 모르므로 비워 둔다 */
async function createLiveBooking(userId: number, body: any) {
  const live = parseLiveBooking(body);
  if (!live) return fail(400, '그 가게 정보를 읽지 못했어. 다시 골라 줘.');
  const [ck] = await query(`SELECT id, mood_score FROM checkins WHERE id = $1 AND user_id = $2`, [toId(body?.checkinId), userId]);
  const id = await tx(async (q) => {
    await q(`UPDATE bookings SET status = 'CANCELED' WHERE user_id = $1 AND status = 'REQUESTED'`, [userId]);
    const [b] = await q(
      `INSERT INTO bookings(user_id, checkin_id, price, mood_before, live_kind, live_place, live_lat, live_lng) VALUES ($1,$2,0,$3,$4,$5,$6,$7) RETURNING id`,
      [userId, ck?.id ?? null, moodBeforeOf(body, ck), live.kind, live.placeName, live.lat, live.lng],
    );
    return b.id as number;
  });
  return { status: 200, body: await getBooking(userId, id) };
}

export async function getBooking(userId: number, id: number) {
  const [b] = await query<any>(`SELECT ${BOOKING_COLS} ${BOOKING_FROM} WHERE b.id = $1 AND b.user_id = $2`, [id, userId]);
  return withMap(b);
}

export async function activeBooking(userId: number) {
  const [b] = await query<any>(`SELECT ${BOOKING_COLS} ${BOOKING_FROM} WHERE b.user_id = $1 AND b.status = 'REQUESTED' ORDER BY b.id DESC LIMIT 1`, [
    userId,
  ]);
  return withMap(b);
}

/** "다녀왔어" + 체험 후 기분. 두 번 눌러도 한 번만 반영된다. */
export async function completeBooking(userId: number, id: number, body: any) {
  if (await isSafeMode(userId)) return SAFETY_BLOCK;
  const after = mood(body?.moodAfter);
  if (after === null) return fail(400, '체험 후 기분을 1~10 중에 골라 줘.');
  const before = mood(body?.moodBefore);

  const result = await tx(async (q) => {
    const [b] = await q(
      `UPDATE bookings SET status = 'DONE', completed_at = now(), mood_after = $3, mood_before = COALESCE(mood_before, $4)
       WHERE id = $1 AND user_id = $2 AND status = 'REQUESTED' RETURNING mood_before`,
      [id, userId, after, before],
    );
    if (!b) return null;
    const g = await GrowthService.grant(q, userId, config.EXP_DONE);
    return { done: true, moodBefore: b.mood_before as number | null, moodAfter: after, ...g };
  });
  if (result) return { status: 200, body: result };
  const existing = await getBooking(userId, id);
  if (!existing) return fail(404, '그런 예약은 없어.');
  if (existing.status === 'DONE')
    return { status: 200, body: { done: true, already: true, moodBefore: existing.moodBefore, moodAfter: existing.moodAfter, expGained: 0, levelUp: false, stageUp: false, newItems: [] } };
  return fail(409, '취소된 예약이야.');
}

/** "도착했어": 지금 GPS가 매장에서 ARRIVE_RADIUS_M 안이면 방문 확인. 좌표는 거리 계산에만 쓰고 저장하지 않는다.
 *  확인이 안 돼도 "다녀왔어"와 기분 기록은 막지 않는다 (불이익 없음). DEMO_MODE에서는 거리를 따지지 않는다. */
export async function arriveBooking(userId: number, id: number, body: any) {
  const [b] = await query(
    `SELECT b.status, b.arrived_at, COALESCE(p.lat, b.live_lat) AS lat, COALESCE(p.lng, b.live_lng) AS lng FROM bookings b
     LEFT JOIN experiences e ON e.id = b.experience_id LEFT JOIN places p ON p.id = e.place_id WHERE b.id = $1 AND b.user_id = $2`,
    [id, userId],
  );
  if (!b) return fail(404, '그런 예약은 없어.');
  if (b.status !== 'REQUESTED') return fail(409, '진행 중인 예약이 아니야.');
  if (b.arrived_at) return { status: 200, body: { arrived: true, already: true } };

  const pos = validLatLng(body?.lat, body?.lng);
  const distanceM = pos ? Math.round(haversineM(pos, b)) : null;
  if (!config.demoMode) {
    if (distanceM === null) return fail(400, '위치를 읽지 못했어. 위치 권한을 확인해 줘.');
    if (distanceM > config.ARRIVE_RADIUS_M) return { status: 200, body: { arrived: false, distanceM } };
  }
  await query(`UPDATE bookings SET arrived_at = now() WHERE id = $1 AND user_id = $2`, [id, userId]);
  return { status: 200, body: { arrived: true, distanceM, ...(config.demoMode ? { demo: true } : {}) } };
}

export async function cancelBooking(userId: number, id: number) {
  const [b] = await query(`UPDATE bookings SET status = 'CANCELED' WHERE id = $1 AND user_id = $2 AND status = 'REQUESTED' RETURNING id`, [
    id,
    userId,
  ]);
  return b ? { status: 200, body: { canceled: true } } : fail(404, '취소할 예약이 없어.');
}

/** 오늘 할 일 하나 미루기 */
export async function postpone(userId: number, body: any) {
  const task = typeof body?.task === 'string' ? body.task.trim().slice(0, 100) : '';
  if (!task) return fail(400, '미룰 일을 하나 적어 줘.');
  const g = await tx(async (q) => {
    await q(`SELECT 1 FROM characters WHERE user_id = $1 FOR UPDATE`, [userId]); // 동시에 두 번 눌러도 한 번만 받게
    const [{ n }] = await q(
      `SELECT count(*)::int AS n FROM postpones WHERE user_id = $1 AND (created_at AT TIME ZONE 'Asia/Seoul')::date = (now() AT TIME ZONE 'Asia/Seoul')::date`,
      [userId],
    );
    await q(`INSERT INTO postpones(user_id, task) VALUES ($1,$2)`, [userId, task]);
    return GrowthService.grant(q, userId, postponeExp(n)); // 0이면 경험치는 그대로, 응답 모양만 같다
  });
  return { status: 200, body: { reply: `"${task}"는 내일의 너한테 맡기자. 조금은 쉬어가도 괜찮아.`, ...g } };
}

export async function records(userId: number) {
  const done = (
    await query<any>(`SELECT ${BOOKING_COLS} ${BOOKING_FROM} WHERE b.user_id = $1 AND b.status = 'DONE' ORDER BY b.completed_at DESC LIMIT 50`, [userId])
  ).map(fillLive);
  // 최근 7일 마음 기록: 그날 남긴 기분 점수(마음 확인 + 체험 전 + 체험 후)의 평균.
  // 체험 전 기분이 마음 확인 점수를 그대로 옮긴 것이면 두 번 세지 않는다
  const week = await query(
    `WITH days AS (SELECT ((now() AT TIME ZONE 'Asia/Seoul')::date - i) AS day FROM generate_series(0, 6) i),
          m AS (SELECT (created_at AT TIME ZONE 'Asia/Seoul')::date AS day, mood_score AS v FROM checkins WHERE user_id = $1 AND mood_score IS NOT NULL
                UNION ALL
                SELECT (completed_at AT TIME ZONE 'Asia/Seoul')::date, mood_after FROM bookings WHERE user_id = $1 AND status = 'DONE'
                UNION ALL
                SELECT (b.created_at AT TIME ZONE 'Asia/Seoul')::date, b.mood_before FROM bookings b LEFT JOIN checkins c ON c.id = b.checkin_id
                WHERE b.user_id = $1 AND b.mood_before IS NOT NULL AND b.mood_before IS DISTINCT FROM c.mood_score)
     SELECT to_char(days.day, 'YYYY-MM-DD') AS date, extract(isodow FROM days.day)::int AS dow, round(avg(m.v))::int AS mood
     FROM days LEFT JOIN m ON m.day = days.day GROUP BY days.day ORDER BY days.day`,
    [userId],
  );
  const postpones = await query(`SELECT id, task, created_at AS "createdAt" FROM postpones WHERE user_id = $1 ORDER BY id DESC LIMIT 20`, [
    userId,
  ]);
  return { done, week, postpones };
}

/** 내 기록 모두 지우기. 캐릭터 성장은 줄이지 않는다. */
export async function deleteRecords(userId: number) {
  await tx(async (q) => {
    await q(`DELETE FROM bookings WHERE user_id = $1`, [userId]);
    await q(`DELETE FROM checkins WHERE user_id = $1`, [userId]);
    await q(`DELETE FROM postpones WHERE user_id = $1`, [userId]);
    await q(`DELETE FROM messages WHERE session_id IN (SELECT id FROM chat_sessions WHERE user_id = $1)`, [userId]);
    await q(`DELETE FROM chat_sessions WHERE user_id = $1`, [userId]);
    await q(`DELETE FROM memories WHERE user_id = $1`, [userId]); // 토끼의 기억도 같이
  });
  return { deleted: true };
}
