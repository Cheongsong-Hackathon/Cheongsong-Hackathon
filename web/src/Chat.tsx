import { useEffect, useRef, useState } from 'react';
import type { Item, LatLng, Tier } from './api';

export type Msg = { who: 'snail' | 'me'; text: string } | { who: 'recs'; items: Item[]; center: LatLng | null };

export const TIER_LABEL: Record<Tier, string> = { HOME: '집 안', NEAR: '집 앞', TOWN: '동네' };

/** 지도 API 없이 그리는 약도: 내 위치(가운데)와 장소 핀, 거리 */
function MapPreview({ center, place, distanceM }: { center: LatLng | null; place: LatLng & { name: string }; distanceM?: number }) {
  const dx = center ? (place.lng - center.lng) * Math.cos((center.lat * Math.PI) / 180) * 111320 : 600;
  const dy = center ? (place.lat - center.lat) * 110540 : 300;
  const x = 150 + Math.max(-1, Math.min(1, dx / 1500)) * 125;
  const y = 48 - Math.max(-1, Math.min(1, dy / 1500)) * 38;
  return (
    <svg viewBox="0 0 300 96" className="map" role="img" aria-label={`${place.name}까지 약 ${distanceM ?? '?'}미터`}>
      <rect width="300" height="96" className="map-bg" />
      <path className="map-road" d="M0 30h300M0 70h300M60 0v96M150 0v96M235 0v96" />
      <path className="map-route" d={`M150 48L${x} ${y}`} />
      <circle cx="150" cy="48" r="6" className="map-me" />
      <path className="map-pin" d={`M${x} ${y}c-9-10-9-19 0-19s9 9 0 19z`} />
      <text x="158" y="44" className="map-label">나</text>
      {distanceM != null && (
        <text x="292" y="88" textAnchor="end" className="map-dist">
          {distanceM >= 1000 ? `${(distanceM / 1000).toFixed(1)}km` : `${distanceM}m`}
        </text>
      )}
    </svg>
  );
}

function RecCard({ item, center, disabled, onStart }: { item: Item; center: LatLng | null; disabled: boolean; onStart: () => void }) {
  return (
    <article className="card rec">
      <div className="row">
        <span className={`badge tier-${item.tier}`}>{TIER_LABEL[item.tier]}</span>
        {item.isPartner && <span className="badge partner">제휴</span>}
        <span className="meta">
          {item.minutes}분 · +{item.exp} 경험치
        </span>
      </div>
      <h3>{item.title}</h3>
      <p className="reason">{item.reason}</p>
      {item.place && <MapPreview center={center} place={item.place} distanceM={item.distanceM} />}
      {item.benefit && <p className="benefit">제휴 혜택: {item.benefit}</p>}
      <button className="btn" disabled={disabled} onClick={onStart}>
        이거 해볼래
      </button>
    </article>
  );
}

export default function Chat(p: {
  msgs: Msg[];
  quick: string[];
  busy: boolean;
  onSend: (t: string) => void;
  onStart: (i: Item) => void;
  onMore: () => void;
}) {
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [p.msgs.length, p.busy, p.quick.length]);
  const lastRecs = p.msgs.map((m) => m.who).lastIndexOf('recs');

  return (
    <div className="chat">
      <p className="notice">느리는 AI 캐릭터예요. 전문 상담을 대신하지 않아요.</p>
      <div className="log" aria-live="polite">
        {p.msgs.map((m, i) =>
          m.who === 'recs' ? (
            <div key={i} className="recs">
              {m.items.map((it) => (
                <RecCard key={it.templateId} item={it} center={m.center} disabled={p.busy || i !== lastRecs} onStart={() => p.onStart(it)} />
              ))}
              {i === lastRecs && (
                <button className="btn ghost" disabled={p.busy} onClick={p.onMore}>
                  다른 거 추천해줘
                </button>
              )}
            </div>
          ) : (
            <div key={i} className={`bubble ${m.who}`}>
              {m.text}
            </div>
          ),
        )}
        {p.busy && (
          <div className="bubble snail typing" aria-label="느리가 생각하는 중">
            <i />
            <i />
            <i />
          </div>
        )}
        {p.quick.length > 0 && !p.busy && (
          <div className="quick">
            {p.quick.map((q) => (
              <button key={q} className="chip" onClick={() => p.onSend(q)}>
                {q}
              </button>
            ))}
          </div>
        )}
        <div ref={end} />
      </div>
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          p.onSend(text);
          setText('');
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="느리에게 말하기" maxLength={500} aria-label="메시지" />
        <button className="btn send" disabled={p.busy || !text.trim()}>
          보내기
        </button>
      </form>
    </div>
  );
}
