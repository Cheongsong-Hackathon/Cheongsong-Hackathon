import { fileURLToPath } from 'node:url';

// 저장소 루트의 .env (없으면 환경 변수만 사용 — 배포 환경)
try {
  process.loadEnvFile(fileURLToPath(new URL('../../.env', import.meta.url)));
} catch {}

const env = process.env;
const num = (v: string | undefined, d: number) => (v && !Number.isNaN(Number(v)) ? Number(v) : d);
const llm = (p: string) => ({
  baseUrl: env[`${p}_BASE_URL`] ?? '',
  model: env[`${p}_MODEL`] ?? '',
  apiKey: env[`${p}_API_KEY`] ?? '',
});

export const config = {
  port: num(env.PORT, 3000),
  databaseUrl: env.DATABASE_URL ?? 'postgres://neuri:neuri@localhost:5433/neuri',
  demoMode: env.DEMO_MODE === 'true',
  demoCenter: { lat: num(env.DEMO_CENTER_LAT, 36.4359), lng: num(env.DEMO_CENTER_LNG, 129.0571) },
  llm: llm('LLM'),
  llmFallback: llm('LLM_FALLBACK'),

  // ---- 숫자 설정값은 전부 여기 ----
  LLM_TIMEOUT_MS: 8000, // 이 시간을 넘기면 기본 답장
  LLM_PRIMARY_TIMEOUT_MS: 5000, // 예비 공급자가 있을 때 주 공급자에 주는 시간
  SEARCH_RADIUS_M: 1500, // TOWN 후보 검색 반경
  NEAR_MOVE_M: 100, // NEAR 인증: 시작 위치에서 이동해야 하는 거리
  TOWN_RADIUS_M: 100, // TOWN 인증: 장소 반경
  DAILY_EXP_CAP: 100,
  RUN_TTL_MIN: 60, // 활동 시작 후 만료까지
  STAGE_MIN_EXP: [0, 30, 80, 150], // 1~4단계 시작 경험치
  COUPON_STAGE: 3,
  USER_ID: 1, // 테스트 사용자 고정 (로그인 없음)
};

export type Energy = 'LOW' | 'MID' | 'HIGH';
export type Tier = 'HOME' | 'NEAR' | 'TOWN';
