import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextFunction, Request, Response } from 'express';

type Game = 'tarot' | 'saju';
const localOrigin = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/;

export function gameDataDirectory() {
  return process.env.TAROT_DATA_DIR || fileURLToPath(new URL('../../.tarot-data/', import.meta.url));
}

export function browserGameCors(req: Request, res: Response, next: NextFunction) {
  const origin = req.get('origin');
  res.vary('Origin');
  res.set('Cache-Control', 'no-store');
  if (origin && localOrigin.test(origin)) {
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-User-Key',
    });
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}

function browserKey(game: Game, req: Request, res: Response) {
  const header = req.get('x-user-key');
  if (header && /^[A-Za-z0-9-]{8,64}$/.test(header)) return `client:${header}`;
  const cookieName = `mumu_${game}`;
  const cookie = req.headers.cookie?.match(new RegExp(`(?:^|;\\s*)${cookieName}=([a-f0-9-]{36})(?:;|$)`))?.[1];
  if (cookie) return `cookie:${cookie}`;
  const key = randomUUID();
  res.cookie(cookieName, key, { httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: 365 * 86400000, path: `/api/${game}` });
  return `cookie:${key}`;
}

export function createBrowserGameStore<T>(game: Game, directory: string, empty: () => T) {
  return (req: Request, res: Response) => {
    const digest = createHash('sha256').update(browserKey(game, req, res)).digest('hex');
    // Tarot keeps its existing filenames; Saju can share the directory without touching those files.
    const file = join(directory, `${game === 'tarot' ? '' : 'saju-'}${digest}.json`);
    let data: T;
    try {
      data = JSON.parse(readFileSync(file, 'utf8')) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      data = empty();
    }

    return {
      data,
      // Keep each local read/modify/write in one turn and replace the file atomically.
      write() {
        mkdirSync(directory, { recursive: true });
        const temporary = `${file}.${randomUUID()}.tmp`;
        try {
          writeFileSync(temporary, JSON.stringify(data), { mode: 0o600 });
          renameSync(temporary, file);
        } catch (error) {
          rmSync(temporary, { force: true });
          throw error;
        }
      },
    };
  };
}
