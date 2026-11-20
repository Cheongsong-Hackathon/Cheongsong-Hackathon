// 찜한 스팟 (시안 마이 화면). 예시 매장 체험은 체험 DB에서, 실시간 가게는 종류(서버 목록)·이름·좌표(가게의 공개 정보)로 저장한다.
// 제목·그림은 서버가 정하고, 화면에서 받는 건 가게 이름과 좌표뿐 (가기로 한 곳 기록과 같은 규칙)
import { query } from '../db.js';
import { naverMapUrl } from './kakao.js';
import { LIVE_KINDS, parseLiveBooking } from './livePlaces.js';
import { groupOf, GROUPS } from './picks.js';

type SaveInput = { live: true; itemId: string; kind: string; placeName: string; lat: number; lng: number } | { live: false; itemId: string };

export function parseSaveInput(body: any): SaveInput | null {
  const itemId = typeof body?.itemId === 'string' ? body.itemId.trim() : '';
  if (!itemId || itemId.length > 60) return null;
  if (!itemId.startsWith('live:')) return { live: false, itemId };
  const l = parseLiveBooking({ ...body, experienceId: itemId });
  return l ? { live: true, itemId, kind: l.kind, placeName: l.placeName, lat: l.lat, lng: l.lng } : null;
}

const fail = (status: number, error: string) => ({ status, body: { error } });

export async function saveSpot(userId: number, body: any) {
  const s = parseSaveInput(body);
  if (!s) return fail(400, '그 장소 정보를 읽지 못했어.');
  let row: { title: string; category: string; placeName: string; lat: number; lng: number } | undefined;
  if (s.live) {
    const k = LIVE_KINDS[s.kind];
    row = { title: k.title, category: k.art, placeName: s.placeName, lat: s.lat, lng: s.lng };
  } else {
    [row] = await query<any>(
      `SELECT e.title, e.category, p.name AS "placeName", p.lat, p.lng FROM experiences e JOIN places p ON p.id = e.place_id WHERE e.id = $1`,
      [s.itemId],
    );
    if (!row) return fail(404, '그런 장소는 없어.');
  }
  await query(
    `INSERT INTO saved_spots(user_id, item_id, title, category, place_name, lat, lng) VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (user_id, item_id) DO NOTHING`,
    [userId, s.itemId, row.title, row.category, row.placeName, row.lat, row.lng],
  );
  return { status: 200, body: { saved: true, items: await listSaved(userId) } };
}

export async function listSaved(userId: number) {
  const rows = await query<any>(
    `SELECT id, item_id AS "itemId", title, category, place_name AS "placeName", lat, lng, created_at AS "createdAt"
     FROM saved_spots WHERE user_id = $1 ORDER BY id DESC`,
    [userId],
  );
  return rows.map((r) => {
    const group = groupOf({ id: r.itemId, live: r.itemId.startsWith('live:') });
    return { ...r, group, groupLabel: GROUPS[group], mapUrl: naverMapUrl(r.placeName) };
  });
}

export async function deleteSaved(userId: number, id: number) {
  const [r] = await query(`DELETE FROM saved_spots WHERE id = $1 AND user_id = $2 RETURNING id`, [id, userId]);
  return r ? { status: 200, body: { deleted: true } } : fail(404, '찜한 곳이 없어.');
}

/** 마이 화면 숫자: 찜한 스팟, 다녀온 곳, 무무가 기억하는 것 */
export async function summary(userId: number) {
  const [r] = await query<{ saved: number; visited: number; memories: number }>(
    `SELECT (SELECT count(*)::int FROM saved_spots WHERE user_id = $1) AS saved,
            (SELECT count(*)::int FROM bookings WHERE user_id = $1 AND status = 'DONE') AS visited,
            (SELECT count(*)::int FROM memories WHERE user_id = $1) AS memories`,
    [userId],
  );
  return r;
}
