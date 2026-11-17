import { useCallback, useEffect, useRef, useState } from 'react';
import { api, getPos, type Character, type Item, type LatLng, type Partner, type Reward, type Run, type VerifyResult } from './api';
import Chat, { type Msg } from './Chat';
import { Home, Partners, Party, Records, RunSheet, Safety } from './screens';

type Tab = 'home' | 'chat' | 'records' | 'partners';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: '홈', icon: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z' },
  { id: 'chat', label: '대화', icon: 'M4 5h16v11H9l-5 4z' },
  { id: 'records', label: '기록', icon: 'M6 3h12v18l-6-4-6 4z' },
  { id: 'partners', label: '제휴 매장', icon: 'M4 9l1-5h14l1 5v2h-1v9H5v-9H4zM9 20v-5h6v5' },
];
const CRISIS = /죽고싶|죽을래|사라지고싶|없어지고싶|자해|자살|살기싫/;
const store = (op: 'get' | 'set', v = '') => {
  try {
    return op === 'get' ? localStorage.getItem('neuri.sessionId') : (localStorage.setItem('neuri.sessionId', v), v);
  } catch {
    return null; // 사생활 보호 모드 등: 저장 없이 동작
  }
};
const GREETING: Msg = { who: 'snail', text: '안녕, 나는 느리야. 천천히 와도 돼. 오늘 기분 어때?' };

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [ch, setCh] = useState<Character | null>(null);
  const [runs, setRuns] = useState<{ active: Run | null; done: Run[] }>({ active: null, done: [] });
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [sessionId, setSessionIdState] = useState<number | null>(() => Number(store('get')) || null);
  const setSessionId = (id: number) => {
    setSessionIdState(id);
    store('set', String(id));
  };
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [quick, setQuick] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [safety, setSafety] = useState(false);
  const [sheet, setSheet] = useState<Run | null>(null);
  const [party, setParty] = useState<VerifyResult | null>(null);
  const [toast, setToast] = useState('');
  const seen = useRef<string[]>([]);
  const recommended = useRef(false);

  const push = (m: Msg) => setMsgs((prev) => [...prev, m]);
  const notify = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(''), 3200);
  };

  // 안전 모드에 들어가면 추천 카드와 진행 중 시트(게임 요소)를 모두 치운다
  const enterSafety = () => {
    setSafety(true);
    setSheet(null);
    setParty(null);
    setQuick([]);
    setMsgs((prev) => prev.filter((m) => m.who !== 'recs'));
    recommended.current = false;
  };

  const refresh = useCallback(async () => {
    const [c, r, w] = await Promise.all([api.character(), api.runs(), api.rewards()]);
    if (!c.error && c.status === 200) setCh(c);
    if (r.done) setRuns({ active: r.active, done: r.done });
    if (w.items) setRewards(w.items);
  }, []);
  useEffect(() => {
    refresh();
    api.partners().then((p) => p.items && setPartners(p.items));
    // 새로고침해도 안전 모드가 유지되게 서버의 세션 상태를 다시 읽는다
    if (sessionId) api.session(sessionId).then((s) => s.state === 'SAFETY' && enterSafety());
  }, [refresh]);

  const demo = ch?.demoMode ?? false;

  async function recommend(sid: number) {
    const r = await api.recommend(sid, demo ? null : await getPos(), seen.current);
    if (r.blocked) return enterSafety();
    if (!r.items?.length) return push({ who: 'snail', text: r.error ?? '지금은 고르기가 어렵네. 조금 있다가 다시 물어봐 줘.' });
    recommended.current = true;
    seen.current.push(...r.items.map((i) => i.templateId));
    push({ who: 'recs', items: r.items, center: r.center ?? null });
  }

  async function send(text: string) {
    if (busy || !text.trim()) return;
    setBusy(true);
    setQuick([]);
    push({ who: 'me', text });
    const r = await api.chat(sessionId, text);
    if (!r.reply) {
      // 서버에 닿지 못해도 위기 표현은 놓치지 않는다
      if (CRISIS.test(text.replace(/\s+/g, ''))) enterSafety();
      else push({ who: 'snail', text: r.error ?? '잠깐 생각이 느려졌어. 다시 말해 줄래?' });
    }
    else {
      if (r.sessionId) setSessionId(r.sessionId);
      if (r.state === 'SAFETY') enterSafety();
      else {
        push({ who: 'snail', text: r.reply });
        setQuick(r.quickReplies ?? []);
        if (r.readyToRecommend && !recommended.current && r.sessionId) await recommend(r.sessionId);
      }
    }
    setBusy(false);
  }

  async function more() {
    if (busy || !sessionId) return;
    setBusy(true);
    await recommend(sessionId);
    setBusy(false);
  }

  async function start(item: Item) {
    if (busy || !sessionId) return;
    setBusy(true);
    // 위치는 집 앞 활동을 시작할 때만 읽는다 (이동 거리 인증용, 끝나면 서버에서 지운다)
    const pos: LatLng | null = item.tier === 'NEAR' && !demo ? await getPos() : null;
    const r = await api.startRun(sessionId, item.templateId, pos);
    setBusy(false);
    if (r.blocked) return enterSafety();
    if (!r.runId) return notify(r.error ?? '시작하지 못했어. 다시 해 볼래?');
    setSheet({ runId: r.runId, title: item.title, tier: item.tier, minutes: item.minutes, exp: item.exp, placeName: item.place?.name });
    refresh();
  }

  function finished(result: VerifyResult) {
    setSheet(null);
    refresh();
    if (result.blocked) return enterSafety();
    if (!result.verified) return notify(result.reason ?? '이번 활동은 닫혔어.');
    setParty(result);
    recommended.current = false; // 다음 대화에서 새로 추천받을 수 있게
    push({ who: 'snail', text: '해냈구나! 정말 대단해. 쉬고 싶으면 푹 쉬어도 돼.' });
  }

  async function backToChat() {
    if (sessionId) await api.resume(sessionId);
    setSafety(false);
    setTab('chat');
    push({ who: 'snail', text: '돌아와 줘서 고마워. 하고 싶은 얘기가 있으면 천천히 해 줘.' });
  }

  return (
    <div className="stage">
      <div className="frame">
        {safety ? (
          <Safety onBack={backToChat} />
        ) : (
          <>
            <main className="screen">
              {tab === 'home' && <Home ch={ch} active={runs.active} onChat={() => setTab('chat')} onOpenRun={setSheet} />}
              {tab === 'chat' && <Chat msgs={msgs} quick={quick} busy={busy} onSend={send} onStart={start} onMore={more} />}
              {tab === 'records' && (
                <Records
                  done={runs.done}
                  rewards={rewards}
                  onRedeem={async (id) => {
                    const r = await api.redeem(id);
                    if (!r.used) notify(r.error ?? '다시 해 볼래?');
                    refresh();
                  }}
                />
              )}
              {tab === 'partners' && <Partners items={partners} />}
            </main>
            <nav className="tabs" aria-label="메뉴">
              {TABS.map((t) => (
                <button key={t.id} className={tab === t.id ? 'on' : ''} aria-current={tab === t.id} onClick={() => setTab(t.id)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d={t.icon} />
                  </svg>
                  {t.label}
                </button>
              ))}
            </nav>
            {sheet && <RunSheet run={sheet} demo={demo} onClose={() => setSheet(null)} onDone={finished} />}
            {party && <Party result={party} ch={ch} onClose={() => setParty(null)} />}
            {toast && (
              <div className="toast" role="status">
                {toast}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
