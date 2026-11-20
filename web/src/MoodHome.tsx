import { useState } from 'react';
import { PhoneStatus } from './MumuWelcome';
export const MOODS=[
 {emoji:'😩',title:'지치고 피곤해',subtitle:'조용히 쉬고 싶어',text:'지치고 피곤해. 조용히 쉴 수 있는 활동을 추천해 줘.'},
 {emoji:'😔',title:'우울하고 무기력해',subtitle:'기분을 환기하고 싶어',text:'우울하고 무기력해. 기분을 환기할 활동을 추천해 줘.'},
 {emoji:'😤',title:'답답하고 스트레스 받아',subtitle:'신나게 풀고 싶어',text:'답답하고 스트레스 받아. 신나게 풀 수 있는 활동을 추천해 줘.'},
 {emoji:'🥱',title:'심심하고 지루해',subtitle:'새로운 경험을 하고 싶어',text:'심심하고 지루해. 새로운 경험을 추천해 줘.'},
 {emoji:'🥰',title:'기분이 좋아',subtitle:'이 기분을 이어가고 싶어',text:'오늘 기분이 좋아. 이 기분을 이어갈 활동을 추천해 줘.'},
 {emoji:'😌',title:'그냥 평범해',subtitle:'소소한 변화를 주고 싶어',text:'그냥 평범한 하루야. 소소한 변화를 줄 활동을 추천해 줘.'},
];
function readMood() {try {const n=Number(localStorage.getItem('mumu.home-mood')??0);return Number.isInteger(n)&&n>=0&&n<6?n:0;}catch{return 0;}}
export default function MoodHome({busy,onRecommend,onNotifications}:{busy:boolean;onRecommend:(message:string)=>void;onNotifications:()=>void}) {
 const [selected,setSelected]=useState(readMood);
 return <div className="new-home"><PhoneStatus/><header className="new-brand"><strong>무무</strong><button aria-label="예약 알림 보기" onClick={onNotifications}><svg viewBox="0 0 24 24"><path d="M6 17v-6a6 6 0 0 1 12 0v6l2 2H4ZM10 21h4"/><circle cx="19" cy="4" r="2" fill="#8a4ee8" stroke="none"/></svg></button></header>
 <section className="new-home-hero"><div className="new-clouds" aria-hidden="true"/><div className="new-home-mascot"></div><h1>오늘 하루는 어땠어?</h1><p>지금 네 마음과 가장 가까운 기분을 골라줘!</p></section>
 <div className="new-mood-grid" role="radiogroup" aria-label="오늘의 기분">{MOODS.map((m,i)=><button key={m.title} role="radio" aria-checked={i===selected} className={selected===i?'selected':''} onClick={()=>{setSelected(i);try{localStorage.setItem('mumu.home-mood',String(i));}catch{}}}><span className="new-mood-emoji" aria-hidden="true">{m.emoji}</span><strong>{m.title}</strong><small>{m.subtitle}</small>{selected===i&&<span className="mood-check" aria-hidden="true">✓</span>}</button>)}</div>
 <button className="new-primary" disabled={busy} onClick={()=>onRecommend(MOODS[selected].text)}>{busy?'마음을 읽는 중…':'다음'} <span>→</span></button>
 <p className="new-home-footnote">작은 외출이 오늘을 바꿀지도 몰라 ♡</p></div>;
}
