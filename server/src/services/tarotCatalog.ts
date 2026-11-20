export const tarotTopics = [
  { id: 'daily', label: '오늘의 흐름' },
  { id: 'love', label: '연애·관계' },
  { id: 'career', label: '진로·학업·일' },
  { id: 'choice', label: '선택·고민' },
] as const;

export type TarotTopic = typeof tarotTopics[number]['id'];
export type TarotMode = 'one' | 'three';

export const tarotCards = [
  {"id":"major-0","number":0,"nameEn":"The Fool","nameKo":"광대","keywords":["시작","순수","모험","자유"],"summary":"새로운 출발과 열린 가능성을 뜻합니다. 계산보다 직관과 가벼운 발걸음이 어울리는 시기입니다."},
  {"id":"major-1","number":1,"nameEn":"The Magician","nameKo":"마법사","keywords":["의지","재능","실행력","집중"],"summary":"필요한 자원과 능력이 이미 손에 있습니다. 아이디어를 행동으로 옮길 때 결과가 나옵니다."},
  {"id":"major-2","number":2,"nameEn":"The High Priestess","nameKo":"여사제","keywords":["직관","신비","내면","통찰"],"summary":"겉으로 드러난 정보보다 내면의 직관과 차분한 관찰이 답을 줍니다. 서두르지 마세요."},
  {"id":"major-3","number":3,"nameEn":"The Empress","nameKo":"여제","keywords":["풍요","성장","돌봄","매력"],"summary":"따뜻하게 키우고 보살필수록 잘 자라는 흐름입니다. 창작, 애정, 일상의 여유가 무르익습니다."},
  {"id":"major-4","number":4,"nameEn":"The Emperor","nameKo":"황제","keywords":["질서","책임","기준","안정"],"summary":"명확한 규칙과 현실적인 계획이 상황을 단단히 잡아줍니다. 주도권을 갖고 원칙을 지키세요."},
  {"id":"major-5","number":5,"nameEn":"The Hierophant","nameKo":"교황","keywords":["조언","전통","배움","신뢰"],"summary":"검증된 방식이나 멘토의 조언, 기본기가 도움이 됩니다. 약속과 신뢰를 지키는 것이 중요합니다."},
  {"id":"major-6","number":6,"nameEn":"The Lovers","nameKo":"연인","keywords":["선택","조화","끌림","가치관"],"summary":"마음이 향하는 곳을 선택해야 하는 갈림길입니다. 관계와 가치의 조화가 중요한 흐름입니다."},
  {"id":"major-7","number":7,"nameEn":"The Chariot","nameKo":"전차","keywords":["추진력","돌파","승리","방향성"],"summary":"흔들림을 다잡고 앞으로 치고 나갈 힘입니다. 목표가 선명할수록 빠르게 전진할 수 있습니다."},
  {"id":"major-8","number":8,"nameEn":"Strength","nameKo":"힘","keywords":["내유외강","인내","포용","용기"],"summary":"거친 힘보다 부드러운 설득과 침착한 인내가 상황을 이깁니다. 스스로를 믿고 다독이세요."},
  {"id":"major-9","number":9,"nameEn":"The Hermit","nameKo":"은둔자","keywords":["성찰","탐구","고독","지혜"],"summary":"잠시 소음을 끄고 혼자만의 시간을 가지며 본질을 돌아볼 때입니다. 답은 안쪽에 있습니다."},
  {"id":"major-10","number":10,"nameEn":"Wheel of Fortune","nameKo":"운명의 수레바퀴","keywords":["전환점","기회","흐름","순환"],"summary":"흐름이 바뀌는 타이밍입니다. 찾아오는 변화와 우연한 기회를 유연하게 받아들이세요."},
  {"id":"major-11","number":11,"nameEn":"Justice","nameKo":"정의","keywords":["균형","공정","인과응보","판단"],"summary":"뿌린 대로 거두는 냉정하고 명확한 균형의 시기입니다. 감정보다 사실과 원칙을 기준으로 보세요."},
  {"id":"major-12","number":12,"nameEn":"The Hanged Man","nameKo":"매달린 남자","keywords":["관점전환","멈춤","수용","기다림"],"summary":"억지로 밀어붙이기보다 멈춰 서서 다른 각도로 바라볼 때입니다. 지금은 기다림 자체가 의미가 있습니다."},
  {"id":"major-13","number":13,"nameEn":"Death","nameKo":"죽음","keywords":["끝과 시작","정리","변화","탈피"],"summary":"한 챕터가 끝나야 다음 페이지가 열립니다. 미련을 덜어내고 자연스럽게 떠나보내세요."},
  {"id":"major-14","number":14,"nameEn":"Temperance","nameKo":"절제","keywords":["조율","균형","회복","치유"],"summary":"극단을 피하고 적정선을 맞추는 조화의 카드입니다. 차근차근 섞이고 스며드는 시간이 필요합니다."},
  {"id":"major-15","number":15,"nameEn":"The Devil","nameKo":"악마","keywords":["집착","유혹","욕망","속박"],"summary":"달콤한 유혹이나 과도한 집착·습관에 묶여 있는지 비춰봅니다. 무엇에 끌리는지 직면해 보세요."},
  {"id":"major-16","number":16,"nameEn":"The Tower","nameKo":"탑","keywords":["급변","깨달음","재구성","충격"],"summary":"흔들리던 기반이 무너지며 진짜 모습이 드러납니다. 갑작스럽지만 꼭 필요한 재정비의 계기가 됩니다."},
  {"id":"major-17","number":17,"nameEn":"The Star","nameKo":"별","keywords":["희망","영감","치유","방향"],"summary":"어둠 뒤에 떠오르는 잔잔한 희망과 맑은 영감입니다. 기대를 품고 한 걸음씩 나아가도 좋습니다."},
  {"id":"major-18","number":18,"nameEn":"The Moon","nameKo":"달","keywords":["불확실성","상상","꿈","그림자"],"summary":"아직 모든 것이 선명하지 않은 밤길입니다. 막연한 두려움이나 상상이 커질 수 있으니 성급한 단정은 피하세요."},
  {"id":"major-19","number":19,"nameEn":"The Sun","nameKo":"태양","keywords":["성취","활력","명랑","성공"],"summary":"막힘이 걷히고 밝고 따뜻한 에너지가 가득한 흐름입니다. 솔직하고 당당하게 빛을 누려도 좋습니다."},
  {"id":"major-20","number":20,"nameEn":"Judgement","nameKo":"심판","keywords":["각성","부름","재평가","회복"],"summary":"지난 시간의 경험이 하나의 의미로 모이며 다시 일어서는 전환점입니다. 스스로의 부름에 응답하세요."},
  {"id":"major-21","number":21,"nameEn":"The World","nameKo":"세계","keywords":["완성","통합","성취","확장"],"summary":"한 주기를 멋지게 마무리하고 다음 단계로 나아가는 완성의 카드입니다. 그동안의 과정을 축하해 주세요."}
] as const;

export type TarotCard = typeof tarotCards[number];
export type DrawnCard = TarotCard & { reading: string };

const reflection: Record<TarotTopic, (keyword: string) => string> = {
  daily: keyword => `오늘 하루에 ‘${keyword}’의 힌트가 될 작은 행동을 하나 정해 보세요.`,
  love: keyword => `‘${keyword}’의 관점에서 상대에게 바라는 것과 내가 표현할 수 있는 것을 각각 떠올려 보세요.`,
  career: keyword => `일이나 학업에서 ‘${keyword}’에 가까워지려면 오늘 어떤 한 걸음을 내디딜 수 있을까요?`,
  choice: keyword => `‘${keyword}’을 기준으로 각 선택에서 얻는 것과 감수해야 할 것을 적어 보세요.`,
};

export function readTarotCard(card: TarotCard, topic: TarotTopic): DrawnCard {
  return { ...card, reading: `${card.summary} ${reflection[topic](card.keywords[0])}` };
}
