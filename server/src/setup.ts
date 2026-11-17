import { readFile } from 'node:fs/promises';
import { config } from './config.js';
import { query, tx } from './db.js';
import { offsetM } from './geo.js';

export async function migrate() {
  await query(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
}

// 가상 제휴 매장: [id, 이름, 분류, 북(m), 동(m)]  — DEMO_CENTER에서 도보 5~20분
const PLACES: [string, string, string, number, number][] = [
  ['bookcafe', '책숲 북카페', '북카페', 240, 180], // 300m
  ['flower', '오늘한송이 꽃집', '꽃집', -180, -240], // 300m
  ['scent', '향기로운 오후 향공방', '공방', 520, -380], // 640m
  ['clay', '흙마음 도자기공방', '공방', -420, 560], // 700m
  ['atelier', '그림한장 아틀리에', '아틀리에', 700, 500], // 860m
  ['bakery', '반죽하는 날 베이킹 스튜디오', '베이킹', -650, -700], // 950m
  ['calm', '쉼표 명상·다도 공간', '명상', 900, -300], // 950m
  ['play', '들썩 놀이공간', '놀이', 1000, 800], // 1.3km
];

// [id, 매장, 제목, 그림, 분, 가격, 어울리는 감정, 필요한 에너지(%), 설명, 오늘 시간대]
const EXPERIENCES: [string, string, string, string, number, number, string[], number, string, string[]][] = [
  ['quiet-bookcafe', 'bookcafe', '조용한 북카페에서 책 한 권', 'book', 30, 6000, ['지쳤어', '우울해', '불안해'], 0, '음료 한 잔과 창가 자리. 아무 말 없이 머물러도 돼요.', ['11:00', '14:00', '16:30', '19:00']],
  ['mini-pottery', 'clay', '작은 도자기 만들기', 'pottery', 30, 18000, ['답답해', '우울해', '심심해'], 30, '손으로 흙을 만지며 작은 컵 하나를 빚어요.', ['13:30', '15:00', '18:00']],
  ['my-scent', 'scent', '나만의 향 만들기', 'perfume', 30, 20000, ['지쳤어', '불안해', '우울해'], 20, '좋아하는 향을 골라 30ml 향수를 만들어요.', ['11:00', '15:00', '19:30']],
  ['mini-bouquet', 'flower', '미니 꽃다발 만들기', 'flower', 30, 12000, ['우울해', '심심해', '평온해'], 20, '오늘의 꽃 세 송이로 작은 다발을 묶어요.', ['12:00', '16:30', '18:00']],
  ['drawing', 'atelier', '30분 드로잉 클래스', 'drawing', 30, 15000, ['답답해', '심심해', '평온해'], 20, '잘 그리지 않아도 괜찮은, 선 긋기부터 하는 시간.', ['14:00', '17:00', '20:00']],
  ['candle', 'scent', '소이 캔들 만들기', 'candle', 60, 22000, ['불안해', '지쳤어', '평온해'], 20, '천천히 녹이고 붓고 기다리는 한 시간.', ['13:00', '17:30', '20:00']],
  ['cookie', 'bakery', '쿠키 굽기 원데이', 'cookie', 60, 18000, ['심심해', '우울해', '답답해'], 30, '반죽부터 굽기까지, 따뜻한 쿠키 여섯 개를 가져가요.', ['12:00', '15:30', '19:00']],
  ['singing-bowl', 'calm', '싱잉볼 명상 30분', 'meditation', 30, 10000, ['불안해', '지쳤어', '답답해'], 0, '누워서 소리만 들으면 되는 시간이에요.', ['11:30', '15:00', '18:30', '21:00']],
  ['tea', 'calm', '혼자 하는 다도 시간', 'tea', 60, 14000, ['지쳤어', '불안해', '평온해'], 0, '차를 우리고 마시는 동안 휴대폰은 잠시 내려놔요.', ['13:00', '16:00', '19:30']],
  ['boardgame', 'play', '보드게임 한 판', 'boardgame', 60, 8000, ['심심해', '답답해'], 40, '혼자 와도 직원이 같이 해 줘요.', ['14:00', '18:00', '20:30']],
  ['karaoke', 'play', '코인노래방 30분', 'karaoke', 30, 3000, ['답답해', '심심해', '우울해'], 50, '소리 내서 부르고 나면 조금 시원해져요.', ['11:00', '16:00', '19:00', '21:30']],
  ['climbing', 'play', '볼더링 첫 체험', 'climbing', 90, 25000, ['답답해', '심심해'], 70, '장비 대여 포함. 처음이어도 쉬운 벽부터 해요.', ['15:00', '19:00']],
];

/** 모든 데이터를 지우고 seed를 다시 넣는다 (DEMO_CENTER 기준 상대 좌표). */
export async function seed() {
  await tx(async (q) => {
    await q(`TRUNCATE users, characters, chat_sessions, messages, places, partners, experiences, experience_slots,
             checkins, bookings, postpones RESTART IDENTITY CASCADE`);
    await q(`INSERT INTO users(nickname) VALUES ('테스트')`);
    await q(`INSERT INTO characters(user_id) VALUES ($1)`, [config.USER_ID]);

    for (const [id, name, category, n, e] of PLACES) {
      const p = offsetM(config.demoCenter, n, e);
      await q(
        `INSERT INTO places(id, name, category, lat, lng, is_partner, open_hours, note) VALUES ($1,$2,$3,$4,$5,true,$6,$7)`,
        [id, name, category, p.lat, p.lng, JSON.stringify({ open: '10:00', close: '22:30' }), '체험 모드: 가상 매장'],
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
