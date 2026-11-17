import { config, type Tier } from '../config.js';
import { query, toId, tx } from '../db.js';
import { haversineM, validLatLng, type LatLng } from '../geo.js';
import { GrowthService } from './growth.js';

const fail = (status: number, error: string) => ({ status, body: { error } });
const NO_GAIN = { expGained: 0, levelUp: false, newRewards: [] };

/** 만료·완료된 활동의 좌표는 남기지 않는다. */
const expireSql = `UPDATE activity_runs SET status = 'EXPIRED', start_lat = NULL, start_lng = NULL`;

export async function startRun(body: { sessionId?: unknown; templateId?: unknown; lat?: unknown; lng?: unknown }) {
  const [s] = await query(`SELECT state FROM chat_sessions WHERE id = $1 AND user_id = $2`, [
    toId(body.sessionId),
    config.USER_ID,
  ]);
  if (!s) return fail(404, '세션을 찾을 수 없어.');
  if (s.state === 'SAFETY') return { status: 403, body: { blocked: true, state: 'SAFETY' } };
  const [t] = await query(`SELECT id, tier, place_id FROM activity_templates WHERE id = $1`, [String(body.templateId)]);
  if (!t) return fail(404, '그런 활동은 없어.');

  const start = t.tier === 'NEAR' ? validLatLng(body.lat, body.lng) : null; // 시작 좌표는 NEAR 인증에만 필요
  if (t.tier === 'NEAR' && !start && !config.demoMode) return fail(400, '집 앞 활동은 시작할 때 위치가 필요해.');

  // 진행 중인 활동은 한 번에 하나. 이전 것은 조용히 닫는다 (벌점 없음).
  await query(
    `${expireSql} WHERE status = 'IN_PROGRESS' AND session_id IN (SELECT id FROM chat_sessions WHERE user_id = $1)`,
    [config.USER_ID],
  );
  const [run] = await query(
    `INSERT INTO activity_runs(session_id, template_id, place_id, expires_at, start_lat, start_lng)
     VALUES ($1,$2,$3, now() + make_interval(mins => $4), $5, $6) RETURNING id, expires_at`,
    [body.sessionId, t.id, t.place_id, config.RUN_TTL_MIN, start?.lat ?? null, start?.lng ?? null],
  );
  await query(`UPDATE chat_sessions SET state = 'IN_PROGRESS' WHERE id = $1 AND state <> 'SAFETY'`, [body.sessionId]);
  return { status: 200, body: { runId: run.id, expiresAt: run.expires_at } };
}

/** 단계별 인증 규칙. 통과하면 null, 아니면 사용자에게 보여 줄 이유. */
export function checkVerification(
  tier: Tier,
  input: { here: LatLng | null; photo: unknown },
  ctx: { start: LatLng | null; place: LatLng | null; demo: boolean },
): string | null {
  if (tier === 'HOME') return null; // 버튼만으로 완료
  if (tier === 'NEAR') {
    if (ctx.demo) return null;
    if (!input.here || !ctx.start) return '위치를 확인할 수 없었어. 위치 권한을 켜고 다시 해 볼래?';
    const moved = haversineM(ctx.start, input.here);
    return moved >= config.NEAR_MOVE_M ? null : `아직 ${Math.round(moved)}m 왔어. ${config.NEAR_MOVE_M}m만 넘으면 돼. 천천히 가도 괜찮아.`;
  }
  // TOWN: 사진 1장 + 장소 반경 안
  if (typeof input.photo !== 'string' || !/^data:image\/(jpeg|png|webp|heic|heif);base64,/.test(input.photo))
    return '도착한 곳 사진을 한 장 찍어 줘.';
  if (ctx.demo) return null;
  if (!input.here || !ctx.place) return '위치를 확인할 수 없었어. 위치 권한을 켜고 다시 해 볼래?';
  const dist = haversineM(ctx.place, input.here);
  return dist <= config.TOWN_RADIUS_M ? null : `아직 ${Math.round(dist)}m 남았어. 가까이 가서 다시 눌러 줘.`;
}

