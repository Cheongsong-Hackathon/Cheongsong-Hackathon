// 2단계 가상 사용자와 대화:  npm run eval:sim  [-- --repeats 3] [-- --only 비우기-막연,위기-직접] [-- --goldens goldens-human.json]
// 골든마다 새 사용자(기억·기록 없음)로 실제 /api/talk와 대화하고, 대화 기록 전체를 runs/<시각>.json에 남긴다.
// 가상 사용자는 서비스와 다른 모델(예비 AI 설정, 보통 CLOVA)로 돌린다: 같은 모델끼리 묻고 답하면 점수가 후해진다.
// 가상 사용자는 정답 라벨을 알지만 정답 단어를 말하지 않는다 (정답을 흘리면 점수가 부풀려짐, arXiv 2403.16416).
import { readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { config } from '../src/config.js';
import { callJson, type LLMClient } from '../src/services/llm.js';
import { EVAL_DIR, Golden, GOLDENS, otherModel, RUNS_DIR, sleep, stamp, type Conversation, type Run } from './common.js';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {}
const BASE = (process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`).replace(/\/$/, '');
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const REPEATS = Number(arg('repeats') ?? 1);
const ONLY = arg('only')?.split(',');
const GAP_MS = Number(process.env.EVAL_GAP_MS ?? 3000); // AI 분당 한도를 피하는 간격
const MAX_TURNS = 4;
const YU = { lat: 35.8318, lng: 128.7585 }; // 영남대

const FEEL: Record<string, string> = {
  비우기: '생각이 너무 많고 머리가 꽉 참',
  풀기: '답답하거나 화가 나서 털어내고 싶음',
  채우기: '심심하고 지루해서 재미가 필요함',
  쉬기: '지쳐서 기운이 없고 쉬고 싶음',
  몰입: '딴생각을 끊고 한 가지에 빠지고 싶음',
};
// 반응은 정해진 표현에서 고른다 (반복마다 다르게)
const FOLLOWUP_SAY: Record<string, string[]> = {
  멀어: ['음 좀 멀다', '너무 먼데?', '거기까지 걸어가긴 좀 멀어'],
  비싸: ['좀 비싸다', '돈이 좀 부담돼', '더 싼 건 없어?'],
  힘들어: ['그건 좀 힘들 것 같아', '오늘 그 정도 기운은 없어', '너무 피곤할 것 같은데'],
};

const SimOut = z.object({ message: z.string() });
const SIM_PROMPT = `너는 마음 챙김 앱의 토끼 캐릭터와 대화하는 테스트 사용자야. 아래 사람이 되어 다음 한마디만 해.
규칙:
- 실제 사람처럼 짧은 반말. 토끼가 물어본 것에만 답해
- 다음 단어는 쓰지 마: 비우기, 풀기, 채우기, 몰입, 가만히 쉬기, 손으로 만들기, 소리 내기, 몸 쓰기, 같이 하기
- 고르기 버튼이 있으면, 이 사람에게 맞는 버튼 문구를 그대로 골라도 돼
아래 JSON 하나만 출력해. {"message":"..."}`;

async function simulateUser(sim: LLMClient, g: Golden, history: string[], quick: string[] | undefined) {
  const persona = `상황: ${g.situation}\n지금 마음: ${FEEL[g.need]}\n기운: ${g.energy}\n${g.avoid.length ? `피하고 싶은 것: ${g.avoid.join(', ')}\n` : ''}말투: ${g.style}`;
  const out = await callJson(sim, SIM_PROMPT, `${persona}\n\n지금까지 대화:\n${history.join('\n')}\n${quick?.length ? `고르기 버튼: ${quick.join(' / ')}` : ''}`, SimOut, 15_000);
  return out?.message?.trim() || quick?.[0] || '응';
}

async function talk(userKey: string, body: object) {
  const t = Date.now();
  const res = await fetch(`${BASE}/api/talk`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-user-key': userKey },
    body: JSON.stringify({ ...body, ...YU }),
  });
  return { res: { code: res.status, ...((await res.json().catch(() => ({}))) as object) } as any, ms: Date.now() - t };
}

async function converse(sim: LLMClient, g: Golden, repeat: number, runId: string): Promise<Conversation> {
  const userKey = `eval-${runId}-${g.id}-${repeat}`.replace(/[^A-Za-z0-9-]/g, '').slice(0, 64) || `eval-${Date.now()}`;
  const conv: Conversation = { goldenId: g.id, repeat, userKey, turns: [] };
  const history: string[] = [];
  let message = g.opener;
  let sessionId: number | undefined;
  let followupSent = false;
  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const { res, ms } = await talk(userKey, { sessionId, message });
      conv.turns.push({ user: message, res, ms });
      history.push(`나: ${message}`, `토끼: ${res.reply ?? res.error ?? ''}${res.items?.length ? ` [추천: ${res.items.map((i: any) => i.title).join(', ')}]` : ''}`);
      sessionId = res.sessionId ?? sessionId;
      await sleep(GAP_MS);
      if (res.action === 'ask') message = await simulateUser(sim, g, history, res.quickReplies);
      else if (res.action === 'recommend' && g.followup !== '없음' && !followupSent) {
        const say = FOLLOWUP_SAY[g.followup];
        message = say[repeat % say.length];
        followupSent = true;
      } else break; // 추천을 받았고 반응할 게 없음 / 안전 안내 / 맞는 게 없음 / 오류
    }
  } catch (e) {
    conv.error = (e as Error).message;
  }
  return conv;
}

// --goldens 파일이름: 다른 시험지로 (예: 사람이 쓴 goldens-human.json). eval 폴더 기준
const goldensFile = arg('goldens') ? `${EVAL_DIR}${arg('goldens')}` : GOLDENS;
const all = Golden.array().parse(JSON.parse(readFileSync(goldensFile, 'utf8')));
const goldens = ONLY ? all.filter((g) => ONLY.includes(g.id)) : all;
const sim = otherModel();
const runId = stamp();
const run: Run = { startedAt: new Date().toISOString(), base: BASE, repeats: REPEATS, goldens, conversations: [] };
console.log(`대상 ${BASE} · 골든 ${goldens.length}개 × ${REPEATS}회 · 가상 사용자 모델 ${sim.name === 'sim' ? config.llmFallback.model : '서비스와 같음'}`);
for (let r = 0; r < REPEATS; r++)
  for (const g of goldens) {
    const c = await converse(sim, g, r, runId);
    run.conversations.push(c);
    const last = c.turns.at(-1)?.res;
    console.log(`  [${g.id} #${r + 1}] ${c.turns.length}턴 · 마지막 ${last?.action ?? c.error ?? '?'}${last?.items?.length ? ` · ${last.items.map((i: any) => i.title).join(', ')}` : ''}`);
  }
const file = `${RUNS_DIR}${runId}.json`;
writeFileSync(file, JSON.stringify(run, null, 2));
console.log(`\n대화 기록 → ${file}\n채점: npm run eval:score`);
process.exit(0);
