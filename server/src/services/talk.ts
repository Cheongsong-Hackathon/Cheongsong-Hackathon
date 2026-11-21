// 대화로 추천받기: 사용자가 기분을 말하면 AI가 필요·조건을 읽고, 코드가 거르고 점수를 매겨 실제 주변 체험만 추천한다.
// AI: 말에서 필요 읽기, 질문 문장, 추천 순서·이유 / 코드: 묻기·추천 결정, 조건 지키기, 후보 밖 금지, 채워 넣기 금지
import { z } from 'zod';
import { config } from '../config.js';
import { query, toId } from '../db.js';
import { searchPos, validLatLng } from '../geo.js';
import { BUNNY_PROMPT, callJson, defaultClient, RISK_RULE, routed } from './llm.js';
import { ENERGIES, historyEffects, NEEDS, rankFresh, TAGS, type Energy, type Need, type Prefs, type Scored, type Tag } from './match.js';
import { learnFromTurn, memoryContext } from './memory.js';
import { photoFirst, photoForItem } from './googlePhoto.js';
export { photoFirst } from './googlePhoto.js';
import { allCandidates } from './livePlaces.js';
import { currentWeather, weatherAdvice, weatherLine } from './weather.js';
import { isSafeMode, Risk, SAFETY_REPLY, SafetyGuard, setSafeMode, SUPPORT } from './safety.js';

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
  // 대화가 중심이고 추천은 부가 기능: 친구가 갈 곳을 원할 때만 recommend
  action: z.enum(['talk', 'recommend']).catch('talk'),
  // 스킬: 대화 중에 실제 기능을 연다. 놀이(타로·운세·끝말잇기·밸런스), 기록(다녀온 곳 돌아보기). 날씨는 추천에 늘 반영
  skill: z.enum(['없음', '놀이', '기록']).catch('없음'),
  game: z.enum(['없음', 'tarot', 'fortune', 'words', 'balance']).catch('없음'),
});

