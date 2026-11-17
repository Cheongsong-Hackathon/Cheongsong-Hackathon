import { readFile } from 'node:fs/promises';
import { config } from './config.js';
import { query, tx } from './db.js';
import { offsetM } from './geo.js';

export async function migrate() {
  await query(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
}

// [id, 이름, 분류, 북(m), 동(m), 영업시간, 제휴 혜택(없으면 무료 장소)]
const PLACES: [string, string, string, number, number, [string, string] | null, string | null][] = [
  ['cafe', '카페 느린오후', '카페', 270, 360, ['09:00', '22:00'], '첫 방문 음료 10% 할인'], // 450m
  ['bookstore', '동네서점 책방골목', '서점', -420, 560, ['10:00', '21:00'], '책갈피 증정'], // 700m
  ['pottery', '도자기공방 흙마음', '공방', 720, -960, ['10:00', '19:00'], '체험 5,000원 할인'], // 1.2km
  ['flower', '꽃집 오늘한송이', '꽃집', -180, -240, ['09:00', '20:00'], '미니 꽃 한 송이'], // 300m
  ['park', '근린공원 산책로', '공원', 360, -480, null, null], // 600m
  ['library', '구립도서관', '도서관', -720, -540, ['09:00', '18:00'], null], // 900m
];

// [id, 제목, 단계, 분, 인증]
const TEMPLATES: [string, string, 'HOME' | 'NEAR', number][] = [
  ['home-window', '창문 열고 바깥 공기 2분', 'HOME', 2],
  ['home-water', '물 한 잔 마시기', 'HOME', 1],
  ['home-shower', '따뜻한 물로 샤워', 'HOME', 15],
  ['home-song', '좋아하는 노래 한 곡 듣기', 'HOME', 4],
  ['home-message', '친구에게 메시지 하나 보내기', 'HOME', 3],
  ['near-store', '편의점까지 걸어가기', 'NEAR', 10],
  ['near-walk', '동네 한 바퀴 10분 산책', 'NEAR', 10],
  ['near-bench', '집 앞 벤치에 5분 앉아 있기', 'NEAR', 5],
];

const EXP = { HOME: 5, NEAR: 15, TOWN: 30 };

/** 모든 데이터를 지우고 seed를 다시 넣는다 (DEMO_CENTER 기준 상대 좌표). */
export async function seed() {
  await tx(async (q) => {
    await q(`TRUNCATE users, characters, chat_sessions, messages, mood_states, places, partners,
             activity_templates, activity_runs, verifications, rewards RESTART IDENTITY CASCADE`);
    await q(`INSERT INTO users(nickname) VALUES ('테스트')`);
    await q(`INSERT INTO characters(user_id) VALUES ($1)`, [config.USER_ID]);

    for (const [id, name, category, n, e, hours, benefit] of PLACES) {
      const p = offsetM(config.demoCenter, n, e);
      await q(
        `INSERT INTO places(id, name, category, lat, lng, is_partner, open_hours, note)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, name, category, p.lat, p.lng, !!benefit, hours && JSON.stringify({ open: hours[0], close: hours[1] }), benefit],
      );
      if (benefit) {
        const [{ id: pid }] = await q(
          `INSERT INTO partners(place_id, fee_per_visit, coupon_policy) VALUES ($1, 500, $2) RETURNING id`,
          [id, benefit],
        );
        await q(`UPDATE places SET partner_id = $1 WHERE id = $2`, [pid, id]);
      }
      await q(
        `INSERT INTO activity_templates(id, title, tier, minutes, exp, verify_type, place_id)
         VALUES ($1,$2,'TOWN',40,$3,'PHOTO',$4)`,
        [`town-${id}`, `${name} 다녀오기`, EXP.TOWN, id],
      );
    }
    for (const [id, title, tier, minutes] of TEMPLATES) {
      await q(
        `INSERT INTO activity_templates(id, title, tier, minutes, exp, verify_type) VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, title, tier, minutes, EXP[tier], tier === 'HOME' ? 'BUTTON' : 'GPS'],
      );
    }
  });
}
