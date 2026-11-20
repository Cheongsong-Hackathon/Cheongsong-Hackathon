import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { analyzeSaju, type SajuResult } from './services/saju.js';
import { browserGameCors, createBrowserGameStore, gameDataDirectory } from './services/browserGameStore.js';

type SajuRecord = SajuResult & { id: string; timestamp: string };

export function createSajuRouter(directory = gameDataDirectory()) {
  const router = Router();
  const prepare = createBrowserGameStore<{ history: SajuRecord[] }>('saju', directory, () => ({ history: [] }));
  router.use(browserGameCors);

  router.post('/analyze', (req, res) => {
    const result = analyzeSaju(req.body);
    if ('error' in result) return res.status(400).json({ error: result.error });
    const { data, write } = prepare(req, res);
    const record = { id: randomUUID(), timestamp: new Date().toISOString(), ...result };
    data.history.unshift(record);
    write();
    res.status(201).json(record);
  });
  router.get('/history', (req, res) => res.json({ history: prepare(req, res).data.history }));
  router.delete('/history', (req, res) => {
    const { data, write } = prepare(req, res);
    data.history = [];
    write();
    res.json({ history: data.history });
  });
  return router;
}
