// 시연 전 확인 스크립트:  npm run smoke   (다른 서버는 BASE_URL=https://... npm run smoke)
// 주의: 데이터를 초기화한다 (DEMO_MODE=true 서버에서만 동작).
try {
  process.loadEnvFile(new URL('../../.env', import.meta.url)); // 서버와 같은 PORT를 쓰도록
} catch {}
const BASE = (process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`).replace(/\/$/, '');
let failed = 0;

// 브라우저 하나 = 키 하나. 기본은 A, 사용자 분리 확인 때만 B
async function api(method: string, path: string, body?: unknown, user = 'smoke-user-a') {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    // 초기화 권한: .env(또는 환경 변수)의 RESET_TOKEN. 배포 서버에 돌릴 때는 서버와 같은 값이 필요하다
    headers: { 'content-type': 'application/json', 'x-user-key': user, 'x-reset-token': process.env.RESET_TOKEN ?? '' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as any };
}
function check(name: string, ok: boolean, detail: unknown = '') {
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || detail === '' ? '' : `  → ${JSON.stringify(detail)}`}`);
}
const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

console.log(`대상: ${BASE}\n\n[1] 마음 확인 → 조건 → 추천 → 예약 요청 → 기분 기록 → 성장`);
const reset = await api('POST', '/demo/reset');
check(
  '초기화 (DEMO_MODE)',
  reset.status === 200,
  reset.status === 404 ? 'DEMO_MODE=true 서버에서만 돌릴 수 있어요' : reset.status === 403 ? '서버와 같은 RESET_TOKEN이 필요해요' : reset.json,
);
if (reset.status !== 200) process.exit(1);
if (process.env.RESET_TOKEN) {
  const noToken = await fetch(`${BASE}/api/demo/reset`, { method: 'POST' });
  check('토큰 없이는 초기화 불가(403)', noToken.status === 403);
}

const ck = await api('POST', '/checkin', { text: '오늘 너무 지쳤어. 멀리 가기는 싫어', emotion: '지쳤어', energy: 40, mood: 4 });
check('01 마음 확인: 공감 한마디와 checkinId', ck.status === 200 && Number.isInteger(ck.json.checkinId) && !!ck.json.reply, ck.json);
console.log(`    토끼: ${ck.json.reply}${ck.json.fallback ? '   (LLM 없이 기본 답장)' : ''}`);

const rec = await api('POST', '/recommend', { checkinId: ck.json.checkinId, minutes: 60, walk: 20, budget: 20000 });
const items: any[] = rec.json.items ?? [];
check('03 추천: 조건에 맞는 곳 2~5개', rec.status === 200 && items.length >= 2 && items.length <= 5, rec.json);
check('조건 지킴: 60분·도보 20분·2만원 이하 (평소와 다른 하나는 도보만 +10분)', rec.json.widened || items.every((i) => i.minutes <= 60 && i.walkMinutes <= (i.surprise ? 30 : 20) && i.price <= 20000), items);
check('평소와 다른 하나: 지금은 꺼져 있음 (config.SURPRISE_PICK)', items.every((i) => !i.surprise), items);
check('모든 추천에 이유 한 줄과 오늘 시간대', items.every((i) => i.reason && i.availableSlots?.length));
for (const i of items) console.log(`    · ${i.surprise ? '[평소와 다른 하나] ' : ''}${i.title} — ${i.minutes}분 · 도보 ${i.walkMinutes}분 · ${won(i.price)} — ${i.reason}`);

const more = await api('POST', '/recommend', { checkinId: ck.json.checkinId, minutes: 60, walk: 20, budget: 20000, exclude: items.map((i) => i.id) });
check('"다른 경험 보기"는 안 본 것을 먼저', more.json.items?.[0] && !items.some((i) => i.id === more.json.items[0].id), more.json);

