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

test('카카오 가게 ↔ 구글 장소: 80m 안이고 이름이 겹칠 때만 같은 가게 (이름만 보면 다른 가게가 걸림: 히어로보드게임 → 비둘기는멍청해보여)', async () => {
  const { sameStore } = await import('../src/services/googlePhoto.js');
  assert.equal(sameStore('세븐스타코인노래연습장 대구동성로점', '세븐스타 코인노래연습장', 30), true); // 지점명 차이
  assert.equal(sameStore('펀잇 대구동성로점', '펀잇', 50), true);
  assert.equal(sameStore('히어로보드게임카페 영남대점', '비둘기는멍청해보여', 40), false); // 가까워도 이름이 다름
  assert.equal(sameStore('카페솜', '카페솜', 300), false); // 이름이 같아도 멀면 다른 지점
});

test('같은 가게 판정 완화: 문장부호 무시, 아주 가까우면(30m) 앞 4글자만 같아도 (천마볼링센타↔천마볼링장, 228↔2·28)', async () => {
  const { sameStore } = await import('../src/services/googlePhoto.js');
  assert.equal(sameStore('천마볼링센타', '천마볼링장', 7), true);
  assert.equal(sameStore('228기념중앙공원 청소년광장', '2·28기념중앙공원', 62), true);
  assert.equal(sameStore('천마볼링센타', '천마볼링장', 60), false); // 앞글자만 같으면 아주 가까울 때만
  assert.equal(sameStore('펀잇 대구동성로점', '오티티프라이빗 동성로점', 20), false); // 지점명만 같은 건 다른 가게
});

test('설문 2위 전시·7위 셀프 사진관: 미술관·화랑, 즉석사진 업종만 (갤러리로 찾으면 보드카페·미용실도 섞임)', () => {
  assert.ok(toLiveCandidate('museum', doc({ place_name: '인교갤러리', category_name: '문화,예술 > 문화시설 > 미술관' })));
  assert.ok(toLiveCandidate('gallery', doc({ place_name: '갤러리청아', category_name: '문화,예술 > 미술,공예 > 화랑' })));
  assert.equal(toLiveCandidate('gallery', doc({ place_name: '조인철헤어갤러리', category_name: '서비스,산업 > 미용 > 미용실' })), null);
  assert.equal(toLiveCandidate('gallery', doc({ place_name: '갤러리보드게임카페', category_name: '가정,생활 > 여가시설 > 보드카페' })), null);
  const ph = toLiveCandidate('photo', doc({ place_name: '인생네컷 대구영남대점', category_name: '서비스,산업 > 사진 > 사진관,포토스튜디오 > 즉석사진 > 인생네컷' }));
  assert.ok(ph?.tags.includes('같이 하기'));
  assert.equal(LIVE_KINDS.museum.title, LIVE_KINDS.gallery.title); // 같은 "전시"라 종류 섞기에서 한 종류로 본다
});

test('무료로 쉬는 곳: 도서관·카페 (2026-11-19 영남대·동성로 카카오 검색 결과로 확인)', () => {
  assert.ok(toLiveCandidate('library', doc({ place_name: '영남대학교 중앙도서관', category_name: '교육,학문 > 학습시설 > 도서관' })));
  assert.ok(toLiveCandidate('library', doc({ place_name: '푸른도서관', category_name: '교육,학문 > 학습시설 > 도서관 > 작은도서관' })));
  assert.equal(toLiveCandidate('library', doc({ place_name: '온누리장난감도서관 3호관', category_name: '가정,생활 > 유아 > 장난감,완구 > 장난감대여' })), null);
  assert.equal(toLiveCandidate('library', doc({ place_name: '대구시청작은도서관 화장실', category_name: '가정,생활 > 화장실' })), null);
  assert.ok(toLiveCandidate('cafe', doc({ place_name: '카페솜', category_name: '음식점 > 카페' })));
  assert.ok(toLiveCandidate('cafe', doc({ place_name: '포포모모', category_name: '음식점 > 카페 > 테마카페 > 디저트카페' })));
  // "카페"로 찾으면 섞이는 것: 보드게임카페·스터디카페·방탈출·PC방, 업종이 그냥 테마카페인 룸카페·방탈출
  for (const category_name of [
    '가정,생활 > 여가시설 > 보드카페', '서비스,산업 > 전문대행 > 공간대여 > 스터디카페,스터디룸', '가정,생활 > 여가시설 > 방탈출카페',
    '가정,생활 > 여가시설 > 게임방,PC방', '음식점 > 카페 > 테마카페', '음식점 > 한식',
  ])
    assert.equal(toLiveCandidate('cafe', doc({ category_name })), null, category_name);
  assert.equal(LIVE_KINDS.library.energyNeed, 0);
  assert.deepEqual(LIVE_KINDS.cafe.tags, ['가만히 쉬기', '혼자 가능', '실내']);
});

test('그림 키: 새로 그린 그림으로', () => {
  const art = Object.fromEntries(Object.entries(LIVE_KINDS).map(([k, v]) => [k, v.art]));
  assert.deepEqual(
    [art.bowling, art.photo, art.park, art.museum, art.gallery, art.library, art.cafe],
    ['bowling', 'camera', 'park', 'gallery', 'gallery', 'library', 'cafe'],
  );
});

test('예시 매장 체험: 매장이 실제로 하는지 모르는 말은 하지 않고, 같은 업종의 실시간 종류와 똑같이 보인다', async () => {
  const { EXPERIENCES } = await import('../src/setup.js');
  const byId = Object.fromEntries(EXPERIENCES.map((e) => [e[0], e]));
  const same: Record<string, string> = { 'quiet-cafe': 'cafe', 'mini-pottery': 'pottery', 'mini-bouquet': 'flower', boardgame: 'board', karaoke: 'karaoke', climbing: 'climbing' };
  for (const [id, kind] of Object.entries(same)) {
    const [, , title, art, , , , , desc] = byId[id];
    assert.deepEqual([title, art, desc], [LIVE_KINDS[kind].title, LIVE_KINDS[kind].art, LIVE_KINDS[kind].description], id);
  }
  assert.equal(byId['my-scent'][2], '향 공방 원데이 클래스');
  assert.equal(byId.meditation[8], '체험 수업이 있는지 네이버에서 확인해 봐요.');
  for (const e of EXPERIENCES) {
    assert.doesNotMatch(e[2], /\d+분/, e[0]);
    assert.doesNotMatch(e[8], /30ml|장비 대여|직원/, e[0]);
  }
});

test('예시 매장 + 실시간 가게 합치기: 띄어쓰기만 다른 같은 가게는 예시 매장 쪽만 남김 (둘러보기·대화 공용)', async () => {
  const { mergeCandidates } = await import('../src/services/livePlaces.js');
  const db = toLiveCandidate('climbing', doc({ id: '1', place_name: '챌린져클라이밍센터 영대점', category_name: '스포츠,레저 > 클라이밍' }))!;
  const dup = toLiveCandidate('climbing', doc({ id: '2', place_name: '챌린져 클라이밍센터영대점', category_name: '스포츠,레저 > 클라이밍' }))!;
  const other = toLiveCandidate('karaoke', doc({ id: '3', place_name: 'Seven Star 노래방', category_name: '가정,생활 > 여가시설 > 노래방' }))!;
  const out = mergeCandidates([{ ...db, live: undefined, id: 'climbing' }], [dup, other]);
  assert.deepEqual(out.map((c) => c.id), ['climbing', other.id]); // 영문 s가 지워지지 않고, 띄어쓰기만 무시
});
