// Controller
import { Router, type Response } from 'express';
import { config } from './config.js';
import { query, toId } from './db.js';
import { validLatLng } from './geo.js';
import { activeBooking, cancelBooking, completeBooking, createBooking, deleteRecords, postpone, records } from './services/booking.js';
import { handleChat } from './services/chat.js';
import { handleCheckin } from './services/checkin.js';
import { ITEMS, stageOf } from './services/growth.js';
import { llmCallCount } from './services/llm.js';
import { nearbyCandidates, recommend } from './services/recommend.js';
import { setSafeMode } from './services/safety.js';
import { seed } from './setup.js';

const send = (res: Response, r: { status: number; body: unknown }) => res.status(r.status).json(r.body);

export const api = Router();

// 01 마음 확인
api.post('/checkin', async (req, res) => res.json(await handleCheckin(req.body)));
// 02 조건 확인 + 03 경험 추천
api.post('/recommend', async (req, res) => send(res, await recommend(req.body)));

// 체험 탭: 제휴 매장의 전체 체험
api.get('/experiences', async (req, res) => {
  const pos = validLatLng(Number(req.query.lat), Number(req.query.lng));
  const { cands } = await nearbyCandidates(pos);
  res.json({ items: [...cands].sort((a, b) => a.walkMinutes - b.walkMinutes) });
});

// 04 예약 요청
api.post('/bookings', async (req, res) => send(res, await createBooking(req.body)));
api.get('/bookings/active', async (_req, res) => res.json({ booking: await activeBooking() }));
api.post('/bookings/:id/complete', async (req, res) => send(res, await completeBooking(toId(req.params.id), req.body)));
api.post('/bookings/:id/cancel', async (req, res) => send(res, await cancelBooking(toId(req.params.id))));

// 오늘 할 일 하나 미루기
api.post('/postpone', async (req, res) => send(res, await postpone(req.body)));

// 05 나의 기록
api.get('/records', async (_req, res) => res.json(await records()));
api.delete('/records', async (_req, res) => res.json(await deleteRecords()));

// 캐릭터
api.get('/character', async (_req, res) => {
  const [c] = await query(
    `SELECT c.level, c.exp, c.stage, c.items, c.equipped, u.safe_mode AS "safeMode"
     FROM characters c JOIN users u ON u.id = c.user_id WHERE c.user_id = $1`,
    [config.USER_ID],
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
    [config.USER_ID, typeof item === 'string' ? item : null],
  );
  c ? res.json(c) : res.status(400).json({ error: '아직 열리지 않은 아이템이야.' });
});

// 선택형 속마음 대화
api.post('/chat', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 500) : '';
  if (!message) return res.status(400).json({ error: '메시지를 적어 줘.' });
  res.json(await handleChat(req.body.sessionId, message));
});

// 안전 모드에서 "대화로 돌아갈래"
api.post('/safety/resume', async (_req, res) => {
  await setSafeMode(false);
  res.json({ state: 'OK' });
});

api.get('/health', (_req, res) => res.json({ ok: true, demoMode: config.demoMode, llm: llmCallCount() }));
// 시연 리허설용 초기화. DEMO_MODE에서만 열린다.
api.post('/demo/reset', async (_req, res) => {
  if (!config.demoMode) return res.status(404).end();
  await seed();
  res.json({ ok: true });
});
