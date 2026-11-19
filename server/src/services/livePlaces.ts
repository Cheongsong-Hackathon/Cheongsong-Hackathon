// 실시간 가게 찾기: 대화로 읽은 필요에 맞는 실제 가게를 카카오 지도에서 그때그때 찾는다 (어느 동네에서든).
// - 검색어는 AI가 만들지 않고 아래 목록에서만 쓴다 (지친 사람에게 권하기 곤란한 술집 등이 섞이지 않게).
// - 같은 검색어에 다른 업종이 섞여서(보드게임카페 → 방탈출 테마카페) 카카오 업종 이름으로 한 번 더 거른다.
// - 가게가 실제로 무엇을 하는지·가격·영업시간은 모르므로 지어내지 않는다: 제목은 그 업종에서 누구나 할 수 있는 일, 확인은 네이버에서.
// 어떤 필요에 어떤 가게가 맞는지는 태그로 정하고, 점수는 체험 DB와 같은 규칙(match.ts)으로 매긴다.
import { config } from '../config.js';
import { validLatLng, walkMinutes, type LatLng } from '../geo.js';
import { naverMapUrl, searchKeyword } from './kakao.js';
import type { Tag, TaggedCandidate } from './match.js';

type Kind = { q: string; cat: string; title: string; description: string; art: string; tags: Tag[]; energyNeed: number };

/** 2026-11-19 영남대·동성로에서 검색어별 카카오 업종 이름을 보고 정함 (북카페는 만화카페만 나와서 만화카페로, 향수공방은 업종이 "미술,공예"로만 나와서 뺌) */
export const LIVE_KINDS: Record<string, Kind> = {
  comic: { q: '만화카페', cat: '만화방', title: '만화카페에서 늘어지기', description: '아무 생각 없이 만화책 넘기며 쉬어 가요.', art: 'book', tags: ['조용함', '혼자 가능', '가만히 쉬기', '실내'], energyNeed: 0 },
  sauna: { q: '찜질방', cat: '찜질방', title: '찜질방에서 몸 녹이기', description: '따뜻한 데 누워 있다 오기만 해도 돼요.', art: 'meditation', tags: ['가만히 쉬기', '혼자 가능', '실내'], energyNeed: 0 },
  park: { q: '공원', cat: '공원', title: '공원 한 바퀴 걷기', description: '바람 쐬면서 천천히 걸어요.', art: 'flower', tags: ['조용함', '혼자 가능', '가만히 쉬기', '바깥'], energyNeed: 10 },
  flower: { q: '꽃집', cat: '꽃집', title: '꽃집 구경하고 한 송이', description: '좋아하는 색 꽃 한 송이 골라 와요.', art: 'flower', tags: ['조용함', '혼자 가능', '실내'], energyNeed: 10 },
  pottery: { q: '도자기공방', cat: '도자기', title: '도자기 공방 원데이 클래스', description: '흙 만지는 원데이 클래스가 있는지 네이버에서 확인해 봐요.', art: 'pottery', tags: ['손으로 만들기', '조용함', '혼자 가능', '실내'], energyNeed: 30 },
  karaoke: { q: '코인노래방', cat: '노래방', title: '코인노래방 몇 곡', description: '소리 내서 부르고 나면 조금 시원해져요.', art: 'karaoke', tags: ['소리 내기', '혼자 가능', '실내'], energyNeed: 50 },
  bowling: { q: '볼링장', cat: '볼링장', title: '볼링 한 게임', description: '공 굴리고 핀 쓰러지는 소리에 속이 풀려요.', art: 'climbing', tags: ['몸 쓰기', '같이 하기', '실내'], energyNeed: 50 },
  climbing: { q: '클라이밍', cat: '클라이밍', title: '클라이밍 체험', description: '처음이면 쉬운 벽부터 해 봐요.', art: 'climbing', tags: ['몸 쓰기', '사람 많음', '실내'], energyNeed: 70 },
  board: { q: '보드게임카페', cat: '보드카페', title: '보드게임 한 판', description: '친구랑, 혹은 가볍게 한 판.', art: 'boardgame', tags: ['같이 하기', '사람 많음', '실내'], energyNeed: 40 },
  escape: { q: '방탈출', cat: '방탈출', title: '방탈출 한 번', description: '머리 쓰며 같이 빠져나와요.', art: 'boardgame', tags: ['같이 하기', '실내'], energyNeed: 40 },
  // 설문(2026-11-19, 86명) "해 보고 싶은 체험" 2위 전시·팝업 53%, 7위 셀프 사진관 20%를 보고 추가.
  // 전시는 "미술관"(문화시설>미술관)과 "갤러리"(화랑)로 찾는다. "전시회"로 찾으면 식당이 나오고, 팝업스토어는 기간 한정이라 지도에 거의 없어서 뺌
  museum: { q: '미술관', cat: '미술관', title: '전시 보러 가기', description: '천천히 둘러보며 머리를 비워요. 지금 하는 전시는 네이버에서 확인해 줘.', art: 'drawing', tags: ['조용함', '혼자 가능', '실내'], energyNeed: 20 },
  gallery: { q: '갤러리', cat: '화랑', title: '전시 보러 가기', description: '천천히 둘러보며 머리를 비워요. 지금 하는 전시는 네이버에서 확인해 줘.', art: 'drawing', tags: ['조용함', '혼자 가능', '실내'], energyNeed: 20 },
  photo: { q: '셀프사진관', cat: '즉석사진', title: '셀프 사진관에서 네 컷', description: '친구랑, 혹은 혼자 가볍게 찍고 와요.', art: 'drawing', tags: ['같이 하기', '혼자 가능', '실내'], energyNeed: 20 },
};

