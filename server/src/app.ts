import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import * as r from './routes.js';
import { DEFAULT_REPLY, QUICK_LABELS } from './services/chat.js';
import { SAFETY_REPLY, SafetyGuard } from './services/safety.js';

export const app = express();
app.use(express.json({ limit: '8mb' })); // 인증 사진(dataURL)이 들어온다. 저장하지 않는다.
app.use('/api', r.chat, r.recommendRouter, r.runs, r.character, r.rewards, r.partners, r.misc);
app.use('/api', (_req, res) => res.status(404).json({ error: 'not found' }));

// web 빌드 결과를 같이 서빙한다 (배포 단위 하나)
const webDist = fileURLToPath(new URL('../../web/dist', import.meta.url));
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.use((req, res, next) => (req.method === 'GET' ? res.sendFile('index.html', { root: webDist }) : next()));
}

// LLM이나 DB가 실패해도 화면이 멈추지 않게: 대화는 기본 답장으로, 나머지는 fallback 표시와 함께 돌려준다.
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', req.method, req.path, err?.message ?? err);
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: '사진이 너무 커. 다시 찍어 줄래?' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: '요청을 읽을 수 없었어.' });
  if (req.path === '/api/chat') {
    // DB가 죽어 있어도 위기 키워드는 놓치지 않는다
    const crisis = SafetyGuard.check(String(req.body?.message ?? ''));
    return res.json({
      sessionId: req.body?.sessionId ?? null,
      reply: crisis ? SAFETY_REPLY : DEFAULT_REPLY,
      state: crisis ? 'SAFETY' : 'CHATTING',
      risk: crisis ? 'CRISIS' : 'NONE',
      ...(crisis ? {} : { quickReplies: QUICK_LABELS }),
      fallback: true,
    });
  }
  res.status(503).json({ error: '잠깐 문제가 생겼어. 조금 있다가 다시 해 줘.', fallback: true });
});
