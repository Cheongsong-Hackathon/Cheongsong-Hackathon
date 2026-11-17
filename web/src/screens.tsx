import { useEffect, useState, type ReactNode } from 'react';
import { api, won, type Booking, type Character, type FreeRec, type Growth, type Item, type Memory, type Records as RecordsData } from './api';
import Art from './Art';
import Bunny from './Bunny';

export const EMOTIONS = ['지쳤어', '답답해', '불안해', '심심해', '평온해'];
const DOW = ['', '월', '화', '수', '목', '금', '토', '일'];
export const DemoNote = () => <p className="notice">체험 모드: 매장 이름·위치만 실제이고, 제휴·가격·예약은 예시예요</p>;

function Logo() {
  return (
    <span className="logo">
      <Bunny size={26} peek />
      <b>무드패스</b>
      <small>MoodPass</small>
    </span>
  );
}

export function TopBar({ onBack }: { onBack?: () => void }) {
  return (
    <header className="topbar">
      {onBack ? (
        <button className="icon-btn" onClick={onBack} aria-label="뒤로">
          <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
      ) : (
        <span className="icon-btn" />
      )}
      <Logo />
      <span className="icon-btn" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4" /></svg>
      </span>
    </header>
  );
}

function Chips<T extends string | number>({ options, value, onChange, label }: { options: [T, string][]; value: T | null; onChange: (v: T) => void; label: string }) {
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
export type CheckinForm = { text: string; emotion: string | null; energy: number; mood: number };

export function Home(p: {
  ch: Character | null;
  active: Booking | null;
  busy: boolean;
  onSubmit: (f: CheckinForm) => void;
  onComplete: (b: Booking) => void;
  onCancel: (b: Booking) => void;
  onPostpone: () => void;
}) {
  const [f, setF] = useState<CheckinForm>({ text: '', emotion: null, energy: 40, mood: 5 });
  const set = (patch: Partial<CheckinForm>) => setF((x) => ({ ...x, ...patch }));
  return (
    <div className="page">
      <TopBar />
      <DemoNote />
      {p.active && (
        <div className="card active">
          <span className="eyebrow">예약 요청한 체험</span>
          <div className="row">
            <Art category={p.active.category} className="thumb sm" />
            <div className="grow">
              <strong>{p.active.title}</strong>
              <span className="meta">
                오늘 {p.active.slotTime} · {p.active.placeName}
              </span>
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
        </div>
      )}
      <h1 className="title center">
        오늘 기분은 어때?<span className="spark" aria-hidden="true">˚✧</span>
      </h1>
      <div className="hero">
        <Bunny size={150} item={p.ch?.equipped ?? null} stage={p.ch?.stage ?? 1} />
      </div>
      <label className="field">
        <input value={f.text} onChange={(e) => set({ text: e.target.value })} placeholder="오늘 지쳤어, 조용히 쉬고 싶어" maxLength={300} aria-label="오늘 마음 한 줄" />
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l4-1 11-11-3-3L5 16zM14 6l3 3" /></svg>
      </label>
      <h2 className="label">지금의 마음과 비슷한 감정은?</h2>
      <Chips label="감정" options={EMOTIONS.map((e) => [e, e])} value={f.emotion} onChange={(emotion) => set({ emotion })} />
      <h2 className="label">
        지금 나의 에너지 레벨은? <span className="pill">{f.energy}%</span>
      </h2>
      <input type="range" min={0} max={100} step={5} value={f.energy} onChange={(e) => set({ energy: Number(e.target.value) })} aria-label="에너지" style={{ ['--v' as string]: `${f.energy}%` }} />
      <h2 className="label">
        지금 기분은 몇 점이야? <span className="pill">{f.mood} / 10</span>
      </h2>
      <input type="range" min={1} max={10} value={f.mood} onChange={(e) => set({ mood: Number(e.target.value) })} aria-label="기분 점수" style={{ ['--v' as string]: `${((f.mood - 1) / 9) * 100}%` }} />
      <button className="btn big" disabled={p.busy || (!f.text.trim() && !f.emotion)} onClick={() => p.onSubmit(f)}>
        {p.busy ? '마음을 읽는 중…' : '나에게 맞는 경험 찾기 ›'}
      </button>
      <button className="card postpone" onClick={p.onPostpone}>
        <span className="eyebrow">무드패스의 오늘 회복 제안</span>
        <strong>오늘 할 일 하나 미루기</strong>
        <span className="meta">더 하라고 재촉하는 대신, 부담 하나를 덜어 볼까? 조금은 쉬어가도 괜찮아.</span>
      </button>
      <p className="small center mute">무드패스 토끼는 AI 캐릭터예요. 진단·치료를 대신하지 않아요.</p>
    </div>
  );
}

// ---------- 02 조건 확인 ----------
export type Conditions = { minutes: number; walk: number; budget: number };

export function ConditionSheet(p: { reply: string; suggestPostpone: boolean; busy: boolean; onSubmit: (c: Conditions) => void; onPostpone: () => void; onClose: () => void }) {
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
function ExpCard({ item, onPick, children }: { item: Item; onPick: () => void; children?: ReactNode }) {
  return (
    <button className="card exp" onClick={onPick}>
      <Art category={item.category} className="thumb" />
      <span className="exp-body">
        <strong>{item.title}</strong>
        <span className="meta">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>
          {item.minutes}분 · 도보 {item.walkMinutes}분
        </span>
        <span className="price">{won(item.price)}</span>
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
      <TopBar onBack={p.onBack} />
      <h1 className="title">
        지금 너에게 어울리는 경험<span className="spark" aria-hidden="true">˚✧</span>
      </h1>
      {p.widened && <p className="notice">딱 맞는 게 부족해서 조건을 조금 넓혔어.</p>}
      {!p.items.length && <p className="notice">근처에 아직 제휴 매장이 없어서, 지금 바로 갈 수 있는 곳을 골라 봤어.</p>}
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
        {p.items.length > 0 && '가격·시간은 매장 정보 그대로이고, 추천 이유만 AI가 썼어요. '}
        {p.free.length > 0 && '돈 안 드는 곳은 카카오맵 장소 정보예요.'}
      </p>
    </div>
  );
}

// ---------- 04 예약 확인 ----------
export function Confirm(p: { item: Item; busy: boolean; onBack: () => void; onBook: (slot: string) => void }) {
  const slots = p.item.availableSlots.length ? p.item.availableSlots : p.item.slots;
  const [slot, setSlot] = useState<string | null>(slots[0] ?? null);
  return (
    <div className="page">
      <TopBar onBack={p.onBack} />
      <h1 className="title">
        예약 내용을 확인해 줘<span className="spark" aria-hidden="true">˚✧</span>
      </h1>
      <div className="card confirm">
        <Art category={p.item.category} className="hero-art" />
        <strong className="big-title">{p.item.title}</strong>
        <span className="meta">
          {p.item.placeName} · 도보 {p.item.walkMinutes}분
        </span>
        <p>{p.item.description}</p>
        <h2 className="label">오늘 가능한 시간</h2>
        <Chips label="시간" options={slots.map((s) => [s, s] as [string, string])} value={slot} onChange={setSlot} />
        <div className="facts">
          <span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>
            오늘 {slot ?? '--:--'} · {p.item.minutes}분
          </span>
          <span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>
            1인 {won(p.item.price)}
          </span>
        </div>
      </div>
      <button className="btn ghost" disabled>
        친구 초대하기 <small>준비 중</small>
      </button>
      <button className="btn big" disabled={!slot || p.busy} onClick={() => slot && p.onBook(slot)}>
        {p.busy ? '요청하는 중…' : '예약 요청하기 ›'}
      </button>
      <p className="small center mute">체험 모드: 실제 결제와 예약은 이뤄지지 않아요. 매장이 확인하기 전까지는 확정이 아니에요.</p>
    </div>
  );
}

export function Requested({ booking, ch, onHome }: { booking: Booking; ch: Character | null; onHome: () => void }) {
  return (
    <div className="page center-col">
      <Bunny size={170} happy item={ch?.equipped ?? null} stage={ch?.stage ?? 1} />
      <h1 className="title center">예약 요청을 보냈어!</h1>
      <div className="card soft">
        <strong>{booking.title}</strong>
        <span>
          오늘 {booking.slotTime} · {booking.placeName} · {won(booking.price)}
        </span>
      </div>
      <p className="center mute">다녀오면 홈에서 “다녀왔어”를 눌러 줘. 체험 전후 기분을 같이 남겨 둘게.</p>
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

export type PartyResult = Growth & { moodBefore?: number | null; moodAfter?: number; reply?: string };

export function Party(p: { result: PartyResult; ch: Character | null; onClose: () => void }) {
  const r = p.result;
  return (
    <div className="scrim party" onClick={p.onClose}>
      <section className="sheet center" role="dialog" aria-modal="true" aria-label="기록 완료" onClick={(e) => e.stopPropagation()}>
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} style={{ left: `${6 + i * 6.5}%`, animationDelay: `${(i % 5) * 0.12}s` }} />
          ))}
        </div>
        <Bunny size={150} happy item={p.ch?.equipped ?? r.newItems[0]?.id ?? null} stage={r.stage} />
        {r.moodAfter != null ? (
          <>
            <h2>오늘도 나를 위한 한 걸음 ♡</h2>
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
        <p className="gain">+{r.expGained}</p>
        {r.stageUp && <p className="pill solid">토끼가 한 단계 자랐어</p>}
        {r.newItems.map((i) => (
          <p key={i.id} className="card soft">
            <strong>{i.name}을(를) 얻었어!</strong>
            <span className="meta">기록 탭에서 바꿔 씌울 수 있어.</span>
          </p>
        ))}
        <button className="btn big" onClick={p.onClose}>
          좋아
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

/** 토끼가 기억하는 것: AI가 대화에서 뽑아 둔 사실. 몰래 기억하지 않도록 보여 주고, 하나씩 지울 수 있게 한다. */
function MemoryCard({ reloadKey }: { reloadKey: unknown }) {
  const [mems, setMems] = useState<Memory[] | null>(null);
  useEffect(() => {
    api.memories().then((r) => setMems(r.items ?? []));
  }, [reloadKey]);
  return (
    <div className="card">
      <span className="eyebrow">토끼가 기억하는 너</span>
      {mems === null && <span className="meta">불러오는 중…</span>}
      {mems?.length === 0 && <span className="meta">이야기를 나누다 보면 토끼가 조금씩 기억해 둘게.</span>}
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

export function Records(p: { ch: Character | null; data: RecordsData | null; onEquip: (id: string | null) => void; onDelete: () => void }) {
  const [askDelete, setAskDelete] = useState(false);
  const c = p.ch;
  const latest = p.data?.done[0];
  const span = c?.nextStageExp ? c.nextStageExp - c.stageMinExp : 1;
  const pct = c ? (c.nextStageExp ? Math.min(100, ((c.exp - c.stageMinExp) / span) * 100) : 100) : 0;
  return (
    <div className="page">
      <TopBar />
      <div className="row record-hero">
        <h1 className="title">
          오늘도 나를 위한
          <br />한 걸음 ♡
        </h1>
        <Bunny size={120} item={c?.equipped ?? null} stage={c?.stage ?? 1} />
      </div>
      <div className="bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="다음 단계까지">
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="small mute">
        {c?.stage ?? 1}단계 · {c?.nextStageExp ? `다음 단계까지 ${c.nextStageExp - c.exp}` : '끝까지 자랐어'} · 쉬는 날에도 줄지 않아요
      </p>
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
      <div className="card">
        <span className="eyebrow">토끼 꾸미기</span>
        <div className="items">
          <button className={`item${!c?.equipped ? ' on' : ''}`} onClick={() => p.onEquip(null)}>
            없음
          </button>
          {c?.allItems.map((i) => (
            <button key={i.id} className={`item${c.equipped === i.id ? ' on' : ''}`} disabled={!i.unlocked} onClick={() => p.onEquip(i.id)}>
              {i.unlocked ? i.name : `🔒 ${i.stage}단계`}
            </button>
          ))}
        </div>
      </div>
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
      <button className="btn ghost" disabled>
        이웃 구경하기 <small>준비 중</small>
      </button>
      <p className="small center mute">기록은 나만 볼 수 있어요.</p>
      {askDelete ? (
        <div className="card soft">
          <strong>기록을 모두 지울까?</strong>
          <span>마음 확인, 다녀온 체험, 미룬 일, 속마음 대화, 토끼가 기억하는 것이 지워져. 토끼 성장은 그대로야.</span>
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
export function Explore({ items, onPick }: { items: Item[] | null; onPick: (i: Item) => void }) {
  return (
    <div className="page">
      <TopBar />
      <DemoNote />
      <h1 className="title">가까운 체험</h1>
      {!items && <p className="empty">불러오는 중이야…</p>}
      {items?.length === 0 && <p className="empty">근처에 체험이 없어.</p>}
      <div className="list">
        {items?.map((i) => (
          <ExpCard key={i.id} item={i} onPick={() => onPick(i)}>
            <span className="reason plain">{i.placeName}</span>
          </ExpCard>
        ))}
      </div>
    </div>
  );
}

// ---------- 랜딩 · 위치 동의 · 안전 모드 ----------
export function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="landing">
      <div className="landing-top">
        <Bunny size={160} />
        <h1>무드패스</h1>
        <p className="tagline">
          지친 하루를 바꾸는,
          <br />
          <em>나에게 맞는 하나의 경험.</em>
        </p>
        <p className="promise">“오늘은 고르지 않아도 돼. 기분에 딱 맞는 30분, 내가 찾아 줄게”</p>
      </div>
      <ul className="points">
        <li>
          <b>1</b>
          <span>
            <strong>마음 읽기</strong>오늘의 기분과 에너지를 알려 줘요
          </span>
        </li>
        <li>
          <b>2</b>
          <span>
            <strong>경험 찾기</strong>지금 갈 수 있는 가까운 체험을 골라 줘요
          </span>
        </li>
        <li>
          <b>3</b>
          <span>
            <strong>실행과 기록</strong>예약하고 다녀와서 변화를 남겨요
          </span>
        </li>
      </ul>
      <button className="btn big" onClick={onStart}>
        시작하기
      </button>
    </div>
  );
}

export function LocationConsent({ onAnswer }: { onAnswer: (yes: boolean) => void }) {
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
            <strong>좌표는 저장하지 않아요</strong>계산이 끝나면 버려요
          </span>
        </li>
        <li>
          <b>✓</b>
          <span>
            <strong>거절해도 괜찮아요</strong>기본 동네 기준으로 추천해 줄게요
          </span>
        </li>
      </ul>
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
