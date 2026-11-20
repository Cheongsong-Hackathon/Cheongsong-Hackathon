import { useEffect, useRef, useState } from 'react';
import { PhoneStatus } from './MumuWelcome';
import happy from './assets/mumu/mood-happy.png';
import homePortrait from './assets/mumu/home.png';
import pet from './assets/mumu/motion-pet.gif';
import tea from './assets/mumu/motion-tea.gif';
import { gameCards, type MumuGame } from './MumuGames';

type Props = {
  hearts: number;
  onHeart: () => void;
  onPet: () => void;
  onChat: () => void;
  onGame: (game: MumuGame) => void;
};

const actions = [
  { label: '돌리기', icon: '⟳', src: homePortrait, line: '빙글빙글, 한 번 더!', className: 'spin', duration: 750 },
  { label: '간식주기', icon: '🍬', src: tea, line: '간식 고마워!', className: 'snack', duration: 1920 },
] as const;

function Hearts({ value }: { value: number }) {
  return <span className="room-hearts" aria-label={`하트 ${value}개`}>💗 {value.toLocaleString('ko-KR')}</span>;
}

export default function MumuPlay({ hearts, onHeart, onPet, onChat, onGame }: Props) {
  const [reaction, setReaction] = useState<(typeof actions)[number] | null>(null);
  const [replay, setReplay] = useState(0);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    if (!reaction) return;
    const timer = window.setTimeout(() => setReaction(null), reaction.duration);
    return () => clearTimeout(timer);
  }, [reaction, replay]);

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
      <div className="room-bubble" role="status">{reaction?.line ?? '오늘도 놀아줄 거지?'}</div>
      <button className="room-character" type="button" aria-label="무무 쓰다듬기" onClick={onPet}>
        <img key={replay} className={reaction?.className} src={reaction?.className === 'snack' ? `${reaction.src}?reaction=${replay}` : homePortrait} alt="" draggable={false}/>
      </button>
      <div className="room-energy" role="meter" aria-label="기분 에너지" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, 58 + (hearts - 1250) * 10)}>
        <span aria-hidden="true">💗</span>
        <i style={{ height: `${Math.min(100, 58 + (hearts - 1250) * 10)}%` }} />
      </div>
    </div>
    <div className="room-actions">
      <button type="button" onClick={onPet}><span aria-hidden="true">✋</span>쓰다듬기</button>
      {actions.map(action => <button key={action.label} type="button" onClick={() => {
        setReaction(action);
        setReplay(value => value + 1);
        onHeart();
      }}><span aria-hidden="true">{action.icon}</span>{action.label}</button>)}
    </div>
    <section className={`room-game-menu${showAll ? ' is-expanded' : ''}`}>
      <header><h2>무무랑 같이 놀기</h2><button type="button" aria-expanded={showAll} onClick={() => setShowAll(value => !value)}>{showAll ? '접기 ⌃' : '전체보기 ›'}</button></header>
      <div>{gameCards.map(game => <button type="button" key={game.id} onClick={() => onGame(game.id)}>
        <span aria-hidden="true">{game.icon}</span><div><strong>{game.title}</strong><small>{game.subtitle}</small></div>
      </button>)}</div>
    </section>
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
