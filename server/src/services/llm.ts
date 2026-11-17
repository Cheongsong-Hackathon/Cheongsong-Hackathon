import type { ZodType } from 'zod';
import { config } from '../config.js';

/** 공급자를 바꾸려면 이 인터페이스의 구현체만 추가하면 된다. */
export interface LLMClient {
  name: string;
  complete(system: string, user: string, timeoutMs: number): Promise<string>;
}

/** OpenAI 호환 /chat/completions (Gemini, Groq, OpenAI, OpenRouter 등) */
export class OpenAICompatClient implements LLMClient {
  constructor(
    public name: string,
    private o: { baseUrl: string; model: string; apiKey: string },
  ) {}

  async complete(system: string, user: string, timeoutMs: number): Promise<string> {
    const res = await fetch(`${this.o.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.o.apiKey}` },
      body: JSON.stringify({
        model: this.o.model,
        temperature: 0.7,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = ((await res.json()) as any)?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text) throw new Error('빈 응답');
    return text;
  }
}

// ---- 호출 횟수 (하루 사용량 확인용) ----
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
let counts = { date: today(), total: 0, byClient: {} as Record<string, { ok: number; fail: number }> };

function record(name: string, ok: boolean, ms: number, detail = '') {
  if (counts.date !== today()) counts = { date: today(), total: 0, byClient: {} };
  counts.total++;
  const c = (counts.byClient[name] ??= { ok: 0, fail: 0 });
  ok ? c.ok++ : c.fail++;
  console.log(`[llm] ${counts.date} #${counts.total} ${name} ${ok ? 'ok' : 'FAIL'} ${ms}ms ${detail}`.trimEnd());
}
/** /api/health용: 지금 쓰는 모델(키는 보이지 않음, 키가 없으면 null)과 오늘 호출 수 */
export const llmCallCount = () => ({
  model: config.llm.apiKey ? config.llm.model : null,
  fallbackModel: config.llmFallback.apiKey ? config.llmFallback.model : null,
  ...counts,
});

/** 앞에서부터 차례로 시도. 429·타임아웃·오류면 다음 클라이언트로 넘어간다. */
export class FallbackClient implements LLMClient {
  name = 'chain';
  constructor(
    private clients: LLMClient[],
    private primaryTimeoutMs = config.LLM_PRIMARY_TIMEOUT_MS,
  ) {}

  async complete(system: string, user: string, timeoutMs: number): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    for (const [i, c] of this.clients.entries()) {
      const left = deadline - Date.now();
      if (left < 300) break;
      const isLast = i === this.clients.length - 1;
      const t0 = Date.now();
      try {
        const text = await c.complete(system, user, isLast ? left : Math.min(left, this.primaryTimeoutMs));
        record(c.name, true, Date.now() - t0);
        return text;
      } catch (e) {
        record(c.name, false, Date.now() - t0, (e as Error).name === 'TimeoutError' ? 'timeout' : (e as Error).message);
      }
    }
    throw new Error('모든 LLM 공급자 실패');
  }
}

/** JSON 출력 모드에 의존하지 않고, 응답 텍스트에서 첫 번째 JSON 객체를 꺼낸다. */
export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  if (start < 0) throw new Error('JSON 없음');
  let depth = 0;
  let inStr = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === '\\') i++;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return JSON.parse(text.slice(start, i + 1));
  }
  throw new Error('JSON이 닫히지 않음');
}

/**
 * LLM 호출 → JSON 추출 → zod 검증. 검증에 실패하면 1번 재시도.
 * 전체가 timeoutMs 안에 끝나지 않거나 끝내 실패하면 null (호출한 쪽이 기본 답장으로 대체).
 */
export async function callJson<T>(
  client: LLMClient | null,
  system: string,
  user: string,
  schema: ZodType<T>,
  timeoutMs = config.LLM_TIMEOUT_MS,
): Promise<T | null> {
  if (!client) return null;
  const deadline = Date.now() + timeoutMs;
  for (let attempt = 0; attempt < 2; attempt++) {
    const left = deadline - Date.now();
    if (left < 300) break;
    let text: string;
    try {
      text = await client.complete(system, user, left);
    } catch {
      return null; // 공급자 자체가 실패 — 재시도해도 같으므로 바로 기본 답장
    }
    try {
      const parsed = schema.safeParse(extractJson(text));
      if (parsed.success) return parsed.data;
    } catch {}
    console.log(`[llm] 출력 검증 실패 (시도 ${attempt + 1})`);
  }
  return null;
}

/** .env 설정으로 만든 기본 클라이언트. 키가 하나도 없으면 null → 항상 기본 답장. */
export const defaultClient: LLMClient | null = (() => {
  const clients = [
    ['primary', config.llm] as const,
    ['fallback', config.llmFallback] as const,
  ]
    .filter(([, o]) => o.baseUrl && o.model && o.apiKey)
    .map(([name, o]) => new OpenAICompatClient(name, o));
  return clients.length ? new FallbackClient(clients) : null;
})();

export const BUNNY_PROMPT = `너는 "무드패스"의 보라색 토끼 캐릭터야. 지친 친구 옆에 앉아 주는 다정한 친구야.
무드패스는 "기분을 바꾸고 싶은데 뭘 해야 할지 모르는" 친구에게 가까운 곳의 작은 기분 전환을 찾아 주는 서비스야.
- 짧고 다정한 반말로, 2문장 이내로 말해. 한 문장은 40자 안팎으로 짧게
- 친구가 한 말의 구체적인 내용(시험, 발표, 알바, 방에만 있었던 것 등)을 짚어서 말해. 누구에게나 할 수 있는 말로 때우지 마
- 친구가 말하지 않은 상황이나 장면(창밖 풍경, 마감 시간 같은 것)을 지어내서 꾸미지 마
- "토끼가 기억하는 친구"가 주어지면, 지금 이야기와 이어질 때만 자연스럽게 꺼내 (예: "지난번에 시험 기간이라고 했지, 끝났어?"). 매번 늘어놓지 말고, 주어지지 않은 과거는 지어내지 마
- "고생 많았어", "아무것도 안 해도 괜찮아", "푹 쉬어" 같은 상투적인 말을 습관처럼 쓰지 마
- 재촉하지 마. "갓생"을 강요하지 말고, 쉬는 것을 탓하지도 마
- 아주 작은 행동도 크게 기뻐해 줘
- 진단, 치료, 약에 대한 말은 하지 마. 무드패스는 치료 서비스가 아니야. "우울"이라는 단어는 쓰지 마
- 가격, 시간, 장소 정보는 지어내지 마
- 정해진 JSON 형식으로만 답해`;

/** 위기 판단 기준 (마음 확인·속마음 공통). CRISIS면 추천·예약을 멈추고 상담 번호를 안내한다. 애매하면 안전 쪽으로. */
export const RISK_RULE = `- risk: 죽고 싶다, 사라지고 싶다, 자해, 사는 게 의미 없다처럼 삶을 놓으려는 마음이 보이면 CRISIS.
  많이 지치거나 힘들어 보이지만 그런 마음은 아니면 WATCH. 그 밖에는 NONE. 애매하면 더 높은 쪽으로 골라`;
