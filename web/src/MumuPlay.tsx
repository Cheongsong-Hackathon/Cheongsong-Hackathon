import { useEffect, useRef, useState } from 'react';
import { PhoneStatus } from './MumuWelcome';
import happy from './assets/mumu/mood-happy.png';
import homePortrait from './assets/mumu/home.png';
import pet from './assets/mumu/motion-pet.gif';
import snack from './assets/mumu/motion-snack.gif';
import celebrate from './assets/mumu/motion-hearts.gif';
import spinMotion from './assets/mumu/motion-spin.gif';
import { gameCards, type MumuGame } from './MumuGames';

type Props = {
  hearts: number;
  onHeart: () => void;
  onPet: () => void;
  onSpin: () => void;
  onChat: () => void;
  onGame: (game: MumuGame) => void;
};

function Hearts({ value }: { value: number }) {
  return <span className="room-hearts" aria-label={`하트 ${value}개`}>💗 {value.toLocaleString('ko-KR')}</span>;
}

export default function MumuPlay({ hearts, onHeart, onPet, onSpin, onChat, onGame }: Props) {
  const [snacking, setSnacking] = useState(false);
  const [snackReady, setSnackReady] = useState(false);
  const [replay, setReplay] = useState(0);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    if (!snacking || !snackReady) return;
    const timer = window.setTimeout(() => setSnacking(false), 1530);
    return () => clearTimeout(timer);
  }, [snacking, snackReady, replay]);

  return <div className="mumu-room">
    <PhoneStatus />
    <header className="room-play-title"><img src={happy} alt="" /><h1>무무와 함께</h1></header>
    <div className="room-switch" aria-label="무무 화면">
      <button type="button" onClick={onChat}>💬 무무랑 채팅하기</button>
      <span aria-current="page">🎮 무무랑 놀기</span>
    </div>
    <header className="room-intro">
      <div><h2>무무와 놀아요!</h2><p>무무와 교감하며 기분 에너지를 채워보세요!</p></div>
      <Hearts value={hearts} />
    </header>
    <div className="room-scene">
      <div className="room-window" aria-hidden="true" />
      <div className="room-light" aria-hidden="true" />
      <div className="room-shelf" aria-hidden="true" />
      <div className="room-rug" aria-hidden="true" />
      <div className="room-bubble" role="status">{snacking ? '간식 고마워!' : '오늘도 놀아줄 거지?'}</div>
      <button className="room-character" type="button" aria-label="무무 쓰다듬기" onClick={onPet}>
        <img key={`${replay}-${snacking}`} src={snacking ? `${snack}?reaction=${replay}` : homePortrait} alt="" draggable={false}
          onLoad={snacking ? () => setSnackReady(true) : undefined}
          onError={snacking ? () => setSnacking(false) : undefined} />
      </button>
      <div className="room-energy" role="meter" aria-label="기분 에너지" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, 58 + (hearts - 1250) * 10)}>
        <span aria-hidden="true">💗</span>
        <i style={{ height: `${Math.min(100, 58 + (hearts - 1250) * 10)}%` }} />
      </div>
    </div>
    <div className="room-actions">
      <button type="button" onClick={onPet}><span aria-hidden="true">✋</span>쓰다듬기</button>
      <button type="button" onClick={onSpin}><span aria-hidden="true">⟳</span>돌리기</button>
      <button type="button" onClick={() => {
        setSnackReady(false);
        setSnacking(true);
        setReplay(value => value + 1);
        onHeart();
      }}><span aria-hidden="true">🍬</span>간식주기</button>
    </div>
    <section className={`room-game-menu${showAll ? ' is-expanded' : ''}`}>
      <header><h2>무무랑 같이 놀기</h2><button type="button" aria-expanded={showAll} onClick={() => setShowAll(value => !value)}>{showAll ? '접기 ⌃' : '전체보기 ›'}</button></header>
      <div>{gameCards.map(game => <button type="button" key={game.id} onClick={() => onGame(game.id)}>
        <span aria-hidden="true">{game.icon}</span><div><strong>{game.title}</strong><small>{game.subtitle}</small></div>
      </button>)}</div>
    </section>
  </div>;
}

