import { useEffect, useState } from 'react';
import { api, type FreePlace, type LatLng } from './api';
import { LoadState } from './screens';

function mapUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname === 'map.naver.com' ? url.href : null;
  } catch { return null; }
}

export default function FreePlaces({ position, locationKey }: {
  position: () => Promise<LatLng | null>;
  locationKey: string;
}) {
  const [items, setItems] = useState<FreePlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setDisabled(false);
    setItems([]);
    async function load() {
      const r = await api.freePlaces(await position());
      if (!active) return;
      setLoading(false);
      if (r.disabled) { setDisabled(true); return; }
      if (r.code !== 200 || !r.items) {
        setError(r.error ?? '주변 장소를 불러오지 못했어. 다시 해 줄래?');
        return;
      }
      setItems(r.items);
    }
    load();
    return () => { active = false; };
  }, [locationKey, attempt]);

  if (disabled) return null;
  return (
    <section className="free-places" aria-label="주변에 머물 곳">
      <h2 className="label">부담 없이 머물 곳</h2>
      <p className="small mute">가까운 카페·도서관·공원이야. 카페 주문이나 일부 시설 이용에는 비용이 들 수 있어. 운영시간과 이용 조건은 지도에서 확인해 줘.</p>
      {(loading || error) && <LoadState loading={loading} message={error || '주변에 머물 곳을 찾는 중이야…'} onRetry={() => setAttempt((n) => n + 1)} />}
      {!loading && !error && !items.length && <p className="empty">근처에서 찾은 장소가 없어. 기준 주소를 바꿔 봐도 좋아.</p>}
      {items.map((place) => {
        const url = mapUrl(place.url);
        return (
          <article className="card" key={place.id}>
            <span className="eyebrow">{place.kind} · 도보 약 {place.walkMinutes}분</span>
            <strong>{place.name}</strong>
            <p className="small mute">{place.address}</p>
            {url && <a className="btn ghost" href={url} target="_blank" rel="noopener noreferrer" aria-label={`${place.name} 길 안내, 네이버 지도 새 창`}>길 안내 ↗</a>}
          </article>
        );
      })}
    </section>
  );
}
