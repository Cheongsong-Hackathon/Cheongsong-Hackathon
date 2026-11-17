# 무드패스 (MoodPass)

오늘의 감정과 에너지에 맞는 가까운 체험을 추천하고, 예약 요청부터 체험 후 기분 기록까지 연결하는 AI 기반 일상 회복 모바일 웹 (해커톤 시연용). 기준 문서: `무드패스_사업계획서 .pdf`.

- `server/` — Express + TypeScript + PostgreSQL. API와 `web/` 빌드 결과를 함께 서빙
- `web/` — React + Vite 모바일 웹 (항상 휴대폰 테두리 안에 표시)
- 체험 모드: 매장·가격·예약은 가상이고, 실결제는 없습니다

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
npm run seed                         # 모든 데이터를 지우고 seed(가상 매장 8곳, 체험 12개)를 다시 넣음

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
| `DEMO_MODE` | `true`면 지난 시간대·영업시간을 따지지 않고, 내 위치 주변에 매장이 없으면 `DEMO_CENTER` 기준으로 추천. `/api/demo/reset` 열림 |
| `DEMO_CENTER_LAT/LNG` | seed 매장을 배치하는 기준 좌표, 위치 동의를 안 했을 때의 기준 위치. 바꾸면 `npm run seed`를 다시 |
| `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY` | 주 LLM (OpenAI 호환 API) |
| `LLM_FALLBACK_BASE_URL`, `LLM_FALLBACK_MODEL`, `LLM_FALLBACK_API_KEY` | 예비 LLM. 비우면 사용 안 함 |
| `KAKAO_REST_API_KEY` | 카카오 로컬 REST API 키. 무료 장소 검색과 주소 → 좌표. 비우면 두 기능만 꺼짐 |

API 키는 서버에만 있고 프론트로 보내지 않습니다. `.env`는 커밋하지 않습니다.

### 무료 LLM 설정 예

| 공급자 | `LLM_BASE_URL` | `LLM_MODEL` 예 |
| --- | --- | --- |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-2.0-flash` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |

모델 이름과 무료 한도는 자주 바뀌니 각 공급자 콘솔에서 확인하세요.

동작 순서: 주 공급자 → (429·타임아웃·오류) 예비 공급자 → 기본 답장. 전체 8초를 넘기면 기본 답장으로 넘어갑니다. LLM은 세 곳에만 씁니다: 마음 확인의 공감 한마디, 추천 순서와 이유, 속마음 대화. 가격·시간·장소는 AI가 만들지 않고 체험 DB 값만 보여 줍니다.

### LLM 사용량 확인

호출할 때마다 서버 로그에 한 줄씩 남습니다. `#` 뒤 숫자가 오늘 누적 호출 수입니다.

```
[llm] 2026-11-20 #12 primary ok 840ms
[llm] 2026-11-20 #13 primary FAIL 5001ms timeout
[llm] 2026-11-20 #14 fallback ok 610ms
```

`GET /api/health`에서도 오늘 집계를 볼 수 있습니다. 서버를 다시 시작하면 0부터 셉니다.

## 시연 전 확인

```bash
cd server
npm run smoke                                   # 로컬 서버 (.env의 PORT)
BASE_URL=https://배포주소 npm run smoke          # 배포 서버  (PowerShell: $env:BASE_URL='https://...'; npm run smoke)
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
server/src/setup.ts          migrate, seed (가상 제휴 매장·체험·시간대)
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
| `POST /api/recommend` | `{checkinId, minutes, walk, budget, lat?, lng?, exclude?}` → `{items(2~5개), widened}` |
| `GET /api/experiences` | 전체 체험 (도보 분 포함) |
| `POST /api/bookings` | `{checkinId, experienceId, slotTime}` → 예약 요청 (가격은 DB 값) |
| `GET /api/bookings/active` | 진행 중인 예약 요청 (`arrivedAt`: 도착 확인 시각) |
| `POST /api/bookings/:id/arrive` | `{lat, lng}` → 매장 150m 안이면 `{arrived: true}`. 좌표는 저장하지 않음. 확인이 안 돼도 완료·기록은 가능. `DEMO_MODE`는 거리 무시 |
| `GET /api/places/free?lat&lng` | 주변 무료 장소(카페·도서관·공원, 카카오 로컬) `{items}`. 카카오 키가 없으면 `{items: [], disabled: true}` |
| `GET /api/geocode?query=` | 주소·장소 이름 → `{lat, lng, label}`. 화면은 이 좌표를 브라우저에만 저장하고 추천·체험·무료 장소에 `lat/lng`로 넘김. 키가 없으면 503 |
| `POST /api/bookings/:id/complete` | `{moodAfter}` → 체험 전/후, 경험치, 새 아이템 |
| `POST /api/bookings/:id/cancel` | 예약 요청 취소 |
| `POST /api/postpone` | `{task}` → 오늘 할 일 하나 미루기 |
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
