import type { Expression } from './CharacterExpression';

// Local visual cues only; this never drives recommendations or changes the saved mood.
export function expressionFromText(text: string): Expression {
  const compact = text.toLowerCase().replace(/\s+/g, '');
  // Avoid common negations before looking for emotion words.
  const normalized = compact
    .replace(/(기분이?|마음이?)?안좋[가-힣]*|안괜찮[가-힣]*|(행복|즐겁|기쁘|괜찮|좋)(하지않|지않)[가-힣]*/g, '힘들')
    .replace(/(불안|걱정|긴장)(이|은|는)?(없|사라졌)[가-힣]*/g, '안심')
    .replace(/(불안|걱정|긴장|답답|화나|짜증|슬프|우울|힘들|피곤|지치|심심)(하지않|하지는않|지않|지않은|지않아|하지않아|하지않은|안해|없어|없다|없네)[가-힣]*/g, '')
    .replace(/안(불안|걱정|긴장|답답|화나|짜증|슬프|우울|힘들|피곤|심심)[가-힣]*/g, '')
    .replace(/(안|못)(행복|기쁘|즐겁|신나)[가-힣]*/g, '힘들');
  if (/불안|걱정|긴장|두렵|무섭|떨려|떨리|초조/.test(normalized)) return '불안해';
  if (/답답|짜증|화나|화가나|속상|억울|분하|스트레스/.test(normalized)) return '답답해';
  if (/지쳤|지치|피곤|힘들|슬프|슬퍼|우울|외롭|외로워|울고|울었|눈물|기운없/.test(normalized)) return '지쳤어';
  if (/심심|지루|무료해|할게없/.test(normalized)) return '심심해';
  if (/기뻐|기쁘|행복|즐겁|즐거|신나|신났|설레|설렜|고마워|감사|좋아|좋았|좋네|좋은|합격|축하|사랑|최고|💜|❤️|😊|🥰/.test(normalized)) return '기뻐';
  if (/평온|편안|차분|괜찮|안심|후련|여유|마음이놓|쉬고|쉬자|쉬어/.test(normalized)) return '평온해';
  return '기본';
}

export function conversationExpressions(messages: readonly { who: 'bunny' | 'me'; text: string }[], fallback: Expression) {
  let userMood: Expression = fallback;
  return messages.map(message => {
    const detected = expressionFromText(message.text);
    if (message.who === 'me') {
      userMood = detected === '기본' ? userMood : detected;
      return userMood;
    }
    // Empathize with a difficult user message even if the reply contains reassuring words.
    return userMood !== '기본' ? userMood : detected;
  });
}
