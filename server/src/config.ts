import { fileURLToPath } from 'node:url';

// 저장소 루트의 .env (없으면 환경 변수만 사용 — 배포 환경)
try {
  process.loadEnvFile(fileURLToPath(new URL('../../.env', import.meta.url)));
} catch {}

const env = process.env;
const num = (v: string | undefined, d: number) => (v && !Number.isNaN(Number(v)) ? Number(v) : d);
const json = (v: string | undefined): Record<string, unknown> => {
  try {
    const o = JSON.parse(v ?? '{}');
    return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  } catch {
    console.warn(`[config] JSON이 아니어서 무시: ${v}`);
    return {};
  }
};
const llm = (p: string) => ({
  baseUrl: env[`${p}_BASE_URL`] ?? '',
  model: env[`${p}_MODEL`] ?? '',
  apiKey: env[`${p}_API_KEY`] ?? '',
  // 응답 형식(JSON 스키마)을 공급자에게 강제시킬지. 지시문만으로는 JSON을 안 지키는 모델용 (예: CLOVA HCX-007)
  structured: env[`${p}_STRUCTURED`] === 'true',
  // 공급자 전용 옵션을 요청에 그대로 더한다. 예: {"reasoning_effort":"none"}
  extra: json(env[`${p}_EXTRA`]),
});

export const config = {
  port: num(env.PORT, 3000),
  databaseUrl: env.DATABASE_URL ?? 'postgres://neuri:neuri@localhost:5433/neuri',
  // 실내 시연용: 위치가 없거나 주변에 매장이 없으면 DEMO_CENTER 기준으로, 영업시간·지난 시간대는 따지지 않는다
  demoMode: env.DEMO_MODE === 'true',
  // 위치 동의를 안 했을 때의 기본 동네: 영남대 경산캠퍼스
  demoCenter: { lat: num(env.DEMO_CENTER_LAT, 35.8318613), lng: num(env.DEMO_CENTER_LNG, 128.7585416) },
  llm: llm('LLM'),
  llmFallback: llm('LLM_FALLBACK'),
  kakaoKey: env.KAKAO_REST_API_KEY ?? '', // 무료 장소 검색, 주소 → 좌표, 카카오 로그인. 비우면 세 기능이 꺼진다
  kakaoClientSecret: env.KAKAO_CLIENT_SECRET ?? '', // 카카오 로그인 토큰 발급 (카카오 콘솔에서 켜 둔 경우 필수)
  sessionSecret: env.SESSION_SECRET ?? '', // 로그인 쿠키 서명. 비우면 로그인이 꺼지고 둘러보기만 된다
  // 무무 목소리 (네이버 클라우드 AI·NAVER API 애플리케이션, CLOVA Voice Premium 선택). 비우면 브라우저 내장 목소리
  ncpClientId: env.NCP_CLIENT_ID ?? '',
  ncpClientSecret: env.NCP_CLIENT_SECRET ?? '',
  ttsSpeaker: env.TTS_SPEAKER ?? 'nara',
  openWeatherKey: env.OPENWEATHER_API_KEY ?? '', // 날씨 반영(비·눈·한파·폭염이면 실내 위주). 비우면 날씨 없이 추천
  googlePlacesKey: env.GOOGLE_PLACES_KEY ?? '', // 제휴 매장 실제 사진. 비우면 지금 그림 그대로
  // 시연 초기화(/api/demo/reset) 비밀 값. 비우면 이 컴퓨터(localhost)에서만 초기화할 수 있다
  resetToken: env.RESET_TOKEN ?? '',

  // ---- 숫자 설정값은 전부 여기 ----
  LLM_TIMEOUT_MS: 8000, // 이 시간을 넘기면 기본 답장
  LLM_PRIMARY_TIMEOUT_MS: 5000, // 예비 공급자가 있을 때 주 공급자에 주는 시간
  SEARCH_RADIUS_M: 2500, // 체험 매장 검색 반경 (도보 약 35분)
  WALK_M_PER_MIN: 67, // 도보 분 = 직선거리 ÷ 67m
  RECOMMEND_MAX: 5, // 추천은 개수를 정하지 않고, 화면이 길어지지 않게 많아도 이만큼만
  RECOMMEND_MIN: 2, // 조건에 맞는 곳이 이보다 적으면 조건을 한 단계 넓힌다
  EXP_DONE: 20, // 체험을 다녀와서 기분을 기록하면
  EXP_POSTPONE: 5, // 오늘 할 일 하나 미루기
  STAGE_MIN_EXP: [0, 20, 40, 75, 120], // 1~5단계 시작 경험치 (화면의 무무 모습 5가지 MUMU_MILESTONES와 같게)
  ARRIVE_RADIUS_M: 150, // "도착했어": 장소에서 이 거리 안이면 방문 확인 (실내 GPS 오차를 감안해 넉넉히)
  // 요청 수 제한 (1분에). AI를 부르는 요청(마음 확인·추천·속마음)은 따로 더 좁게
  RATE_API_PER_IP: 300,
  RATE_AI_PER_IP: 60, // 대회장 와이파이처럼 여럿이 IP 하나를 같이 써도 버티게
  RATE_AI_PER_USER: 20,
  SURPRISE_PICK: false, // 추천 끝 "평소와 다른 하나" (2026-11-18 일단 끔. 다시 쓰려면 true)
  MEMORY_MAX: 20, // 사용자당 기억 항목 수 (다 지시문에 들어가므로 많이 늘리지 않는다)
  LOW_ENERGY: 20, // 이 이하면 추천보다 "할 일 하나 미루기"를 먼저 권한다
  USER_ID: 1, // X-User-Key 없이 부를 때(curl 등) 쓰는 기본 사용자
};

export const EMOTIONS = ['지쳤어', '답답해', '불안해', '심심해', '평온해'] as const;
