import {MumuLoading} from './MumuArtwork';
export { default as Home } from './RecommendationHome';
export { default as Landing } from './MumuWelcome';
import { useEffect, useState, type ReactNode } from 'react';
import { api, won, type Booking, type FreeRec, type Growth, type Item, type Memory, type Records as RecordsData } from './api';
import Art from './Art';
import PlaceArt from './PlaceArt';
import PlaceReviewPanel from './PlaceReviewPanel';
import Bunny from './Bunny';
import { PhoneStatus } from './MumuWelcome';
import Arrival from './Arrival';

const DOW = ['', '월', '화', '수', '목', '금', '토', '일'];
export const DemoNote = () => <p className="notice">가격·영업시간·예약은 네이버에서 확인해 줘</p>;

/** 네이버 지도(네이버 예약)를 새 창으로. 팝업 차단을 피하려고 클릭 순간에 바로 연다 */
const openNaver = (url?: string) => url && window.open(url, '_blank', 'noopener,noreferrer');

/** 위쪽 뒤로 가기. 돌아갈 곳이 없으면 빈 줄을 남기지 않게 아무것도 그리지 않는다 */
export function TopBar({ onBack }: { onBack?: () => void }) {
  if (!onBack) return null;
  return (
    <header className="topbar">
      <button className="icon-btn" onClick={onBack} aria-label="뒤로">
        <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
    </header>
  );
}

function Chips<T extends string | number>({ options, value, onChange, label }: { options: [T, ReactNode][]; value: T | null; onChange: (v: T) => void; label: string }) {
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={String(v)} role="radio" aria-checked={value === v} className={`chip${value === v ? ' on' : ''}`} onClick={() => onChange(v)}>
          {value === v && '✓ '}
          {text}
        </button>
      ))}
    </div>
  );
}

const Sheet = ({ onClose, label, children }: { onClose: () => void; label: string; children: ReactNode }) => (
  <div className="scrim" onClick={onClose}>
    <section className="sheet" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
      <div className="grip" />
      {children}
    </section>
  </div>
);

// ---------- 01 마음 확인 ----------

export function ActiveExperience(p: { active: Booking | null; onComplete: (b: Booking) => void; onCancel: (b: Booking) => void; onArrivalConfirmed: () => void }) {
  return <>      {p.active && (
        <div className="card active">
          <span className="eyebrow">가기로 한 체험</span>
          <div className="row">
            <Art category={p.active.category} className="thumb sm" />
            <div className="grow">
              <strong>{p.active.title}</strong>
              <span className="meta">
                {p.active.placeName}
              </span>
              {p.active.mapUrl && (
                <a className="small" href={p.active.mapUrl} target="_blank" rel="noopener noreferrer">
                  네이버 지도에서 보기 ↗
                </a>
              )}
            </div>
          </div>
          <div className="row two">
            <button className="btn ghost" onClick={() => p.onCancel(p.active!)}>
              취소
            </button>
            <button className="btn" onClick={() => p.onComplete(p.active!)}>
              다녀왔어
            </button>
          </div>
          <Arrival key={p.active.id} booking={p.active} onConfirmed={p.onArrivalConfirmed} />
        </div>
      )}
</>;
}

// ---------- 02 조건 확인 ----------
export type Conditions = { minutes: number; walk: number; budget: number };