export const TALK_FORMAT = `
지금은 친구와 이야기하는 중이야. 이야기를 들어 주고 받아 주는 게 먼저고, 갈 곳 추천은 친구가 원할 때만 해.
친구의 말에서 아래를 읽어 내 (나중에 추천을 원하면 쓰려고). 직접 말하지 않아도 말투와 사정에서 추론해. 정말 알 수 없을 때만 "모름" 또는 0.
- need (지금 무엇이 필요한가. 겉말보다 속마음 기준):
  비우기(생각이 많아 머리를 끄고 싶음: "머리가 꽉 찼어") | 쉬기(지치거나 불안해서 긴장을 풀고 쉬고 싶음: "기빨렸어", "불안해") |
  풀기(화·답답함을 밖으로 털어내고 싶음: "개빡침", "땀 빼고 싶어") | 몰입(무언가를 해 보고 해내고 싶음: "뭐 하나 제대로 해 보고 싶어") |
  즐기기(심심해서 재미와 자극이 필요함: "심심해", "재밌는 거 없나") | 연결(외로워서 누군가와 함께하고 싶음: "외로워", "누구랑 있고 싶어") | 모름
  헷갈리면: 머리가 문제면 비우기, 몸·기운이 문제면 쉬기 / 생각을 없애려면 비우기, 무언가를 해내려면 몰입
- energy: 거의 없음 | 낮음 | 보통 | 높음 | 모름
- want, avoid: 다음 중에서만 고른 배열: ${TAGS.join(', ')}. avoid는 싫다고 했거나 지금 상태로 싫어할 게 분명한 것만
- minutes, walk(도보 분), budget(원): 친구가 그런 말을 했을 때만 숫자로 ("잠깐"=30, "가까운 데"=도보 10, "싸게"=10000). 아니면 0
- feedback: 앞서 보여 준 추천에 대한 반응. 멀어 | 힘들어 | 비싸 | 별로 | 다른거 | 없음
- action: 친구가 갈 곳·할 거리를 찾아 달라고 하거나("추천해 줘", "어디 갈까", "뭐 하지", "나가고 싶어") 앞서 보여 준 추천에 반응하면 "recommend". 그 밖에는 모두 "talk"
- reply: talk면 친구 말에 맞장구치고 이야기를 이어 가는 2~3문장. 궁금한 게 있으면 친구 이야기에 대한 질문 하나까지. 장소나 활동을 먼저 권하지 마.
  recommend면 공감 한 문장 + "가까운 데서 찾아봤어" 같은 한 문장. 체험 이름·가격·거리는 쓰지 마 (카드로 보여 줌)
  "지금 날씨"가 주어지고 비·눈이 오거나 아주 춥거나 더우면, recommend 답장에서 자연스럽게 짚어 (예: "비 오니까 실내로 찾아봤어")
- skill: 친구가 놀자고 하거나 타로·운세·사주·끝말잇기·밸런스 게임을 하고 싶어 하면 "놀이", 지난번에 다녀온 곳·기록을 물으면 "기록", 그 밖에는 "없음"
  놀이면 reply는 질문 없이 바로 게임을 연다는 신나는 한 문장 (예: "좋아, 타로 한 장 뽑으러 가자!"). 화면에 게임 열기 버튼이 따로 나옴
- game: skill이 놀이일 때 tarot(타로) | fortune(운세·사주) | words(끝말잇기) | balance(밸런스 게임). 딱 말하지 않았으면 balance. 놀이가 아니면 "없음"
아래 JSON 하나만 출력해.
{"reply":"","risk":"NONE","need":"모름","energy":"모름","want":[],"avoid":[],"minutes":0,"walk":0,"budget":0,"feedback":"없음","action":"talk","skill":"없음","game":"없음"}
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
  offer?: 'play' | 'place'; // 무무가 방금 먼저 권한 것 (다음 말이 "응"이면 바로 연다)
  offered?: boolean; // 이 대화에서 이미 한 번 권했음 (다시 권하지 않는다)
};

/** 무무가 먼저 권하기: 이야기를 두 번 나눴고 읽은 게 있을 때 한 번만. 기운이 낮으면 집에서 놀기, 아니면 근처 장소 */
export function nextOffer(p: Stored, talks: number): 'play' | 'place' | null {
  if (p.offered || talks < 2 || (!p.need && !p.energy)) return null;
  return p.energy === '거의 없음' || p.energy === '낮음' ? 'play' : 'place';
}
const OFFER_LINE = { play: '기운이 없어 보이는데, 나가기 전에 나랑 가볍게 한 판 놀래?', place: '근처에 기분 전환할 만한 데 찾아 줄까?' };
const OFFER_REPLIES = { play: ['응, 놀자', '근처 갈 곳 찾아 줘', '괜찮아'], place: ['응, 찾아 줘', '같이 놀자', '괜찮아'] };
/** 권하는 말을 붙일 때는 무무의 마지막 질문 문장을 뺀다 (질문이 두 개가 되지 않게). 질문뿐이면 전부 빠진다 */
export const dropLastQuestion = (reply: string) => reply.trim().replace(/(^|[.!?~]\s+)[^.!?~]*\?\s*$/, '$1').trim();
/** 권한 것에 대한 대답이 "응"인가 */
export const saidYes = (m: string) => !/아니|싫|괜찮아|됐어|얘기나/.test(m) && /^\s*(응|ㅇㅇ|웅|어|그래|좋아|네|넵|ㅇㅋ|오케이|콜)/.test(m);
type Session = { id: number; prefs: Stored; asks: number; seen: string[] };

// ---- 추천 근거 (화면 "왜 여기?"): 점수를 실제로 올린 사실만, 사람이 읽는 말로 ----
const NEED_LABEL: Record<string, string> = { 쉬기: '쉬고 싶은 마음', 비우기: '생각 비우기', 풀기: '답답함 풀기', 몰입: '뭔가 해내기', 즐기기: '새로운 재미', 연결: '함께하고 싶은 마음' };
/** 점수 이유(why) → 근거 칩. 감점·"가까움"은 빼고, 걸어서 몇 분은 늘 붙인다 (많아도 4개) */
export function evidenceOf(why: string[], walkMinutes: number): string[] {
  const out: string[] = [];
  for (const w of why) {
    let m: RegExpMatchArray | null;
    if ((m = w.match(/^(.+?)에 맞음\((.+)\) \+\d+$/))) out.push(`${m[2].split(', ').join('·')} → ${NEED_LABEL[m[1]] ?? m[1]}에 맞음`);
    else if ((m = w.match(/^원하는 것\((.+)\) \+\d+$/))) out.push(`말한 대로 ${m[1].split(', ').join('·')}`);
    else if (w.startsWith('지금 기운으로 할 만함')) out.push('지금 기운으로 할 만함');
    else if (w.startsWith('전에 해 보고 기분이 올랐음')) out.push('전에 다녀와서 기분이 올랐던 곳');
    else if (w.startsWith('비슷한 체험 뒤 기분이 올랐음')) out.push('비슷한 곳 다녀와서 기분이 올랐음');
  }
  return [...out.slice(0, 3), `걸어서 ${walkMinutes}분`];
}
/** 왜 기분 전환이 되나: 필요별로 확인한 연구 한 줄 (AI가 쓰지 않는다). 출처는 docs/추천근거_연구.md */
// 상관 연구는 "관련 있었다"로만 쓴다. 장소 하나하나가 아니라 활동 유형에 대한 근거다
export const NEED_SCIENCE: Partial<Record<string, { text: string; source: string; url: string }>> = {
  쉬기: { text: '퇴근 후 일에서 마음을 떼고 쉬는 경험이 피로가 덜한 것과 관련 있었다는 메타분석', source: 'Bennett 외(2018), Journal of Organizational Behavior', url: 'https://doi.org/10.1002/job.2217' },
  비우기: { text: '도시 대신 자연 속을 90분 걸은 사람들의 곱씹는 생각(반추)이 줄었다는 연구', source: 'Bratman 외(2015), PNAS', url: 'https://doi.org/10.1073/pnas.1510459112' },
  풀기: { text: '한 번의 운동만으로도 그 순간의 불안이 조금 줄었다는 메타분석', source: 'Ensari 외(2015), Depression and Anxiety', url: 'https://doi.org/10.1002/da.22370' },
  몰입: { text: '창작 활동을 평소보다 많이 한 다음 날 활기찬 기분과 웰빙이 더 높았다는 연구', source: 'Conner 외(2018), Journal of Positive Psychology', url: 'https://doi.org/10.1080/17439760.2016.1257049' },
  즐기기: { text: '여러 다른 곳을 다닌 날일수록 긍정적인 기분이 더 컸다는 연구', source: 'Heller 외(2020), Nature Neuroscience', url: 'https://doi.org/10.1038/s41593-020-0636-4' },
  연결: { text: '사람들과 더 자주, 더 깊게 대화한 순간에 행복감과 유대감이 높았다는 연구', source: 'Sun 외(2020), Journal of Personality and Social Psychology', url: 'https://doi.org/10.1037/pspp0000272' },
};

/** AI가 없거나 스킬을 놓쳤을 때 말에서 바로 고르기 */
export function ruleSkill(m: string): { skill: '없음' | '놀이' | '기록'; game: 'tarot' | 'fortune' | 'words' | 'balance' } {
  const game = /타로/.test(m) ? 'tarot' : /운세|사주/.test(m) ? 'fortune' : /끝말/.test(m) ? 'words' : 'balance';
  if (/타로|운세|사주|끝말|밸런스|게임\s*(하|할|해)|놀자|놀아\s*줘/.test(m)) return { skill: '놀이', game };
  if (/다녀온|갔던|가\s*봤던|지난번에.*(간|갔)|방문\s*기록|기분\s*기록/.test(m)) return { skill: '기록', game };
  return { skill: '없음', game };
}

/** 스킬 "기록": 최근 다녀온 곳과 기분 변화(전→후). 기분이 가장 많이 오른 곳을 짚는다 */
async function recentVisits(userId: number): Promise<string> {
  const rows = await query<{ name: string | null; before: number | null; after: number | null }>(
    `SELECT COALESCE(p.name, b.live_place) AS name, b.mood_before AS before, b.mood_after AS after
     FROM bookings b LEFT JOIN experiences e ON e.id = b.experience_id LEFT JOIN places p ON p.id = e.place_id
     WHERE b.user_id = $1 AND b.status = 'DONE' ORDER BY b.completed_at DESC NULLS LAST, b.id DESC LIMIT 3`,
    [userId],
  );
  const list = rows.filter((r) => r.name);
  if (!list.length) return '아직 다녀온 곳 기록이 없어. 오늘 가까운 데 한 곳 같이 찾아볼까?';
  const text = list.map((r) => (r.before != null && r.after != null ? `${r.name}(기분 ${r.before}→${r.after}점)` : r.name)).join(', ');
  const best = list.filter((r) => r.before != null && r.after != null).sort((a, b) => b.after! - b.before! - (a.after! - a.before!))[0];
  return `최근에 다녀온 곳은 ${text}이야.${best && best.after! > best.before! ? ` ${best.name} 다녀와서 기분이 제일 많이 올랐네!` : ''} 비슷한 곳 찾아 줄까?`;
}

/** "그냥 추천해 줘", "아무거나": 고르기 싫다는 뜻이라 되묻지 않고 기본값으로 바로 추천한다 */
export const justPick = (m: string) => /아무거나|알아서/.test(m) || (/그냥|상관없/.test(m) && /추천|골라|찾아|보여/.test(m));

/** 갈 곳을 직접 찾는 말: AI가 talk로 놓쳐도 추천으로 간다 */
export const wantsPlace = (m: string) =>
  justPick(m) || /추천|어디\s*(갈|가)|뭐\s*(하지|할까)|갈\s*(곳|데|만한)|할\s*만한|찾아\s*(줘|봐|줄)|나가고\s*싶/.test(m);
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
async function withReasons(userId: number, message: string, prefs: Prefs, items: Scored[], client = defaultClient, show = TALK_SHOW) {
  const top = items.slice(0, show);
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

  const pos = searchPos(validLatLng(body?.lat, body?.lng));
  const [history, weather] = await Promise.all([
    query<{ role: string; text: string }>(
      `SELECT role, text FROM (SELECT * FROM messages WHERE session_id = $1 ORDER BY id DESC LIMIT 10) m ORDER BY id`,
      [s.id],
    ),
    currentWeather(pos), // 스킬 "날씨": 키가 없으면 null (10분 캐시)
  ]);
  const out = await callJson(
    client,
    BUNNY_PROMPT + TALK_FORMAT,
    `${await memoryContext(userId)}${weatherLine(weather)}지금까지 질문한 횟수: ${s.asks}\n앞서 읽어 낸 것: ${JSON.stringify(s.prefs)}\n대화:\n${history
      .map((m) => `${m.role === 'user' ? '친구' : '토끼'}: ${m.text}`)
      .join('\n')}`,
    TalkOut,
  );
  if (out?.risk === 'CRISIS') return safetyReply(userId, s.id);
  void learnFromTurn(userId, message, routed('memory', client)); // 기억 갱신은 기다리지 않는다

  s.prefs = mergePrefs(s.prefs, out, message);
  // 무무가 방금 권한 것에 "응"이라고 했으면 그대로 연다 (권한 건 한 턴만 유효)
  const accepted = s.prefs.offer && saidYes(message) ? s.prefs.offer : null;
  delete s.prefs.offer;

  // 스킬: AI가 고른 것, 놓쳤으면 말 속 단어로
  const rule = ruleSkill(message);
  const skill = accepted === 'play' ? '놀이' : out && out.skill !== '없음' ? out.skill : rule.skill;
  if (skill === '놀이') {
    const game = out && out.game !== '없음' ? out.game : rule.game;
    const reply = (out?.skill === '놀이' && out.reply) || '좋아, 같이 놀자!';
    await say(s.id, 'assistant', reply);
    await save(s);
    return { status: 200, body: { sessionId: s.id, action: 'play', game, reply, quickReplies: ['근처 갈 곳도 찾아 줘'], ...support(s.prefs) } };
  }
  if (skill === '기록') {
    const reply = await recentVisits(userId);
    await say(s.id, 'assistant', reply);
    await save(s);
    return { status: 200, body: { sessionId: s.id, action: 'none', reply, quickReplies: ['비슷한 곳 찾아 줘', '근처 갈 곳 찾아 줘'], ...support(s.prefs) } };
  }

  // 기본은 대화. 추천은 친구가 원하거나(말·AI 판단) 앞서 본 추천에 반응할 때만
  const reacted = !!s.prefs.lastTop && keywordFeedback(message) !== '없음';
  if (out?.action !== 'recommend' && !wantsPlace(message) && !reacted && accepted !== 'place') {
    s.asks++; // 이 대화에서 이야기만 나눈 횟수
    // 알맞은 때 무무가 먼저 한 번 권한다: 기운이 낮으면 집에서 놀기, 아니면 근처 장소. 카드는 "응" 한 뒤에만
    const offer = nextOffer(s.prefs, s.asks);
    if (offer) Object.assign(s.prefs, { offer, offered: true });
    const said = (out?.action === 'talk' && out.reply) || '그랬구나. 더 얘기해 줄래?';
    const reply = offer ? `${dropLastQuestion(said)} ${OFFER_LINE[offer]}`.trim() : said;
    await say(s.id, 'assistant', reply);
    await save(s);
    const quickReplies = offer ? OFFER_REPLIES[offer] : s.asks >= 2 ? ['같이 놀자', '근처 갈 곳 찾아 줘'] : ['같이 놀자'];
    return { status: 200, body: { sessionId: s.id, action: 'talk', reply, quickReplies, ...support(s.prefs), ...(out ? {} : { fallback: true }) } };
  }

  const { prefs, assumed } = await fillPrefs(s.prefs);
  // 스킬 "날씨": 비·눈·한파·폭염이면 바깥 활동(공원·산책)을 빼고 실내 위주로 (본인이 바깥을 원하면 그대로)
  const advice = weatherAdvice(weather);
  if (advice && !prefs.want.includes('바깥')) {
    prefs.avoid = [...new Set([...prefs.avoid, '바깥' as Tag])];
    assumed.push(advice);
  }
  // 체험 DB(영남대 근처 예시 매장) + 실시간으로 찾은 근처 가게(어느 동네에서든). 같은 가게면 체험 DB 쪽을 남긴다
  const cands = await allCandidates(pos);
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
  // 시연 위치 고정이면 후보를 넓게(8곳) 보고 사진 있는 곳을 먼저 고른다
  const pool = config.demoPin ? 8 : TALK_SHOW;
  const [reasoned, photos] = await Promise.all([
    withReasons(userId, message, prefs, ranked.items, routed('reason', client), pool),
    Promise.all(ranked.items.slice(0, pool).map(photoForItem)),
  ]);
  const { fallback } = reasoned;
  const items = photoFirst(reasoned.items, photos, TALK_SHOW, config.demoPin);
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
      // 점수 근거(why)는 사람이 읽는 근거 칩(evidence)으로 바꿔 함께 보낸다 → 카드의 "왜 여기?"
      items: items.map(({ why, fit, ...i }) => ({ ...i, evidence: evidenceOf(why, i.walkMinutes) })),
      science: (prefs.need && NEED_SCIENCE[prefs.need]) || null,
      quickReplies: AFTER_RECOMMEND,
      ...support(s.prefs),
      ...(out && !fallback ? {} : { fallback: true }),
    },
  };
}
