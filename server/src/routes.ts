// Controller
import { Router, type Response } from 'express';
import { config } from './config.js';
import { query, toId } from './db.js';
import { validLatLng } from './geo.js';
import { byIp, byUserKey, rateLimit, resetAllowed } from './limit.js';
import { freePlaces, geocode } from './services/kakao.js';
import { placePhoto } from './services/googlePhoto.js';
import { browse, parseNeed } from './services/browse.js';
import { parseGroups, parseMood, parseWith, picks, travelMinutes } from './services/picks.js';
import { deleteSaved, listSaved, saveSpot, summary } from './services/saved.js';
import { deleteMemory, listMemories } from './services/memory.js';
import { synthesize, ttsText } from './services/voice.js';
import { handleLift, liftAfter, liftStats } from './services/lift.js';
import { deleteAccount, kakaoCallback, logout, me, sessionUser, startKakao, updateMe } from './services/account.js';
import { handleTalk } from './services/talk.js';
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
     ON CONFLICT (client_key) DO UPDATE SET last_seen = now() RETURNING id`,
    [key],
  );
  await query(`INSERT INTO characters(user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [u.id]);
  return u.id;
}
// 카카오 로그인 쿠키가 있으면 그 계정, 없으면 둘러보기(X-User-Key)
api.use(async (req, res, next) => {
  const s = await sessionUser(req);
  res.locals.loggedIn = s !== null;
  res.locals.userId = s ?? (await userIdFor(req.get('x-user-key')));
  next();
});
const uid = (res: Response) => res.locals.userId as number;
const loggedIn = (res: Response) => res.locals.loggedIn as boolean;

// ---- 계정 · 개인정보 ----
api.post('/auth/kakao/start', (req, res) => send(res, startKakao(req, res, uid(res))));
api.get('/auth/kakao/callback', kakaoCallback);
api.post('/auth/logout', (_req, res) => {
  logout(res);
  res.json({ ok: true });
});
api.get('/me', async (_req, res) => res.json(await me(uid(res), loggedIn(res))));
api.patch('/me', async (req, res) => send(res, await updateMe(uid(res), loggedIn(res), req.body)));
// 탈퇴 (로그인 사용자). 둘러보기 사용자는 "내 기록 모두 지우기"(DELETE /records)
api.delete('/me', async (_req, res) => {
  if (!loggedIn(res)) return res.status(401).json({ error: '로그인한 계정만 탈퇴할 수 있어.' });
  await deleteAccount(uid(res));
  logout(res);
  res.json({ deleted: true });
});

// AI를 부르는 요청은 IP와 사용자 키 양쪽으로 횟수를 제한한다 (무료 LLM 사용량 보호)
const aiLimit = [rateLimit('ai-ip', config.RATE_AI_PER_IP, byIp), rateLimit('ai-user', config.RATE_AI_PER_USER, byUserKey)];

// 즉시 기분 전환: 한 줄 → AI가 지금 할 방법 하나(웃기·토닥임·타로·게임·밖으로·대화)를 골라 바로. 끝나면 기분 점수 후
api.post('/lift', ...aiLimit, async (req, res) => send(res, await handleLift(uid(res), req.body)));
api.post('/lift/:id/after', async (req, res) => send(res, await liftAfter(uid(res), toId(req.params.id), req.body)));
api.get('/lift/stats', async (_req, res) => res.json(await liftStats()));

// 무무 목소리: 글자 → mp3. 키가 없으면 503(disabled)이고 화면은 브라우저 목소리로 읽는다
api.post('/voice/tts', ...aiLimit, async (req, res) => {
  const text = ttsText(req.body?.text);
  if (!text) return res.status(400).json({ error: '읽을 글이 없어.' });
  const mp3 = await synthesize(text);
  if (!mp3) return res.status(503).json({ error: '목소리를 준비하고 있어.', disabled: true });
  res.type('audio/mpeg').send(mp3);
});

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

