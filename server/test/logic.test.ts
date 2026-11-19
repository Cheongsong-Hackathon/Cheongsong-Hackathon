import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { itemsUnlockedBetween, stageOf } from '../src/services/growth.js';
import { callJson, extractJson, FallbackClient, type LLMClient } from '../src/services/llm.js';
import type { Place } from '../src/services/places.js';
import { parseCheckin } from '../src/services/checkin.js';
import { addMinutes, availableSlots, filterExperiences, finalizePicks, toCandidates, walkMinutes, type Candidate, type Experience } from '../src/services/recommend.js';
import { naverMapUrl, pickFree, toFreePlace, type FreePlace } from '../src/services/kakao.js';
import { SafetyGuard } from '../src/services/safety.js';

const fake = (name: string, ...outs: (string | Error)[]): LLMClient & { calls: number } => ({
  name,
  calls: 0,
  async complete() {
    const o = outs[Math.min(this.calls++, outs.length - 1)];
    if (o instanceof Error) throw o;
    return o;
  },
});
const A = z.object({ a: z.number() });

test('SafetyGuard: 위기 키워드는 잡고 관용구는 통과', () => {
  assert.equal(SafetyGuard.check('그냥 죽고 싶어'), true);
  assert.equal(SafetyGuard.check('죽고싶다'), true);
  assert.equal(SafetyGuard.check('다 사라지고 싶 어'), true);
  assert.equal(SafetyGuard.check('사는 게 의미가 없는 것 같아'), true);
  assert.equal(SafetyGuard.check('살 이유가 없어'), true);
  assert.equal(SafetyGuard.check('이 과제는 의미가 없는 것 같아'), false);
  assert.equal(SafetyGuard.check('배고파 죽겠네'), false);
  assert.equal(SafetyGuard.check('오늘 좀 심심해'), false);
});

test('LLM의 CRISIS 판단은 다른 필드가 어긋나도 잃지 않는다', async () => {
  const { ChatOut } = await import('../src/services/chat.js');
  assert.equal(ChatOut.parse({ reply: '', risk: 'crisis', mood: 3 }).risk, 'CRISIS');
  assert.equal(ChatOut.parse({ risk: ' CRISIS ' }).risk, 'CRISIS');
  assert.equal(ChatOut.parse({ reply: 1, risk: '몰라' }).risk, 'NONE');
  const { toId } = await import('../src/db.js');
  assert.deepEqual([5, '7', 'abc', 1.5, 1e12, -1, null].map(toId), [5, 7, -1, -1, -1, -1, -1]);
});

test('extractJson: 설명과 코드펜스가 붙어도 꺼낸다', () => {
  assert.deepEqual(extractJson('알겠어!\n```json\n{"a":1,"s":"}{"}\n```\n끝'), { a: 1, s: '}{' });
  assert.throws(() => extractJson('JSON 아님'));
});

test('LLM: 주 공급자가 429면 예비로 넘어간다', async () => {
  const primary = fake('primary', new Error('HTTP 429'));
  const backup = fake('fallback', '{"a":2}');
  assert.deepEqual(await callJson(new FallbackClient([primary, backup]), 's', 'u', A), { a: 2 });
  assert.equal(backup.calls, 1);
});

test('LLM: 둘 다 실패하면 null (기본 답장으로 대체)', async () => {
  const chain = new FallbackClient([fake('primary', new Error('timeout')), fake('fallback', new Error('HTTP 500'))]);
  assert.equal(await callJson(chain, 's', 'u', A), null);
  assert.equal(await callJson(null, 's', 'u', A), null);
});

test('LLM: 스키마 검증 실패는 1번 재시도, 그래도 틀리면 null', async () => {
  assert.deepEqual(await callJson(fake('c', '{"a":"x"}', '{"a":3}'), 's', 'u', A), { a: 3 });
  const bad = fake('c', '엉뚱한 말');
  assert.equal(await callJson(bad, 's', 'u', A), null);
  assert.equal(bad.calls, 2);
});

