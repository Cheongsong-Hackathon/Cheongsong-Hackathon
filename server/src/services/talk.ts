// 대화로 추천받기: 사용자가 기분을 말하면 AI가 필요·조건을 읽고, 코드가 거르고 점수를 매겨 실제 주변 체험만 추천한다.
// AI: 말에서 필요 읽기, 질문 문장, 추천 순서·이유 / 코드: 묻기·추천 결정, 조건 지키기, 후보 밖 금지, 채워 넣기 금지
import { z } from 'zod';
import { query, toId } from '../db.js';
import { validLatLng } from '../geo.js';
import { BUNNY_PROMPT, callJson, defaultClient, RISK_RULE } from './llm.js';
import { ENERGIES, historyEffects, NEEDS, rankFresh, TAGS, type Energy, type Need, type Prefs, type Scored, type Tag } from './match.js';
import { learnFromTurn, memoryContext } from './memory.js';
import { photoForItem } from './googlePhoto.js';
import { allCandidates } from './livePlaces.js';
import { isSafeMode, Risk, SAFETY_REPLY, SafetyGuard, setSafeMode, SUPPORT } from './safety.js';

export const TALK_MAX_ASKS = 2; // 추천 전에 묻는 건 많아도 이만큼. 적게 묻고 먼저 묻는 방향은 Ma 외 2024, 숫자 2는 임시값 (docs/설계근거_점검.md)
export const TALK_SHOW = 3; // 대화 안에 보여 주는 추천 수 (맞는 게 적으면 그만큼만)

const FEEDBACK = ['없음', '멀어', '힘들어', '비싸', '별로', '다른거'] as const;
// null 대신 "모름"·0을 쓴다: 응답 형식을 강제하는 공급자(CLOVA)가 null 섞인 형식을 받는지 확실하지 않아서
export const TalkOut = z.object({
  reply: z.string().catch(''),
  risk: Risk,
  need: z.enum([...NEEDS, '모름']).catch('모름'),
  energy: z.enum([...ENERGIES, '모름']).catch('모름'),
  want: z.array(z.enum(TAGS)).catch([]),
  avoid: z.array(z.enum(TAGS)).catch([]),
  minutes: z.number().catch(0),
  walk: z.number().catch(0),
  budget: z.number().catch(0),
  feedback: z.enum(FEEDBACK).catch('없음'),
  action: z.enum(['ask', 'recommend']).catch('recommend'),
});

export const TALK_FORMAT = `
지금은 친구와 이야기하면서, 지금 당장 근처에서 할 수 있는 작은 기분 전환을 찾아 주는 중이야.
친구의 말에서 아래를 읽어 내. 직접 말하지 않아도 말투와 사정에서 추론해. 정말 알 수 없을 때만 "모름" 또는 0.
- need (지금 무엇이 필요한가. 겉말보다 속마음 기준):
  비우기(생각이 많아 머리를 끄고 싶음: "머리가 꽉 찼어") | 쉬기(지치거나 불안해서 긴장을 풀고 쉬고 싶음: "기빨렸어", "불안해") |
  풀기(화·답답함을 밖으로 털어내고 싶음: "개빡침", "땀 빼고 싶어") | 몰입(무언가를 해 보고 해내고 싶음: "뭐 하나 제대로 해 보고 싶어") |
  즐기기(심심해서 재미와 자극이 필요함: "심심해", "재밌는 거 없나") | 연결(외로워서 누군가와 함께하고 싶음: "외로워", "누구랑 있고 싶어") | 모름
  헷갈리면: 머리가 문제면 비우기, 몸·기운이 문제면 쉬기 / 생각을 없애려면 비우기, 무언가를 해내려면 몰입
- energy: 거의 없음 | 낮음 | 보통 | 높음 | 모름
- want, avoid: 다음 중에서만 고른 배열: ${TAGS.join(', ')}. avoid는 싫다고 했거나 지금 상태로 싫어할 게 분명한 것만
- minutes, walk(도보 분), budget(원): 친구가 그런 말을 했을 때만 숫자로 ("잠깐"=30, "가까운 데"=도보 10, "싸게"=10000). 아니면 0
- feedback: 앞서 보여 준 추천에 대한 반응. 멀어 | 힘들어 | 비싸 | 별로 | 다른거 | 없음
- action: need를 알 수 없으면 "ask", 알 수 있으면 "recommend"
- reply: ask면 공감 한 문장 + 고르기 쉬운 질문 하나 (예: "오늘은 조용히 비우고 싶어, 아니면 털어내고 싶어?").
  recommend면 공감 한 문장 + "가까운 데서 찾아봤어" 같은 한 문장. 체험 이름·가격·거리는 쓰지 마 (카드로 보여 줌)
아래 JSON 하나만 출력해.
{"reply":"","risk":"NONE","need":"모름","energy":"모름","want":[],"avoid":[],"minutes":0,"walk":0,"budget":0,"feedback":"없음","action":"ask"}
${RISK_RULE}`;

