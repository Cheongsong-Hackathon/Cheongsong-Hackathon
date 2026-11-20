import { OutfitContext, useOutfit } from './Outfit';
import { useState } from 'react';
import Bunny from './Bunny';
import ClothingIcon from './ClothingIcon';
import { AccessoryColorOverride, useAccessoryColors, type ColorItem } from './AccessoryColors';
import { useMumuWardrobe } from './MumuWardrobe';
import type { Character } from './api';

const ITEMS = [
 {id:'beret',name:'베레모'}, {id:'vest',name:'니트 조끼'}, {id:'glasses',name:'동그란 안경'},
 {id:'ribbon',name:'리본'}, {id:'cape',name:'케이프'}, {id:'scarf',name:'목도리'},
] as const;
type Kind = typeof ITEMS[number]['id'];
const PALETTE = ['#b59bd8','#ff8fb3','#8fc9b4','#ffd45e','#8fb3ff','#e8d8c5'];
const clothes = (id:Kind): id is 'vest'|'cape'|'glasses' => ['vest','cape','glasses'].includes(id);

export default function MumuShop({ ch, onBack, onEquip, equipBusy }: { ch: Character | null; onBack: () => void; onEquip: (id: string | null) => Promise<boolean>; equipBusy: boolean }) {
 const [panel,setPanel]=useState<'closet'|'store'|null>(null);
 const [picked,setPicked]=useState<Kind|null>(null);
 const [premium,setPremium]=useState(false);
 const {state,save}=useMumuWardrobe();
 const outfit=useOutfit();
 const [message,setMessage]=useState('');
 const [saving,setSaving]=useState(false);
 const {colors:accessoryColors,setColor}=useAccessoryColors();
 const [colors,setColors]=useState<Record<string,string>>(()=>({...accessoryColors,...state.colors}));
 const owned=(id:Kind)=>clothes(id)?state.owned.includes(id):!!ch?.allItems.some(item=>item.id===id&&item.unlocked);
 const selected=ITEMS.find(item=>item.id===picked);
 const color=picked?colors[picked]??PALETTE[0]:PALETTE[0];
 const wearing=(id:Kind)=>clothes(id)?state.equipped===id:id==='scarf'?outfit.scarf:ch?.equipped===id;
 async function apply(remove=false) {
  if(!picked||!owned(picked)||saving||equipBusy) return;
  const id=picked;setSaving(true);setMessage('');
  try {
   const success=clothes(id)?save({...state,equipped:remove?null:id,colors:{...state.colors,[id]:color}}):wearing(id)===!remove?true:await onEquip(id);
   if(!success){setMessage('저장하지 못했어요. 연결과 브라우저 저장 공간을 확인해 주세요.');return;}
   if(!clothes(id)&&!remove)setColor(id as ColorItem,color);
   setMessage(remove?`${selected!.name}를 벗었어요.`:`${selected!.name}를 착용했어요. 홈에도 반영돼요.`);setPicked(null);
  } catch {setMessage('연결이 끊겼어요. 다시 시도해 주세요.');} finally {setSaving(false);}
 }
 const previewItem=picked&&!clothes(picked)?picked:ch?.equipped??null;
 const model=<OutfitContext.Provider value={{scarf:picked==='scarf'?true:outfit.scarf}}><Bunny size={240} layerScarf stage={ch?.stage??1} item={previewItem} previewClothes={{owned:state.owned,equipped:picked&&clothes(picked)?picked:state.equipped,colors:{...state.colors,...colors}}} /></OutfitContext.Provider>;
 const options=panel==='closet'?ITEMS.filter(item=>owned(item.id)):ITEMS;
 return <div className="page mumu-shop mumu-simple-shop">
  <button className="btn text back-link" onClick={onBack}>‹ 마이페이지</button>
  <header className="mumu-shop-heading"><span>MU MU DRESS ROOM</span><h1 className="title">무무의 작은 옷방</h1><p>오늘의 무무에게 어울리는 한 벌</p></header>
  <div className="mumu-simple-stage">{picked&&!clothes(picked)?<AccessoryColorOverride item={picked as ColorItem} color={color}>{model}</AccessoryColorOverride>:model}<span>{selected?`${selected.name} 시착 중`:'어떤 모습도 사랑스러운 무무'}</span></div>
  <button className="mumu-body-lock" onClick={()=>setPremium(v=>!v)} aria-expanded={premium}><span aria-hidden="true">♧</span><strong>무무 색상 변경</strong><small>유료 · 잠금</small></button>
  {premium&&<p className="mumu-shop-note" role="status">결제 후 이용할 수 있는 기능이에요. 현재 결제 연결을 준비하고 있어요.</p>}
  <div className="mumu-shop-doors">
   <button onClick={()=>setPanel(panel==='closet'?null:'closet')} aria-expanded={panel==='closet'} className={panel==='closet'?'selected':''}><span aria-hidden="true">♧</span><strong>옷장 열기</strong><small>내가 가진 옷</small></button>
   <button onClick={()=>setPanel(panel==='store'?null:'store')} aria-expanded={panel==='store'} className={panel==='store'?'selected':''}><span aria-hidden="true">✧</span><strong>상점 열기</strong><small>새로운 옷 구경</small></button>
  </div>
  {panel&&<section className="mumu-shop-drawer" aria-label={panel==='closet'?'내 옷장':'옷 상점'}>
   <div className="row" style={{justifyContent:'space-between'}}><h2>{panel==='closet'?'내 옷장':'작은 상점'}</h2><button className="icon-btn" aria-label="목록 닫기" onClick={()=>setPanel(null)}>×</button></div>
   {options.length?<div className="mumu-simple-items">{options.map(item=><button key={item.id} aria-pressed={picked===item.id} onClick={()=>setPicked(item.id)} className={picked===item.id?'selected':''}><ClothingIcon id={item.id} color={colors[item.id]??PALETTE[0]}/><strong>{item.name}</strong><small>{owned(item.id)?'보유 중':'시착해 보기'}</small></button>)}</div>:<p className="mumu-shop-note">아직 옷장이 비어 있어요. 상점에서 옷을 먼저 입어 보세요.</p>}
   {selected&&<div className="mumu-item-colors"><h3>{selected.name} 색상</h3><div className="mumu-shop-swatches">{PALETTE.map(value=><button key={value} aria-label={`${selected.name} ${value} 색상`} aria-pressed={color===value} disabled={!owned(picked!)} style={{background:value}} onClick={()=>setColors(previous=>({...previous,[picked!]:value}))}>{color===value?'✓':''}</button>)}<label>직접 고르기<input type="color" aria-label="옷 색상 직접 고르기" disabled={!owned(picked!)} value={color} onChange={e=>setColors(previous=>({...previous,[picked!]:e.target.value}))}/></label></div>{!owned(picked!)&&<p className="mumu-shop-note">잠금 해제된 아이템만 색상을 바꿀 수 있어요. 구매 기능은 준비 중이에요.</p>}</div>}
   {panel==='closet'&&picked&&owned(picked)&&<div className="row two" style={{marginTop:16}}>
    <button className="btn" disabled={saving||equipBusy} onClick={()=>apply()}>{saving||equipBusy?'저장 중…':wearing(picked)?'착용·색상 적용':'착용하기'}</button>
    <button className="btn ghost" disabled={saving||equipBusy||!wearing(picked)} onClick={()=>apply(true)}>벗기</button>
   </div>}
  </section>}
  {message&&<p role="status" className="mumu-shop-note">{message}</p>}
  {picked&&<button className="btn text" onClick={()=>setPicked(null)}>시착 취소</button>}
  <p className="mumu-shop-note">시착은 미리보기예요. 옷장에서 착용하기를 누르면 홈에도 적용돼요.</p>
 </div>;
}
