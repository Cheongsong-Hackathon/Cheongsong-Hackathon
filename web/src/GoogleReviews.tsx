import { useEffect, useState } from 'react';
import { api, type LatLng, type PlaceReview } from './api';

/** 근처 장소의 실제 Google 리뷰. 작성자·별점·시점·출처를 그대로 보여 주고, 우리 커뮤니티 글처럼 꾸미지 않는다 */
export default function GoogleReviews({ position }: { position?: () => Promise<LatLng | null> }) {
  const [items, setItems] = useState<PlaceReview[] | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await api.placeReviews(position ? await position() : null);
      if (alive) setItems(r.items ?? []);
    })();
    return () => { alive = false; };
  }, []);
  if (!items?.length) return null;
  return <section className="google-reviews" aria-label="근처 장소 실제 Google 리뷰">
    <header><h2>근처 장소 실제 리뷰</h2><small>Google 지도 리뷰</small></header>
    <div className="google-review-row">
      {items.map((r) => <article key={r.placeName + r.author} className="google-review">
        {r.photo && <img src={r.photo.uri} alt={`${r.placeName} 사진`} referrerPolicy="no-referrer" loading="lazy" />}
        <div className="google-review-body">
          <strong>{r.placeName}</strong>
          <span className="google-review-stars" aria-label={`별점 ${r.rating}점`}>{'★'.repeat(Math.round(r.rating))}{'☆'.repeat(5 - Math.round(r.rating))}</span>
          <p>{r.text}</p>
          <small>{r.authorUri ? <a href={r.authorUri} target="_blank" rel="noopener noreferrer">{r.author}</a> : r.author}{r.when && ` · ${r.when}`} · {r.mapsUri ? <a href={r.mapsUri} target="_blank" rel="noopener noreferrer">Google 지도</a> : 'Google 지도'}</small>
          {r.photo && <small className="google-review-credit">사진: {r.photo.authorUri ? <a href={r.photo.authorUri} target="_blank" rel="noopener noreferrer">{r.photo.author}</a> : r.photo.author}</small>}
        </div>
      </article>)}
    </div>
  </section>;
}
