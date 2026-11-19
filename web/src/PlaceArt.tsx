// 체험 카드 그림 자리: 매장의 실제 사진(구글)이 있으면 사진, 없으면 지금 그림.
// 큰 사진(credit)에는 구글 정책대로 사진 올린 사람을 표시한다. 작은 썸네일은 생략 가능(큰 사진에서 보이므로).
import { useEffect, useState } from 'react';
import Art from './Art';

type Photo = { uri: string; author: string; authorUri: string | null };

export default function PlaceArt({ placeId, category, className, credit = false }: { placeId?: string; category: string; className: string; credit?: boolean }) {
  const [photo, setPhoto] = useState<Photo | null>(null);
  useEffect(() => {
    setPhoto(null);
    if (!placeId) return;
    let alive = true;
    fetch(`/api/places/${encodeURIComponent(placeId)}/photo`)
      .then((r) => (r.status === 200 ? r.json() : null))
      .then((p) => alive && p?.uri && setPhoto(p))
      .catch(() => {});
    return () => { alive = false; };
  }, [placeId]);

  if (!photo) return <Art category={category} className={className} />;
  return (
    <span className={`${className} place-photo`}>
      <img src={photo.uri} alt="" referrerPolicy="no-referrer" onError={() => setPhoto(null)} />
      {credit && (
        <small>
          사진: {photo.authorUri ? <a href={photo.authorUri} target="_blank" rel="noopener noreferrer">{photo.author}</a> : photo.author} · Google
        </small>
      )}
    </span>
  );
}
