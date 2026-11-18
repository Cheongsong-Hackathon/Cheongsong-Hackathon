// 대화 추천 평가: 질문 생성기(generate) → 가상 사용자와 대화(simulate) → 채점(evaluate)
// 세 단계는 파일로만 이어진다: goldens.json → runs/<시각>.json → reports/<시각>.md
// 참고한 구조: DeepEval(골든 → 시뮬레이터 → 지표), τ-bench(결과로 채점, pass^k), UserSimCRS·iEvaLM(LLM 가상 사용자),
// 가상 사용자가 정답을 흘리면 점수가 부풀려진다는 연구(arXiv 2403.16416) → 가상 사용자는 라벨 단어를 말하지 않는다.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { config } from '../src/config.js';
import { defaultClient, OpenAICompatClient, type LLMClient } from '../src/services/llm.js';
import { ENERGIES, NEEDS, TAGS } from '../src/services/match.js';

export const EVAL_DIR = fileURLToPath(new URL('.', import.meta.url));
export const GOLDENS = `${EVAL_DIR}goldens.json`;
export const RUNS_DIR = `${EVAL_DIR}runs/`;
export const REPORTS_DIR = `${EVAL_DIR}reports/`;
mkdirSync(RUNS_DIR, { recursive: true });
mkdirSync(REPORTS_DIR, { recursive: true });

export const STYLES = ['막연', '짧음', '구체', '흐트러짐'] as const; // 흐트러짐: 오타·ㅇㅇ·줄임말
export const FOLLOWUPS = ['없음', '멀어', '비싸', '힘들어'] as const;

/** 골든 하나 = 테스트 사용자 한 명: 상황, 첫 말, 그리고 시스템이 맞혀야 할 숨은 정답 */
export const Golden = z.object({
  id: z.string(),
  situation: z.string(), // 가상 사용자에게만 주는 배경 (시스템은 모름)
  opener: z.string(), // 첫 말. 실제 사람처럼, 라벨 단어 없이
  style: z.enum(STYLES),
  need: z.enum(NEEDS), // 정답: 시스템이 읽어 내야 할 필요
  energy: z.enum(ENERGIES),
  avoid: z.array(z.enum(TAGS)), // 정답: 이 특징이 들어간 체험은 추천되면 안 됨
  followup: z.enum(FOLLOWUPS), // 첫 추천을 받고 보일 반응
  crisis: z.boolean(), // true면 시스템은 추천을 멈추고 안전 안내를 해야 함
});
export type Golden = z.infer<typeof Golden>;

export type Turn = { user: string; res: any; ms: number };
export type Conversation = { goldenId: string; repeat: number; userKey: string; turns: Turn[]; error?: string };
export type Run = { startedAt: string; base: string; repeats: number; goldens: Golden[]; conversations: Conversation[] };

/** 가상 사용자·심사용 모델: 서비스와 다른 모델 (예비 AI 설정, 보통 CLOVA). 없으면 서비스 모델로.
 *  같은 모델끼리 묻고 답하고 채점하면 점수가 후해진다. */
export const otherModel = (): LLMClient =>
  config.llmFallback.apiKey ? new OpenAICompatClient('sim', config.llmFallback) : (defaultClient as LLMClient);

export const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
