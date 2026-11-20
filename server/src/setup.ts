import { readFile } from 'node:fs/promises';
import { config } from './config.js';
import { query, tx, type Q } from './db.js';
import type { Tag } from './services/match.js';
import { LIVE_KINDS } from './services/livePlaces.js';
import { mmdd } from './services/memory.js';

export async function migrate() {
  await query(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
}

// 제휴 매장 (체험 모드): 영남대 경산캠퍼스 주변의 실제 매장 이름·위치 (카카오 로컬, 2026-11-17 조회).
// 제휴 여부·가격·시간대는 시연용 예시이고 매장과 협의한 것이 아니다 (분·가격은 화면에 보이지 않는다).
// [id, 이름, 분류, 위도, 경도]  — 영남대에서 도보 11~25분
const PLACES: [string, string, string, number, number][] = [
  ['cafe-som', '카페솜', '카페', 35.83762528785501, 128.75420010053088], // 754m
  ['tales-ceramic', '테일즈세라믹스튜디오', '도자기 공방', 35.831415594578, 128.7438651381], // 1.3km
  ['hyangmanga', '향만가', '향 공방', 35.831415594578, 128.74386513810006], // 1.3km
  ['rose-fleur', '로즈플레르', '꽃집', 35.8372460932792, 128.752520693893], // 810m
  ['sera-calli', '세라캘리', '공예', 35.832231205831675, 128.74727026610964], // 1.0km
  ['ermanas', '에르마나스', '캔들 공방', 35.831404007385, 128.740064886295], // 1.7km
  ['yoga-flower', '요가꽃피어나다', '요가', 35.839137426317876, 128.75641689213666], // 836m
  ['hero-board', '히어로보드게임카페 영남대점', '보드게임카페', 35.8376212057207, 128.753862477829], // 770m
  ['coin-karaoke', '공기반소리반코인노래연습장', '코인노래방', 35.836891805183576, 128.7535188489794], // 722m
  ['challenger', '챌린져클라이밍센터 영대점', '클라이밍', 35.8421483711009, 128.762611236257], // 1.2km
];

// [id, 매장, 제목, 그림, 분, 가격, 어울리는 감정, 필요한 에너지(%), 설명, 오늘 시간대]
// 제목·설명은 실시간 가게(LIVE_KINDS)처럼 그 업종에서 누구나 할 수 있는 일만 쓴다 (매장이 실제로 무엇을 하는지는 모름).
// 같은 업종의 실시간 종류가 있으면 제목·그림·설명을 그대로 써서 똑같이 보이게 한다 (추천은 제목으로 중복을 거른다)
const K = LIVE_KINDS;
export const EXPERIENCES: [string, string, string, string, number, number, string[], number, string, string[]][] = [
  ['quiet-cafe', 'cafe-som', K.cafe.title, K.cafe.art, 30, 6000, ['지쳤어', '불안해'], 0, K.cafe.description, ['11:00', '14:00', '16:30', '19:00']],
  ['mini-pottery', 'tales-ceramic', K.pottery.title, K.pottery.art, 30, 18000, ['답답해', '지쳤어', '심심해'], 30, K.pottery.description, ['13:30', '15:00', '18:00']],
  ['my-scent', 'hyangmanga', '향 공방 원데이 클래스', 'perfume', 30, 20000, ['지쳤어', '불안해'], 20, '향 만드는 원데이 클래스가 있는지 네이버에서 확인해 봐요.', ['11:00', '15:00', '19:30']],
  ['mini-bouquet', 'rose-fleur', K.flower.title, K.flower.art, 30, 12000, ['지쳤어', '심심해', '평온해'], 20, K.flower.description, ['12:00', '16:30', '18:00']],
  ['calligraphy', 'sera-calli', '캘리그라피 공방 원데이 클래스', 'drawing', 30, 15000, ['답답해', '심심해', '평온해'], 20, '써 보는 원데이 클래스가 있는지 네이버에서 확인해 봐요.', ['14:00', '17:00', '20:00']],
  ['candle', 'ermanas', '캔들 공방 원데이 클래스', 'candle', 60, 22000, ['불안해', '지쳤어', '평온해'], 20, '캔들 만드는 원데이 클래스가 있는지 네이버에서 확인해 봐요.', ['13:00', '17:30', '20:00']],
  ['meditation', 'yoga-flower', '요가원에서 몸 풀기', 'meditation', 30, 10000, ['불안해', '지쳤어', '답답해'], 0, '체험 수업이 있는지 네이버에서 확인해 봐요.', ['11:30', '15:00', '18:30', '21:00']],
  ['boardgame', 'hero-board', K.board.title, K.board.art, 60, 8000, ['심심해', '답답해'], 40, K.board.description, ['14:00', '18:00', '20:30']],
  ['karaoke', 'coin-karaoke', K.karaoke.title, K.karaoke.art, 30, 3000, ['답답해', '심심해', '지쳤어'], 50, K.karaoke.description, ['11:00', '16:00', '19:00', '21:30']],
  ['climbing', 'challenger', K.climbing.title, K.climbing.art, 90, 25000, ['답답해', '심심해'], 70, K.climbing.description, ['15:00', '19:00']],
];

// 체험 특징 태그 (services/match.ts의 TAGS). 실제 서비스에서는 제휴 매장이 체험을 등록할 때 직접 고른다.
const EXP_TAGS: Record<string, Tag[]> = {
  'quiet-cafe': ['조용함', '혼자 가능', '가만히 쉬기', '실내'],
  'mini-pottery': ['손으로 만들기', '조용함', '혼자 가능', '실내'],
  'my-scent': ['손으로 만들기', '조용함', '혼자 가능', '실내'],
  'mini-bouquet': ['손으로 만들기', '혼자 가능', '실내'],
  calligraphy: ['손으로 만들기', '조용함', '혼자 가능', '실내'],
  candle: ['손으로 만들기', '조용함', '혼자 가능', '가만히 쉬기', '실내'],
  meditation: ['가만히 쉬기', '조용함', '혼자 가능', '실내'],
  boardgame: ['같이 하기', '사람 많음', '실내'],
  karaoke: ['소리 내기', '혼자 가능', '실내'],
  climbing: ['몸 쓰기', '사람 많음', '실내'],
};

/** 모든 데이터를 지우고 seed를 다시 넣는다. */
export async function seed() {
  await tx(async (q) => {
    await q(`TRUNCATE users, characters, chat_sessions, messages, places, partners, experiences, experience_slots,
             checkins, bookings, postpones, memories RESTART IDENTITY CASCADE`);
    await q(`INSERT INTO users(nickname) VALUES ('테스트')`);
    await q(`INSERT INTO characters(user_id) VALUES ($1)`, [config.USER_ID]);

    for (const [id, name, category, lat, lng] of PLACES) {
      await q(
        `INSERT INTO places(id, name, category, lat, lng, is_partner, open_hours, note) VALUES ($1,$2,$3,$4,$5,true,$6,$7)`,
        [id, name, category, lat, lng, JSON.stringify({ open: '10:00', close: '22:30' }), '체험 모드: 실제 매장 위치, 제휴·가격·시간은 예시'],
      );
      const [{ id: pid }] = await q(
        `INSERT INTO partners(place_id, fee_per_visit, coupon_policy) VALUES ($1, 0, '예약 성사 수수료 10% (계약 전 가설)') RETURNING id`,
        [id],
      );
      await q(`UPDATE places SET partner_id = $1 WHERE id = $2`, [pid, id]);
    }
    for (const [id, place, title, category, minutes, price, moods, energy, desc, slots] of EXPERIENCES) {
      await q(
        `INSERT INTO experiences(id, place_id, title, category, minutes, price, moods, energy_need, description, tags)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [id, place, title, category, minutes, price, moods, energy, desc, EXP_TAGS[id] ?? []],
      );
      for (const s of slots) await q(`INSERT INTO experience_slots VALUES ($1,$2)`, [id, s]);
    }
    await seedDemoUser(q);
  });
}

/** 시연용 사용자: 일주일 남짓 써 온 사람처럼 기록·기억을 미리 넣는다. 화면에서 `?demo`로 열면 이 사용자가 된다. */
export const DEMO_USER_KEY = 'demo-moodpass';
async function seedDemoUser(q: Q) {
  const daysAgo = (n: number) => `now() - interval '${n} days'`; // n은 아래에 쓴 숫자만 (사용자 입력 아님)
  const dayLabel = (n: number) => mmdd(new Date(Date.now() - n * 86_400_000));
  const [{ id: uid }] = await q(`INSERT INTO users(nickname, client_key, remember) VALUES ('시연', $1, true) RETURNING id`, [DEMO_USER_KEY]);
  // 체험 2번(+20씩) + 미루기 1번(+5) = 45 → 3단계, 리본·목도리
  await q(`INSERT INTO characters(user_id, level, exp, stage, items, equipped) VALUES ($1, 5, 45, 3, '["ribbon", "scarf"]', 'ribbon')`, [uid]);

  const checkin = async (n: number, text: string, emotion: string, energy: number, mood: number) =>
    (await q(`INSERT INTO checkins(user_id, text, emotion, energy, mood_score, risk, created_at) VALUES ($1,$2,$3,$4,$5,'NONE',${daysAgo(n)}) RETURNING id`, [uid, text, emotion, energy, mood]))[0].id;
  const done = async (n: number, ck: number, exp: string, slot: string, before: number, after: number) =>
    q(
      `INSERT INTO bookings(user_id, checkin_id, experience_id, slot_time, price, status, mood_before, mood_after, created_at, completed_at)
       SELECT $1, $2, id, $3, price, 'DONE', $4, $5, ${daysAgo(n)}, ${daysAgo(n)} + interval '2 hours' FROM experiences WHERE id = $6`,
      [uid, ck, slot, before, after, exp],
    );
  await done(6, await checkin(6, '과제 몰아서 하느라 머리가 터질 것 같아', '답답해', 50, 5), 'karaoke', '19:00', 5, 5);
  await done(3, await checkin(3, '시험 공부만 하니까 너무 지쳐. 사람 많은 데는 싫어', '지쳤어', 35, 4), 'mini-pottery', '18:00', 4, 8);
  await checkin(1, '기말고사 첫날 끝났어', '지쳤어', 30, 5);
  await q(`INSERT INTO postpones(user_id, task, created_at) VALUES ($1, '동아리 회의록 정리', ${daysAgo(1)})`, [uid]);

  const [{ id: sid }] = await q(`INSERT INTO chat_sessions(user_id, started_at) VALUES ($1, ${daysAgo(2)}) RETURNING id`, [uid]);
  for (const [role, text] of [
    ['user', '오늘 같이 공부하던 친구랑 말다툼했어'],
    ['assistant', '같이 공부하던 친구랑 부딪혀서 마음이 많이 쓰였겠다. 무슨 일이 있었는지 천천히 말해 줘도 돼.'],
    ['user', '시험 기간이라 다들 예민한 것 같아. 나도 조용히 혼자 있고 싶었고'],
    ['assistant', '시험 기간엔 다들 날이 서 있지. 혼자 조용히 숨 돌릴 시간이 필요했던 거구나.'],
  ])
    await q(`INSERT INTO messages(session_id, role, text, created_at) VALUES ($1,$2,$3,${daysAgo(2)})`, [sid, role, text]);

  for (const [n, kind, text] of [
    [6, '취향', '손으로 만드는 활동을 좋아함'],
    [3, '취향', '사람 많은 곳에 가면 금방 지침'],
    [2, '취향', '힘들 땐 혼자 조용히 있고 싶어 함'],
    [3, '상황', '이번 주 기말고사 기간'],
    [2, '사건', `${dayLabel(2)} 같이 공부하던 친구와 말다툼`],
  ] as const)
    await q(`INSERT INTO memories(user_id, kind, text, created_at, updated_at) VALUES ($1,$2,$3,${daysAgo(n)},${daysAgo(n)})`, [uid, kind, text]);
}
