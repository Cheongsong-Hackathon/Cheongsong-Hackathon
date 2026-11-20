import { useEffect, useRef, useState } from 'react';
import { PhoneStatus } from './MumuWelcome';
import { api } from './api';
import MumuFortune from './MumuFortune';
import MumuGameHost, { GAME_HOST_MOTION_MS } from './MumuGameHost';
import MumuGameScene from './MumuGameScene';
import tarotCardsMotion from './assets/mumu/motion-tarot.webp';
import balanceReference from './assets/mumu/balance-reference.webp';

export type MumuGame = 'tarot' | 'words' | 'balance' | 'fortune';
export const gameCards = [
  { id: 'tarot', icon: '🃏', title: '오늘의 타로', subtitle: '카드 한 장 뽑기' },
  { id: 'words', icon: '💬', title: '끝말잇기', subtitle: '무무와 단어 대결' },
  { id: 'balance', icon: '⚖️', title: '밸런스 게임', subtitle: '둘 중 하나 고르기' },
  { id: 'fortune', icon: '🔮', title: '무무의 사주풀이', subtitle: '재미로 보는 오늘 운세' },
] as const;

function TarotCard({ name, symbol = '✦' }: { name?: string; symbol?: string }) {
  return <span className={`tarot-card${name ? ' revealed' : ''}`} aria-hidden="true">
    <span>☾</span><b>{symbol}</b><span>{name ?? '✧'}</span>
  </span>;
}

function TarotChoices({ onDraw }: { onDraw: (index: number) => void }) {
  const [motionReady, setMotionReady] = useState(false);
  return <div className={`tarot-cards-stage${motionReady ? ' has-motion' : ''}`}>
    <span className="tarot-cards-motion" aria-hidden="true">
      <img src={tarotCardsMotion} alt="" onLoad={() => setMotionReady(true)} onError={() => setMotionReady(false)} />
    </span>
    <div className="tarot-choices">
      {[0, 1, 2].map(index => <button type="button" key={index} aria-label={`${index + 1}번 타로 카드`} onClick={() => onDraw(index)}><TarotCard /></button>)}
    </div>
  </div>;
}

const tarotDeck = [
  { name: '별 (The Star)', label: 'THE STAR', symbol: '✦', tags: '희망 · 회복 · 새로운 시작', reading: '지금은 지친 마음에 조용히 빛이 들어오는 때예요. 작은 기대 하나부터 다시 키워봐요.', advice: '손에 닿는 따뜻한 차 한 잔으로 오늘을 쉬어가도 좋아요.' },
  { name: '달 (The Moon)', label: 'THE MOON', symbol: '☾', tags: '직관 · 여유 · 돌아보기', reading: '답을 서두르기보다 마음에 떠오르는 생각을 가만히 살펴봐요.', advice: '한 줄 일기를 써 보면 오늘의 마음이 조금 더 선명해질 거예요.' },
  { name: '태양 (The Sun)', label: 'THE SUN', symbol: '☀', tags: '기쁨 · 활력 · 자신감', reading: '작은 즐거움을 미루지 말고 지금 누려 보세요. 그 기분이 다음 한 걸음을 가볍게 해줄 거예요.', advice: '좋아하는 노래를 틀고 햇빛이 드는 곳까지 걸어봐요.' },
];

function GameHeader({ title, hearts, onBack }: { title: string; hearts?: number; onBack: () => void }) {
  return <header className="game-header">
    <button type="button" onClick={onBack} aria-label="놀이방으로 돌아가기">‹</button>
    {hearts === undefined && <MumuGameHost />}
    <h1>{title}</h1>
    {hearts !== undefined && <span className="room-hearts">💗 {hearts.toLocaleString('ko-KR')}</span>}
  </header>;
}

