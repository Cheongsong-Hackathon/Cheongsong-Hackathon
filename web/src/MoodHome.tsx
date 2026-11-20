import MumuArtwork, {MumuLoading} from './MumuArtwork';
import { useState } from 'react';
import { PhoneStatus } from './MumuWelcome';
import MumuHomeCharacter, { moodPortraits } from './MumuHomeCharacter';
import { canListen, listen } from './voice';
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
export default function MoodHome({busy,onRecommend,onNotifications,onVoice}:{busy:boolean;onRecommend:(message:string,mood:number|null)=>void;onNotifications:()=>void;onVoice?:()=>void}) {
 const [text,setText]=useState('');
 // 말하기가 메인(🎙 → 음성 대화), 글은 보조: 음성을 쓸 수 없는 브라우저면 처음부터 글 입력을 보여 준다
 const [writeOpen,setWriteOpen]=useState(!onVoice);
 const [selected,setSelected]=useState<number|null>(null);
 const pick=(i:number)=>{if(busy)return;setWriteOpen(true);if(selected===i){setSelected(null);setText('');return;}setSelected(i);setText(MOODS[i].text);};
 // 🎤 말로 하기: 들은 말을 입력칸에 채운다 (잘못 들었으면 고쳐서 보내도록 바로 보내지 않음)
 const [mic,setMic]=useState<{stop:()=>void}|null>(null);const [micError,setMicError]=useState('');
 const talk=async()=>{if(mic)return mic.stop();setMicError('');setSelected(null);const l=listen(setText);setMic(l);try{await l.done;}catch(e){setMicError((e as Error).message);}finally{setMic(null);}};
 const submit=()=>{const t=text.trim();if(t&&!busy)onRecommend(t,selected!==null&&text===MOODS[selected].text?selected:null);};
 return <div className="new-home" aria-busy={busy}>{busy&&<div className="mumu-loading-overlay"><MumuLoading message="무무가 마음에 맞는 장소를 찾고 있어요"/></div>}<PhoneStatus/><header className="new-brand"><MumuArtwork className="mumu-brand-logo"/><button aria-label="예약 알림 보기" onClick={onNotifications}><svg viewBox="0 0 24 24"><path d="M6 17v-6a6 6 0 0 1 12 0v6l2 2H4ZM10 21h4"/><circle cx="19" cy="4" r="2" fill="#8a4ee8" stroke="none"/></svg></button></header>
 <section className="new-home-hero">
  <div className="new-clouds" aria-hidden="true"/>
  <MumuHomeCharacter key={selected ?? 'default'} portrait={selected === null ? undefined : portraits[selected]} label={selected === null ? undefined : `무무의 표정 · ${MOODS[selected].title}`}/>
  <h1>오늘 하루는 어땠어?</h1><p>기분만 말해, 갈 곳은 무무가 찾아줄게.</p>
 </section>
 {onVoice&&<div className="voice-first"><button type="button" className="voice-main" disabled={busy} onClick={onVoice}><span aria-hidden="true">🎙</span>무무에게 말하기</button>{!writeOpen&&<button type="button" className="voice-write" onClick={()=>setWriteOpen(true)}>말하기 어려우면 글로 써도 돼 ✎</button>}</div>}
 {writeOpen&&<form className="mood-line" onSubmit={e=>{e.preventDefault();submit();}}>
  <textarea value={text} onChange={e=>{setText(e.target.value);if(selected!==null&&e.target.value!==MOODS[selected].text)setSelected(null);}} placeholder="아무 말이나 괜찮아. 예: 발표 망쳐서 아무것도 하기 싫어" maxLength={300} rows={2} aria-label="오늘 기분 한 줄" disabled={busy}
   onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();submit();}}}/>
  {canListen&&<button type="button" className={`mood-line-mic${mic?' listening':''}`} aria-label={mic?'그만 듣기':'말로 하기'} aria-pressed={!!mic} disabled={busy} onClick={talk}>🎤 {mic?'듣고 있어… 다 말했으면 눌러 줘':'말로 하기'}</button>}
  {micError&&<p className="mood-line-hint" role="alert">{micError}</p>}
  <button className="new-primary" disabled={busy||!text.trim()}>{busy?'무무가 마음을 읽는 중…':onVoice?'글로 보내기':'무무에게 말하기'} <span>→</span></button>
 </form>}
 <p className="mood-line-hint">{onVoice?'기분을 골라도 돼':'말하기 어려우면 골라도 돼'}</p>
 <div className="new-mood-grid" role="radiogroup" aria-label="오늘의 기분 고르기">{MOODS.map((m,i)=><button key={m.title} type="button" role="radio" aria-checked={i===selected} className={selected===i?'selected':''} disabled={busy} onClick={()=>pick(i)}><span className="new-mood-emoji" aria-hidden="true">{m.emoji}</span><strong>{m.title}</strong>{selected===i&&<span className="mood-check" aria-hidden="true">✓</span>}</button>)}</div>
 <p className="new-home-footnote">작은 외출이 오늘을 바꿀지도 몰라 ♡</p></div>;
}
