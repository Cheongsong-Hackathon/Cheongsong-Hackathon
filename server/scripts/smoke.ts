// 시연 전 확인 스크립트:  npm run smoke   (다른 서버는 BASE_URL=https://... npm run smoke)
// 주의: 데이터를 초기화한다 (DEMO_MODE=true 서버에서만 동작).
const BASE = (process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`).replace(/\/$/, '');
let failed = 0;

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as any };
}
function check(name: string, ok: boolean, detail: unknown = '') {
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || detail === '' ? '' : `  → ${JSON.stringify(detail)}`}`);
}
const PHOTO = 'data:image/png;base64,iVBORw0KGgo=';

async function doRun(sessionId: number, templateId: string, extra: object = {}) {
  const run = await api('POST', '/runs', { sessionId, templateId });
  const v = await api('POST', `/runs/${run.json.runId}/verify`, extra);
  return { runId: run.json.runId, ...v.json };
}

console.log(`대상: ${BASE}\n\n[1] 대화 → 추천 → 인증 → 성장 → 쿠폰`);
const reset = await api('POST', '/demo/reset');
check('초기화 (DEMO_MODE)', reset.status === 200, reset.status === 404 ? 'DEMO_MODE=true 서버에서만 돌릴 수 있어요' : reset.json);
if (reset.status !== 200) process.exit(1);

const c1 = await api('POST', '/chat', { message: '오늘 좀 심심하고 처져' });
const sid = c1.json.sessionId;
check('대화: 느리가 답장한다', c1.status === 200 && !!c1.json.reply && Number.isInteger(sid), c1.json);
console.log(`    느리: ${c1.json.reply}${c1.json.fallback ? '   (LLM 없이 기본 답장)' : ''}`);

const c2 = await api('POST', '/chat', { sessionId: sid, message: '나갈 힘 있어' });
check('빠른 답장 → 기운 HIGH', c2.json.energy === 'HIGH', c2.json);

const rec = await api('POST', '/recommend', { sessionId: sid });
const items: any[] = rec.json.items ?? [];
check('추천 2~3개', rec.status === 200 && items.length >= 2 && items.length <= 3, rec.json);
check('추천에 무료/비제휴 선택지 포함', items.some((i) => !i.isPartner));
check('HIGH는 집 앞·동네 활동만', items.every((i) => i.tier === 'NEAR' || i.tier === 'TOWN'));
check('모든 추천에 이유 한 줄', items.every((i) => i.reason));
for (const i of items) console.log(`    · [${i.tier}] ${i.title}${i.distanceM ? ` ${i.distanceM}m` : ''} — ${i.reason}`);

const noPhoto = await api('POST', '/runs', { sessionId: sid, templateId: 'town-park' });
const v0 = await api('POST', `/runs/${noPhoto.json.runId}/verify`, {});
check('동네 장소는 사진 없이 인증되지 않는다', v0.json.verified === false && v0.json.expGained === 0, v0.json);
const v1 = await api('POST', `/runs/${noPhoto.json.runId}/verify`, { photo: PHOTO });
check('동네 장소 인증 +30', v1.json.verified && v1.json.expGained === 30, v1.json);
const v1b = await api('POST', `/runs/${noPhoto.json.runId}/verify`, { photo: PHOTO });
check('같은 활동 재인증은 경험치 0', v1b.json.verified && v1b.json.expGained === 0, v1b.json);

const again = await doRun(sid, 'town-park', { photo: PHOTO });
check('같은 장소는 하루 1번만 경험치', again.verified && again.expGained === 0, again);
const lib = await doRun(sid, 'town-library', { photo: PHOTO });
check('두 번째 장소 +30', lib.expGained === 30, lib);
const near = await doRun(sid, 'near-walk', { lat: 0, lng: 0 });
check('집 앞 활동 +15', near.expGained === 15, near);
const home = await doRun(sid, 'home-water');
check('집 안 활동 +5 → 3단계 도달, 쿠폰 지급', home.expGained === 5 && home.newRewards?.length === 4, home);

