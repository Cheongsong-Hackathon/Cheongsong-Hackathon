import { app } from './app.js';
import { config } from './config.js';
import { query } from './db.js';
import { defaultClient } from './services/llm.js';
import { migrate, seed } from './setup.js';
import { purgeExpired } from './services/account.js';

// 시작할 때 스키마를 맞추고, 체험 DB가 비어 있으면 seed를 넣는다. DB가 없어도 서버는 뜬다.
try {
  await migrate();
  if (!(await query(`SELECT 1 FROM experiences LIMIT 1`)).length) await seed();
} catch (e) {
  console.error('[db] 초기화 실패 — 기본 응답으로 동작합니다:', (e as Error).message);
}

// 보관 기간이 지난 대화·둘러보기 사용자 지우기: 켤 때 한 번, 그 뒤 6시간마다
const purge = () => purgeExpired().catch((e) => console.warn('[privacy] 정리 실패:', (e as Error).message));
void purge();
setInterval(purge, 6 * 3_600_000).unref();

app.listen(config.port, () => {
  console.log(
    `무드패스 서버 http://localhost:${config.port}  DEMO_MODE=${config.demoMode}  LLM=${defaultClient ? `${config.llm.model || '-'} / 예비 ${config.llmFallback.apiKey ? config.llmFallback.model : '없음'}` : '키 없음(기본 답장)'}`,
  );
  // 서버를 켠 뒤 첫 AI 호출은 8초를 넘기곤 해서(실측), 사용자보다 먼저 한 번 불러 깨워 둔다. 결과는 버린다.
  defaultClient
    ?.complete('짧게 답해.', '안녕', 20_000)
    .then(() => console.log('[llm] 준비 완료'))
    .catch((e) => console.warn('[llm] 준비 호출 실패 — 모델 이름과 키를 확인하세요:', e?.message ?? e));
});
