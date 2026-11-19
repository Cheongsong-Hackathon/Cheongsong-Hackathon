import type { Joints, Point } from './mumuParts';
import { useEffect, useRef } from 'react';
import type { MumuMotion } from './MumuMotionControls';

// Explicitly requested gestures use SVG attributes, independent of CSS animation settings.
export default function useMumuAnimation(motion: MumuMotion | null, motionKey: number, loop: boolean, joints?: Joints) {
  const body = useRef<SVGGElement>(null);
  const hand = useRef<SVGGElement>(null);
  const shadow = useRef<SVGGElement>(null);
  const leftArm = useRef<SVGGElement>(null);
  const leftLeg = useRef<SVGGElement>(null);
  const rightLeg = useRef<SVGGElement>(null);
  const tail = useRef<SVGGElement>(null);
  const eyes = useRef<SVGGElement>(null);
  const hearts = useRef<SVGGElement>(null);
  useEffect(() => {
    if (!motion || !body.current) return;
    if (motion === 'idle' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    let start: number | null = null;
    const duration = 2400;
    const centerScale = (sx: number, sy: number, y = 0, angle = 0) =>
      `translate(102 ${205 + y}) rotate(${angle}) scale(${sx} ${sy}) translate(-102 -205)`;
    const reset = () => {
      body.current?.removeAttribute('transform');
      hand.current?.removeAttribute('transform');
      shadow.current?.removeAttribute('transform');
      for (const ref of [leftArm,leftLeg,rightLeg,tail,eyes]) ref.current?.removeAttribute('transform');
    };
    const rotate = (ref: typeof hand, angle: number, pivot: Point) => ref.current?.setAttribute('transform', `rotate(${angle} ${pivot[0]} ${pivot[1]})`);
    const tick = (now: number) => {
      start ??= now;
      const elapsed = now - start;
      const t = loop ? elapsed % duration : Math.min(elapsed, duration);
      const phase = t / duration;
      if(joints) {
        const sway=Math.sin(phase*Math.PI*2);
        rotate(tail, sway*7, joints.tail);
        if(motion==='bounce') {
          const kick=Math.sin(phase*Math.PI*4)*14;
          rotate(leftLeg,-kick,joints.leftLeg);rotate(rightLeg,kick,joints.rightLeg);
          rotate(leftArm,-Math.abs(kick),joints.leftArm);rotate(hand,Math.abs(kick),joints.rightArm);
        } else if(motion==='heart') {
          const hug=Math.sin(phase*Math.PI)*22;
          rotate(leftArm,-hug,joints.leftArm);rotate(hand,hug,joints.rightArm);
        }
        if(motion==='idle') {
          const blink=phase>.88&&phase<.96 ? Math.max(.08,Math.abs((phase-.92)/.04)) : 1;
          eyes.current?.setAttribute('transform',`translate(${joints.eyes[0]} ${joints.eyes[1]}) scale(1 ${blink}) translate(${-joints.eyes[0]} ${-joints.eyes[1]})`);
        }
      }
      const envelope = Math.min(1, phase * 10, (1 - phase) * 10);
      if (motion === 'idle') {
        const breath = Math.sin(phase * Math.PI * 2);
        body.current?.setAttribute('transform', centerScale(1 + breath * .008, 1 - breath * .012, -Math.max(0, breath) * 2, breath * .7));
      } else if (motion === 'wave') {
        const swing = Math.sin(phase * Math.PI * 8);
        body.current?.setAttribute('transform', centerScale(1, 1, -Math.abs(swing) * 2, swing * 2));
        rotate(hand,(-10+swing*32)*envelope,joints?.rightArm??[150,161]);
      } else if (motion === 'bounce') {
        const jump = Math.max(0, Math.sin(phase * Math.PI * 4));
        const squash = Math.max(0, -Math.sin(phase * Math.PI * 4)) * .1;
        body.current?.setAttribute('transform', centerScale(1 + squash - jump * .035, 1 - squash + jump * .05, -jump * 34));
        const [sx,sy]=joints?.shadow??[102,211];
        shadow.current?.setAttribute('transform', `translate(${sx} ${sy}) scale(${1-jump*.35} ${1-jump*.15}) translate(${-sx} ${-sy})`);
      } else {
        const beat = Math.sin(phase * Math.PI * 6) * envelope;
        body.current?.setAttribute('transform', centerScale(1 + beat * .035, 1 - beat * .025, -Math.abs(beat) * 3));
        Array.from(hearts.current?.children ?? []).forEach((heart, i) => {
          const progress = Math.max(0, Math.min(1, (t - i * 200) / 1700));
          const x = 65 + i * 40 + (i - 1) * progress * 16;
          const y = 112 - progress * 92;
          heart.setAttribute('transform', `translate(${x} ${y}) scale(${.4 + progress * .9}) rotate(${(i - 1) * progress * 15})`);
          heart.setAttribute('opacity', String(Math.min(1, progress * 6, (1 - progress) * 5)));
        });
      }
      if (loop || elapsed < duration) frame = requestAnimationFrame(tick);
      else reset();
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); reset(); };
  }, [motion, motionKey, loop, JSON.stringify(joints)]);
  return { body, hand, shadow, hearts, leftArm, leftLeg, rightLeg, tail, eyes };
}
