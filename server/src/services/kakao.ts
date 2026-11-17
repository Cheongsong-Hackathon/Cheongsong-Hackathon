// 카카오 로컬 API: 무료 장소(카페·도서관·공원) 검색, 주소·장소 이름 → 좌표.
// 키(KAKAO_REST_API_KEY)가 없거나 실패하면 null을 돌려주고, 화면은 지금처럼 동작한다.
import { config } from '../config.js';
import type { LatLng } from '../geo.js';
import { walkMinutes } from './recommend.js';

const BASE = 'https://dapi.kakao.com/v2/local/search';
const TIMEOUT_MS = 3000;

async function search(path: string, params: Record<string, string | number>): Promise<any[] | null> {
  if (!config.kakaoKey) return null;
  try {
    const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
    const res = await fetch(`${BASE}/${path}.json?${qs}`, {
      headers: { Authorization: `KakaoAK ${config.kakaoKey}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[kakao] ${path} ${res.status}`);
      return null;
    }
    return ((await res.json()) as { documents?: any[] }).documents ?? [];
  } catch (e: any) {
    console.warn(`[kakao] ${path} ${e?.name ?? e}`);
    return null;
  }
}

export type FreePlace = {
  id: string;
  name: string;
  kind: string; // 카페 | 도서관 | 공원
  distanceM: number;
  walkMinutes: number;
  lat: number;
  lng: number;
  address: string;
  url: string;
};

// [종류, 검색 방법]. 도서관·공원은 카테고리 코드가 없어서 키워드로 찾는다.
const KINDS: [string, Record<string, string>][] = [
  ['카페', { path: 'category', category_group_code: 'CE7' }],
  ['도서관', { path: 'keyword', query: '도서관' }],
  ['공원', { path: 'keyword', query: '공원' }],
];

/** 카카오 검색 결과 하나 → FreePlace. 키워드 검색은 주차장 등이 섞여서 카테고리 이름으로 한 번 더 거른다. */
export function toFreePlace(kind: string, d: any): FreePlace | null {
  if (kind !== '카페' && !String(d?.category_name ?? '').includes(kind)) return null;
  const lat = Number(d?.y);
  const lng = Number(d?.x);
  const distanceM = d?.distance ? Number(d.distance) : NaN; // Number('')은 0이라 따로 막는다
  if (!d?.id || !d?.place_name || !Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(distanceM)) return null;
  return {
    id: `kakao:${d.id}`,
    name: d.place_name,
    kind,
    distanceM,
    walkMinutes: walkMinutes(distanceM),
    lat,
    lng,
    address: d.road_address_name || d.address_name || '',
    url: d.place_url ?? '',
  };
}

/** 내 주변 무료 장소. 종류마다 가까운 순으로 몇 곳씩. null이면 키가 없거나 카카오 실패. */
export async function freePlaces(pos: LatLng, perKind = 5): Promise<FreePlace[] | null> {
  const results = await Promise.all(
    KINDS.map(([kind, { path, ...p }]) =>
      search(path, { ...p, x: pos.lng, y: pos.lat, radius: config.SEARCH_RADIUS_M, sort: 'distance', size: 15 }).then((docs) =>
        docs === null ? null : docs.map((d) => toFreePlace(kind, d)).filter((x): x is FreePlace => !!x).slice(0, perKind),
      ),
    ),
  );
  if (results.every((r) => r === null)) return null;
  return results.flatMap((r) => r ?? []).sort((a, b) => a.distanceM - b.distanceM);
}

/** 주소("경산시 대학로 280")나 장소 이름("영남대학교") → 좌표. 주소로 먼저 찾고, 없으면 장소 이름으로. */
export async function geocode(q: string): Promise<{ lat: number; lng: number; label: string } | null> {
  const addr = await search('address', { query: q, size: 1 });
  const d = addr?.[0] ?? (await search('keyword', { query: q, size: 1 }))?.[0];
  if (!d) return null;
  const lat = Number(d.y);
  const lng = Number(d.x);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng, label: d.place_name || d.address_name || q } : null;
}