function Tarot({ hearts, onBack }: { hearts: number; onBack: () => void }) {
  const [step, setStep] = useState<'intro' | 'pick' | 'drawing' | 'result'>('intro');
  const [card, setCard] = useState(0);
  const [shareStatus, setShareStatus] = useState('');
  const [offset, setOffset] = useState(() => Math.floor(Math.random() * tarotDeck.length));
  const header = <GameHeader title={step === 'intro' ? '오늘의 타로' : '무무와 타로'} hearts={step === 'intro' ? hearts : undefined} onBack={onBack} />;

  useEffect(() => {
    if (step !== 'drawing') return;
    const timer = window.setTimeout(() => setStep('result'), GAME_HOST_MOTION_MS);
    return () => window.clearTimeout(timer);
  }, [step]);

  function draw(index: number) {
    setCard((index + offset) % tarotDeck.length);
    setShareStatus('');
    setStep(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'result' : 'drawing');
  }
  if (step === 'drawing') return <>
    {header}
    <section className="tarot-drawing" role="status">
      <MumuGameScene theme="tarot">무무가 오늘의 카드를 뽑고 있어요 ✨</MumuGameScene>
      <div className="tarot-reveal"><TarotCard /></div>
    </section>
  </>;
  if (step === 'result') {
    const result = tarotDeck[card];
    return <>
      {header}
      <MumuGameScene theme="tarot" layout="side">짜잔!<br />오늘의 카드는 바로…✨</MumuGameScene>
      <div className="tarot-reveal"><TarotCard name={result.label} symbol={result.symbol} /></div>
      <section className="game-panel tarot-result" aria-live="polite">
        <h2>{result.name}</h2><small>{result.tags}</small><p>{result.reading}</p>
        <aside className="tarot-advice"><div><strong>🌱 무무의 한마디</strong><p>{result.advice}</p></div><MumuGameHost /></aside>
      </section>
      <div className="tarot-result-actions">
        <button className="game-primary" onClick={() => {
          setOffset(Math.floor(Math.random() * tarotDeck.length));
          setStep('pick');
        }}>⟳ 다시 뽑기</button>
        <button type="button" aria-label="타로 결과 공유하기" onClick={async () => {
          const text = `무무와 타로 · ${result.name}\n${result.reading}`;
          try {
            if (navigator.share) await navigator.share({ title: '무무와 타로', text });
            else { await navigator.clipboard.writeText(text); setShareStatus('결과를 복사했어요.'); }
          } catch (error) {
            if (!(error instanceof DOMException && error.name === 'AbortError')) setShareStatus('결과를 공유하지 못했어요.');
          }
        }}>↥</button>
      </div>
      {shareStatus && <small role="status">{shareStatus}</small>}
    </>;
  }
  return <>
    {header}
    <div className={`tarot-entry-content tarot-entry-content--${step}`}>
      <MumuGameScene theme="tarot">
        {step === 'intro' ? <>오늘의 마음을 돌아볼까?<br />카드가 전하는 메시지를 만나봐! 💜</> : <>마음에 드는 카드를<br />한 장 골라봐! 💜</>}
      </MumuGameScene>
      <section className="game-panel tarot-pick">
        <h2>{step === 'intro' ? '카드 한 장을 골라봐!' : '카드 한 장을 골라줘!'}</h2>
        <p>오늘의 기분과 잘 맞는 메시지를 전해줄게.</p>
        <TarotChoices onDraw={draw} />
      </section>
      {step === 'intro' && <>
        <h2 className="game-guide-title">오늘의 타로 가이드</h2>
        <div className="tarot-guide">
          <div>💞<strong>연애</strong><small>마음과 관계의 흐름을 살펴봐요</small></div>
          <div>☁️<strong>기분</strong><small>오늘의 감정과 컨디션을 확인해요</small></div>
          <div>🗓️<strong>하루 조언</strong><small>오늘 하루를 보낼 힌트를 얻어요</small></div>
        </div>
        <aside className="game-panel game-copy tarot-advice"><MumuGameHost /><div><strong>무무의 한마디 ✨</strong><p>카드를 고르면 오늘의 작은 힌트를 들려줄게.</p></div></aside>
      </>}
    </div>
    <button className="game-primary" onClick={() => step === 'intro' ? setStep('pick') : draw(Math.floor(Math.random() * 3))}>{step === 'intro' ? '🃏 카드 뽑기' : '⤨ 랜덤으로 뽑기'}</button>
  </>;
}

