// 토끼의 기억: 마음 확인·속마음 대화에서 AI가 "다음에 도움이 될 사실"을 뽑아 사용자별로 저장하고,
// 다음 대화·추천의 지시문에 넣는다. 무엇을 기억할지는 AI가, 무엇은 절대 기억하지 않을지·개수·삭제는 코드가 정한다.
// 저장소는 이 파일 안에서만 다룬다. 기억이 많아지면 pgvector나 관리형 기억(예: Vertex AI Memory Bank)으로 바꿀 자리.
import { z } from 'zod';
import { config } from '../config.js';
import { query, tx } from '../db.js';
import { callJson, clientFor, type LLMClient } from './llm.js';
import { SafetyGuard } from './safety.js';

export const MEMORY_KINDS = ['취향', '상황', '사건'] as const;
export type MemoryKind = (typeof MEMORY_KINDS)[number];
export type Memory = { id: number; kind: MemoryKind; text: string; updatedAt: string };

// 기억하지 않을 내용: 위기 표현(키워드), 건강·진단, 다른 사람의 연락처
// ("약을"은 "예약을"에도 걸려서 쓰지 않는다)
const NEVER = /진단|처방|약\s?먹|복용|병원|치료|우울|공황|자해|자살|죽고|01[016789]-?\d{3,4}-?\d{4}|@\w+\.\w+/;
const okText = (t: unknown): t is string =>
  typeof t === 'string' && t.trim().length >= 2 && t.trim().length <= 60 && !NEVER.test(t) && !SafetyGuard.check(t);

export const MemoryOps = z.object({
  add: z.array(z.object({ kind: z.string(), text: z.string() })).catch([]),
  update: z.array(z.object({ id: z.number(), text: z.string() })).catch([]),
  remove: z.array(z.number()).catch([]),
});
export type MemoryOpsT = z.infer<typeof MemoryOps>;

/** AI가 제안한 변경을 검사한다: 없는 id·금지 내용·중복·개수 초과는 버린다. (순수 함수, 테스트 대상)
 *  사건 기억은 AI가 지우지 못한다 — 관계없는 말에도 "이제 안 맞는다"며 지우는 일이 실제로 있었다. 지우기는 사용자만. */
export function planMemoryOps(current: Pick<Memory, 'id' | 'kind' | 'text'>[], ops: MemoryOpsT, max = config.MEMORY_MAX) {
  const ids = new Set(current.map((m) => m.id));
  const removable = new Set(current.filter((m) => m.kind !== '사건').map((m) => m.id));
  const remove = [...new Set(ops.remove.filter((id) => removable.has(id)))];
  const update = ops.update.filter((u) => ids.has(u.id) && !remove.includes(u.id) && okText(u.text)).map((u) => ({ ...u, text: u.text.trim() }));
  const seen = new Set(current.map((m) => m.text.replace(/\s+/g, '')));
  let room = max - (current.length - remove.length);
  const add: { kind: MemoryKind; text: string }[] = [];
  for (const a of ops.add) {
    const text = a.text.trim();
    const key = text.replace(/\s+/g, '');
    if (room <= 0 || !(MEMORY_KINDS as readonly string[]).includes(a.kind) || !okText(text) || seen.has(key)) continue;
    seen.add(key);
    add.push({ kind: a.kind as MemoryKind, text });
    room--;
  }
  return { add, update, remove };
}

export const listMemories = (userId: number) =>
  query<Memory>(`SELECT id, kind, text, updated_at AS "updatedAt" FROM memories WHERE user_id = $1 ORDER BY updated_at DESC, id DESC`, [userId]);

export const deleteMemory = async (userId: number, id: number) =>
  (await query(`DELETE FROM memories WHERE id = $1 AND user_id = $2 RETURNING id`, [id, userId])).length > 0;

/** 한국 시간 기준 "11/17" */
export const mmdd = (d: string | Date) => {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' }).formatToParts(new Date(d));
  return `${p.find((x) => x.type === 'month')!.value}/${p.find((x) => x.type === 'day')!.value}`;
};

