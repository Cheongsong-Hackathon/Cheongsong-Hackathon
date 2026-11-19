// 제휴 매장의 실제 사진 (Google Places API New).
// 약관상 저장해도 되는 건 장소 ID뿐이라 사진 이름·주소는 저장하지 않고 볼 때마다 받는다.
// 키(GOOGLE_PLACES_KEY)가 없거나 실패하면 null → 화면은 지금 그림을 그대로 보여 준다.
import { config } from '../config.js';

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

export type PlacePhoto = { uri: string; author: string; authorUri: string | null };

/** 매장의 대표 사진 하나 (구글이 주는 순서의 첫 장). 사진 주소는 잠깐만 유효하다. */
export async function placePhoto(placeId: string): Promise<PlacePhoto | null> {
  const gid = GOOGLE_PLACE_IDS[placeId];
  if (!config.googlePlacesKey || !gid) return null;
  const headers = { 'X-Goog-Api-Key': config.googlePlacesKey };
  try {
    const d = await fetch(`${BASE}/places/${gid}`, { headers: { ...headers, 'X-Goog-FieldMask': 'photos' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!d.ok) return (console.warn(`[google] details ${d.status}`), null);
    const photo = ((await d.json()) as { photos?: any[] }).photos?.[0];
    if (!photo?.name) return null;
    const m = await fetch(`${BASE}/${photo.name}/media?maxWidthPx=800&skipHttpRedirect=true`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!m.ok) return (console.warn(`[google] media ${m.status}`), null);
    const { photoUri } = (await m.json()) as { photoUri?: string };
    const a = photo.authorAttributions?.[0];
    return photoUri ? { uri: photoUri, author: a?.displayName ?? 'Google 사용자', authorUri: a?.uri ?? null } : null;
  } catch (e: any) {
    console.warn(`[google] ${e?.name ?? e}`);
    return null;
  }
}