export function ConditionSheet(p: { location?: ReactNode; reply: string; suggestPostpone: boolean; busy: boolean; onSubmit: (c: Conditions) => void; onPostpone: () => void; onClose: () => void }) {
  const [c, setC] = useState<Conditions>({ minutes: 60, walk: 20, budget: 20000 });
  const [skipPostpone, setSkip] = useState(!p.suggestPostpone);
  return (
    <Sheet onClose={p.onClose} label="조건 확인">
      <div className="say">
        <Bunny size={64} />
        <p className="bubble">{p.reply}</p>
      </div>
      {!skipPostpone ? (
        <>
          <div className="card soft">
            <strong>기운이 많이 없구나.</strong>
            <span>오늘은 무언가를 더 하기보다, 할 일 하나를 미루는 것부터 해 볼까?</span>
          </div>
          <button className="btn big" onClick={p.onPostpone}>
            할 일 하나 미루기
          </button>
          <button className="btn text" onClick={() => setSkip(true)}>
            그래도 경험 찾아볼래
          </button>
        </>
      ) : (
        <>
          {p.location}
          <h2 className="label">쓸 수 있는 시간</h2>
          <Chips label="시간" options={[[30, '30분'], [60, '1시간'], [90, '1시간 30분']]} value={c.minutes} onChange={(minutes) => setC({ ...c, minutes })} />
          <h2 className="label">거리</h2>
          <Chips label="거리" options={[[10, '도보 10분'], [20, '도보 20분'], [30, '도보 30분']]} value={c.walk} onChange={(walk) => setC({ ...c, walk })} />
          <h2 className="label">예산</h2>
          <Chips label="예산" options={[[10000, '1만원'], [20000, '2만원'], [30000, '3만원']]} value={c.budget} onChange={(budget) => setC({ ...c, budget })} />
          <button className="btn big" disabled={p.busy} onClick={() => p.onSubmit(c)}>
            {p.busy ? '어울리는 경험 찾는 중…' : '나에게 어울리는 경험 찾기'}
          </button>
        </>
      )}
    </Sheet>
  );
}

// ---------- 03 경험 추천 ----------
export function ExpCard({ item, onPick, children }: { item: Item; onPick: () => void; children?: ReactNode }) {
  return (
    <button className="card exp" onClick={onPick}>
      <PlaceArt placeId={item.placeId} hasPhoto={item.hasPhoto} photo={item.photo} category={item.category} className="thumb" />
      <span className="exp-body">
        <strong>{item.title}</strong>
        <span className="meta">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>
          도보 {item.walkMinutes}분
        </span>
        {children}
      </span>
    </button>
  );
}

// 무료 장소 카드 그림: 체험 그림 중 비슷한 것을 빌려 쓴다
const FREE_ART: Record<string, string> = { 카페: 'tea', 도서관: 'book', 공원: 'meditation' };

export function Recs(p: { items: Item[]; free: FreeRec[]; widened: boolean; busy: boolean; onPick: (i: Item) => void; onMore: () => void; onBack: () => void }) {
  return (
    <div className="page">
      <PhoneStatus />
      <TopBar onBack={p.onBack} />
      <h1 className="title">
        지금 너에게 어울리는 경험<span className="spark" aria-hidden="true">˚✧</span>
      </h1>
      {p.widened && <p className="notice">딱 맞는 게 부족해서 조건을 조금 넓혔어.</p>}
      {!p.items.length && !p.free.length && <div className="card soft">
        <Bunny size={90} peek />
        <strong>지금 조건에 맞는 체험이 없어.</strong>
        <p className="small mute">조건이나 기준 주소를 바꿔서 다시 찾아보자.</p>
        <button className="btn ghost" onClick={p.onBack}>홈으로 돌아가기</button>
      </div>}
      {p.busy && <LoadState loading message="어울리는 경험을 찾고 있어. 잠깐만 기다려 줘…" />}
      {!p.items.length && p.free.length > 0 && <p className="notice">근처에 아직 제휴 매장이 없어서, 지금 바로 갈 수 있는 곳을 골라 봤어.</p>}
      <div className="list">
        {p.items.map((i) => (
          <ExpCard key={i.id} item={i} onPick={() => p.onPick(i)}>
            {i.surprise && <span className="surprise-tag">✦ 평소와 다른 하나</span>}
            {i.reason && <span className="reason">“{i.reason}”</span>}
          </ExpCard>
        ))}
      </div>
      {p.items.length > 0 && (
        <button className="btn ghost" disabled={p.busy} onClick={p.onMore}>
          {p.busy ? '찾는 중…' : '다른 경험 보기'}
        </button>
      )}
      {p.free.length > 0 && (
        <>
          <h2 className="label">돈 안 드는 곳</h2>
          <div className="list">
            {p.free.map((f) => (
              <a key={f.id} className="card exp" href={f.url} target="_blank" rel="noreferrer">
                <Art category={FREE_ART[f.kind] ?? 'book'} className="thumb" />
                <span className="exp-body">
                  <strong>{f.name}</strong>
                  <span className="meta">
                    {f.kind} · 도보 {f.walkMinutes}분
                  </span>
                  <span className="price">무료 · 길 안내 ›</span>
                  <span className="reason">“{f.reason}”</span>
                </span>
              </a>
            ))}
          </div>
        </>
      )}
      <p className="small center mute">
        {p.items.length > 0 && '추천 이유는 AI가 썼어요. 가격·시간은 네이버에서 확인해 줘. '}
        {p.items.some((i) => i.photo) && <>가게 사진은 <span translate="no">Google Maps</span>. </>}
        {p.free.length > 0 && '돈 안 드는 곳은 네이버 지도 장소 정보예요.'}
      </p>
    </div>
  );
}

