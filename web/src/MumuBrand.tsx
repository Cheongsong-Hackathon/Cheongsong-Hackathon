import { useEffect, useRef } from 'react';
import Bunny from './Bunny';
/** A single persistent brand mark; the tab icon mirrors the visible current face. */
export default function MumuBrand({ item, quiet = false }: { item: string | null; quiet?: boolean }) {
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('#mumu-app-icon');
    const svg = header.current?.querySelector('svg');
    if (!link || !svg) return;
    const update = () => { link.href = `data:image/svg+xml,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`; };
    update();
    const observer = new MutationObserver(update);
    observer.observe(svg, { subtree: true, childList: true, attributes: true });
    return () => observer.disconnect();
  }, []);
  return <header ref={header} className="mumu-global-brand" aria-label="무무"><Bunny size={40} faceOnly layerScarf item={item} quiet={quiet} /><span>무무</span><small>함께 자라는 작은 마음</small></header>;
}
