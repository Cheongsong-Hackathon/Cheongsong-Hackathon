import MumuArtwork, {MumuLoading} from './MumuArtwork';
import { useState } from 'react';
import { PhoneStatus } from './MumuWelcome';
import MumuHomeCharacter, { moodPortraits } from './MumuHomeCharacter';
// 홈: "기분만 말해, 갈 곳은 무무가 찾아줄게". 자기 말로 한 줄 쓰는 게 메인이고(생성형 AI가 기분·위기·원하는 것을 읽음),
// 카드 6개는 쓰기 어려울 때 누르면 입력칸을 채워 주는 보조
export const MOODS=[
 {emoji:'😩',title:'피곤해',subtitle:'조용히 쉬고 싶어',text:'지치고 피곤해. 조용히 쉬고 싶어.'},
 {emoji:'😔',title:'우울해',subtitle:'기분을 환기하고 싶어',text:'우울하고 무기력해. 기분을 환기하고 싶어.'},
 {emoji:'😤',title:'답답해',subtitle:'신나게 풀고 싶어',text:'답답하고 스트레스 받아. 신나게 풀고 싶어.'},
 {emoji:'🥱',title:'심심해',subtitle:'새로운 경험을 하고 싶어',text:'심심하고 지루해. 새로운 경험을 하고 싶어.'},
 {emoji:'🥰',title:'기분 좋아',subtitle:'이 기분을 이어가고 싶어',text:'오늘 기분이 좋아. 이 기분을 이어가고 싶어.'},
 {emoji:'😌',title:'평범해',subtitle:'소소한 변화를 주고 싶어',text:'그냥 평범한 하루야. 소소한 변화를 주고 싶어.'},
];
const portraits = [
 moodPortraits.tired, moodPortraits.sad, moodPortraits.frustrated,
 moodPortraits.bored, moodPortraits.happy, moodPortraits.neutral,
];
export default function MoodHome({busy,onRecommend,onNotifications,onVoice,onOpenChat,hasHistory}:{busy:boolean;onOpenChat?:()=>void;hasHistory?:boolean;onRecommend:(message:string,mood:number|null)=>void;onNotifications:()=>void;onVoice?:()=>void}) {
 const [text,setText]=useState('');
 const [selected,setSelected]=useState<number|null>(null);
 const pick=(i:number)=>{if(busy)return;if(selected===i){setSelected(null);setText('');return;}setSelected(i);setText(MOODS[i].text);};
 const submit=()=>{const t=text.trim();if(t&&!busy)onRecommend(t,selected!==null&&text===MOODS[selected].text?selected:null);};
 return <div className="new-home" aria-busy={busy}>{busy&&<div className="mumu-loading-overlay"><MumuLoading message="무무가 마음에 맞는 장소를 찾고 있어요"/></div>}<PhoneStatus/><header className="new-brand"><MumuArtwork className="mumu-brand-logo"/><button type="button" aria-label="알림 보기" aria-haspopup="dialog" onClick={onNotifications}><svg viewBox="0 0 24 24"><path d="M6 17v-6a6 6 0 0 1 12 0v6l2 2H4ZM10 21h4"/><circle cx="19" cy="4" r="2" fill="#8a4ee8" stroke="none"/></svg></button></header>
 <section className="new-home-hero">
  <h1>오늘 하루는 어땠어?</h1><p>기분만 말해, 갈 곳은 무무가 찾아줄게.</p>
  <MumuHomeCharacter key={selected ?? 'default'} portrait={selected === null ? undefined : portraits[selected]} label={selected === null ? undefined : `무무의 표정 · ${MOODS[selected].title}`}/>
 </section>
 {/* 무무 바로 밑 대화창. 오른쪽 아이콘: 글이 없으면 🎙 음성 대화로 바꾸기, 글을 쓰면 보내기 */}
 <form className="mood-line home-talk" onSubmit={e=>{e.preventDefault();submit();}}>
  <textarea value={text} onChange={e=>{setText(e.target.value);if(selected!==null&&e.target.value!==MOODS[selected].text)setSelected(null);}} placeholder="무무한테 아무 말이나 해 봐" maxLength={300} rows={1} aria-label="무무에게 할 말" disabled={busy}
   onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();submit();}}}/>
  {onVoice&&<button type="button" className="home-talk-icon mic" aria-label="음성으로 대화하기" disabled={busy} onClick={onVoice}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>}
  <button className="home-talk-icon send" aria-label="보내기" disabled={busy||!text.trim()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 18-7-5 18-5-7-8-4Zm8 4 10-11"/></svg></button>
 </form>
 {/* 말을 보내지 않고 대화창만 열기 (지난 대화가 있으면 이어 보기) */}
 {onOpenChat&&<button type="button" className="home-open-chat" onClick={onOpenChat}>{hasHistory?'지난 대화 이어 보기':'대화창 열기'} ›</button>}
 <p className="mood-line-hint">말하기 어려우면 기분을 골라도 돼</p>
 <div className="new-mood-grid" role="radiogroup" aria-label="오늘의 기분 고르기">{MOODS.map((m,i)=><button key={m.title} type="button" role="radio" aria-checked={i===selected} className={selected===i?'selected':''} disabled={busy} onClick={()=>pick(i)}><span className="new-mood-emoji" aria-hidden="true">{m.emoji}</span><strong>{m.title}</strong>{selected===i&&<span className="mood-check" aria-hidden="true">✓</span>}</button>)}</div>
 <p className="new-home-footnote">작은 외출이 오늘을 바꿀지도 몰라 ♡</p></div>;
}
