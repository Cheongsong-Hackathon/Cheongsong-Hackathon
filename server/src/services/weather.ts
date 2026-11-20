// 날씨 반영(스킬): 비·눈·뇌우·한파·폭염이면 바깥 활동(공원·산책)을 빼고 실내 위주로 찾는다.
// 기상청 초단기실황(공공데이터포털)이 먼저, 안 되면 OpenWeatherMap 현재 날씨. 키가 없거나 실패하면 null → 날씨 없이 그대로 추천.
// 위치는 소수 둘째 자리(약 1km)로 뭉개서 보내고, 같은 칸은 10분 동안 다시 묻지 않는다.
import { config } from '../config.js';
import type { LatLng } from '../geo.js';

export type Weather = { id: number; desc: string; temp: number };
const cache = new Map<string, { at: number; w: Weather | null }>();
const TTL = 10 * 60_000;

/** 위경도 → 기상청 동네예보 격자(nx, ny). 기상청이 공개한 람베르트 정각원추 변환 (격자 5km) */
export function toKmaGrid(lat: number, lng: number) {
  const RE = 6371.00877 / 5.0, DEG = Math.PI / 180;
  const slat1 = 30 * DEG, slat2 = 60 * DEG, olon = 126 * DEG, olat = 38 * DEG;
  const sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5));
  const sf = (Math.pow(Math.tan(Math.PI * 0.25 + slat1 * 0.5), sn) * Math.cos(slat1)) / sn;
  const ro = (RE * sf) / Math.pow(Math.tan(Math.PI * 0.25 + olat * 0.5), sn);
  const ra = (RE * sf) / Math.pow(Math.tan(Math.PI * 0.25 + lat * DEG * 0.5), sn);
  let theta = lng * DEG - olon;
  if (theta > Math.PI) theta -= 2 * Math.PI;
  if (theta < -Math.PI) theta += 2 * Math.PI;
  theta *= sn;
  return { nx: Math.floor(ra * Math.sin(theta) + 43 + 0.5), ny: Math.floor(ro - ra * Math.cos(theta) + 136 + 0.5) };
}

/** 초단기실황 발표 시각: 매 정시 자료가 40분쯤 올라오므로, 45분 전이면 한 시간 전 것 (한국 시각) */
export function kmaBaseTime(now = new Date()) {
  const k = new Date(now.getTime() + 9 * 3_600_000 - (now.getUTCMinutes() < 45 ? 3_600_000 : 0));
  const p = (n: number) => String(n).padStart(2, '0');
  return { base_date: `${k.getUTCFullYear()}${p(k.getUTCMonth() + 1)}${p(k.getUTCDate())}`, base_time: `${p(k.getUTCHours())}00` };
}

// 기상청 강수형태(PTY) → 날씨 코드(위 weatherAdvice가 읽는 OpenWeather 코드 체계로): 1 비·2 비/눈·5 빗방울 → 비, 3 눈·6 빗방울눈날림·7 눈날림 → 눈
const PTY: Record<string, [number, string]> = { '1': [500, '비'], '2': [611, '비 또는 눈'], '3': [600, '눈'], '5': [300, '빗방울'], '6': [611, '빗방울·눈날림'], '7': [600, '눈날림'] };
async function kmaWeather(lat: number, lng: number): Promise<Weather | null> {
  const q = new URLSearchParams({ serviceKey: config.kmaServiceKey, pageNo: '1', numOfRows: '20', dataType: 'JSON', ...kmaBaseTime(), ...Object.fromEntries(Object.entries(toKmaGrid(lat, lng)).map(([k, v]) => [k, String(v)])) });
  const r = await fetch(`https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?${q}`, { signal: AbortSignal.timeout(3000) });
  const j: any = await r.json().catch(() => null);
  const items: { category: string; obsrValue: string }[] = j?.response?.body?.items?.item ?? [];
  const v = (c: string) => items.find((i) => i.category === c)?.obsrValue;
  const temp = Number(v('T1H'));
  if (!items.length || !Number.isFinite(temp)) {
    console.warn('[weather] 기상청 응답 없음:', r.status, j?.response?.header?.resultMsg ?? '');
    return null;
  }
  const [id, desc] = PTY[v('PTY') ?? '0'] ?? [800, '비·눈 없음'];
  return { id, desc, temp: Math.round(temp) };
}

export async function currentWeather(pos: LatLng | null): Promise<Weather | null> {
  if (!config.kmaServiceKey && !config.openWeatherKey) return null;
  const p = pos ?? config.demoCenter;
  const lat = Math.round(p.lat * 100) / 100;
  const lng = Math.round(p.lng * 100) / 100;
  const key = `${lat},${lng}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.w;
  let w: Weather | null = null;
  try {
    if (config.kmaServiceKey) w = await kmaWeather(lat, lng);
  } catch (e) {
    console.warn('[weather] 기상청 요청 실패:', (e as Error).message);
  }
  if (!w && config.openWeatherKey) try {
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
