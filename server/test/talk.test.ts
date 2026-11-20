import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dropLastQuestion, evidenceOf, photoFirst, justPick, mergePrefs, nextOffer, ruleSkill, saidYes, TalkOut, wantsPlace } from '../src/services/talk.js';

test('추천 근거 칩: 점수를 올린 사실만 사람 말로, 감점·가까움은 빼고 걸어서 몇 분은 늘', () => {
  assert.deepEqual(
    evidenceOf(['쉬기에 맞음(가만히 쉬기, 조용함) +4', '지금 기운으로 할 만함 +2', '전에 해 보고 기분이 올랐음 +3', '가까움 +1', '쉬기와 반대(소리 내기) -4'], 8),
    ['가만히 쉬기·조용함 → 쉬고 싶은 마음에 맞음', '지금 기운으로 할 만함', '전에 다녀와서 기분이 올랐던 곳', '걸어서 8분'],
  );
  assert.deepEqual(evidenceOf(['원하는 것(바깥) +2', '지금 기운엔 조금 버거움 -3'], 15), ['말한 대로 바깥', '걸어서 15분']);
});

test('스킬: AI가 놓쳐도 말 속 단어로 놀이(게임 종류)·기록을 고른다', () => {
  assert.deepEqual(ruleSkill('타로 봐 줘'), { skill: '놀이', game: 'tarot' });
  assert.deepEqual(ruleSkill('오늘 운세 어때'), { skill: '놀이', game: 'fortune' });
  assert.deepEqual(ruleSkill('끝말잇기 하자'), { skill: '놀이', game: 'words' });
  assert.equal(ruleSkill('심심해 놀자').skill, '놀이');
  assert.equal(ruleSkill('지난번에 갔던 데 어땠지?').skill, '기록');
  assert.equal(ruleSkill('지쳐서 조용히 쉬고 싶어').skill, '없음');
});

const out = (o: Record<string, unknown> = {}) => TalkOut.parse({ reply: '', risk: 'NONE', ...o });

test('대화에서 읽은 것을 합침: 새로 알게 된 것만 덮고, 모름·0은 이전 값 유지, 원함·피함은 누적', () => {
  const p1 = mergePrefs({}, out({ need: '비우기', avoid: ['사람 많음'] }), '머리 비우고 싶어, 사람 많은 데는 싫어');
  assert.equal(p1.need, '비우기');
  const p2 = mergePrefs(p1, out({ need: '모름', want: ['조용함'], minutes: 30 }), '30분 정도면 돼');
  assert.equal(p2.need, '비우기');
  assert.deepEqual(p2.avoid, ['사람 많음']);
  assert.deepEqual(p2.want, ['조용함']);
  assert.equal(p2.minutes, 30);
});

test('피드백: "멀어"는 지난 1위보다 가깝게, "비싸"는 더 싸게, "힘들어"는 기운 한 단계 낮게', () => {
  const prev = { need: '비우기' as const, energy: '보통' as const, lastTop: { walk: 20, price: 18000, energyNeed: 30 } };
  assert.equal(mergePrefs(prev, out({ feedback: '멀어' })).walk, 19);
  assert.equal(mergePrefs(prev, out({ feedback: '비싸' })).budget, 17999);
  assert.equal(mergePrefs(prev, out({ feedback: '힘들어' })).energy, '낮음');
});

test('AI가 피드백을 놓쳐도 키워드로 잡음 (시나리오 1 실패 재현), AI가 실패해도 적용', () => {
  const prev = { need: '비우기' as const, lastTop: { walk: 20, price: 18000, energyNeed: 30 } };
  assert.equal(mergePrefs(prev, out({ feedback: '없음' }), '음 좀 멀다').walk, 19); // 실제 실패: AI가 "멀었구나"라고 답하고 feedback은 "없음"
  assert.equal(mergePrefs(prev, out({ feedback: '다른거' }), '음 좀 멀다').walk, 19); // 실제 실패 2: AI가 "다른거"로 분류
  assert.equal(mergePrefs(prev, out({ feedback: '비싸' }), '음 좀 멀다').budget, 17999); // AI가 구체적이면 AI를 따름
  assert.equal(mergePrefs(prev, null, '너무 멀어').walk, 19);
  assert.equal(mergePrefs(prev, null, '좀 비싸네').budget, 17999);
  assert.equal(mergePrefs(prev, null, '오늘은 좀 힘들 것 같아').energy, '거의 없음');
  assert.equal(mergePrefs(prev, null, '좋아 이걸로 할래').walk, undefined); // 반응이 아니면 그대로
  assert.equal(mergePrefs({ need: '비우기' }, null, '멀리 가기 싫어').walk, undefined); // 추천 전에는 피드백으로 보지 않음
});

