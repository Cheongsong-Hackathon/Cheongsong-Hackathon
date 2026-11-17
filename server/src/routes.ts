// Controller: 라우터 6개 (chat, recommend, runs, character, rewards, partners)
import { Router } from 'express';
import { config } from './config.js';
import { query } from './db.js';
import { validLatLng } from './geo.js';
import { handleChat, resumeSession } from './services/chat.js';
import { stageOf, todayExpSql } from './services/growth.js';
import { llmCallCount } from './services/llm.js';
import { placeRepo } from './services/places.js';
import { recommend } from './services/recommend.js';
import { listRuns, startRun, verifyRun } from './services/runs.js';
import { seed } from './setup.js';

export const chat = Router();
chat.post('/chat', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 500) : '';
  if (!message) return res.status(400).json({ error: '메시지를 적어 줘.' });
  res.json(await handleChat(req.body.sessionId, message));
});
chat.post('/sessions/:id/resume', async (req, res) => res.json(await resumeSession(Number(req.params.id))));

export const recommendRouter = Router();
recommendRouter.post('/recommend', async (req, res) => {
  const { sessionId, lat, lng, exclude } = req.body ?? {};
  // DEMO_MODE에서는 현재 위치를 DEMO_CENTER로 간주한다 (실내 시연)
  const center = config.demoMode ? config.demoCenter : validLatLng(lat, lng);
  const r = await recommend(
    Number.isInteger(sessionId) ? sessionId : -1,
    center,
    Array.isArray(exclude) ? exclude.filter((x) => typeof x === 'string').slice(0, 50) : [],
  );
  res.status(r.status).json(r.body);
});

export const runs = Router();
runs.get('/runs', async (_req, res) => res.json(await listRuns()));
runs.post('/runs', async (req, res) => {
  const r = await startRun(req.body ?? {});
  res.status(r.status).json(r.body);
});
runs.post('/runs/:id/verify', async (req, res) => {
  const r = await verifyRun(Number(req.params.id) || -1, req.body ?? {});
  res.status(r.status).json(r.body);
});

export const character = Router();
character.get('/character', async (_req, res) => {
  const [c] = await query(
    `SELECT u.nickname, c.level, c.exp, c.stage, c.patterns FROM characters c JOIN users u ON u.id = c.user_id WHERE c.user_id = $1`,
    [config.USER_ID],
  );
  const [{ exp: todayExp }] = await query(todayExpSql, [config.USER_ID]);
  const s = stageOf(c.exp);
  res.json({
    ...c,
    stageMinExp: config.STAGE_MIN_EXP[s - 1],
    nextStageExp: config.STAGE_MIN_EXP[s] ?? null,
    todayExp,
    dailyCap: config.DAILY_EXP_CAP,
    demoMode: config.demoMode,
  });
});

export const rewards = Router();
rewards.get('/rewards', async (_req, res) =>
  res.json({
    items: await query(
      `SELECT r.id, r.type, r.code, r.used, r.required_level AS "requiredLevel", p.name AS "placeName", pt.coupon_policy AS benefit
       FROM rewards r JOIN partners pt ON pt.id = r.partner_id JOIN places p ON p.id = pt.place_id
       WHERE r.user_id = $1 ORDER BY r.used, r.id`,
      [config.USER_ID],
    ),
  }),
);
rewards.post('/rewards/:id/redeem', async (req, res) => {
  const [r] = await query(`UPDATE rewards SET used = true WHERE id = $1 AND user_id = $2 RETURNING id, code, used`, [
    Number(req.params.id) || -1,
    config.USER_ID,
  ]);
  r ? res.json(r) : res.status(404).json({ error: '그런 쿠폰은 없어.' });
});

export const partners = Router();
partners.get('/partners', async (_req, res) => res.json({ items: await placeRepo.listPartners() }));

export const misc = Router();
misc.get('/health', (_req, res) => res.json({ ok: true, demoMode: config.demoMode, llm: llmCallCount() }));
// 시연 리허설용 초기화. DEMO_MODE에서만 열린다.
misc.post('/demo/reset', async (_req, res) => {
  if (!config.demoMode) return res.status(404).end();
  await seed();
  res.json({ ok: true });
});