test('OpenAICompatClient: 실제 HTTP로 응답을 읽고, 느리면 타임아웃, 429면 오류', async () => {
  const { createServer } = await import('node:http');
  const { OpenAICompatClient } = await import('../src/services/llm.js');
  let seen: any;
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', () => {
      seen = { url: req.url, auth: req.headers.authorization, body: JSON.parse(body) };
      if (seen.body.model === 'slow') return void setTimeout(() => res.end('{}'), 2000);
      if (seen.body.model === 'limited') return void res.writeHead(429).end('{}');
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ choices: [{ message: { content: '```json\n{"a":7}\n```' } }] }));
    });
  });
  await new Promise<void>((r) => server.listen(0, r));
  const baseUrl = `http://localhost:${(server.address() as any).port}/v1/`;
  try {
    const ok = new OpenAICompatClient('p', { baseUrl, model: 'm', apiKey: 'k' });
    assert.deepEqual(await callJson(ok, 'sys', 'usr', A), { a: 7 });
    assert.equal(seen.url, '/v1/chat/completions');
    assert.equal(seen.auth, 'Bearer k');
    assert.equal(seen.body.messages[0].content, 'sys');
    const slow = new OpenAICompatClient('p', { baseUrl, model: 'slow', apiKey: 'k' });
    await assert.rejects(slow.complete('s', 'u', 200), { name: 'TimeoutError' });
    const limited = new OpenAICompatClient('p', { baseUrl, model: 'limited', apiKey: 'k' });
    // 429·타임아웃 모두 예비로 넘어간다
    assert.deepEqual(await callJson(new FallbackClient([limited, ok]), 's', 'u', A), { a: 7 });
    assert.deepEqual(await callJson(new FallbackClient([slow, ok], 200), 's', 'u', A), { a: 7 });
  } finally {
    server.closeAllConnections();
    server.close();
  }
});


// ---- 무드패스: 체험 추천 규칙 ----
const E = (id: string, o: Partial<Experience> = {}): Experience => ({
  id, title: id, category: 'book', minutes: 30, price: 10000, moods: [], energyNeed: 0, description: '', placeId: 'p1', slots: ['11:00', '15:00', '19:00'], ...o,
});
const C = (e: Experience, walk: number, slots = e.slots): Candidate => ({
  ...e, placeName: 'p', lat: 0, lng: 0, distanceM: walk * 67, walkMinutes: walk, availableSlots: slots,
});
const cond = { minutes: 30, walk: 10, budget: 10000, energy: 30, emotion: '지쳤어' };

test('도보 분과 시간 계산', () => {
  assert.equal(walkMinutes(300), 5);
  assert.equal(walkMinutes(10), 1);
  assert.equal(addMinutes('18:50', 15), '19:05');
  assert.deepEqual(availableSlots(['11:00', '15:00', '19:00'], '14:50', 15), ['19:00']);
  assert.deepEqual(availableSlots(['11:00'], null, 15), ['11:00']); // 체험 모드는 시간대를 따지지 않는다
});

test('후보: 장소가 반경 밖이면 빠지고, 도보 분이 붙는다', () => {
  const places = [{ id: 'p1', name: '책숲', category: 'c', lat: 1, lng: 2, isPartner: true, openHours: null, note: null, distanceM: 670 }];
  const cs = toCandidates([E('a'), E('b', { placeId: 'far' })], places, null);
  assert.deepEqual(cs.map((c) => [c.id, c.walkMinutes, c.placeName]), [['a', 10, '책숲']]);
});

test('후보의 예약하기 링크: 매장 이름으로 네이버 지도 검색 (예약은 네이버에서)', () => {
  const places = [{ id: 'p1', name: '카페솜', category: 'c', lat: 1, lng: 2, isPartner: true, openHours: null, note: null, distanceM: 670 }];
  const [c] = toCandidates([E('a')], places, null);
  assert.equal(c.mapUrl, 'https://map.naver.com/p/search/' + encodeURIComponent('카페솜'));
});

