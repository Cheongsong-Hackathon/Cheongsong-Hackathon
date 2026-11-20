import { api, type Item, type LatLng } from './api';
import { sendTalk } from './talkClient';
// 카드(0~5)를 눌러 보낸 경우에만 쓰는 정해 둔 문장. 직접 쓴 한 줄은 AI가 읽은 결과(reply·prefs)를 보여 준다
export const NEEDS=['쉬기','비우기','풀기','즐기기','즐기기','비우기'];
export const MOOD_TITLES=['오늘은 많이 지쳤구나','마음이 조금 무거운 날이구나','답답한 하루를 보내고 있구나','새로운 바람이 필요한 날이구나','기분 좋은 하루를 보내고 있구나','잔잔한 하루에 변화가 필요하구나'];
export const COMFORT=['오늘은 애쓰지 않아도 괜찮아. 조용히 숨 돌릴 곳을 찾아볼게.','무기력한 날도 네 잘못이 아니야. 작은 외출부터 함께 시작해 보자.','많이 참느라 고생했어. 답답한 마음을 잠깐 내려놓을 곳을 찾아볼게.','익숙한 하루에 작은 설렘을 더해 보자. 네 마음에 맞는 경험을 찾아줄게.','그 좋은 마음이 오래 이어지도록, 오늘을 더 특별하게 만들어 보자.','크지 않은 변화도 충분해. 오늘에 작은 즐거움을 더해 보자.'];
const NEED_LABEL:Record<string,string>={쉬기:'쉬고 싶은 마음',비우기:'생각 비우기',풀기:'답답함 풀기',몰입:'뭔가 해내기',즐기기:'새로운 재미',연결:'누군가와 함께'};
const ENERGY_LABEL:Record<string,string>={낮음:'기운 낮음',보통:'기운 보통',높음:'기운 넉넉'};
export async function recommendTrip(message:string,mood:number|null,pos:LatLng|null){
 const reply=await sendTalk(null,message,pos);
 if(reply.action==='safety'||reply.state==='SAFETY')return {items:[] as Item[],safety:true,note:'',reply:'',analysis:[] as string[]};
 const p=reply.prefs;
 const analysis=[p?.need&&NEED_LABEL[p.need],p?.energy&&ENERGY_LABEL[p.energy],...(p?.want??[]).slice(0,2)].filter(Boolean) as string[];
 let items:Item[]=reply.action==='recommend'&&reply.items?.length?reply.items:[];
 let note=reply.assumptions??'';
 if(!items.length){const result=await api.browse(pos,p?.need??(mood!=null?NEEDS[mood]:null));if(result.code!==200)throw Error(result.error??reply.error??'추천 장소를 불러오지 못했어요. 연결을 확인해 주세요.');items=result.items??[];note='주변 장소를 기준으로 찾았어요.';}
 const unique=items.filter((item,i,all)=>all.findIndex(other=>other.id===item.id)===i);
 return {items:unique.slice(0,3),safety:false,note:[note,'운영시간·가격은 네이버에서 확인해 주세요.'].filter(Boolean).join(' · '),reply:reply.reply??'',analysis};
}
