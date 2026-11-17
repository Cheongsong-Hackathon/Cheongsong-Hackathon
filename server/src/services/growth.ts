import { config } from '../config.js';
import type { Q } from '../db.js';

export const stageOf = (exp: number) => config.STAGE_MIN_EXP.filter((min) => exp >= min).length;
export const levelOf = (exp: number) => Math.floor(exp / 10) + 1;

/** 꾸미기 아이템: 해당 단계에 도달하면 열린다 (MVP에서는 무료). */
export const ITEMS = [
  { id: 'ribbon', name: '리본', stage: 2 },
  { id: 'scarf', name: '목도리', stage: 3 },
  { id: 'beret', name: '베레모', stage: 4 },
] as const;
export const itemsUnlockedBetween = (from: number, to: number) => ITEMS.filter((i) => i.stage > from && i.stage <= to);

export const GrowthService = {
  /** 경험치를 더한다. 반드시 트랜잭션(q) 안에서 호출. 줄어드는 경로는 없다. */
  async grant(q: Q, userId: number, amount: number) {
    const [ch] = await q(`SELECT exp, items, equipped FROM characters WHERE user_id = $1 FOR UPDATE`, [userId]);
    const gained = Math.max(0, amount);
    const exp = ch.exp + gained;
    const [oldStage, stage] = [stageOf(ch.exp), stageOf(exp)];
    const newItems = itemsUnlockedBetween(oldStage, stage);
    const items = [...new Set([...(ch.items as string[]), ...newItems.map((i) => i.id)])];
    const equipped = ch.equipped ?? newItems[0]?.id ?? null; // 처음 생긴 아이템은 바로 씌워 준다
    await q(`UPDATE characters SET exp = $2, level = $3, stage = $4, items = $5, equipped = $6 WHERE user_id = $1`, [
      userId,
      exp,
      levelOf(exp),
      stage,
      JSON.stringify(items),
      equipped,
    ]);
    return { expGained: gained, levelUp: levelOf(exp) > levelOf(ch.exp), stageUp: stage > oldStage, stage, newItems };
  },
};
