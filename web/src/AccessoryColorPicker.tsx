import { useEffect, useId, useState, type CSSProperties } from 'react';
import { COLOR_ITEMS, useAccessoryColors, type ColorItem } from './AccessoryColors';

const PALETTE = [
  ['분홍', '#ff8fb3'], ['노랑', '#ffd45e'], ['보라', '#a58ae8'],
  ['하늘', '#83c8ee'], ['민트', '#83cfb3'], ['살구', '#f5ad86'],
];

export default function AccessoryColorPicker({ item, unlocked }: { item: ColorItem; unlocked: boolean }) {
  const { colors, setColor } = useAccessoryColors();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const name = COLOR_ITEMS.find((value) => value.id === item)!.name;
  useEffect(() => { if (!unlocked) setOpen(false); }, [unlocked]);
  const chooseColor = (color: string) => { if (unlocked) setColor(item, color); };
  return (
    <section className="accessory-colors" aria-label={`${name} 색상`}>
      <button type="button" className="accessory-color-toggle" disabled={!unlocked} aria-expanded={open && unlocked} aria-controls={panelId} onClick={() => { if (unlocked) setOpen(!open); }}><span>{!unlocked && '🔒 '}{name} 색상</span><span aria-hidden="true">{open && unlocked ? '−' : '＋'}</span></button>
      {!unlocked && <p className="small mute">아이템 잠금 해제 후 변경할 수 있어요.</p>}
      {open && unlocked && <fieldset id={panelId} className="color-options accessory-color-options" disabled={!unlocked}>
      <legend className="sr-only">{name} 색 고르기</legend>
      <div className="color-swatches" role="group" aria-label={`${name} 추천 색상`}>
        {PALETTE.map(([label, color]) => <button key={color} type="button" className="color-swatch"
          style={{ '--swatch': color } as CSSProperties} aria-label={`${name} ${label}`} aria-pressed={colors[item] === color}
          disabled={!unlocked} onClick={() => chooseColor(color)}><span aria-hidden="true">{colors[item] === color ? '✓' : ''}</span></button>)}
      </div>
      <label className="custom-color" htmlFor={inputId}>
        <span>직접 색 고르기</span>
        <input id={inputId} type="color" disabled={!unlocked} value={colors[item]} onChange={(event) => chooseColor(event.target.value)} />
      </label>
      </fieldset>}
    </section>
  );
}
