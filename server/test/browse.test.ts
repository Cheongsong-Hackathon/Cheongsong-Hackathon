import assert from 'node:assert/strict';
import { test } from 'node:test';
import { browsePrefs, parseNeed } from '../src/services/browse.js';

test('둘러보기: 필요는 6가지 중에서만 (이상한 값·빈 값은 "전체")', () => {
  assert.equal(parseNeed('풀기'), '풀기');
  assert.equal(parseNeed('술'), null);
  assert.equal(parseNeed(undefined), null);
});

test('둘러보기 조건: 기운·시간·예산은 모르니 거르지 않고, 도보는 기본 20분 (설문 근거)', () => {
  const p = browsePrefs('쉬기');
  assert.equal(p.need, '쉬기');
  assert.equal(p.energy, null);
  assert.equal(p.walk, 20);
  assert.equal(p.minutes, Infinity);
  assert.equal(p.budget, Infinity);
  assert.deepEqual([p.want, p.avoid], [[], []]);
});
