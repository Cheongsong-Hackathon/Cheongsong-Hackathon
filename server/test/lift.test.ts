import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ruleMode, score } from '../src/services/lift.js';

test('AI 없이 고르는 즉시 기분 전환: 말에 따라 대화·밖으로·놀이·토닥임, 그 밖엔 웃기기', () => {
  assert.equal(ruleMode('누가 내 얘기 좀 들어줘'), 'talk');
  assert.equal(ruleMode('팀플 때문에 답답해 미치겠어'), 'outside');
  assert.equal(ruleMode('심심해 할 게 없어'), 'play');
  assert.equal(ruleMode('오늘 너무 지쳤어'), 'comfort');
  assert.equal(ruleMode('발표 망쳤어'), 'joke');
});

test('기분 점수는 1~10 정수만', () => {
  assert.equal(score(7), 7);
  assert.equal(score(0), null);
  assert.equal(score(11), null);
  assert.equal(score(4.5), null);
  assert.equal(score('5'), null);
});