export function MumuSpin({ hearts, onHeart, onBack }: Pick<Props, 'hearts' | 'onHeart'> & { onBack: () => void }) {
  const [count, setCount] = useState(0);
  const [round, setRound] = useState(0);
  const [motionReady, setMotionReady] = useState(false);
  const [phase, setPhase] = useState<'ready' | 'spin' | 'reward'>('ready');

  useEffect(() => {
    if (phase === 'ready' || (phase === 'spin' && !motionReady)) return;
    const timer = window.setTimeout(() => {
      if (phase === 'spin' && count === 5) {
        setPhase('reward');
      } else {
        setPhase('ready');
      }
    }, phase === 'spin' ? 990 : 1260);
    return () => window.clearTimeout(timer);
  }, [count, motionReady, phase]);

  function spin() {
    if (phase !== 'ready') return;
    if (count === 5) setRound(value => value + 1);
    setCount(value => value === 5 ? 1 : value + 1);
    setMotionReady(false);
    setPhase('spin');
    onHeart();
  }

  return <div className="mumu-room mumu-spin">
    <PhoneStatus />
    <header className="pet-header">
      <button type="button" onClick={onBack} aria-label="뒤로 가기">‹</button>
      <h1>무무 돌리기</h1><Hearts value={hearts} />
    </header>
    <p className="pet-hint"><span aria-hidden="true">⟳</span>무무를 돌려서<br />기분을 환기시켜주세요!</p>
    <div className={`spin-stage is-${phase}`}>
      <i aria-hidden="true" /><i aria-hidden="true" /><span aria-hidden="true">✦</span><span aria-hidden="true">✧</span>
      {phase === 'spin' ? <img
        key={`${round}-${count}`}
        src={`${spinMotion}?play=${round * 5 + count}`}
        alt="돌고 있는 무무"
        draggable={false}
        onLoad={() => setMotionReady(true)}
        onError={() => setMotionReady(true)}
      /> : <img src={phase === 'reward' ? `${celebrate}?spin-round=${round}` : happy} alt="웃고 있는 무무" draggable={false} />}
    </div>
    <button className="spin-button" type="button" onClick={spin} disabled={phase !== 'ready'}><span aria-hidden="true">⟳</span>돌리기!</button>
    <p className="spin-note" role="status">{count === 5 && phase !== 'spin' ? '🎁 무무가 하트를 보냈어요!' : '🎮 5번 돌리면 무무가 특별한 반응을 해요! 💜'}</p>
    <div className="spin-progress" role="progressbar" aria-label="돌리기 진행도" aria-valuemin={0} aria-valuemax={5} aria-valuenow={count}>
      <strong>{count} / 5회</strong>
      {[0, 1, 2, 3, 4].map(dot => <i key={dot} className={dot < count ? 'filled' : ''} />)}
      <span aria-hidden="true">🎁</span>
    </div>
  </div>;
}

export function MumuPet({ hearts, onHeart, onBack }: Pick<Props, 'hearts' | 'onHeart'> & { onBack: () => void }) {
  const [progress, setProgress] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [reacting, setReacting] = useState(false);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!reacting) return;
    const timer = window.setTimeout(() => setReacting(false), 1350);
    return () => clearTimeout(timer);
  }, [cycle, reacting]);

  function stroke() {
    setProgress(value => (value + 1) % 5);
    setCycle(value => value + 1);
    setReacting(true);
    onHeart();
  }

  return <div className="mumu-room mumu-pet">
    <PhoneStatus />
    <header className="pet-header">
      <button type="button" onClick={onBack} aria-label="뒤로 가기">‹</button>
      <h1>무무 쓰다듬기</h1>
      <Hearts value={hearts} />
    </header>
    <p className="pet-hint"><span aria-hidden="true">✋</span>무무의 머리를<br />부드럽게 쓰다듬어주세요!</p>
    <button
      className="pet-character"
      type="button"
      aria-label="무무 머리 쓰다듬기"
      onPointerDown={event => {
        swipe.current = { x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        const start = swipe.current;
        if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) < 26) return;
        swipe.current = null;
        stroke();
      }}
      onPointerCancel={() => { swipe.current = null; }}
      onClick={event => {
        if (event.detail === 0 || swipe.current) stroke();
        swipe.current = null;
      }}
    >
      <img key={cycle} src={reacting ? `${pet}?stroke=${cycle}` : happy} alt="" draggable={false} />
      {!reacting && <span className="pet-hand" aria-hidden="true">✋</span>}
    </button>
    <div className="pet-progress" role="progressbar" aria-label="쓰다듬기 진행도" aria-valuemin={0} aria-valuemax={4} aria-valuenow={progress}>
      <span aria-hidden="true">💗</span>{[0, 1, 2, 3].map(step => <i key={step} className={step < progress ? 'filled' : ''} />)}
    </div>
  </div>;
}