test('필터: 시간·거리·예산·에너지를 모두 지키고, 고른 감정에 맞는 것이 먼저', () => {
  const cs = [
    C(E('fit-far', { moods: [] }), 9),
    C(E('fit-mood', { moods: ['지쳤어'] }), 9),
    C(E('fit-near'), 2),
    C(E('too-long', { minutes: 60 }), 1),
    C(E('too-far'), 15),
    C(E('too-pricey', { price: 20000 }), 1),
    C(E('too-hard', { energyNeed: 70 }), 1),
  ];
  const r = filterExperiences(cs, cond);
  assert.equal(r.widened, false);
  assert.deepEqual(r.items.map((c) => c.id), ['fit-mood', 'fit-near', 'fit-far']);
});

test('필터: 맞는 곳이 2개보다 적으면 조건을 넓히고 widened로 알린다', () => {
  const cs = [C(E('a'), 2), C(E('b', { minutes: 60 }), 2), C(E('c', { price: 18000 }), 2), C(E('d', { minutes: 90 }), 40)];
  const r1 = filterExperiences(cs, cond);
  assert.equal(r1.widened, true);
  assert.deepEqual(r1.items.map((c) => c.id).sort(), ['a', 'b', 'c']);
  const r2 = filterExperiences([C(E('only'), 50)], cond); // 그래도 모자라면 가까운 순 전부
  assert.deepEqual(r2.items.map((c) => c.id), ['only']);
});

test('필터: 오늘 남은 시간대가 없는 체험은 뺀다', () => {
  const cs = [C(E('a'), 2, []), C(E('b'), 2), C(E('c'), 2), C(E('d'), 2)];
  assert.deepEqual(filterExperiences(cs, cond).items.map((c) => c.id), ['b', 'c', 'd']);
});

test('선택 보정: 후보에 없는 id는 버리고 AI가 고른 것을 앞에 세운다, 가격·시간은 DB 값 그대로', () => {
  const cs = ['a', 'b', 'c', 'd'].map((id, i) => C(E(id, { price: 1000 * (i + 1) }), 2));
  const items = finalizePicks(cs, [{ id: 'nope', reason: 'x' }, { id: 'c', reason: '이유', price: 0 } as any]);
  assert.deepEqual(items.map((i) => i.id), ['c', 'a', 'b', 'd']);
  assert.equal(items[0].reason, '이유');
  assert.equal(items[0].price, 3000);
  assert.equal(finalizePicks(cs, null).length, 4); // 개수를 정하지 않음: 맞는 곳 전부(많아도 5개)
  const many = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => C(E(id), 2));
  assert.equal(finalizePicks(many, null).length, 5);
  assert.deepEqual(finalizePicks(cs, null, ['a', 'b']).map((i) => i.id), ['c', 'd']); // 다른 경험 보기: 안 본 것만
  assert.deepEqual(finalizePicks(cs, null, ['a', 'b', 'c']).map((i) => i.id), ['d', 'a', 'b', 'c']); // 안 본 게 너무 적으면 본 것을 뒤에
});

test('마음 확인 입력 정리', () => {
  assert.deepEqual(parseCheckin({ text: '  지쳐  ', emotion: '지쳤어', energy: 140, mood: 0 }), { text: '지쳐', emotion: '지쳤어', energy: 100, mood: 1 });
  assert.deepEqual(parseCheckin({ emotion: '화나', energy: '많이' }), { text: '', emotion: null, energy: 50, mood: 5 });
});

test('성장: 단계 경계와 아이템 해금', () => {
  assert.deepEqual([0, 19, 20, 39, 40, 74, 75, 119, 120, 999].map(stageOf), [1, 1, 2, 2, 3, 3, 4, 4, 5, 5]); // 화면의 무무 모습 5단계와 같게
  assert.deepEqual(itemsUnlockedBetween(1, 5).map((i) => i.id), ['ribbon', 'scarf', 'beret']);
  assert.deepEqual(itemsUnlockedBetween(1, 2).map((i) => i.id), ['ribbon']);
  assert.deepEqual(itemsUnlockedBetween(1, 4).map((i) => i.id), ['ribbon', 'scarf', 'beret']);
  assert.deepEqual(itemsUnlockedBetween(2, 2), []);
});

