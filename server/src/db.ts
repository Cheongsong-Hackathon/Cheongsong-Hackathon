import pg from 'pg';
import { config } from './config.js';

export const pool = new pg.Pool({ connectionString: config.databaseUrl, connectionTimeoutMillis: 5000 });

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
