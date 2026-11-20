import assert from 'node:assert/strict';
import { test } from 'node:test';
import { kmaBaseTime, toKmaGrid, weatherAdvice } from '../src/services/weather.js';

test('기상청 격자 변환: 서울시청 (60, 127), 기상청 공식 예시 근처', () => {
  assert.deepEqual(toKmaGrid(37.5665, 126.978), { nx: 60, ny: 127 });
  const g = toKmaGrid(35.8318613, 128.7585416); // 영남대
  assert.ok(g.nx > 85 && g.nx < 95 && g.ny > 85 && g.ny < 95, JSON.stringify(g));
});

test('기상청 발표 시각: 정시 45분 전이면 한 시간 전 자료 (한국 시각, 날짜 넘김 포함)', () => {
  assert.deepEqual(kmaBaseTime(new Date('2026-11-20T10:50:00Z')), { base_date: '20261120', base_time: '1900' }); // KST 19:50
  assert.deepEqual(kmaBaseTime(new Date('2026-11-20T10:30:00Z')), { base_date: '20261120', base_time: '1800' }); // KST 19:30
  assert.deepEqual(kmaBaseTime(new Date('2026-11-20T15:20:00Z')), { base_date: '20261120', base_time: '2300' }); // KST 00:20 → 전날 23시
});

test('날씨 반영: 비·눈·뇌우·한파·폭염이면 실내 위주, 맑거나 흐리면 그대로', () => {
  assert.match(weatherAdvice({ id: 501, desc: '비', temp: 12 })!, /비가 와서/);
  assert.match(weatherAdvice({ id: 300, desc: '이슬비', temp: 12 })!, /비가 와서/);
  assert.match(weatherAdvice({ id: 601, desc: '눈', temp: -1 })!, /눈이 와서/);
  assert.match(weatherAdvice({ id: 211, desc: '뇌우', temp: 20 })!, /천둥/);
  assert.match(weatherAdvice({ id: 800, desc: '맑음', temp: -8 })!, /추워서/);
  assert.match(weatherAdvice({ id: 800, desc: '맑음', temp: 35 })!, /더워서/);
  assert.equal(weatherAdvice({ id: 800, desc: '맑음', temp: 18 }), null);
  assert.equal(weatherAdvice({ id: 803, desc: '흐림', temp: 10 }), null);
  assert.equal(weatherAdvice(null), null);
});