const ReasonOut = z.object({ picks: z.array(z.object({ id: z.string(), reason: z.string().catch('') })).catch([]) });
// 순서는 점수로 이미 정해져 있고, AI는 이유만 쓴다 (AI가 순서를 바꾸게 했더니 효과 있었던 체험이 밀린 적이 있음)
const REASON_FORMAT = `
지금은 친구에게 보여 줄 체험마다 이유를 쓰는 차례야. 후보 목록의 모든 후보에 대해, 주어진 순서 그대로.
이유는 토끼 말투 한 줄. 반드시 (1) 친구가 한 말이나 토끼가 기억하는 것 하나와 (2) 후보에 주어진 사실 하나(걸어서 몇 분, 근거에 있는 것)를 넣어.
근거에 "전에 해 보고 기분이 올랐음"이 있으면 그 기록(다녀온 체험과 기분 변화)을 꼭 짚어.
가격은 쓰지 마. 주어지지 않은 사실은 지어내지 마. 이유마다 표현을 다르게.
아래 JSON 하나만 출력해.
{"picks":[{"id":"후보의 id","reason":"한 줄 이유"}]}`;

type Stored = {
  need?: Need;
  energy?: Energy;
  want?: Tag[];
  avoid?: Tag[];
  minutes?: number;
  walk?: number;
  budget?: number;
  lastTop?: { walk: number; price: number; energyNeed: number };
  locked?: ('walk' | 'minutes' | 'budget')[]; // 사용자가 "멀어", "비싸"로 직접 좁힌 조건
  watch?: boolean; // 위험도 WATCH가 한 번이라도 나오면 이 대화 동안 상담 번호를 함께 보여 줌
};
type Session = { id: number; prefs: Stored; asks: number; seen: string[] };

/** "그냥 추천해 줘", "아무거나": 고르기 싫다는 뜻이라 되묻지 않고 기본값으로 바로 추천한다 */
export const justPick = (m: string) => /아무거나|알아서/.test(m) || (/그냥|상관없/.test(m) && /추천|골라|찾아|보여/.test(m));

export const NEED_CHOICES: { label: string; need: Need }[] = [
  { label: '조용히 비우고 싶어', need: '비우기' },
  { label: '털어내고 싶어', need: '풀기' },
  { label: '그냥 쉬고 싶어', need: '쉬기' },
  { label: '재밌는 거 하고 싶어', need: '즐기기' },
  { label: '누구랑 같이 있고 싶어', need: '연결' },
];
const AFTER_RECOMMEND = ['좀 멀어', '너무 힘들 것 같아', '다른 거 보여 줘'];

/** 추천에 대한 뻔한 반응은 AI가 놓쳐도 코드로 잡는다
 *  (실제로 AI가 "멀었구나"라고 답하면서 feedback은 "없음"으로 둔 적이 있음) */
export function keywordFeedback(message: string): (typeof FEEDBACK)[number] {
  const m = message.replace(/\s+/g, '');
  if (/멀[어다고네지]|멀리|가까운|가깝/.test(m)) return '멀어';
  if (/비싸|비싼|싼거|싸게|돈이|부담돼/.test(m)) return '비싸';
  if (/힘들|피곤|버거|기운이없|지쳐서/.test(m)) return '힘들어';
  if (/다른거|다른걸|별로/.test(m)) return '다른거';
  return '없음';
}

/** 이번 턴에 읽은 것을 지금까지 읽은 것에 합친다. 피드백("멀어", "힘들어", "비싸")은 지난 1위를 기준으로 조건을 좁힌다. (순수 함수)
 *  AI가 실패해도(out이 null) 키워드 피드백은 적용한다. */
/** 실내·바깥을 둘 다 피하면 모든 체험이 걸러진다: 모순이라 둘 다 뺀다 */
const noContradiction = (avoid: Tag[]) => (avoid.includes('실내') && avoid.includes('바깥') ? avoid.filter((t) => t !== '실내' && t !== '바깥') : avoid);

