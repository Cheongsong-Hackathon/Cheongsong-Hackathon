import { useEffect, useState } from 'react';

export type MumuMotion = 'wave' | 'heart' | 'bounce';
const ACTIONS = [
  { id: 'wave', label: '안녕', emoji: '👋' },
  { id: 'heart', label: '하트', emoji: '💜' },
  { id: 'bounce', label: '폴짝', emoji: '✨' },
] as const;

export function useMumuMotion() {
  const [playback, setPlayback] = useState<{ motion: MumuMotion | null; motionKey: number }>({ motion: null, motionKey: 0 });
  useEffect(() => {
    if (!playback.motion) return;
    const timer = window.setTimeout(() => setPlayback(current => ({ ...current, motion: null })), 2400);
    return () => window.clearTimeout(timer);
  }, [playback.motion, playback.motionKey]);
  return { ...playback, play: (motion: MumuMotion) => setPlayback(current => ({ motion, motionKey: current.motionKey + 1 })) };
}

export default function MumuMotionControls({ motion, play }: { motion: MumuMotion | null; play: (motion: MumuMotion) => void }) {
  return <div className="mumu-motion-controls" role="group" aria-label="무무 모션 고르기">
    {ACTIONS.map(action => <button type="button" key={action.id} className={`chip${motion === action.id ? ' on' : ''}`} onClick={() => play(action.id)} aria-label={`${action.label} 모션 재생`}><span aria-hidden="true">{action.emoji}</span> {action.label}</button>)}
  </div>;
}
