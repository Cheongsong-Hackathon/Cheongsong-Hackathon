import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { grantable, stageOf } from '../src/services/growth.js';
import { callJson, extractJson, FallbackClient, type LLMClient } from '../src/services/llm.js';
import type { Place } from '../src/services/places.js';
import { buildCandidates, finalizePicks, type Template } from '../src/services/recommend.js';
import { checkVerification } from '../src/services/runs.js';
import { SafetyGuard } from '../src/services/safety.js';

const fake = (name: string, ...outs: (string | Error)[]): LLMClient & { calls: number } => ({
  name,
  calls: 0,
  async complete() {
    const o = outs[Math.min(this.calls++, outs.length - 1)];
    if (o instanceof Error) throw o;
    return o;
  },
});
const A = z.object({ a: z.number() });

test('SafetyGuard: 위기 키워드는 잡고 관용구는 통과', () => {
  assert.equal(SafetyGuard.check('그냥 죽고 싶어'), true);
  assert.equal(SafetyGuard.check('죽고싶다'), true);
  assert.equal(SafetyGuard.check('다 사라지고 싶 어'), true);
  assert.equal(SafetyGuard.check('배고파 죽겠네'), false);
  assert.equal(SafetyGuard.check('오늘 좀 심심해'), false);
});

test('extractJson: 설명과 코드펜스가 붙어도 꺼낸다', () => {
  assert.deepEqual(extractJson('알겠어!\n```json\n{"a":1,"s":"}{"}\n```\n끝'), { a: 1, s: '}{' });
  assert.throws(() => extractJson('JSON 아님'));
});

test('LLM: 주 공급자가 429면 예비로 넘어간다', async () => {
  const primary = fake('primary', new Error('HTTP 429'));
  const backup = fake('fallback', '{"a":2}');
  assert.deepEqual(await callJson(new FallbackClient([primary, backup]), 's', 'u', A), { a: 2 });
  assert.equal(backup.calls, 1);
});

test('LLM: 둘 다 실패하면 null (기본 답장으로 대체)', async () => {
  const chain = new FallbackClient([fake('primary', new Error('timeout')), fake('fallback', new Error('HTTP 500'))]);
  assert.equal(await callJson(chain, 's', 'u', A), null);
  assert.equal(await callJson(null, 's', 'u', A), null);
});

test('LLM: 스키마 검증 실패는 1번 재시도, 그래도 틀리면 null', async () => {
  assert.deepEqual(await callJson(fake('c', '{"a":"x"}', '{"a":3}'), 's', 'u', A), { a: 3 });
  const bad = fake('c', '엉뚱한 말');
  assert.equal(await callJson(bad, 's', 'u', A), null);
  assert.equal(bad.calls, 2);
});

test('OpenAICompatClient: 실제 HTTP로 응답을 읽고, 느리면 타임아웃, 429면 오류', async () => {
  const { createServer } = await import('node:http');
  const { OpenAICompatClient } = await import('../src/services/llm.js');
  let seen: any;
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', () => {
      seen = { url: req.url, auth: req.headers.authorization, body: JSON.parse(body) };
      if (seen.body.model === 'slow') return void setTimeout(() => res.end('{}'), 2000);
      if (seen.body.model === 'limited') return void res.writeHead(429).end('{}');
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ choices: [{ message: { content: '```json\n{"a":7}\n```' } }] }));
    });
  });
  await new Promise<void>((r) => server.listen(0, r));
  const baseUrl = `http://localhost:${(server.address() as any).port}/v1/`;
  try {
    const ok = new OpenAICompatClient('p', { baseUrl, model: 'm', apiKey: 'k' });
    assert.deepEqual(await callJson(ok, 'sys', 'usr', A), { a: 7 });
    assert.equal(seen.url, '/v1/chat/completions');
    assert.equal(seen.auth, 'Bearer k');
    assert.equal(seen.body.messages[0].content, 'sys');
    const slow = new OpenAICompatClient('p', { baseUrl, model: 'slow', apiKey: 'k' });
    await assert.rejects(slow.complete('s', 'u', 200), { name: 'TimeoutError' });
    const limited = new OpenAICompatClient('p', { baseUrl, model: 'limited', apiKey: 'k' });
    // 429·타임아웃 모두 예비로 넘어간다
    assert.deepEqual(await callJson(new FallbackClient([limited, ok]), 's', 'u', A), { a: 7 });
    assert.deepEqual(await callJson(new FallbackClient([slow, ok], 200), 's', 'u', A), { a: 7 });
  } finally {
    server.closeAllConnections();
    server.close();
  }
});

