// 선택형 속마음 대화: 토끼의 공감·위로만. 추천이나 예약을 권하지 않는다.
import { useEffect, useRef, useState } from 'react';
import Bunny from './Bunny';
import { TopBar } from './screens';

export type Msg = { who: 'bunny' | 'me'; text: string };

export default function Chat(p: { msgs: Msg[]; busy: boolean; onSend: (t: string) => void; retry: boolean; onRetry: () => void }) {
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [p.msgs.length, p.busy, p.retry]);

  return (
    <div className="chat">
      <TopBar />
      <p className="notice">속마음 대화 · 토끼는 AI 캐릭터예요. 대화는 비공개이고 전문 상담을 대신하지 않아요.</p>
      <div className="log" aria-live="polite">
        {p.msgs.map((m, i) =>
          m.who === 'bunny' ? (
            <div key={i} className="say">
              <Bunny size={40} faceOnly />
              <div className="bubble bunny">{m.text}</div>
            </div>
          ) : (
            <div key={i} className="bubble me">
              {m.text}
            </div>
          ),
        )}
        {p.busy && (
          <div className="say">
            <Bunny size={40} faceOnly />
            <div className="bubble bunny typing" aria-label="토끼가 생각하는 중">
              <i />
              <i />
              <i />
            </div>
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
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="토끼에게 속마음 말하기" maxLength={500} aria-label="메시지" />
        <button className="btn send" disabled={p.busy || !text.trim()}>
          보내기
        </button>
      </form>
    </div>
  );
}
