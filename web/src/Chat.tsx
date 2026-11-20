import MumuArtwork, {MumuLoading} from './MumuArtwork';
import {PhoneStatus} from './MumuWelcome';
// Existing conversation API supplies replies and optional experience recommendations.
import { useEffect, useRef, useState } from 'react';
import type { Item } from './api';
import type { TalkOffer } from './talkClient';

export type Msg = { who: 'bunny' | 'me'; text: string; offer?: Pick<TalkOffer, 'items' | 'assumptions'>; quickReplies?: string[]; support?: TalkOffer['support'] };

export default function Chat(p: { onExperiences: (items: Item[]) => void; onBack?: () => void; msgs: Msg[]; busy: boolean; onSend: (t: string) => void; retry: boolean; onRetry: () => void }) {
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [p.msgs.length, p.busy, p.retry]);

  return (
    <div className="chat mumu-chat">
      <PhoneStatus/><header className="mumu-chat-header"><button aria-label="홈으로" onClick={p.onBack}>‹</button><MumuArtwork className="chat-header-logo"/><strong>무무와 대화</strong></header><div className="mumu-chat-hero"><MumuArtwork kind="community"/><p>오늘은 어떤 기분이야?<br/>무무한테 편하게 말해줘! 💜</p></div><div className="mumu-chat-modes">{['💬 고민 털어놓기','🌱 기분 점검하기','✨ 해결책 받기'].map(t=><button key={t} disabled={p.busy} onClick={()=>p.onSend(t.slice(3))}>{t}</button>)}</div>
      <p className="notice">무무와 대화 · 무무는 AI 캐릭터예요. 대화는 비공개이고 전문 상담을 대신하지 않아요.</p>
      <div className="log" aria-live="polite">
        {p.msgs.map((m, i) =>
          m.who === 'bunny' ? (
            <div key={i} className="mumu-chat-turn"><div className="say">
              <MumuArtwork kind="community" className="chat-avatar"/>
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
        <div ref={end} />
      </div>
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          if (p.busy || !text.trim()) return;
          p.onSend(text);
          setText('');
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="무무에게 오늘 기분 말하기" maxLength={500} aria-label="메시지" />
        <button className="btn send" disabled={p.busy || !text.trim()}>
          보내기
        </button>
      </form>
    </div>
  );
}
