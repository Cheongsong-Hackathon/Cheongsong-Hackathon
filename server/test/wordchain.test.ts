import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dueum, nextStarts, playWordChain } from '../src/services/wordchain.js';

test('두음법칙: 리→이, 력→역, 라→나, 녀→여, 뉴→유, 그 밖은 그대로', () => {
  assert.equal(dueum('리'), '이');
  assert.equal(dueum('력'), '역');
  assert.equal(dueum('라'), '나');
  assert.equal(dueum('록'), '녹');
  assert.equal(dueum('녀'), '여');
  assert.equal(dueum('뉴'), '유');
  assert.equal(dueum('사'), '사');
  assert.deepEqual(nextStarts('달력'), ['력', '역']);
  assert.deepEqual(nextStarts('사과'), ['과']);
});

// 규칙 위반은 AI를 부르지 않고 바로 거절한다 (client=null이어도 결과가 나옴)
test('끝말잇기 규칙: 시작 글자(두음 포함)·중복·한글은 서버가 직접 본다', async () => {
  const r1: any = await playWordChain({ history: ['사과'], word: '바다' }, null);
  assert.equal(r1.body.ok, false);
  const r2: any = await playWordChain({ history: ['사과', '과자'], word: '과자' }, null);
  assert.equal(r2.body.ok, false);
  const r3: any = await playWordChain({ history: ['사과'], word: 'apple' }, null);
  assert.equal(r3.body.ok, false);
  // 두음법칙으로 맞는 단어는 통과 → AI가 없으면 503(화면이 단어 목록으로 대신)
  const r4: any = await playWordChain({ history: ['달력'], word: '역사' }, null);
  assert.equal(r4.status, 503);
});
