// 01 마음 확인: 한 줄 + 감정 + 에너지(%) + 지금 기분 점수(1~10)
import { z } from 'zod';
import { config, EMOTIONS } from '../config.js';
import { query } from '../db.js';
import { BUNNY_PROMPT, callJson, defaultClient } from './llm.js';
import { Risk, SAFETY_REPLY, SafetyGuard, setSafeMode } from './safety.js';

const REPLY_BY_EMOTION: Record<string, string> = {
  지쳤어: '오늘 많이 지쳤구나. 여기까지 온 것만으로도 충분히 잘했어.',
  답답해: '마음이 꽉 막힌 느낌이구나. 조금 풀어 줄 만한 걸 같이 찾아보자.',
  불안해: '마음이 조마조마하구나. 천천히 숨 쉴 수 있는 걸 찾아볼게.',
  심심해: '심심한 날이구나! 가볍게 기분 바꿀 거리를 찾아볼게.',
  평온해: '마음이 잔잔한 날이구나. 그 기분을 이어 갈 만한 걸 찾아볼게.',
};
export const DEFAULT_CHECKIN_REPLY = '알려 줘서 고마워. 지금 너한테 맞는 걸 천천히 찾아볼게.';

const CheckinOut = z.object({ reply: z.string().catch(''), risk: Risk });
const CHECKIN_FORMAT = `
지금은 친구가 오늘의 마음을 알려 준 순간이야. 공감하는 말 1~2문장만 해. 아직 활동을 권하지 마.
아래 JSON 하나만 출력해. 다른 글은 쓰지 마.
{"reply": "토끼의 공감 한마디", "risk": "NONE|WATCH|CRISIS"}
- risk: 자해·자살 생각이 보이면 CRISIS, 많이 지쳐 보이면 WATCH, 아니면 NONE`;

const clampInt = (v: unknown, min: number, max: number, d: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : d;

export function parseCheckin(body: any) {
  return {
    text: typeof body?.text === 'string' ? body.text.trim().slice(0, 300) : '',
    emotion: (EMOTIONS as readonly string[]).includes(body?.emotion) ? (body.emotion as string) : null,
    energy: clampInt(body?.energy, 0, 100, 50),
    mood: clampInt(body?.mood, 1, 10, 5),
  };
}

export async function handleCheckin(userId: number, body: unknown, client = defaultClient) {
  const c = parseCheckin(body);
  const safety = async () => {
    await setSafeMode(userId, true);
    // 위기 표현이 담긴 글은 저장하지 않는다
    return { reply: SAFETY_REPLY, state: 'SAFETY', risk: 'CRISIS' as const };
  };
  if (SafetyGuard.check(c.text)) return safety();

  // 한 줄을 적었을 때만 LLM을 부른다 (감정 칩만 고른 경우는 정해진 답장)
  const out = c.text
    ? await callJson(
        client,
        BUNNY_PROMPT + CHECKIN_FORMAT,
        `친구가 남긴 말: "${c.text}"\n고른 감정: ${c.emotion ?? '없음'}\n에너지: ${c.energy}%\n지금 기분 점수: ${c.mood}/10`,
        CheckinOut,
      )
    : null;
  if (out?.risk === 'CRISIS') return safety();

  const reply = out?.reply || (c.emotion && REPLY_BY_EMOTION[c.emotion]) || DEFAULT_CHECKIN_REPLY;
  const [row] = await query<{ id: number }>(
    `INSERT INTO checkins(user_id, text, emotion, energy, mood_score, risk) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [userId, c.text || null, c.emotion, c.energy, c.mood, out?.risk ?? 'NONE'],
  );
  return {
    checkinId: row.id,
    reply,
    state: 'OK',
    risk: out?.risk ?? 'NONE',
    // 기운이 거의 없으면 추천보다 "오늘 할 일 하나 미루기"를 먼저 권한다
    suggestPostpone: c.energy <= config.LOW_ENERGY,
    ...(c.text && !out ? { fallback: true } : {}),
  };
}
