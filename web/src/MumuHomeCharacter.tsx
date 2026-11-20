import { useCallback, useEffect, useState } from 'react';
import defaultPortrait from './assets/mumu/home.webp';
import tiredPortrait from './assets/mumu/mood-tired.webp';
import sadPortrait from './assets/mumu/mood-sad.webp';
import frustratedPortrait from './assets/mumu/mood-frustrated.webp';
import boredPortrait from './assets/mumu/mood-bored.webp';
import happyPortrait from './assets/mumu/mood-happy.webp';
import neutralPortrait from './assets/mumu/mood-neutral.webp';
import cheerMotion from './assets/mumu/motion-cheer.webp';
import teaMotion from './assets/mumu/motion-tea.webp';
import heartsMotion from './assets/mumu/motion-hearts.webp';
import frustratedMotion from './assets/mumu/motion-frustrated.webp';
import sadMotion from './assets/mumu/motion-sad.webp';
import restMotion from './assets/mumu/motion-rest.webp';

export const moodPortraits = {
  tired: tiredPortrait,
  sad: sadPortrait,
  frustrated: frustratedPortrait,
  bored: boredPortrait,
  happy: happyPortrait,
  neutral: neutralPortrait,
};

// One pass through each original GIF, based on its frame delays.
const motions = [
  { label: '신나게 인사', src: cheerMotion, duration: 990 },
  { label: '차 한잔', src: teaMotion, duration: 1920 },
  { label: '하트 보내기', src: heartsMotion, duration: 1260 },
  { label: '편하게 쉬기', src: restMotion, duration: 1800 },
  { label: '답답해', src: frustratedMotion, duration: 1080 },
  { label: '속상해', src: sadMotion, duration: 1620 },
];

type Motion = typeof motions[number];

function MotionImage({ src, motion, onFinish }: { src: string; motion: Motion; onFinish: () => void }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(onFinish, motion.duration);
    return () => window.clearTimeout(timer);
  }, [loaded, motion.duration, onFinish]);

  return <img
    className="mumu-home-motion"
    src={src}
    alt=""
    hidden={!loaded}
    draggable={false}
    onLoad={() => setLoaded(true)}
    onError={onFinish}
  />;
}

export default function MumuHomeCharacter({ portrait, label }: { portrait?: string; label?: string }) {
  const [request, setRequest] = useState<{ motion: Motion } | null>(null);
  const [clip, setClip] = useState<{ request: NonNullable<typeof request>; src: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const finishMotion = useCallback(() => setRequest(null), []);

  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;

    async function prepareMotion(current: NonNullable<typeof request>) {
      try {
        const response = await fetch(current.motion.src, { signal: controller.signal });
        if (!response.ok) throw new Error('Unable to load motion');
        const gif = await response.blob();
        if (controller.signal.aborted) return;
        // A fresh URL resets the GIF to its first frame even on replay.
        objectUrl = URL.createObjectURL(gif);
        setClip({ request: current, src: objectUrl });
      } catch {
        if (controller.signal.aborted) return;
        setFailed(true);
        setRequest(null);
      }
    }

    void prepareMotion(request);
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [request]);

  return <>
    <div className="mumu-home-stage">
      <img src={portrait ?? defaultPortrait} alt={label ?? '지도를 들고 웃는 무무'} draggable={false} />
      {clip && request === clip.request && (
        <MotionImage key={clip.src} src={clip.src} motion={request.motion} onFinish={finishMotion} />
      )}
    </div>
    <div className="mumu-home-motion-picker" role="group" aria-label="무무 모션 고르기">
      {motions.map(motion => (
        <button
          key={motion.src}
          type="button"
          aria-pressed={request?.motion === motion}
          onClick={() => {
            setFailed(false);
            setRequest({ motion });
          }}
        >{motion.label}</button>
      ))}
    </div>
    {failed && <p role="status">모션을 불러오지 못했어요. 다시 눌러 주세요.</p>}
  </>;
}