// 둘러보기: 필요(쉬기·풀기 등)를 고르면 근처 실제 가게. 카카오·구글을 여러 번 불러서 IP당 분당 횟수를 막는다
api.get('/browse', rateLimit('browse-ip', 30, byIp), async (req, res) => {
  const pos = validLatLng(Number(req.query.lat), Number(req.query.lng));
  res.json({ items: await browse(pos, parseNeed(req.query.need)) });
});

// 시안 흐름 추천: 기분 카드 → 조건 → 무무 AI 맞춤 추천. 홈(limit=3), 탐색·내 주변(sort=distance, limit 늘림)이 같이 쓴다.
// ?mood=tired|low|stressed|bored|good|plain &types=cafe,exhibit,class,popup,nature,etc &with=solo|pair|group &travel=15|30|60
// &sort=score|distance &limit=1~20 &lat&lng. 예산은 받지 않는다 (가게 가격을 모름)
api.get('/picks', rateLimit('picks-ip', 30, byIp), async (req, res) => {
  const pos = validLatLng(Number(req.query.lat), Number(req.query.lng));
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 3));
  res.json(
    await picks(pos, {
      mood: parseMood(req.query.mood),
      groups: parseGroups(req.query.types),
      with: parseWith(req.query.with),
      travel: travelMinutes(req.query.travel),
      sort: req.query.sort === 'distance' ? 'distance' : 'score',
      limit,
    }),
  );
});

// 무료 장소: 내 주변 카페·도서관·공원 (카카오 로컬). 예약 없음, 지도 링크만.
api.get('/places/free', async (req, res) => {
  const pos = validLatLng(Number(req.query.lat), Number(req.query.lng)) ?? config.demoCenter;
  const items = await freePlaces(pos);
  res.json(items === null ? { items: [], disabled: true } : { items });
});

// 제휴 매장의 실제 사진 (구글). 볼 때마다 받는다: 사진 주소는 저장할 수 없고 잠깐만 유효하다.
// 호출마다 구글 요금이 붙어서 IP당 분당 횟수를 막는다.
api.get('/places/:id/photo', rateLimit('photo-ip', 60, byIp), async (req, res) => {
  const p = await placePhoto(String(req.params.id));
  p ? res.json(p) : res.status(204).end(); // 사진 없음: 화면은 그림을 그대로 쓴다
});

// 주소나 장소 이름 → 좌표. 화면은 이 좌표를 추천·체험 목록의 lat/lng로 쓴다 (서버에 저장하지 않음).
api.get('/geocode', async (req, res) => {
  const q = typeof req.query.query === 'string' ? req.query.query.trim().slice(0, 100) : '';
  if (!q) return res.status(400).json({ error: '주소나 장소 이름을 적어 줘.' });
  if (!config.kakaoKey) return res.status(503).json({ error: '주소 검색이 아직 준비되지 않았어.', disabled: true });
  const r = await geocode(q);
  r ? res.json(r) : res.status(404).json({ error: '그 주소를 찾지 못했어. 조금 다르게 적어 줄래?' });
});

// 찜한 스팟 (마이). POST {itemId, placeName?, lat?, lng?}: 실시간 가게(live:...)는 이름·좌표도
api.get('/saved', async (_req, res) => res.json({ items: await listSaved(uid(res)) }));
api.post('/saved', async (req, res) => send(res, await saveSpot(uid(res), req.body)));
api.delete('/saved/:id', async (req, res) => send(res, await deleteSaved(uid(res), toId(req.params.id))));
// 마이 화면 숫자 (찜, 다녀온 곳, 무무가 기억하는 것)
api.get('/summary', async (_req, res) => res.json(await summary(uid(res))));

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

// 대화로 추천받기 (핵심 흐름): {sessionId?, message, lat?, lng?} → 묻기(ask) 또는 추천(recommend)
api.post('/talk', ...aiLimit, async (req, res) => send(res, await handleTalk(uid(res), req.body)));

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
