// 매장의 실제 사진 (Google Places API New).
// 약관상 저장해도 되는 건 장소 ID뿐이라 사진 이름·주소는 저장하지 않고 볼 때마다 받는다.
// 키(GOOGLE_PLACES_KEY)가 없거나 실패하면 null → 화면은 지금 그림을 그대로 보여 준다.
import { config } from '../config.js';
import { haversineM, type LatLng } from '../geo.js';

/** 우리 매장 id → 구글 장소 ID. 이름으로 검색하면 다른 가게가 걸리는 곳이 있어서
 *  (예: 히어로보드게임카페 → 다른 카페) 사람이 맞는 가게인지 확인한 곳만 고정한다. 2026-11-19 확인 */
export const GOOGLE_PLACE_IDS: Record<string, string> = {
  'cafe-som': 'ChIJ98EL8RQMZjUR9QumUNsMoqs',
  'rose-fleur': 'ChIJi2g2dhQMZjURuNd77PlE5V4',
  challenger: 'ChIJB3XR8UMMZjUREMOLGJJk3ZU',
};

/** 실제 사진을 받을 수 있는 매장인지. 화면은 이걸 보고 사진 자리를 비워 두고 기다린다(그림이 먼저 번쩍이지 않게) */
export const hasPhoto = (placeId: string) => !!config.googlePlacesKey && placeId in GOOGLE_PLACE_IDS;

const BASE = 'https://places.googleapis.com/v1';
const TIMEOUT_MS = 4000;
const SAME_STORE_M = 80; // 카카오 좌표와 구글 좌표가 이 안이어야 같은 가게로 본다

export type PlacePhoto = { uri: string; author: string; authorUri: string | null };

const headers = () => ({ 'X-Goog-Api-Key': config.googlePlacesKey });
const norm = (s: string) => s.replace(/[\s·.\-_()]/g, ''); // 띄어쓰기·문장부호 무시 (228 ↔ 2·28)

/** 카카오 가게와 구글 장소가 같은 가게인지: 가깝고(80m) 한쪽 이름이 다른 쪽에 들어 있어야 함 (지점명 "대구동성로점" 차이 허용).
 *  아주 가까우면(30m) 앞 4글자만 같아도 같은 가게로 본다 (천마볼링센타 ↔ 천마볼링장) */
export function sameStore(kakaoName: string, googleName: string, distanceM: number) {
  const [a, b] = [norm(kakaoName), norm(googleName)];
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (distanceM > SAME_STORE_M || short.length < 2) return false;
  return long.includes(short) || (distanceM <= 30 && short.length >= 4 && a.slice(0, 4) === b.slice(0, 4));
}

// 가게(kakao:카카오id, db:우리 매장 id) → 구글 장소 ID (못 찾으면 null). 약관상 장소 ID는 저장해도 된다.
// ponytail: 서버 메모리라 재시작하면 다시 찾는다. 가게가 많아지면 DB 칼럼으로.
const matched = new Map<string, string | null>();

/** 실시간으로 찾은 카카오 가게의 구글 장소 ID. 가게 근처에서 이름으로 찾고, 위치·이름이 맞을 때만 */
async function matchGooglePlace(key: string, name: string, pos: LatLng): Promise<string | null> {
  if (matched.has(key)) return matched.get(key)!;
  const r = await fetch(`${BASE}/places:searchText`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json; charset=utf-8', 'X-Goog-FieldMask': 'places.id,places.displayName,places.location' },
    body: JSON.stringify({ textQuery: name, pageSize: 3, languageCode: 'ko', locationBias: { circle: { center: { latitude: pos.lat, longitude: pos.lng }, radius: 200 } } }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!r.ok) return (console.warn(`[google] search ${r.status}`), null); // 실패는 기억하지 않는다 (다음에 다시)
  const places = ((await r.json()) as { places?: any[] }).places ?? [];
  const hit = places.find((p) => {
    const at = { lat: Number(p.location?.latitude), lng: Number(p.location?.longitude) };
    return Number.isFinite(at.lat) && sameStore(name, String(p.displayName?.text ?? ''), haversineM(pos, at));
  });
  matched.set(key, hit?.id ?? null);
  return hit?.id ?? null;
}

/** 구글 장소의 대표 사진 하나 (구글이 주는 순서의 첫 장). 사진 주소는 잠깐만 유효하다. */
async function photoOf(gid: string): Promise<PlacePhoto | null> {
  const d = await fetch(`${BASE}/places/${gid}`, { headers: { ...headers(), 'X-Goog-FieldMask': 'photos' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!d.ok) return (console.warn(`[google] details ${d.status}`), null);
  const photo = ((await d.json()) as { photos?: any[] }).photos?.[0];
  if (!photo?.name) return null;
  const m = await fetch(`${BASE}/${photo.name}/media?maxWidthPx=800&skipHttpRedirect=true`, { headers: headers(), signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!m.ok) return (console.warn(`[google] media ${m.status}`), null);
  const { photoUri } = (await m.json()) as { photoUri?: string };
  const a = photo.authorAttributions?.[0];
  return photoUri ? { uri: photoUri, author: a?.displayName ?? 'Google 사용자', authorUri: a?.uri ?? null } : null;
}

const safe = async (f: () => Promise<PlacePhoto | null>) => {
  try {
    return await f();
  } catch (e: any) {
    console.warn(`[google] ${e?.name ?? e}`);
    return null;
  }
};

/** 우리 매장(사람이 확인한 장소 ID)의 사진 */
export const placePhoto = (placeId: string) =>
  !config.googlePlacesKey || !GOOGLE_PLACE_IDS[placeId] ? Promise.resolve(null) : safe(() => photoOf(GOOGLE_PLACE_IDS[placeId]));

/** 추천 카드 하나의 사진: 사람이 확인한 ID가 있으면 그걸로, 없으면(실시간 가게·나머지 예시 매장) 위치·이름으로 맞춘 구글 장소로 */
export function photoForItem(c: { id: string; placeId: string; live?: boolean; placeName: string; lat: number; lng: number }) {
  if (!config.googlePlacesKey) return Promise.resolve(null);
  if (!c.live && GOOGLE_PLACE_IDS[c.placeId]) return placePhoto(c.placeId);
  const key = c.live ? `kakao:${c.id.split(':')[2] ?? ''}` : `db:${c.placeId}`;
  return safe(async () => {
    const gid = await matchGooglePlace(key, c.placeName, { lat: c.lat, lng: c.lng });
    return gid ? photoOf(gid) : null;
  });
}

/** onlyPhotos면 사진 있는 곳만 n개 (순서 유지, 하나도 없으면 그대로), 아니면 원래 순서 그대로 n개. 시연 위치 고정(DEMO_PIN)에서 목록마다 실제 사진이 나오게 */
export function photoFirst<T, P>(items: T[], photos: (P | null)[], n: number, onlyPhotos = false): (T & { photo: P | null })[] {
  const all = items.map((c, i) => ({ ...c, photo: photos[i] ?? null }));
  const withPhoto = all.filter((c) => c.photo);
  // onlyPhotos: 사진 있는 곳만. 하나도 없으면(구글에 사진이 없는 동네) 그림으로라도 보여 준다
  if (onlyPhotos && withPhoto.length) return withPhoto.slice(0, n);
  return all.slice(0, n); // 고정이 아니면 원래 순서 그대로
}

/** 사진을 받을 후보 수: 시연 위치 고정이면 넉넉히 받아 사진 있는 곳만 남긴다 */
export const photoPool = (n: number) => (config.demoPin ? Math.max(n + 6, n * 2) : n);
