// 둘러보기 탭: 대화 없이 "지금 필요한 것"만 골라 근처 실제 가게를 본다.
// 설문 1위 기능 "주변 장소 탐색"(74%), 자유 응답 "카테고리별로 먼저 보여 주기"·"AI가 못 알아들으면 답답하다".
// 고른 뒤 흐름(확인 → 네이버 → 다녀왔어 → 무무 성장)은 대화 추천과 같다.
import { useEffect, useState } from 'react';
import { api, type Item, type LatLng } from './api';
import { DemoNote, ExpCard, LoadState } from './screens';

// 서버의 필요 6가지(match.ts NEEDS)를 사용자 말로
const NEEDS: [string | null, string][] = [
  [null, '전체'],
  ['쉬기', '조용히 쉬고 싶어'],
  ['비우기', '생각 비우고 싶어'],
  ['풀기', '털어내고 싶어'],
  ['즐기기', '재밌는 거'],
  ['연결', '누구랑 같이'],
  ['몰입', '뭔가 만들어 보기'],
];

export default function Browse(p: { position: () => Promise<LatLng | null>; locationKey: string; onPick: (i: Item) => void }) {
  const [need, setNeed] = useState<string | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setItems(null);
    setError('');
    p.position()
      .then((pos) => api.browse(pos, need))
      .then((r) => {
        if (!alive) return;
        if (r.code === 200 && r.items) setItems(r.items);
        else setError(r.error ?? '근처 가게를 불러오지 못했어. 다시 해 줄래?');
      });
    return () => { alive = false; };
  }, [need, p.locationKey, attempt]);

  return (
    <div className="page">
      <DemoNote />
      <h1 className="title">둘러보기</h1>
      <div className="chips browse-needs" role="radiogroup" aria-label="지금 필요한 것">
        {NEEDS.map(([v, label]) => (
          <button key={label} className={`chip${need === v ? ' on' : ''}`} role="radio" aria-checked={need === v} onClick={() => setNeed(v)}>
            {label}
          </button>
        ))}
      </div>
      {!items && <LoadState loading={!error} message={error || '근처 가게 찾는 중…'} onRetry={() => setAttempt((n) => n + 1)} />}
      {items?.length === 0 && <p className="empty">이 근처에선 맞는 곳을 못 찾았어. 다른 걸 골라 보거나 장소를 바꿔 볼래?</p>}
      <div className="list">
        {items?.map((i) => (
          <ExpCard key={i.id} item={i} onPick={() => p.onPick(i)}>
            <span className="reason plain">{i.placeName}</span>
          </ExpCard>
        ))}
      </div>
      {!!items?.length && (
        <p className="small center mute">
          추천 순서는 돈으로 바뀌지 않아요. 고른 것과 거리만 봐요.
          {items.some((i) => i.photo) && <> 가게 사진은 <span translate="no">Google Maps</span>.</>}
        </p>
      )}
    </div>
  );
}
