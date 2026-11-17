import pg from 'pg';
import { config } from './config.js';

export const pool = new pg.Pool({ connectionString: config.databaseUrl, connectionTimeoutMillis: 5000 });

// DB가 재시작돼도 서버 프로세스가 죽지 않게 (유휴 연결 오류)
pool.on('error', (e) => console.error('[db]', e.message));

/** 요청에서 온 id를 int4 범위의 정수로. 아니면 -1 (어떤 행과도 맞지 않음). */
export const toId = (v: unknown) => {
  const n = typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v;
  return typeof n === 'number' && Number.isInteger(n) && n > 0 && n < 2 ** 31 ? n : -1;
};

export type Q = <T = any>(sql: string, params?: unknown[]) => Promise<T[]>;

export const query: Q = async (sql, params = []) => (await pool.query(sql, params as any[])).rows;

export async function tx<T>(fn: (q: Q) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(async (sql, params = []) => (await client.query(sql, params as any[])).rows);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