// ---------- 04 예약 확인 ----------
export function Confirm(p: { item: Item; busy: boolean; showReviews?: boolean; onBack: () => void; onBook: (slot: string | null, moodBefore: number | null) => void }) {
  // 가격·시간은 제휴 전이라 보여 주지 않는다. 서버가 "가기로 한 체험" 기록에 시간대를 요구해서 첫 시간대를 보이지 않게 보낸다
  const slot = (p.item.availableSlots.length ? p.item.availableSlots : p.item.slots)[0] ?? null;
  const [mood, setMood] = useState<number | null>(null); // 체험 전 기분: 다녀온 뒤 "전 → 후"와 기분 기록에 쓴다 (안 골라도 됨)
  return (
    <div className="page">
      <PhoneStatus />
      <TopBar onBack={p.onBack} />
      <h1 className="title">
        {p.showReviews ? '스팟 상세' : '여기 가 볼래?'}<span className="spark" aria-hidden="true">˚✧</span>
      </h1>
      <div className="card confirm">
        <PlaceArt placeId={p.item.placeId} hasPhoto={p.item.hasPhoto} photo={p.item.photo} category={p.item.category} className="hero-art" credit />
        <strong className="big-title">{p.item.title}</strong>
        <span className="meta">
          {p.item.placeName}
          {Number.isFinite(p.item.walkMinutes) && p.item.walkMinutes >= 0 && ` · 도보 ${p.item.walkMinutes}분`}
        </span>
        <p>{p.item.description}</p>
      </div>
      {p.showReviews ? <PlaceReviewPanel item={p.item} /> : <>
        <h2 className="label">지금 기분은 몇 점이야? <small className="mute">(다녀와서 비교해 줄게)</small></h2>
        <Chips label="체험 전 기분" options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => [n, String(n)] as [number, string])} value={mood} onChange={setMood} />
      </>}
      {p.item.referenceOnly ? <button type="button" className="btn big" onClick={() => openNaver(p.item.mapUrl)}>네이버 지도에서 보기 ↗</button> : <>
      <button
        className="btn big"
        disabled={(!slot && !p.item.live) || p.busy}
        onClick={() => {
          openNaver(p.item.mapUrl);
          p.onBook(slot, mood);
        }}
      >
        {p.busy ? '여는 중…' : '네이버에서 예약하기 ↗'}
      </button>
      <p className="small center mute">네이버 지도에서 매장을 열어 줄게. 네이버 예약이 있는 곳은 거기서 바로, 없는 곳은 전화로 예약해 줘. 실제 가격과 시간도 거기서 확인해 줘.</p>
      </>}
    </div>
  );
}

export function Requested({ booking, onHome }: { booking: Booking; onHome: () => void }) {
  return (
    <div className="page center-col">
      <PhoneStatus />
      <Bunny size={170} happy />
      <h1 className="title center">네이버에서 예약을 마무리해 줘!</h1>
      <div className="card soft">
        <strong>{booking.title}</strong>
        <span>
          {booking.placeName}
        </span>
      </div>
      {booking.mapUrl && (
        <a className="btn ghost" href={booking.mapUrl} target="_blank" rel="noopener noreferrer">
          네이버 지도 다시 열기 ↗
        </a>
      )}
      <p className="center mute">다녀오면 마이페이지에서 “다녀왔어”를 눌러 줘. 체험 전후 기분을 같이 남겨 둘게.</p>
      <button className="btn big" onClick={onHome}>
        홈으로
      </button>
    </div>
  );
}

