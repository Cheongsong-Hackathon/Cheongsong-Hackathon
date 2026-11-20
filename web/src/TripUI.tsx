import MumuArtwork from './MumuArtwork';
import {useSavedPlace} from './savedPlaces';
import {placeCategory} from './placeCategories';
import type { Item } from './api';
import PlaceArt from './PlaceArt';
import { PhoneStatus } from './MumuWelcome';
export function TripHeader({title,onNotice,onSearch,onBack,searchLabel='장소 검색 열기'}:{
  title?:string;onNotice?:()=>void;onSearch?:()=>void;onBack?:()=>void;searchLabel?:string;
}){
  return <>
    <PhoneStatus/>
    <header className="trip-brand">
      {onBack ? <button type="button" aria-label="마이페이지로 돌아가기" onClick={onBack}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button> : <MumuArtwork className="mumu-brand-logo"/>}
      <div>
        {onNotice&&<button type="button" aria-label="예약 알림 보기" onClick={onNotice}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3ZM10 21h4M12 2v2"/></svg></button>}
        {onSearch&&<button type="button" aria-label={searchLabel} onClick={onSearch}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg></button>}
      </div>
    </header>
    {title&&<h1 className="trip-page-title">{title}</h1>}
  </>;
}
export function PlaceTile({item,rank,onPick,compact=false}:{item:Item;rank?:number;onPick:(item:Item)=>void;compact?:boolean}){const {saved,toggle}=useSavedPlace(item);return <article className={`trip-place ${compact?'compact':''}`}><button className="trip-place-open" onClick={()=>onPick(item)} aria-label={`${item.placeName||item.title} 상세 보기`}><div className="trip-photo"><PlaceArt placeId={item.placeId} hasPhoto={item.hasPhoto} photo={item.photo} category={placeCategory(item.category).key} className="trip-photo-art"/>{rank&&<span className="trip-rank">{rank}</span>}</div><div className="trip-place-content"><span className="trip-category">{placeCategory(item.category).label}</span><strong>{item.placeName||item.title}</strong><p>{item.reason??item.description??'오늘 기분에 어울리는 작은 외출'}</p><small>♧ 도보 {item.walkMinutes??'–'}분</small></div></button><button className="trip-save" aria-label={`${item.placeName||item.title} 저장`} aria-pressed={saved} onClick={toggle}>{saved?'♥':'♡'}</button></article>;}
