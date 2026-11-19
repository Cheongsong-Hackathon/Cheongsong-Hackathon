import assert from 'node:assert/strict';
import { test } from 'node:test';
import { historyEffects, rankForPrefs, rankFresh, type Prefs, type TaggedCandidate } from '../src/services/match.js';

const c = (id: string, tags: string[], o: Partial<TaggedCandidate> = {}): TaggedCandidate => ({
  id, title: id, category: id, minutes: 30, price: 10000, moods: [], energyNeed: 20, description: '', placeId: 'p', slots: ['19:00'],
  placeName: 'p', lat: 0, lng: 0, distanceM: 900, walkMinutes: 14, availableSlots: ['19:00'], tags, ...o,
});
const CANDS = [
  c('pottery', ['손으로 만들기', '조용함', '혼자 가능', '실내'], { walkMinutes: 20, price: 18000 }),
  c('calligraphy', ['손으로 만들기', '조용함', '혼자 가능', '실내'], { walkMinutes: 16, price: 15000 }),
  c('meditation', ['가만히 쉬기', '조용함', '혼자 가능', '실내'], { walkMinutes: 13 }),
  c('karaoke', ['소리 내기', '혼자 가능', '실내'], { walkMinutes: 11, price: 3000, energyNeed: 50 }),
  c('boardgame', ['같이 하기', '사람 많음', '실내'], { walkMinutes: 12, price: 8000, minutes: 60, energyNeed: 40 }),
  c('climbing', ['몸 쓰기', '사람 많음', '실내'], { walkMinutes: 18, price: 25000, minutes: 90, energyNeed: 70 }),
];
const p = (o: Partial<Prefs> = {}): Prefs => ({ need: null, energy: '보통', want: [], avoid: [], minutes: 60, walk: 20, budget: 20000, ...o });
const ids = (r: { items: { id: string }[] }) => r.items.map((i) => i.id);

test('"머리가 꽉 찼어"(비우기): 조용하고 손으로 하는 것만, 노래방·보드게임은 안 나옴', () => {
  const r = rankForPrefs(CANDS, p({ need: '비우기' }));
  assert.ok(ids(r).every((id) => ['pottery', 'calligraphy', 'meditation'].includes(id)), ids(r).join());
  assert.equal(r.relaxed.length, 0);
});

test('지난 기분 변화: 도자기 4→8이면 손으로 만드는 체험이 위로', () => {
  const fx = historyEffects([
    { id: 'pottery', tags: ['손으로 만들기', '조용함', '혼자 가능', '실내'], before: 4, after: 8 },
    { id: 'karaoke', tags: ['소리 내기', '혼자 가능', '실내'], before: 5, after: 5 },
  ]);
  assert.equal(fx.byExp.get('pottery'), 4);
  const r = rankForPrefs(CANDS, p({ need: '비우기' }), fx);
  assert.equal(r.items[0].id, 'pottery'); // 실제로 효과가 있었던 체험이 1위 (더 멀어도)
  assert.ok(r.items[0].why.some((w) => w.includes('전에 해 보고 기분이 올랐음')));
  assert.ok(r.items[1].why.some((w) => w.includes('비슷한 체험 뒤 기분이 올랐음')));
});

test('조건은 반드시 지킴: 예산·도보·시간·피할 것·이미 본 것', () => {
  const r = rankForPrefs(CANDS, p({ need: '비우기', budget: 15000, walk: 25 }), undefined, ['meditation']);
  assert.deepEqual(ids(r), ['calligraphy']); // 도자기는 1만8천원이라 예산 초과, 명상은 이미 봄
  assert.deepEqual(r.relaxed, []);
  const noCrowd = rankForPrefs(CANDS, p({ need: '즐기기', avoid: ['사람 많음'] }));
  assert.ok(!ids(noCrowd).some((id) => ['boardgame', 'climbing'].includes(id)));
});

test('맞는 게 없으면 조건을 한 단계씩 넓히고 알려 줌, 피할 것은 넓히지 않음', () => {
  const r = rankForPrefs(CANDS, p({ need: '비우기', walk: 10 }));
  assert.deepEqual(r.relaxed, ['도보 10분 더']);
  assert.ok(r.items.length > 0 && r.items.every((i) => i.walkMinutes <= 20));
  const none = rankForPrefs(CANDS, p({ need: '풀기', avoid: ['소리 내기', '몸 쓰기'] }));
  assert.equal(none.items.length, 0); // 채워 넣지 않음
});