// ---------- 05 기분 기록 ----------
export function CompleteSheet(p: { booking: Booking; busy: boolean; onDone: (mood: number) => void; onClose: () => void }) {
  const [m, setM] = useState<number | null>(null);
  return (
    <Sheet onClose={p.onClose} label="체험 후 기분 기록">
      <div className="say">
        <Bunny size={64} happy />
        <p className="bubble">다녀왔구나! {p.booking.title}, 어땠어? 지금 기분은 몇 점이야?</p>
      </div>
      {p.booking.moodBefore != null && <p className="small mute">체험 전에는 {p.booking.moodBefore}점이었어.</p>}
      <div className="scale" role="radiogroup" aria-label="체험 후 기분">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} role="radio" aria-checked={m === n} className={m === n ? 'on' : ''} onClick={() => setM(n)}>
            {n}
          </button>
        ))}
      </div>
      <button className="btn big" disabled={!m || p.busy} onClick={() => m && p.onDone(m)}>
        기록하기
      </button>
    </Sheet>
  );
}

export type PartyResult = Growth & {
  moodBefore?: number | null;
  moodAfter?: number;
  reply?: string;
  visitGift?: 'microphone' | 'souvenir';
};

const VISIT_GIFTS = {
  microphone: { name: '노래방 기념 마이크', icon: '🎤' },
  souvenir: { name: '방문 기념 선물', icon: '🎁' },
};

export function Party(p: { result: PartyResult; onClose: () => void }) {
  const r = p.result;
  // 서버가 준 외출 기념품이 있으면 그것을, 없으면 화면에서 정한 방문 선물을 보여 준다
  const souvenir = r.newItems?.[0];
  const gift = souvenir ? { name: `${souvenir.name} (외출 기념품)`, icon: '🎁' } : r.visitGift && VISIT_GIFTS[r.visitGift];
  return (
    <div className="scrim party" onClick={p.onClose}>
      <section className="sheet center" role="dialog" aria-modal="true" aria-label="기록 완료" onClick={(e) => e.stopPropagation()}>
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} style={{ left: `${6 + i * 6.5}%`, animationDelay: `${(i % 5) * 0.12}s` }} />
          ))}
        </div>
        <Bunny size={150} happy />
        {r.moodAfter != null ? (
          <>
            <h2>{gift ? '축하합니다!' : '오늘도 나를 위한 한 걸음 ♡'}</h2>
            {gift && <section className="visit-gift-card" aria-label="방문 기념 사은품">
              <span className="visit-gift-icon" aria-hidden="true">{gift.icon}</span>
              <div><span>방문 기념 사은품</span><strong>{gift.name}</strong></div>
            </section>}
            {!gift && r.souvenirMissed && <p className="small mute">{r.souvenirMissed.why === 'arrive' ? `장소에서 '도착했어'를 누르면 ${r.souvenirMissed.name}을(를) 기념품으로 받을 수 있어.` : `조금 더 머물렀다 오면 ${r.souvenirMissed.name}을(를) 기념품으로 받을 수 있어.`}</p>}
            <div className="before-after">
              <span>
                <small>체험 전</small>
                <b>{r.moodBefore ?? '–'}</b>
              </span>
              <i aria-hidden="true">→</i>
              <span className="after">
                <small>체험 후</small>
                <b>{r.moodAfter}</b>
              </span>
            </div>
          </>
        ) : (
          <>
            <h2>잘 미뤘어!</h2>
            <p>{r.reply}</p>
          </>
        )}
        <button className="btn big" onClick={p.onClose}>
          {gift ? '확인' : '좋아'}
        </button>
      </section>
    </div>
  );
}

export function PostponeSheet(p: { busy: boolean; onSubmit: (task: string) => void; onClose: () => void }) {
  const [task, setTask] = useState('');
  return (
    <Sheet onClose={p.onClose} label="오늘 할 일 하나 미루기">
      <div className="say">
        <Bunny size={64} />
        <p className="bubble">오늘 꼭 안 해도 되는 일 하나만 골라 줘. 내일의 너한테 맡기자.</p>
      </div>
      <label className="field">
        <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="예: 빨래 개기" maxLength={100} aria-label="미룰 일" />
      </label>
      <Chips label="예시" options={['설거지', '답장하기', '운동', '방 정리', '과제 조금'].map((t) => [t, t] as [string, string])} value={task} onChange={setTask} />
      <button className="btn big" disabled={!task.trim() || p.busy} onClick={() => p.onSubmit(task.trim())}>
        내일로 미루기
      </button>
    </Sheet>
  );
}