const topics = [
  { icon: '💗', name: '연애·관계', choices: [['연애할 때 더 중요한 건?', '항상 연락 잘 되는 사람', '가끔 연락해도 편한 사람'], ['친구를 만난다면?', '오랜 친구 한 명', '새로운 친구 여러 명'], ['서운한 일이 생기면?', '바로 이야기하기', '생각 정리하고 말하기']] },
  { icon: '💼', name: '학교·진로', choices: [['일을 고른다면?', '좋아하는 일', '잘하는 일'], ['팀 프로젝트라면?', '아이디어 내기', '정리하고 발표하기'], ['공부할 때는?', '혼자 집중하기', '친구와 함께하기']] },
  { icon: '🌴', name: '여행·일상', choices: [['떠나고 싶은 여행은?', '푸른 바다가 보이는 곳', '조용한 산속 마을'], ['쉬는 날에는?', '이불 밖은 위험해', '아침부터 산책하기'], ['여행 계획은?', '미리 계획표 만들기', '가서 마음대로 정하기']] },
  { icon: '🍴', name: '음식·취향', choices: [['오늘의 간식은?', '달콤한 케이크', '바삭한 감자튀김'], ['점심에 더 당기는 건?', '따뜻한 국물', '시원한 냉면'], ['하나만 고른다면?', '평생 커피', '평생 차']] },
  { icon: '☁️', name: '상상·만약에', choices: [['하나를 얻는다면?', '하늘 날기', '순간 이동하기'], ['하루 동안 갈 수 있다면?', '과거의 하루', '미래의 하루'], ['말할 수 있다면?', '동물과 대화', '식물과 대화']] },
  { icon: '🎲', name: '랜덤', choices: [] },
];

const moreChoices = [
  [
    ['같이 보내는 저녁은?', '집에서 영화 보기', '밖에서 맛집 찾기'], ['어떤 선물이 좋아?', '직접 쓴 편지', '꼭 필요했던 물건'],
    ['친해지는 계기는?', '취향이 비슷할 때', '함께 새로운 일을 할 때'], ['기념일에는?', '둘만의 작은 이벤트', '평소처럼 편한 데이트'],
    ['위로받고 싶을 때는?', '조용히 들어주는 사람', '함께 해결책을 찾는 사람'], ['여행할 친구는?', '계획이 꼼꼼한 친구', '뭐든 즐기는 친구'],
    ['더 기분 좋은 말은?', '네 편이야', '너라면 할 수 있어'],
  ],
  [
    ['새로운 수업을 고른다면?', '익숙해서 편한 수업', '처음이라 설레는 수업'], ['일하는 공간은?', '조용한 자리', '사람들과 열린 공간'],
    ['프로젝트 마감은?', '일찍 끝내고 여유롭게', '마지막까지 다듬기'], ['편한 피드백은?', '한 번에 자세히 듣기', '조금씩 자주 듣기'],
    ['관심 분야를 넓히려면?', '짧은 강의 여러 개', '한 강의를 깊게 듣기'], ['더 끌리는 역할은?', '전체 방향 정하기', '세부 완성도 높이기'],
    ['오늘 공부 목표는?', '낯선 주제 하나', '익숙한 주제 복습'],
  ],
  [
    ['여행지에서 먹을 건?', '동네 단골집 메뉴', '유명한 대표 메뉴'], ['하루의 기록은?', '사진으로 남기기', '일기로 남기기'],
    ['하루를 시작한다면?', '느긋한 아침 식사', '빠르게 준비하고 외출'], ['창밖에 비가 오면?', '집에서 영화 보기', '우산 들고 카페 가기'],
    ['이동 수단은?', '창밖을 보는 기차', '멈출 수 있는 자동차'], ['여행 숙소는?', '시내의 편리한 호텔', '외곽의 조용한 숙소'],
    ['밤에 더 하고 싶은 건?', '야시장 구경', '숙소에서 별 보기'],
  ],
  [
    ['빵을 하나 고른다면?', '버터 크루아상', '크림이 든 소금빵'], ['디저트는 무슨 맛?', '진한 초콜릿', '상큼한 레몬'],
    ['여름 간식은?', '팥빙수', '과일 아이스크림'], ['토스트에 뭘 올릴까?', '달콤한 딸기잼', '고소한 땅콩버터'],
    ['배달 음식을 고른다면?', '치킨', '피자'], ['식당에서 메뉴는?', '늘 먹던 메뉴', '오늘의 추천 메뉴'],
    ['야식으로 더 당기는 건?', '매콤한 떡볶이', '따뜻한 어묵'],
  ],
  [
    ['하루 동안 특별한 집은?', '바다 아래 집', '구름 위 집'], ['초능력을 하나 더 얻는다면?', '언어를 모두 이해하기', '악기를 모두 연주하기'],
    ['한 번 갈 수 있다면?', '달 기지', '깊은 바닷속'], ['시간을 고른다면?', '하루를 길게 늘리기', '하루를 다시 시작하기'],
    ['만날 수 있다면?', '미래의 나', '어릴 때의 나'], ['평생 함께할 도구는?', '어디든 열리는 문', '무엇이든 나오는 가방'],
    ['꿈속 세계를 고른다면?', '모든 것이 과자로 된 마을', '계절이 하루마다 바뀌는 숲'],
  ],
];

