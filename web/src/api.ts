export type LatLng = { lat: number; lng: number };
export type PlacePhoto = { uri: string; author: string; authorUri: string | null };
export type Item = {
  id: string;
  title: string;
  category: string;
  minutes: number;
  price: number;
  moods: string[];
  description: string;
  placeId?: string; // 실제 사진(구글)을 받을 때 쓴다
  hasPhoto?: boolean; // 사진 있는 매장: 그림 대신 사진 자리를 비워 두고 기다림
  photo?: PlacePhoto | null; // 추천과 함께 온 실제 사진(구글). null이면 사진 없음 → 그림
  live?: boolean; // 실시간 검색(카카오)으로 찾은 가게: 시간대 없음, 기록할 때 가게 이름·좌표를 같이 보낸다
  lat?: number;
  lng?: number;
  placeName: string;
  mapUrl: string; // 예약하기 → 네이버 지도(네이버 예약)
  walkMinutes: number;
  distanceM: number;
  availableSlots: string[];
  slots: string[];
  reason?: string;
  surprise?: boolean; // "평소와 다른 하나": 맞춤 추천 끝에 일부러 섞은 다른 종류 (많아도 1개)
};
export type Booking = {
  id: number;
  status: 'REQUESTED' | 'DONE' | 'CANCELED';
  slotTime: string | null; // 실시간 가게는 없음
  price: number;
  moodBefore: number | null;
  moodAfter: number | null;
  completedAt?: string;
  arrivedAt?: string | null; // "도착했어" GPS 확인 시각 (없으면 아직 확인 안 함)
  experienceId: string;
  title: string;
  category: string;
  minutes: number;
  placeName: string;
  mapUrl?: string; // 네이버 지도에서 다시 열기
};
/** 무료 장소 (카카오 로컬로 찾음). 예약 없음, url은 네이버 지도 검색 페이지. */
export type FreePlace = {
  id: string;
  name: string;
  kind: '카페' | '도서관' | '공원';
  distanceM: number;
  walkMinutes: number;
  lat: number;
  lng: number;
  address: string;
  url: string;
};
export type FreeRec = FreePlace & { reason: string };
export type Memory = { id: number; kind: '취향' | '상황' | '사건'; text: string; updatedAt: string };
export type Character = {
  level: number;
  exp: number;
  stage: number;
  items: string[];
  equipped: string | null;
  safeMode: boolean;
  stageMinExp: number;
  nextStageExp: number | null;
  allItems: { id: string; name: string; stage: number; unlocked: boolean }[];
  demoMode: boolean;
};
export type Growth = { expGained: number; levelUp: boolean; stageUp: boolean; stage: number; newItems: { id: string; name: string }[] };
export type Checkin = { checkinId: number | null; reply: string; state: string; risk: string; suggestPostpone?: boolean };
export type Records = {
  done: Booking[];
  week: { date: string; dow: number; mood: number | null }[];
  postpones: { id: number; task: string; createdAt: string }[];
};

type Res<T> = T & { error?: string; code: number; blocked?: boolean }; // code = HTTP 상태 (예약의 status와 구분)

// 로그인 없이 브라우저마다 따로 쓰도록, 처음 열 때 만든 무작위 키를 모든 요청에 실어 보낸다.
// 저장이 막힌 환경(시크릿 일부 등)에서는 이번 방문 동안만 쓰는 키가 된다.
const USER_KEY = (() => {
  // randomUUID는 HTTPS·localhost에서만 있어서 http://IP로 열 때를 위한 대체 키
  const make = () => crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  try {
    // 시연: 주소 끝에 ?demo를 붙여 열면 기록·기억이 미리 들어 있는 시연용 사용자가 된다 (서버 seed의 DEMO_USER_KEY)
    if (new URLSearchParams(location.search).has('demo')) localStorage.setItem('moodpass-user', 'demo-moodpass');
    let k = localStorage.getItem('moodpass-user');
    if (!k) localStorage.setItem('moodpass-user', (k = make()));
    return k;
  } catch {
    return make();
  }
})();