test('카카오 결과 → 무료 장소: 키워드 검색에 섞인 주차장은 거르고, 도보 분과 네이버 지도 링크를 붙인다', () => {
  const park = { id: '1', place_name: '남매지공원', category_name: '여행 > 공원', x: '128.75', y: '35.83', distance: '536', road_address_name: '경북 경산시 계양동', place_url: 'http://place.map.kakao.com/1' };
  const lot = { ...park, id: '2', place_name: '남매지공원 공영주차장', category_name: '교통,수송 > 주차장' };
  const cafe = { ...park, id: '3', place_name: '아무 카페', category_name: '음식점 > 카페' };
  assert.deepEqual(toFreePlace('공원', park), {
    id: 'kakao:1', name: '남매지공원', kind: '공원', distanceM: 536, walkMinutes: 8, lat: 35.83, lng: 128.75, address: '경북 경산시 계양동', url: naverMapUrl('남매지공원'),
  });
  assert.equal(toFreePlace('공원', lot), null);
  assert.equal(toFreePlace('카페', cafe)?.kind, '카페');
  assert.equal(toFreePlace('공원', { ...park, distance: '' }), null);
  assert.equal(toFreePlace('공원', { ...park, y: 'x' }), null);
});
test('네이버 지도 링크: 이름만으로 검색 (같은 이름이 여럿이면 네이버가 보는 사람 위치에서 가까운 곳을 먼저 보여 줌)', () => {
  assert.equal(naverMapUrl('남매지공원'), 'https://map.naver.com/p/search/' + encodeURIComponent('남매지공원'));
});
test('추천에 붙일 무료 장소: 도보 조건 안에서 종류마다 가장 가까운 곳 하나, 없으면 +10분까지', () => {
  const fp = (kind: string, name: string, walkMinutes: number): FreePlace => ({ id: name, name, kind, distanceM: walkMinutes * 67, walkMinutes, lat: 0, lng: 0, address: '', url: '' });
  const all = [fp('카페', '먼카페', 9), fp('카페', '가까운카페', 3), fp('공원', '공원', 18), fp('도서관', '도서관', 7)];
  assert.deepEqual(pickFree(all, 10).map((p) => p.name), ['가까운카페', '도서관']);
  assert.ok(pickFree(all, 10).every((p) => p.reason));
  assert.deepEqual(pickFree([fp('공원', '공원', 18)], 10).map((p) => p.name), ['공원']); // 10분 안에 없으면 20분까지
  assert.deepEqual(pickFree([fp('공원', '공원', 25)], 10), []);
  assert.deepEqual(pickFree([], 20), []);
});
test('사진 있는 매장만 hasPhoto: 화면이 그림을 먼저 띄웠다가 사진으로 바꾸지 않게 (키 없으면 전부 false)', async () => {
  const { config } = await import('../src/config.js');
  const { hasPhoto } = await import('../src/services/googlePhoto.js');
  const saved = config.googlePlacesKey;
  config.googlePlacesKey = 'test-key';
  assert.equal(hasPhoto('cafe-som'), true);
  assert.equal(hasPhoto('hero-board'), false);
  config.googlePlacesKey = '';
  assert.equal(hasPhoto('cafe-som'), false);
  config.googlePlacesKey = saved;
});

test('체험 전 기분: 예약할 때 고른 값이 먼저, 없거나 틀리면 마음 확인 점수', async () => {
  const { moodBeforeOf } = await import('../src/services/booking.js');
  assert.equal(moodBeforeOf({ moodBefore: 7 }, { mood_score: 3 }), 7);
  assert.equal(moodBeforeOf({ moodBefore: 11 }, { mood_score: 3 }), 3);
  assert.equal(moodBeforeOf({ moodBefore: '7' }, undefined), null);
  assert.equal(moodBeforeOf({}, { mood_score: null }), null);
});

test('미루기 경험치: 하루(한국 시간)에 한 번만', async () => {
  const { postponeExp } = await import('../src/services/booking.js');
  const { config } = await import('../src/config.js');
  assert.equal(postponeExp(0), config.EXP_POSTPONE);
  assert.equal(postponeExp(1), 0);
  assert.equal(postponeExp(3), 0);
});
