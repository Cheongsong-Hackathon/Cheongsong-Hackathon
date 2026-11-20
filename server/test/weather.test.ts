import assert from 'node:assert/strict';
import { test } from 'node:test';
import { weatherAdvice } from '../src/services/weather.js';

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
