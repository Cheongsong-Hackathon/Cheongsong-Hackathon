import { useEffect, useRef, useState } from 'react';
import MumuCoin, { CoinIcon } from './MumuCoin';
import MumuClosetModel, { type ClosetPreview } from './MumuClosetModel';
import { PhoneStatus } from './MumuWelcome';
import { wardrobeItems, type WardrobeItem } from './mumuWardrobeItems';
import './mumu-shop.css';

const CATEGORIES = [
  ['전체', 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'],
  ['모자', 'M3 15c1-8 6-12 11-10 4 1 6 5 6 10M3 15c4-3 7 2 13 2 2 0 4-2 5-2 2 3-2 6-8 5-5-1-8-3-10-3z'],
  ['상의', 'M8 3 2 8l3 4 3-2v11h8V10l3 2 3-4-6-5c-1 4-7 4-8 0Z'],
  ['하의', 'M6 3h12l3 18h-6l-3-10-3 10H3zM6 7h12'],
  ['액세서리', 'M4 14v-3a8 8 0 0 1 16 0v3M4 13h3v6H4a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2Zm16 0h-3v6h3a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2Z'],
] as const;
type Category = typeof CATEGORIES[number][0];
const FULL_LOOK_IDS = ['cloud-hoodie', 'star-headset', 'yellow-scarf'];
const SLOTS = [
  { key: 'hat', label: '모자', icon: CATEGORIES[1][1] },
  { key: 'body', label: '옷', icon: CATEGORIES[2][1] },
  { key: 'headset', label: '헤드셋', icon: CATEGORIES[4][1] },
  { key: 'scarf', label: '목도리', icon: 'M6 7h12v5H6zm8 5 3 8h4l-3-8' },
] as const;

function LineIcon({ path }: { path: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>;
}

function Price({ amount }: { amount: number }) {
  return <span className="mumu-item-price"><CoinIcon />{amount.toLocaleString('ko-KR')} 코인</span>;
}

export default function MumuCloset({ hearts, onBack }: { hearts: number; onBack: () => void }) {
  const [category, setCategory] = useState<Category>('전체');
  const [preview, setPreview] = useState<ClosetPreview>(null);
  const [purchase, setPurchase] = useState<WardrobeItem | null>(null);
  const hero = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const items = wardrobeItems.filter(item => category === '전체' || item.category === category);
  const previewItems = preview === 'full' ? wardrobeItems.filter(item => FULL_LOOK_IDS.includes(item.id))
    : preview ? [preview] : [];

  useEffect(() => {
    if (purchase && !dialog.current?.open) dialog.current?.showModal();
  }, [purchase]);

  function tryOn(item: WardrobeItem) {
    setPreview(current => current === item ? null : item);
    hero.current?.scrollIntoView({ block: 'nearest' });
  }

  return <div className="mumu-dress mumu-closet">
    <PhoneStatus />
    <header className="mumu-dress-header">
      <button type="button" className="mumu-dress-back" onClick={onBack} aria-label="무무 탭으로 돌아가기">‹</button>
      <h1>무무의 옷장</h1>
      <div className="mumu-dress-currency">
        <span className="room-hearts" aria-label={`하트 ${hearts}개`}>💗 {hearts.toLocaleString('ko-KR')}</span>
        <MumuCoin />
      </div>
    </header>
    <section ref={hero} className="mumu-closet-hero" aria-label="옷장 시착">
      <div className="mumu-dress-stage mumu-closet-scene">
        <span className="mumu-dress-preview-label" role="status">
          <span aria-hidden="true">✦</span> {preview === 'full' ? '풀코디 미리보기' : preview ? `${preview.name} 시착 중` : '기본 무무'}
        </span>
        <div className="mumu-closet-lamp" aria-hidden="true" />
        <div className="mumu-closet-rack" aria-hidden="true" />
        <div className="mumu-closet-mirror" aria-hidden="true" />
        <div className="mumu-closet-gift" aria-hidden="true" />
        <div className="mumu-closet-model"><MumuClosetModel preview={preview} /></div>
        <div className="mumu-closet-slots" aria-label="시착 아이템">
          {SLOTS.map(slot => {
            const item = previewItems.find(item => item.slot === slot.key);
            return <span key={slot.key} role="img" aria-label={item?.name ?? `${slot.label} 없음`}>
              {item ? <img className="mumu-clothing-icon" src={item.image} alt="" /> : <LineIcon path={slot.icon} />}
            </span>;
          })}
        </div>
      </div>
      <div className="mumu-closet-actions">
        <button type="button" aria-pressed={preview === 'full'} onClick={() => setPreview('full')}>✦ 풀코디 보기</button>
        <button type="button" disabled={!preview} onClick={() => setPreview(null)}>시착 초기화</button>
      </div>
    </section>
    <div className="mumu-closet-categories" aria-label="옷장 카테고리">
      {CATEGORIES.map(([label, path]) => <button type="button" key={label} aria-pressed={category === label}
        onClick={() => setCategory(label)}><LineIcon path={path} />{label}</button>)}
    </div>
    <section className="mumu-dress-items-section mumu-closet-list" aria-labelledby="mumu-closet-heading">
      <header><h2 id="mumu-closet-heading"><span aria-hidden="true">✦</span> 옷장 아이템</h2></header>
      <div className="mumu-dress-items">
        {items.map(item => <article key={item.id} className="mumu-closet-card" data-preview={preview === item}>
          <button type="button" className="mumu-closet-item" aria-pressed={preview === item} aria-label={`${item.name} 시착`}
            onClick={() => tryOn(item)}>
            <img className="mumu-clothing-icon" src={item.image} alt="" draggable={false} />
            <strong>{item.name}</strong>
            <Price amount={item.price} />
          </button>
          <button className="mumu-dress-primary" type="button" aria-label={`${item.name} 구매하기`} onClick={() => setPurchase(item)}>구매하기</button>
        </article>)}
      </div>
    </section>
    <dialog ref={dialog} className="mumu-closet-dialog" aria-labelledby="mumu-purchase-title" aria-describedby="mumu-purchase-note"
      onClose={() => setPurchase(null)}>
      {purchase && <>
        <h2 id="mumu-purchase-title">{purchase.name}</h2>
        <Price amount={purchase.price} />
        <p id="mumu-purchase-note">구매 기능은 준비 중이에요.</p>
        <form method="dialog"><button className="mumu-dress-primary">닫기</button></form>
      </>}
    </dialog>
  </div>;
}