const ch = await api('GET', '/character');
check('캐릭터: 경험치 80, 3단계, 무늬 5개', ch.json.exp === 80 && ch.json.stage === 3 && ch.json.patterns?.length === 5, ch.json);
const rw = await api('GET', '/rewards');
check('보상함에 쿠폰 4장', rw.json.items?.length === 4, rw.json);
const red = await api('POST', `/rewards/${rw.json.items?.[0]?.id}/redeem`);
check('쿠폰 사용 처리', red.json.used === true, red.json);

const cap1 = await doRun(sid, 'town-cafe', { photo: PHOTO });
const cap2 = await doRun(sid, 'home-song');
check('일일 상한(100): 넘는 만큼은 0, 오류 없음', cap1.expGained === 20 && cap2.verified && cap2.expGained === 0, [cap1, cap2]);
const ch2 = await api('GET', '/character');
check('경험치는 줄지 않는다', ch2.json.exp === 100, ch2.json);
const partners = await api('GET', '/partners');
check('제휴 매장 4곳', partners.json.items?.length === 4);

console.log('\n[2] 위기 키워드 → 안전 모드');
const s1 = await api('POST', '/chat', { message: '그냥 다 죽고 싶어' });
check('키워드 감지 → SAFETY', s1.json.state === 'SAFETY' && s1.json.risk === 'CRISIS', s1.json);
const sRec = await api('POST', '/recommend', { sessionId: s1.json.sessionId });
check('안전 모드에서는 추천이 막힌다 (403)', sRec.status === 403 && !sRec.json.items, sRec.json);
const sRun = await api('POST', '/runs', { sessionId: s1.json.sessionId, templateId: 'home-water' });
check('안전 모드에서는 활동 시작도 막힌다', sRun.status === 403, sRun.json);
// 활동을 하던 중에 위기 신호가 나온 경우: 인증·경험치도 멈춘다
const mid = await api('POST', '/chat', { message: '나갈 힘 있어' });
const midRun = await api('POST', '/runs', { sessionId: mid.json.sessionId, templateId: 'home-window' });
await api('POST', '/chat', { sessionId: mid.json.sessionId, message: '사실 자해 생각이 나' });
const before = (await api('GET', '/character')).json.exp;
const midV = await api('POST', `/runs/${midRun.json.runId}/verify`, {});
const midState = await api('GET', `/sessions/${mid.json.sessionId}`);
check(
  '진행 중이던 활동도 안전 모드에서는 인증되지 않는다',
  midV.status === 403 && (await api('GET', '/character')).json.exp === before && midState.json.state === 'SAFETY',
  [midV.json, midState.json],
);
const bad = await Promise.all([
  api('POST', '/runs/abc/verify', {}),
  api('POST', '/runs/99999999999/verify', {}),
  api('POST', '/recommend', { sessionId: 1e12 }),
  api('POST', '/sessions/1.5/resume'),
  api('POST', '/rewards/x/redeem'),
]);
check('이상한 id는 5xx 없이 처리', bad.every((b) => b.status < 500), bad.map((b) => b.status));
const s2 = await api('POST', '/chat', { sessionId: s1.json.sessionId, message: '음' });
check('안전 모드는 유지된다', s2.json.state === 'SAFETY', s2.json);
const resume = await api('POST', `/sessions/${s1.json.sessionId}/resume`);
check('"대화로 돌아갈래" → CHATTING', resume.json.state === 'CHATTING', resume.json);

const health = await api('GET', '/health');
console.log(`\nLLM 호출 (오늘): ${JSON.stringify(health.json.llm)}`);
await api('POST', '/demo/reset'); // 시연을 깨끗한 상태에서 시작하도록
console.log(failed ? `\n✗ ${failed}건 실패` : '\n✓ 전부 통과 (데이터는 다시 초기화했어요)');
process.exit(failed ? 1 : 0);