// 네트워크·서버 오류가 나도 던지지 않는다. 화면은 { error }를 보고 부드럽게 안내한다.
async function call<T>(method: string, path: string, body?: unknown): Promise<Res<T>> {
  try {
    const res = await fetch(`/api${path}`, {
      method,
      headers: { 'x-user-key': USER_KEY, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { ...(await res.json().catch(() => ({}))), code: res.status };
  } catch {
    return { error: '연결이 잠깐 끊겼어. 조금 있다가 다시 해 줘.', code: 0 } as Res<T>;
  }
}

export const api = {
  checkin: (b: { text: string; emotion: string | null; energy: number; mood: number }) => call<Checkin>('POST', '/checkin', b),
  recommend: (b: { checkinId: number; minutes: number; walk: number; budget: number; exclude: string[] } & Partial<LatLng>) =>
    // items: 제휴 매장 체험 (내 위치 주변에 없으면 빈 배열), free: 같은 위치 기준 무료 장소
    call<{ items?: Item[]; free?: FreeRec[]; widened?: boolean; locationSource?: string }>('POST', '/recommend', b),
  browse: (pos: LatLng | null, need: string | null) =>
    call<{ items?: Item[] }>('GET', `/browse?${new URLSearchParams({ ...(pos ? { lat: String(pos.lat), lng: String(pos.lng) } : {}), ...(need ? { need } : {}) })}`),
  experiences: (pos: LatLng | null) => call<{ items?: Item[] }>('GET', `/experiences${pos ? `?lat=${pos.lat}&lng=${pos.lng}` : ''}`),
  book: (b: { checkinId: number | null; experienceId: string; slotTime?: string; moodBefore?: number; placeName?: string; lat?: number; lng?: number }) =>
    call<Booking>('POST', '/bookings', b),
  active: () => call<{ booking: Booking | null }>('GET', '/bookings/active'),
  // "도착했어": 지금 위치(getPos)를 보내면 매장 150m 안인지 확인. arrived:false여도 다녀왔어·기록은 그대로 가능
  arrive: (id: number, pos: LatLng | null) =>
    call<{ arrived: boolean; distanceM?: number | null; already?: boolean; demo?: boolean }>('POST', `/bookings/${id}/arrive`, pos ?? {}),
  // 무료 장소. disabled면 서버에 네이버 키가 없는 것 (목록을 숨기면 됨)
  freePlaces: (pos: LatLng | null) => call<{ items?: FreePlace[]; disabled?: boolean }>('GET', `/places/free${pos ? `?lat=${pos.lat}&lng=${pos.lng}` : ''}`),
  // 주소·장소 이름 → 좌표. 받은 좌표를 브라우저에 저장해 두고 getPos 대신 recommend·experiences·freePlaces에 넘기면 됨
  geocode: (query: string) => call<LatLng & { label: string }>('GET', `/geocode?query=${encodeURIComponent(query)}`),
  complete: (id: number, moodAfter: number) =>
    call<Growth & { done: boolean; moodBefore: number | null; moodAfter: number; already?: boolean }>('POST', `/bookings/${id}/complete`, { moodAfter }),
  cancel: (id: number) => call<{ canceled: boolean }>('POST', `/bookings/${id}/cancel`),
  postpone: (task: string) => call<Growth & { reply: string }>('POST', '/postpone', { task }),
  records: () => call<Records>('GET', '/records'),
  deleteRecords: () => call<{ deleted: boolean }>('DELETE', '/records'),
  // 토끼가 기억하는 것 (AI가 대화·마음 확인에서 뽑아 둔 사실). 하나씩 지울 수 있다
  memories: () => call<{ items?: Memory[] }>('GET', '/memories'),
  deleteMemory: (id: number) => call<{ deleted: boolean }>('DELETE', `/memories/${id}`),
  character: () => call<Character>('GET', '/character'),
  equip: (item: string | null) => call<{ equipped: string | null }>('POST', '/character/equip', { item }),
  chat: (sessionId: number | null, message: string) => call<{ sessionId: number | null; reply: string; state: string }>('POST', '/chat', { sessionId, message }),
  resumeSafety: () => call<{ state: string }>('POST', '/safety/resume'),
};

/** 현재 위치. 권한 거부·실패면 null. */
export const getPos = () =>
  new Promise<LatLng | null>((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60_000 },
    );
  });

export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
