import MumuMotionControls, { useMumuMotion } from './MumuMotionControls';
import { useEffect, useState } from 'react';
import Bunny from './Bunny';
import ClothingIcon from './ClothingIcon';
import AccessoryColorPicker from './AccessoryColorPicker';
import { AccessoryColorsPreviewProvider, COLOR_ITEMS } from './AccessoryColors';
import { CharacterExpressionPreviewProvider, EXPRESSIONS, useCharacterExpression } from './CharacterExpression';
import { SHOP_ITEMS, useMumuWardrobe, type ShopId } from './MumuWardrobe';
import { OutfitContext, useOutfit } from './Outfit';
import type { Character } from './api';

export default function MumuShop({ ch }: { ch: Character | null }) {
  return <AccessoryColorsPreviewProvider><CharacterExpressionPreviewProvider><ShopContent ch={ch} /></CharacterExpressionPreviewProvider></AccessoryColorsPreviewProvider>;
}
function ShopContent({ ch }: { ch: Character | null }) {
  const motion = useMumuMotion();
  const [view, setView] = useState<'closet' | 'shop'>('closet');
  const [buy, setBuy] = useState<ShopId | null>(null);
  const [message, setMessage] = useState('');
  const { state, save } = useMumuWardrobe();
  const outfit = useOutfit();
  const [accessory, setAccessory] = useState<string | null>(ch?.equipped === 'scarf' ? null : ch?.equipped ?? null);
  const [scarf, setScarf] = useState(outfit.scarf);
  const [trying, setTrying] = useState<ShopId | null>(state.equipped);
  const [tryColors, setTryColors] = useState<Record<string, string>>(() => ({ ...state.colors }));
  const { expression, setExpression } = useCharacterExpression();
  useEffect(() => { setAccessory(ch?.equipped === 'scarf' ? null : ch?.equipped ?? null); }, [ch?.equipped]);
  const selected = SHOP_ITEMS.find(i => i.id === buy);
  function tryItem(id: ShopId) { setTrying(previous => previous === id ? null : id); setMessage(trying === id ? '시착을 해제했어요.' : '위의 무무에게 시착했어요. 홈에는 적용되지 않아요.'); }
  return <div className="page mumu-shop mumu-shop-compact"><h1 className="title">무무샵</h1>
    <div className="card mumu-shop-preview"><OutfitContext.Provider value={{ scarf }}><Bunny motion={motion.motion} motionKey={motion.motionKey} size={190} layerScarf stage={ch?.stage ?? 1} item={accessory} previewClothes={{ owned: [], equipped: trying, colors: tryColors }} /></OutfitContext.Provider><MumuMotionControls motion={motion.motion} play={motion.play} /><p>시착 미리보기 · 홈에는 적용되지 않아요</p><button className="btn text" onClick={() => { setTrying(state.equipped); setAccessory(ch?.equipped === 'scarf' ? null : ch?.equipped ?? null); setScarf(outfit.scarf); setTryColors({ ...state.colors }); }}>시착 초기화</button></div>
    <div className="card mumu-skin-locked mumu-skin-simple" aria-label="잠긴 무무 색상 변경"><span aria-hidden="true">🔒</span><strong>무무 색상 변경</strong></div>
    <div className="mumu-home-links"><button aria-pressed={view === 'closet'} onClick={() => setView('closet')}>나의 옷장</button><button aria-pressed={view === 'shop'} onClick={() => setView('shop')}>옷 구경하기</button></div>
    {message && <p role="status" className="small center mute">{message}</p>}
    {view === 'closet' ? <>
      <h2 className="label">무무 꾸미기</h2><div className="mumu-settings-grid">
        <details className="mumu-setting-card"><summary>표정 고르기 <span aria-hidden="true">＋</span></summary><div className="chips">{EXPRESSIONS.map(value => <button className={`chip${expression === value ? ' on' : ''}`} aria-pressed={expression === value} key={value} onClick={() => setExpression(value)}>{value}</button>)}</div></details>
        <details className="mumu-setting-card"><summary>착용한 옷 색상 <span aria-hidden="true">＋</span></summary>{trying ? <label className="custom-color"><span>{SHOP_ITEMS.find(i => i.id === trying)?.name}</span><input type="color" aria-label="시착 중인 옷 색상" value={tryColors[trying] ?? (trying === 'cape' ? '#b5d9cc' : '#b59bd8')} onChange={e => setTryColors(previous => ({ ...previous, [trying]: e.target.value }))} /></label> : <p className="small mute">옷을 먼저 눌러 시착해 주세요.</p>}</details>
        {COLOR_ITEMS.map(({ id }) => <AccessoryColorPicker key={id} item={id} unlocked={!!ch?.allItems.find(i => i.id === id)?.unlocked} />)}
      </div>
      <h2 className="label">내 아이템</h2><div className="mumu-products">{COLOR_ITEMS.map(({ id, name }) => { const unlocked = !!ch?.allItems.find(i => i.id === id)?.unlocked; const wearing = id === 'scarf' ? scarf : accessory === id; return <button className={`card mumu-try-card${wearing ? ' selected' : ''}`} key={id} disabled={!unlocked} aria-pressed={wearing} onClick={() => id === 'scarf' ? setScarf(!scarf) : setAccessory(accessory === id ? null : id)}><ClothingIcon id={id} /><strong>{name}</strong><small>{unlocked ? wearing ? '시착 중' : '눌러서 시착' : '🔒 성장 후 잠금 해제'}</small></button>; })}{state.owned.map(id => <button key={id} className={`card mumu-try-card${trying === id ? ' selected' : ''}`} aria-pressed={trying === id} onClick={() => tryItem(id)}><ClothingIcon id={id} color={tryColors[id]} /><strong>{SHOP_ITEMS.find(i => i.id === id)?.name}</strong><small>{trying === id ? '시착 중' : '눌러서 시착'}</small></button>)}</div>
    </> : <><p className="small mute">옷을 누르면 위의 무무에게 입혀볼 수 있어요.</p><div className="mumu-products">{SHOP_ITEMS.map(item => <article className="card mumu-product-card" key={item.id}><button className={`mumu-try-product${trying === item.id ? ' selected' : ''}`} aria-pressed={trying === item.id} onClick={() => tryItem(item.id)}><ClothingIcon id={item.id} color={tryColors[item.id]} /><strong>{item.name}</strong><small>{trying === item.id ? '시착 중' : '눌러서 시착'}</small></button><button className="btn ghost" disabled={state.owned.includes(item.id)} onClick={() => setBuy(item.id)}>{state.owned.includes(item.id) ? '보유 중' : '체험 구매'}</button></article>)}</div></>}
    {selected && <section className="card" aria-label="체험 구매 확인"><strong>{selected.name}을 옷장에 담을까요?</strong><p className="small mute">실제 결제 없이 이 브라우저의 보유 목록에만 추가돼요. 홈의 착용 상태는 바뀌지 않아요.</p><div className="row two"><button className="btn ghost" onClick={() => setBuy(null)}>취소</button><button className="btn" onClick={() => { if (save({ ...state, owned: [...new Set([...state.owned, selected.id])] })) { setBuy(null); setMessage('옷장에 추가했어요. 홈의 착용 상태는 그대로예요.'); } else setMessage('옷장에 저장하지 못했어요. 저장 공간을 확인해 주세요.'); }}>옷장에 담기</button></div></section>}
  </div>;
}
