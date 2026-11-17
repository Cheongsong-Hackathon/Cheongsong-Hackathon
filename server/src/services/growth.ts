import { randomBytes } from 'node:crypto';
import { config, type Tier } from '../config.js';
import type { Q } from '../db.js';

export const stageOf = (exp: number) => config.STAGE_MIN_EXP.filter((min) => exp >= min).length;
export const levelOf = (exp: number) => Math.floor(exp / 10) + 1;

/** 이번 활동으로 줄 경험치. 절대 음수가 되지 않는다 (경험치는 줄지 않는다). */
export function grantable(baseExp: number, todayExp: number, samePlaceToday: boolean, cap = config.DAILY_EXP_CAP) {
  return samePlaceToday ? 0 : Math.max(0, Math.min(baseExp, cap - todayExp));
}

const TODAY = `(now() AT TIME ZONE 'Asia/Seoul')::date`;
export const todayExpSql = `
  SELECT COALESCE(SUM(r.exp_gained), 0)::int AS exp FROM activity_runs r JOIN chat_sessions s ON s.id = r.session_id
  WHERE s.user_id = $1 AND r.status = 'DONE' AND (r.completed_at AT TIME ZONE 'Asia/Seoul')::date = ${TODAY}`;

export const GrowthService = {
  /** 인증된 활동 하나를 캐릭터에 반영한다. 반드시 트랜잭션(q) 안에서 호출. */
  async grant(q: Q, userId: number, run: { tier: Tier; exp: number; placeId: string | null; title: string }) {
    const [ch] = await q(`SELECT exp, patterns FROM characters WHERE user_id = $1 FOR UPDATE`, [userId]);
    const [{ exp: todayExp }] = await q(todayExpSql, [userId]);
    const samePlace =
      !!run.placeId &&
      (
        await q(
          `SELECT 1 FROM activity_runs r JOIN chat_sessions s ON s.id = r.session_id
           WHERE s.user_id = $1 AND r.place_id = $2 AND r.status = 'DONE' AND r.exp_gained > 0
             AND (r.completed_at AT TIME ZONE 'Asia/Seoul')::date = ${TODAY}`,
          [userId, run.placeId],
        )
      ).length > 0;

    const expGained = grantable(run.exp, todayExp, samePlace);
    const exp = ch.exp + expGained;
    const [oldStage, stage] = [stageOf(ch.exp), stageOf(exp)];
    // 완료할 때마다 껍데기 무늬가 하나 늘어난다 (경험치 상한과 무관)
    const patterns = [...ch.patterns, { tier: run.tier, title: run.title }];
    await q(`UPDATE characters SET exp = $2, level = $3, stage = $4, patterns = $5 WHERE user_id = $1`, [
      userId,
      exp,
      levelOf(exp),
      stage,
      JSON.stringify(patterns),
    ]);

    let newRewards: unknown[] = [];
    if (oldStage < config.COUPON_STAGE && stage >= config.COUPON_STAGE) {
      newRewards = await q(
        `WITH ins AS (
           INSERT INTO rewards(user_id, type, partner_id, required_level, code)
           SELECT $1, 'COUPON', pt.id, $2, 'NEURI-' || upper(substr(md5($3 || pt.id::text), 1, 6)) FROM partners pt
           RETURNING id, partner_id, code)
         SELECT ins.id, ins.code, p.name AS "placeName", pt.coupon_policy AS benefit
         FROM ins JOIN partners pt ON pt.id = ins.partner_id JOIN places p ON p.id = pt.place_id ORDER BY ins.id`,
        [userId, levelOf(config.STAGE_MIN_EXP[config.COUPON_STAGE - 1]), randomBytes(8).toString('hex')],
      );
    }
    return {
      expGained,
      levelUp: levelOf(exp) > levelOf(ch.exp),
      stageUp: stage > oldStage,
      newRewards,
      ...(expGained < run.exp ? { note: samePlace ? '같은 장소는 하루에 한 번만 경험치를 줘.' : '오늘 받을 수 있는 경험치를 다 채웠어. 그래도 한 건 한 거야!' } : {}),
    };
  },
};
