import { useState } from 'react';
import MumuGameHost from './MumuGameHost';
import MumuGameScene from './MumuGameScene';

const readings = [
  {
    title: '종합운', icon: '♛', keywords: '도전 · 정리 · 활력',
    messages: ['새로운 변화를 준비하기 좋은 때예요. 미뤄둔 일 하나만 가볍게 시작해봐요.', '오늘은 서두르지 않아도 괜찮아요. 마음에 걸리는 일부터 차근차근 정리해봐요.', '익숙한 하루에 작은 변화를 더해보세요. 평소와 다른 길에서 즐거움을 발견할지도 몰라요.'],
  },
  {
    title: '연애운', icon: '💗', keywords: '공감 · 여유 · 대화',
    messages: ['가벼운 안부 한마디가 마음을 가까이 이어줄지도 몰라요.', '좋은 대화는 듣는 데서 시작해요. 상대의 이야기에 여유 있게 귀 기울여봐요.', '솔직한 표현이 어색하다면 작은 고마움부터 말해봐요.'],
  },
  {
    title: '학업·취업운', icon: '💼', keywords: '집중 · 꾸준함 · 준비',
    messages: ['할 일이 많다면 가장 짧게 끝낼 수 있는 것부터 손대보세요.', '새로운 정보를 늘리기보다 이미 배운 내용을 한 번 정리해봐요.', '지금까지 쌓인 경험을 한 문장씩 적어보면 다음 방향이 보일지도 몰라요.'],
  },
  {
    title: '재물운', icon: '🍀', keywords: '균형 · 점검 · 계획',
    messages: ['오늘의 지출을 한 번 돌아보고 다음에 필요한 것만 적어봐요.', '사고 싶은 게 떠오르면 잠시 시간을 두고 내일 다시 살펴봐요.', '작게 아낀 돈을 나중에 하고 싶은 일에 따로 모아두는 건 어때요?'],
  },
] as const;

const lucky = [
  { color: '라벤더 퍼플', item: '다이어리', advice: '오늘 떠오른 작은 계획을 한 줄만 적어봐요.' },
  { color: '소프트 민트', item: '텀블러', advice: '시원한 물 한 잔과 함께 잠깐 숨을 돌려봐요.' },
  { color: '살구빛 핑크', item: '이어폰', advice: '좋아하는 노래 한 곡을 틀고 천천히 걸어봐요.' },
] as const;

export default function MumuFortune() {
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [gender, setGender] = useState('');
  const [seed, setSeed] = useState<number | null>(null);
  const [category, setCategory] = useState(0);
  const [shareStatus, setShareStatus] = useState('');
  const today = new Date().toLocaleDateString('sv-SE');

  function reveal() {
    const key = `${birthDate}|${birthTime}|${gender}|${today}`;
    setSeed(Array.from(key).reduce((value, letter) => (value * 31 + letter.charCodeAt(0)) % 997, 0));
    setCategory(0);
  }

  const reading = readings[category];
  const variant = ((seed ?? 0) + category) % lucky.length;
  const fortune = lucky[variant];
  const rating = 3 + ((seed ?? 0) + category * 2) % 3;

  async function shareResult() {
    const text = `무무의 사주풀이 · 오늘의 ${reading.title}\n${reading.messages[variant]}\n행운의 색: ${fortune.color} · 행운의 아이템: ${fortune.item}`;
    setShareStatus('');
    try {
      if (navigator.share) {
        await navigator.share({ title: '무무의 사주풀이', text });
      } else {
        await navigator.clipboard.writeText(text);
        setShareStatus('결과를 복사했어요.');
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setShareStatus('결과를 공유하지 못했어요.');
      }
    }
  }

  if (seed === null) return <>
    <MumuGameScene theme="fortune">무무와 함께<br />재미로 보는 사주풀이!<br />오늘의 운세를 확인해볼까? 💜</MumuGameScene>
    <form className="game-panel fortune-form" onSubmit={event => { event.preventDefault(); reveal(); }}>
      <h2>🗓 내 정보를 알려줘!</h2>
      <p>재미로 보는 운세에 사용할 정보를 입력해줘.</p>
      <label><span>생년월일</span><input type="date" required max={today} value={birthDate} onChange={event => setBirthDate(event.target.value)} /></label>
      <label><span>태어난 시간 <small>(선택)</small></span><input type="time" value={birthTime} onChange={event => setBirthTime(event.target.value)} /></label>
      <fieldset>
        <legend>성별 <small>(선택)</small></legend>
        <div>{['여성', '남성'].map(value => <button key={value} type="button" aria-pressed={gender === value} onClick={() => setGender(gender === value ? '' : value)}>{value}</button>)}</div>
      </fieldset>
      <small className="fortune-privacy">입력한 정보는 이 화면에서만 사용해요.</small>
      <button className="game-primary" type="submit">✨ 사주풀이 보기</button>
    </form>
  </>;

  return <>
    <MumuGameScene theme="fortune" layout="side">짠!<br />오늘의 사주풀이가<br />완성됐어! 💜</MumuGameScene>
    <div className="fortune-categories" role="group" aria-label="운세 종류">
      {readings.map((value, index) => <button type="button" key={value.title} aria-pressed={category === index} onClick={() => { setCategory(index); setShareStatus(''); }}>{value.icon} {value.title}</button>)}
    </div>
    <section className="game-panel fortune-result" aria-live="polite">
      <header><span aria-hidden="true">📜</span><div><h2>오늘의 {reading.title}</h2><div className="fortune-rating" aria-label={`별 5개 중 ${rating}개`}>{'★'.repeat(rating)}<span>{'★'.repeat(5 - rating)}</span></div></div></header>
      <p>{reading.messages[variant]}</p>
      <div className="tarot-guide fortune-guide">
        <div>🌱<strong>행운 키워드</strong><small>{reading.keywords}</small></div>
        <div>🔮<strong>행운의 색</strong><small>{fortune.color}</small></div>
        <div>⭐<strong>행운의 아이템</strong><small>{fortune.item}</small></div>
      </div>
      <aside className="tarot-advice"><div><strong>🌱 무무의 한마디</strong><p>{fortune.advice} 💜</p></div><MumuGameHost /></aside>
    </section>
    <div className="fortune-actions">
      <button type="button" className="game-primary" onClick={() => void shareResult()}>⇧ 결과 공유하기</button>
      <button type="button" onClick={() => { setSeed(null); setShareStatus(''); }}>⟳ 다시 보기</button>
    </div>
    {shareStatus && <p className="fortune-privacy" role="status">{shareStatus}</p>}
  </>;
}
