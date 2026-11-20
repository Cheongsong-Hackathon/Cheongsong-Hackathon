import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import express from 'express';
import { createSajuRouter } from '../src/sajuRoutes.js';
import { analyzeSaju, type SajuResult } from '../src/services/saju.js';

const now = Date.UTC(2026, 0, 1);
const input = { birthDate: '2024-02-10', birthTime: '12:00', gender: 'female' };
function read(overrides: Record<string, unknown> = {}) {
  const result = analyzeSaju({ ...input, ...overrides }, now);
  assert(!('error' in result));
  return result;
}
const display = (value: SajuResult['pillars']['hour']) => value && value.stem + value.branch;

test('saju: KASI day reference, solar-term boundaries, hour and surface element count', () => {
  const result = read();
  assert.deepEqual(Object.values(result.pillars).map(display), ['갑진', '병인', '갑진', '경오']);
  assert.equal(result.dayMaster.stem, '갑');
  assert.deepEqual(result.elements.distribution.map(row => row.count), [3, 2, 2, 1, 0]);
  assert.deepEqual(result.elements.distribution.map(row => row.percentage), [37.5, 25, 25, 12.5, 0]);
  assert.deepEqual(result.elements.dominant, ['목']);
  assert.deepEqual(result.elements.lacking, ['수']);
  assert.equal(display(read({ birthTime: '오시' }).pillars.hour), '경오');
  assert.equal(display(read({ birthTime: '23:00' }).pillars.hour), '갑자');
  assert.equal(read({ birthTime: 'unknown' }).pillars.hour, null);
  assert.equal(read({ birthTime: undefined }).elements.total, 6);
  assert.deepEqual(Object.values(read({ birthDate: '2024-02-04', birthTime: '15:00' }).pillars).slice(0, 2).map(display), ['계묘', '을축']);
  assert.deepEqual(Object.values(read({ birthDate: '2024-02-04', birthTime: '19:00' }).pillars).slice(0, 2).map(display), ['갑진', '병인']);
  assert.equal(read({ birthDate: '2024-02-04', birthTime: 'unknown' }).nearSolarTerm, true);
  assert.equal(display(read({ birthDate: '2024-03-05', birthTime: '05:00' }).pillars.month), '병인');
  assert.equal(display(read({ birthDate: '2024-03-05', birthTime: '20:00' }).pillars.month), '정묘');
  assert.equal(display(read({ birthDate: '2024-01-10' }).pillars.month), '을축');
});

test('saju: Korean lunar dates, leap months, deterministic topic readings and bad inputs', () => {
  const lunar = read({ birthDate: '2024-01-01', calendarType: 'lunar' });
  assert.equal(lunar.solarBirthDate, input.birthDate);
  assert.deepEqual(lunar.pillars, read().pillars);
  assert.equal(read({ birthDate: '2023-02-01', calendarType: 'lunar', lunarLeapMonth: true }).solarBirthDate, '2023-03-22');
  assert.equal(read({ birthDate: '2023-02-01', calendarType: 'lunar' }).solarBirthDate, '2023-02-20');
  assert.equal(read({ birthDate: '2023-02-30', calendarType: 'lunar' }).solarBirthDate, '2023-03-21');
  const readings = ['daily', 'love', 'career', 'choice'].map(topic => read({ topic }));
  assert.deepEqual(readings.map(result => result.reading.title), ['오늘의 흐름', '연애·관계', '진로·학업·일', '선택·고민']);
  assert.equal(new Set(readings.map(result => result.reading.advice)).size, 4);
  assert.deepEqual(read({ topic: 'career' }), readings[2]);
  for (const overrides of [
    { birthDate: '2024-02-30' }, { birthDate: '2027-01-01' }, { birthTime: '25:00' }, { gender: undefined },
    { birthDate: '2024-01-01', calendarType: 'lunar', lunarLeapMonth: true }, { topic: 'money' },
  ]) assert('error' in analyzeSaju({ ...input, ...overrides }, now));
});

async function listen(directory: string) {
  const app = express();
  app.use(express.json());
  app.use('/api/saju', createSajuRouter(directory));
  const server = await new Promise<Server>((resolve, reject) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    listener.on('error', reject);
  });
  const address = server.address();
  assert(address && typeof address !== 'string');
  return {
    base: `http://127.0.0.1:${address.port}/api/saju`,
    close: () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
  };
}

test('saju API: records persist after restart and can be cleared by the same browser', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mumu-saju-'));
  let server: Awaited<ReturnType<typeof listen>> | undefined;
  try {
    server = await listen(directory);
    const headers = { 'x-user-key': 'saju-test-client', 'content-type': 'application/json' };
    async function analyze(payload: unknown) {
      return fetch(`${server!.base}/analyze`, { method: 'POST', headers, body: JSON.stringify(payload) });
    }
    assert.equal((await analyze({ ...input, gender: 'unknown' })).status, 400);
    const first = await analyze(input);
    const second = await analyze({ ...input, topic: 'love' });
    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    const records = [await second.json(), await first.json()];
    assert.notEqual(records[0].id, records[1].id);
    assert.equal(records[0].input.topic, 'love');
    await server.close();
    server = undefined;
    server = await listen(directory);
    const getHistory = (key: string) => fetch(`${server!.base}/history`, { headers: { 'x-user-key': key } }).then(res => res.json());
    assert.deepEqual(await getHistory('saju-test-client'), { history: records });
    assert.deepEqual(await getHistory('saju-other-client'), { history: [] });
    const clear = await fetch(`${server.base}/history`, { method: 'DELETE', headers });
    assert.deepEqual(await clear.json(), { history: [] });
    assert.deepEqual(await getHistory('saju-test-client'), { history: [] });
  } finally {
    await server?.close();
    await rm(directory, { recursive: true, force: true });
  }
});