const T = (id: string, tier: Template['tier'], placeId: string | null = null): Template => ({
  id, title: id, tier, minutes: 5, exp: 5, placeId,
});
const P = (id: string, isPartner: boolean): Place => ({
  id, name: id, category: 'c', lat: 0, lng: 0, isPartner, openHours: null, note: isPartner ? '혜택' : null, distanceM: 100,
});
const templates = [T('h1', 'HOME'), T('h2', 'HOME'), T('n1', 'NEAR'), T('t-cafe', 'TOWN', 'cafe'), T('t-shop', 'TOWN', 'shop'), T('t-park', 'TOWN', 'park')];
const places = [P('cafe', true), P('shop', true), P('park', false)];

test('후보: LOW는 HOME만, 위치를 모르면 TOWN 없음', () => {
  assert.deepEqual(buildCandidates('LOW', templates, places).map((c) => c.templateId), ['h1', 'h2']);
  assert.deepEqual(buildCandidates('HIGH', templates, []).map((c) => c.tier), ['NEAR']);
  assert.equal(buildCandidates('HIGH', templates, places).length, 4);
});

test('선택 보정: 없는 id는 버리고 서버가 채운다', () => {
  const c = buildCandidates('LOW', templates, places);
  assert.deepEqual(finalizePicks(c, [{ id: 'nope', reason: 'x' }]).map((i) => i.templateId), ['h1', 'h2']);
  assert.equal(finalizePicks(c, null).length, 2);
  assert.equal(finalizePicks(c, [{ id: 'h2', reason: '이유' }])[0].reason, '이유');
});

test('선택 보정: 전부 제휴 매장이면 하나를 무료/비제휴로 바꾼다', () => {
  const c = buildCandidates('HIGH', templates, places);
  const items = finalizePicks(c, [{ id: 't-cafe', reason: 'a' }, { id: 't-shop', reason: 'b' }]);
  assert.ok(items.some((i) => !i.isPartner));
  assert.ok(items.length >= 2);
});

test('선택 보정: "다른 거 추천해줘"는 이미 본 것을 뺀다', () => {
  const c = buildCandidates('MID', templates, places); // h1 h2 n1
  assert.deepEqual(finalizePicks(c, null, ['h1']).map((i) => i.templateId), ['h2', 'n1']);
});

test('성장: 단계 경계와 일일 상한', () => {
  assert.deepEqual([0, 29, 30, 79, 80, 149, 150].map(stageOf), [1, 1, 2, 2, 3, 3, 4]);
  assert.equal(grantable(30, 90, false, 100), 10);
  assert.equal(grantable(30, 120, false, 100), 0); // 음수가 되지 않는다
  assert.equal(grantable(30, 0, true, 100), 0); // 같은 장소 하루 1번
});

test('인증 규칙', () => {
  const here = { lat: 36.4359, lng: 129.0571 };
  const far = { lat: 36.4379, lng: 129.0571 }; // 약 220m
  const photo = 'data:image/jpeg;base64,AAAA';
  const real = { start: here, place: far, demo: false };
  assert.equal(checkVerification('HOME', { here: null, photo: null }, real), null);
  assert.ok(checkVerification('NEAR', { here, photo: null }, real)); // 안 움직임
  assert.equal(checkVerification('NEAR', { here: far, photo: null }, real), null);
  assert.ok(checkVerification('NEAR', { here: null, photo: null }, real)); // 위치 없음
  assert.ok(checkVerification('TOWN', { here: far, photo: null }, real)); // 사진 없음
  assert.ok(checkVerification('TOWN', { here, photo }, real)); // 너무 멂
  assert.equal(checkVerification('TOWN', { here: far, photo }, real), null);
  // DEMO_MODE: 위치는 통과시키지만 사진은 여전히 필요
  assert.equal(checkVerification('NEAR', { here: null, photo: null }, { ...real, demo: true }), null);
  assert.ok(checkVerification('TOWN', { here: null, photo: 'x' }, { ...real, demo: true }));
});
