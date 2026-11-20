import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ttsText } from '../src/services/voice.js';

test('무무 목소리로 읽을 글: 그림 문자·괄호를 빼고 300자까지, 글이 아니면 빈 문자열', () => {
  assert.equal(ttsText('오늘 많이 지쳤구나 💜 (잠깐) 쉬어 가자 ☕️'), '오늘 많이 지쳤구나 쉬어 가자');
  assert.equal(ttsText('가'.repeat(400)).length, 300);
  assert.equal(ttsText(42), '');
  assert.equal(ttsText('   💜  '), '');
});
