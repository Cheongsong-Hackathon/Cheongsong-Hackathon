import { useEffect, useState } from 'react';

/** 키보드는 스크롤 영역만 줄이고, 글자나 휴대폰 모형을 축소하지 않는다. */
export default function useAppViewport() {
  const [fit, setFit] = useState(1);
  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 600px), (pointer: coarse) and (max-width: 1024px)');
    const viewport = window.visualViewport;
    let width = window.innerWidth;
    let desktopHeight = window.innerHeight;
    let frame = 0;

    const update = () => {
      const element = document.activeElement;
      const editing = element instanceof HTMLElement && element.matches('input:not([type="range"]), textarea, [contenteditable="true"]');
      const widthChanged = width !== window.innerWidth;
      width = window.innerWidth;
      if (mobile.matches) {
        setFit(1);
        // 사용자의 두 손가락 확대 동작은 브라우저에 맡긴다.
        if (!viewport || Math.abs(viewport.scale - 1) < 0.05) {
          document.documentElement.style.setProperty('--app-height', `${viewport?.height ?? window.innerHeight}px`);
        }
      } else {
        document.documentElement.style.removeProperty('--app-height');
        if (!editing || widthChanged) desktopHeight = window.innerHeight;
        setFit(Math.min(1, (width - 12) / 416, (desktopHeight - 12) / 870));
      }
      if (editing) element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('resize', schedule);
    viewport?.addEventListener('resize', schedule);
    mobile.addEventListener('change', schedule);
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      viewport?.removeEventListener('resize', schedule);
      mobile.removeEventListener('change', schedule);
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('focusout', schedule);
      document.documentElement.style.removeProperty('--app-height');
    };
  }, []);
  return fit;
}
