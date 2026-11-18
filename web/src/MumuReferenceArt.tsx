import useMumuAnimation from './useMumuAnimation';
import MumuMouth from './MumuMouth';
import type { MumuMotion } from './MumuMotionControls';
import type { ReactNode } from 'react';
import type { Expression } from './CharacterExpression';
const edge='#998b7d', white='#fffefb', ink='#766457';
const shapes=[
'M45 108C61 79 105 72 139 93C169 111 175 148 162 174C150 201 110 208 76 194C42 180 29 137 45 108Z',
'M47 113Q39 89 57 83Q68 76 76 86Q111 66 140 89Q163 106 165 137Q171 169 145 184L123 195Q122 211 109 209Q94 212 91 198Q63 195 47 175Q27 145 47 113Z',
'M44 113Q33 93 47 85Q56 81 64 86Q101 75 138 86Q156 78 163 91Q168 100 159 110Q171 145 148 164L137 173Q143 196 125 203Q111 210 100 199Q89 210 73 203Q56 201 61 181Q48 178 49 165Q28 146 44 113Z',
'M35 113L35 85Q33 63 52 65L72 71Q99 64 126 71L148 65Q169 61 169 83L168 117Q180 152 154 171L137 181Q143 198 125 204Q112 209 101 198Q90 211 76 205Q61 206 62 189Q43 187 43 176Q23 159 29 140Z',
'M40 111Q30 91 38 77Q42 65 53 69L75 84Q100 75 125 84L149 69Q162 66 167 79Q173 96 160 114Q171 143 151 161L136 174Q143 191 128 198Q116 205 105 195Q93 207 79 203Q66 204 67 189Q48 188 48 176Q29 166 33 147Z'];
export default function MumuReferenceArt({level,headOnly,smiling,mood,quiet,clothing,accessories,motion=null,motionKey=0,loopMotion=false}:{level:number;headOnly:boolean;smiling:boolean;mood:Expression;quiet:boolean;clothing?:ReactNode;accessories?:ReactNode;motion?:MumuMotion|null;motionKey?:number;loopMotion?:boolean}) {
 const animation=useMumuAnimation(quiet||headOnly?null:motion,motionKey,loopMotion);
 const tilt=headOnly?0:level===1?12:level===2?13:level===5?-22:0;
 const y=level===1?137:level===2?126:level===3?124:120;
 const lx=level===2?84:79,rx=level===2?124:122;
 return <>
 {!headOnly&&<ellipse ref={animation.shadow} cx="102" cy="211" rx={level===1?66:44} ry={level===1?9:6} fill="#a29b8433"/>}
 {!headOnly&&level>=2&&<path transform={level===5?'translate(153 37)':`translate(${level===4?121:103} 30)`} d="M0 13C-24-3-13-20 0-10C13-20 24-3 0 13Z" fill={level<=3?'#ee9a85':'#9c70ed'}/>}
 <g ref={animation.body} className={`mumu-action${motion?' mumu-action-'+motion:''}`}>
 <g className={quiet?undefined:'mumu-breathe'}><g transform={`rotate(${tilt} 101 143)`}>
 {!headOnly&&level===5&&<g stroke={edge} strokeWidth="2.8" strokeLinejoin="round"><path d="M138 177Q176 191 174 166Q173 157 166 163Q163 169 168 174Q170 182 147 172Z" fill="#d9c9ed"/><path d="M64 181Q34 186 39 202Q49 218 80 199" fill="#ddd1f1"/><path d="M49 199q6 3 17-1" fill="none" stroke="#b4a1ce"/></g>}
 <path d={shapes[level-1]} fill={white} stroke={edge} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
 {level===1&&<g stroke="#b7c9cc" fill="none" strokeWidth="1.6" opacity=".8"><path d="M79 139q-17-2-19 12q-3 14 10 17q12 3 20-7q13 0 14-10q1-13-12-14q-4-9-12-4Z" fill="#eff5f4"/><ellipse cx="79" cy="151" rx="8" ry="10" transform="rotate(20 79 151)"/><path d="M76 146q9-5 12 4q3 9-6 13q-7 4-10-2q-4-7 4-15"/><ellipse cx="91" cy="146" rx="5" ry="6"/></g>}
 {level>=4&&<g fill={level===4?'#ecd1c9':'#f1d8d6'} opacity={level===4?.85:.35}><ellipse cx="51" cy="138" rx="14" ry="10"/><ellipse cx="151" cy="138" rx="14" ry="10"/></g>}
 <g fill={ink} stroke={ink} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4">
 {!smiling&&(level===1||(level===3&&mood==='기본')||mood==='지쳤어'||mood==='평온해')?<path d={`M${lx-5} ${y}q3 5 8 2M${rx-5} ${y}q4 4 9 1`} fill="none"/>:smiling?<path d={`M${lx-6} ${y}q6-8 12 0M${rx-6} ${y}q6-8 12 0`} fill="none"/>:<g className={quiet?undefined:'mumu-eyes'}><ellipse cx={lx} cy={y} rx={level>=4?6.6:4.1} ry={level>=4?8:4.2} stroke="none"/><ellipse cx={rx} cy={y} rx={level>=4?6.6:4.1} ry={level>=4?8:4.2} stroke="none"/>{level>=4&&<path d={`M${lx-4} ${y-5}l-3-5m${rx-lx+3} 5-2-5`} fill="none" strokeWidth="2"/>}</g>}
 {mood==='불안해'&&<path d={`M${lx-6} ${y-13}l10-3m32 0 10 3`} fill="none"/>}{mood==='답답해'&&<path d={`M${lx-6} ${y-14}l10 3m32 0 10-3`} fill="none"/>}
 <MumuMouth level={level} y={y} mood={mood} smiling={smiling}/>
 </g>
 {level===4&&<g stroke={ink} strokeWidth="2.4" strokeLinecap="round"><path d="M91 85v3m12-3v3m12-2v3M48 136h5m-5 13h5m96-13h5m-5 13h5"/></g>}
 {level===5&&<g fill="none" stroke={edge} strokeWidth="2.4" strokeLinecap="round"><path d="M41 132l-14-2m15 12-17 1m18 8-15 5m129-24 15-2m-15 12 17 1m-18 8 16 5"/><path d="M91 87q15 0 16-12q-1 3-7 2m6 0q-4-3-6-2" stroke="#aa8fd1"/></g>}
 {level>=4&&<g fill={level===5?'#d3bfeb':ink}><path d="M45 83q1-10 10-5l-4 7ZM146 79q9-5 12 5l-9 2Z"/>{level===5&&<circle cx="66" cy="141" r="1.9" fill={ink}/>}</g>}
 {level===1&&<g fill="#fffdf5" stroke="#a4987f" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"><path d="M55 73Q106 42 148 76Q188 108 182 154l-12-6-3-13-18-2-8-14-16-2-10-13-16-2-8-12-11-1-3-12-13 1Z"/><path d="M57 73q7-3 12-2" fill="none"/></g>}
 {clothing}
 {!headOnly&&level===2&&<g fill={white} stroke={edge} strokeWidth="3" strokeLinecap="round"><ellipse cx="66" cy="166" rx="16" ry="15"/>{motion!=='wave'&&<g><path d="M145 147q-17 11-12 23q9 10 21-6" fill="none"/></g>}</g>}
 {!headOnly&&level===3&&<><path transform="translate(117 164)" d="M0 20C-37-1-24-25-5-16L0-12 6-20C27-29 44-3 16 18l-10 8Z" fill="#ed9682" stroke={edge} strokeWidth="2.6" strokeLinejoin="round"/><g fill={white} stroke={edge} strokeWidth="3" strokeLinecap="round"><path d="M63 160q-9 10-2 17q13 8 30-1q7-5 2-11"/>{motion!=='wave'&&<g><ellipse cx="146" cy="167" rx="11" ry="10"/></g>}</g></>}
 {!headOnly&&level===4&&<><path d="M43 168l-15 11 19 13" fill={white} stroke={edge} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><path transform="translate(102 170) scale(1.5)" d="M0 13C-27-3-18-25-3-18L0-14 3-18C18-25 27-3 0 13Z" fill="#9864ed"/><g fill={white} stroke={edge} strokeWidth="3"><ellipse cx="71" cy="179" rx="10" ry="17" transform="rotate(20 71 179)"/>{motion!=='wave'&&<g><ellipse cx="136" cy="178" rx="10" ry="17" transform="rotate(-20 136 178)"/></g>}</g></>}
 {!headOnly&&level===5&&<g fill={white} stroke={edge} strokeWidth="3" strokeLinecap="round"><path d="M65 164q-9 9-5 19q6 12 20 9l9-7"/>{motion!=='wave'&&<g><path d="M126 165q-4 14 6 16q12 1 15-8"/></g>}</g>}
 {!headOnly&&level>=2&&motion==='wave'&&<g ref={animation.hand} className="mumu-wave-hand" fill={white} stroke={edge} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
   <path d="M145 162Q153 151 155 137L155 126Q155 115 166 114Q177 114 178 126Q180 141 168 154L158 166Q150 171 145 162Z"/>
   <g fill="#dfccee" stroke="none"><ellipse cx="166" cy="134" rx="5" ry="6"/><circle cx="161" cy="123" r="2"/><circle cx="168" cy="121" r="2"/><circle cx="174" cy="125" r="2"/></g>
 </g>}
 {accessories}
 </g></g></g>
 {motion==='heart'&&!headOnly&&<g ref={animation.hearts} aria-hidden="true" fill="#a17ae0" className="mumu-heart-effects">{[0,1,2].map(i=><path key={i} opacity="0" fill={i===1?'#ed9fbb':'#a17ae0'} d="M0 8C-15-2-8-13 0-6C8-13 15-2 0 8Z"/>)}</g>}
 </>;
}
