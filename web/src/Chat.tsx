import { conversationExpressions } from './chatExpression';
import { useCharacterExpression } from './CharacterExpression';
// 선택형 속마음 대화: 무무의 공감·위로만. 추천이나 예약을 권하지 않는다.
import { useEffect, useRef, useState } from 'react';
import Bunny from './Bunny';
import type { Item } from './api';
import type { TalkOffer } from './talkClient';
import { TopBar } from './screens';

// 답장을 기다리는 동안 무엇을 하는 중인지 보여 준다 (AI 읽기 → 카카오 가게 검색 → 구글 사진, 몇 초 걸림)
const STEPS = ['기분 읽는 중…', '근처 가게 찾는 중…', '사진 가져오는 중…', '거의 다 됐어…'];
function Waiting() {
  const [i, setI] = useState(-1);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, STEPS.length - 1)), 1500);
    return () => clearInterval(t);
  }, []);
  return i < 0 ? null : <small className="waiting-step" role="status">{STEPS[i]}</small>;
}

export type Msg = { who: 'bunny' | 'me'; text: string; offer?: Pick<TalkOffer, 'items' | 'assumptions'>; quickReplies?: string[]; support?: TalkOffer['support'] };

export default function Chat(p: { onExperiences: (items: Item[]) => void; onBack?: () => void; msgs: Msg[]; busy: boolean; onSend: (t: string) => void; retry: boolean; onRetry: () => void }) {
  const [text, setText] = useState('');
  const { expression } = useCharacterExpression();
  const expressions = conversationExpressions(p.msgs, expression);
  const currentExpression = expressions[expressions.length - 1] ?? expression;
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [p.msgs.length, p.busy, p.retry]);

  return (
    <div className="chat">
      <TopBar onBack={p.onBack} />
      <p className="notice">무무와 대화 · 무무는 AI 캐릭터예요. 대화는 비공개이고 전문 상담을 대신하지 않아요.</p>
      <div className="log" aria-live="polite">
        {p.msgs.map((m, i) =>
          m.who === 'bunny' ? (
            <div key={i} className="mumu-chat-turn"><div className="say">
              <Bunny size={40} faceOnly expression={expressions[i]} />
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
            <Bunny size={40} faceOnly expression={currentExpression} />
            <div className="bubble bunny typing" aria-label="무무가 생각하는 중">
              <i />
              <i />
              <i />
            </div>
            <Waiting />
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
