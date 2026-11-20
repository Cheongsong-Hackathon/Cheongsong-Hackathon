import mascot from './assets/mumu/home.webp';
import face from './assets/mumu/face.webp';
import cheerful from './assets/mumu/mood-happy.webp';
import useMumuAnimation from './useMumuAnimation';
import type { MumuMotion } from './useMumuAnimation';
import { useMumuWardrobe, type Wardrobe } from './MumuWardrobe';
import { tint, useAccessoryColors } from './AccessoryColors';
import { type Expression } from './CharacterExpression';
import { useOutfit } from './Outfit';

const ITEM_NAMES: Record<string, string> = { ribbon: '리본', scarf: '목도리', beret: '베레모' };
function Accessory({ id }: { id: string | null }) {
  // 지금 무무 그림(home) 기준 자리: 리본은 머리 오른쪽, 베레모는 잎 아래 머리 위, 목도리는 원래 노란 목도리 위
  const fit={ribbon:[149,70,.64],beret:[106,60,1.05],scarf:[88,147,1.05,.55]};
  const { colors } = useAccessoryColors();
  if (!id || !(id in colors)) return null;
  const color = colors[id as keyof typeof colors];
  if (id === 'ribbon') return <g transform={`translate(${fit.ribbon[0]} ${fit.ribbon[1]}) rotate(15) scale(${fit.ribbon[2]})`} fill={color} stroke={tint(color, -.25)} strokeWidth="2.5" strokeLinejoin="round"><path d="M0 0l-19-12q-5 12 0 24zM0 0l19-12q5 12 0 24z" /><circle r="5" /><path d="M-13-4l7 3M13-4L6-1" fill="none" stroke={tint(color, .5)} /></g>;
  if (id === 'beret') return <g transform={`translate(${fit.beret[0]} ${fit.beret[1]}) scale(${fit.beret[2]}) translate(-98 -81)`} stroke={tint(color, -.25)} strokeWidth="2.5" strokeLinecap="round"><ellipse cx="98" cy="81" rx="42" ry="15" fill={color} transform="rotate(-9 98 81)" /><path d="M94 66l3-9" /><path d="M68 77q11-7 22-7" fill="none" stroke={tint(color, .5)} strokeWidth="3" /></g>;
  return <g transform={`translate(${fit.scarf[0]} ${fit.scarf[1]}) scale(${fit.scarf[2]} ${fit.scarf[3]}) translate(-101 -170)`} fill={color} stroke={tint(color, -.25)} strokeWidth="2.5" strokeLinejoin="round"><path d="M116 166l8 48 21-6-13-46Z" /><path d="M57 157q43 15 86 0l1 23q-44 15-88 0Z" /><path d="M63 173q34 9 71 0M126 200l13-3" stroke={tint(color, .5)} fill="none" /><path d="M128 210l2 8m4-9 2 8m4-10 2 8" /></g>;
}

export default function Bunny({ size=200, happy=false, item=null, stage=1, peek=false, faceOnly=false, expression:override, layerScarf=false, visualForm, quiet=false, previewClothes, motion=null, motionKey=0, loopMotion=false }: { size?:number;happy?:boolean;item?:string|null;stage?:number;peek?:boolean;faceOnly?:boolean;expression?:Expression;layerScarf?:boolean;visualForm?:number;quiet?:boolean;previewClothes?:Wardrobe;motion?:MumuMotion|null;motionKey?:number;loopMotion?:boolean }) {
 const animation=useMumuAnimation(quiet||faceOnly||peek?null:motion,motionKey,loopMotion);
 const headOnly=faceOnly||peek; const outfit=useOutfit(); const {state:savedClothes}=useMumuWardrobe(); const clothes=previewClothes??savedClothes;
 const cloth=clothes.colors?.[clothes.equipped??'']??(clothes.equipped==='cape'?'#b5d9cc':'#b59bd8');
 const portrait = happy ? cheerful : mascot;
 const [lx,ly,rx,ry] = happy ? [90,94,131,84] : [99,97,138,97];
 const [gx,gy] = happy ? [101,167] : [100,172];
 const [gsx,gsy] = [1.25,1.4];
 const clothing=!headOnly&&<g transform={`translate(${gx} ${gy}) scale(${gsx} ${gsy}) translate(-101 -173)`}>{clothes.equipped==='vest'&&<path d="M65 161l20-4 16 12 14-12 21 4-8 26q-28 10-55 0Z" fill={cloth} stroke={tint(cloth,-.25)} strokeWidth="2"/>}{clothes.equipped==='cape'&&<path d="M65 159q35 12 71 0l13 24q-49 15-99 0Z" fill={cloth} stroke={tint(cloth,-.25)} strokeWidth="2"/>}</g>;
 const accessories=<>{!headOnly&&(layerScarf?outfit.scarf:item==='scarf')&&<Accessory id="scarf"/>}{clothes.equipped==='glasses'&&<g fill="none" stroke={cloth} strokeWidth="2.3"><circle cx={lx} cy={ly} r={10}/><circle cx={rx} cy={ry} r={10}/><path d={`M${lx+10} ${ly-2}L${rx-10} ${ry-2}`}/></g>}{item!=='scarf'&&<Accessory id={item}/>}</>;
 return (
   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 205 225" width={size} height={size} className={`bunny mumu-character${quiet?' is-quiet':''}`} role="img" aria-label={`무무${item && !headOnly ? ` · ${ITEM_NAMES[item]??''} 착용` : ''}`}>
     <g ref={animation.body} className={`mumu-action${motion?' mumu-action-'+motion:''}`}>
       {headOnly
         ? <image href={face} width="205" height="225" preserveAspectRatio="xMidYMid meet" />
         : <><image href={portrait} x="5" y="5" width="195" height="215" preserveAspectRatio="xMidYMid meet" />{clothing}{accessories}</>}
     </g>
     {motion === 'heart' && !headOnly && <g ref={animation.hearts} aria-hidden="true">
       {[0, 1, 2].map(i => <path key={i} opacity="0" fill="#a17ae0" d="M0 8C-15-2-8-13 0-6C8-13 15-2 0 8Z" />)}
     </g>}
   </svg>
 );
}
