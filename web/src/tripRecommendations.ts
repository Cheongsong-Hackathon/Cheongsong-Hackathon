import { api, type Item, type LatLng } from './api';
import { sendTalk } from './talkClient';
export type TripPreferences={minutes:number;categories:string[];company:string;budget:string};
export const DEFAULT_PREFERENCES:TripPreferences={minutes:30,categories:['카페','전시/미술관'],company:'혼자',budget:'1~3만원'};
export const NEEDS=['쉬기','비우기','풀기','즐기기','즐기기','비우기'];
export const MOOD_TITLES=['오늘은 많이 지쳤구나','마음이 조금 무거운 날이구나','답답한 하루를 보내고 있구나','새로운 바람이 필요한 날이구나','기분 좋은 하루를 보내고 있구나','잔잔한 하루에 변화가 필요하구나'];
export const COMFORT=['오늘은 애쓰지 않아도 괜찮아. 조용히 숨 돌릴 곳을 찾아볼게.','무기력한 날도 네 잘못이 아니야. 작은 외출부터 함께 시작해 보자.','많이 참느라 고생했어. 답답한 마음을 잠깐 내려놓을 곳을 찾아볼게.','익숙한 하루에 작은 설렘을 더해 보자. 네 마음에 맞는 경험을 찾아줄게.','그 좋은 마음이 오래 이어지도록, 오늘을 더 특별하게 만들어 보자.','크지 않은 변화도 충분해. 오늘에 작은 즐거움을 더해 보자.'];
export async function recommendTrip(mood:number,message:string,p:TripPreferences,pos:LatLng|null){
 const request=`${message} 이동은 도보 ${p.minutes}분 이내, 활동 유형은 ${p.categories.join(', ')||'상관없음'}, 동행은 ${p.company}, 예산은 ${p.budget}. 위 조건으로 실제로 갈 수 있는 장소를 추천해 줘.`;
 const reply=await sendTalk(null,request,pos);
 if(reply.action==='safety'||reply.state==='SAFETY')return {items:[],safety:true,note:''};
 let items:Item[]=reply.action==='recommend'&&reply.items?.length?reply.items:[];
 let note='';
 if(!items.length){const result=await api.browse(pos,NEEDS[mood]);if(result.code!==200)throw Error(result.error??reply.error??'추천 장소를 불러오지 못했어요. 연결을 확인해 주세요.');items=result.items??[];note='주변 장소를 기준으로 찾았어요. 운영시간·가격은 방문 전 확인해 주세요.';}
 const filtered=items.filter(item=>!Number.isFinite(item.walkMinutes)||item.walkMinutes<=p.minutes);
 const unique=filtered.filter((item,i,all)=>all.findIndex(other=>other.id===item.id)===i);
 return {items:unique.slice(0,3),safety:false,note:note||'선택 조건을 AI에 전달했어요. 운영시간·가격은 매장에서 확인해 주세요.'};
}
