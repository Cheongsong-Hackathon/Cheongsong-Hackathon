import { useId, useState, type CSSProperties } from 'react';
import Bunny from './Bunny';
import { useAccessoryColors, type ColorItem } from './AccessoryColors';

const PALETTE = [
  ['분홍', '#ff8fb3'], ['노랑', '#ffd45e'], ['보라', '#a58ae8'],
  ['하늘', '#83c8ee'], ['민트', '#83cfb3'], ['살구', '#f5ad86'],
];

export default function AccessoryColorPicker({ item, unlocked }: { item: ColorItem; unlocked: boolean }) {
  const { colors, setColor } = useAccessoryColors();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const name = item === 'ribbon' ? '리본' : '목도리';
  return (
    <section className="accessory-colors" aria-label={`${name} 색상`}>
      <div className="row">
        <Bunny size={112} item={item} />
        <div className="grow">
          <strong>{name} 색상</strong>
          <p className="small mute">{unlocked ? '착용하면 선택한 색이 바로 보여요.' : '색을 미리 골라 봐요. 아이템은 성장하면 열려요.'}</p>
        </div>
      </div>
      <button type="button" className="btn ghost" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>{open ? '색 고르기 닫기' : '색 고르기'}</button>
      {open && <div id={panelId} className="color-options">
      <div className="color-swatches" role="group" aria-label={`${name} 추천 색상`}>
        {PALETTE.map(([label, color]) => <button key={color} type="button" className="color-swatch"
          style={{ '--swatch': color } as CSSProperties} aria-label={`${name} ${label}`} aria-pressed={colors[item] === color}
          onClick={() => setColor(item, color)}><span aria-hidden="true">{colors[item] === color ? '✓' : ''}</span></button>)}
      </div>
      <label className="custom-color" htmlFor={inputId}>
        <span>직접 색 고르기</span>
        <input id={inputId} type="color" value={colors[item]} onChange={(event) => setColor(item, event.target.value)} />
      </label>
      </div>}
    </section>
  );
}