const far = await api('POST', '/recommend', { checkinId: ck.json.checkinId, minutes: 60, walk: 20, budget: 20000, lat: 37.5665, lng: 126.978 }); // 서울시청
check('내 위치 기준: 주변에 제휴 매장이 없으면 다른 동네 매장을 끌어오지 않음', far.status === 200 && far.json.items?.length === 0 && Array.isArray(far.json.free), far.json);
console.log(`    서울시청 주변 무료 장소: ${far.json.free?.map((p: any) => `${p.kind} ${p.name} 도보 ${p.walkMinutes}분`).join(', ') || '없음 (카카오 키 없음)'}`);

const noCheckin = await api('POST', '/recommend', { checkinId: 999999 });
check('마음 확인 없이 추천은 안내(409)', noCheckin.status === 409);

const pickd = items[0];
const badSlot = await api('POST', '/bookings', { checkinId: ck.json.checkinId, experienceId: pickd.id, slotTime: '03:33' });
check('DB에 없는 시간은 예약 요청 불가', badSlot.status === 400, badSlot.json);
const bk = await api('POST', '/bookings', { checkinId: ck.json.checkinId, experienceId: pickd.id, slotTime: pickd.availableSlots[0] });
check('04 예약 요청: 상태 REQUESTED, 가격은 DB 값', bk.status === 200 && bk.json.status === 'REQUESTED' && bk.json.price === pickd.price, bk.json);
const active = await api('GET', '/bookings/active');
check('홈에 보일 진행 중 예약', active.json.booking?.id === bk.json.id);
const arrive = await api('POST', `/bookings/${bk.json.id}/arrive`, { lat: 37.5665, lng: 126.978 }); // 서울시청: 매장에서 멂
check('도착했어: DEMO_MODE는 거리와 상관없이 방문 확인', arrive.status === 200 && arrive.json.arrived === true && arrive.json.demo === true, arrive.json);
check('도착 확인이 예약에 남음', !!(await api('GET', '/bookings/active')).json.booking?.arrivedAt);
const arriveB = await api('POST', `/bookings/${bk.json.id}/arrive`, {}, 'smoke-user-b');
check('남의 예약은 도착 확인 불가(404)', arriveB.status === 404, arriveB.json);

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
check('체험 탭: 10개', exps.json.items?.length === 10);
const free = await api('GET', '/places/free');
check('무료 장소: 카카오 키가 없으면 꺼짐, 있으면 목록', free.status === 200 && (free.json.disabled === true || Array.isArray(free.json.items)), free.json);
console.log(`    무료 장소: ${free.json.disabled ? '꺼짐 (KAKAO_REST_API_KEY 없음)' : `${free.json.items.length}곳 — ${free.json.items.slice(0, 3).map((p: any) => `${p.kind} ${p.name} 도보 ${p.walkMinutes}분`).join(', ')}`}`);
const geo = await api('GET', `/geocode?query=${encodeURIComponent('영남대학교')}`);
check('주소 → 좌표: 키가 없으면 503, 있으면 좌표', geo.status === 503 || (geo.status === 200 && typeof geo.json.lat === 'number'), geo.json);
check('주소 → 좌표: 빈 입력은 400', (await api('GET', '/geocode?query=')).status === 400);

console.log('\n[2] 위기 표현 → 안전 모드');
const crisis = await api('POST', '/checkin', { text: '그냥 다 사라지고 싶어', emotion: '지쳤어', energy: 10, mood: 1 });
check('마음 확인에서 감지 → SAFETY', crisis.json.state === 'SAFETY' && crisis.json.risk === 'CRISIS', crisis.json);
const blockedRec = await api('POST', '/recommend', { checkinId: ck.json.checkinId });
check('안전 모드에서는 추천이 막힌다 (403)', blockedRec.status === 403 && !blockedRec.json.items, blockedRec.json);
const blockedBk = await api('POST', '/bookings', { experienceId: pickd.id, slotTime: pickd.availableSlots[0] });
check('안전 모드에서는 예약도 막힌다', blockedBk.status === 403);
const chSafe = await api('GET', '/character');
check('새로고침해도 안전 모드 유지 (서버에 저장)', chSafe.json.safeMode === true);

