import { useState } from 'react';
import type { Item } from './api';
import { TripHeader } from './TripUI';
import PlaceArt from './PlaceArt';
import { placeCategory } from './placeCategories';
import { placeReviews } from './placeReviews';
import { useSavedPlace } from './savedPlaces';
import mascotMotion from './assets/mumu/motion-saved-spots.gif';
import './saved-spots.css';

const categories = [
  { key: 'all', label: '전체', icon: '' },
  { key: 'cafe', label: '카페', icon: '☕' },
  { key: 'gallery', label: '전시', icon: '▧' },
  { key: 'park', label: '산책', icon: '♧' },
  { key: 'other', label: '기타', icon: '···' },
] as const;
type Filter = typeof categories[number]['key'];

function groupFor(item: Item): Exclude<Filter, 'all'> {
  const key = placeCategory(item.category).key;
  if (key === 'cafe' || key === 'tea') return 'cafe';
  if (key === 'gallery') return 'gallery';
  if (key === 'park') return 'park';
  return 'other';
}

function SavedSpotCard({ item, rating, onPick }: { item: Item; rating?: number; onPick: (item: Item) => void }) {
  const { saved, toggle } = useSavedPlace(item);
  const category = categories.find(option => option.key === groupFor(item))!;
  const name = item.placeName || item.title;
  return <article className="saved-spot-card">
    <button type="button" className="saved-spot-open" aria-label={`${name} 상세 보기`} onClick={() => onPick(item)}>
      <span className="saved-spot-photo">
        <PlaceArt category={placeCategory(item.category).key} placeId={item.placeId} hasPhoto={item.hasPhoto} photo={item.photo} className="saved-spot-art" />
        <span>{category.label}</span>
      </span>
      <span className="saved-spot-copy">
        <strong>{name}</strong>
        <small className="saved-spot-distance">{Number.isFinite(item.walkMinutes) ? `⌖ 도보 ${item.walkMinutes}분` : placeCategory(item.category).label}</small>
        {item.description && <span className="saved-spot-description">{item.description}</span>}
        <small className="saved-spot-rating">{rating === undefined ? '☆ 남긴 평점 없음' : `★ ${rating.toFixed(1)} · 내 평점`}</small>
      </span>
    </button>
    <button type="button" className="saved-spot-mark" aria-label={`${name} 찜 해제`} aria-pressed={saved} onClick={toggle}>
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M6 3h12a1 1 0 0 1 1 1v16l-7-4.5L5 20V4a1 1 0 0 1 1-1Z" /></svg>
    </button>
    <details className="saved-spot-menu">
      <summary aria-label={`${name} 옵션`}>•••</summary>
      <div><button type="button" onClick={() => onPick(item)}>상세 보기</button><button type="button" onClick={toggle}>찜 해제</button></div>
    </details>
  </article>;
}

export default function SavedSpots({ items, total, onBack, onPick, onExplore, onNotifications }: {
  items: Item[]; total: number; onBack: () => void;
  onPick: (item: Item) => void; onExplore: () => void; onNotifications: () => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<'recent' | 'name'>('recent');
  const ratings = new Map(placeReviews().map(review => [review.place.id, review.rating]));
  const visible = items.filter(item => filter === 'all' || groupFor(item) === filter).reverse();
  if (sort === 'name') visible.sort((a, b) => (a.placeName || a.title).localeCompare(b.placeName || b.title, 'ko'));

  return <div className="saved-spots">
    <TripHeader onNotice={onNotifications} onSearch={onExplore} />
    <section className="saved-spots-hero">
      <button type="button" className="saved-spots-back" aria-label="마이로 돌아가기" onClick={onBack}>‹</button>
      <div className="saved-spots-intro">
        <h1>찜한 스팟</h1>
        <p>마음에 담아둔 장소들을 모아봤어요!</p>
      </div>
      <div className="saved-spots-mascot" aria-hidden="true"><img src={mascotMotion} alt="" draggable={false} /></div>
    </section>
    <div className="saved-spots-filters" role="group" aria-label="찜한 스팟 분류">
      {categories.map(({ key, label, icon }) => <button type="button" key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>
        {icon && <span aria-hidden="true">{icon}</span>} {label} <small>{key === 'all' ? total : items.filter(item => groupFor(item) === key).length}</small>
      </button>)}
    </div>
    <div className="saved-spots-sort"><select aria-label="찜한 스팟 정렬" value={sort} onChange={event => setSort(event.target.value === 'name' ? 'name' : 'recent')}>
      <option value="recent">최근 찜한 순</option><option value="name">이름순</option>
    </select></div>
    <div className="saved-spots-list">{visible.map(item => <SavedSpotCard key={item.id} item={item} rating={ratings.get(item.id)} onPick={onPick} />)}</div>
    {visible.length === 0 && <div className="saved-spots-empty">
      <p>{filter === 'all' ? '아직 표시할 찜한 스팟이 없어요.' : '이 분류에 찜한 스팟이 없어요.'}</p>
      <button type="button" onClick={filter === 'all' ? onExplore : () => setFilter('all')}>{filter === 'all' ? '탐색에서 스팟 찾기' : '전체 보기'}</button>
    </div>}
    {filter === 'all' && total > items.length && <p className="saved-spots-note">이전에 찜한 {total - items.length}곳은 탐색에서 장소 정보를 다시 확인해 주세요.</p>}
  </div>;
}
