import motion from './assets/mumu/motion-game-host.webp';

export const GAME_HOST_MOTION_MS = 1260;

export default function MumuGameHost({ className = '' }: { className?: string }) {
  return <div className={`game-host ${className}`}>
    <img src={motion} alt="" draggable={false} />
  </div>;
}
