import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EXPERIENCES } from '../src/setup.js';
import { LIVE_KINDS } from '../src/services/livePlaces.js';
import { GROUPS, groupOf, MOODS, parseGroups, parseMood, picksPrefs, reasonChips, travelMinutes, withTags } from '../src/services/picks.js';
import type { Scored } from '../src/services/match.js';

test('기분 카드 6개: 각각 필요·기운·한마디·작은 제안이 있다 (모르는 값은 null)', () => {
  assert.deepEqual(Object.keys(MOODS), ['tired', 'low', 'stressed', 'bored', 'good', 'plain']);
  for (const m of Object.values(MOODS)) assert.ok(m.label && m.need && m.energy && m.headline && m.suggestion);
  assert.equal(MOODS.tired.need, '쉬기');
  assert.equal(MOODS.tired.energy, '낮음');
  assert.equal(MOODS.stressed.need, '풀기');
  assert.equal(parseMood('tired'), 'tired');
  assert.equal(parseMood('angry'), null);
});

test('모든 가게 종류(실시간 15종·예시 체험 10개)가 시안의 활동 유형 하나에 들어간다', () => {
  for (const key of Object.keys(LIVE_KINDS)) assert.ok(GROUPS[groupOf({ id: `live:${key}:1`, live: true })], key);
  for (const [id] of EXPERIENCES) assert.ok(GROUPS[groupOf({ id })], id);
  assert.equal(groupOf({ id: 'live:museum:9', live: true }), 'exhibit');
  assert.equal(groupOf({ id: 'quiet-cafe' }), 'cafe');
  assert.equal(groupOf({ id: 'my-scent' }), 'class');
});

test('활동 유형·혼자/함께·이동 시간 읽기 (이상한 값은 버리거나 기본값)', () => {
  assert.deepEqual(parseGroups('cafe,exhibit,술집'), ['cafe', 'exhibit']);
  assert.deepEqual(parseGroups(undefined), []);
  assert.deepEqual(withTags('solo'), ['혼자 가능']);
  assert.deepEqual(withTags('pair'), ['같이 하기']);
  assert.deepEqual(withTags('group'), ['같이 하기']);
  assert.deepEqual(withTags('?'), []);
  assert.equal(travelMinutes('15'), 15);
  assert.equal(travelMinutes('60'), 60);
  assert.equal(travelMinutes(undefined), 20); // 설문 근거 기본값 (docs/설계근거_점검.md)
  assert.equal(travelMinutes('999'), 20);
});

test('추천 조건: 기분 카드의 필요·기운 + 혼자/함께는 원함으로, 시간·예산은 거르지 않음', () => {
  const p = picksPrefs('tired', 'solo', 30);
  assert.equal(p.need, '쉬기');
  assert.equal(p.energy, '낮음');
  assert.deepEqual(p.want, ['혼자 가능']);
  assert.equal(p.walk, 30);
  assert.equal(p.minutes, Infinity);
  assert.equal(p.budget, Infinity);
  assert.equal(picksPrefs(null, null, 20).need, null);
});

test('추천 이유 칩: 기분 회복 + 이동 시간 + 특징, 많아도 3개', () => {
  const s = { id: 'x', tags: ['조용함', '혼자 가능', '가만히 쉬기', '실내'], walkMinutes: 12, why: ['쉬기에 맞음(가만히 쉬기, 조용함) +4'] } as unknown as Scored;
  const chips = reasonChips(s, 'tired', 30, 'solo');
  assert.ok(chips.length <= 3);
  assert.equal(chips[0], MOODS.tired.chip);
  assert.ok(chips.includes('30분 이내'));
  assert.ok(chips.some((c) => c === '조용한 분위기' || c === '혼자 가기 좋음'));
});
