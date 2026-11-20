import { USER_KEY } from './api';
// 무무와 음성 대화. 듣기: 브라우저 음성 인식(크롬·안드로이드·최신 사파리, 없으면 버튼을 숨김).
// 말하기: 서버의 CLOVA Voice(/api/voice/tts). 서버에 키가 없으면 브라우저 내장 목소리로.
const Recognition: any = typeof window !== 'undefined' ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition : undefined;
export const canListen = !!Recognition;

/** 한 번 듣기. 듣는 동안 onText로 글자를 계속 주고, 끝나면 최종 글자 (아무 말도 없으면 '') */
export function listen(onText: (t: string) => void) {
  const r = new Recognition();
  r.lang = 'ko-KR';
  r.interimResults = true;
  r.continuous = false;
  let text = '';
  const done = new Promise<string>((resolve, reject) => {
    r.onresult = (e: any) => { text = Array.from(e.results as ArrayLike<any>).map((x) => x[0].transcript).join(''); onText(text); };
    r.onerror = (e: any) => (e.error === 'no-speech' || e.error === 'aborted' ? resolve('') : reject(new Error(e.error === 'not-allowed' ? '마이크 권한을 허용해 줘.' : '잘 못 들었어. 다시 말해 줄래?')));
    r.onend = () => resolve(text.trim());
  });
  r.start();
  return { done, stop: () => r.stop() };
}

let audio: HTMLAudioElement | null = null;
let turn = 0; // 새로 말하거나 멈추면 이전 말하기(아직 받는 중인 것 포함)는 버린다
let serverVoice = true; // 서버에 목소리 키가 없으면(503) 이번 접속 동안은 바로 브라우저 목소리로
export function stopSpeaking() {
  turn++;
  audio?.pause();
  audio = null;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
export async function speak(text: string) {
  stopSpeaking();
  const my = turn;
  const t = text.replace(/\p{Extended_Pictographic}|️|‍/gu, '').trim();
  if (!t) return;
  if (serverVoice) {
    try {
      const r = await fetch('/api/voice/tts', { method: 'POST', headers: { 'content-type': 'application/json', 'x-user-key': USER_KEY }, body: JSON.stringify({ text: t }) });
      if (my !== turn) return;
      if (r.ok) {
        const url = URL.createObjectURL(await r.blob());
        if (my !== turn) return URL.revokeObjectURL(url);
        audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play();
        return;
      }
      if (r.status === 503) serverVoice = false;
    } catch {
      if (my !== turn) return;
    }
  }
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(t.slice(0, 300));
    u.lang = 'ko-KR';
    u.pitch = 1.3;
    speechSynthesis.speak(u);
  }
}

const KEY = 'mumu.voice';
export const voicePref = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
export const setVoicePref = (on: boolean) => { try { localStorage.setItem(KEY, on ? '1' : '0'); } catch {} };
