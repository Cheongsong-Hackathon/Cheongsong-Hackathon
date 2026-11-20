import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseSaveInput } from '../src/services/saved.js';

test('찜 입력: 실시간 가게는 종류·이름·좌표만 받고(제목은 서버 목록), 예시 매장은 id만', () => {
  assert.deepEqual(parseSaveInput({ itemId: 'live:cafe:123', placeName: ' 카페솜 ', lat: 35.83, lng: 128.75, title: '아무거나' }), {
    live: true, itemId: 'live:cafe:123', kind: 'cafe', placeName: '카페솜', lat: 35.83, lng: 128.75,
  });
  assert.deepEqual(parseSaveInput({ itemId: 'quiet-cafe' }), { live: false, itemId: 'quiet-cafe' });
  assert.equal(parseSaveInput({ itemId: 'live:bar:1', placeName: 'x', lat: 35, lng: 128 }), null); // 목록에 없는 종류
  assert.equal(parseSaveInput({ itemId: 'live:cafe:1', placeName: 'x' }), null); // 좌표 없음
  assert.equal(parseSaveInput({ itemId: '' }), null);
  assert.equal(parseSaveInput({ itemId: 'x'.repeat(80) }), null);
});