/** 피할 것은 말에 관련된 얘기가 있을 때만 받는다 (숫자 조건과 같은 원칙). 피할 것은 후보를 통째로 빼서, AI가 지어내면 0건이 된다
 *  (실제로 "심심해, 재밌는 거 없을까"에서 AI가 실내·몸 쓰기·혼자 가능·손으로 만들기를 넣어 동성로에서 0건). "답답해"는 기분이라 실내와 무관 */
const AVOID_HINT: Record<Tag, RegExp> = {
  조용함: /조용|심심|지루|따분/,
  '사람 많음': /사람|북적|붐비|혼잡|시끄/,
  '혼자 가능': /같이|친구|함께|외로|혼자는/,
  '같이 하기': /혼자|사람|낯가|어색/,
  '손으로 만들기': /만들|손/,
  '몸 쓰기': /몸|운동|땀|힘들|피곤|지쳤|지쳐|기운/,
  '소리 내기': /시끄|소리|조용/,
  '가만히 쉬기': /가만|지루|심심|움직/,
  실내: /밖|바깥|바람|햇|야외|산책/,
  바깥: /추워|추운|더워|더운|비 와|비와|눈 와|실내|안에서/,
};
const saidAvoid = (avoid: Tag[], message: string) => avoid.filter((t) => AVOID_HINT[t]?.test(message));

export function mergePrefs(prev: Stored, out: z.infer<typeof TalkOut> | null, message = ''): Stored {
  // 키워드가 구체적인 반응(멀어·비싸·힘들어)을 잡으면 AI의 막연한 판단(다른거·별로·없음)보다 우선
  // (실제로 "좀 멀다"를 AI가 "다른거"로 분류해 거리 조건이 안 좁혀진 적이 있음)
  const kw = prev.lastTop ? keywordFeedback(message) : '없음';
  const specific = (f: string) => f === '멀어' || f === '비싸' || f === '힘들어';
  const feedback = specific(kw) && !specific(out?.feedback ?? '없음') ? kw : (out?.feedback ?? kw);
  if (!out) out = TalkOut.parse({ risk: 'NONE', feedback });
  out = { ...out, feedback };
  // "그냥 추천해 줘"는 고르기 싫다는 뜻: AI가 그 말에서 읽어 낸 필요·원함·피함은 지어낸 것이라 받지 않는다
  // (실제로 피할 것에 실내·바깥을 다 넣어 체험이 0개가 된 적이 있음)
  if (justPick(message)) out = { ...out, need: '모름', want: [], avoid: [] };
  const p: Stored = {
    ...prev,
    need: out.need !== '모름' ? out.need : prev.need,
    energy: out.energy !== '모름' ? out.energy : prev.energy,
    want: [...new Set([...(prev.want ?? []), ...out.want])],
    avoid: noContradiction([...new Set([...(prev.avoid ?? []), ...saidAvoid(out.avoid, message)])]),
    // 숫자 조건은 사용자가 그 이야기를 했을 때만 받는다 (실제로 "좀 멀다"에서 AI가 예산 1만원을 지어낸 적이 있음)
    minutes: out.minutes > 0 && /분|시간|잠깐|금방|오래|짧게/.test(message) ? out.minutes : prev.minutes,
    // "멀다"는 정확한 거리가 아니라 "지난번보다 가깝게"라서 숫자를 받지 않고 아래 피드백 규칙으로만 (AI가 도보 10분을 붙여 아무것도 못 찾은 적이 있음)
    walk: out.walk > 0 && /\d|분|걸어|도보|가까|근처/.test(message) ? out.walk : prev.walk,
    budget: out.budget > 0 && /원|돈|비싸|비싼|싸|예산|만/.test(message) ? out.budget : prev.budget,
    // 안전망: 돌려 말한 위기를 AI가 CRISIS로 못 잡아도(평가에서 실제로 놓침) WATCH면 번호는 보이게. 추천은 막지 않음
    watch: prev.watch || out.risk === 'WATCH' || undefined,
  };
  const top = prev.lastTop;
  // 사용자가 직접 좁힌 조건은 "맞는 게 없을 때 넓히기"에서도 넓히지 않는다
  if (top && out.feedback === '멀어') {
    p.walk = Math.max(5, Math.min(p.walk ?? 99, top.walk - 1));
    p.locked = [...new Set([...(p.locked ?? []), 'walk' as const])];
  }
  if (top && out.feedback === '비싸') {
    p.budget = Math.max(0, Math.min(p.budget ?? Infinity, top.price - 1));
    p.locked = [...new Set([...(p.locked ?? []), 'budget' as const])];
  }
  if (out.feedback === '힘들어') p.energy = ENERGIES[Math.max(0, ENERGIES.indexOf(p.energy ?? '낮음') - 1)];
  return p;
}

