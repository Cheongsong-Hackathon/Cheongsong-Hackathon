import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import { config } from './config.js';
import { byIp, rateLimit } from './limit.js';
import { api } from './routes.js';
import { createTarotRouter } from './tarotRoutes.js';
import { createSajuRouter } from './sajuRoutes.js';
import { DEFAULT_REPLY } from './services/chat.js';
import { DEFAULT_CHECKIN_REPLY } from './services/checkin.js';
import { SAFETY_REPLY, SafetyGuard } from './services/safety.js';

export const app = express();
// 배포에서는 Caddy 뒤에 있어서, 실제 접속자 IP는 Caddy가 붙여 준 X-Forwarded-For에서 읽는다 (요청 수 제한용)
app.set('trust proxy', 1);
app.use(express.json({ limit: '100kb' }));
// 사용자 키를 마구 만들어 DB를 채우는 것을 막는 전체 제한 (대회장처럼 여럿이 같은 와이파이를 써도 넉넉하게)
app.use('/api', rateLimit('api', config.RATE_API_PER_IP, byIp));
app.use('/api/tarot', createTarotRouter());
app.use('/api/saju', createSajuRouter());
app.use('/api', api);
app.use('/api', (_req, res) => res.status(404).json({ error: 'not found' }));

// web 빌드 결과를 같이 서빙한다 (배포 단위 하나)
const webDist = fileURLToPath(new URL('../../web/dist', import.meta.url));
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.use((req, res, next) => (req.method === 'GET' ? res.sendFile('index.html', { root: webDist }) : next()));
}

// LLM이나 DB가 실패해도 화면이 멈추지 않게: 마음 확인·대화는 기본 답장으로, 나머지는 fallback 표시와 함께 돌려준다.
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', req.method, req.path, err?.message ?? err);
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: '글이 너무 길어. 조금 줄여 줄래?' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: '요청을 읽을 수 없었어.' });
  if (req.path === '/api/chat' || req.path === '/api/checkin') {
    // DB가 죽어 있어도 위기 키워드는 놓치지 않는다
    const crisis = SafetyGuard.check(String(req.body?.message ?? req.body?.text ?? ''));
    return res.json({
      sessionId: req.body?.sessionId ?? null,
      checkinId: null,
      reply: crisis ? SAFETY_REPLY : req.path === '/api/chat' ? DEFAULT_REPLY : DEFAULT_CHECKIN_REPLY,
      state: crisis ? 'SAFETY' : 'OK',
      risk: crisis ? 'CRISIS' : 'NONE',
      fallback: true,
    });
  }
  res.status(503).json({ error: '잠깐 문제가 생겼어. 조금 있다가 다시 해 줘.', fallback: true });
});
