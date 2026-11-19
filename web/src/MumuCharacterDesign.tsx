import { getMumuParts } from './mumuParts';
// 완성 PNG를 기본으로 표시하고, parts/stage-N/body.png가 있으면 분리 애니메이션으로 자동 전환합니다.
// 이미지 교체: assets/characters/mumu-stage-1.png ~ mumu-stage-6.png
// 위치와 크기만 바꾸려면 아래 boxes의 [x, y, 너비, 높이]를 조절하세요.
import type { ReactNode } from 'react';
import type { Expression } from './CharacterExpression';
import type { MumuMotion } from './MumuMotionControls';
import useMumuAnimation from './useMumuAnimation';
import bounds from './assets/characters/image-bounds.json';
import stage1 from './assets/characters/mumu-stage-1.png';
import stage2 from './assets/characters/mumu-stage-2.png';
import stage3 from './assets/characters/mumu-stage-3.png';
import stage4 from './assets/characters/mumu-stage-4.png';
import stage5 from './assets/characters/mumu-stage-5.png';
import stage6 from './assets/characters/mumu-stage-6.png';
const images=[stage1,stage2,stage3,stage4,stage5,stage6];
const boxes=[[24,56,158,153],[31,75,143,135],[35,24,139,187],[43,21,127,193],[30,63,145,153],[34,24,153,190]];
const heart='M0 8C-15-2-8-13 0-6C8-13 15-2 0 8Z';
export default function MumuCharacterDesign({level,headOnly,quiet,clothing,accessories,motion=null,motionKey=0,loopMotion=false,mood,headwear}:{level:number;headOnly:boolean;smiling:boolean;mood:Expression;quiet:boolean;clothing?:ReactNode;accessories?:ReactNode;motion?:MumuMotion|null;motionKey?:number;loopMotion?:boolean;headwear?:string|null}) {
 const n=Number.isFinite(level)?Math.max(1,Math.min(6,Math.trunc(level))):1;
 const parts=getMumuParts(n,mood);
 const rigged=!!parts.body;
 const animation=useMumuAnimation(quiet||headOnly?null:motion,motionKey,loopMotion,rigged?parts.joints:undefined);
 const part=(url:string|undefined,name:string)=>url?<image data-mumu-part={name} href={url} x="0" y="0" width="205" height="225" preserveAspectRatio="none"/>:null;
 const {width,height,bounds:crop}=bounds[n-1];
 const [left,top,right,bottom]=crop;
 const [x,y,w,h]=boxes[n-1];
 // 사진은 이미 기울어져 있으므로 이미지 자체를 다시 회전시키지 않습니다.
 const tilt=n===1?35:n===3?13:n===6?-22:0;
 return <>
  {rigged&&!headOnly&&<g ref={animation.shadow}>{part(parts.shadow,'shadow')}</g>}
  <g ref={animation.body} className={`mumu-action${motion?' mumu-action-'+motion:''}`}>
   {rigged?<>
    {!headOnly&&<><g ref={animation.tail}>{part(parts.tail,'tail')}</g><g ref={animation.leftLeg}>{part(parts.leftLeg,'left-leg')}</g><g ref={animation.rightLeg}>{part(parts.rightLeg,'right-leg')}</g></>}
    {part(parts.body,'body')}
    {part(parts.face,'face')}
    <g ref={animation.eyes}>{part(parts.eyes,'eyes')}</g>
    {part(parts.mouth,'mouth')}
    {!headOnly&&clothing}
    {!headOnly&&<><g ref={animation.leftArm}>{part(parts.leftArm,'left-arm')}</g><g ref={animation.hand}>{part(parts.rightArm,'right-arm')}</g></>}
    {headwear!=='beret'&&part(parts.cap,'cap')}
    {accessories}
   </>:<>
   <svg x={x} y={y} width={w} height={h} viewBox={`${left} ${top} ${right-left} ${bottom-top}`} preserveAspectRatio="xMidYMid meet" overflow="visible">
    <image data-character-stage={n} href={images[n-1]} x="0" y="0" width={width} height={height}/>
   </svg>
   {/* 입힌 옷과 액세서리만 사진의 방향에 맞춰 회전합니다. */}
   <g transform={`rotate(${tilt} 101 143)`}>{clothing}{accessories}</g>
   </>}
  </g>
  {motion==='heart'&&!headOnly&&<g ref={animation.hearts} aria-hidden="true" className="mumu-heart-effects">{[0,1,2].map(i=><path key={i} opacity="0" fill={i===1?'#ed9fbb':'#a17ae0'} d={heart}/>)}</g>}
 </>;
}
