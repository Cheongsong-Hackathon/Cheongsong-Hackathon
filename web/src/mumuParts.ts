import type { Expression } from './CharacterExpression';

// 파일을 넣거나 빼면 Vite가 자동으로 목록을 갱신합니다. body.png가 있어야 분리 모드를 사용합니다.
const files = import.meta.glob<string>('./assets/characters/parts/stage-*/*.png', { eager: true, query: '?url', import: 'default' });
const configurations = import.meta.glob<{ [key: string]: unknown }>('./assets/characters/parts/stage-*/joints.json', { eager: true, import: 'default' });
export type Point = readonly [number, number];
export type Joints = { rightArm: Point; leftArm: Point; leftLeg: Point; rightLeg: Point; tail: Point; eyes: Point; shadow: Point };
const DEFAULT_JOINTS: Joints = { rightArm:[142,157], leftArm:[63,157], leftLeg:[81,190], rightLeg:[125,190], tail:[144,180], eyes:[101,128], shadow:[102,211] };
const EXPRESSIONS: Record<Expression, string> = { '기본':'default', '기뻐':'happy', '지쳤어':'tired', '답답해':'frustrated', '불안해':'anxious', '심심해':'bored', '평온해':'calm' };
export function getMumuParts(stage: number, mood: Expression) {
 const root=`./assets/characters/parts/stage-${stage}/`;
 const image=(name:string)=>files[`${root}${name}.png`];
 const face=(name:string)=>image(`${name}-${EXPRESSIONS[mood]}`)??image(name);
 const supplied=configurations[`${root}joints.json`]??{};
 const joints={...DEFAULT_JOINTS};
 for(const key of Object.keys(joints) as (keyof Joints)[]) {
  const point=supplied[key];
  if(Array.isArray(point)&&point.length===2&&point.every(value=>typeof value==='number'&&Number.isFinite(value))) joints[key]=point as unknown as Point;
 }
 const hasExpressions=Object.keys(files).some(path=>path.startsWith(root)&&/\/(face|eyes|mouth)-(happy|tired|frustrated|anxious|bored|calm)\.png$/.test(path));
 return { hasExpressions, body:image('body'), shadow:image('shadow'), tail:image('tail'), leftLeg:image('left-leg'), rightLeg:image('right-leg'), leftArm:image('left-arm'), rightArm:image('right-arm'), cap:image('cap'), face:face('face'), eyes:face('eyes'), mouth:face('mouth'), joints };
}