test('사용자가 직접 좁힌 조건(멀어)은 넓히지 않음 (시나리오 1 실패 재현)', () => {
  // 실제 실패: "좀 멀다" 뒤 맞는 게 없자 도보를 다시 넓혀 20분짜리가 돌아옴
  const r = rankForPrefs(CANDS, p({ need: '비우기', walk: 12 }), undefined, [], ['walk']);
  assert.ok(r.items.every((i) => i.walkMinutes <= 12), ids(r).join());
  assert.ok(!r.relaxed.includes('도보 10분 더'));
});

test('실내·혼자 가능 같은 일반 태그만 맞는 건 "맞는 추천"이 아님, 필요와 반대되는 건 빠짐 (시나리오 1 실패 재현)', () => {
  // 실제 실패: 원함에 "실내"가 들어가 코인노래방이 "머리 비우기" 추천에 끼어듦
  const r = rankForPrefs(CANDS, p({ need: '비우기', want: ['손으로 만들기', '실내'], walk: 15 }));
  assert.ok(!ids(r).includes('karaoke'), ids(r).join());
  const onlyIndoor = rankForPrefs(CANDS, p({ want: ['실내'] }));
  assert.ok(onlyIndoor.items.length > 0); // 활동 특징을 모르면 일반 태그로 거르지 않음
  const rest = rankForPrefs(CANDS, p({ need: '쉬기', energy: '높음' }));
  assert.ok(!ids(rest).some((id) => ['karaoke', 'climbing', 'boardgame'].includes(id)), ids(rest).join());
});

test('필요 6분류의 경계: 몰입은 해내는 것(조용히 있기만 하는 건 아님), 연결은 함께하는 것, 즐기기는 노래방도 됨', () => {
  // 비우기와 몰입이 평가에서 헷갈렸던 경계: 몰입(숙달)은 손으로·몸으로 해내는 것, 조용함은 비우기 쪽
  const focus = ids(rankForPrefs(CANDS, p({ need: '몰입' })));
  assert.ok(focus.includes('pottery') && focus.includes('calligraphy'), focus.join());
  assert.ok(!focus.includes('meditation'), focus.join());
  const connect = ids(rankForPrefs(CANDS, p({ need: '연결' })));
  assert.deepEqual(connect, ['boardgame']);
  const fun = ids(rankForPrefs(CANDS, p({ need: '즐기기' })));
  assert.ok(fun.includes('karaoke'), fun.join());
});

test('기운이 없으면 힘든 체험은 점수가 깎여 빠짐', () => {
  const r = rankForPrefs(CANDS, p({ need: '풀기', energy: '거의 없음' }));
  assert.ok(!ids(r).includes('climbing'));
});

test('"다른 거 보여 줘"를 계속 눌러 맞는 걸 다 봤으면: 빈 결과 대신 본 것 중에서 다시 (막다른 길 재현, 2026-11-19)', () => {
  const first = rankForPrefs(CANDS, p({ need: '비우기' }));
  const seen = ids(first);
  assert.equal(rankForPrefs(CANDS, p({ need: '비우기' }), undefined, seen).items.length, 0); // 지금 동작: 아무것도 없음
  const r = rankFresh(CANDS, p({ need: '비우기' }), undefined, seen);
  assert.ok(r.items.length > 0);
  assert.equal(r.repeat, true);
});

test('새로 보여 줄 게 있으면 본 것은 빼고, 다시 보여 주기 표시도 없음', () => {
  const r = rankFresh(CANDS, p({ need: '비우기' }), undefined, ['meditation']);
  assert.ok(!ids(r).includes('meditation'));
  assert.equal(r.repeat, false);
});

test('근처에 체험이 하나도 없으면(다른 동네) 다시 보여 줄 것도 없음', () => {
  const r = rankFresh([], p({ need: '쉬기' }), undefined, ['meditation']);
  assert.equal(r.items.length, 0);
});
