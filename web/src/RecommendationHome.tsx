import ChatInvitation from './ChatInvitation';
import { useEffect, useRef, useState } from 'react';
import MoodHome, {MOODS} from './MoodHome';
import {PlaceTile,TripHeader} from './TripUI';
import {COMFORT,MOOD_TITLES,recommendTrip} from './tripRecommendations';
import type {Item,LatLng} from './api';
// 홈: 한 줄(또는 카드) → 바로 AI 대화 추천. 조건 단계·예산 없음 (이동 시간은 서버 기본값, 가격은 네이버에서 확인)
export default function RecommendationHome({position,locationKey,onPick,onExplore,onSafety,onNotifications,onChat}:{position:()=>Promise<LatLng|null>;locationLabel?:string;locationKey:string;onLocation?:()=>void;onPick:(item:Item)=>void;onExplore:()=>void;onSafety:()=>void;onNotifications:()=>void;onChat:(message:string)=>void}){
 const [invitation,setInvitation]=useState<{message:string;idx:number|null}|null>(null);
 const page=useRef<HTMLDivElement>(null);
 const [step,setStep]=useState<'mood'|'main'>('mood');const [mood,setMood]=useState<number|null>(null);const [items,setItems]=useState<Item[]>([]);const [error,setError]=useState('');const [note,setNote]=useState('');const [reply,setReply]=useState('');const [analysis,setAnalysis]=useState<string[]>([]);const [busy,setBusy]=useState(false);const request=useRef(0);const lastLocation=useRef(locationKey);
 useEffect(()=>{page.current?.closest('.screen')?.scrollTo({top:0});},[step]);
 // 위치가 바뀌면 이전 추천은 버리고 처음으로
 if(lastLocation.current!==locationKey){lastLocation.current=locationKey;request.current++;if(step==='main')setStep('mood');if(items.length)setItems([]);if(busy)setBusy(false);}
 async function recommend(message:string,idx:number|null){if(busy)return;const key=++request.current;setBusy(true);setError('');setMood(idx);try{const result=await recommendTrip(message,idx,await position());if(key!==request.current)return;if(result.safety){onSafety();return;}setItems(result.items);setNote(result.note);setReply(result.reply);setAnalysis(result.analysis);setStep('main');}catch(e){if(key===request.current)setError(e instanceof Error?e.message:'다시 시도해 주세요.');}finally{if(key===request.current)setBusy(false);}}
 const back=()=>{request.current++;setBusy(false);setStep('mood');};
 if(invitation)return <ChatInvitation onBack={()=>setInvitation(null)} onChat={()=>{const message=invitation.message;setInvitation(null);onChat(message);}} onDecline={()=>{const {message,idx}=invitation;setInvitation(null);recommend(message,idx);}}/>;
 if(step==='mood')return <div ref={page}><MoodHome busy={busy} onNotifications={onNotifications} onRecommend={(message,idx)=>setInvitation({message,idx})}/>{error&&<p className="trip-error" role="alert">{error}</p>}</div>;
 const chips=analysis.length?analysis:mood!=null?[`${MOODS[mood].emoji} ${MOODS[mood].title}`]:[];
 return <div ref={page} className="trip-main"><TripHeader onNotice={onNotifications} onSearch={onExplore}/><section className="trip-main-comfort"><div className="character-space" aria-hidden="true"/><p className="trip-comfort-bubble">{reply||(mood!=null?COMFORT[mood]:'네 마음에 맞는 곳을 찾아봤어.')}</p><h1>{mood!=null?MOOD_TITLES[mood]:'네 마음을 읽어 봤어'}</h1><p>무무 AI가 너한테 맞는 기분전환 장소를 찾아왔어!</p></section>
 <section className="trip-analysis"><header><strong>✦ AI 분석 결과</strong><button onClick={back}>다시 말하기 ⟳</button></header>{chips.length>0&&<div className="trip-summary-chips">{chips.map(c=><span key={c}>{c}</span>)}</div>}</section>
 <h2 className="trip-section-title">✦ 무무 AI 맞춤 추천</h2>{items.length?<div className="trip-top-three">{items.map((item,i)=><PlaceTile key={item.id} item={item} rank={i+1} onPick={onPick}/>)}</div>:<section className="trip-empty"><p>근처에서 맞는 장소를 찾지 못했어요.</p><button onClick={back}>다르게 말해 보기</button></section>}
 <p className="trip-source-note">{items.length>0&&items.length<3?`${items.length}곳을 찾았어요. `:''}{note}</p><h2 className="trip-section-title">🌱 오늘의 작은 제안</h2><button className="trip-small-suggestion" onClick={onExplore}><span className="character-space" aria-hidden="true"/><span><strong>잠깐, 바깥 공기를 만나볼까?</strong><small>좋은 외출도 가벼운 한 걸음부터 시작해.</small></span><b>›</b></button><button className="trip-reset-mood" onClick={back}>오늘 기분 다시 말하기</button></div>;
}
