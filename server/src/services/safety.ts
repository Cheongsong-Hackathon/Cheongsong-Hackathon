// 1차 위기 감지: LLM을 부르기 전에 키워드로 먼저 걸러낸다. (2차는 LLM 출력의 risk)
// ponytail: 단순 키워드 매칭. "배고파 죽겠네" 같은 관용구는 통과시키되, 애매하면 안전 쪽으로 잡는다.
const KEYWORDS = ['죽고싶', '죽어버리고싶', '죽을래', '사라지고싶', '없어지고싶', '자해', '자살', '목숨을끊', '그만살고싶', '살기싫'];

export const SafetyGuard = {
  check(text: string): boolean {
    const t = text.replace(/\s+/g, '');
    return KEYWORDS.some((k) => t.includes(k));
  },
};

export const SAFETY_REPLY =
  '그런 마음이 들 만큼 힘들었구나. 말해 줘서 고마워. 지금은 나보다 더 잘 도와줄 수 있는 사람과 이야기해 보면 좋겠어. 아래 번호로 언제든 전화할 수 있어.';
