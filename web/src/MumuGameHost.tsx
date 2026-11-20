import motion from './assets/mumu/motion-game-host.gif';

export const GAME_HOST_MOTION_MS = 1440;

export default function MumuGameHost({ className = '' }: { className?: string }) {
  return <div className={`game-host ${className}`}>
    <img src={motion} alt="" draggable={false} />
  </div>;
}
