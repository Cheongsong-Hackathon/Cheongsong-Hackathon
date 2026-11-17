// Controller
import { Router, type Response } from 'express';
import { config } from './config.js';
import { query, toId } from './db.js';
import { validLatLng } from './geo.js';
import { byIp, byUserKey, rateLimit, resetAllowed } from './limit.js';
import { freePlaces, geocode } from './services/kakao.js';
import { deleteMemory, listMemories } from './services/memory.js';
import { activeBooking, arriveBooking, cancelBooking, completeBooking, createBooking, deleteRecords, postpone, records } from './services/booking.js';
import { handleChat } from './services/chat.js';
import { handleCheckin } from './services/checkin.js';
import { ITEMS, stageOf } from './services/growth.js';
import { llmCallCount } from './services/llm.js';
import { nearbyCandidates, recommend } from './services/recommend.js';
import { setSafeMode } from './services/safety.js';
import { seed } from './setup.js';

const send = (res: Response, r: { status: number; body: unknown }) => res.status(r.status).json(r.body);

export const api = Router();

// ---- 사용자 없이 쓰는 것 ----
api.get('/health', (_req, res) => res.json({ ok: true, demoMode: config.demoMode, llm: llmCallCount() }));
// 시연 리허설용 초기화. DEMO_MODE에서만 열린다. 모든 사용자의 데이터가 지워지므로
// RESET_TOKEN을 아는 사람(또는 서버 컴퓨터 자신)만 쓸 수 있다.
api.post('/demo/reset', async (req, res) => {
  if (!config.demoMode) return res.status(404).end();
  if (!resetAllowed(req, config.resetToken)) return res.status(403).json({ error: '초기화 권한이 없어.' });
  await seed();
  res.json({ ok: true });
});

/** 로그인 없이 브라우저마다 따로: X-User-Key로 사용자를 찾고, 처음 보는 키면 사용자와 캐릭터를 만든다.
 *  키가 없거나 형식이 이상하면 기본 사용자(curl 등). */
export async function userIdFor(key: unknown): Promise<number> {
  if (typeof key !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(key)) return config.USER_ID;
  const [u] = await query<{ id: number }>(
    `INSERT INTO users(nickname, client_key) VALUES ('손님', $1)
     ON CONFLICT (client_key) DO UPDATE SET client_key = EXCLUDED.client_key RETURNING id`,
    [key],
  );
  await query(`INSERT INTO characters(user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [u.id]);
  return u.id;
}
api.use(async (req, res, next) => {
  res.locals.userId = await userIdFor(req.get('x-user-key'));
  next();
});
const uid = (res: Response) => res.locals.userId as number;

// AI를 부르는 요청은 IP와 사용자 키 양쪽으로 횟수를 제한한다 (무료 LLM 사용량 보호)
const aiLimit = [rateLimit('ai-ip', config.RATE_AI_PER_IP, byIp), rateLimit('ai-user', config.RATE_AI_PER_USER, byUserKey)];

// 01 마음 확인
api.post('/checkin', ...aiLimit, async (req, res) => res.json(await handleCheckin(uid(res), req.body)));
// 02 조건 확인 + 03 경험 추천
api.post('/recommend', ...aiLimit, async (req, res) => send(res, await recommend(uid(res), req.body)));

// 체험 탭: 제휴 매장의 전체 체험
api.get('/experiences', async (req, res) => {
  const pos = validLatLng(Number(req.query.lat), Number(req.query.lng));
  const { cands } = await nearbyCandidates(pos);
  res.json({ items: [...cands].sort((a, b) => a.walkMinutes - b.walkMinutes) });
});

// 무료 장소: 내 주변 카페·도서관·공원 (카카오 로컬). 예약 없음, 지도 링크만.
api.get('/places/free', async (req, res) => {
  const pos = validLatLng(Number(req.query.lat), Number(req.query.lng)) ?? config.demoCenter;
  const items = await freePlaces(pos);
  res.json(items === null ? { items: [], disabled: true } : { items });
});

// 주소나 장소 이름 → 좌표. 화면은 이 좌표를 추천·체험 목록의 lat/lng로 쓴다 (서버에 저장하지 않음).
api.get('/geocode', async (req, res) => {
  const q = typeof req.query.query === 'string' ? req.query.query.trim().slice(0, 100) : '';
  if (!q) return res.status(400).json({ error: '주소나 장소 이름을 적어 줘.' });
  if (!config.kakaoKey) return res.status(503).json({ error: '주소 검색이 아직 준비되지 않았어.', disabled: true });
  const r = await geocode(q);
  r ? res.json(r) : res.status(404).json({ error: '그 주소를 찾지 못했어. 조금 다르게 적어 줄래?' });
});

// 04 예약 요청
api.post('/bookings', async (req, res) => send(res, await createBooking(uid(res), req.body)));
api.post('/bookings/:id/arrive', async (req, res) => send(res, await arriveBooking(uid(res), toId(req.params.id), req.body)));
api.get('/bookings/active', async (_req, res) => res.json({ booking: await activeBooking(uid(res)) }));
api.post('/bookings/:id/complete', async (req, res) => send(res, await completeBooking(uid(res), toId(req.params.id), req.body)));
api.post('/bookings/:id/cancel', async (req, res) => send(res, await cancelBooking(uid(res), toId(req.params.id))));

// 오늘 할 일 하나 미루기
api.post('/postpone', async (req, res) => send(res, await postpone(uid(res), req.body)));

// 05 나의 기록
api.get('/records', async (_req, res) => res.json(await records(uid(res))));
api.delete('/records', async (_req, res) => res.json(await deleteRecords(uid(res))));

// 토끼가 기억하는 것: 보기, 하나씩 지우기 (모두 지우기는 DELETE /records에 포함)
api.get('/memories', async (_req, res) => res.json({ items: await listMemories(uid(res)) }));
api.delete('/memories/:id', async (req, res) =>
  (await deleteMemory(uid(res), toId(req.params.id))) ? res.json({ deleted: true }) : res.status(404).json({ error: '그런 기억은 없어.' }),
);

// 캐릭터
api.get('/character', async (_req, res) => {
  const [c] = await query(
    `SELECT c.level, c.exp, c.stage, c.items, c.equipped, u.safe_mode AS "safeMode"
     FROM characters c JOIN users u ON u.id = c.user_id WHERE c.user_id = $1`,
    [uid(res)],
  );
  const s = stageOf(c.exp);
  res.json({
    ...c,
    stageMinExp: config.STAGE_MIN_EXP[s - 1],
    nextStageExp: config.STAGE_MIN_EXP[s] ?? null,
    allItems: ITEMS.map((i) => ({ ...i, unlocked: (c.items as string[]).includes(i.id) })),
    demoMode: config.demoMode,
  });
});
api.post('/character/equip', async (req, res) => {
  const item = req.body?.item ?? null;
  const [c] = await query(
    `UPDATE characters SET equipped = $2 WHERE user_id = $1 AND ($2::text IS NULL OR items ? $2::text) RETURNING equipped`,
    [uid(res), typeof item === 'string' ? item : null],
  );
  c ? res.json(c) : res.status(400).json({ error: '아직 열리지 않은 아이템이야.' });
});

// 선택형 속마음 대화
api.post('/chat', ...aiLimit, async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 500) : '';
  if (!message) return res.status(400).json({ error: '메시지를 적어 줘.' });
  res.json(await handleChat(uid(res), req.body.sessionId, message));
});

// 안전 모드에서 "대화로 돌아갈래"
api.post('/safety/resume', async (_req, res) => {
  await setSafeMode(uid(res), false);
  res.json({ state: 'OK' });
});
