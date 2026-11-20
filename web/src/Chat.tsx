import MumuArtwork, {MumuLoading} from './MumuArtwork';
import {PhoneStatus} from './MumuWelcome';
// Existing conversation API supplies replies and optional experience recommendations.
import { useEffect, useRef, useState } from 'react';
import type { Item } from './api';
import type { Science, TalkOffer } from './talkClient';
import { PlaceTile } from './TripUI';
import portrait from './assets/mumu/mood-happy.webp';
import { canListen, setVoicePref, speak, stopSpeaking, voicePref } from './voice';
import VoiceMode from './VoiceMode';
import { GAME_NAMES, type MumuGame } from './MumuGames';

export type Msg = { who: 'bunny' | 'me'; text: string; offer?: Pick<TalkOffer, 'items' | 'assumptions' | 'prefs'> & { science?: Science | null }; quickReplies?: string[]; support?: TalkOffer['support']; play?: MumuGame };

// 위쪽 빠른 시작: 바로 장소 추천으로 이어지는 말 (상담처럼 보이던 "고민 털어놓기·해결책 받기"를 대신)
const STARTERS = [
  ['😮‍💨', '오늘 지쳤어', '오늘 진짜 지쳤어'],
  ['😤', '답답한 일 있었어', '오늘 답답한 일이 있었어'],
  ['🎲', '심심해', '심심해, 나랑 놀자'],
  ['📍', '근처 갈 곳', '근처에 기분 전환할 곳 찾아 줘'],
] as const;
const NEED_LABEL: Record<string, string> = { 쉬기: '쉬고 싶은 마음', 비우기: '생각 비우기', 풀기: '답답함 풀기', 몰입: '뭔가 해내기', 즐기기: '새로운 재미', 연결: '함께하고 싶은 마음' };
const ENERGY_LABEL: Record<string, string> = { '거의 없음': '기운 거의 없음', 낮음: '기운 낮음', 보통: '기운 보통', 높음: '기운 넉넉' };