test('AI가 숫자 조건을 지어내도 사용자가 그 얘기를 안 했으면 받지 않음, "멀어"는 거리를 잠금 (시나리오 1 실패 재현)', () => {
  const prev = { need: '비우기' as const, lastTop: { walk: 20, price: 18000, energyNeed: 30 } };
  const p = mergePrefs(prev, out({ feedback: '멀어', walk: 10, budget: 10000 }), '음 좀 멀다'); // 실제 실패: 예산 1만원을 지어냄
  assert.equal(p.budget, undefined);
  assert.equal(p.walk, 19); // "멀다"는 지난 1위(20분)보다 가깝게. AI가 붙인 10분은 받지 않음 (10분 안엔 없어서 빈 추천이 됐었음)
  assert.deepEqual(p.locked, ['walk']);
  assert.equal(mergePrefs({}, out({ walk: 10 }), '가까운 데로 가고 싶어').walk, 10);
  assert.equal(mergePrefs({}, out({ budget: 15000 }), '만오천원까지 괜찮아').budget, 15000);
});

test('AI 응답이 이상해도 버티기: 모르는 값은 기본값으로', () => {
  const o = TalkOut.parse({ reply: '응', risk: '몰라', need: '아무거나', want: ['없는 태그'], minutes: '한시간' });
  assert.equal(o.need, '모름');
  assert.deepEqual(o.want, []);
  assert.equal(o.minutes, 0);
  assert.equal(o.risk, 'NONE');
});

test('위험도 WATCH면 그 대화 동안 상담 번호를 함께 보여 줌 (추천은 막지 않음, "내가 없어도 아무도 모를걸" 놓침 재현)', () => {
  const p = mergePrefs({}, out({ risk: 'WATCH', need: '연결' }), '내가 없어도 아무도 모를걸');
  assert.equal(p.watch, true);
  assert.equal(p.need, '연결'); // 추천은 계속
  assert.equal(mergePrefs(p, out({ risk: 'NONE' }), '보드게임 좋아').watch, true); // 다음 턴에도 유지
  assert.ok(!mergePrefs({}, out(), '심심해').watch);
});

test('"그냥 추천해 줘"·"아무거나"는 되묻지 않고 바로 추천 ("그냥이라니, 고민 좀 해 봐" 재현, 2026-11-19)', () => {
  for (const m of ['그냥 추천해 줘', '아무거나 골라 줘', '알아서 찾아 줘', '상관없어 아무거나'])
    assert.equal(justPick(m), true, m);
  for (const m of ['그냥 쉬고 싶어', '심심해', '그냥 그래']) assert.equal(justPick(m), false, m);
});

test('대화가 기본: 갈 곳을 찾는 말일 때만 추천으로 (2026-11-20 대화 중심 전환)', () => {
  for (const m of ['근처 갈 곳 찾아 줘', '어디 갈까', '심심한데 뭐 하지', '추천해 줘', '바람 쐬러 나가고 싶어', '아무거나'])
    assert.equal(wantsPlace(m), true, m);
  for (const m of ['오늘 진짜 지쳤어', '팀장한테 혼났어', '심심해', '그냥 그래', '머리가 꽉 찼어'])
    assert.equal(wantsPlace(m), false, m);
});

test('"그냥 추천해 줘"에서 AI가 지어낸 필요·피할 것은 받지 않음 (피할 것에 실내·바깥을 다 넣어 0건이 된 것 재현)', () => {
  const p = mergePrefs({}, out({ need: '즐기기', want: ['사람 많음'], avoid: ['조용함', '실내', '바깥'] }), '그냥 추천해 줘');
  assert.equal(p.need, undefined);
  assert.deepEqual(p.want, []);
  assert.deepEqual(p.avoid, []);
});

test('피할 것에 실내와 바깥이 함께 있으면 둘 다 뺌 (모든 체험이 걸러짐)', () => {
  const p = mergePrefs({}, out({ need: '쉬기', avoid: ['실내', '바깥', '사람 많음'] }), '사람 많은 데는 싫어');
  assert.deepEqual(p.avoid, ['사람 많음']);
  assert.equal(p.need, '쉬기');
});

