import { z } from 'zod';
import { config, type Energy } from '../config.js';
import { query } from '../db.js';
import { callJson, defaultClient, SNAIL_PROMPT } from './llm.js';
import { SAFETY_REPLY, SafetyGuard } from './safety.js';

export const QUICK: { label: string; energy: Energy }[] = [
  { label: '누워만 있고 싶어', energy: 'LOW' },
  { label: '조금은 움직일 수 있어', energy: 'MID' },
  { label: '나갈 힘 있어', energy: 'HIGH' },
];
export const QUICK_LABELS = QUICK.map((q) => q.label);

export const DEFAULT_REPLY = '그랬구나, 천천히 말해 줘서 고마워. 지금 기운은 어느 정도야?';
const QUICK_REPLY: Record<Energy, string> = {
  LOW: '그럼 누운 채로도 할 수 있는 아주 작은 걸 찾아볼게. 안 해도 괜찮아.',
  MID: '좋아, 조금만 움직여도 충분해. 가볍게 할 수 있는 걸 골라 볼게.',
  HIGH: '오, 나갈 힘이 있구나! 동네에서 할 만한 걸 찾아볼게.',
};

const ChatOut = z.object({
  reply: z.string().min(1),
  mood: z.string().nullish(),
  energy: z.enum(['LOW', 'MID', 'HIGH', 'UNKNOWN']).catch('UNKNOWN'),
  freeMinutes: z.number().nullish().catch(null),
  budget: z.number().nullish().catch(null),
  risk: z.enum(['NONE', 'WATCH', 'CRISIS']),
  readyToRecommend: z.boolean().catch(false),
});

const CHAT_FORMAT = `
아래 JSON 하나만 출력해. 다른 글은 쓰지 마.
{"reply": "느리의 답장", "mood": "한 단어 기분 또는 null", "energy": "LOW|MID|HIGH|UNKNOWN", "freeMinutes": 숫자 또는 null, "budget": 숫자(원) 또는 null, "risk": "NONE|WATCH|CRISIS", "readyToRecommend": true|false}
- energy: 누워만 있고 싶으면 LOW, 조금 움직일 수 있으면 MID, 밖에 나갈 수 있으면 HIGH, 아직 모르겠으면 UNKNOWN (모르면 reply에서 기운을 한 번 물어봐)
- risk: 자해·자살 생각이 보이면 CRISIS, 많이 지쳐 보이면 WATCH, 아니면 NONE`;

type Session = { id: number; state: string };

async function getOrCreateSession(sessionId: unknown): Promise<Session> {
  if (Number.isInteger(sessionId)) {
    const [s] = await query<Session>(`SELECT id, state FROM chat_sessions WHERE id = $1 AND user_id = $2`, [
      sessionId,
      config.USER_ID,
    ]);
    if (s) return s;
  }
  const [s] = await query<Session>(`INSERT INTO chat_sessions(user_id) VALUES ($1) RETURNING id, state`, [config.USER_ID]);
  return s;
}

const say = (sessionId: number, role: string, text: string) =>
  query(`INSERT INTO messages(session_id, role, text) VALUES ($1,$2,$3)`, [sessionId, role, text]);
const setState = (sessionId: number, state: string) =>
  query(`UPDATE chat_sessions SET state = $2 WHERE id = $1`, [sessionId, state]);

export async function handleChat(sessionId: unknown, message: string, client = defaultClient) {
  const s = await getOrCreateSession(sessionId);
  await say(s.id, 'user', message);

  const safety = async () => {
    await setState(s.id, 'SAFETY');
    await say(s.id, 'assistant', SAFETY_REPLY);
    return { sessionId: s.id, reply: SAFETY_REPLY, state: 'SAFETY', risk: 'CRISIS' as const };
  };
  // 이미 안전 모드이거나 키워드에 걸리면 LLM을 부르지 않는다
  if (s.state === 'SAFETY' || SafetyGuard.check(message)) return safety();

  const quick = QUICK.find((q) => q.label === message);
  const [mood] = await query(`SELECT mood, energy, free_minutes, budget FROM mood_states WHERE session_id = $1`, [s.id]);
  const history = await query<{ role: string; text: string }>(
    `SELECT role, text FROM (SELECT * FROM messages WHERE session_id = $1 ORDER BY id DESC LIMIT 10) m ORDER BY id`,
    [s.id],
  );
  const user = `지금까지 파악한 상태: ${JSON.stringify(mood ?? {})}\n\n대화:\n${history
    .map((m) => `${m.role === 'user' ? '상대' : '느리'}: ${m.text}`)
    .join('\n')}\n\n느리의 다음 답장을 JSON으로 써 줘.`;

  const out = await callJson(client, SNAIL_PROMPT + CHAT_FORMAT, user, ChatOut);
  if (out?.risk === 'CRISIS') return safety();

  const energy: Energy | 'UNKNOWN' =
    quick?.energy ?? (out && out.energy !== 'UNKNOWN' ? out.energy : (mood?.energy ?? 'UNKNOWN'));
  const reply = out?.reply ?? (quick ? QUICK_REPLY[quick.energy] : energy === 'UNKNOWN' ? DEFAULT_REPLY : '응, 듣고 있어. 천천히 해도 괜찮아.');

  await query(
    `INSERT INTO mood_states(session_id, mood, energy, free_minutes, budget) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (session_id) DO UPDATE SET
       mood = COALESCE(EXCLUDED.mood, mood_states.mood), energy = COALESCE(EXCLUDED.energy, mood_states.energy),
       free_minutes = COALESCE(EXCLUDED.free_minutes, mood_states.free_minutes), budget = COALESCE(EXCLUDED.budget, mood_states.budget)`,
    [s.id, out?.mood ?? null, energy === 'UNKNOWN' ? null : energy, toInt(out?.freeMinutes), toInt(out?.budget)],
  );
  await say(s.id, 'assistant', reply);
  const state = s.state === 'IN_PROGRESS' ? s.state : 'CHATTING';
  if (state !== s.state) await setState(s.id, state);

  return {
    sessionId: s.id,
    reply,
    state,
    risk: out?.risk ?? 'NONE',
    ...(energy === 'UNKNOWN' ? { quickReplies: QUICK_LABELS } : { energy }),
    readyToRecommend: energy !== 'UNKNOWN',
    ...(out ? {} : { fallback: true }),
  };
}

const toInt = (n: number | null | undefined) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : null);

export async function resumeSession(sessionId: number) {
  await query(`UPDATE chat_sessions SET state = 'CHATTING' WHERE id = $1 AND user_id = $2 AND state = 'SAFETY'`, [
    sessionId,
    config.USER_ID,
  ]);
  return { state: 'CHATTING' };
}
