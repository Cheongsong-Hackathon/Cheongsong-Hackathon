# 무무 (MoodPass)

> 집에만 있는 지친 날, "뭘 하지"를 대신 정해 주고 실제로 나가면 자라는 친구.

무무와 이야기하거나 지금 필요한 것을 고르면 **근처 실제 가게**(카페·도서관·공원·코인노래방·볼링장·공방·전시·셀프 사진관 등)를 추천하고, 네이버 지도(네이버 예약)로 연결합니다. 다녀와서 기분을 기록하면 무무가 자랍니다. 제2회 영남대 SW중심대학 융합그룹 창업 해커톤 출품작(모바일 웹 시연)입니다.

- `server/`: Express + TypeScript + PostgreSQL. API와 `web/` 빌드 결과를 함께 서빙
- `web/`: React + Vite 모바일 웹 (항상 휴대폰 테두리 안에 표시)
- 배포: https://blackapple.store (네이버 클라우드, Docker)
- 결제는 없습니다. 가격·영업시간·실제 예약은 네이버에서 확인합니다.

## 화면 흐름

```
휴대폰 메인 화면 "눌러 봐!" → 랜딩 → 위치 동의(거절해도 됨)
  ├─ 홈: 무무 + 말풍선 → 누르면 대화 (첫마디는 버튼 4개 또는 직접 입력)
  └─ 둘러보기: 지금 필요한 것(조용히 쉬고 싶어 / 털어내고 싶어 / 재밌는 거 …)을 고르면 근처 가게
        ↓ 카드 (실제 사진, 도보 N분)
  "여기 가 볼래?" → 지금 기분(1~10) → "네이버에서 예약하기" (네이버 지도의 그 가게가 열림)
        ↓
  마이페이지 "가기로 한 체험" → 도착했어(GPS) / 다녀왔어 + 기분 → 체험 전 4 → 후 8, 무무 성장
```

| 하단 탭 | 내용 |
| --- | --- |
| **홈** | 무무, 말풍선 "오늘 어땠어? 근처에서 기분 전환할 거리 같이 찾아볼까?", 경험치 막대. 무무를 누르면 대화 |
| **둘러보기** | 대화 없이 필요를 골라 근처 실제 가게 6곳 (설문 1위 기능 "주변 장소 탐색" 74%) |
| **마이페이지** | 가기로 한 체험, 도감, 무무 옷장(입혀 보기), 기분 기록(이번 주 표정·무무가 기억하는 것·기록 지우기), 내 장소 바꾸기, 할 일 미루기 |

## 추천은 어떻게 고르나

대화(`/api/talk`)와 둘러보기(`/api/browse`)는 같은 후보와 같은 점수 규칙을 씁니다.

| 단계 | 누가 | 내용 |
| --- | --- | --- |
| 1. 말에서 읽기 (대화만) | AI | 필요 6가지(비우기·쉬기·풀기·몰입·즐기기·연결, 근거: `docs/필요분류_근거.md`), 기운, 원함·피함(고정 태그), 반응(멀어·비싸·힘들어) |
| 2. 묻기 | 코드 | 필요를 모를 때만, 많아도 2번. "그냥 추천해 줘"·"아무거나"면 묻지 않고 바로 추천 |
| 3. 후보 모으기 | 코드 | 예시 매장 10곳(영남대 근처) + **카카오 실시간 검색**(만화카페·찜질방·공원·꽃집·도자기공방·코인노래방·볼링장·클라이밍·보드게임카페·방탈출·미술관·갤러리·셀프 사진관·도서관·카페). 검색어는 정해진 목록에서만, 카카오 업종 이름으로 한 번 더 거름 (`services/livePlaces.ts`) |
| 4. 점수 | 코드 (`services/match.ts`) | 필요·원함과 맞는 특징, 지금 기운으로 할 만한지, 도보(기본 20분, 맞는 게 없으면 30분까지), 전에 다녀와서 기분이 오른 체험. 필요와 반대되는 특징은 감점. 같은 종류는 한 곳씩 먼저. **맞는 것만 (채워 넣지 않음)** |
| 5. 이유 (대화만) | AI | 순서는 바꾸지 않고 이유 한 줄만 |
| 6. 사진 | 구글 | 이유를 쓰는 동안 함께 받아 카드와 같이 보냄 (아래 "사진") |

