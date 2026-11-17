// 선택형 속마음 대화: 토끼의 공감·위로. 추천이나 예약을 권하지 않는다.
import { z } from 'zod';
import { query, toId } from '../db.js';
import { BUNNY_PROMPT, callJson, defaultClient } from './llm.js';
import { Risk, SAFETY_REPLY, SafetyGuard, setSafeMode } from './safety.js';

export const DEFAULT_REPLY = '응, 듣고 있어. 천천히 말해도 괜찮아.';
export const GREETING = '여기선 아무 얘기나 해도 돼. 오늘 마음에 걸리는 거 있어?';

export const ChatOut = z.object({ reply: z.string().catch(''), risk: Risk });

const TALK_FORMAT = `
지금은 친구의 속마음을 들어 주는 시간이야. 공감하고 위로해 줘. 활동이나 체험, 예약을 권하지 마.
아래 JSON 하나만 출력해. 다른 글은 쓰지 마.
{"reply": "토끼의 답장", "risk": "NONE|WATCH|CRISIS"}
- risk: 자해·자살 생각이 보이면 CRISIS, 많이 지쳐 보이면 WATCH, 아니면 NONE`;

async function getOrCreateSession(userId: number, sessionId: unknown) {
  const id = toId(sessionId);
  if (id > 0) {
    const [s] = await query<{ id: number }>(`SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2`, [id, userId]);
    if (s) return s.id;
  }
  const [s] = await query<{ id: number }>(`INSERT INTO chat_sessions(user_id) VALUES ($1) RETURNING id`, [userId]);
  return s.id;
}

const say = (sessionId: number, role: string, text: string) =>
  query(`INSERT INTO messages(session_id, role, text) VALUES ($1,$2,$3)`, [sessionId, role, text]);

export async function handleChat(userId: number, sessionIdIn: unknown, message: string, client = defaultClient) {
  const sessionId = await getOrCreateSession(userId, sessionIdIn);
  await say(sessionId, 'user', message);

  const safety = async () => {
    await setSafeMode(userId, true);
    await say(sessionId, 'assistant', SAFETY_REPLY);
    return { sessionId, reply: SAFETY_REPLY, state: 'SAFETY', risk: 'CRISIS' as const };
  };
  if (SafetyGuard.check(message)) return safety(); // 키워드에 걸리면 LLM을 부르지 않는다

  const history = await query<{ role: string; text: string }>(
    `SELECT role, text FROM (SELECT * FROM messages WHERE session_id = $1 ORDER BY id DESC LIMIT 10) m ORDER BY id`,
    [sessionId],
  );
  const user = `대화:\n${history.map((m) => `${m.role === 'user' ? '친구' : '토끼'}: ${m.text}`).join('\n')}\n\n토끼의 다음 답장을 JSON으로 써 줘.`;
  const out = await callJson(client, BUNNY_PROMPT + TALK_FORMAT, user, ChatOut);
  if (out?.risk === 'CRISIS') return safety();

  const reply = out?.reply || DEFAULT_REPLY;
  await say(sessionId, 'assistant', reply);
  return { sessionId, reply, state: 'CHATTING', risk: out?.risk ?? 'NONE', ...(out ? {} : { fallback: true }) };
}
