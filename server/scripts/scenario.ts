// 대화 추천 시나리오 검사:  npm run scenario   (여러 번: SCENARIO_RUNS=5)
// 시나리오 1 "시험 끝난 저녁": 시연용 사용자(도자기 4→8 기록)가 영남대에서 조건 없이 기분만 말한다.
// 주의: 시작할 때마다 데이터를 초기화한다 (DEMO_MODE 서버, RESET_TOKEN 필요 시).
try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {}
const BASE = (process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`).replace(/\/$/, '');
const RUNS = Number(process.env.SCENARIO_RUNS ?? 1);
const YU = { lat: 35.8318, lng: 128.7585 };
const USER = 'demo-moodpass';
const NOISY = ['karaoke', 'boardgame', 'climbing']; // 머리 비우기에 안 맞는 것 (소리 내기, 사람 많음, 몸 쓰기)

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-user-key': USER, 'x-reset-token': process.env.RESET_TOKEN ?? '' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as any };
}
const show = (items: any[]) => items.map((i) => `${i.title}(도보 ${i.walkMinutes}분·${i.price.toLocaleString()}원)`).join(', ');

let passedRuns = 0;
for (let run = 1; run <= RUNS; run++) {
  const fails: string[] = [];
  const check = (name: string, ok: boolean) => !ok && fails.push(name);
  if ((await api('POST', '/demo/reset')).status !== 200) throw new Error('초기화 실패: DEMO_MODE 서버와 RESET_TOKEN을 확인하세요');
  console.log(`\n── ${run}회차 ──`);

  // 1. 기분만 말한다 (조건 없음)
  const said = '시험 끝났는데 머리가 꽉 찼어. 근처에 갈 만한 데 찾아 줘';
  let r = await api('POST', '/talk', { message: said, ...YU });
  console.log(`  나: ${said}\n  토끼(${r.json.action}): ${r.json.reply}`);
  let turns = 1;
  while (r.json.action === 'talk' && turns < 3) {
    const pick = '근처 갈 곳 찾아 줘';
    r = await api('POST', '/talk', { sessionId: r.json.sessionId, message: pick, ...YU });
    turns++;
    console.log(`  나: ${pick}\n  토끼(${r.json.action}): ${r.json.reply}`);
  }
  const items: any[] = r.json.items ?? [];
  console.log(`  가정: ${r.json.assumptions}\n  읽은 필요: ${JSON.stringify(r.json.prefs)}\n  추천: ${show(items)}`);
  items.forEach((i, n) => console.log(`    ${n + 1}. ${i.title} — ${i.reason}`));
  check('2번 안에 추천', r.json.action === 'recommend' && turns <= 2);
  check('필요를 "비우기"로 읽음', r.json.prefs?.need === '비우기');
  check('추천 1~3개 (채워 넣기 없음)', items.length >= 1 && items.length <= 3);
  check('시끄럽거나 사람 많은 체험 없음', !items.some((i) => NOISY.includes(i.id)));
  const relaxed = /맞는 데가 없어서/.test(r.json.assumptions ?? '');
  check('조건 지킴 (1시간·도보 20분·2만원)', relaxed || items.every((i) => i.minutes <= 60 && i.walkMinutes <= 20 && i.price <= 20000));
  check('가정을 밝힘', !!r.json.assumptions);
  // 사용자가 한 말(머리, 시험, 비우기), 기억("좋아하잖아"), 지난 기록("전에·지난번·저번 … 기분", 4→8) 중 하나
  check('1위 이유에 사용자 말이나 기억·지난 기록', /도자기|8|머리|시험|꽉|비우|전에|지난|저번|좋아하/.test(items[0]?.reason ?? ''));
  check('1위는 효과 있었던 도자기', items[0]?.id === 'mini-pottery');

  // 2. "좀 멀다" → 더 가까운 걸로
  const first = items;
  const r2 = await api('POST', '/talk', { sessionId: r.json.sessionId, message: '음 좀 멀다', ...YU });
  const items2: any[] = r2.json.items ?? [];
  console.log(`  나: 음 좀 멀다\n  토끼(${r2.json.action}): ${r2.json.reply}\n  추천: ${show(items2)}`);
  check('"멀다" 뒤에도 추천', r2.json.action === 'recommend' && items2.length > 0);
  check('이전 1위보다 모두 가까움', items2.every((i) => i.walkMinutes < (first[0]?.walkMinutes ?? 0)));
  check('이미 본 것은 다시 안 나옴', !items2.some((i) => first.some((f) => f.id === i.id)));
  check('여전히 시끄러운 체험 없음', !items2.some((i) => NOISY.includes(i.id)));

  if (fails.length) console.log(`  ✗ 실패: ${fails.join(' / ')}`);
  else {
    passedRuns++;
    console.log('  ✓ 통과');
  }
  if (run < RUNS) await new Promise((res) => setTimeout(res, 3000)); // AI 분당 한도를 피해서
}
const health = (await api('GET', '/health')).json.llm;
console.log(`\n결과: ${passedRuns}/${RUNS} 통과   (AI 호출: ${JSON.stringify(health?.byClient)})`);
await api('POST', '/demo/reset');
process.exit(passedRuns === RUNS ? 0 : 1);
