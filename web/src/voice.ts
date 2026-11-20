import { USER_KEY } from './api';
// 무무와 음성 대화 (무료). 듣기(STT): 브라우저 음성 인식(크롬·엣지·안드로이드·최신 사파리, 없으면 버튼을 숨김).
// 말하기(TTS): 서버의 CLOVA Voice(/api/voice/tts, 키가 있을 때만) → 없으면 기기 안의 한국어 목소리.
const Recognition: any = typeof window !== 'undefined' ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition : undefined;
export const canListen = !!Recognition;

/** 한 번 듣기. 말이 멈추면 끝난다(continuous=false). 듣는 동안 onText로 글자를 계속 주고, 끝나면 최종 글자 (아무 말도 없으면 '') */
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
let utter: SpeechSynthesisUtterance | null = null; // 크롬은 참조가 없으면 끝 알림(onend)을 놓치곤 해서 붙잡아 둔다
let turn = 0; // 새로 말하거나 멈추면 이전 말하기(아직 받는 중인 것 포함)는 버린다
// 무무 목소리는 기기의 구글 목소리로 고정 (2026-11-21). 서버 목소리(CLOVA)는 쓰지 않는다. 다시 쓰려면 true
let serverVoice = false;
/** 휴대폰 브라우저는 사용자가 직접 누른 순간에 한 번 소리를 내 둬야 이후(서버 답장 뒤) 읽기가 된다.
 *  음성 버튼·소리 켜기를 누른 핸들러 안에서 부른다 (소리 없는 짧은 읽기로 잠금 해제) */
let unlocked = false;
export function unlockSpeech() {
  if (unlocked || !('speechSynthesis' in window)) return;
  unlocked = true;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  speechSynthesis.speak(u);
}

export function stopSpeaking() {
  turn++;
  audio?.pause();
  audio = null;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

/** 소리 내어 읽기. 다 읽거나, 멈추거나, 실패하면 끝난다 (음성 대화가 다음 듣기로 넘어가는 신호) */
export async function speak(text: string): Promise<void> {
  stopSpeaking();
  const my = turn;
  const t = text.replace(/\p{Extended_Pictographic}|️|‍/gu, '').trim();
  if (!t) return;
  // 끝 알림이 안 오는 브라우저가 있어 글 길이만큼만 기다린다
  const cap = (done: () => void) => setTimeout(done, 3000 + t.length * 220);
  if (serverVoice) {
    try {
      const r = await fetch('/api/voice/tts', { method: 'POST', headers: { 'content-type': 'application/json', 'x-user-key': USER_KEY }, body: JSON.stringify({ text: t }) });
      if (my !== turn) return;
      if (r.ok) {
        const url = URL.createObjectURL(await r.blob());
        if (my !== turn) return URL.revokeObjectURL(url);
        const a = new Audio(url);
        audio = a;
        await new Promise<void>((done) => {
          a.onended = a.onpause = a.onerror = () => done();
          cap(done);
          a.play().catch(() => done());
        });
        URL.revokeObjectURL(url);
        return;
      }
      if (r.status === 503) serverVoice = false;
    } catch {
      if (my !== turn) return;
    }
  }
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(t.slice(0, 300));
  u.lang = 'ko-KR';
  // 무무는 아기 같은 목소리로: 음높이는 조금만 올리고(1.5는 너무 높아 기계음), 천천히 또박또박
  u.pitch = 1.1; // 0~2, 1이 기본
  u.rate = 0.85; // 0.1~10, 1이 기본
  const v = koVoice ?? (koVoice = pickVoice());
  if (v) u.voice = v;
  utter = u;
  // 안드로이드 크롬: 멈춘(cancel) 바로 뒤에 읽으면 소리 없이 끝나는 버그가 있어 잠깐 쉬고, 멈춰 있는 엔진을 깨운다
  await new Promise((r) => setTimeout(r, 120));
  if (my !== turn) return;
  speechSynthesis.resume();
  await new Promise<void>((done) => {
    u.onend = u.onerror = () => done();
    cap(done);
    speechSynthesis.speak(u);
  });
  if (utter === u) utter = null;
}

// 무료 TTS: 기기 안의 한국어 목소리 중 구글 목소리(크롬 "Google 한국의")를 먼저, 없으면 자연스러운 것 (엣지 SunHi, 애플 유나). 시연은 크롬 기준
const PREFER = [/Google/i, /Natural|Online/i, /Yuna|유나/i];
let koVoice: SpeechSynthesisVoice | null = null;
function pickVoice(): SpeechSynthesisVoice | null {
  const ko = koreanVoices();
  for (const re of PREFER) {
    const hit = ko.find((x) => re.test(x.name));
    if (hit) return hit;
  }
  return ko[0] ?? null;
}
// 목소리 목록은 늦게 채워지는 브라우저가 있어서(크롬), 채워지면 다시 고른다
if (typeof window !== 'undefined' && 'speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', () => { koVoice = pickVoice(); });

const koreanVoices = () =>
  'speechSynthesis' in window ? speechSynthesis.getVoices().filter((x) => x.lang.replace('_', '-').toLowerCase().startsWith('ko')) : [];

const KEY = 'mumu.voice';
export const voicePref = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
export const setVoicePref = (on: boolean) => { try { localStorage.setItem(KEY, on ? '1' : '0'); } catch {} };
