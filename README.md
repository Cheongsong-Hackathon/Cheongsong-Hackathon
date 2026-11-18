# 무드패스 (MoodPass)

오늘의 감정과 에너지에 맞는 가까운 체험을 추천하고, 예약 요청부터 체험 후 기분 기록까지 연결하는 AI 기반 일상 회복 모바일 웹 (해커톤 시연용). 기준 문서: `무드패스_사업계획서 .pdf`.

- `server/` — Express + TypeScript + PostgreSQL. API와 `web/` 빌드 결과를 함께 서빙
- `web/` — React + Vite 모바일 웹 (항상 휴대폰 테두리 안에 표시)
- 체험 모드: 제휴 매장은 영남대 주변 실제 매장의 이름·위치를 빌려 왔고, 제휴 여부·가격·시간·예약은 예시입니다. 실결제는 없습니다

## 화면 흐름

휴대폰 메인 화면 → 무드패스 아이콘 → 랜딩 → 위치 동의 → 앱

| 사업계획서 | 화면 |
| --- | --- |
| 01 마음 확인 | 홈: 한 줄, 감정 칩, 에너지 %, 지금 기분 점수(1~10) |
| 02 조건 확인 | 하단 시트: 시간·거리(도보)·예산. 에너지 20% 이하면 "할 일 하나 미루기"를 먼저 권함 |
| 03 경험 추천 | 체험 DB를 규칙으로 거른 뒤 AI가 어울리는 순서를 정하고 이유 한 줄을 씀 (개수는 정하지 않고 많아도 5개) |
| 04 예약·체험 | 오늘 가능한 시간 선택 → "예약 요청" (확정 아님, 결제 없음) |
| 05 기분 기록 | "다녀왔어" → 체험 후 점수 → 체험 전/후 비교, 토끼 성장, 꾸미기 |

탭: 홈 · 체험(전체 체험 목록) · 기록 · 속마음(토끼와의 공감 대화)

## 처음 실행

필요한 것: Node 22 이상, Docker.

```bash
cp .env.example .env                 # LLM 키를 넣는다 (없어도 기본 답장으로 동작)
docker compose up -d db              # PostgreSQL (localhost:5433)

cd server && npm install
npm run migrate                      # 테이블 생성 (server/schema.sql)
npm run seed                         # 모든 데이터를 지우고 seed(영남대 주변 매장 10곳, 체험 10개)를 다시 넣음

cd ../web && npm install && npm run build
cd ../server && npm run dev          # http://localhost:3000 (API + 화면)
```

서버는 시작할 때 마이그레이션을 스스로 하고, 체험 DB가 비어 있으면 seed도 넣습니다.

