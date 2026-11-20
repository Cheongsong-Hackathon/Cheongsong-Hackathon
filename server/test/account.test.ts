import assert from 'node:assert/strict';
import { test } from 'node:test';

const { config } = await import('../src/config.js');
config.sessionSecret = 'test-secret-0123456789';
const { seal, unseal, readCookie } = await import('../src/services/account.js');

test('로그인 쿠키: 서명이 맞고 기한 안이면 읽고, 고치거나 지났거나 비밀 값이 없으면 거절', () => {
  const v = seal({ uid: 7, exp: Date.now() + 60_000 });
  assert.equal(unseal<{ uid: number }>(v)?.uid, 7);
  const [p, s] = v.split('.');
  const forged = Buffer.from(JSON.stringify({ uid: 1, exp: Date.now() + 60_000 })).toString('base64url');
  assert.equal(unseal(`${forged}.${s}`), null); // 다른 사용자로 바꿔치기
  assert.equal(unseal(`${p}.${s.slice(0, -2)}AA`), null); // 서명 변조
  assert.equal(unseal(seal({ uid: 7, exp: Date.now() - 1 })), null); // 기한 지남
  assert.equal(unseal('garbage'), null);
  assert.equal(unseal(undefined), null);
  config.sessionSecret = '';
  assert.equal(unseal(v), null); // 비밀 값이 없으면 로그인 꺼짐
  config.sessionSecret = 'test-secret-0123456789';
});

test('쿠키 헤더에서 이름으로 값 찾기', () => {
  const req = { get: () => 'a=1; mumu_sid=abc.def; b=2' } as any;
  assert.equal(readCookie(req, 'mumu_sid'), 'abc.def');
  assert.equal(readCookie(req, 'mumu'), undefined);
});
