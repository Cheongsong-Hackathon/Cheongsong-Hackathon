import { useCallback, useEffect, useState } from 'react';
import { api, getPos, type Booking, type Character, type Item, type LatLng, type Records as RecordsData } from './api';
import Chat, { type Msg } from './Chat';
import Launcher from './Launcher';
import {
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
  type CheckinForm,
  type Conditions,
  type PartyResult,
} from './screens';

type Tab = 'home' | 'explore' | 'records' | 'talk';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: '홈', icon: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z' },
  { id: 'explore', label: '체험', icon: 'M12 3l2.6 5.6L20 9.3l-4 4 1 5.7-5-2.8-5 2.8 1-5.7-4-4 5.4-.7z' },
  { id: 'records', label: '기록', icon: 'M6 3h12v18l-6-4-6 4z' },
  { id: 'talk', label: '속마음', icon: 'M4 5h16v11H9l-5 4z' },
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
const GREETING: Msg = { who: 'bunny', text: '여기선 아무 얘기나 해도 돼. 오늘 마음에 걸리는 거 있어?' };

type Sheet = { kind: 'conditions' } | { kind: 'postpone' } | { kind: 'complete'; booking: Booking } | null;

export default function App() {
  const [launched, setLaunched] = useState(false); // false면 휴대폰 메인 화면
  const [landed, setLanded] = useState(false); // 앱을 열면 랜딩을 한 번 보여 준다
  const [consent, setConsent] = useState<string | null>(() => store.get('location')); // 'yes' | 'no' | null
  const [tab, setTab] = useState<Tab>('home');
  const [ch, setCh] = useState<Character | null>(null);
  const [active, setActive] = useState<Booking | null>(null);
  const [records, setRecords] = useState<RecordsData | null>(null);
  const [explore, setExplore] = useState<Item[] | null>(null);
  const [checkin, setCheckin] = useState<{ id: number | null; reply: string; suggestPostpone: boolean } | null>(null);
  const [cond, setCond] = useState<Conditions | null>(null);
  const [recs, setRecs] = useState<{ items: Item[]; widened: boolean; seen: string[] } | null>(null);
  const [confirm, setConfirm] = useState<Item | null>(null);
  const [requested, setRequested] = useState<Booking | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [party, setParty] = useState<PartyResult | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [safety, setSafety] = useState(false);
  const [toast, setToast] = useState('');

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
    const [c, a] = await Promise.all([api.character(), api.active()]);
    if (c.code === 200) {
      setCh(c);
      if (c.safeMode) enterSafety(); // 새로고침해도 안전 모드 유지 (서버에 저장)
    }
    if (a.code === 200) setActive(a.booking);
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  // 휴대폰 테두리를 항상 보여 주고, 화면이 작으면 통째로 줄여서 맞춘다
  const [fit, setFit] = useState(1);
  useEffect(() => {
    const onResize = () => setFit(Math.min(1, (window.innerWidth - 12) / 416, (window.innerHeight - 12) / 870));
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // 위치는 동의한 경우에만, 추천·체험 목록을 볼 때만 읽는다
  const position = (): Promise<LatLng | null> => (consent === 'yes' ? getPos() : Promise.resolve(null));

  useEffect(() => {
    if (tab === 'records') api.records().then((r) => r.code === 200 && setRecords(r));
    if (tab === 'explore' && !explore) position().then((pos) => api.experiences(pos)).then((r) => setExplore(r.items ?? []));
  }, [tab]);

  async function submitCheckin(f: CheckinForm) {
    setBusy(true);
    const r = await api.checkin(f);
    setBusy(false);
    // 서버에 닿지 못해도 위기 표현은 놓치지 않는다
    if (r.state === 'SAFETY' || (r.code === 0 && CRISIS.test(f.text.replace(/\s+/g, '')))) return enterSafety();
    if (!r.reply) return notify(r.error ?? '잠깐 문제가 생겼어. 다시 해 줄래?');
    setCheckin({ id: r.checkinId, reply: r.reply, suggestPostpone: !!r.suggestPostpone });
    setSheet({ kind: 'conditions' });
  }

  async function recommend(c: Conditions, seen: string[]) {
    if (!checkin?.id) return notify('마음 확인을 다시 해 줄래?');
    setBusy(true);
    const r = await api.recommend({ checkinId: checkin.id, ...c, exclude: seen, ...(await position()) });
    setBusy(false);
    if (r.blocked) return enterSafety();
    if (!r.items?.length) return notify(r.error ?? '지금은 고르기가 어렵네. 조금 있다가 다시 해 줘.');
    setCond(c);
    setSheet(null);
    setRecs({ items: r.items, widened: !!r.widened, seen: [...seen, ...r.items.map((i) => i.id)] });
  }

  async function book(item: Item, slot: string) {
    setBusy(true);
    const r = await api.book({ checkinId: checkin?.id ?? null, experienceId: item.id, slotTime: slot });
    setBusy(false);
    if (r.blocked) return enterSafety();
    if (r.code !== 200) return notify(r.error ?? '예약 요청을 보내지 못했어.');
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

  async function send(text: string) {
    if (busy || !text.trim()) return;
    setBusy(true);
    setMsgs((m) => [...m, { who: 'me', text }]);
    const r = await api.chat(sessionId, text);
    setBusy(false);
    if (r.state === 'SAFETY' || (!r.reply && CRISIS.test(text.replace(/\s+/g, '')))) return enterSafety();
    if (r.sessionId) setSessionId(r.sessionId);
    setMsgs((m) => [...m, { who: 'bunny', text: r.reply || r.error || '잠깐 생각이 느려졌어. 다시 말해 줄래?' }]);
  }

  async function backFromSafety() {
    await api.resumeSafety();
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
    if (yes) getPos(); // 이 순간에 브라우저 권한 창을 띄운다
  }

  // 홈 탭 안의 흐름: 마음 확인 → 추천 → 예약 확인 → 요청 완료
  const homeScreen = requested ? (
    <Requested booking={requested} ch={ch} onHome={() => setRequested(null)} />
  ) : confirm ? (
    <Confirm item={confirm} busy={busy} onBack={() => setConfirm(null)} onBook={(slot) => book(confirm, slot)} />
  ) : recs ? (
    <Recs items={recs.items} widened={recs.widened} busy={busy} onPick={setConfirm} onMore={() => cond && recommend(cond, recs.seen)} onBack={() => setRecs(null)} />
  ) : (
    <Home
      ch={ch}
      active={active}
      busy={busy}
      onSubmit={submitCheckin}
      onComplete={(b) => setSheet({ kind: 'complete', booking: b })}
      onCancel={async (b) => {
        await api.cancel(b.id);
        refresh();
      }}
      onPostpone={() => setSheet({ kind: 'postpone' })}
    />
  );

  return (
    <div className="stage">
      <div className="phone" style={{ transform: `scale(${fit})` }}>
        <div className="frame">
          {safety ? (
            <Safety onBack={backFromSafety} />
          ) : !launched ? (
            <Launcher onOpen={() => setLaunched(true)} />
          ) : !landed ? (
            <Landing onStart={() => setLanded(true)} />
          ) : !consent ? (
            <LocationConsent onAnswer={answerConsent} />
          ) : (
            <div className="app">
              <main className="screen">
                {tab === 'home' && homeScreen}
                {tab === 'explore' &&
                  (confirm ? (
                    <Confirm item={confirm} busy={busy} onBack={() => setConfirm(null)} onBook={(slot) => book(confirm, slot).then(() => setTab('home'))} />
                  ) : (
                    <Explore items={explore} onPick={setConfirm} />
                  ))}
                {tab === 'records' && (
                  <Records
                    ch={ch}
                    data={records}
                    onEquip={async (id) => {
                      const r = await api.equip(id);
                      if (r.code !== 200) notify(r.error ?? '바꾸지 못했어.');
                      refresh();
                    }}
                    onDelete={async () => {
                      await api.deleteRecords();
                      setMsgs([GREETING]);
                      setSessionId(null);
                      setRecords((await api.records()) ?? null);
                      notify('기록을 모두 지웠어.');
                    }}
                  />
                )}
                {tab === 'talk' && <Chat msgs={msgs} busy={busy} onSend={send} />}
              </main>
              <nav className="tabs" aria-label="메뉴">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    className={tab === t.id ? 'on' : ''}
                    aria-current={tab === t.id}
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
              </nav>
              <button className="home-bar" aria-label="휴대폰 메인 화면으로" onClick={() => setLaunched(false)} />
              {sheet?.kind === 'conditions' && checkin && (
                <ConditionSheet
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
    </div>
  );
}