/** 카카오 검색 결과 하나 → 추천 후보. 업종이 다르거나 좌표·거리가 없으면 null */
export function toLiveCandidate(key: string, d: any): TaggedCandidate | null {
  const k = LIVE_KINDS[key];
  const segments = String(d?.category_name ?? '').split(' > ').slice(1); // 맨 앞(음식점·가정,생활 같은 큰 분류)은 빼고
  if (!k || !segments.some((s) => s.includes(k.cat))) return null;
  const lat = Number(d?.y);
  const lng = Number(d?.x);
  const distanceM = d?.distance ? Number(d.distance) : NaN; // Number('')은 0이라 따로 막는다
  if (!d?.id || !d?.place_name || ![lat, lng, distanceM].every(Number.isFinite)) return null;
  return {
    id: `live:${key}:${d.id}`,
    title: k.title,
    category: k.art,
    minutes: 0, // 모름: 화면에 보이지 않고, 시간·예산 조건에서 빼지 않는다
    price: 0,
    moods: [],
    energyNeed: k.energyNeed,
    description: k.description,
    placeId: '',
    slots: [],
    placeName: d.place_name,
    lat,
    lng,
    distanceM,
    walkMinutes: walkMinutes(distanceM),
    availableSlots: [],
    mapUrl: naverMapUrl(d.place_name),
    hasPhoto: false,
    live: true,
    tags: k.tags,
  };
}

/** 내 주변 실시간 후보: 종류마다 가까운 몇 곳. 카카오 키가 없거나 실패하면 빈 배열 (체험 DB만으로 추천) */
export async function liveCandidates(pos: LatLng, perKind = 2): Promise<TaggedCandidate[]> {
  const lists = await Promise.all(
    Object.entries(LIVE_KINDS).map(([key, k]) =>
      searchKeyword(k.q, pos, config.SEARCH_RADIUS_M).then((docs) =>
        (docs ?? []).map((d) => toLiveCandidate(key, d)).filter((c): c is TaggedCandidate => !!c).slice(0, perKind),
      ),
    ),
  );
  return lists.flat();
}

/** "가기로 한 곳" 기록용 입력. 종류(제목·그림)는 id에서 서버 목록으로만 정하고, 화면에서 받는 건 가게 이름과 좌표(공개 정보)뿐 */
export function parseLiveBooking(body: any): { kind: string; placeName: string; lat: number; lng: number } | null {
  const m = /^live:([a-z]+):\d+$/.exec(String(body?.experienceId ?? ''));
  if (!m || !(m[1] in LIVE_KINDS)) return null;
  const placeName = typeof body?.placeName === 'string' ? body.placeName.trim() : '';
  const pos = validLatLng(body?.lat, body?.lng);
  if (!placeName || placeName.length > 60 || !pos) return null;
  return { kind: m[1], placeName, lat: pos.lat, lng: pos.lng };
}
