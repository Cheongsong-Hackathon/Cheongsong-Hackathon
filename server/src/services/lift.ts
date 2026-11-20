// 즉시 기분 전환: 한 줄(또는 음성)을 AI가 읽고, 지금 이 자리에서 3분 안에 할 기분 전환 하나를 골라 바로 해 준다.
// 기분 점수 전/후를 남겨 "바로 바뀌었나"를 숫자로 본다. 말한 내용은 저장하지 않는다(고른 방법과 점수만).
import { z } from 'zod';
import { query } from '../db.js';
import { BUNNY_PROMPT, callJson, defaultClient, RISK_RULE, type LLMClient } from './llm.js';
import { isSafeMode, Risk, SAFETY_REPLY, SafetyGuard, setSafeMode, SUPPORT } from './safety.js';

export const MODES = ['joke', 'comfort', 'tarot', 'play', 'outside', 'talk'] as const;
export type Mode = (typeof MODES)[number];
const TITLE: Record<Mode, string> = {
  joke: '무무가 웃겨 줄게',
  comfort: '무무가 토닥여 줄게',
  tarot: '오늘의 타로 한 장 뽑아 볼래?',
  play: '무무랑 밸런스 게임 한 판!',
  outside: '근처로 잠깐 나가 볼래?',
  talk: '무무가 들어 줄게',
};
const SAY: Record<Mode, string> = {
  joke: '오늘 좀 무거웠구나. 무무가 하나 웃겨 볼게!',
  comfort: '많이 지쳤구나. 잠깐 여기 기대 있어.',
  tarot: '마음이 붕 떠 있을 땐 카드 한 장이 딱이야.',
  play: '머리 식히는 데는 가벼운 게임이 최고지!',
  outside: '답답할 땐 잠깐 바깥 공기가 제일 빨라.',
  talk: '하고 싶은 얘기 있으면 편하게 해 줘.',
};
// AI가 없거나 실패했을 때 쓰는 기본 내용
const JOKES = [
  '세상에서 제일 착한 사자는? 자원봉사자! 오늘 하루 버틴 너도 꽤 착한 사자야.',
  '왕이 넘어지면? 킹콩! 넘어져도 괜찮아, 무무가 일으켜 줄게.',
  '바나나가 웃으면? 바나나킥! 오늘 한 번은 킥킥 웃자.',
  '소금이 죽으면? 죽염! …방금 피식했지? 그럼 무무 승리!',
];
const COMFORTS = ['오늘 여기까지 온 것만으로도 충분해. 잠깐 숨 고르고 가자. 무무가 옆에 있을게.'];

const LiftOut = z.object({
  mode: z.preprocess((v) => (typeof v === 'string' ? v.trim().toLowerCase() : v), z.enum(MODES)).catch('comfort'),
  risk: Risk,
  say: z.string().catch(''),
  content: z.string().catch(''),
});

const PROMPT = `${BUNNY_PROMPT}

지금 할 일: 친구의 한 줄을 읽고, 지금 이 자리에서 3분 안에 기분을 바꿔 줄 방법 하나를 고른다.
mode (하나만):
- joke: 가라앉거나 무기력하거나 속상할 때 가볍게 웃겨 주기
- comfort: 너무 지치거나 서러워서 웃음보다 다독임이 먼저일 때
- tarot: 심심하거나 마음이 붕 뜰 때, 재미로 오늘의 카드
- play: 심심하거나 머리를 식히고 싶을 때 짧은 놀이(밸런스 게임)
- outside: 답답해서 몸을 움직이거나 소리 내고 싶을 때, 기분이 좋아서 이어가고 싶을 때 (근처 장소로)
- talk: 누가 들어 줬으면 한다, 털어놓고 싶다고 할 때
say: 친구 말을 짚는 반응 한 문장 + 이걸 고른 이유 한 문장 (각 40자 안팎)
content: joke면 친구 상황에 맞춘 짧은 유머(말장난·아재개그·귀여운 상황극, 3문장 이내. 친구나 친구 상황을 놀리거나 깎아내리지 마).
  comfort면 다독이는 말 3문장 이내. 그 밖의 mode는 빈 문자열
${RISK_RULE}
{"mode":"joke","risk":"NONE","say":"","content":""} 형식의 JSON 하나만 출력해.`;

