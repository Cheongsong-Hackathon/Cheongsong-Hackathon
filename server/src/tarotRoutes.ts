import { randomInt, randomUUID } from 'node:crypto';
import { Router } from 'express';
import { browserGameCors, createBrowserGameStore, gameDataDirectory } from './services/browserGameStore.js';
import { readTarotCard, tarotCards, tarotTopics, type DrawnCard, type TarotMode, type TarotTopic } from './services/tarotCatalog.js';

type Draw = { id: string; timestamp: string; topic: TarotTopic; mode: TarotMode; cards: DrawnCard[] };
type TarotData = { unlockedIds: string[]; history: Draw[] };

function collection({ unlockedIds }: TarotData) {
  return { unlockedIds, totalCount: tarotCards.length, unlockedCount: unlockedIds.length };
}

export function createTarotRouter(directory = gameDataDirectory()) {
  const router = Router();
  const prepare = createBrowserGameStore<TarotData>('tarot', directory, () => ({ unlockedIds: [], history: [] }));
  router.use(browserGameCors);

  router.get('/topics', (_req, res) => res.json({ topics: tarotTopics }));
  router.get('/cards', (_req, res) => res.json({ cards: tarotCards }));
  router.get('/collection', (req, res) => res.json(collection(prepare(req, res).data)));
  router.get('/history', (req, res) => res.json({ history: prepare(req, res).data.history }));
  router.delete('/history', (req, res) => {
    const { data, write } = prepare(req, res);
    data.history = [];
    write();
    res.json({ history: data.history });
  });
  router.post('/draw', (req, res) => {
    const topic = tarotTopics.find(candidate => candidate.id === req.body?.topic);
    const mode = req.body?.mode;
    if (!topic || (mode !== 'one' && mode !== 'three')) {
      return res.status(400).json({ error: '타로 주제와 카드 장수를 선택해 주세요.' });
    }
    const { data, write } = prepare(req, res);
    const indices = new Set<number>();
    while (indices.size < (mode === 'one' ? 1 : 3)) indices.add(randomInt(tarotCards.length));
    const drawnCards = tarotCards.filter(card => indices.has(card.number)).map(card => readTarotCard(card, topic.id));
    const draw: Draw = { id: randomUUID(), timestamp: new Date().toISOString(), topic: topic.id, mode, cards: drawnCards };
    data.history.unshift(draw);
    data.unlockedIds = [...new Set([...data.unlockedIds, ...drawnCards.map(card => card.id)])];
    write();
    res.status(201).json({ draw, drawnCards, collection: collection(data), history: data.history });
  });
  return router;
}
