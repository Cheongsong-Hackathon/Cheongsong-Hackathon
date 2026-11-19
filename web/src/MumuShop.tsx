// 무무샵: 아이템 30개(3열 × 10줄). 누르면 무무가 입은 모습을 크게 보여 준다. 미리보기만, 홈의 무무는 그대로.
// 아이템은 아직 안 정해서 "아이템 N". 무무가 그릴 수 있는 6종 × 색 5개로 서로 다르게 보이게 한다.
import { useEffect, useRef, useState } from 'react';
import Bunny from './Bunny';
import ClothingIcon from './ClothingIcon';
import { AccessoryColorOverride, type ColorItem } from './AccessoryColors';
import type { Character } from './api';

const KINDS = ['beret', 'vest', 'glasses', 'ribbon', 'cape', 'scarf'] as const;
const COLORS = ['#b59bd8', '#ff8fb3', '#8fc9b4', '#ffd45e', '#8fb3ff'];
type Kind = (typeof KINDS)[number];
const SHOP_GRID = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  name: `아이템 ${i + 1}`,
  kind: KINDS[i % KINDS.length] as Kind,
  color: COLORS[Math.floor(i / KINDS.length) % COLORS.length],
}));
type ShopItem = (typeof SHOP_GRID)[number];
const isClothes = (k: Kind): k is 'vest' | 'cape' | 'glasses' => k === 'vest' || k === 'cape' || k === 'glasses';

/** 이 아이템 하나만 입은 무무 */
function Wearing({ item, ch, size }: { item: ShopItem; ch: Character | null; size: number }) {
  const bunny = (
    <Bunny
      size={size}
      stage={ch?.stage ?? 1}
      item={isClothes(item.kind) ? null : item.kind}
      previewClothes={{ owned: [], equipped: isClothes(item.kind) ? item.kind : null, colors: { [item.kind]: item.color } }}
    />
  );
  return isClothes(item.kind) ? bunny : <AccessoryColorOverride item={item.kind as ColorItem} color={item.color}>{bunny}</AccessoryColorOverride>;
}

export default function MumuShop({ ch }: { ch: Character | null }) {
  const [picked, setPicked] = useState<ShopItem | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    strip.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [picked]);

  if (picked)
    return (
      <div className="mumu-shop-detail">
        <button className="btn text" onClick={() => setPicked(null)}>‹ 무무샵</button>
        <div className="mumu-shop-stage"><Wearing item={picked} ch={ch} size={230} /></div>
        <h2 className="title center">{picked.name}</h2>
        <p className="small center mute">입어 본 모습이에요 · 홈의 무무는 그대로예요</p>
        <div className="mumu-shop-strip" ref={strip} aria-label="다른 아이템">
          {SHOP_GRID.map((it) => (
            <button key={it.id} className="mumu-shop-cell" aria-pressed={it.id === picked.id} aria-label={it.name} onClick={() => setPicked(it)}>
              <ClothingIcon id={it.kind} color={it.color} />
            </button>
          ))}
        </div>
      </div>
    );

  return (
    <div className="page mumu-shop">
      <h1 className="title">무무샵</h1>
      <div className="mumu-shop-grid">
        {SHOP_GRID.map((it) => (
          <button key={it.id} className="mumu-shop-cell" onClick={() => setPicked(it)}>
            <ClothingIcon id={it.kind} color={it.color} />
            <span>{it.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
