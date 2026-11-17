export type Tier = 'HOME' | 'NEAR' | 'TOWN';
export type LatLng = { lat: number; lng: number };
export type Item = {
  templateId: string;
  placeId?: string;
  title: string;
  tier: Tier;
  minutes: number;
  exp: number;
  distanceM?: number;
  isPartner: boolean;
  benefit?: string;
  place?: LatLng & { name: string };
  reason: string;
};
export type Character = {
  nickname: string;
  level: number;
  exp: number;
  stage: number;
  patterns: { tier: Tier; title: string }[];
  stageMinExp: number;
  nextStageExp: number | null;
  todayExp: number;
  dailyCap: number;
  demoMode: boolean;
};
export type Run = {
  runId: number;
  title: string;
  tier: Tier;
  minutes: number;
  exp: number;
  expGained?: number;
  placeName?: string | null;
  isPartner?: boolean;
  completedAt?: string;
};
export type Reward = { id: number; code: string; used: boolean; placeName: string; benefit: string };
export type Partner = { id: string; name: string; category: string; couponPolicy: string };
export type VerifyResult = {
  verified: boolean;
  expGained: number;
  levelUp: boolean;
  stageUp?: boolean;
  newRewards: Reward[];
  reason?: string;
  note?: string;
  expired?: boolean;
  blocked?: boolean;
  error?: string;
};

// 네트워크·서버 오류가 나도 던지지 않는다. 화면은 { error }를 보고 부드럽게 안내한다.
async function call<T>(method: string, path: string, body?: unknown): Promise<T & { error?: string; status: number }> {
  try {
    const res = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { ...(await res.json().catch(() => ({}))), status: res.status };
  } catch {
    return { error: '연결이 잠깐 끊겼어. 조금 있다가 다시 해 줘.', status: 0 } as any;
  }
}

export const api = {
  chat: (sessionId: number | null, message: string) =>
    call<{ sessionId: number | null; reply: string; state: string; energy?: string; risk: string; quickReplies?: string[]; readyToRecommend?: boolean }>(
      'POST', '/chat', { sessionId, message }),
  session: (sessionId: number) => call<{ state?: string }>('GET', `/sessions/${sessionId}`),
  resume: (sessionId: number) => call<{ state: string }>('POST', `/sessions/${sessionId}/resume`),
  recommend: (sessionId: number, pos: LatLng | null, exclude: string[]) =>
    call<{ items?: Item[]; center?: LatLng | null; blocked?: boolean }>('POST', '/recommend', { sessionId, ...pos, exclude }),
  startRun: (sessionId: number, templateId: string, pos: LatLng | null) =>
    call<{ runId?: number; expiresAt?: string; blocked?: boolean }>('POST', '/runs', { sessionId, templateId, ...pos }),
  verify: (runId: number, body: Partial<LatLng> & { photo?: string }) => call<VerifyResult>('POST', `/runs/${runId}/verify`, body),
  runs: () => call<{ active: Run | null; done: Run[] }>('GET', '/runs'),
  character: () => call<Character>('GET', '/character'),
  rewards: () => call<{ items: Reward[] }>('GET', '/rewards'),
  redeem: (id: number) => call<{ used: boolean }>('POST', `/rewards/${id}/redeem`),
  partners: () => call<{ items: Partner[] }>('GET', '/partners'),
};

/** 현재 위치. 권한 거부·실패면 null. 인증할 때만 부른다. */
export const getPos = () =>
  new Promise<LatLng | null>((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  });

/** 사진을 작게 줄여 dataURL로. 서버는 사진인지만 확인하고 저장하지 않는다. */
export async function shrinkPhoto(file: File): Promise<string> {
  const raw = () =>
    new Promise<string>((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 640 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.6);
  } catch {
    return raw();
  }
}
