import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LIVE_KINDS, parseLiveBooking, toLiveCandidate } from '../src/services/livePlaces.js';
import { rankForPrefs, type Prefs } from '../src/services/match.js';

const doc = (o: Record<string, string>) => ({ id: '123', place_name: '보드게임놀이터', category_name: '가정,생활 > 여가시설 > 보드카페', x: '128.5955', y: '35.869', distance: '106', ...o });

test('실시간 가게: 업종이 맞으면 후보로 (제목·태그는 서버 목록, 이름·거리는 카카오)', () => {
  const c = toLiveCandidate('board', doc({}));
  assert.ok(c);
  assert.equal(c.id, 'live:board:123');
  assert.equal(c.title, LIVE_KINDS.board.title);
  assert.equal(c.placeName, '보드게임놀이터');
  assert.equal(c.walkMinutes, 2);
  assert.equal(c.mapUrl, 'https://map.naver.com/p/search/' + encodeURIComponent('보드게임놀이터'));
  assert.deepEqual(c.tags, LIVE_KINDS.board.tags);
});

test('실시간 가게: 검색어는 맞아도 업종이 다르면 버림 (보드게임카페로 찾았는데 방탈출 테마카페, 공원으로 찾았는데 빌라)', () => {
  assert.equal(toLiveCandidate('board', doc({ category_name: '음식점 > 카페 > 테마카페' })), null);
  assert.equal(toLiveCandidate('park', doc({ category_name: '부동산 > 주거시설 > 빌라,주택' })), null);
  assert.ok(toLiveCandidate('park', doc({ category_name: '여행 > 공원 > 도시근린공원' })));
});

test('실시간 가게: 좌표·거리가 없으면 버림', () => {
  assert.equal(toLiveCandidate('board', doc({ distance: '' })), null);
  assert.equal(toLiveCandidate('board', doc({ x: 'abc' })), null);
});

test('실시간 가게는 시간대가 없어도 추천에서 빠지지 않음', () => {
  const c = toLiveCandidate('karaoke', doc({ category_name: '가정,생활 > 여가시설 > 노래방 > 코인노래방' }))!;
  const p: Prefs = { need: '풀기', energy: '보통', want: [], avoid: [], minutes: Infinity, walk: 20, budget: Infinity };
  assert.deepEqual(rankForPrefs([c], p).items.map((i) => i.id), [c.id]);
});

test('가기로 한 곳 기록: 종류는 서버 목록에서만, 화면이 보낸 건 가게 이름·좌표뿐', () => {
  assert.deepEqual(parseLiveBooking({ experienceId: 'live:board:123', placeName: ' 보드게임놀이터 ', lat: 35.869, lng: 128.5955, title: '아무거나' }), {
    kind: 'board', placeName: '보드게임놀이터', lat: 35.869, lng: 128.5955,
  });
  assert.equal(parseLiveBooking({ experienceId: 'live:bar:1', placeName: 'x', lat: 35, lng: 128 }), null); // 목록에 없는 종류
  assert.equal(parseLiveBooking({ experienceId: 'live:board:1', placeName: '', lat: 35, lng: 128 }), null);
  assert.equal(parseLiveBooking({ experienceId: 'live:board:1', placeName: 'x'.repeat(61), lat: 35, lng: 128 }), null);
  assert.equal(parseLiveBooking({ experienceId: 'live:board:1', placeName: 'x' }), null); // 좌표 없음
  assert.equal(parseLiveBooking({ experienceId: 'quiet-cafe' }), null); // 일반 체험은 여기 해당 없음
});