// ---------- 나의 기록 ----------
function Face({ mood }: { mood: number | null }) {
  if (mood == null)
    return (
      <svg viewBox="0 0 24 24" className="face empty" aria-label="기록 없음">
        <circle cx="12" cy="12" r="10" />
      </svg>
    );
  const curve = mood >= 7 ? 4 : mood >= 4 ? 0 : -3;
  return (
    <svg viewBox="0 0 24 24" className={`face m${mood >= 7 ? 3 : mood >= 4 ? 2 : 1}`} aria-label={`${mood}점`}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="8.5" cy="10" r="1.3" className="f-ink" />
      <circle cx="15.5" cy="10" r="1.3" className="f-ink" />
      <path d={`M8 15q4 ${curve} 8 0`} className="f-line" />
    </svg>
  );
}

/** 무무가 기억하는 것: AI가 대화에서 뽑아 둔 사실. 몰래 기억하지 않도록 보여 주고, 하나씩 지울 수 있게 한다. */
function MemoryCard({ reloadKey }: { reloadKey: unknown }) {
  const [mems, setMems] = useState<Memory[] | null>(null);
  useEffect(() => {
    api.memories().then((r) => setMems(r.items ?? []));
  }, [reloadKey]);
  return (
    <div className="card">
      <span className="eyebrow">무무가 기억하는 너</span>
      {mems === null && <span className="meta">불러오는 중…</span>}
      {mems?.length === 0 && <span className="meta">이야기를 나누다 보면 무무가 조금씩 기억해 둘게.</span>}
      {mems?.map((m) => (
        <span key={m.id} className="meta mem">
          <span>
            <b className="mem-kind">{m.kind}</b> {m.text}
          </span>
          <button
            className="mem-del"
            aria-label={`"${m.text}" 기억 지우기`}
            onClick={async () => {
              const r = await api.deleteMemory(m.id);
              if (r.code === 200) setMems((xs) => xs?.filter((x) => x.id !== m.id) ?? null);
            }}
          >
            지우기
          </button>
        </span>
      ))}
    </div>
  );
}

