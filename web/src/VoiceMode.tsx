import { useEffect, useRef, useState } from 'react';
import type { Item } from './api';
import type { Msg } from './Chat';
import { canListen, listen, speak, stopSpeaking } from './voice';
import face from './assets/mumu/mood-happy.png';
import talking from './assets/mumu/motion-cheer.gif';
import thinking from './assets/mumu/motion-tea.gif';

// ChatGPT 음성 모드처럼: 듣기 → (말이 멈추면) 보내기 → 무무가 소리 내어 답하기 → 다시 듣기, ✕를 누를 때까지.
// 무무를 누르면: 말하는 중엔 끊고 바로 듣기, 듣는 중엔 지금까지 한 말로 끝내기, 쉬는 중엔 다시 듣기.
type Phase = 'listening' | 'thinking' | 'speaking' | 'paused';
const STATUS: Record<Phase, string> = {
  listening: '듣고 있어… 편하게 말해 줘',
  thinking: '무무가 생각하는 중…',
  speaking: '무무가 말하는 중 · 누르면 끊고 말할 수 있어',
  paused: '무무를 누르면 다시 들을게',
};

export default function VoiceMode(p: { msgs: Msg[]; retry: boolean; onSend: (t: string) => void; onRetry: () => void; onExperiences: (items: Item[]) => void; onClose: () => void }) {
  const [phase, setPhaseState] = useState<Phase>(canListen ? 'listening' : 'paused');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState(canListen ? '' : '이 브라우저는 음성 인식을 지원하지 않아요. 크롬이나 엣지에서 열어 주세요.');
  const phaseRef = useRef(phase);
  const setPhase = (v: Phase) => { phaseRef.current = v; setPhaseState(v); };
  const mic = useRef<{ stop: () => void } | null>(null);
  const alive = useRef(true);
  const seen = useRef(p.msgs.length);
  const quiet = useRef(0); // 연달아 아무 말이 없던 횟수: 두 번이면 쉬기 (마이크를 계속 켜 두지 않게)
  const send = useRef(p.onSend);
  send.current = p.onSend; // App의 send는 렌더마다 바뀌고(대화 세션 id) 듣기는 비동기라 항상 최신 것을 쓴다

  async function hear() {
    if (!alive.current || !canListen) return;
    stopSpeaking();
    setError('');
    setCaption('');
    setPhase('listening');
    const l = listen(setCaption);
    mic.current = l;
    try {
      const t = await l.done;
      mic.current = null;
      if (!alive.current || phaseRef.current !== 'listening') return;
      if (!t) return ++quiet.current >= 2 ? setPhase('paused') : void hear();
      quiet.current = 0;
      setPhase('thinking');
      send.current(t);
    } catch (e) {
      mic.current = null;
      if (alive.current) { setError((e as Error).message); setPhase('paused'); }
    }
  }

  // 무무 답장이 오면 읽어 주고, 다 읽으면 다시 듣는다
  useEffect(() => {
    const last = p.msgs[p.msgs.length - 1];
    const fresh = p.msgs.length > seen.current && last?.who === 'bunny';
    seen.current = p.msgs.length;
    if (!fresh) return;
    setCaption(last.text);
    setPhase('speaking');
    void speak(last.text).then(() => { if (alive.current && phaseRef.current === 'speaking') void hear(); });
  }, [p.msgs.length]);

  useEffect(() => {
    void hear();
    return () => { alive.current = false; mic.current?.stop(); stopSpeaking(); };
  }, []);

  const tap = () => {
    if (phase === 'speaking' || phase === 'paused') { quiet.current = 0; void hear(); }
    else if (phase === 'listening') mic.current?.stop();
  };
  const last = p.msgs[p.msgs.length - 1];
  const reply = last?.who === 'bunny' && phase !== 'listening' ? last : null;
  return <div className={`voice-mode ${phase}`} role="dialog" aria-label="무무와 음성 대화">
    <button type="button" className="voice-end" aria-label="음성 대화 끝내기" onClick={p.onClose}>✕</button>
    <p className="voice-status" aria-live="polite">{p.retry ? '답장을 받지 못했어' : STATUS[phase]}</p>
    <button type="button" className="voice-mumu" aria-label={phase === 'speaking' ? '무무 말 끊고 말하기' : phase === 'listening' ? '다 말했어' : '다시 듣기'} onClick={tap} disabled={phase === 'thinking'}>
      <img src={phase === 'speaking' ? talking : phase === 'thinking' ? thinking : face} alt="" draggable={false} />
    </button>
    <p className="voice-caption">{caption || (phase === 'paused' && reply ? reply.text : '')}</p>
    {reply?.support && <aside className="voice-support"><p>{reply.support.text}</p>{reply.support.lines.map((line) => <a key={line.tel} href={`tel:${line.tel.replace(/[^+0-9]/g, '')}`}>{line.name} {line.tel}</a>)}</aside>}
    {!!reply?.offer?.items.length && <button type="button" className="new-primary" onClick={() => p.onExperiences(reply.offer!.items)}>무무가 찾은 곳 {reply.offer.items.length}개 보기 →</button>}
    {p.retry && <button type="button" className="voice-retry" onClick={() => { setPhase('thinking'); p.onRetry(); }}>다시 보내기</button>}
    {error && <p className="voice-error" role="alert">{error}</p>}
  </div>;
}
