import { config } from './config.js';

export type LatLng = { lat: number; lng: number };

/** 도보 분 = 직선거리 ÷ 분당 67m (올림, 최소 1분) */
export const walkMinutes = (m: number) => Math.max(1, Math.ceil(m / config.WALK_M_PER_MIN));

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** center에서 북쪽 northM, 동쪽 eastM 미터 떨어진 좌표 (seed용) */
export function offsetM(c: LatLng, northM: number, eastM: number): LatLng {
  return {
    lat: c.lat + (northM / R) * (180 / Math.PI),
    lng: c.lng + (eastM / (R * Math.cos(rad(c.lat)))) * (180 / Math.PI),
  };
}

export const validLatLng = (lat: unknown, lng: unknown): LatLng | null =>
  typeof lat === 'number' && typeof lng === 'number' && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? { lat, lng }
    : null;
