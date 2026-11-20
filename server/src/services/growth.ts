import { config } from '../config.js';
import type { Q } from '../db.js';

export const stageOf = (exp: number) => config.STAGE_MIN_EXP.filter((min) => exp >= min).length;
export const levelOf = (exp: number) => Math.floor(exp / 10) + 1;

/** 외출 기념품: 그 종류의 장소에 직접 다녀와야만 받는다 (살 수 없음). arts는 체험 DB의 category·실시간 가게의 art 키 */
export const ITEMS = [
  { id: 'glasses', name: '동그란 안경', from: '도서관·만화카페·전시', arts: ['library', 'book', 'gallery', 'drawing'] },
  { id: 'scarf', name: '목도리', from: '카페·찜질방·요가', arts: ['cafe', 'meditation'] },
  { id: 'beret', name: '베레모', from: '공방 원데이 클래스', arts: ['pottery', 'perfume', 'candle'] },
  { id: 'ribbon', name: '리본', from: '꽃집·셀프 사진관', arts: ['flower', 'camera'] },
  { id: 'cape', name: '케이프', from: '공원·클라이밍·볼링', arts: ['park', 'climbing', 'bowling'] },
  { id: 'vest', name: '니트 조끼', from: '노래방·보드게임·방탈출', arts: ['karaoke', 'boardgame'] },
] as const;
export type Souvenir = (typeof ITEMS)[number];
export const souvenirFor = (art: string | null | undefined): Souvenir | null => ITEMS.find((i) => (i.arts as readonly string[]).includes(art ?? '')) ?? null;

/** 기념품을 받을 수 있나: "도착했어"(GPS 확인)를 했고, 그 뒤 SOUVENIR_STAY_MIN분 넘게 머물렀어야 한다. 데모 모드는 머문 시간을 안 본다 */
export function souvenirCheck(arrivedAt: Date | null, completedAt: Date, demo: boolean): 'ok' | 'arrive' | 'stay' {
  if (!arrivedAt) return 'arrive';
  if (!demo && completedAt.getTime() - arrivedAt.getTime() < config.SOUVENIR_STAY_MIN * 60_000) return 'stay';
  return 'ok';
}

export const GrowthService = {
  /** 경험치를 더하고, 받을 기념품이 있으면 넣는다. 반드시 트랜잭션(q) 안에서 호출. 줄어드는 경로는 없다. */
  async grant(q: Q, userId: number, amount: number, souvenir: Souvenir | null = null) {
    const [ch] = await q(`SELECT exp, items FROM characters WHERE user_id = $1 FOR UPDATE`, [userId]);
    const gained = Math.max(0, amount);
    const exp = ch.exp + gained;
    const [oldStage, stage] = [stageOf(ch.exp), stageOf(exp)];
    const fresh = souvenir && !(ch.items as string[]).includes(souvenir.id) ? souvenir : null;
    const items = fresh ? [...(ch.items as string[]), fresh.id] : ch.items;
    await q(`UPDATE characters SET exp = $2, level = $3, stage = $4, items = $5 WHERE user_id = $1`, [userId, exp, levelOf(exp), stage, JSON.stringify(items)]);
    const newItems = fresh ? [{ id: fresh.id, name: fresh.name, from: fresh.from }] : [];
    return { expGained: gained, levelUp: levelOf(exp) > levelOf(ch.exp), stageUp: stage > oldStage, stage, newItems };
  },
};
