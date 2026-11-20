import MumuArtwork, {MumuLoading} from './MumuArtwork';
import {PhoneStatus} from './MumuWelcome';
// Existing conversation API supplies replies and optional experience recommendations.
import { useEffect, useRef, useState } from 'react';
import type { Item } from './api';
import type { TalkOffer } from './talkClient';
import portrait from './assets/mumu/mood-happy.png';
import { canListen, listen, setVoicePref, speak, stopSpeaking, voicePref } from './voice';

export type Msg = { who: 'bunny' | 'me'; text: string; offer?: Pick<TalkOffer, 'items' | 'assumptions'>; quickReplies?: string[]; support?: TalkOffer['support'] };

const solutions = [
  { icon: '☕', title: '잠깐 쉬어가기', detail: '10분 호흡 명상으로 머리 비우기' },
  { icon: '☑', title: '할 일 정리하기', detail: '지금 해야 할 일, 우선순위로 나눠보기' },
  { icon: '📍', title: '가벼운 기분 전환', detail: '집 근처 산책 코스나 조용한 카페 추천' },
];

export default function Chat(p: { onExperiences: (items: Item[]) => void; onBack?: () => void; onPlay: () => void; msgs: Msg[]; busy: boolean; onSend: (t: string) => void; retry: boolean; onRetry: () => void }) {
  const [text, setText] = useState('');
  const [solutionsOverride, setSolutionsOverride] = useState<boolean | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const showSolutions = solutionsOverride ?? (p.msgs.length > 2 && !p.busy && !p.retry);
  const toggleSolutions = () => setSolutionsOverride(!showSolutions);
  const log = useRef<HTMLDivElement>(null);
  // 음성 대화: 🎤로 말하면 바로 보내고, 🔊가 켜져 있으면 무무 답장을 소리로 읽는다 (말로 걸면 말로 답하도록 자동으로 켬)
  const [voiceOn, setVoiceOn] = useState(voicePref);
  const [mic, setMic] = useState<{ stop: () => void } | null>(null);
  const [micError, setMicError] = useState('');
  const spoken = useRef(p.msgs.length);
  useEffect(() => {
    const last = p.msgs[p.msgs.length - 1];
    if (p.msgs.length > spoken.current && last?.who === 'bunny' && voiceOn) void speak(last.text);
    spoken.current = p.msgs.length;
  }, [p.msgs.length, voiceOn]);
  useEffect(() => () => { stopSpeaking(); }, []);
  const toggleVoice = () => { const on = !voiceOn; setVoiceOn(on); setVoicePref(on); if (!on) stopSpeaking(); };
  async function talk() {
    if (mic) return mic.stop();
    stopSpeaking(); setMicError('');
    const l = listen(setText);
    setMic(l);
    try {
      const heard = await l.done;
      if (heard && !p.busy && !p.retry) { setVoiceOn(true); setVoicePref(true); p.onSend(heard); setText(''); }
    } catch (e) { setMicError((e as Error).message); } finally { setMic(null); }
  }
  useEffect(() => {
    if (log.current && (p.msgs.length > 1 || p.busy || p.retry)) {
      log.current.scrollTop = log.current.scrollHeight;
    }
  }, [p.msgs.length, p.busy, p.retry]);

  return (
    <div className="chat mumu-chat">
      <PhoneStatus />
      <header className="mumu-chat-header">
        <button type="button" aria-label="뒤로 가기" onClick={p.onBack}>‹</button>
        <div><img src={portrait} alt="" /><strong>무무와 함께</strong></div>
        <button type="button" className="voice-toggle" aria-label={voiceOn ? '무무 목소리 끄기' : '무무 목소리 켜기'} aria-pressed={voiceOn} onClick={toggleVoice}>{voiceOn ? '🔊' : '🔇'}</button>
        <button type="button" aria-label="채팅방 안내" aria-expanded={showInfo} onClick={() => setShowInfo(value => !value)}>•••</button>
      </header>
      {showInfo && <p className="notice">무무는 AI 캐릭터예요. 전문 상담을 대신하지 않아요.</p>}
      <div className="room-switch" aria-label="무무 화면">
        <span aria-current="page">💬 무무랑 채팅하기</span>
        <button type="button" onClick={p.onPlay}>🎮 무무랑 놀기</button>
      </div>
      <div className="mumu-chat-hero"><img src={portrait} alt="" /><p>오늘은 어떤 기분이야?<br />무무한테 편하게 말해줘! 💜</p></div>
      <div className="mumu-chat-modes">
        <button type="button" disabled={p.busy || p.retry} onClick={() => p.onSend('고민 털어놓기')}>💬 고민 털어놓기</button>
        <button type="button" disabled={p.busy || p.retry} onClick={() => p.onSend('기분 점검하기')}>🌱 기분 점검하기</button>
        <button type="button" aria-expanded={showSolutions} onClick={toggleSolutions}>✨ 해결책 받기</button>
      </div>
      <div className="log" ref={log} aria-live="polite">
        {p.msgs.map((m, i) =>
          m.who === 'bunny' ? (
            <div key={i} className="mumu-chat-turn"><div className="say">
              <img src={portrait} className="chat-avatar" alt="" />
              <div className="bubble bunny">{m.text}</div>
            </div>
            {!!m.offer?.items.length && <section className="card mumu-talk-offer"><span className="eyebrow">대화에서 찾은 작은 경험</span><strong>지금 너에게 어울릴 만한 체험 {m.offer.items.length}개를 찾았어</strong>{m.offer.assumptions && <p className="small mute">{m.offer.assumptions}</p>}<button className="btn" disabled={p.busy} onClick={() => p.onExperiences(m.offer!.items)}>무무가 찾은 체험 보기 ›</button></section>}
            {m.support && <aside className="card mumu-support"><p className="small">{m.support.text}</p>{m.support.lines.map(line => <a key={line.tel} href={`tel:${line.tel.replace(/[^+0-9]/g, '')}`}>{line.name} {line.tel}</a>)}</aside>}
            {i === p.msgs.length - 1 && !!m.quickReplies?.length && <div className="chips mumu-quick-replies" aria-label="대화 이어가기">{m.quickReplies.map(reply => <button className="chip" key={reply} disabled={p.busy || p.retry} onClick={() => p.onSend(reply)}>{reply}</button>)}</div>}
            </div>
          ) : (
            <div key={i} className="bubble me">
              {m.text}
            </div>
          ),
        )}
        {p.busy && (
          <div className="say">
            <MumuArtwork className="chat-avatar"/>
            <div className="bubble bunny typing" aria-label="무무가 생각하는 중">
              <i />
              <i />
              <i />
            </div>
            <MumuLoading message="무무가 생각하고 있어요"/>
          </div>
        )}
        {p.retry && <div className="card" role="status">
          <p>답장을 받지 못했어. 네가 보낸 말은 남겨 뒀어. 다시 보내 볼까?</p>
          <button className="btn ghost" disabled={p.busy} onClick={p.onRetry}>다시 보내기</button>
        </div>}
      </div>
      {showSolutions && <section className="room-solutions">
        <h2>✦ 무무가 제안하는 오늘의 솔루션</h2>
        {solutions.map(solution => <button type="button" key={solution.title} disabled={p.busy || p.retry} onClick={() => {
          p.onSend(`${solution.title}: ${solution.detail}`);
          setSolutionsOverride(false);
        }}><span aria-hidden="true">{solution.icon}</span><span><strong>{solution.title}</strong><small>{solution.detail}</small></span><span aria-hidden="true">›</span></button>)}
      </section>}
      {micError && <p className="notice" role="alert">{micError}</p>}
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          if (p.busy || p.retry || !text.trim()) return;
          p.onSend(text.trim());
          setText('');
        }}
      >
        <button type="button" className="room-plus" aria-label="솔루션 열기" aria-expanded={showSolutions} onClick={toggleSolutions}>+</button>
        <div className="room-message">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={mic ? '듣고 있어… 말해 줘' : '무무에게 이야기해보세요…'} maxLength={500} aria-label="메시지" />
          {canListen && <button type="button" className={mic ? 'mic listening' : 'mic'} aria-label={mic ? '그만 듣기' : '말로 하기'} aria-pressed={!!mic} disabled={p.busy || p.retry} onClick={talk}>🎤</button>}
          <button type="submit" aria-label="보내기" disabled={p.busy || p.retry || !text.trim()}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 18-7-5 18-5-7-8-4Zm8 4 10-11" /></svg>
          </button>
        </div>
      </form>
    </div>
  );
}