**AI가 지어내지 못하게 코드가 막는 것** (모두 실제로 나온 실패를 재현한 테스트가 있음)

- 피할 것·시간·예산은 사용자가 관련된 말을 했을 때만 받음 ("심심해"에서 AI가 "실내"를 피하게 해 0건이 된 적 있음)
- 기운을 말하지 않으면 "보통"으로 봄 ("낮음"으로 보면 노래방·볼링이 전부 빠졌음)
- "다른 거 보여 줘"로 맞는 걸 다 봤으면 본 것 중에서 다시 ("새로운 건 더 없어서…")
- 근처에 맞는 곳이 아예 없으면 "장소를 바꿔 볼래?"
- 장소를 바꾸면 대화를 새로 시작

**안전망:** 위기(CRISIS)면 추천을 멈추고 안전 화면으로 갑니다. 위험도가 WATCH로 한 번이라도 나오면 그 대화의 응답마다 상담 번호(109·1577-0199)를 함께 보냅니다. 추천은 막지 않습니다 (근거·평가: `docs/설계근거_점검.md`).

## 진짜인 것과 확인 안 된 것

| 진짜 | 확인 안 됨 |
| --- | --- |
| 가게 이름·위치(카카오), 사진(구글), 네이버 지도 링크 | 가게가 실제로 원데이 클래스 등을 하는지 → 문구는 "있는지 네이버에서 확인해 봐요" |
| 도보 시간 (단, 직선거리 ÷ 분당 67m라 실제보다 짧게 나올 수 있음) | 영업시간 (카카오가 주지 않음) |
| 내 기록, 무무 성장, 무무가 기억하는 것 | 가격·소요 시간·시간대 → **화면과 추천 판단에서 모두 뺐음** (DB에는 남아 있음) |

예시 매장 10곳은 영남대 근처 실제 가게의 이름·위치를 빌려 왔고 **제휴하지 않았습니다**. 같은 업종의 실시간 가게와 같은 문구를 씁니다.

## 처음 실행

필요한 것: Node 22 이상, Docker.

```bash
cp .env.example .env                 # 키를 넣는다 (없어도 기본 답장·예시 매장만으로 동작)
docker compose up -d db              # PostgreSQL (localhost:5433)

cd server && npm install
npm run migrate                      # 테이블 생성 (server/schema.sql)
npm run seed                         # 모든 데이터를 지우고 seed를 다시 넣음

cd ../web && npm install && npm run build
cd ../server && npm run dev          # http://localhost:3000 (API + 화면, .env의 PORT)
```

