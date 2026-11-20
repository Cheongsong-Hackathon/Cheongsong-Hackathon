import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { PhoneStatus } from './MumuWelcome';
import happy from './assets/mumu/mood-happy.webp';
import homePortrait from './assets/mumu/home.webp';
import pet from './assets/mumu/motion-pet.webp';
import snack from './assets/mumu/motion-snack.webp';
import celebrate from './assets/mumu/motion-hearts.webp';
import spinMotion from './assets/mumu/motion-spin.webp';
import { gameCards, type MumuGame } from './MumuGames';
import MumuCoin from './MumuCoin';

type Props = {
  hearts: number;
  onHeart: () => void;
  onGame: (game: MumuGame) => void;
  onVoice?: () => void;
  onWardrobe: () => void;
};

function Hearts({ value }: { value: number }) {
  return <span className="room-hearts" aria-label={`하트 ${value}개`}>💗 {value.toLocaleString('ko-KR')}</span>;
}

const motions = {
  pet: { src: pet, duration: 1350, line: '쓰다듬어줘서 좋아!' },
  spin: { src: spinMotion, duration: 990, line: '빙글빙글 돌아요!' },
  snack: { src: snack, duration: 1530, line: '간식 고마워!' },
  reward: { src: celebrate, duration: 1260, line: '무무가 하트를 보냈어요!' },
};
type Action = 'pet' | 'spin' | 'snack';
type Gesture = {
  id: number; x: number; y: number; angle: number; turn: number; distance: number;
  centerX: number; centerY: number; mouthX: number; mouthY: number; mouthRadius: number;
};