화면을 고치면서 볼 때는 터미널을 하나 더 열어 `cd web && npm run dev` (http://localhost:5173, `/api`는 서버로 프록시).

## .env

| 값 | 설명 |
| --- | --- |
| `PORT` | 서버 포트 (기본 3000) |
| `DATABASE_URL` | PostgreSQL 주소. 클라우드 DB는 보통 끝에 `?sslmode=require` |
| `DEMO_MODE` | `true`면 지난 시간대·영업시간을 따지지 않고, "도착했어"의 거리를 따지지 않음. `/api/demo/reset` 열림 |
| `DEMO_CENTER_LAT/LNG` | seed 매장을 배치하는 기준 좌표, 위치 동의를 안 했을 때의 기준 위치. 위치가 있으면 추천은 항상 그 위치 기준(주변에 제휴 매장이 없으면 무료 장소만). 바꾸면 `npm run seed`를 다시 |
| `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY` | 주 LLM (OpenAI 호환 API) |
| `LLM_FALLBACK_BASE_URL`, `LLM_FALLBACK_MODEL`, `LLM_FALLBACK_API_KEY` | 예비 LLM (CLOVA Studio HCX-007). 비우면 사용 안 함 |
| `LLM_FALLBACK_STRUCTURED`, `LLM_FALLBACK_EXTRA` | 예비 LLM에 응답 형식(JSON 스키마)을 강제하고 공급자 전용 옵션을 보냄. CLOVA는 `true`, `{"reasoning_effort":"none"}` (주 LLM도 `LLM_STRUCTURED`, `LLM_EXTRA`로 같은 설정 가능) |
| `RESET_TOKEN` | 시연 초기화(`/api/demo/reset`, `npm run smoke`) 비밀 값. 비우면 서버 컴퓨터 자신(localhost)에서만 초기화 가능. **배포 서버에는 꼭 넣기** |
| `KAKAO_REST_API_KEY` | 카카오 로컬 REST API 키. 무료 장소 검색과 주소 → 좌표. 비우면 두 기능만 꺼짐 |

API 키는 서버에만 있고 프론트로 보내지 않습니다. `.env`는 커밋하지 않습니다.

### 무료 LLM 설정 예

| 공급자 | `LLM_BASE_URL` | `LLM_MODEL` 예 |
| --- | --- | --- |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-3.1-flash-lite` (2026-11 기준) |
| CLOVA Studio (예비) | `https://clovastudio.stream.ntruss.com/v1/openai` | `HCX-007` + 형식 강제 |

**모델 선택 근거 (2026-11-18, `npm run prompt-eval` 테스트 문장 17개)**

| 모델 | JSON 형식 | 속도 | 말투·개인화 | 쓰임 |
| --- | --- | --- | --- | --- |
| Gemini 3.1 Flash Lite | 17/17 | 1.5~5초 | 공감 후 다음 화면으로 이어 주고, 사용자 사정을 반영 | **주 LLM** |
| CLOVA HCX-007 (형식 강제, 추론 끔) | 17/17 | 0.7~0.9초 (추천 2~3초) | 한 문장으로 짧고 일반적. 위기 판단은 정확(다소 예민) | **예비 LLM** |
| CLOVA HCX-005, HCX-DASH-002 | 마음 확인·속마음 거의 실패 | 0.6~2초 | JSON 지시를 무시하고 문장으로 답함, 형식 강제 미지원 | 사용 안 함 |
| NVIDIA Build 무료 모델들 | — | 13~30초 이상 | 대기열 때문에 시간 초과 | 사용 안 함 |

주 LLM을 일부러 고장 낸 상태에서도 smoke 전체가 CLOVA만으로 통과합니다 (예비 호출 12/12 성공).

모델 이름과 무료 한도는 자주 바뀌니 각 공급자 콘솔에서 확인하세요. 모델이 종료되면 404 "no longer available"이 나고 모든 답이 기본 답장으로 바뀝니다. 지금 쓸 수 있는 이름은 `GET {LLM_BASE_URL}/models`(키 필요)로 볼 수 있습니다.

서버를 켜면 AI를 한 번 미리 불러 둡니다(첫 호출이 8초를 넘기곤 해서). 로그에 `[llm] 준비 완료`가 나오면 정상, `준비 호출 실패`가 나오면 모델 이름과 키를 확인하세요.

동작 순서: 주 공급자 → (429·타임아웃·오류) 예비 공급자 → 기본 답장. 전체 8초를 넘기면 기본 답장으로 넘어갑니다. LLM은 세 곳에만 씁니다: 마음 확인의 공감 한마디, 추천 순서와 이유, 속마음 대화. 가격·시간·장소는 AI가 만들지 않고 체험 DB 값만 보여 줍니다.

### LLM 사용량 확인

호출할 때마다 서버 로그에 한 줄씩 남습니다. `#` 뒤 숫자가 오늘 누적 호출 수입니다.

```
[llm] 2026-11-20 #12 primary ok 840ms
[llm] 2026-11-20 #13 primary FAIL 5001ms timeout
[llm] 2026-11-20 #14 fallback ok 610ms
```

`GET /api/health`에서도 지금 쓰는 모델(`llm.model`, 키가 없으면 `null`)과 오늘 집계를 볼 수 있습니다. 배포 서버는 `https://blackapple.store/api/health`. 서버를 다시 시작하면 0부터 셉니다.

## 토끼의 기억 (개인화)

- 마음 확인과 속마음 대화가 끝나면, 응답과 따로 AI가 "다음에 도움이 될 사실"을 뽑아 `memories` 테이블에 저장합니다. 종류는 취향·상황·사건이고, 사용자당 최대 20개입니다 (`server/src/services/memory.ts`).
- 다음 마음 확인·추천·속마음에는 이 기억과 "다녀온 체험의 기분 변화(예: 도자기 4 → 8)"를 함께 넣습니다. 그래서 토끼가 "지난번 도자기 하고 기분이 8까지 올랐으니"처럼 말합니다.
- 무엇을 기억할지는 AI가 정하고, 안전장치는 코드가 정합니다. 위기·건강·연락처는 저장하지 않고, 사건 기억은 AI가 지우지 못하며(사용자만), 기록 탭에서 하나씩 지우거나 "모두 지우기"로 함께 지울 수 있습니다.
- "평소와 다른 하나"(오늘 감정에 어울리지 않고 다녀온 적 없는 종류 하나를 추천 끝에 섞기)는 **지금 꺼 두었습니다.** 코드와 테스트는 남아 있고, `config.ts`의 `SURPRISE_PICK`을 `true`로 바꾸면 다시 켜집니다.
- **시연:** 주소 끝에 `?demo`를 붙여 열면 일주일 남짓 써 온 시연용 사용자가 됩니다 (기록·기억이 미리 들어 있음, `npm run seed`나 초기화 때 다시 만들어짐). 원래 사용자로 돌아가려면 브라우저 사이트 데이터를 지우세요.

## 시연 전 확인

```bash
cd server
npm run smoke                                   # 로컬 서버 (.env의 PORT)
BASE_URL=https://배포주소 RESET_TOKEN=서버와같은값 npm run smoke   # 배포 서버  (PowerShell: $env:BASE_URL='https://...'; $env:RESET_TOKEN='...'; npm run smoke)
```

"마음 확인 → 조건 → 추천 → 예약 요청 → 기분 기록 → 성장"과 "위기 표현 → 안전 모드"를 API로 한 번에 돌리고 단계마다 ✓/✗를 찍습니다. **모든 사용자의 데이터를 초기화하므로** `DEMO_MODE=true` 서버에서만 동작하고, 끝나면 깨끗한 상태로 되돌려 놓습니다. 팀원들이 쓰고 있는 배포 서버에서 돌리면 그 사람들의 기록과 토끼도 지워집니다.

단위 테스트: `cd server && npm test`

## 휴대폰으로 테스트

브라우저 위치 기능은 HTTPS나 localhost에서만 동작합니다. 같은 와이파이의 `http://192.168.x.x:3000`으로 열면 위치 권한 창이 뜨지 않습니다. 터널로 HTTPS 주소를 만드세요.

```bash
cd web && npm run build              # 서버가 web/dist를 서빙
cd ../server && npm run dev

# 다른 터미널에서 (계정 없이 사용 가능)
winget install Cloudflare.cloudflared          # macOS: brew install cloudflared
cloudflared tunnel --url http://localhost:3000
```

출력되는 `https://....trycloudflare.com` 주소를 휴대폰에서 엽니다. 위치 동의 화면에서 다시 묻게 하려면 브라우저 사이트 데이터를 지우세요.

## 배포 (Docker 이미지 하나)

```bash
docker build -t moodpass .
docker run -p 3000:3000 --env-file .env -e DATABASE_URL=postgres://... moodpass
```

로컬에서 배포 이미지를 그대로 확인하려면 `docker compose --profile app up --build` → http://localhost:3200

## 구조

```
server/schema.sql            테이블: users, characters, places, partners, experiences, experience_slots,
                             checkins, bookings, postpones, chat_sessions, messages
server/src/config.ts         환경 변수 + 숫자 설정값 (반경, 도보 속도, 경험치, 단계 기준 등)
server/src/setup.ts          migrate, seed (제휴 매장·체험·시간대, 체험 모드)
server/src/routes.ts         API
server/src/services/
  checkin.ts                 01 마음 확인 (위기 감지 → 공감 한마디)
  recommend.ts               02~03 규칙 필터(시간·도보·예산·에너지·남은 시간대) → AI 선택·이유 → id 검증
  booking.ts                 04 예약 요청, 05 완료·기분 기록, 미루기, 기록 조회·삭제
  growth.ts                  경험치, 단계, 꾸미기 아이템
  chat.ts                    속마음 대화
  safety.ts                  위기 키워드, 안전 모드
  llm.ts                     LLMClient, OpenAI 호환 구현체, 예비 전환, JSON 추출 + zod 검증
  places.ts                  PlaceRepository (제휴 매장 저장소), 영업시간 필터
server/scripts/smoke.ts      시연 전 확인 스크립트
web/src/                     App(흐름·탭), screens(화면), Chat(속마음), Bunny(토끼 SVG), Art(체험 그림), Launcher(메인 화면)
```

## API

로그인은 없고 브라우저마다 따로 씁니다. 화면이 처음 열릴 때 무작위 키를 만들어 브라우저에 저장하고, 모든 요청에 `X-User-Key` 헤더로 보냅니다. 서버는 처음 보는 키면 사용자와 토끼를 새로 만듭니다. 헤더가 없으면(curl 등) 기본 사용자 1번입니다.

| | |
| --- | --- |
| `POST /api/checkin` | `{text, emotion, energy, mood}` → `{checkinId, reply, suggestPostpone}` |
| `POST /api/recommend` | `{checkinId, minutes, walk, budget, lat?, lng?, exclude?}` → `{items, free, widened}`. `items`: 위치 주변 제휴 매장 체험(많아도 5개, 없으면 빈 배열), `free`: 같은 위치의 무료 장소(도보 조건 안, 종류별 가장 가까운 곳) |
| `GET /api/experiences` | 전체 체험 (도보 분 포함) |
| `POST /api/bookings` | `{checkinId, experienceId, slotTime}` → 예약 요청 (가격은 DB 값) |
| `GET /api/bookings/active` | 진행 중인 예약 요청 (`arrivedAt`: 도착 확인 시각) |
| `POST /api/bookings/:id/arrive` | `{lat, lng}` → 매장 150m 안이면 `{arrived: true}`. 좌표는 저장하지 않음. 확인이 안 돼도 완료·기록은 가능. `DEMO_MODE`는 거리 무시 |
| `GET /api/places/free?lat&lng` | 주변 무료 장소(카페·도서관·공원, 카카오 로컬) `{items}`. 카카오 키가 없으면 `{items: [], disabled: true}` |
| `GET /api/geocode?query=` | 주소·장소 이름 → `{lat, lng, label}`. 화면은 이 좌표를 브라우저에만 저장하고 추천·체험·무료 장소에 `lat/lng`로 넘김. 키가 없으면 503 |
| `POST /api/bookings/:id/complete` | `{moodAfter}` → 체험 전/후, 경험치, 새 아이템 |
| `POST /api/bookings/:id/cancel` | 예약 요청 취소 |
| `POST /api/postpone` | `{task}` → 오늘 할 일 하나 미루기 |
| `GET /api/memories`, `DELETE /api/memories/:id` | 토끼가 기억하는 것 보기, 하나씩 지우기 |
| `GET/DELETE /api/records` | 기록 조회 / 모두 지우기 (성장은 유지) |
| `GET /api/character`, `POST /api/character/equip` | 캐릭터, 꾸미기 |
| `POST /api/chat` | 속마음 대화 |
| `POST /api/safety/resume` | 안전 모드에서 "대화로 돌아갈래" |

## 지키는 것

- 위기 표현(키워드 또는 AI의 CRISIS 판단)이 나오면 추천·예약을 멈추고 109, 1577-0199를 안내합니다. 새로고침해도 유지됩니다.
- 무드패스는 치료·진단 서비스가 아니며, 토끼는 AI 캐릭터임을 화면에 알립니다.
- 가격·시간은 체험 DB 값만 보여 주고, 예약은 "요청"으로만 표시합니다.
- 위치는 동의한 경우에만 추천할 때 읽고, 좌표는 저장하지 않습니다.
- 기록·토끼·안전 모드는 브라우저(사용자)마다 따로입니다. 한 사람의 위기 표현이 다른 사람의 화면을 막지 않습니다.
- 경험치와 단계는 줄지 않습니다. 쉬는 날 불이익이나 강제 알림이 없습니다.
- 기록은 비공개이고, "내 기록 모두 지우기"를 제공합니다.
- LLM이나 DB가 실패해도 기본 응답으로 화면이 이어집니다.
- 요청 수 제한 (1분에): 전체 API는 IP당 300번, AI를 부르는 마음 확인·추천·속마음은 IP당 60번·사용자당 20번. 넘으면 429와 "조금 천천히 해 줘". 위기 표현이 담긴 요청은 제한하지 않습니다. 숫자는 `config.ts`
- 시연 초기화는 `RESET_TOKEN`을 아는 사람만 (없으면 서버 컴퓨터 자신만) 할 수 있습니다.