/** 지시문에 넣을 "토끼가 아는 친구": 기억 + 다녀온 체험의 기분 변화. 아무것도 없으면 빈 문자열. */
export async function memoryContext(userId: number): Promise<string> {
  const [mems, done] = await Promise.all([
    listMemories(userId),
    query<{ title: string; before: number | null; after: number; at: string }>(
      `SELECT e.title, b.mood_before AS before, b.mood_after AS after, b.completed_at AS at
       FROM bookings b JOIN experiences e ON e.id = b.experience_id
       WHERE b.user_id = $1 AND b.status = 'DONE' ORDER BY b.completed_at DESC LIMIT 5`,
      [userId],
    ),
  ]);
  const parts: string[] = [];
  if (mems.length) parts.push(`토끼가 기억하는 친구:\n${mems.map((m) => `- [${m.kind}] ${m.text} (${mmdd(m.updatedAt)})`).join('\n')}`);
  if (done.length)
    parts.push(`친구가 다녀온 체험과 기분 변화 (1~10):\n${done.map((d) => `- ${d.title}: ${d.before ?? '?'} → ${d.after} (${mmdd(d.at)})`).join('\n')}`);
  return parts.length ? `${parts.join('\n')}\n오늘: ${mmdd(new Date())}\n\n` : '';
}

const EXTRACT_PROMPT = `너는 친구의 이야기를 기억해 두는 토끼야. 친구가 방금 한 말에서, 다음에 대화하거나 기분 전환 거리를 고를 때 도움이 될 사실만 골라.
- kind: 취향(좋아하는 것·싫어하는 것·편한 방식), 상황(요즘 처한 상황: 시험 기간, 알바 중 등), 사건(날짜가 의미 있는 일: 친구와 다툼, 내일 발표 등)
- text: 30자 이내 한 줄 사실. 예: "조용한 곳을 좋아함", "이번 주 시험 기간", "11/17 친구와 다툼"
- 사건에는 오늘 날짜를 앞에 붙여 (예: "11/17 발표 망침")
- 이미 기억하는 것과 같으면 넣지 마. 친구가 방금 한 말 때문에 상황이 바뀌었으면 update (예: "시험 기간" → "시험 끝남")
- remove는 친구가 방금 한 말이 그 기억과 정면으로 반대될 때만 (예: "이제 사람 많은 데도 괜찮아"). 방금 말과 관계없는 기억은 그대로 둬
- 건강·진단·약, 자해·자살 같은 위기에 관한 내용, 다른 사람의 이름이나 연락처는 기억하지 마
- 그날 기분만 말한 것("오늘 피곤해")처럼 금방 지나가는 것은 기억하지 마. 기억할 게 없으면 빈 배열
아래 JSON 하나만 출력해.
{"add":[{"kind":"취향","text":"..."}],"update":[{"id":3,"text":"..."}],"remove":[5]}`;

/** 한 번의 대화·마음 확인에서 기억을 갱신한다. 응답을 늦추지 않도록 호출하는 쪽은 기다리지 않는다(실패해도 조용히 넘어감). */
export async function learnFromTurn(userId: number, text: string, client: LLMClient | null = clientFor('memory')) {
  try {
    if (!client || text.trim().length < 4 || SafetyGuard.check(text)) return;
    // [선택 동의] "무무가 기억하기"를 켠 사용자만
    const [u] = await query<{ remember: boolean }>(`SELECT remember FROM users WHERE id = $1`, [userId]);
    if (!u?.remember) return;
    const current = await listMemories(userId);
    const out = await callJson(
      client,
      EXTRACT_PROMPT,
      `지금 기억 (id, 종류, 내용):\n${JSON.stringify(current.map((m) => [m.id, m.kind, m.text]))}\n오늘: ${mmdd(new Date())}\n친구가 방금 한 말: "${text.slice(0, 500)}"`,
      MemoryOps,
    );
    if (!out) return;
    const plan = planMemoryOps(current, out);
    if (!plan.add.length && !plan.update.length && !plan.remove.length) return;
    await tx(async (q) => {
      if (plan.remove.length) await q(`DELETE FROM memories WHERE user_id = $1 AND id = ANY($2)`, [userId, plan.remove]);
      for (const u of plan.update) await q(`UPDATE memories SET text = $3, updated_at = now() WHERE id = $1 AND user_id = $2`, [u.id, userId, u.text]);
      for (const a of plan.add) await q(`INSERT INTO memories(user_id, kind, text) VALUES ($1,$2,$3)`, [userId, a.kind, a.text]);
    });
    console.log(`[memory] user ${userId} +${plan.add.length} ~${plan.update.length} -${plan.remove.length}`);
  } catch (e) {
    console.warn('[memory] 기억 갱신 실패:', (e as Error).message);
  }
}
