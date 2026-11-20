// 날씨 반영(스킬): 비·눈·뇌우·한파·폭염이면 바깥 활동(공원·산책)을 빼고 실내 위주로 찾는다.
// OpenWeatherMap 현재 날씨(무료 플랜). 키가 없거나 실패하면 null → 날씨 없이 그대로 추천.
// 위치는 소수 둘째 자리(약 1km)로 뭉개서 보내고, 같은 칸은 10분 동안 다시 묻지 않는다.
import { config } from '../config.js';
import type { LatLng } from '../geo.js';

export type Weather = { id: number; desc: string; temp: number };
const cache = new Map<string, { at: number; w: Weather | null }>();
const TTL = 10 * 60_000;

export async function currentWeather(pos: LatLng | null): Promise<Weather | null> {
  if (!config.openWeatherKey) return null;
  const p = pos ?? config.demoCenter;
  const lat = Math.round(p.lat * 100) / 100;
  const lng = Math.round(p.lng * 100) / 100;
  const key = `${lat},${lng}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.w;
  let w: Weather | null = null;
  try {
    const q = new URLSearchParams({ lat: String(lat), lon: String(lng), appid: config.openWeatherKey, units: 'metric', lang: 'kr' });
    const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?${q}`, { signal: AbortSignal.timeout(3000) });
    const j: any = r.ok ? await r.json() : null;
    if (j?.weather?.[0] && typeof j.main?.temp === 'number') w = { id: j.weather[0].id, desc: j.weather[0].description ?? '', temp: Math.round(j.main.temp) };
    else console.warn('[weather] 날씨를 받지 못함:', r.status);
  } catch (e) {
    console.warn('[weather] 날씨 요청 실패:', (e as Error).message);
  }
  cache.set(key, { at: Date.now(), w });
  return w;
}

/** 바깥 활동을 피할 날씨면 그 이유(화면 안내용), 아니면 null. 날씨 코드: 2xx 뇌우, 3xx 이슬비, 5xx 비, 6xx 눈 */
export function weatherAdvice(w: Weather | null): string | null {
  if (!w) return null;
  const g = Math.floor(w.id / 100);
  if (g === 2) return '천둥·번개가 쳐서 실내 위주로';
  if (g === 3 || g === 5) return '비가 와서 실내 위주로';
  if (g === 6) return '눈이 와서 실내 위주로';
  if (w.temp <= -5) return `${w.temp}도로 많이 추워서 실내 위주로`;
  if (w.temp >= 33) return `${w.temp}도로 많이 더워서 실내 위주로`;
  return null;
}

/** AI에게 주는 한 줄 (답장에서 자연스럽게 날씨를 짚게) */
export const weatherLine = (w: Weather | null) => (w ? `지금 날씨: ${w.desc}, ${w.temp}도\n` : '');
