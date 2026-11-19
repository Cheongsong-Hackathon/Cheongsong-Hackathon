import { useCallback, useEffect, useRef, useState } from 'react';
import { api, getPos, type Booking, type Character, type FreeRec, type Item, type LatLng, type Records as RecordsData } from './api';
import Chat, { type Msg } from './Chat';
import { sendTalk } from './talkClient';
import Launcher from './Launcher';
import Journal from './Journal';
import MumuShop from './MumuShop';
import Bunny from './Bunny';
import { MumuGrowthContext } from './MumuGrowth';
import LocationPicker, { type SavedLocation } from './LocationPicker';
import FreePlaces from './FreePlaces';
import useAppViewport from './useAppViewport';
import { OutfitContext, nextOutfit, scarfStorageKey } from './Outfit';
import {
  ActiveExperience,
  CompleteSheet,
  ConditionSheet,
  Confirm,
  Explore,
  Home,
  Landing,
  LocationConsent,
  Party,
  PostponeSheet,
  Records,
  Recs,
  Requested,
  Safety,
  LoadState,
  type Conditions,
  type PartyResult,
} from './screens';

type Tab = 'shop' | 'profile' | 'home' | 'explore' | 'journal' | 'records' | 'talk';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'shop', label: '무무샵', icon: 'M3 9l2-5h14l2 5M4 10v10h16V10M8 20v-7h8v7' },
  { id: 'home', label: '홈', icon: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z' },
  { id: 'profile', label: '마이페이지', icon: 'M8 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0M4 21v-2a8 8 0 0 1 16 0v2' },
];
const CRISIS = /죽고싶|죽을래|사라지고싶|없어지고싶|자해|자살|살기싫/;
const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(`moodpass.${k}`);
    } catch {
      return null; // 사생활 보호 모드 등: 저장 없이 동작
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(`moodpass.${k}`, v);
    } catch {}
  },
};
// 첫마디는 눌러서 고를 수 있게 (지친 사람에게 빈 입력창부터 주지 않는다). 직접 써도 된다.
const GREETING: Msg = {
  who: 'bunny',
  text: '오늘 기분이 어때? 알려 주면 근처에서 할 만한 걸 찾아 줄게.',
  quickReplies: ['지쳐서 조용히 쉬고 싶어', '답답해서 기분 전환하고 싶어', '심심해, 재밌는 거 없을까', '그냥 추천해 줘'],
};

type Sheet = { kind: 'conditions' } | { kind: 'postpone' } | { kind: 'complete'; booking: Booking } | null;