/** AI가 없을 때 말에서 방법 고르기 */
export function ruleMode(t: string): Mode {
  if (/들어\s*줘|털어놓|얘기\s*하고|이야기\s*하고|말할\s*데/.test(t)) return 'talk';
  if (/답답|스트레스|빡|짜증|열\s*받|화나/.test(t)) return 'outside';
  if (/심심|지루|할\s*게\s*없/.test(t)) return 'play';
  if (/지쳐|지쳤|피곤|힘들|서러|서럽|눈물/.test(t)) return 'comfort';
  if (/좋아|신나|행복|설레/.test(t)) return 'outside';
  return 'joke';
}
export const score = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 10 ? v : null);
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const parseMode = (v: unknown): Mode | null => ((MODES as readonly unknown[]).includes(v) ? (v as Mode) : null);

export async function handleLift(userId: number, body: any, client: LLMClient | null = defaultClient) {
  const text = typeof body?.text === 'string' ? body.text.trim().slice(0, 300) : '';
  if (!text) return { status: 400, body: { error: '지금 기분을 한 줄로 말해 줘.' } };
  const before = score(body?.before);
  const avoid = parseMode(body?.avoid); // "다른 걸로 해 줘": 방금 한 방법은 빼고
  const safety = async () => {
    await setSafeMode(userId, true);
    return { status: 200, body: { safety: true, reply: SAFETY_REPLY } };
  };
  if (SafetyGuard.check(text) || (await isSafeMode(userId))) return safety();
  const out = await callJson(client, PROMPT, `친구가 한 말: "${text}"${avoid ? `\n방금 ${avoid}는 해 봤어. 다른 걸 골라 줘.` : ''}`, LiftOut);
  if (out?.risk === 'CRISIS') return safety();
  let mode: Mode = out?.mode ?? ruleMode(text);
  if (mode === avoid) mode = avoid === 'joke' ? 'tarot' : 'joke';
  let content = out && out.mode === mode ? out.content.trim() : '';
  if (mode === 'joke' && !content) content = pick(JOKES);
  if (mode === 'comfort' && !content) content = pick(COMFORTS);
  const say = (out && out.mode === mode && out.say.trim()) || SAY[mode];
  const [row] = await query<{ id: number }>(`INSERT INTO lifts(user_id, mode, before) VALUES ($1,$2,$3) RETURNING id`, [userId, mode, before]);
  return {
    status: 200,
    body: { id: row.id, mode, title: TITLE[mode], say, content, before, ...(out?.risk === 'WATCH' ? { support: SUPPORT } : {}) },
  };
}

/** 끝난 뒤 기분 점수 → 변화량 */
export async function liftAfter(userId: number, id: number, body: any) {
  const after = score(body?.after);
  if (after == null) return { status: 400, body: { error: '1~10 중에 골라 줘.' } };
  const [r] = await query<{ before: number | null; after: number }>(
    `UPDATE lifts SET after = $3, after_at = now() WHERE id = $1 AND user_id = $2 RETURNING before, after`,
    [id, userId, after],
  );
  if (!r) return { status: 404, body: { error: '그 기록을 찾지 못했어.' } };
  return { status: 200, body: { before: r.before, after: r.after, delta: r.before == null ? null : r.after - r.before } };
}

/** 발표·검증용 전체 통계 (개인 정보 없음): 방법별 횟수, 전/후를 다 남긴 횟수, 평균 전·후·변화, 오른 사람 수 */
export async function liftStats() {
  const rows = await query(
    `SELECT mode, count(*)::int AS n, count(after) FILTER (WHERE before IS NOT NULL)::int AS measured,
            round(avg(before) FILTER (WHERE after IS NOT NULL), 1)::float AS before,
            round(avg(after) FILTER (WHERE before IS NOT NULL), 1)::float AS after,
            round(avg(after - before), 1)::float AS delta,
            count(*) FILTER (WHERE after > before)::int AS improved
     FROM lifts GROUP BY mode ORDER BY n DESC`,
  );
  return { modes: rows };
}
