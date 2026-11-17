import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { SafetyGuard } from './services/safety.js';

/**
 * 요청 수 제한: key(IP·사용자 키)마다 windowMs 동안 max번까지. 넘으면 429.
 * 위기 표현이 담긴 요청은 막지 않는다 (안전 안내는 LLM 없이 키워드로 나가므로 비용이 없다).
 * ponytail: 메모리 고정 창. 서버 한 대라 충분하고, 여러 대로 늘리면 Redis로.
 */
export function rateLimit(name: string, max: number, keyOf: (req: Request) => string, windowMs = 60_000) {
  const hits = new Map<string, { n: number; reset: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const text = req.body?.message ?? req.body?.text;
    if (typeof text === 'string' && SafetyGuard.check(text)) return next();
    const now = Date.now();
    const key = keyOf(req);
    let h = hits.get(key);
    if (!h || h.reset <= now) hits.set(key, (h = { n: 0, reset: now + windowMs }));
    if (++h.n > max) {
      res.set('Retry-After', String(Math.ceil((h.reset - now) / 1000)));
      console.warn(`[limit] ${name} ${key} ${h.n}/${max}`);
      return res.status(429).json({ error: '조금 천천히 해 줘. 잠깐 쉬었다가 다시 해 볼래?', limited: true });
    }
    if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset <= now) hits.delete(k); // 오래된 키 정리
    next();
  };
}

export const byIp = (req: Request) => req.ip ?? 'unknown';
export const byUserKey = (req: Request) => req.get('x-user-key') ?? byIp(req);

/** 시연 초기화 허용 여부: RESET_TOKEN이 있으면 x-reset-token이 같을 때만, 없으면 이 컴퓨터(localhost)에서 온 요청만. */
export function resetAllowed(req: Request, token: string): boolean {
  if (!token) return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.ip ?? '');
  const got = Buffer.from(req.get('x-reset-token') ?? '');
  const want = Buffer.from(token);
  return got.length === want.length && timingSafeEqual(got, want);
}