/** 묻지 않은 조건을 채운다: 말한 것 > 지난 기록 > 지금 상황 > 기본값. 무엇을 가정했는지 함께 돌려준다. */
// 체험의 소요 시간·가격은 제휴 전이라 확인되지 않은 예시값이다. 그래서 사용자가 시간·돈 얘기를 했을 때만 거르고,
// 기본값(한 시간·2만원 안쪽)으로 몰래 거르지 않는다. 도보 거리는 실제 좌표로 계산하므로 기본값을 쓴다.
async function fillPrefs(s: Stored): Promise<{ prefs: Prefs; assumed: string[] }> {
  const assumed: string[] = [];
  const minutes = s.minutes || Infinity;
  let walk = s.walk;
  if (!walk) {
    walk = 20;
    assumed.push('걸어서 20분 이내');
  }
  const budget = s.budget || Infinity;
  return { prefs: { need: s.need ?? null, energy: s.energy ?? null, want: s.want ?? [], avoid: s.avoid ?? [], minutes, walk, budget }, assumed };
}

async function getSession(userId: number, sessionId: unknown): Promise<Session> {
  const id = toId(sessionId);
  if (id > 0) {
    const [s] = await query<Session>(`SELECT id, prefs, asks, seen FROM chat_sessions WHERE id = $1 AND user_id = $2`, [id, userId]);
    if (s) return s;
  }
  const [s] = await query<Session>(`INSERT INTO chat_sessions(user_id) VALUES ($1) RETURNING id, prefs, asks, seen`, [userId]);
  return s;
}
const say = (sessionId: number, role: string, text: string) =>
  query(`INSERT INTO messages(session_id, role, text) VALUES ($1,$2,$3)`, [sessionId, role, text]);
const save = (s: Session) => query(`UPDATE chat_sessions SET prefs = $2, asks = $3, seen = $4 WHERE id = $1`, [s.id, JSON.stringify(s.prefs), s.asks, s.seen]);

/** 점수 순서 상위 TALK_SHOW개에 AI가 이유를 붙인다. 순서는 바꾸지 않고, AI가 실패하거나 빠뜨린 것은 점수 근거로 이유를 만든다. */
async function withReasons(userId: number, message: string, prefs: Prefs, items: Scored[], client = defaultClient) {
  const top = items.slice(0, TALK_SHOW);
  const out = await callJson(
    client,
    BUNNY_PROMPT + REASON_FORMAT,
    `${await memoryContext(userId)}친구가 방금 한 말: "${message}"\n읽어 낸 필요: ${prefs.need ?? '모름'}, 기운: ${prefs.energy ?? '모름'}\n후보: ${JSON.stringify(
      top.map((c) => ({ id: c.id, title: c.title, 걸어서: `${c.walkMinutes}분`, 근거: c.why })),
    )}`,
    ReasonOut,
  );
  const reasons = new Map((out?.picks ?? []).map((p) => [p.id, p.reason.trim()]));
  return { items: top.map((c) => ({ ...c, reason: reasons.get(c.id) || ruleReason(c) })), fallback: !out };
}
const ruleReason = (c: Scored) => `${c.why.filter((w) => !w.startsWith('지금 기운')).map((w) => w.replace(/ [+-]\d+$/, '')).join(', ')}. 걸어서 ${c.walkMinutes}분이야.`;

const support = (p: Stored) => (p.watch ? { support: SUPPORT } : {});

const safetyReply = async (userId: number, sessionId: number) => {
  await setSafeMode(userId, true);
  await say(sessionId, 'assistant', SAFETY_REPLY);
  return { status: 200, body: { sessionId, action: 'safety', reply: SAFETY_REPLY, state: 'SAFETY' } };
};