// 다른 브라우저(B)는 A의 기록·성장·안전 모드를 보지 않는다
const chB = await api('GET', '/character', undefined, 'smoke-user-b');
const recB = await api('GET', '/records', undefined, 'smoke-user-b');
const ckB = await api('POST', '/checkin', { emotion: '심심해', energy: 60, mood: 6 }, 'smoke-user-b');
const recsB = await api('POST', '/recommend', { checkinId: ckB.json.checkinId }, 'smoke-user-b');
const stealB = await api('POST', '/recommend', { checkinId: ck.json.checkinId }, 'smoke-user-b');
check(
  '사용자 분리: 다른 브라우저는 새 토끼, 빈 기록, 안전 모드 아님',
  chB.json.exp === 0 && chB.json.safeMode === false && recB.json.done?.length === 0 && recB.json.postpones?.length === 0,
  { chB: chB.json, recB: recB.json },
);
check('사용자 분리: A가 안전 모드여도 B는 추천을 받는다', recsB.status === 200 && recsB.json.items?.length >= 1, recsB.json);
check("사용자 분리: 남의 마음 확인으로는 추천 불가(409)", stealB.status === 409, stealB.json);
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

console.log('\n[4] 토끼의 기억');
const demoMem = await api('GET', '/memories', undefined, 'demo-moodpass');
const demoItems: any[] = demoMem.json.items ?? [];
check('시연 사용자(?demo): 기억이 미리 들어 있음', demoItems.length >= 5, demoMem.json);
if (demoItems.length) {
  const steal = await api('DELETE', `/memories/${demoItems[0].id}`, undefined, 'smoke-user-b');
  check('남의 기억은 지울 수 없음(404)', steal.status === 404, steal.json);
  const own = await api('DELETE', `/memories/${demoItems[0].id}`, undefined, 'demo-moodpass');
  const after = await api('GET', '/memories', undefined, 'demo-moodpass');
  check('내 기억 하나 지우기', own.status === 200 && after.json.items?.length === demoItems.length - 1, own.json);
}
const health0 = await api('GET', '/health');
if (health0.json.llm?.model) {
  // 기억은 [선택 동의] "무무가 기억하기"를 켠 사용자만. 끈 사용자는 배우지 않는다
  await api('POST', '/chat', { message: '나는 사람 많은 곳보다 조용한 도서관이 훨씬 편해' }, 'smoke-user-d');
  await new Promise((r) => setTimeout(r, 4000));
  check('기억하기를 안 켠 사용자: 기억 없음', ((await api('GET', '/memories', undefined, 'smoke-user-d')).json.items ?? []).length === 0);
  const on = await api('PATCH', '/me', { remember: true }, 'smoke-user-c');
  check('기억하기 켜기 (둘러보기 사용자도)', on.json.remember === true && on.json.loggedIn === false, on.json);
  // 기억 갱신은 답장 뒤에 따로 돌아서, 잠깐 기다리며 확인한다
  await api('POST', '/chat', { message: '나는 사람 많은 곳보다 조용한 도서관이 훨씬 편해' }, 'smoke-user-c');
  let learned: any[] = [];
  for (let i = 0; i < 20 && !learned.length; i++) {
    await new Promise((r) => setTimeout(r, 500));
    learned = (await api('GET', '/memories', undefined, 'smoke-user-c')).json.items ?? [];
  }
  check('대화에서 기억을 배움 (AI)', learned.length > 0);
  console.log(`    배운 기억: ${learned.map((m) => `[${m.kind}] ${m.text}`).join(', ') || '없음'}`);
  const wipe = await api('DELETE', '/records', undefined, 'smoke-user-c');
  check('내 기록 모두 지우기 → 기억도 지워짐', wipe.json.deleted && (await api('GET', '/memories', undefined, 'smoke-user-c')).json.items?.length === 0);
} else console.log('    (LLM 키가 없어서 "대화에서 기억을 배움"은 건너뜀)');

const health = await api('GET', '/health');
console.log(`\nLLM 호출 (오늘): ${JSON.stringify(health.json.llm)}`);
await api('POST', '/demo/reset'); // 시연을 깨끗한 상태에서 시작하도록
console.log(failed ? `\n✗ ${failed}건 실패` : '\n✓ 전부 통과 (데이터는 다시 초기화했어요)');
process.exit(failed ? 1 : 0);