/** 대화 안 추천: 무무가 읽은 내 마음(칩) → 장소 카드 3개(근거 칩, "왜 여기?") → 왜 기분 전환이 되나(연구 한 줄) */
function PlaceOffer({ offer, busy, onPick, onList }: { offer: NonNullable<Msg['offer']>; busy: boolean; onPick: (item: Item) => void; onList: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const p = offer.prefs;
  const read = [p?.need && NEED_LABEL[p.need], p?.energy && ENERGY_LABEL[p.energy], ...(p?.want ?? []).map((t) => `원함: ${t}`), ...(p?.avoid ?? []).map((t) => `피함: ${t}`), ...(offer.assumptions ? offer.assumptions.split(', ') : [])].filter(Boolean) as string[];
  return <section className="chat-places">
    {read.length > 0 && <div className="chat-read" aria-label="무무가 읽은 내 마음"><span>무무가 읽은 내 마음</span>{read.map((r) => <i key={r}>{r}</i>)}</div>}
    {offer.items.map((item, i) => <article key={item.id} className="chat-place">
      <PlaceTile item={item} rank={i + 1} compact onPick={onPick} />
      {!!item.evidence?.length && <div className="chat-evidence">{item.evidence.slice(0, 2).map((e) => <i key={e}>{e}</i>)}
        <button type="button" aria-expanded={open === item.id} onClick={() => setOpen(open === item.id ? null : item.id)}>{open === item.id ? '접기' : '왜 여기?'}</button></div>}
      {open === item.id && <div className="chat-why">
        <strong>무무가 고른 근거</strong>
        <ul>{item.evidence!.map((e) => <li key={e}>{e}</li>)}</ul>
        {offer.science && <p>왜 기분 전환이 될까: {offer.science.text} <a href={offer.science.url} target="_blank" rel="noreferrer">{offer.science.source}</a></p>}
        <small>순서는 규칙 점수(마음에 맞는 특징·지금 기운·전에 다녀온 기록·거리)로 정하고, AI는 설명만 써요. 영업시간·가격은 방문 전에 확인해 주세요.</small>
      </div>}
    </article>)}
    <button type="button" className="chat-places-more" disabled={busy} onClick={onList}>목록으로 크게 보기 ›</button>
  </section>;
}

export default function Chat(p: { onExperiences: (items: Item[]) => void; onBack?: () => void; onPlay: () => void; msgs: Msg[]; busy: boolean; onSend: (t: string) => void; retry: boolean; onRetry: () => void; voiceStart?: boolean; onGame?: (game: MumuGame) => void; onPick?: (item: Item) => void }) {
  const [text, setText] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  // 음성 대화 모드(무무를 누르거나 🎙): ChatGPT 음성 모드처럼 듣기 → 답하기 → 다시 듣기. 🔊는 글 대화에서 답장을 읽어 줄지
  const [voiceMode, setVoiceMode] = useState(!!p.voiceStart && canListen);
  const [voiceOn, setVoiceOn] = useState(voicePref);
  const spoken = useRef(p.msgs.length);
  useEffect(() => {
    const last = p.msgs[p.msgs.length - 1];
    if (p.msgs.length > spoken.current && last?.who === 'bunny' && voiceOn && !voiceMode) void speak(last.text);
    spoken.current = p.msgs.length;
  }, [p.msgs.length, voiceOn]);
  useEffect(() => () => { stopSpeaking(); }, []);
  const toggleVoice = () => { const on = !voiceOn; setVoiceOn(on); setVoicePref(on); if (!on) stopSpeaking(); };
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
      <div className="mumu-chat-hero">{canListen ? <button type="button" className="voice-open" aria-label="무무와 음성 대화" onClick={() => setVoiceMode(true)}><img src={portrait} alt="" /><span>🎙 눌러서 대화하기</span></button> : <img src={portrait} alt="" />}<p>오늘은 어떤 기분이야?<br />무무한테 편하게 말해줘! 💜</p></div>
      <div className="mumu-chat-modes">
        {STARTERS.map(([icon, label, say]) => <button key={label} type="button" disabled={p.busy || p.retry} onClick={() => p.onSend(say)}>{icon} {label}</button>)}
      </div>
      <div className="log" ref={log} aria-live="polite">
        {p.msgs.map((m, i) =>
          m.who === 'bunny' ? (
            <div key={i} className="mumu-chat-turn"><div className="say">
              <img src={portrait} className="chat-avatar" alt="" />
              <div className="bubble bunny">{m.text}</div>
            </div>
            {!!m.offer?.items.length && (p.onPick
              ? <PlaceOffer offer={m.offer} busy={p.busy} onPick={p.onPick} onList={() => p.onExperiences(m.offer!.items)} />
              : <section className="card mumu-talk-offer"><span className="eyebrow">대화에서 찾은 작은 경험</span><strong>지금 너에게 어울릴 만한 체험 {m.offer.items.length}개를 찾았어</strong><button className="btn" disabled={p.busy} onClick={() => p.onExperiences(m.offer!.items)}>무무가 찾은 체험 보기 ›</button></section>)}
            {m.play && p.onGame && <button type="button" className="card mumu-play-offer" onClick={() => p.onGame!(m.play!)}><span aria-hidden="true">🎮</span><strong>무무랑 {GAME_NAMES[m.play]} 하러 가기</strong><b aria-hidden="true">›</b></button>}
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
      {voiceMode && <VoiceMode msgs={p.msgs} retry={p.retry} onSend={p.onSend} onRetry={p.onRetry} onExperiences={p.onExperiences} onGame={p.onGame} onPick={p.onPick} onClose={() => setVoiceMode(false)} />}
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          if (p.busy || p.retry || !text.trim()) return;
          p.onSend(text.trim());
          setText('');
        }}
      >
        <div className="room-message">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="무무에게 이야기해보세요…" maxLength={500} aria-label="메시지" />
          {canListen && <button type="button" className="mic" aria-label="음성 대화" onClick={() => setVoiceMode(true)}>🎙</button>}
          <button type="submit" aria-label="보내기" disabled={p.busy || p.retry || !text.trim()}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 18-7-5 18-5-7-8-4Zm8 4 10-11" /></svg>
          </button>
        </div>
      </form>
    </div>
  );
}
