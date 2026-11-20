import type { Item, LatLng } from './api';
export type Science = { text: string; source: string; url: string }; // 왜 기분 전환이 되나: 확인한 연구 한 줄
export type TalkOffer = { items: Item[]; prefs?: { need: string | null; energy: string | null; want: string[]; avoid: string[] }; assumptions?: string; quickReplies?: string[]; support?: { text: string; lines: { name: string; tel: string }[] } };
export type TalkReply = Partial<TalkOffer> & { code: number; sessionId?: number | null; science?: Science | null; action?: 'ask' | 'recommend' | 'none' | 'safety' | 'play'; game?: 'tarot' | 'words' | 'balance' | 'fortune'; state?: string; reply?: string; error?: string };
/** Existing POST /api/talk contract. No intent inference or payment decisions on the client. */
export async function sendTalk(sessionId: number | null, message: string, position: LatLng | null): Promise<TalkReply> {
  try {
    const userKey = localStorage.getItem('moodpass-user');
    if (!userKey) return { code: 0, error: '브라우저 저장 설정을 확인한 뒤 다시 열어 주세요.' };
    const response = await fetch('/api/talk', { method: 'POST', headers: { 'content-type': 'application/json', 'x-user-key': userKey }, body: JSON.stringify({ sessionId, message, ...(position ?? {}) }) });
    const data = await response.json().catch(() => ({}));
    return { ...data, code: response.status };
  } catch { return { code: 0, error: '대화 연결이 잠깐 끊겼어. 다시 보내 줄래?' }; }
}
