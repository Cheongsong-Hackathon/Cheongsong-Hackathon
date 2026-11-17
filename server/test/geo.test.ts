import assert from 'node:assert/strict';
import { test } from 'node:test';
import { haversineM, offsetM } from '../src/geo.js';

test('offsetM으로 옮긴 좌표는 haversineM으로 같은 거리가 나온다', () => {
  const c = { lat: 36.4359, lng: 129.0571 };
  assert.ok(Math.abs(haversineM(c, offsetM(c, 0, 450)) - 450) < 2);
  assert.ok(Math.abs(haversineM(c, offsetM(c, 720, -960)) - 1200) < 3);
});
