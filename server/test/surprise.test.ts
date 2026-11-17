import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pickSurprise, type Candidate, type Cond, type Item } from '../src/services/recommend.js';

const cand = (id: string, category: string, moods: string[], o: Partial<Candidate> = {}): Candidate => ({
  id, title: id, category, minutes: 30, price: 10000, moods, energyNeed: 20, description: '', placeId: 'p', slots: ['18:00'],
  placeName: 'p', lat: 0, lng: 0, distanceM: 600, walkMinutes: 10, availableSlots: ['18:00'], ...o,
});
const cond: Cond = { minutes: 60, walk: 20, budget: 20000, energy: 50, emotion: '지쳤어' };
const picked = [{ ...cand('cafe', 'book', ['지쳤어']), reason: '' }] as Item[];
const first = () => 0; // 무작위 대신 첫 번째

test('평소와 다른 하나: 오늘 감정과 안 맞고 다녀온 적 없는 종류에서 고름', () => {
  const all = [cand('cafe', 'book', ['지쳤어']), cand('tea', 'tea', ['지쳤어']), cand('pottery', 'pottery', ['답답해']), cand('karaoke', 'karaoke', ['심심해'])];
  const s = pickSurprise(all, picked, cond, new Set(['pottery']), [], first);
  assert.equal(s?.id, 'karaoke'); // pottery는 다녀왔고, tea는 오늘 감정(지쳤어)에 맞음
  assert.equal(s?.surprise, true);
  assert.ok(s?.reason);
});

test('평소와 다른 하나: 예산·시간은 지키고, 많이 지친 날엔 넣지 않음', () => {
  const pricey = [cand('climb', 'climbing', ['답답해'], { price: 25000 }), cand('long', 'drawing', ['심심해'], { minutes: 90 })];
  assert.equal(pickSurprise(pricey, picked, cond, new Set(), [], first), null);
  const ok = [cand('karaoke', 'karaoke', ['심심해'])];
  assert.equal(pickSurprise(ok, picked, { ...cond, energy: 15 }, new Set(), [], first), null);
});

test('평소와 다른 하나: 이미 추천했거나 본 것은 다시 고르지 않음', () => {
  const all = [cand('cafe', 'book', ['심심해']), cand('karaoke', 'karaoke', ['심심해'])];
  assert.equal(pickSurprise(all, picked, cond, new Set(), ['karaoke'], first), null);
});
