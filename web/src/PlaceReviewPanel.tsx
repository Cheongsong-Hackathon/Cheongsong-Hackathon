import { useState } from 'react';
import type { Item } from './api';
import { placeReviews, savePlaceReview } from './placeReviews';

export default function PlaceReviewPanel({ item }: { item: Item }) {
  const [review, setReview] = useState(() => placeReviews().find(row => row.place.id === item.id));
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [text, setText] = useState(review?.text ?? '');
  const [error, setError] = useState('');

  return <section className="place-review-panel" aria-label="장소 평점과 리뷰">
    <header>
      <h2>평점과 리뷰</h2>
      <span>{review ? <>★ {review.rating.toFixed(1)} <small>리뷰 1개</small></> : '평점 없음'}</span>
    </header>
    <p className="place-review-note">이 기기에 남긴 방문 리뷰예요.</p>
    {review ? <article><strong>내 리뷰 · {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</strong><p>{review.text}</p></article> : <p>아직 남긴 리뷰가 없어요.</p>}
    {!editing ? <button type="button" className="btn ghost" onClick={() => setEditing(true)}>{review ? '내 리뷰 수정' : '리뷰 남기기'}</button> :
      <form onSubmit={event => {
        event.preventDefault();
        if (!rating || !text.trim()) return;
        const next = { place: item, rating, text: text.trim(), updatedAt: Date.now() };
        try {
          savePlaceReview(next);
          setReview(next);
          setEditing(false);
          setError('');
        } catch {
          setError('리뷰를 저장하지 못했어요. 저장 공간을 확인해 주세요.');
        }
      }}>
        <div className="place-rating-picker" role="group" aria-label="별점 선택">
          {[1, 2, 3, 4, 5].map(value => <button key={value} type="button" aria-label={`${value}점`} aria-pressed={rating === value} onClick={() => setRating(value)}>{value <= rating ? '★' : '☆'}</button>)}
        </div>
        <label>방문 후기<textarea value={text} maxLength={600} onChange={event => setText(event.target.value)} required /></label>
        {error && <p role="alert">{error}</p>}
        <div className="place-review-actions">
          <button className="btn ghost" type="button" onClick={() => { setEditing(false); setRating(review?.rating ?? 0); setText(review?.text ?? ''); setError(''); }}>취소</button>
          <button className="btn" disabled={!rating || !text.trim()}>리뷰 저장</button>
        </div>
      </form>}
  </section>;
}
