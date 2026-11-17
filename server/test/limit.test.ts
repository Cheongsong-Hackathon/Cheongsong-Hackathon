import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rateLimit, resetAllowed } from '../src/limit.js';

const fakeReq = (ip: string, headers: Record<string, string> = {}, body: unknown = {}) =>
  ({ ip, body, get: (h: string) => headers[h.toLowerCase()] }) as any;
const fakeRes = () => {
  const r: any = { code: 200, headers: {} as Record<string, string> };
  r.status = (c: number) => ((r.code = c), r);
  r.json = (b: unknown) => ((r.body = b), r);
  r.set = (k: string, v: string) => ((r.headers[k] = v), r);
  return r;
};

test('요청 수 제한: 한도까지 통과, 넘으면 429, 키마다 따로, 위기 표현은 막지 않음', () => {
  const lim = rateLimit('t', 2, (req) => req.ip);
  const run = (req: any) => {
    const res = fakeRes();
    let passed = false;
    lim(req, res, () => (passed = true));
    return { passed, res };
  };
  assert.equal(run(fakeReq('1.1.1.1')).passed, true);
  assert.equal(run(fakeReq('1.1.1.1')).passed, true);
  const third = run(fakeReq('1.1.1.1'));
  assert.equal(third.passed, false);
  assert.equal(third.res.code, 429);
  assert.ok(Number(third.res.headers['Retry-After']) > 0);
  assert.equal(run(fakeReq('2.2.2.2')).passed, true); // 다른 IP는 따로 센다
  assert.equal(run(fakeReq('1.1.1.1', {}, { text: '다 사라지고 싶어' })).passed, true); // 위기 표현은 한도를 넘어도 통과
});

test('시연 초기화: 토큰이 없으면 이 컴퓨터만, 있으면 같은 토큰만', () => {
  assert.equal(resetAllowed(fakeReq('::1'), ''), true);
  assert.equal(resetAllowed(fakeReq('127.0.0.1'), ''), true);
  assert.equal(resetAllowed(fakeReq('203.0.113.5'), ''), false);
  assert.equal(resetAllowed(fakeReq('::1'), 'secret'), false); // 토큰을 정했으면 localhost도 토큰 필요
  assert.equal(resetAllowed(fakeReq('203.0.113.5', { 'x-reset-token': 'secret' }), 'secret'), true);
  assert.equal(resetAllowed(fakeReq('203.0.113.5', { 'x-reset-token': 'secreT' }), 'secret'), false);
  assert.equal(resetAllowed(fakeReq('203.0.113.5', { 'x-reset-token': 'sec' }), 'secret'), false);
});