export async function verifyRun(runId: number, body: { method?: unknown; lat?: unknown; lng?: unknown; photo?: unknown }) {
  const [run] = await query(
    `SELECT r.id, r.session_id, s.state AS session_state, r.status, r.expires_at < now() AS expired, r.start_lat, r.start_lng, r.place_id,
            t.tier, t.exp, t.title, p.lat AS place_lat, p.lng AS place_lng
     FROM activity_runs r JOIN activity_templates t ON t.id = r.template_id
     JOIN chat_sessions s ON s.id = r.session_id LEFT JOIN places p ON p.id = r.place_id
     WHERE r.id = $1 AND s.user_id = $2`,
    [runId, config.USER_ID],
  );
  if (!run) return fail(404, '그런 활동은 없어.');
  // 안전 모드에서는 게임 요소(인증·경험치)를 모두 멈춘다
  if (run.session_state === 'SAFETY') return { status: 403, body: { blocked: true, state: 'SAFETY' } };
  if (run.status === 'DONE') return { status: 200, body: { verified: true, already: true, ...NO_GAIN } };
  if (run.status === 'EXPIRED' || run.expired) {
    await query(`${expireSql} WHERE id = $1 AND status <> 'DONE'`, [runId]);
    await query(`UPDATE chat_sessions SET state = 'EXPIRED' WHERE id = $1 AND state = 'IN_PROGRESS'`, [run.session_id]);
    return { status: 200, body: { verified: false, expired: true, reason: '시간이 지나서 이 활동은 닫혔어. 괜찮아, 다음에 또 하면 돼.', ...NO_GAIN } };
  }

  const method = run.tier === 'HOME' ? 'BUTTON' : run.tier === 'NEAR' ? 'GPS' : 'PHOTO';
  // 받은 좌표와 사진은 이 함수 안에서 검사에만 쓰고 저장하지 않는다
  const reason = checkVerification(
    run.tier,
    { here: validLatLng(body.lat, body.lng), photo: body.photo },
    {
      start: validLatLng(run.start_lat, run.start_lng),
      place: validLatLng(run.place_lat, run.place_lng),
      demo: config.demoMode,
    },
  );
  if (reason) {
    await query(`INSERT INTO verifications(run_id, method, status) VALUES ($1,$2,'FAILED')`, [runId, method]);
    return { status: 200, body: { verified: false, reason, ...NO_GAIN } };
  }

  const result = await tx(async (q) => {
    // 동시에 두 번 눌러도 한 번만 지급되도록 상태 전환을 먼저 잡는다
    const claimed = await q(
      `UPDATE activity_runs SET status = 'DONE', completed_at = now(), start_lat = NULL, start_lng = NULL
       WHERE id = $1 AND status = 'IN_PROGRESS' RETURNING id`,
      [runId],
    );
    if (!claimed.length) return { already: true, ...NO_GAIN };
    const g = await GrowthService.grant(q, config.USER_ID, { tier: run.tier, exp: run.exp, placeId: run.place_id, title: run.title });
    await q(`UPDATE activity_runs SET exp_gained = $2 WHERE id = $1`, [runId, g.expGained]);
    await q(`INSERT INTO verifications(run_id, method, status) VALUES ($1,$2,'VERIFIED')`, [runId, method]);
    await q(`UPDATE chat_sessions SET state = 'REWARDED' WHERE id = $1 AND state <> 'SAFETY'`, [run.session_id]);
    return g;
  });
  return { status: 200, body: { verified: true, ...result } };
}

/** 시간이 지난 활동을 닫고 시작 좌표를 지운다. 서버가 주기적으로 부른다. */
export const sweepExpired = () => query(`${expireSql} WHERE status = 'IN_PROGRESS' AND expires_at < now()`);

export async function listRuns() {
  await sweepExpired();
  const rows = await query(
    `SELECT r.id AS "runId", r.status, r.template_id AS "templateId", t.title, t.tier, t.minutes, t.exp,
            r.exp_gained AS "expGained", r.expires_at AS "expiresAt", r.completed_at AS "completedAt",
            p.name AS "placeName", COALESCE(p.is_partner, false) AS "isPartner"
     FROM activity_runs r JOIN activity_templates t ON t.id = r.template_id
     JOIN chat_sessions s ON s.id = r.session_id LEFT JOIN places p ON p.id = r.place_id
     WHERE s.user_id = $1 AND r.status IN ('IN_PROGRESS','DONE') ORDER BY r.id DESC LIMIT 100`,
    [config.USER_ID],
  );
  return { active: rows.find((r) => r.status === 'IN_PROGRESS') ?? null, done: rows.filter((r) => r.status === 'DONE') };
}
