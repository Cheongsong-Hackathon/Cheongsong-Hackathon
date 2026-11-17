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
  // 실내 시연용: 위치가 없거나 주변에 매장이 없으면 DEMO_CENTER 기준으로, 영업시간·지난 시간대는 따지지 않는다
  demoMode: env.DEMO_MODE === 'true',
  demoCenter: { lat: num(env.DEMO_CENTER_LAT, 36.4359), lng: num(env.DEMO_CENTER_LNG, 129.0571) },
  llm: llm('LLM'),
  llmFallback: llm('LLM_FALLBACK'),

  // ---- 숫자 설정값은 전부 여기 ----
  LLM_TIMEOUT_MS: 8000, // 이 시간을 넘기면 기본 답장
  LLM_PRIMARY_TIMEOUT_MS: 5000, // 예비 공급자가 있을 때 주 공급자에 주는 시간
  SEARCH_RADIUS_M: 2500, // 체험 매장 검색 반경 (도보 약 35분)
  WALK_M_PER_MIN: 67, // 도보 분 = 직선거리 ÷ 67m
  RECOMMEND_COUNT: 3,
  EXP_DONE: 20, // 체험을 다녀와서 기분을 기록하면
  EXP_POSTPONE: 5, // 오늘 할 일 하나 미루기
  STAGE_MIN_EXP: [0, 20, 60, 120], // 1~4단계 시작 경험치
  LOW_ENERGY: 20, // 이 이하면 추천보다 "할 일 하나 미루기"를 먼저 권한다
  USER_ID: 1, // 테스트 사용자 고정 (로그인 없음)
};

export const EMOTIONS = ['지쳤어', '답답해', '우울해', '불안해', '심심해', '평온해'] as const;