test('피할 것은 말에 관련된 얘기가 있을 때만 받음: "심심해"에서 AI가 실내·몸 쓰기 등을 지어내 0건이 된 것 재현 (동성로)', () => {
  const p = mergePrefs({}, out({ need: '즐기기', avoid: ['혼자 가능', '손으로 만들기', '몸 쓰기', '실내'] }), '심심해, 재밌는 거 없을까');
  assert.deepEqual(p.avoid, []);
  assert.equal(p.need, '즐기기');
  const q = mergePrefs({}, out({ need: '쉬기', avoid: ['몸 쓰기', '사람 많음', '실내'] }), '너무 지쳐서 사람 많은 데는 싫어');
  assert.deepEqual(q.avoid, ['몸 쓰기', '사람 많음']); // 지쳐서 → 몸 쓰기, 사람 많은 → 사람 많음. 실내는 말 안 함
  const r = mergePrefs({}, out({ need: '풀기', avoid: ['실내'] }), '답답해서 기분 전환하고 싶어');
  assert.deepEqual(r.avoid, []); // "답답해"는 기분이지 실내가 싫다는 말이 아님
});

test('무무가 먼저 제안: 두 번 이야기한 뒤 한 번만, 기운이 낮으면 놀이·아니면 근처 장소', () => {
  assert.equal(nextOffer({ need: '쉬기', energy: '낮음' }, 1), null); // 아직 이야기를 덜 나눔
  assert.equal(nextOffer({}, 3), null); // 읽은 게 없으면 제안하지 않음
  assert.equal(nextOffer({ need: '쉬기', energy: '거의 없음' }, 2), 'play');
  assert.equal(nextOffer({ need: '쉬기', energy: '낮음' }, 2), 'play');
  assert.equal(nextOffer({ need: '즐기기', energy: '보통' }, 2), 'place');
  assert.equal(nextOffer({ need: '풀기' }, 4), 'place');
  assert.equal(nextOffer({ need: '풀기', offered: true }, 4), null); // 이 대화에서 이미 제안했으면 다시 권하지 않음
});

test('제안에 대한 대답: "응"은 받고, "아니·괜찮아"는 받지 않음', () => {
  for (const m of ['응', 'ㅇㅇ', '그래', '좋아!', '응 찾아 줘', '웅 놀자', '오케이']) assert.equal(saidYes(m), true, m);
  for (const m of ['아니', '괜찮아', '싫어', '됐어', '아니 괜찮아', '그냥 얘기나 하자', '응 아니야']) assert.equal(saidYes(m), false, m);
});

test('권하는 말을 붙일 때 무무의 마지막 질문은 뺌 (질문 두 개 방지)', () => {
  assert.equal(dropLastQuestion('주말엔 더 적적하지. 어떤 재미를 찾고 싶어?'), '주말엔 더 적적하지.');
  assert.equal(dropLastQuestion('고생 많았어. 지금은 푹 쉬자.'), '고생 많았어. 지금은 푹 쉬자.');
  assert.equal(dropLastQuestion('지금 기분은 어때?'), '');
});

test('시연 위치 고정: 사진 있는 곳을 먼저, 점수 순서는 유지, 모자라면 사진 없는 곳으로 채움', () => {
  const items = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));
  const photos = [null, { uri: 'b' }, null, { uri: 'd' }, null];
  assert.deepEqual(photoFirst(items, photos, 3).map((i) => i.id), ['b', 'd', 'a']);
  assert.deepEqual(photoFirst(items, photos, 2).map((i) => i.id), ['b', 'd']);
  assert.equal(photoFirst(items, photos, 3)[0].photo?.uri, 'b');
  assert.equal(photoFirst(items, photos, 3)[2].photo, null);
});

test('시연 위치 고정: 사진 있는 곳만 (하나도 없으면 그대로)', () => {
  const items = ['a', 'b', 'c'].map((id) => ({ id }));
  assert.deepEqual(photoFirst(items, [null, { uri: 'b' }, null], 3, true).map((i) => i.id), ['b']);
  assert.deepEqual(photoFirst(items, [null, null, null], 3, true).map((i) => i.id), ['a', 'b', 'c']);
});
