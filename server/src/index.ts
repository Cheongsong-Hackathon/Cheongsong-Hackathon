import { app } from './app.js';
import { config } from './config.js';
import { query } from './db.js';
import { defaultClient } from './services/llm.js';
import { sweepExpired } from './services/runs.js';
import { migrate, seed } from './setup.js';

// 시작할 때 스키마를 맞추고, 비어 있으면 seed를 넣는다. DB가 없어도 서버는 뜬다.
try {
  await migrate();
  if (!(await query(`SELECT 1 FROM users LIMIT 1`)).length) await seed();
} catch (e) {
  console.error('[db] 초기화 실패 — 기본 응답으로 동작합니다:', (e as Error).message);
}

// 버려진 활동의 시작 좌표가 만료 뒤에 남지 않게 5분마다 정리
setInterval(() => sweepExpired().catch(() => {}), 5 * 60_000).unref();

app.listen(config.port, () =>
  console.log(
    `느리 서버 http://localhost:${config.port}  DEMO_MODE=${config.demoMode}  LLM=${defaultClient ? `${config.llm.model || '-'} / 예비 ${config.llmFallback.apiKey ? config.llmFallback.model : '없음'}` : '키 없음(기본 답장)'}`,
  ),
);