export default function MumuPlay({ hearts, onHeart, onGame, onVoice, onWardrobe }: Props) {
  const [reaction, setReaction] = useState<{ kind: keyof typeof motions; replay: number; ready: boolean } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const gesture = useRef<Gesture | null>(null);
  const spinCount = useRef(0);
  const replay = useRef(0);
  const motion = reaction && motions[reaction.kind];

  function play(kind: Action) {
    if (kind === 'spin') spinCount.current = spinCount.current % 5 + 1;
    setReaction({ kind, replay: ++replay.current, ready: false });
    onHeart();
  }

  useEffect(() => {
    if (!reaction?.ready) return;
    const timer = window.setTimeout(() => {
      if (reaction.kind === 'spin' && spinCount.current === 5) {
        setReaction({ kind: 'reward', replay: ++replay.current, ready: false });
      } else {
        setReaction(null);
      }
    }, motions[reaction.kind].duration);
    return () => window.clearTimeout(timer);
  }, [reaction]);

  function startGesture(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !event.isPrimary) return;
    const box = event.currentTarget.getBoundingClientRect();
    const imageHeight = Math.min(box.height, box.width * 6395 / 5555);
    const imageWidth = imageHeight * 5555 / 6395;
    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;
    gesture.current = {
      id: event.pointerId, x: event.clientX, y: event.clientY, turn: 0, distance: 0,
      angle: Math.atan2(event.clientY - centerY, event.clientX - centerX),
      centerX, centerY, mouthX: centerX + imageWidth * .11,
      mouthY: centerY - imageHeight * .01, mouthRadius: Math.max(13, imageWidth * .09),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function trackGesture(event: PointerEvent<HTMLButtonElement>) {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    const dx = event.clientX - g.centerX;
    const dy = event.clientY - g.centerY;
    g.distance += Math.hypot(event.clientX - g.x, event.clientY - g.y);
    const angle = Math.atan2(dy, dx);
    // Ignore jumps through the center of a straight swipe.
    if (Math.hypot(dx, dy) > 14 && Math.hypot(g.x - g.centerX, g.y - g.centerY) > 14) {
      const delta = angle - g.angle;
      if (Math.abs(delta) < Math.PI * .65 || Math.abs(delta) > Math.PI * 1.35) {
        g.turn += Math.atan2(Math.sin(delta), Math.cos(delta));
      }
    }
    g.angle = angle;
    g.x = event.clientX;
    g.y = event.clientY;
  }

  function endGesture(event: PointerEvent<HTMLButtonElement>) {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    trackGesture(event);
    gesture.current = null;
    const mouth = Math.hypot(event.clientX - g.mouthX, event.clientY - g.mouthY) <= g.mouthRadius;
    if (g.distance > 45 && Math.abs(g.turn) > Math.PI * .82) play('spin');
    else play(g.distance < 9 && mouth ? 'snack' : 'pet');
  }

  return <div className="mumu-room">
    <PhoneStatus />
    <header className="room-play-title"><img src={happy} alt="" /><h1>무무와 함께</h1><MumuCoin /></header>
    <div className="room-switch" aria-label="무무 화면">
      <span aria-current="page">🎮 무무랑 놀기</span>
    </div>
    <header className="room-intro">
      <div><h2>무무와 놀아요!</h2><p id="room-gesture-hint">쓰다듬기 · 원 그리기 · 입 톡 누르기</p></div>
      <Hearts value={hearts} />
    </header>
    <div className="room-scene">
      <div className="room-window" aria-hidden="true" />
      <div className="room-light" aria-hidden="true" />
      <div className="room-shelf" aria-hidden="true" />
      <div className="room-rug" aria-hidden="true" />
      <div className="room-bubble" role="status">{motion?.line ?? '오늘도 놀아줄 거지?'}</div>
      <button className="room-character" type="button" aria-label="무무 쓰다듬기" aria-describedby="room-gesture-hint"
        onPointerDown={startGesture} onPointerMove={trackGesture} onPointerUp={endGesture}
        onLostPointerCapture={() => { gesture.current = null; }}
        onClick={event => { if (event.detail === 0) play('pet'); }}>
        <img key={reaction?.replay ?? 'idle'} src={motion ? `${motion.src}?reaction=${reaction!.replay}` : homePortrait} alt="" draggable={false}
          onLoad={() => setReaction(current => current && current.replay === reaction?.replay ? { ...current, ready: true } : current)}
          onError={() => setReaction(current => current?.replay === reaction?.replay ? null : current)} />
      </button>
      {onVoice && <button className="room-voice" type="button" onClick={onVoice} aria-label="무무와 음성 대화">🎙</button>}
      <div className="room-energy" role="meter" aria-label="기분 에너지" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, 58 + (hearts - 1250) * 10)}>
        <span aria-hidden="true">💗</span>
        <i style={{ height: `${Math.min(100, 58 + (hearts - 1250) * 10)}%` }} />
      </div>
    </div>
    <div className="room-actions">
      <button type="button" onClick={() => play('pet')}><span aria-hidden="true">✋</span>쓰다듬기</button>
      <button type="button" onClick={() => play('spin')}><span aria-hidden="true">⟳</span>돌리기</button>
      <button type="button" onClick={() => play('snack')}><span aria-hidden="true">🍬</span>간식주기</button>
      <button className="room-wardrobe-link" type="button" onClick={onWardrobe}>
        <svg viewBox="0 0 36 36" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 10a4 4 0 1 1 6 3.5l-2 1.5v4l12 7.5a2 2 0 0 1-1 3.7H7a2 2 0 0 1-1-3.7L18 19m9-15v6m-3-3h6"/></svg>
        무무 옷장
      </button>
    </div>
    <section className={`room-game-menu${showAll ? ' is-expanded' : ''}`}>
      <header><h2>무무랑 같이 놀기</h2><button type="button" aria-expanded={showAll} onClick={() => setShowAll(value => !value)}>{showAll ? '접기 ⌃' : '전체보기 ›'}</button></header>
      <div>{gameCards.map(game => <button type="button" key={game.id} onClick={() => onGame(game.id)}>
        <span aria-hidden="true">{game.icon}</span><strong>{game.title}</strong>
      </button>)}</div>
    </section>
  </div>;
}
