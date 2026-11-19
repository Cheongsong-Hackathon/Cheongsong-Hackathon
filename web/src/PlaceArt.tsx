// 체험 카드 그림 자리: 매장의 실제 사진(구글)이 있으면 사진, 없으면 지금 그림.
// 사진 있는 매장(hasPhoto)은 그림을 먼저 띄웠다가 바꾸지 않고, 빈 자리를 은은하게 깜빡이다 사진이 다 받아지면 서서히 보여 준다.
// 큰 사진(credit)에는 구글 정책대로 사진 올린 사람을 표시한다. 작은 썸네일은 생략 가능(큰 사진에서 보이므로).
import { useEffect, useState } from 'react';
import Art from './Art';
import type { PlacePhoto as Photo } from './api';

// photo: 추천과 함께 온 사진(있으면 그대로 씀, null이면 사진 없음). 안 왔으면(undefined) hasPhoto일 때 서버에 따로 묻는다
export default function PlaceArt(p: { placeId?: string; hasPhoto?: boolean; photo?: Photo | null; category: string; className: string; credit?: boolean }) {
  const [fetched, setPhoto] = useState<Photo | null>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setPhoto(null);
    setFailed(false);
    setLoaded(false);
    if (p.photo !== undefined || !p.hasPhoto || !p.placeId) return;
    let alive = true;
    fetch(`/api/places/${encodeURIComponent(p.placeId)}/photo`)
      .then((r) => (r.status === 200 ? r.json() : null))
      .then((x) => alive && (x?.uri ? setPhoto(x) : setFailed(true)))
      .catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [p.placeId, p.hasPhoto, p.photo]);

  const photo = p.photo !== undefined ? p.photo : fetched;
  const waiting = p.photo === undefined && p.hasPhoto;
  if (failed || (!photo && !waiting)) return <Art category={p.category} className={p.className} />;
  return (
    <span className={`${p.className} place-photo${loaded ? ' loaded' : ''}`} aria-busy={!loaded}>
      {photo && <img src={photo.uri} alt="" referrerPolicy="no-referrer" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />}
      {photo && loaded && p.credit && (
        <small>
          사진: {photo.authorUri ? <a href={photo.authorUri} target="_blank" rel="noopener noreferrer">{photo.author}</a> : photo.author} · <span translate="no">Google Maps</span>
        </small>
      )}
    </span>
  );
}
