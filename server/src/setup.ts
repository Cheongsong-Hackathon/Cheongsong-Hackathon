import { readFile } from 'node:fs/promises';
import { config } from './config.js';
import { query, tx } from './db.js';

export async function migrate() {
  await query(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
}

// 제휴 매장 (체험 모드): 영남대 경산캠퍼스 주변의 실제 매장 이름·위치 (카카오 로컬, 2026-11-17 조회).
// 제휴 여부·체험 내용·가격·시간대는 시연용 예시이고 매장과 협의한 것이 아니다.
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
const EXPERIENCES: [string, string, string, string, number, number, string[], number, string, string[]][] = [
  ['quiet-cafe', 'cafe-som', '조용한 카페에서 책 한 권', 'book', 30, 6000, ['지쳤어', '불안해'], 0, '음료 한 잔과 창가 자리. 아무 말 없이 머물러도 돼요.', ['11:00', '14:00', '16:30', '19:00']],
  ['mini-pottery', 'tales-ceramic', '작은 도자기 만들기', 'pottery', 30, 18000, ['답답해', '지쳤어', '심심해'], 30, '손으로 흙을 만지며 작은 컵 하나를 빚어요.', ['13:30', '15:00', '18:00']],
  ['my-scent', 'hyangmanga', '나만의 향 만들기', 'perfume', 30, 20000, ['지쳤어', '불안해'], 20, '좋아하는 향을 골라 30ml 향수를 만들어요.', ['11:00', '15:00', '19:30']],
  ['mini-bouquet', 'rose-fleur', '미니 꽃다발 만들기', 'flower', 30, 12000, ['지쳤어', '심심해', '평온해'], 20, '오늘의 꽃 세 송이로 작은 다발을 묶어요.', ['12:00', '16:30', '18:00']],
  ['calligraphy', 'sera-calli', '30분 캘리그라피', 'drawing', 30, 15000, ['답답해', '심심해', '평온해'], 20, '잘 쓰지 않아도 괜찮은, 한 글자부터 천천히 써 보는 시간.', ['14:00', '17:00', '20:00']],
  ['candle', 'ermanas', '소이 캔들 만들기', 'candle', 60, 22000, ['불안해', '지쳤어', '평온해'], 20, '천천히 녹이고 붓고 기다리는 한 시간.', ['13:00', '17:30', '20:00']],
  ['meditation', 'yoga-flower', '30분 명상', 'meditation', 30, 10000, ['불안해', '지쳤어', '답답해'], 0, '누워서 숨소리만 들으면 되는 시간이에요.', ['11:30', '15:00', '18:30', '21:00']],
  ['boardgame', 'hero-board', '보드게임 한 판', 'boardgame', 60, 8000, ['심심해', '답답해'], 40, '혼자 와도 직원이 같이 해 줘요.', ['14:00', '18:00', '20:30']],
  ['karaoke', 'coin-karaoke', '코인노래방 30분', 'karaoke', 30, 3000, ['답답해', '심심해', '지쳤어'], 50, '소리 내서 부르고 나면 조금 시원해져요.', ['11:00', '16:00', '19:00', '21:30']],
  ['climbing', 'challenger', '볼더링 첫 체험', 'climbing', 90, 25000, ['답답해', '심심해'], 70, '장비 대여 포함. 처음이어도 쉬운 벽부터 해요.', ['15:00', '19:00']],
];

/** 모든 데이터를 지우고 seed를 다시 넣는다. */
export async function seed() {
  await tx(async (q) => {
    await q(`TRUNCATE users, characters, chat_sessions, messages, places, partners, experiences, experience_slots,
             checkins, bookings, postpones RESTART IDENTITY CASCADE`);
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
        `INSERT INTO experiences(id, place_id, title, category, minutes, price, moods, energy_need, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [id, place, title, category, minutes, price, moods, energy, desc],
      );
      for (const s of slots) await q(`INSERT INTO experience_slots VALUES ($1,$2)`, [id, s]);
    }
  });
}