function Balance() {
  const [topic, setTopic] = useState(0);
  const [rounds, setRounds] = useState<string[][]>([]);
  const [votes, setVotes] = useState<number[]>([]);
  const current = rounds[votes.length];
  const usesHeartAndSofa = current === topics[0].choices[0];
  function start() {
    if (topic === topics.length - 1) {
      const pool = topics.flatMap(item => item.choices).concat(moreChoices.flat());
      const mixed = pool.map(choice => ({ choice, order: Math.random() })).sort((a, b) => a.order - b.order);
      setRounds(mixed.slice(0, 10).map(item => item.choice));
    } else {
      setRounds([...topics[topic].choices, ...moreChoices[topic]]);
    }
    setVotes([]);
  }
  if (!rounds.length) return <>
    <MumuGameScene theme="balance">무무랑 밸런스게임 해볼까?<br />둘 중 하나만 골라줘! 💜</MumuGameScene>
    <section className="game-panel balance-settings">
      <h2>🎮 테마 선택하기</h2>
      <div className="balance-topics">{topics.map((item, i) => <button key={item.name} type="button" aria-pressed={topic === i} onClick={() => setTopic(i)}><span aria-hidden="true">{item.icon}</span>{item.name}</button>)}</div>
    </section>
    <button className="game-primary" onClick={start}>▶ 게임 시작하기</button>
  </>;
  return <>
    <div className="balance-progress"><strong>{Math.min(votes.length + 1, rounds.length)} / {rounds.length}</strong><progress max={rounds.length} value={Math.min(votes.length + 1, rounds.length)} /></div>
    {current ? <>
      <section className="game-panel balance-question">
        <small className="balance-theme">{topics[topic].icon} {topics[topic].name}</small>
        <h2>✨ {current[0]} ✨</h2>
        <div>{current.slice(1).map((choice, index) => <button type="button" key={choice} onClick={() => setVotes(previous => [...previous, index])}>
          {usesHeartAndSofa
            ? <span className={`balance-option-art balance-option-art--${index}`} aria-hidden="true"><img src={balanceReference} alt="" /></span>
            : <span className="balance-option-art" aria-hidden="true">{index === 0 ? topics[topic].icon : '🌟'}</span>}
          <strong>{choice}</strong>
        </button>)}</div>
      </section>
      <MumuGameScene theme="balance" layout="side">음~ 너라면<br />어느 쪽이야? 🤔</MumuGameScene>
    </> : <>
      <MumuGameScene theme="balance" layout="side">열 가지 선택 완료! 💜</MumuGameScene>
      <section className="game-panel balance-result"><h2>내 선택 돌아보기</h2><ol>{rounds.map(([question, left, right], index) => <li key={question}>{question} <strong>{votes[index] === 0 ? left : right}</strong></li>)}</ol></section>
      <button className="game-primary" onClick={() => { setRounds([]); setVotes([]); }}>다시 하기</button>
    </>}
  </>;
}