서버는 시작할 때 마이그레이션을 스스로 하고, 체험 DB가 비어 있으면 seed도 넣습니다. 화면을 고치면서 볼 때는 터미널을 하나 더 열어 `cd web && npm run dev` (http://localhost:5173, `/api`는 서버로 프록시).

## .env

| 값 | 설명 |
| --- | --- |
| `PORT` | 서버 포트 (기본 3000. 다른 프로그램이 3000을 쓰면 3100 등으로) |
| `APP_PORT` | `docker compose --profile app`의 바깥 포트. 배포 서버는 `127.0.0.1:3200` (Caddy가 받음) |
| `DATABASE_URL` | PostgreSQL 주소. 클라우드 DB는 보통 끝에 `?sslmode=require` |
| `DEMO_MODE` | `true`면 지난 시간대·영업시간을 따지지 않고, "도착했어"의 거리를 따지지 않음. `/api/demo/reset` 열림 |
| `DEMO_CENTER_LAT/LNG` | 위치 동의를 안 했을 때의 기준 위치 (기본: 영남대 경산캠퍼스) |
| `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY` | 주 LLM (OpenAI 호환 API) |
| `LLM_FALLBACK_*` | 예비 LLM (CLOVA Studio HCX-007). 비우면 사용 안 함. CLOVA는 `LLM_FALLBACK_STRUCTURED=true`, `LLM_FALLBACK_EXTRA={"reasoning_effort":"none"}` |
| `KAKAO_REST_API_KEY` | 카카오 로컬. **실시간 가게 검색·둘러보기**, 주소 → 좌표. 비우면 예시 매장만 |
| `GOOGLE_PLACES_KEY` | Google Places API (New). 가게 실제 사진. 비우면 그림 |
| `RESET_TOKEN` | 시연 초기화 비밀 값. 비우면 서버 컴퓨터 자신(localhost)에서만 초기화 가능. **배포 서버에는 꼭 넣기** |

API 키는 서버에만 있고 화면으로 보내지 않습니다. `.env`는 커밋하지 않습니다.

### LLM

| 공급자 | `LLM_BASE_URL` | 모델 | 쓰임 |
| --- | --- | --- | --- |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-3.1-flash-lite` | **주 LLM** (JSON 17/17, 1.5~5초, 사용자 사정을 반영) |
| CLOVA Studio | `https://clovastudio.stream.ntruss.com/v1/openai` | `HCX-007` + 형식 강제, 추론 끔 | **예비 LLM** (JSON 17/17, 0.7~0.9초, 짧고 일반적) |

모델 선택 근거는 2026-11-18 `npm run prompt-eval`(테스트 문장 17개). HCX-005·HCX-DASH-002는 JSON 지시를 무시해서, NVIDIA 무료 모델은 대기열로 시간 초과가 나서 쓰지 않습니다.

동작 순서: 주 공급자 → (429·타임아웃·오류) 예비 공급자 → 기본 답장. 전체 8초를 넘기면 기본 답장. 서버를 켜면 AI를 한 번 미리 부르고, 로그에 `[llm] 준비 완료`가 나오면 정상입니다. 호출마다 로그에 `[llm] 2026-11-20 #12 primary ok 840ms`처럼 남고, `GET /api/health`(배포: https://blackapple.store/api/health)에서 지금 모델과 오늘 집계를 볼 수 있습니다.

### 사진 (Google Places API New)

- 가게 근처에서 이름으로 구글 장소를 찾고, **80m 안이면서 이름이 겹칠 때만** 같은 가게로 봅니다 (아주 가까우면 앞 4글자만 같아도). 이름만 보면 다른 가게가 걸리기 때문입니다 (`services/googlePhoto.ts`).
- 약관상 저장해도 되는 건 구글 장소 ID뿐이라, ID만 서버 메모리에 기억하고 사진은 볼 때마다 받습니다.
- 큰 사진에는 사진 올린 사람과 "Google Maps"를 표시합니다 (구글 정책).
- 사진이 없거나 같은 가게로 확인되지 않으면 업종 그림(`web/src/Art.tsx`)을 보여 줍니다.

## 무무 성장과 기록

- 경험치: **다녀왔어 + 기분 기록 +20**, 할 일 미루기 +5 (하루 한 번). 대화나 추천만으로는 오르지 않습니다. 줄어들지 않습니다.
- 성장 모습 5단계: 0·20·40·75·120 EXP (서버 단계와 화면의 무무 모습이 같음). 단계마다 리본·목도리·베레모가 생깁니다.
- 체험 전 기분(예약할 때)과 체험 후 기분(다녀왔어)으로 "전 4 → 후 8"과 이번 주 기분 표정을 만듭니다.
- **무무의 기억:** 대화가 끝나면 AI가 "다음에 도움이 될 사실"(취향·상황·사건, 사용자당 최대 20개)을 뽑아 둡니다 (`services/memory.ts`). 위기·건강·연락처는 저장하지 않고, 마이페이지 → 기분 기록에서 하나씩 지우거나 모두 지울 수 있습니다.
- **시연용 사용자:** 주소 끝에 `?demo`를 붙여 열면 일주일 남짓 써 온 사용자가 됩니다 (기록·기억이 미리 들어 있음, seed·초기화 때 다시 만들어짐).

## 확인하기

```bash
cd server
npm test                         # 단위 테스트 (73개)
npm run smoke                    # API를 한 번에 돌려 보기 (아래 주의)
SCENARIO_RUNS=5 npm run scenario # 대화 시나리오 검사
npm run eval:sim && npm run eval:score   # 평가 시험지 (server/eval/goldens*.json)
```

- `smoke`는 **모든 사용자의 데이터를 초기화**합니다. `DEMO_MODE=true` 서버에서만 동작하고 끝나면 다시 초기화합니다. 팀원들이 쓰는 배포 서버에서 돌리면 그 기록도 지워집니다. 배포 서버 대상: `BASE_URL=https://... RESET_TOKEN=... npm run smoke`.
- 평가(2026-11-18): AI가 만든 시험지 30문항 필요 정답률 96%, 사람이 쓴 26문항 68%. 사람 문장에서 틀린 것은 대부분 "비우기"로 잘못 읽은 경우였습니다.

## 휴대폰으로 보기

브라우저 위치 기능은 HTTPS나 localhost에서만 동작합니다. 배포 주소(https://blackapple.store)로 열거나, 로컬은 터널로 HTTPS 주소를 만드세요.

```bash
cd web && npm run build && cd ../server && npm run dev
cloudflared tunnel --url http://localhost:3000     # 설치: winget install Cloudflare.cloudflared
```

## 배포

```bash
# 배포 서버 (blackapple.store)
cd ~/Cheongsong-Hackathon && git pull
docker compose --profile app up -d --build        # 앱 + DB, 127.0.0.1:3200 → Caddy
curl -s -X POST localhost:3200/api/demo/reset     # seed가 바뀐 배포 뒤에만 (모든 데이터 초기화)
curl -s localhost:3200/api/health
```

docker-compose가 컨테이너 안의 `PORT=3000`과 `DATABASE_URL`(db 컨테이너)을 정합니다. 서버 `.env`에는 키들과 `APP_PORT=127.0.0.1:3200`, `RESET_TOKEN`을 넣습니다. 이미지만 따로: `docker build -t moodpass . && docker run -p 3000:3000 --env-file .env -e DATABASE_URL=postgres://... moodpass`.

## 구조

```
server/schema.sql             테이블 (users, characters, places, experiences, bookings, chat_sessions, messages, memories, postpones 등)
server/src/config.ts          환경 변수 + 숫자 설정값 (반경, 도보 속도, 경험치, 성장 단계, 요청 제한)
server/src/setup.ts           migrate, seed (예시 매장 10곳·체험, 시연용 사용자)
server/src/routes.ts          API
server/src/services/
  talk.ts                     대화 추천: 말 읽기 → 묻기/추천 → 점수 → 이유 → 사진
  browse.ts                   둘러보기: 필요를 고르면 같은 후보·점수로 근처 가게
  livePlaces.ts               카카오 실시간 가게 종류(LIVE_KINDS), 업종 거르기, 예시 매장과 합치기
  match.ts                    필요·태그·점수 규칙 (rankForPrefs, 종류 섞기, 다시 보여 주기)
  recommend.ts                예시 매장 후보(체험 DB), 도보 계산
  googlePhoto.ts              구글 사진, 같은 가게 판정
  kakao.ts                    카카오 검색, 네이버 지도 링크, 주소 → 좌표
  booking.ts                  가기로 한 체험(예시 매장·실시간 가게), 도착 확인, 다녀왔어, 미루기, 기록
  growth.ts                   경험치, 성장 단계, 아이템
  memory.ts                   무무의 기억
  safety.ts, llm.ts           위기 감지·안전 모드, LLM 클라이언트(예비 전환, JSON 검증)
server/eval/                  평가 시험지·실행·채점
web/src/
  App.tsx                     흐름·탭
  screens.tsx                 홈·확인·완료·기록 등 화면
  Chat.tsx, talkClient.ts     무무와 대화
  Browse.tsx                  둘러보기
  PlaceArt.tsx, Art.tsx       가게 사진 / 업종 그림
  Bunny.tsx, MumuShop.tsx     무무 캐릭터 / 무무 옷장
  Launcher.tsx                휴대폰 메인 화면 (배경: web/public/wallpaper.jpg를 넣으면 그 사진, 없으면 저녁 하늘)
docs/                         설계근거_점검.md(주장별 근거 등급), 필요분류_근거.md, 김준수_작업안내.md
```

## API

로그인은 없고 브라우저마다 따로 씁니다. 화면이 처음 열릴 때 무작위 키를 만들어 브라우저에 저장하고, 모든 요청에 `X-User-Key` 헤더로 보냅니다. 처음 보는 키면 사용자와 무무를 새로 만듭니다.

| | |
| --- | --- |
| `POST /api/talk` | **대화 추천 (핵심).** `{sessionId?, message, lat?, lng?}` → `{action: ask \| recommend \| none \| safety, reply, quickReplies, items(많아도 3개, photo 포함), assumptions, support?}` |
| `GET /api/browse?need&lat&lng` | 둘러보기. `need`는 필요 6가지 중 하나(없으면 전체) → `{items}` (많아도 6개, photo 포함) |
| `POST /api/bookings` | 가기로 한 체험 기록. 예시 매장 `{experienceId, slotTime, moodBefore?}`, 실시간 가게 `{experienceId: "live:종류:카카오id", placeName, lat, lng, moodBefore?}` (제목·그림은 서버 목록에서). 응답의 `mapUrl`은 네이버 지도 |
| `GET /api/bookings/active` | 진행 중인 것 (`arrivedAt`: 도착 확인 시각) |
| `POST /api/bookings/:id/arrive` | `{lat, lng}` → 가게 150m 안이면 `{arrived: true}`. 좌표는 저장하지 않음. `DEMO_MODE`는 거리 무시 |
| `POST /api/bookings/:id/complete` | `{moodAfter}` → 체험 전/후, 경험치, 새 아이템 |
| `POST /api/bookings/:id/cancel` | 취소 |
| `POST /api/postpone` | `{task}` → 할 일 하나 미루기 (경험치는 하루 한 번) |
| `GET /api/places/:id/photo` | 예시 매장 사진 (없으면 204) |
| `GET /api/geocode?query=` | 주소·장소 이름 → `{lat, lng, label}`. 화면은 이 좌표를 브라우저에만 저장 |
| `GET /api/memories`, `DELETE /api/memories/:id` | 무무가 기억하는 것 |
| `GET/DELETE /api/records` | 기록 조회(이번 주 기분 포함) / 모두 지우기 (성장은 유지) |
| `GET /api/character`, `POST /api/character/equip` | 캐릭터, 아이템 착용 |
| `POST /api/safety/resume` | 안전 모드에서 "대화로 돌아갈래" |
| `GET /api/health` | 상태, 모델, 오늘 LLM 호출 수 |

이전 흐름의 API(`/api/checkin`, `/api/recommend`, `/api/chat`, `/api/experiences`, `/api/places/free`)는 남아 있지만 지금 화면에서는 쓰지 않습니다 (`npm run smoke`가 사용).

## 지키는 것

- 위기 표현(키워드 또는 AI의 CRISIS 판단)이 나오면 추천·예약을 멈추고 109, 1577-0199를 안내합니다. 새로고침해도 유지됩니다.
- 무무는 치료·진단 서비스가 아니며, AI 캐릭터임을 화면에 알립니다.
- 확인되지 않은 가격·시간·가게의 체험 내용을 보여 주지 않습니다. 실제 정보는 네이버에서 확인하게 합니다.
- **추천 순서는 돈으로 바뀌지 않습니다** (설문 1위 우려: 광고·제휴 위주 추천 37%).
- 위치는 동의한 경우에만 읽고, 사용자 좌표는 저장하지 않습니다 (가게 좌표는 공개 정보라 기록에 남김).
- 경험치와 단계는 줄지 않습니다. 쉬는 날 불이익이나 강제 알림이 없습니다.
- 기록은 비공개이고, "내 기록 모두 지우기"를 제공합니다. 기록·무무·안전 모드는 사용자마다 따로입니다.
- LLM·카카오·구글·DB가 실패해도 기본 답장, 예시 매장, 그림으로 화면이 이어집니다.
- 요청 수 제한 (1분에): 전체 API는 IP당 300번, AI를 부르는 요청은 IP당 60번·사용자당 20번, 둘러보기 IP당 30번, 사진 IP당 60번. 위기 표현이 담긴 요청은 제한하지 않습니다.
- 시연 초기화는 `RESET_TOKEN`을 아는 사람만 (없으면 서버 컴퓨터 자신만) 할 수 있습니다.
