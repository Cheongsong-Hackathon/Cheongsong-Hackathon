# 시안(2026-11-20) 화면용 서버 API

모든 요청에 `X-User-Key` 헤더 (기존 `web/src/api.ts`의 `call`이 붙여 줌). 위치는 `lat`, `lng` (없으면 기본 동네: 영남대).

## 추천: `GET /api/picks`

홈(기분 카드 → 조건 → 무무 AI 맞춤 추천), 탐색, 내 주변이 모두 이것 하나를 씁니다.

| 쿼리 | 값 | 설명 |
| --- | --- | --- |
| `mood` | `tired` `low` `stressed` `bored` `good` `plain` | 기분 카드 6개 (아래 표). 없으면 기분 없이 거리·기운으로만 |
| `types` | `cafe,exhibit,class,popup,nature,etc` (쉼표) | 활동 유형 (카페 · 전시/미술관 · 원데이클래스 · 팝업/체험 · 산책/자연 · 기타). 없으면 전체 |
| `with` | `solo` `pair` `group` | 혼자 / 둘이서 / 여럿이서. 거르지 않고 맞는 곳의 점수만 올림 |
| `travel` | `15` `30` `60` | 이동 시간(분, 도보 기준). 그 밖이면 20 |
| `sort` | `score`(기본) `distance` | 탐색·내 주변 목록은 `distance` |
| `limit` | 1~20 (기본 3) | 홈은 3, 목록은 10~20 |

**예산은 받지 않습니다.** 실시간 가게의 가격을 모르기 때문입니다. 화면에서 예산 칸을 빼거나 "가격은 네이버에서 확인"으로 안내해 주세요.

| `mood` | 카드 | 서버가 읽는 필요 · 기운 |
| --- | --- | --- |
| `tired` | 지치고 피곤해 · 조용히 쉬고 싶어 | 쉬기 · 낮음 |
| `low` | 우울하고 무기력해 · 기분을 환기하고 싶어 | 비우기 · 낮음 |
| `stressed` | 답답하고 스트레스 받아 · 신나게 풀고 싶어 | 풀기 · 보통 |
| `bored` | 심심하고 지루해 · 새로운 경험을 하고 싶어 | 즐기기 · 보통 |
| `good` | 기분이 좋아 · 이 기분을 이어가고 싶어 | 연결 · 높음 |
| `plain` | 그냥 평범해 · 소소한 변화를 주고 싶어 | 몰입 · 보통 |

응답:

```jsonc
{
  "mood": { "key": "tired", "label": "지치고 피곤해" },
  "headline": "오늘은 많이 지쳤구나",            // 홈 제목
  "chips": ["지치고 피곤해", "30분 이내", "혼자"], // "AI 분석 결과" 칩
  "suggestion": "30분만 밖에 나가볼까? 짧은 외출도 기분을 바꿔 줄 수 있어.", // "오늘의 작은 제안"
  "items": [{
    "id": "live:library:12345",       // 예시 매장 체험이면 "quiet-cafe" 같은 id
    "title": "도서관에서 조용히 쉬기",
    "placeName": "영남대학교 중앙도서관",
    "description": "…",
    "group": "etc", "groupLabel": "기타",
    "category": "library",            // web/src/Art.tsx 그림 키 (사진 없을 때)
    "walkMinutes": 2, "distanceM": 120, "lat": 35.83, "lng": 128.75,
    "reasonChips": ["지친 기분 회복", "30분 이내", "혼자 가기 좋음"], // "추천 이유" 칩 (최대 3)
    "photo": { "uri": "…", "author": "…", "authorUri": "…" } | null,  // 큰 사진엔 "사진: author · Google Maps"
    "mapUrl": "https://map.naver.com/p/search/…",  // 예약·가격·영업시간은 네이버
    "live": true                      // 실시간 가게 (가기로 한 곳 기록 때 placeName·lat·lng를 같이 보냄)
  }]
}
```

가기로 한 곳 기록·다녀왔어는 기존 그대로입니다 (`POST /api/bookings`, `/complete`, README 참고).

## 찜: `GET/POST/DELETE /api/saved`

- `GET /api/saved` → `{ items: [{ id, itemId, title, category, placeName, lat, lng, group, groupLabel, mapUrl, createdAt }] }`
- `POST /api/saved` `{ itemId, placeName?, lat?, lng? }` → `{ saved: true, items }`. 실시간 가게(`live:…`)는 `placeName`, `lat`, `lng`도 보냄. 같은 곳 두 번은 무시
- `DELETE /api/saved/:id` → `{ deleted: true }`

## 마이 숫자: `GET /api/summary`

→ `{ saved, visited, memories }` (찜한 스팟, 다녀온 곳, 무무가 기억하는 것)

## 서버에 없는 것 (화면만 있다면 "예시"로 표시)

- 커뮤니티 글·댓글·좋아요
- 무무 플러스(결제)
- "지금 인기 있는 스팟"의 실제 인기 데이터 → 지금은 `sort=distance` 같은 다른 기준으로 대신
- 전시 기간·영업 중 여부·가격 → 네이버에서 확인
