// 대화에서 읽어 낸 필요·조건으로 체험을 거르고 점수를 매긴다 (AI 없이 동작, 점수마다 근거를 남김).
// AI는 이 결과 안에서 순서를 다듬고 이유를 쓸 뿐, 조건을 넘거나 후보 밖을 고를 수 없다.
import type { Candidate } from './recommend.js';

/** 체험 특징 태그 (고정). 대화에서 뽑는 "원함·피함"도 이 안에서만 고른다. */
export const TAGS = ['조용함', '사람 많음', '혼자 가능', '같이 하기', '손으로 만들기', '몸 쓰기', '소리 내기', '가만히 쉬기', '실내', '바깥'] as const;
export type Tag = (typeof TAGS)[number];

/**
 * 사용자가 말한 기분을 "무엇이 필요한가"로 번역한 것. 회복·기분 조절 연구를 바탕으로 6가지 (근거: docs/필요분류_근거.md)
 * - 비우기: 심리적 분리 (Sonnentag & Fritz 2007; Newman 외 2014 DRAMMA의 Detachment), 주의 돌리기 (Parkinson & Totterdell 1999)
 * - 쉬기:   이완 (Sonnentag & Fritz 2007), 긴장 낮추기 (Thayer 외 1994)
 * - 풀기:   감정 발산 (Parkinson & Totterdell 1999), 운동이 기분 바꾸기에 가장 효과적 (Thayer 외 1994)
 * - 몰입:   숙달 = 도전하고 배우고 해내기 (Sonnentag & Fritz 2007; DRAMMA의 Mastery)
 * - 즐기기: 기운 올리기 (Thayer 외 1994)
 * - 연결:   관계 (DRAMMA의 Affiliation), 사회적 지지 구하기 (Parkinson & Totterdell 1999)
 * 자율·통제(내가 고른다)는 필요가 아니라 "추천은 제안, 결정은 사용자" 원칙으로 반영. 의미(Meaning)는 지금 범위 밖.
 */
export const NEEDS = ['비우기', '쉬기', '풀기', '몰입', '즐기기', '연결'] as const;
export type Need = (typeof NEEDS)[number];
export const NEED_TAGS: Record<Need, Tag[]> = {
  비우기: ['조용함', '손으로 만들기', '가만히 쉬기'], // 생각을 끄기: 조용한 곳, 손을 바쁘게 해 주의 돌리기
  쉬기: ['가만히 쉬기', '조용함'], // 긴장을 낮추기
  풀기: ['소리 내기', '몸 쓰기'], // 밖으로 털어내기
  몰입: ['손으로 만들기', '몸 쓰기'], // 무언가를 해내기 (조용함은 비우기 쪽: 둘이 헷갈리던 경계를 이걸로 가름)
  즐기기: ['소리 내기', '같이 하기', '손으로 만들기', '몸 쓰기'], // 재미와 자극으로 기운 올리기
  연결: ['같이 하기'], // 사람과 함께
};

/** 필요와 정반대인 특징: 머리를 비우려는데 소리 지르는 곳, 쉬려는데 몸 쓰는 곳 */
export const NEED_CONFLICTS: Record<Need, Tag[]> = {
  비우기: ['소리 내기', '사람 많음'],
  쉬기: ['몸 쓰기', '소리 내기', '사람 많음'],
  풀기: [],
  몰입: ['소리 내기'],
  즐기기: [],
  연결: [],
};
/** "맞는 추천"의 근거가 되는 활동 특징. 실내·바깥·혼자 가능은 점수만 주고 근거로는 치지 않는다
 *  (실제로 "원함: 실내"만으로 코인노래방이 "머리 비우기" 추천에 끼어든 적이 있음) */
const ACTIVITY_TAGS: Tag[] = ['조용함', '사람 많음', '같이 하기', '손으로 만들기', '몸 쓰기', '소리 내기', '가만히 쉬기'];

export const ENERGIES = ['거의 없음', '낮음', '보통', '높음'] as const;
export type Energy = (typeof ENERGIES)[number];
// 임시값: 기운 % 매핑, 아래 점수 가중치, MIN_SCORE는 근거 없는 초기값. 평가 시험지로 조정할 대상 (docs/설계근거_점검.md 2절)
export const ENERGY_PCT: Record<Energy, number> = { '거의 없음': 10, 낮음: 30, 보통: 50, 높음: 75 };

export type Prefs = {
  need: Need | null;
  energy: Energy | null;
  want: Tag[];
  avoid: Tag[];
  minutes: number;
  walk: number;
  budget: number;
};
export type TaggedCandidate = Candidate & { tags: string[] };
export const withTags = (c: Candidate): TaggedCandidate => ({ ...c, tags: c.tags ?? [] });
export type Scored = TaggedCandidate & { score: number; why: string[]; fit: boolean };

export type Effects = { byExp: Map<string, number>; byTag: Map<string, number> };

/** 다녀온 체험의 기분 변화(후 - 전)를 체험별·태그별 평균으로. 도자기 4→8이면 도자기 +4, "손으로 만들기"·"조용함" +4 */
export function historyEffects(history: { id: string; tags: string[]; before: number | null; after: number }[]): Effects {
  const avg = (pairs: [string, number][]) => {
    const sum = new Map<string, { s: number; n: number }>();
    for (const [k, d] of pairs) {
      const x = sum.get(k) ?? { s: 0, n: 0 };
      sum.set(k, { s: x.s + d, n: x.n + 1 });
    }
    return new Map([...sum].map(([k, x]) => [k, x.s / x.n]));
  };
  const done = history.filter((h) => h.before != null).map((h) => ({ ...h, d: h.after - h.before! }));
  return { byExp: avg(done.map((h) => [h.id, h.d])), byTag: avg(done.flatMap((h) => h.tags.map((t) => [t, h.d] as [string, number]))) };
}
export const NO_EFFECTS: Effects = { byExp: new Map(), byTag: new Map() };