const words = new Set('사과 과자 자전거 거울 울타리 리본 본문 문어 어항 항아리 리어카 카메라 라디오 오리 리듬 듬뿍 자물쇠 쇠고기 기차 차표 표범 범고래 래퍼 퍼즐 즐거움 움막 막대기 기린 린스 스케치 치마 마을 로봇 봇물 물감 감자 자두 두부 부엉이 이불 불꽃 꽃병 병원 원숭이 이슬 슬리퍼 퍼레이드 드럼 럼주 주전자 자동차 차례 절구 구름 구두 두유 유리 리모컨 컨디션 트럭 럭비 비누 누나 나무 무지개 개나리 리코더 더위 위로 로켓 케이크 크레파스 아이스크림 새우 우산 산책 책가방 방울 울음 음악 악기 기분 분홍 홍차 차도 도서관 관람차 수박 박수 수영 영화 화분 분수 수건 건물 물고기 기차역 역전 전구 구멍 멍게 게임 임금 금붕어 어묵 묵사발 발자국 국수 수달 달력 달빛 빛깔 깔때기 여우 바다 다람쥐 쥐꼬리'.split(' '));
const firstLetter = (word: string) => word.charAt(0);
const lastLetter = (word: string) => word.charAt(word.length - 1);

function WordChain() {
  const [mode, setMode] = useState('일반 모드');
  const [limit, setLimit] = useState(0);
  const [level, setLevel] = useState('쉬움');
  const [turns, setTurns] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('');
  const [finished, setFinished] = useState(false);
  const [deadline, setDeadline] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [best, setBest] = useState(0);
  const [busy, setBusy] = useState(false);
  const [next, setNext] = useState<string[]>([]); // 다음에 시작할 글자 (두음법칙 포함, AI 답일 때)
  const log = useRef<HTMLDivElement>(null);
  // 무무가 답한 뒤 입력칸을 다시 누르지 않아도 되게: 생각하는 동안은 readOnly(포커스·키보드 유지), 답이 오면 다시 포커스
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (turns.length && !busy && !finished) input.current?.focus({ preventScroll: true }); }, [turns.length, busy, finished]);
  const streak = Math.floor(turns.length / 2);
  const turnLimit = mode === '스피드 모드' ? (limit || 10) : limit;

  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [turns.length]);

  useEffect(() => {
    if (!deadline || finished) return;
    function update() {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(seconds);
      if (!seconds) { setNotice('시간이 다 됐어! 다시 도전해볼까?'); setFinished(true); }
    }
    update();
    const timer = window.setInterval(update, 250);
    return () => clearInterval(timer);
  }, [deadline, finished]);

  function resetTimer() {
    setRemaining(turnLimit);
    setDeadline(turnLimit ? Date.now() + turnLimit * 1000 : 0);
  }
  // AI가 단어를 확인하고 무무의 답을 고른다(두음법칙 포함). AI가 안 되면 아래 단어 목록(localTurn)으로 대신
  async function submit() {
    if (busy || finished || (deadline && deadline <= Date.now())) return;
    const word = text.trim();
    const left = deadline ? deadline - Date.now() : 0; // 무무가 생각하는 동안은 시간이 흐르지 않게
    // 보내자마자 내 단어를 기록에 먼저 넣고(무무는 "…" 생각 중), 안 되는 단어면 다시 빼고 입력칸에 돌려준다
    setDeadline(0); setBusy(true); setNotice(''); setTurns([...turns, word]); setText('');
    const r = await api.wordChain({ history: turns, word, level });
    setBusy(false);
    if (r.code === 0 || r.code >= 500) { setTurns(turns); setText(word); if (left) setDeadline(Date.now() + left); return localTurn(word); }
    if (!r.ok) { setTurns(turns); setText(word); setNotice(r.reason ?? '다른 단어로 해 볼래?'); if (left) setDeadline(Date.now() + left); return; }
    const used = [...turns, word];
    setBest(value => Math.max(value, Math.floor(used.length / 2)));
    if (!r.reply) { setTurns(used); setFinished(true); setNotice(r.comment || '네가 이겼어!'); return; }
    setTurns([...used, r.reply]); setNext(r.next ?? []); setNotice(r.comment ?? ''); resetTimer();
  }
  function localTurn(word: string) {
    const required = lastLetter(turns[turns.length - 1]);
    if (firstLetter(word) !== required) return setNotice(`‘${required}’로 시작하는 단어를 입력해줘!`);
    if (turns.includes(word)) return setNotice('이미 나온 단어야. 다른 단어를 떠올려봐!');
    if (!words.has(word)) return setNotice('무무가 아는 단어 목록에 없어. 다른 단어를 입력해줘!');
    const used = [...turns, word];
    const unused = [...words].filter(candidate => !used.includes(candidate));
    const replies = unused.filter(candidate => firstLetter(candidate) === lastLetter(word));
    const canContinue = (candidate: string) => unused.some(other => other !== candidate && firstLetter(other) === lastLetter(candidate));
    const reply = level === '어려움' ? replies.find(candidate => !canContinue(candidate)) ?? replies[0] : replies.find(canContinue) ?? replies[0];
    setTurns(reply ? [...used, reply] : used);
    setBest(value => Math.max(value, Math.floor(used.length / 2)));
    setText('');
    if (!reply) { setFinished(true); setNotice('무무가 이어갈 단어를 못 찾았어. 네가 이겼어!'); }
    else if (!canContinue(reply)) { setFinished(true); setNotice('이어갈 단어가 목록에 없어. 다시 도전해볼까?'); }
    else { setNotice(''); resetTimer(); }
  }
  if (!turns.length) return <>
    <MumuGameScene theme="words" tiles>무무랑 끝말잇기 해볼까?<br />무무가 먼저 시작할게! 💜</MumuGameScene>
    <section className="game-panel word-settings">
      <h2>🎮 게임 설정</h2>
      <div><strong><i aria-hidden="true">☷</i>게임 방식</strong><div className="word-settings-options">{['일반 모드', '스피드 모드'].map(value => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)}>{value}</button>)}</div></div>
      <div><strong><i aria-hidden="true">◷</i>제한 시간</strong><div className="word-settings-options">{[0, 10, 5].map(value => <button key={value} type="button" aria-pressed={limit === value} onClick={() => setLimit(value)}>{value ? `${value}초` : '제한 없음'}</button>)}</div></div>
      <div><strong><i aria-hidden="true">▥</i>난이도</strong><div className="word-settings-options">{['쉬움', '보통', '어려움'].map(value => <button key={value} type="button" aria-pressed={level === value} onClick={() => setLevel(value)}>{value}</button>)}</div></div>
    </section>
    <button className="game-primary" onClick={() => { setTurns([level === '보통' ? '바다' : '사과']); resetTimer(); }}>▶ 게임 시작하기</button>
  </>;
  return <>
    <div className="word-score"><span>연속 성공<br /><strong>{streak}개 🔥</strong></span><b>{turnLimit ? remaining : '∞'}</b><span>최고 기록<br /><strong>{best}개 🏆</strong></span></div>
    <MumuGameScene theme="words" layout="side">그럼 내가 먼저 할게!<br /><strong>{turns[0]}!</strong></MumuGameScene>
    <div className="word-log" ref={log} role="log">{turns.map((word, i) => <div key={word} className={i % 2 ? 'mine' : 'mumu'}>{i % 2 === 0 && <MumuGameHost />}<span>{word}!</span></div>)}{busy && <div className="mumu word-thinking" aria-label="무무가 생각하는 중"><MumuGameHost /><span>…</span></div>}</div>
    {notice && <p className="word-notice" role="status">{notice}</p>}
    {finished ? <button className="game-primary" onClick={() => { setTurns([]); setFinished(false); setDeadline(0); setNotice(''); setText(''); setNext([]); }}>다시 시작하기</button>
      : <form className="word-composer" onSubmit={event => { event.preventDefault(); void submit(); }}><input ref={input} aria-label="다음 단어" enterKeyHint="send" autoComplete="off" placeholder={next.length ? `‘${next.join('’이나 ‘')}’로 시작하는 단어…` : '다음 단어를 입력해줘…'} value={text} maxLength={20} readOnly={busy} onChange={event => setText(event.target.value)} /><button type="submit" aria-label="단어 보내기" disabled={busy || !text.trim()}>➤</button></form>}
  </>;
}

export default function MumuGames({ game, hearts, onBack }: { game: MumuGame; hearts: number; onBack: () => void }) {
  const title = { tarot: '오늘의 타로', words: '무무와 끝말잇기', balance: '무무와 밸런스게임', fortune: '무무의 사주풀이' }[game];
  return <div className={`mumu-room mumu-game game-${game}`}>
    <PhoneStatus />
    {game === 'tarot' ? <Tarot hearts={hearts} onBack={onBack} /> : <>
      <GameHeader title={title} onBack={onBack} />
      {game === 'balance' ? <Balance /> : game === 'words' ? <WordChain /> : <MumuFortune />}
    </>}
  </div>;
}
