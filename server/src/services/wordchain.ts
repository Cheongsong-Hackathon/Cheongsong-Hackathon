// 무무와 끝말잇기: 내 단어가 실제 낱말인지와 무무의 다음 단어는 AI가, 규칙(시작 글자·두음법칙·중복·한글)은 서버가 직접 본다.
// AI가 없거나 실패하면 503 → 화면이 예전처럼 들고 있는 단어 목록으로 이어 간다.
import { z } from 'zod';
import { callJson, defaultClient, type LLMClient } from './llm.js';

const BASE = 0xac00;
/** 두음법칙: 리→이, 력→역, 라→나, 녀→여 처럼 첫소리 ㄹ·ㄴ이 바뀐 글자 (해당 없으면 그대로) */
export function dueum(ch: string): string {
  const c = ch.charCodeAt(0) - BASE;
  if (c < 0 || c > 11171) return ch;
  const cho = Math.floor(c / 588);
  const jung = Math.floor((c % 588) / 28);
  const jong = c % 28;
  const yi = [2, 6, 7, 12, 17, 20].includes(jung); // ㅑ ㅕ ㅖ ㅛ ㅠ ㅣ
  let to = cho;
  if (cho === 5) to = yi ? 11 : 2; // ㄹ → ㅇ(ㅑㅕㅖㅛㅠㅣ 앞) / ㄴ
  else if (cho === 2 && [6, 7, 12, 17, 20].includes(jung)) to = 11; // ㄴ → ㅇ (녀·녜·뇨·뉴·니)
  return String.fromCharCode(BASE + to * 588 + jung * 28 + jong);
}
/** 이 단어 다음에 올 수 있는 첫 글자 (끝 글자와 그 두음법칙 글자) */
export const nextStarts = (w: string) => [...new Set([w.slice(-1), dueum(w.slice(-1))])];
const isWord = (w: unknown): w is string => typeof w === 'string' && /^[가-힣]{2,10}$/.test(w);

const Out = z.object({ valid: z.boolean().catch(false), reason: z.string().catch(''), reply: z.string().catch(''), comment: z.string().catch('') });
const LEVEL: Record<string, string> = {
  쉬움: '친구가 쉽게 이을 수 있는 끝 글자로 끝나는 흔한 단어',
  보통: '흔한 단어',
  어려움: '이을 단어가 적은 끝 글자(예: 름, 듭, 슭, 녘)로 끝나서 친구가 조금 고민하게 되는 단어. 그래도 이을 단어가 하나는 있게',
};
const PROMPT = `너는 끝말잇기 상대 "무무"야. 반말로 다정하게.
1) valid: 친구의 단어가 표준국어대사전에 있는 낱말(일반 명사)인지. 사람 이름·상표·지명 같은 고유 명사, 줄임말, 사투리, 지어낸 말이면 false. 애매하면 너그럽게 true
   reason: false일 때 왜 안 되는지 한 문장 (예: "그건 사람 이름이라 안 돼!")
2) reply: valid일 때 무무가 낼 단어. 반드시 "이을 글자" 중 하나로 시작하고, "나온 단어"에 없고, 2~4글자 한글 일반 명사. 고를 단어의 느낌: {LEVEL}
   이을 단어를 정말 못 찾겠으면 빈 문자열
3) comment: 친구 단어에 대한 짧은 한마디 (20자 안팎, 예: "오, 어려운 단어 나왔다!")
{"valid":true,"reason":"","reply":"","comment":""} 형식의 JSON 하나만 출력해.`;

export async function playWordChain(body: any, client: LLMClient | null = defaultClient) {
  const word = typeof body?.word === 'string' ? body.word.trim() : '';
  const history: string[] = Array.isArray(body?.history) ? body.history.filter(isWord).slice(-100) : [];
  const level = typeof body?.level === 'string' && body.level in LEVEL ? body.level : '보통';
  const no = (reason: string) => ({ status: 200, body: { ok: false, reason } });
  if (!isWord(word)) return no('한글 두 글자 이상 낱말로 써 줘!');
  const prev = history.at(-1);
  if (prev && !nextStarts(prev).includes(word[0])) return no(`‘${nextStarts(prev).join('’이나 ‘')}’로 시작해야 해!`);
  if (history.includes(word)) return no('이미 나온 단어야. 다른 걸 떠올려 봐!');
  const starts = nextStarts(word);
  const out = await callJson(
    client,
    PROMPT.replace('{LEVEL}', LEVEL[level]),
    `친구의 단어: ${word}\n이을 글자: ${starts.join(', ')}\n나온 단어: ${history.join(', ') || '없음'}`,
    Out,
  );
  if (!out) return { status: 503, body: { fallback: true, error: '무무가 잠깐 생각을 못 하고 있어.' } };
  if (!out.valid) return no(out.reason.trim() || '무무가 모르는 단어야. 국어사전에 있는 낱말로 해 줘!');
  const reply = out.reply.trim();
  // AI가 규칙에 안 맞는 단어를 내면 무무가 진 것으로 (지어낸 답을 그대로 쓰지 않는다)
  if (!isWord(reply) || !starts.includes(reply[0]) || reply === word || history.includes(reply)) {
    return { status: 200, body: { ok: true, reply: null, comment: '무무가 이을 단어를 못 찾았어. 네가 이겼어!' } };
  }
  return { status: 200, body: { ok: true, reply, comment: out.comment.trim(), next: nextStarts(reply) } };
}