export const MIN_SCORE = 2; // 이보다 낮으면 "맞지 않는 것"으로 보고 보여 주지 않는다 (채워 넣기 금지)

/** 점수: 필요·원함과 맞는 특징, 에너지, 지난 기분 변화, 가까움. 근거(why)를 함께 남긴다. */
export function scoreOne(c: TaggedCandidate, p: Prefs, fx: Effects): Scored {
  const why: string[] = [];
  let score = 0;
  const needHits = p.need ? NEED_TAGS[p.need].filter((t) => c.tags.includes(t)) : [];
  if (needHits.length) {
    const s = Math.min(4, needHits.length * 2);
    score += s;
    why.push(`${p.need}에 맞음(${needHits.join(', ')}) +${s}`);
  }
  const wantHits = p.want.filter((t) => c.tags.includes(t) && !needHits.includes(t));
  if (wantHits.length) {
    score += wantHits.length * 2;
    why.push(`원하는 것(${wantHits.join(', ')}) +${wantHits.length * 2}`);
  }
  const pct = p.energy ? ENERGY_PCT[p.energy] : ENERGY_PCT['낮음'];
  if (c.energyNeed <= pct) {
    score += 2;
    why.push('지금 기운으로 할 만함 +2');
  } else {
    score -= 3;
    why.push('지금 기운엔 조금 버거움 -3');
  }
  // 실제로 효과가 있었던 건 그 체험이므로 같은 체험은 크게(최대 +3), 비슷한 특징은 작게(최대 +2)
  const same = fx.byExp.get(c.id);
  const similar = Math.max(0, ...c.tags.map((t) => fx.byTag.get(t) ?? 0));
  if (same != null && same > 0) {
    const s = Math.min(3, Math.round(same));
    score += s;
    why.push(`전에 해 보고 기분이 올랐음 +${s}`);
  } else if (similar > 0) {
    const s = Math.min(2, Math.round(similar));
    score += s;
    why.push(`비슷한 체험 뒤 기분이 올랐음 +${s}`);
  }
  if (c.walkMinutes <= 10) {
    score += 1;
    why.push('가까움 +1');
  }
  const conflicts = p.need ? NEED_CONFLICTS[p.need].filter((t) => c.tags.includes(t)) : [];
  if (conflicts.length) {
    score -= 4;
    why.push(`${p.need}와 반대(${conflicts.join(', ')}) -4`);
  }
  // 필요나 원함을 알고 있다면 그중 활동 특징 하나는 맞아야 "맞는 추천" (에너지·거리·실내 점수만으로 끼어들지 못하게)
  const activityHits = [...needHits, ...wantHits].filter((t) => ACTIVITY_TAGS.includes(t as Tag));
  const knows = !!p.need || p.want.some((t) => ACTIVITY_TAGS.includes(t));
  const fit = !conflicts.length && (!knows || activityHits.length > 0);
  return { ...c, score, why, fit };
}

/**
 * 반드시 지킬 조건(시간·도보·예산·오늘 남은 시간대·피할 것·이미 본 것)으로 거르고 점수순으로.
 * 하나도 없으면 도보 +10분 → 시간 +30분 → 예산 +1만원 순으로 넓힌다 (피할 것은 넓히지 않음). 넓힌 것을 relaxed로 알려 준다.
 * 기준 점수 미만은 버린다: 맞는 게 1개면 1개만.
 */
export function rankForPrefs(
  cands: TaggedCandidate[],
  p: Prefs,
  fx: Effects = NO_EFFECTS,
  seen: string[] = [],
  locked: ('walk' | 'minutes' | 'budget')[] = [], // 사용자가 직접 좁힌 조건은 넓히지 않는다
) {
  const base = cands.filter((c) => !seen.includes(c.id) && c.availableSlots.length > 0 && !p.avoid.some((t) => c.tags.includes(t)));
  const relaxSteps: [string, 'walk' | 'minutes' | 'budget', number][] = [
    ['도보 10분 더', 'walk', 10],
    ['시간 30분 더', 'minutes', 30],
    ['예산 1만원 더', 'budget', 10000],
  ];
  const steps: [string, Partial<Pick<Prefs, 'walk' | 'minutes' | 'budget'>>][] = [['', {}]];
  for (const [label, key, add] of relaxSteps.filter(([, k]) => !locked.includes(k)))
    steps.push([label, { ...steps[steps.length - 1][1], [key]: p[key] + add }]);
  const relaxed: string[] = [];
  for (const [label, over] of steps) {
    if (label) relaxed.push(label);
    const q = { ...p, ...over };
    const items = base
      .filter((c) => c.minutes <= q.minutes && c.walkMinutes <= q.walk && c.price <= q.budget)
      .map((c) => scoreOne(c, p, fx))
      .filter((s) => s.fit && s.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score || a.walkMinutes - b.walkMinutes);
    if (items.length) return { items, relaxed };
  }
  return { items: [] as Scored[], relaxed };
}