export default function App() {
  useEffect(() => { document.title = '무무'; }, []);
  const [launched, setLaunched] = useState(false); // false면 휴대폰 메인 화면
  const [landed, setLanded] = useState(false); // 앱을 열면 랜딩을 한 번 보여 준다
  const [consent, setConsent] = useState<string | null>(() => store.get('location')); // 'yes' | 'no' | null
  const [savedLocation, setSavedLocation] = useState<SavedLocation | null>(() => {
    try {
      const v = JSON.parse(store.get('address') ?? 'null');
      return v && typeof v.label === 'string' && v.label.trim() && Number.isFinite(v.lat) && Math.abs(v.lat) <= 90 && Number.isFinite(v.lng) && Math.abs(v.lng) <= 180 ? v : null;
    } catch { return null; }
  });
  const [tab, setTab] = useState<Tab>('home');
  const [profileLocation, setProfileLocation] = useState(false);
  const [journalStart, setJournalStart] = useState<'library' | 'record'>('library');
  const [journalKey, setJournalKey] = useState(0);
  const primaryTab = tab === 'shop' ? 'shop' : ['profile', 'records', 'journal'].includes(tab) ? 'profile' : 'home';
  const [journalFocus, setJournalFocus] = useState(false);
  const screenRef = useRef<HTMLElement>(null);
  useEffect(() => { screenRef.current?.scrollTo(0, 0); }, [tab]);
  const [ch, setCh] = useState<Character | null>(null);
  const [scarfPreference, setScarfPreference] = useState<boolean | null>(() => {
    try { const saved = localStorage.getItem(scarfStorageKey()); return saved === 'true' ? true : saved === 'false' ? false : null; }
    catch { return null; }
  });
  const [equipBusy, setEquipBusy] = useState(false);
  const equipping = useRef(false);
  const scarf = !!ch?.allItems.some((i) => i.id === 'scarf' && i.unlocked) && (scarfPreference ?? ch?.equipped === 'scarf');

  function saveScarf(value: boolean) {
    setScarfPreference(value);
    try { localStorage.setItem(scarfStorageKey(), String(value)); } catch {}
  }

  async function equipItem(id: string | null) {
    if (equipping.current || !ch) return;
    if (id && !ch.allItems.some((i) => i.id === id && i.unlocked)) return;
    equipping.current = true;
    setEquipBusy(true);
    try {
      const { head: nextHead, scarf: nextScarf } = nextOutfit(ch.equipped, scarf, id);
      // 서버의 단일 착용 슬롯은 머리 아이템에 사용하고, 목도리는 브라우저에 별도로 저장한다.
      if (ch.equipped !== nextHead) {
        const r = await api.equip(nextHead);
        if (r.code !== 200) return notify(r.error ?? '아이템을 바꾸지 못했어. 다시 해 줄래?');
        setCh((previous) => previous ? { ...previous, equipped: nextHead } : previous);
      }
      saveScarf(nextScarf);
    } finally {
      equipping.current = false;
      setEquipBusy(false);
    }
  }
  const [active, setActive] = useState<Booking | null>(null);
  const [records, setRecords] = useState<RecordsData | null>(null);
  const [explore, setExplore] = useState<Item[] | null>(null);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState('');
  const [exploreError, setExploreError] = useState('');
  const [checkin, setCheckin] = useState<{ id: number | null; reply: string; suggestPostpone: boolean } | null>(null);
  const [cond, setCond] = useState<Conditions | null>(null);
  const [recs, setRecs] = useState<{ items: Item[]; free: FreeRec[]; widened: boolean; seen: string[] } | null>(null);
  const [confirm, setConfirm] = useState<Item | null>(null);
  const [requested, setRequested] = useState<Booking | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [party, setParty] = useState<PartyResult | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [safety, setSafety] = useState(false);
  const [toast, setToast] = useState('');
  const [refreshLoading, setRefreshLoading] = useState(true);
  const [refreshError, setRefreshError] = useState('');
  const [chatRetry, setChatRetry] = useState<string | null>(null);
  const exploreRequest = useRef(0);
  const recordsRequest = useRef(0);

  const notify = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(''), 3200);
  };
  // 안전 모드에 들어가면 추천·예약·게임 요소를 모두 치운다
  const enterSafety = () => {
    setSafety(true);
    setSheet(null);
    setParty(null);
    setRecs(null);
    setConfirm(null);
    setRequested(null);
  };

  const refresh = useCallback(async () => {
    setRefreshLoading(true);
    setRefreshError('');
    const [c, a] = await Promise.all([api.character(), api.active()]);
    if (c.code === 200) {
      setCh(c);
      if (c.safeMode) enterSafety(); // 새로고침해도 안전 모드 유지 (서버에 저장)
    }
    if (a.code === 200) setActive(a.booking);
    if (c.code !== 200 || a.code !== 200) setRefreshError('무무와 예약 정보를 불러오지 못했어. 연결을 확인하고 다시 해 줘.');
    setRefreshLoading(false);
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  // 데스크톱에서는 휴대폰 모형을 맞추고, 모바일에서는 실제 화면 크기를 쓴다.
  const fit = useAppViewport();

  // 위치는 동의한 경우에만, 추천·체험 목록을 볼 때만 읽는다
  const position = (): Promise<LatLng | null> => savedLocation ? Promise.resolve({ lat: savedLocation.lat, lng: savedLocation.lng }) : (consent === 'yes' ? getPos() : Promise.resolve(null));

  function changeLocation(value: SavedLocation | null) {
    exploreRequest.current += 1;
    setSavedLocation(value);
    store.set('address', JSON.stringify(value));
    setExplore(null);
    setExploreError('');
    setRecs(null);
    setConfirm(null);
    // 장소가 바뀌면 대화도 새로: 이전 동네에서 읽은 조건·이미 본 체험을 끌고 가지 않는다
    setMsgs([GREETING]);
    setSessionId(null);
    if (value && !consent) answerConsent(false);
  }

  const locationPicker = <LocationPicker value={savedLocation} fallback={consent === 'yes' ? '현재 위치 기준' : '기본 동네 기준'} onChange={changeLocation} />;

  async function loadRecords() {
    const request = ++recordsRequest.current;
    setRecordsLoading(true);
    setRecordsError('');
    const r = await api.records();
    if (request !== recordsRequest.current) return;
    if (r.code === 200) setRecords(r);
    else setRecordsError(r.error ?? '기록을 불러오지 못했어. 다시 해 줄래?');
    setRecordsLoading(false);
  }

  useEffect(() => {
    if (tab === 'records' || tab === 'profile') loadRecords();

  }, [tab, savedLocation]);

  async function recommend(c: Conditions, seen: string[]) {
    if (!checkin?.id) return notify('마음 확인을 다시 해 줄래?');
    setBusy(true);
    const r = await api.recommend({ checkinId: checkin.id, ...c, exclude: seen, ...(await position()) });
    setBusy(false);
    if (r.blocked) return enterSafety();
    if (r.code !== 200) return notify(r.error ?? '지금은 고르기가 어렵네. 조금 있다가 다시 해 줘.');
    const items = r.items ?? [];
    const free = r.free ?? [];
    setCond(c);
    setSheet(null);
    setRecs({ items, free, widened: !!r.widened, seen: [...seen, ...items.map((i) => i.id)] });
  }

  async function book(item: Item, slot: string | null) {
    setBusy(true);
    // 실시간 가게는 체험 DB에 없어서 가게 이름·좌표(공개 정보)를 같이 보낸다. 제목·종류는 서버가 정한다
    const r = await api.book({
      checkinId: checkin?.id ?? null,
      experienceId: item.id,
      ...(item.live ? { placeName: item.placeName, lat: item.lat, lng: item.lng } : { slotTime: slot ?? undefined }),
    });
    setBusy(false);
    if (r.blocked) return enterSafety();
    if (r.code !== 200) return notify(r.error ?? '가기로 한 체험을 기록하지 못했어.');
    setConfirm(null);
    setRecs(null);
    setRequested(r);
    setActive(r);
  }

  async function complete(b: Booking, mood: number) {
    setBusy(true);
    const r = await api.complete(b.id, mood);
    setBusy(false);
    if (r.blocked) return enterSafety();
    if (!r.done) return notify(r.error ?? '기록하지 못했어. 다시 해 줄래?');
    setSheet(null);
    setParty(r);
    refresh();
  }

  async function postpone(task: string) {
    setBusy(true);
    const r = await api.postpone(task);
    setBusy(false);
    if (r.code !== 200) return notify(r.error ?? '다시 해 줄래?');
    setSheet(null);
    setParty(r);
    refresh();
  }

  async function send(text: string, retry = false) {
    if (busy || !text.trim()) return;
    setBusy(true);
    setChatRetry(null);
    if (!retry) setMsgs((m) => [...m, { who: 'me', text }]);
    const r = await sendTalk(sessionId, text, await position());
    setBusy(false);
    if (r.action === 'safety' || r.state === 'SAFETY' || (!r.reply && CRISIS.test(text.replace(/\s+/g, '')))) return enterSafety();
    if (r.code !== 200 || !r.reply) {
      setChatRetry(text);
      return;
    }
    if (r.sessionId) setSessionId(r.sessionId);
    setMsgs((m) => [...m, { who: 'bunny', text: (r.reply ?? '').replace(/무드패스|토끼/g, '무무'), offer: r.action === 'recommend' && r.items?.length ? { items: r.items, assumptions: r.assumptions } : undefined, quickReplies: r.quickReplies, support: r.support }]);
  }

  async function backFromSafety() {
    const r = await api.resumeSafety();
    if (r.code !== 200) return notify(r.error ?? '연결을 확인하고 다시 눌러 줘.');
    setSafety(false);
    setLaunched(true);
    setLanded(true);
    setTab('talk');
    setMsgs((m) => [...m, { who: 'bunny', text: '돌아와 줘서 고마워. 하고 싶은 얘기가 있으면 천천히 해 줘.' }]);
  }

  function answerConsent(yes: boolean) {
    const v = yes ? 'yes' : 'no';
    store.set('location', v);
    setConsent(v);
    if (yes && !savedLocation) getPos(); // 저장한 주소가 없을 때만 브라우저 위치 권한을 요청
  }

  // 홈 탭 안의 흐름: 마음 확인 → 추천 → 예약 확인 → 요청 완료
  const homeScreen = requested ? (
    <Requested booking={requested} ch={ch} onHome={() => setRequested(null)} />
  ) : confirm ? (
    <Confirm item={confirm} busy={busy} onBack={() => setConfirm(null)} onBook={(slot) => book(confirm, slot)} />
  ) : recs ? (
    <Recs items={recs.items} free={recs.free} widened={recs.widened} busy={busy} onPick={setConfirm} onMore={() => cond && recommend(cond, recs.seen)} onBack={() => setRecs(null)} />
  ) : (
    <Home ch={ch} onTalk={() => setTab('talk')} />
  );

  return (
    <MumuGrowthContext.Provider value={ch?.exp ?? null}><OutfitContext.Provider value={{ scarf }}><div className="stage">
      <div className="phone" style={{ transform: `scale(${fit})` }}>
        <div className="frame">
          {safety ? (
            <Safety onBack={backFromSafety} />
          ) : !launched ? (
            <Launcher stage={ch?.stage ?? 1} onOpen={() => setLaunched(true)} />
          ) : !landed ? (
            <Landing onStart={() => setLanded(true)} />
          ) : !consent ? (
            <LocationConsent onAnswer={answerConsent} location={locationPicker} />
          ) : (
            <div className="app">
              <main className="screen" ref={screenRef}>
                {tab !== 'journal' && (refreshLoading || refreshError) && <div className="page"><LoadState loading={refreshLoading} message={refreshError || '무무와 예약 정보를 불러오는 중이야…'} onRetry={refresh} /></div>}
                {tab === 'explore' && <button className="btn text" onClick={() => setTab('talk')}>‹ 무무와 대화로</button>}
                {tab === 'shop' && <MumuShop ch={ch} />}
                {tab === 'profile' && <div className="page mumu-profile"><h1 className="title">마이페이지</h1>
                  {profileLocation ? <><button className="btn text" onClick={() => setProfileLocation(false)}>‹ 마이페이지로</button><h2 className="label">현재 내 장소</h2>{locationPicker}</> : <>
                    <div className="card mumu-profile-hero"><Bunny size={110} stage={ch?.stage ?? 1} layerScarf item={ch?.equipped ?? null} /><div><h2>무무와 나의 하루 ♡</h2><p>작은 경험이 쌓이는 나만의 공간</p></div></div>
                    <ActiveExperience active={active} onComplete={b => setSheet({ kind: 'complete', booking: b })} onArrivalConfirmed={refresh} onCancel={async b => { const r = await api.cancel(b.id); if (r.code !== 200) return notify(r.error ?? '취소하지 못했어.'); refresh(); }} />
                    <section className="card"><h2 className="label">도감</h2><div className="row two"><button className="btn" onClick={() => { setJournalStart('record'); setJournalKey(k => k + 1); setTab('journal'); }}>＋ 새 도감 만들기</button><button className="btn ghost" onClick={() => { setJournalStart('library'); setJournalKey(k => k + 1); setTab('journal'); }}>▤ 도감 내역</button></div></section>
                    <button className="btn text" onClick={() => setSheet({ kind: 'postpone' })}>오늘 할 일 하나 미루기</button>
                    <button className="card mumu-profile-link" onClick={() => setTab('records')}><span className="eyebrow">♡ 기분 기록</span><strong>지금까지 쌓아온 나의 마음</strong><span className="meta">이번 주 기분과 다녀온 체험 보기 ›</span></button>
                    <button className="card mumu-profile-link" onClick={() => setProfileLocation(true)}><span className="eyebrow">📍 현재 내 장소</span><strong>{savedLocation?.label ?? (consent === 'yes' ? '현재 위치 기준' : '기본 동네 기준')}</strong><span className="meta">장소 확인하고 바꾸기 ›</span></button>
                  </>}
                </div>}
                {tab === 'records' && <button className="btn text" onClick={() => setTab('profile')}>‹ 마이페이지로</button>}
                <div className="home-host" hidden={tab !== 'home'}>{homeScreen}</div>
                {tab === 'explore' &&
                  (confirm ? (
                    <Confirm item={confirm} busy={busy} onBack={() => setConfirm(null)} onBook={(slot) => book(confirm, slot).then(() => setTab('home'))} />
                  ) : (
                    <Explore items={explore} error={exploreError} onRetry={() => setTab('talk')} onPick={setConfirm}
                      freePlaces={<FreePlaces position={position} locationKey={JSON.stringify(savedLocation) + consent} />} />
                  ))}
                {tab === 'records' && (
                  recordsLoading || recordsError ? (
                    <div className="page">
                      <LoadState loading={recordsLoading} message={recordsError || '마음 기록을 불러오는 중이야…'} onRetry={loadRecords} />
                    </div>
                  ) : <Records
                    ch={ch}
                    data={records}
                    equipBusy={equipBusy}
                    onEquip={equipItem}
                    onDelete={async () => {
                      const r = await api.deleteRecords();
                      if (r.code !== 200) return notify(r.error ?? '기록을 지우지 못했어. 다시 해 줄래?');
                      setMsgs([GREETING]);
                      setSessionId(null);
                      await loadRecords();
                      notify('기록을 모두 지웠어.');
                    }}
                  />
                )}
                <div className={`journal-host${journalFocus ? ' is-focused' : ''}`} hidden={tab !== 'journal'}><Journal key={journalKey} initialStep={journalStart} onExit={() => setTab('profile')} onFocusChange={setJournalFocus} /></div>
                {tab === 'talk' && <Chat onExperiences={(items) => { setExplore(items); setConfirm(null); setTab('explore'); }} onBack={() => setTab('home')} msgs={msgs} busy={busy} onSend={send} retry={!!chatRetry} onRetry={() => chatRetry && send(chatRetry, true)} />}
              </main>
              {!(tab === 'journal' && journalFocus) && <nav className="tabs" aria-label="메뉴">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    className={primaryTab === t.id ? 'on' : ''}
                    aria-current={primaryTab === t.id}
                    onClick={() => {
                      setConfirm(null);
                      setTab(t.id);
                    }}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d={t.icon} />
                    </svg>
                    {t.label}
                  </button>
                ))}
              </nav>}
              {!(tab === 'journal' && journalFocus) && <button className="home-bar" aria-label="휴대폰 메인 화면으로" onClick={() => setLaunched(false)} />}
              {sheet?.kind === 'conditions' && checkin && (
                <ConditionSheet
                  location={<p className="notice">📍 {savedLocation?.label ?? '설정된 동네'} · 장소 변경은 마이페이지에서</p>}
                  reply={checkin.reply}
                  suggestPostpone={checkin.suggestPostpone}
                  busy={busy}
                  onSubmit={(c) => recommend(c, [])}
                  onPostpone={() => setSheet({ kind: 'postpone' })}
                  onClose={() => setSheet(null)}
                />
              )}
              {sheet?.kind === 'postpone' && <PostponeSheet busy={busy} onSubmit={postpone} onClose={() => setSheet(null)} />}
              {sheet?.kind === 'complete' && <CompleteSheet booking={sheet.booking} busy={busy} onDone={(m) => complete(sheet.booking, m)} onClose={() => setSheet(null)} />}
              {party && <Party result={party} ch={ch} onClose={() => setParty(null)} />}
              {toast && (
                <div className="toast" role="status">
                  {toast}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div></OutfitContext.Provider></MumuGrowthContext.Provider>
  );
}
