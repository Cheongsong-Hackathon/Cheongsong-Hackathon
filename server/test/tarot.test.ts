import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import express from 'express';
import { createTarotRouter } from '../src/tarotRoutes.js';

async function listen(directory: string) {
  const app = express();
  app.use(express.json());
  app.use('/api/tarot', createTarotRouter(directory));
  const server = await new Promise<Server>((resolve, reject) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    listener.on('error', reject);
  });
  const address = server.address();
  assert(address && typeof address !== 'string');
  return {
    base: `http://127.0.0.1:${address.port}/api/tarot`,
    close: () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
  };
}

test('tarot catalog, draws, per-browser persistence, clear history and local CORS', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mumu-tarot-'));
  let server: Awaited<ReturnType<typeof listen>> | undefined;
  try {
    server = await listen(directory);
    const headers = { 'x-user-key': 'tarot-test-client', 'content-type': 'application/json' };
    const draw = (topic: string, mode: string) =>
      fetch(`${server!.base}/draw`, { method: 'POST', headers, body: JSON.stringify({ topic, mode }) });

    const { topics } = await (await fetch(`${server.base}/topics`)).json();
    assert.deepEqual(topics.map((topic: { id: string }) => topic.id), ['daily', 'love', 'career', 'choice']);
    const { cards } = await (await fetch(`${server.base}/cards`)).json();
    assert.deepEqual(cards.map((card: { number: number }) => card.number), Array.from({ length: 22 }, (_, index) => index));
    const preflight = await fetch(`${server.base}/draw`, { method: 'OPTIONS', headers: { origin: 'http://localhost:5173' } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    const blockedOrigin = await fetch(`${server.base}/cards`, { headers: { origin: 'https://example.com' } });
    assert.equal(blockedOrigin.headers.get('access-control-allow-origin'), null);
    assert.equal((await draw('unknown', 'one')).status, 400);
    assert.equal((await draw('daily', 'two')).status, 400);

    const firstResponse = await draw('daily', 'one');
    assert.equal(firstResponse.status, 201);
    const first = await firstResponse.json();
    assert.equal(first.drawnCards.length, 1);
    const trioResponse = await draw('love', 'three');
    assert.equal(trioResponse.status, 201);
    const trio = await trioResponse.json();
    assert.equal(trio.drawnCards.length, 3);
    assert.deepEqual(trio.draw.cards, trio.drawnCards);
    const numbers: number[] = trio.drawnCards.map((card: { number: number }) => card.number);
    assert.deepEqual(numbers, [...new Set(numbers)].sort((a, b) => a - b));
    for (const card of trio.drawnCards) {
      assert.match(card.reading, /상대에게/);
      assert.equal('reversed' in card, false);
    }
    assert.deepEqual(trio.history.map((record: { id: string }) => record.id), [trio.draw.id, first.draw.id]);
    assert.equal(trio.collection.totalCount, 22);
    assert.equal(trio.collection.unlockedCount, new Set([...first.collection.unlockedIds, ...trio.drawnCards.map((card: { id: string }) => card.id)]).size);

    await server.close();
    server = undefined;
    server = await listen(directory);
    assert.deepEqual(await (await fetch(`${server.base}/history`, { headers })).json(), { history: trio.history });
    assert.deepEqual(await (await fetch(`${server.base}/collection`, { headers })).json(), trio.collection);
    const stranger = await fetch(`${server.base}/history`);
    assert.deepEqual(await stranger.json(), { history: [] });
    assert.match(stranger.headers.get('set-cookie') ?? '', /mumu_tarot=/);
    assert.deepEqual(await (await fetch(`${server.base}/history`, { method: 'DELETE', headers })).json(), { history: [] });
    assert.deepEqual(await (await fetch(`${server.base}/history`, { headers })).json(), { history: [] });
    assert.deepEqual(await (await fetch(`${server.base}/collection`, { headers })).json(), trio.collection);
  } finally {
    await server?.close();
    await rm(directory, { recursive: true, force: true });
  }
});