export async function handleTalk(userId: number, body: any, client = defaultClient) {
  const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 500) : '';
  if (!message) return { status: 400, body: { error: '하고 싶은 말을 적어 줘.' } };
  const s = await getSession(userId, body?.sessionId);
  await say(s.id, 'user', message);
  if (SafetyGuard.check(message) || (await isSafeMode(userId))) return safetyReply(userId, s.id);

  const history = await query<{ role: string; text: string }>(
    `SELECT role, text FROM (SELECT * FROM messages WHERE session_id = $1 ORDER BY id DESC LIMIT 10) m ORDER BY id`,
    [s.id],
  );
  const out = await callJson(
    client,
    BUNNY_PROMPT + TALK_FORMAT,
    `${await memoryContext(userId)}지금까지 질문한 횟수: ${s.asks}\n앞서 읽어 낸 것: ${JSON.stringify(s.prefs)}\n대화:\n${history
      .map((m) => `${m.role === 'user' ? '친구' : '토끼'}: ${m.text}`)
      .join('\n')}`,
    TalkOut,
  );
  if (out?.risk === 'CRISIS') return safetyReply(userId, s.id);
  void learnFromTurn(userId, message, client); // 기억 갱신은 기다리지 않는다

  s.prefs = mergePrefs(s.prefs, out, message);
  // 묻기는 코드가 정한다: 필요를 모르고, 아직 덜 물었을 때만
  if (!s.prefs.need && s.asks < TALK_MAX_ASKS && !justPick(message)) {
    s.asks++;
    const reply = out?.action === 'ask' && out.reply ? out.reply : '그랬구나. 오늘은 어떤 쪽이 끌려?';
    await say(s.id, 'assistant', reply);
    await save(s);
    return { status: 200, body: { sessionId: s.id, action: 'ask', reply, quickReplies: NEED_CHOICES.map((c) => c.label), ...support(s.prefs), ...(out ? {} : { fallback: true }) } };
  }

  const { prefs, assumed } = await fillPrefs(s.prefs);
  // 체험 DB(영남대 근처 예시 매장) + 실시간으로 찾은 근처 가게(어느 동네에서든). 같은 가게면 체험 DB 쪽을 남긴다
  const cands = await allCandidates(validLatLng(body?.lat, body?.lng));
  const done = await query<{ id: string; tags: string[]; before: number | null; after: number }>(
    `SELECT e.id, e.tags, b.mood_before AS before, b.mood_after AS after FROM bookings b JOIN experiences e ON e.id = b.experience_id
     WHERE b.user_id = $1 AND b.status = 'DONE'`,
    [userId],
  );
  const ranked = rankFresh(cands, prefs, historyEffects(done), s.seen, s.prefs.locked ?? []);
  const assumptions = [...assumed, ...ranked.relaxed.map((r) => `맞는 데가 없어서 ${r}`)].join(', ');

  if (!ranked.items.length) {
    // 근처에 체험도 실시간 가게도 아예 없으면 조건을 넓혀도 소용없으니 장소를 바꾸자고 한다
    const reply = cands.length
      ? '지금 조건에 딱 맞는 데가 근처에 없어. 조금 넓혀서 볼까?'
      : '이 근처에서 지금 찾을 수 있는 곳이 없어. 마이페이지에서 장소를 바꿔 볼래?';
    await say(s.id, 'assistant', reply);
    await save(s);
    return { status: 200, body: { sessionId: s.id, action: 'none', reply, assumptions, items: [], quickReplies: cands.length ? ['조금 멀어도 괜찮아', '예산 조금 더 써도 돼'] : [], ...support(s.prefs) } };
  }
  // 실제 사진은 AI가 이유를 쓰는 동안 같이 받아서 카드와 함께 보낸다 (화면이 그림을 띄웠다가 사진으로 바꾸지 않게)
  const [reasoned, photos] = await Promise.all([
    withReasons(userId, message, prefs, ranked.items, client),
    Promise.all(ranked.items.slice(0, TALK_SHOW).map(photoForItem)),
  ]);
  const { fallback } = reasoned;
  const items = reasoned.items.map((c, i) => ({ ...c, photo: photos[i] }));
  s.seen = [...new Set([...s.seen, ...items.map((i) => i.id)])];
  s.prefs.lastTop = { walk: items[0].walkMinutes, price: items[0].price, energyNeed: items[0].energyNeed };
  const reply = ranked.repeat
    ? '새로운 건 더 없어서, 아까 본 것 중에 다시 골라 봤어.'
    : (out?.action === 'recommend' && out.reply) || '가까운 데서 지금 할 만한 걸 찾아봤어.';
  await say(s.id, 'assistant', `${reply} (${items.map((i) => i.title).join(', ')})`);
  await save(s);
  return {
    status: 200,
    body: {
      sessionId: s.id,
      action: 'recommend',
      reply,
      assumptions, // 화면에 "한 시간 안쪽, 걸어서 20분 이내, 지난번처럼 2만원 안쪽으로 찾아봤어"처럼 보여 주고 고칠 수 있게
      prefs: { need: prefs.need, energy: prefs.energy, want: prefs.want, avoid: prefs.avoid },
      items: items.map(({ why, fit, ...i }) => i), // 점수 근거(why)는 서버 로그·이유 작성용
      quickReplies: AFTER_RECOMMEND,
      ...support(s.prefs),
      ...(out && !fallback ? {} : { fallback: true }),
    },
  };
}
