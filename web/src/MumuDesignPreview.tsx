import { useEffect, useState } from 'react';
import Bunny from './Bunny';
import { EXPRESSIONS, type Expression } from './CharacterExpression';
import MumuMotionControls, { useMumuMotion } from './MumuMotionControls';
export default function MumuDesignPreview() {
 const [level,setLevel]=useState(() => { try { const value=Number(sessionStorage.getItem('mumu.preview.level')); return Number.isInteger(value)&&value>=1&&value<=6?value:1; } catch { return 1; } });
 useEffect(()=>{try { sessionStorage.setItem('mumu.preview.level',String(level)); } catch {}},[level]);
 const [expression,setExpression]=useState<Expression>('기본');
 const [faceOnly,setFaceOnly]=useState(false);
 const motion=useMumuMotion();
 return <main style={{maxWidth:600,margin:'0 auto',padding:24}}>
  <h1>무무 디자인 미리보기</h1>
  <p>코드를 저장하면 바로 반영돼요. 실제 경험치는 바뀌지 않아요.</p>
  <div className="chips" aria-label="성장 단계">{[1,2,3,4,5,6].map(n=><button className={`chip${level===n?' on':''}`} key={n} onClick={()=>setLevel(n)}>{n}단계</button>)}</div>
  <div style={{display:'grid',placeItems:'center',margin:'24px 0'}}><Bunny previewClothes={{owned:[],equipped:null,colors:{}}} faceOnly={faceOnly} size={320} visualForm={level} expression={expression} motion={motion.motion} motionKey={motion.motionKey}/></div>
  <label><input type="checkbox" checked={faceOnly} onChange={e=>setFaceOnly(e.target.checked)}/> 얼굴 아이콘으로 보기</label>
  <MumuMotionControls motion={motion.motion} play={motion.play}/>
  <div className="chips">{EXPRESSIONS.map(value=><button className={`chip${expression===value?' on':''}`} key={value} onClick={()=>setExpression(value)}>{value}</button>)}</div>
  <p><a href="/">앱으로 돌아가기</a></p>
 </main>;
}
