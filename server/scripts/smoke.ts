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
const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

console.log(`대상: ${BASE}\n\n[1] 마음 확인 → 조건 → 추천 3개 → 예약 요청 → 기분 기록 → 성장`);
const reset = await api('POST', '/demo/reset');
check('초기화 (DEMO_MODE)', reset.status === 200, reset.status === 404 ? 'DEMO_MODE=true 서버에서만 돌릴 수 있어요' : reset.json);
if (reset.status !== 200) process.exit(1);

const ck = await api('POST', '/checkin', { text: '오늘 너무 지쳤어. 멀리 가기는 싫어', emotion: '지쳤어', energy: 40, mood: 4 });
check('01 마음 확인: 공감 한마디와 checkinId', ck.status === 200 && Number.isInteger(ck.json.checkinId) && !!ck.json.reply, ck.json);
console.log(`    토끼: ${ck.json.reply}${ck.json.fallback ? '   (LLM 없이 기본 답장)' : ''}`);

const rec = await api('POST', '/recommend', { checkinId: ck.json.checkinId, minutes: 60, walk: 20, budget: 20000 });
const items: any[] = rec.json.items ?? [];
check('03 추천 3개', rec.status === 200 && items.length === 3, rec.json);
check('조건 지킴: 60분·도보 20분·2만원 이하', rec.json.widened || items.every((i) => i.minutes <= 60 && i.walkMinutes <= 20 && i.price <= 20000), items);
check('모든 추천에 이유 한 줄과 오늘 시간대', items.every((i) => i.reason && i.availableSlots?.length));
for (const i of items) console.log(`    · ${i.title} — ${i.minutes}분 · 도보 ${i.walkMinutes}분 · ${won(i.price)} — ${i.reason}`);

const more = await api('POST', '/recommend', { checkinId: ck.json.checkinId, minutes: 60, walk: 20, budget: 20000, exclude: items.map((i) => i.id) });
check('"다른 경험 보기"는 안 본 것을 먼저', more.json.items?.[0] && !items.some((i) => i.id === more.json.items[0].id), more.json);

const noCheckin = await api('POST', '/recommend', { checkinId: 999999 });
check('마음 확인 없이 추천은 안내(409)', noCheckin.status === 409);

const pickd = items[0];
const badSlot = await api('POST', '/bookings', { checkinId: ck.json.checkinId, experienceId: pickd.id, slotTime: '03:33' });
check('DB에 없는 시간은 예약 요청 불가', badSlot.status === 400, badSlot.json);
const bk = await api('POST', '/bookings', { checkinId: ck.json.checkinId, experienceId: pickd.id, slotTime: pickd.availableSlots[0] });
check('04 예약 요청: 상태 REQUESTED, 가격은 DB 값', bk.status === 200 && bk.json.status === 'REQUESTED' && bk.json.price === pickd.price, bk.json);
const active = await api('GET', '/bookings/active');
check('홈에 보일 진행 중 예약', active.json.booking?.id === bk.json.id);

const noMood = await api('POST', `/bookings/${bk.json.id}/complete`, {});
check('기분 점수 없이 완료 불가', noMood.status === 400);
const done = await api('POST', `/bookings/${bk.json.id}/complete`, { moodAfter: 7 });
check('05 기록: 체험 전 4 → 후 7, +20, 2단계·리본', done.json.moodBefore === 4 && done.json.moodAfter === 7 && done.json.expGained === 20 && done.json.newItems?.[0]?.id === 'ribbon', done.json);
const again = await api('POST', `/bookings/${bk.json.id}/complete`, { moodAfter: 9 });
check('두 번 눌러도 한 번만 반영', again.json.already && again.json.expGained === 0, again.json);

const pp = await api('POST', '/postpone', { task: '빨래 개기' });
check('오늘 할 일 하나 미루기 +5', pp.status === 200 && pp.json.expGained === 5 && pp.json.reply.includes('쉬어가도 괜찮아'), pp.json);
const ch = await api('GET', '/character');
check('캐릭터: 경험치 25, 2단계, 리본 착용', ch.json.exp === 25 && ch.json.stage === 2 && ch.json.equipped === 'ribbon', ch.json);
const eqBad = await api('POST', '/character/equip', { item: 'beret' });
check('안 열린 아이템은 착용 불가', eqBad.status === 400);
const recs = await api('GET', '/records');
const today = recs.json.week?.at(-1);
check('기록: 완료 1건, 미루기 1건, 오늘 마음 점수', recs.json.done?.length === 1 && recs.json.postpones?.length === 1 && today?.mood != null, recs.json);
const exps = await api('GET', '/experiences');
check('체험 탭: 12개', exps.json.items?.length === 12);

console.log('\n[2] 위기 표현 → 안전 모드');
const crisis = await api('POST', '/checkin', { text: '그냥 다 사라지고 싶어', emotion: '지쳤어', energy: 10, mood: 1 });
check('마음 확인에서 감지 → SAFETY', crisis.json.state === 'SAFETY' && crisis.json.risk === 'CRISIS', crisis.json);
const blockedRec = await api('POST', '/recommend', { checkinId: ck.json.checkinId });
check('안전 모드에서는 추천이 막힌다 (403)', blockedRec.status === 403 && !blockedRec.json.items, blockedRec.json);
const blockedBk = await api('POST', '/bookings', { experienceId: pickd.id, slotTime: pickd.availableSlots[0] });
check('안전 모드에서는 예약도 막힌다', blockedBk.status === 403);
const chSafe = await api('GET', '/character');
check('새로고침해도 안전 모드 유지 (서버에 저장)', chSafe.json.safeMode === true);
await api('POST', '/safety/resume');
const talk = await api('POST', '/chat', { message: '자해 생각이 나' });
check('속마음 대화에서도 감지', talk.json.state === 'SAFETY');
await api('POST', '/safety/resume');
check('"대화로 돌아갈래" → 해제', (await api('GET', '/character')).json.safeMode === false);

console.log('\n[3] 기타');
const bad = await Promise.all([
  api('POST', '/bookings/abc/complete', { moodAfter: 5 }),
  api('POST', '/bookings/99999999999/cancel'),
  api('POST', '/recommend', { checkinId: 'x' }),
  api('POST', '/bookings', { experienceId: 123 }),
]);
check('이상한 입력은 5xx 없이 처리', bad.every((b) => b.status < 500), bad.map((b) => b.status));
const del = await api('DELETE', '/records');
const after = await api('GET', '/records');
check('내 기록 모두 지우기 (성장은 유지)', del.json.deleted && after.json.done.length === 0 && (await api('GET', '/character')).json.exp === 25);

const health = await api('GET', '/health');
console.log(`\nLLM 호출 (오늘): ${JSON.stringify(health.json.llm)}`);
await api('POST', '/demo/reset'); // 시연을 깨끗한 상태에서 시작하도록
console.log(failed ? `\n✗ ${failed}건 실패` : '\n✓ 전부 통과 (데이터는 다시 초기화했어요)');
process.exit(failed ? 1 : 0);