export function Records(p: { data: RecordsData | null; onDelete: () => void }) {
  const [askDelete, setAskDelete] = useState(false);
  const latest = p.data?.done[0];
  return (
    <div className="page">
      <PhoneStatus />
      <TopBar />
      <div className="row record-hero">
        <h1 className="title">
          오늘도 나를 위한
          <br />한 걸음 ♡
        </h1>
        <Bunny size={120} />
      </div>
      {latest && (
        <div className="card">
          <span className="eyebrow">{latest.title}</span>
          <div className="before-after">
            <span>
              <small>체험 전</small>
              <b>{latest.moodBefore ?? '–'}</b>
            </span>
            <i aria-hidden="true">→</i>
            <span className="after">
              <small>체험 후</small>
              <b>{latest.moodAfter}</b>
            </span>
          </div>
        </div>
      )}
      <div className="card">
        <span className="eyebrow">이번 주 마음 기록</span>
        <div className="week">
          {(p.data?.week ?? []).map((d) => (
            <span key={d.date}>
              <Face mood={d.mood} />
              <small>{DOW[d.dow]}</small>
            </span>
          ))}
        </div>
      </div>
      <MemoryCard reloadKey={p.data} />
      <h2 className="label">다녀온 체험</h2>
      {!p.data?.done.length && <p className="empty">아직 기록이 없어. 없어도 괜찮아.</p>}
      {p.data?.done.map((b) => (
        <div key={b.id} className="card row">
          <Art category={b.category} className="thumb sm" />
          <div className="grow">
            <strong>{b.title}</strong>
            <span className="meta">
              {b.completedAt && new Date(b.completedAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} · 기분 {b.moodBefore ?? '–'} → {b.moodAfter}
            </span>
          </div>
        </div>
      ))}
      {!!p.data?.postpones.length && (
        <>
          <h2 className="label">미뤄 둔 일</h2>
          <div className="card">
            {p.data.postpones.map((x) => (
              <span key={x.id} className="meta">
                · {x.task}
              </span>
            ))}
          </div>
        </>
      )}
      <p className="small center mute">기록은 나만 볼 수 있어요.</p>
      {askDelete ? (
        <div className="card soft">
          <strong>기록을 모두 지울까?</strong>
          <span>마음 확인, 다녀온 체험, 미룬 일, 속마음 대화, 무무가 기억하는 것이 지워져. 무무의 모습은 그대로야.</span>
          <div className="row two">
            <button className="btn ghost" onClick={() => setAskDelete(false)}>
              그만두기
            </button>
            <button
              className="btn danger"
              onClick={() => {
                setAskDelete(false);
                p.onDelete();
              }}
            >
              지우기
            </button>
          </div>
        </div>
      ) : (
        <button className="btn text" onClick={() => setAskDelete(true)}>
          내 기록 모두 지우기
        </button>
      )}
    </div>
  );
}

// ---------- 체험 탭 ----------
export function LoadState({ loading, message, onRetry }: { loading: boolean; message: string; onRetry?: () => void }) {
  return (
    <div className="card load-state" role="status" aria-live="polite" aria-busy={loading}>
      {loading && <MumuLoading message="불러오는 중이에요"/>}
      <p>{message}</p>
      {!loading && onRetry && <button className="btn ghost" onClick={onRetry}>다시 불러오기</button>}
    </div>
  );
}

export function Explore({ items, error, onRetry, onPick }: { items: Item[] | null; error: string; onRetry: () => void; onPick: (i: Item) => void }) {
  return (
    <div className="page">
      <PhoneStatus />
      <TopBar />
      <DemoNote />
      <h1 className="title">무무가 찾은 체험</h1>
      {(error || !items) && <LoadState loading={!error} message={error || '가까운 체험을 불러오는 중이야…'} onRetry={onRetry} />}
      {items?.length === 0 && <p className="empty">근처에 체험이 없어.</p>}
      <div className="list">
        {items?.map((i) => (
          <ExpCard key={i.id} item={i} onPick={() => onPick(i)}>
            <span className="reason plain">{i.placeName}</span>
          </ExpCard>
        ))}
      </div>
      {!!items?.length && (
        <p className="small center mute">
          추천 순서는 돈으로 바뀌지 않아요. 지금 기분과 거리만 봐요.
          {items.some((i) => i.photo) && <> 가게 사진은 <span translate="no">Google Maps</span>.</>}
        </p>
      )}
    </div>
  );
}

// ---------- 랜딩 · 위치 동의 · 안전 모드 ----------
export function LocationConsent({ onAnswer, location }: { onAnswer: (yes: boolean) => void; location?: ReactNode }) {
  return (
    <div className="landing consent">
      <div className="landing-top">
        <svg viewBox="0 0 64 64" className="pin" aria-hidden="true">
          <path d="M32 58S12 38 12 24a20 20 0 0 1 40 0c0 14-20 34-20 34z" />
          <circle cx="32" cy="24" r="7" />
        </svg>
        <h1 className="sm">가까운 체험을 찾으려면 위치가 필요해요</h1>
      </div>
      <ul className="points">
        <li>
          <b>✓</b>
          <span>
            <strong>추천할 때만 써요</strong>도보 몇 분인지 계산하는 데만 사용해요
          </span>
        </li>
        <li>
          <b>✓</b>
          <span>
            <strong>현재 위치는 저장하지 않아요</strong>직접 선택한 주소만 이 브라우저에 저장해요
          </span>
        </li>
        <li>
          <b>✓</b>
          <span>
            <strong>거절해도 괜찮아요</strong>기본 동네 기준으로 추천해 줄게요
          </span>
        </li>
      </ul>
      {location}
      <button className="btn big" onClick={() => onAnswer(true)}>
        동의하고 계속
      </button>
      <button className="btn text" onClick={() => onAnswer(false)}>
        나중에 할게요
      </button>
    </div>
  );
}

/** 안전 모드: 추천과 게임 요소를 모두 숨긴 차분한 화면 */
export function Safety({ onBack }: { onBack: () => void }) {
  return (
    <div className="safety">
      <h1>지금 많이 힘들구나</h1>
      <p>말해 줘서 고마워. 혼자 버티지 않아도 돼. 아래 번호는 24시간 열려 있고, 전화하면 전문 상담원이 이야기를 들어 줘.</p>
      <a className="btn big call" href="tel:109">
        자살예방상담전화 109
      </a>
      <a className="btn big call" href="tel:15770199">
        정신건강 위기상담 1577-0199
      </a>
      <p className="small">지금 당장 위험하다면 112나 119에 전화해 줘.</p>
      <button className="btn text" onClick={onBack}>
        대화로 돌아갈래
      </button>
    </div>
  );
}
