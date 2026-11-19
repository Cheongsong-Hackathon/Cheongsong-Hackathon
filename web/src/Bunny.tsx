import { MUMU_FIT } from './MumuFit';
import type { MumuMotion } from './MumuMotionControls';
import MumuCharacterDesign from './MumuCharacterDesign';
import { useContext } from 'react';
import { useMumuWardrobe, type Wardrobe } from './MumuWardrobe';
import { tint, useAccessoryColors } from './AccessoryColors';
import { useCharacterExpression, type Expression } from './CharacterExpression';
import { useOutfit } from './Outfit';
import { MumuGrowthContext, MUMU_FORMS, mumuForm } from './MumuGrowth';

const ITEM_NAMES: Record<string, string> = { ribbon: '리본', scarf: '목도리', beret: '베레모' };
function Accessory({ id, level }: { id: string | null; level: number }) {
  const fit = MUMU_FIT[level - 1];
  const { colors } = useAccessoryColors();
  if (!id || !(id in colors)) return null;
  const color = colors[id as keyof typeof colors];
  if (id === 'ribbon') return <g transform={`translate(${fit.ribbon[0]} ${fit.ribbon[1]}) rotate(15) scale(${fit.ribbon[2]})`} fill={color} stroke={tint(color, -.25)} strokeWidth="2.5" strokeLinejoin="round"><path d="M0 0l-19-12q-5 12 0 24zM0 0l19-12q5 12 0 24z" /><circle r="5" /><path d="M-13-4l7 3M13-4L6-1" fill="none" stroke={tint(color, .5)} /></g>;
  if (id === 'beret') return <g transform={`translate(${fit.beret[0]} ${fit.beret[1]}) scale(${fit.beret[2]}) translate(-98 -81)`} stroke={tint(color, -.25)} strokeWidth="2.5" strokeLinecap="round"><ellipse cx="98" cy="81" rx="42" ry="15" fill={color} transform="rotate(-9 98 81)" /><path d="M94 66l3-9" /><path d="M68 77q11-7 22-7" fill="none" stroke={tint(color, .5)} strokeWidth="3" /></g>;
  return <g transform={`translate(${fit.scarf[0]} ${fit.scarf[1]}) scale(${fit.scarf[2]} ${fit.scarf[3]}) translate(-101 -170)`} fill={color} stroke={tint(color, -.25)} strokeWidth="2.5" strokeLinejoin="round"><path d="M116 166l8 48 21-6-13-46Z" /><path d="M57 157q43 15 86 0l1 23q-44 15-88 0Z" /><path d="M63 173q34 9 71 0M126 200l13-3" stroke={tint(color, .5)} fill="none" /><path d="M128 210l2 8m4-9 2 8m4-10 2 8" /></g>;
}

export default function Bunny({ size=200, happy=false, item=null, stage=1, peek=false, faceOnly=false, expression:override, layerScarf=false, visualForm, quiet=false, previewClothes, motion=null, motionKey=0, loopMotion=false }: { size?:number;happy?:boolean;item?:string|null;stage?:number;peek?:boolean;faceOnly?:boolean;expression?:Expression;layerScarf?:boolean;visualForm?:number;quiet?:boolean;previewClothes?:Wardrobe;motion?:MumuMotion|null;motionKey?:number;loopMotion?:boolean }) {
 const exp=useContext(MumuGrowthContext);
 const level=Math.max(1,Math.min(6,visualForm??(exp!==null?mumuForm(exp):[1,2,4,6][Math.max(0,Math.min(3,stage-1))])));
 const {expression}=useCharacterExpression(); const mood=override??expression; const smiling=happy||mood==='기뻐';
 const headOnly=faceOnly||peek; const outfit=useOutfit(); const {state:savedClothes}=useMumuWardrobe(); const clothes=previewClothes??savedClothes;
 const cloth=clothes.colors?.[clothes.equipped??'']??(clothes.equipped==='cape'?'#b5d9cc':'#b59bd8');
 const fit=MUMU_FIT[level-1];
 const [lx,rx,y]=fit.eyes;
 const [gx,gy,gsx,gsy]=fit.garment;
 const clothing=!headOnly&&<g transform={`translate(${gx} ${gy}) scale(${gsx} ${gsy}) translate(-101 -173)`}>{clothes.equipped==='vest'&&<path d="M65 161l20-4 16 12 14-12 21 4-8 26q-28 10-55 0Z" fill={cloth} stroke={tint(cloth,-.25)} strokeWidth="2"/>}{clothes.equipped==='cape'&&<path d="M65 159q35 12 71 0l13 24q-49 15-99 0Z" fill={cloth} stroke={tint(cloth,-.25)} strokeWidth="2"/>}</g>;
 const accessories=<>{!headOnly&&(layerScarf?outfit.scarf:item==='scarf')&&<Accessory id="scarf" level={level}/>}{clothes.equipped==='glasses'&&<g fill="none" stroke={cloth} strokeWidth="2.3"><circle cx={lx} cy={y} r={level>=5?12:10}/><circle cx={rx} cy={y} r={level>=5?12:10}/><path d={`M${lx+(level>=5?12:10)} ${y-2}H${rx-(level>=5?12:10)}`}/></g>}{item!=='scarf'&&<Accessory id={item} level={level}/>}</>;
 return <svg xmlns="http://www.w3.org/2000/svg" viewBox={headOnly?'15 47 175 163':'0 4 205 225'} width={size} height={size} className={`bunny mumu-character${smiling&&!quiet?' happy':''}${quiet?' is-quiet':''}`} role="img" aria-label={`무무 · ${MUMU_FORMS[level-1] ?? `${level}단계 무무`} · 캐릭터${item?` · ${ITEM_NAMES[item]??''} 착용`:''}`}><MumuCharacterDesign headwear={item} loopMotion={loopMotion} motion={quiet||headOnly?null:motion} motionKey={motionKey} level={level} headOnly={headOnly} smiling={smiling} mood={mood} quiet={quiet} clothing={clothing} accessories={accessories}/></svg>;
}
