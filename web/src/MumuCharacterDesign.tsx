// 캐릭터 디자인 편집 파일
// 색상: 아래 edge(테두리), white(몸), ink(눈), purple(하트).
// 몸 모양: shapes 배열의 1~6단계. 첫 번째는 껍질 모자를 쓴 아기입니다.
// 눈 위치: y, lx, rx. 세부 장식: 아래 단계별 한글 주석 참고.
// 저장(Ctrl+S) → http://localhost:5173/?characterPreview=1 에 자동 반영.
// JSX 태그와 중괄호는 유지하세요. 문법 오류는 브라우저의 Vite 오류 화면에 표시됩니다.
import useMumuAnimation from './useMumuAnimation';
import MumuMouth from './MumuMouth';
import type { MumuMotion } from './MumuMotionControls';
import type { ReactNode } from 'react';
import type { Expression } from './CharacterExpression';

// 공통 색상: # 뒤의 색상 코드를 바꾸면 그 색을 쓰는 모든 단계에 적용됩니다.
const edge = '#b9a897',
  white = '#fffefb',
  ink = '#766457',
  purple = '#8b64eb';

// 전체 크기: 1 = 기본, 1.2 = 20% 확대. 각 줄이 해당 단계입니다.
const stageScales = [
  1, // 1단계: 껍질 모자
  1, // 2단계: 점박이
  1, // 3단계: 하트
  1, // 4단계: 판다 귀
  1, // 5단계: 큰 하트
  1, // 6단계: 고양이
];

// 1~6단계별 몸통 외곽선 좌표
// 전체 크기는 stageScales, 윤곽 자체는 아래 d 좌표를 수정하세요. 배열 순서는 유지합니다.
// SVG 좌표: x가 커지면 오른쪽, y가 커지면 아래. M=시작점, L=직선, Q/C=곡선, Z=닫기.
// 소문자 명령은 현재 점을 기준으로 이동합니다.
const shapes = [
  // 1단계: 껍질 모자 쓴 아기
  'M101 92C126 92 142 106 154 130C168 158 158 194 101 194C44 194 34 158 48 130C60 106 76 92 101 92Z',
  // 2단계: 울퉁불퉁 점박이 몽글이
  'M52 106Q66 74 101 74Q136 74 150 106Q172 122 164 148Q173 176 152 191Q134 202 101 198Q68 202 50 191Q29 176 38 148Q30 122 52 106Z',
  // 3단계: 하트 안은 동글 무무
  'M47 118Q42 82 101 82Q160 82 155 118Q164 148 144 170L134 179Q138 197 121 202Q108 207 101 197Q94 207 81 202Q64 197 68 179L58 170Q38 148 47 118Z',
  // 4단계: 판다 귀 무무
  'M46 116Q40 78 101 78Q162 78 156 116Q166 150 144 174L132 184Q135 201 119 205Q106 209 98 198Q90 209 76 204Q60 199 65 182L54 172Q36 148 46 116Z',
  // 5단계: 머리 위 큰 하트 무무
  'M35 113L35 85Q33 63 52 65L72 71Q99 64 126 71L148 65Q169 61 169 83L168 117Q180 152 154 171L137 181Q143 198 125 204Q112 209 101 198Q90 211 76 205Q61 206 62 189Q43 187 43 176Q23 159 29 140Z',
  // 6단계: 하트 향해 손 뻗는 고양이 무무
  'M40 111Q30 91 38 77Q42 65 53 69L75 84Q100 75 125 84L149 69Q162 66 167 79Q173 96 160 114Q171 143 151 161L136 174Q143 191 128 198Q116 205 105 195Q93 207 79 203Q66 204 67 189Q48 188 48 176Q29 166 33 147Z',
];

export default function MumuCharacterDesign({
  level,
  headOnly,
  smiling,
  mood,
  quiet,
  clothing,
  accessories,
  motion = null,
  motionKey = 0,
  loopMotion = false,
}: {
  level: number;
  headOnly: boolean;
  smiling: boolean;
  mood: Expression;
  quiet: boolean;
  clothing?: ReactNode;
  accessories?: ReactNode;
  motion?: MumuMotion | null;
  motionKey?: number;
  loopMotion?: boolean;
}) {
  const safeLevel = Number.isFinite(level) ? Math.min(Math.max(Math.trunc(level), 1), 6) : 1;
  const animation = useMumuAnimation(quiet || headOnly ? null : motion, motionKey, loopMotion);

  // 단계별 기울기 & 눈 위치
  // tilt: 각도(+시계 방향, -반대). y: 눈 높이. lx/rx: 왼쪽/오른쪽 눈의 가로 위치.
  // 눈 간격을 넓히려면 lx를 줄이고 rx를 늘리세요.
  const tilt = headOnly ? 0 : safeLevel === 1 ? 21 : safeLevel === 4 ? 14 : safeLevel === 6 ? -20 : 0;
  const y = safeLevel === 1 ? 143 : safeLevel === 3 ? 128 : 122;
  const lx = safeLevel === 1 ? 74 : 80;
  const rx = safeLevel === 1 ? 127 : 122;

  const scale = stageScales[safeLevel - 1] ?? 1;
  return (
    <g transform={`translate(102 140) scale(${scale}) translate(-102 -140)`}>
      {/* 바닥 그림자
                cx/cy=중심 위치, rx/ry=가로·세로 반지름. fill 끝 33은 투명도입니다. */}
      {!headOnly && (
        <ellipse
          ref={animation.shadow}
          cx={safeLevel === 1 ? 92 : 102}
          cy={safeLevel === 1 ? 193 : 211}
          rx={safeLevel === 1 ? 55 : safeLevel === 2 ? 62 : 44}
          ry={safeLevel === 1 ? 12 : safeLevel === 2 ? 8 : 6}
          transform={safeLevel === 1 ? 'rotate(19 92 193)' : undefined}
          fill={safeLevel === 1 ? '#d6cab6' : '#a29b8433'}
        />
      )}

      {/* 1, 2, 6단계: 머리 위/오른쪽에 떠 있는 보라 하트
                translate(x y)=위치, scale(숫자)=크기, rotate(숫자)=각도. 현재 표시 조건의 단계에만 적용돼요. */}
      {!headOnly && (safeLevel === 2 || safeLevel === 6) && (
        <path
          transform={
            safeLevel === 6
              ? 'translate(154 44) scale(1.65)'
              : safeLevel === 2
                ? 'translate(101 26) scale(1.05)'
                : 'translate(103 34) scale(1.05)'
          }
          d="M0 13C-24-3-13-20 0-10C13-20 24-3 0 13Z"
          fill={purple}
        />
      )}

      <g ref={animation.body} className={`mumu-action${motion ? ' mumu-action-' + motion : ''}`}>
        <g className={quiet ? undefined : 'mumu-breathe'}>
          <g transform={`rotate(${tilt} 101 143)`}>
            {/* 4단계: 뒤쪽에서 기대고 있는 큰 보라 하트 & 판다 짙은 귀
                translate(x y)=위치, scale(숫자)=크기, rotate(숫자)=각도. 현재 표시 조건의 단계에만 적용돼요. */}
            {!headOnly && safeLevel === 4 && (
              <>
                <path
                  transform="translate(136 172) rotate(18) scale(1.85)"
                  d="M0 13C-24-3-13-20 0-10C13-20 24-3 0 13Z"
                  fill={purple}
                  stroke={edge}
                  strokeWidth="1.6"
                />
                <g fill="#5c4f47" stroke={edge} strokeWidth="2.5">
                  <circle cx="58" cy="86" r="13" />
                  <circle cx="144" cy="86" r="13" />
                </g>
              </>
            )}

            {/* 6단계: 꼬리
                fill=꼬리 색, strokeWidth=선 두께. g에 transform="translate(5 0)"을 추가하면 전체가 오른쪽으로 5 이동해요. */}
            {!headOnly && safeLevel === 6 && (
              <g stroke={edge} strokeWidth="2.8" strokeLinejoin="round">
                <path
                  d="M138 177Q176 191 174 166Q173 157 166 163Q163 169 168 174Q170 182 147 172Z"
                  fill="#d9c9ed"
                />
                <path d="M64 181Q34 186 39 202Q49 218 80 199" fill="#ddd1f1" />
                <path d="M49 199q6 3 17-1" fill="none" stroke="#b4a1ce" />
              </g>
            )}

            {/* 기본 몸통
                white=몸 색, edge=테두리 색. strokeWidth="3"을 늘리면 선이 두꺼워져요. */}
            <path
              d={shapes[safeLevel - 1]}
              fill={white}
              stroke={safeLevel === 1 ? "#78695b" : edge}
              strokeWidth={safeLevel === 1 ? 3.6 : 3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* 2단계: 몽글이 점박이 무늬
                circle의 cx/cy=점 위치, r=점 크기. fill을 바꾸면 점 색이 바뀝니다. */}
            {safeLevel === 2 && (
              <g fill={ink}>
                <circle cx="74" cy="94" r="2.2" />
                <circle cx="133" cy="112" r="3" />
                <circle cx="76" cy="168" r="3.4" />
                <circle cx="129" cy="154" r="1.8" />
              </g>
            )}

            {/* 3단계: 양옆 수염 삐죽 & 작은 점
                path는 수염, circle은 점입니다. strokeWidth로 수염 두께를 조절하세요. */}
            {safeLevel === 3 && (
              <>
                <path
                  d="M45 123l-13-4m13 8-14 1m123-5 13-4m-13 8 14 1"
                  fill="none"
                  stroke={ink}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <circle cx="73" cy="102" r="2.3" fill={ink} />
                <circle cx="137" cy="154" r="2.6" fill={ink} />
              </>
            )}

            {/* 4단계: 판다 이마 노란 반창고/무늬 & 점
                fill="#f2dfa4"는 이마 장식 색. 장식 path에 transform="translate(x y)"를 넣어 위치를 옮기세요. */}
            {safeLevel === 4 && (
              <>
                <path
                  d="M74 91l10-4 3 7-10 4z"
                  fill="#f2dfa4"
                  stroke="#d6be7a"
                  strokeWidth="1.5"
                />
                <circle cx="136" cy="158" r="3" fill="#5c4f47" />
              </>
            )}

            {/* 5~6단계: 볼터치
                ellipse의 cx/cy=볼 위치, rx/ry=너비·높이. opacity가 클수록 색이 진해져요. */}
            {safeLevel >= 5 && (
              <g fill={safeLevel === 5 ? '#ecd1c9' : '#f1d8d6'} opacity={safeLevel === 5 ? 0.85 : 0.35}>
                <ellipse cx="51" cy="138" rx="14" ry="10" />
                <ellipse cx="151" cy="138" rx="14" ry="10" />
              </g>
            )}

            {/* 눈 & 입
                동그란 눈의 rx/ry로 너비·높이를 바꿔요. 웃는 눈은 path의 d를 수정하고, 입 모양은 MumuMouth.tsx에서 수정해요. */}
            <g fill={ink} stroke={ink} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4">
              {!smiling &&
              (safeLevel <= 2 ||
                safeLevel === 4 ||
                (safeLevel === 3 && mood === '기본') ||
                mood === '지쳤어' ||
                mood === '평온해') ? (
                <path
                  d={`M${lx - 5} ${y}q3 5 8 2M${rx - 5} ${y}q4 4 9 1`}
                  fill="none"
                />
              ) : smiling ? (
                <path
                  d={`M${lx - 6} ${y}q6-8 12 0M${rx - 6} ${y}q6-8 12 0`}
                  fill="none"
                />
              ) : (
                <g className={quiet ? undefined : 'mumu-eyes'}>
                  <ellipse
                    cx={lx}
                    cy={y}
                    rx={safeLevel >= 5 ? 6.6 : 4.1}
                    ry={safeLevel >= 5 ? 8 : 4.2}
                    stroke="none"
                  />
                  <ellipse
                    cx={rx}
                    cy={y}
                    rx={safeLevel >= 5 ? 6.6 : 4.1}
                    ry={safeLevel >= 5 ? 8 : 4.2}
                    stroke="none"
                  />
                  {safeLevel >= 5 && (
                    <path
                      d={`M${lx - 4} ${y - 5}l-3-5m${rx - lx + 3} 5-2-5`}
                      fill="none"
                      strokeWidth="2"
                    />
                  )}
                </g>
              )}
              {mood === '불안해' && (
                <path d={`M${lx - 6} ${y - 13}l10-3m32 0 10 3`} fill="none" />
              )}
              {mood === '답답해' && (
                <path d={`M${lx - 6} ${y - 14}l10 3m32 0 10-3`} fill="none" />
              )}
              {safeLevel !== 1 && <MumuMouth level={safeLevel} y={y} mood={mood} smiling={smiling} />}
              {safeLevel === 1 && (
                <g transform="translate(100 150) rotate(-5)">
                  <ellipse cx="-5" cy="5" rx="7" ry="5" transform="rotate(-22 -5 5)" fill="none" stroke="#c3ced4" strokeWidth="1.8"/>
                  <path d="M-17 0C-17-9-6-10 0-6C6-10 17-9 17 0C17 9 6 10 0 6C-6 10-17 9-17 0Z" fill="#f3f7f9" stroke="#c3ced4" strokeWidth="1.8"/>
                  <ellipse cx="0" cy="-1" rx="6" ry="4.8" fill="#f8fbfc" stroke="#c3ced4" strokeWidth="1.8"/>
                  <circle cx="0" cy="-1" r="2.2" fill="none" stroke="#d6e0e5" strokeWidth="1.2"/>
                </g>
              )}
            </g>

            {/* 1단계: 오른쪽 위 알껍질 모자
                현재 1단계의 모자입니다. g에 transform="translate(0 -5)"를 넣으면 모자만 위로 5 이동해요. fill=모자 색, stroke=선 색. */}
            {safeLevel === 1 && (
              <path d="M48 98Q105 63 161 114L156 135L146 132L139 120L119 126L111 113L89 119L83 108L65 111L68 102Z" fill="#fffdf7" stroke="#a3957e" strokeWidth="3.4" strokeLinejoin="round" strokeLinecap="round"/>
            )}

            {/* 5단계: 머리 위 큰 보라 하트 & 볼 수염
                translate(x y)=위치, scale(숫자)=크기, rotate(숫자)=각도. 현재 표시 조건의 단계에만 적용돼요. */}
            {safeLevel === 5 && (
              <>
                <g stroke={ink} strokeWidth="2.4" strokeLinecap="round">
                  <path d="M48 136h5m-5 13h5m96-13h5m-5 13h5" />
                </g>
                {!headOnly && (
                  <path
                    transform="translate(105 64) rotate(-12) scale(1.85)"
                    d="M0 13C-24-3-13-20 0-10C13-20 24-3 0 13Z"
                    fill={purple}
                    stroke={edge}
                    strokeWidth="1.5"
                  />
                )}
              </>
            )}

            {/* 6단계: 볼 수염 & 머리 위 보라 삐죽 털
                첫 path=수염, 두 번째 path=머리털. 두 번째 stroke로 털 색을, d로 털 길이·곡선을 바꿔요. */}
            {safeLevel === 6 && (
              <g fill="none" stroke={edge} strokeWidth="2.4" strokeLinecap="round">
                <path d="M41 132l-14-2m15 12-17 1m18 8-15 5m129-24 15-2m-15 12 17 1m-18 8 16 5" />
                <path d="M91 87q15 0 16-12q-1 3-7 2m6 0q-4-3-6-2" stroke="#aa8fd1" />
              </g>
            )}

            {/* 5~6단계: 귓속 무늬
                fill은 귀 안쪽 색입니다. 귀 바깥 윤곽은 shapes의 해당 단계에서 수정하세요. */}
            {safeLevel >= 5 && (
              <g fill={safeLevel === 6 ? '#d3bfeb' : ink}>
                <path d="M45 83q1-10 10-5l-4 7ZM146 79q9-5 12 5l-9 2Z" />
                {safeLevel === 6 && <circle cx="66" cy="141" r="1.9" fill={ink} />}
              </g>
            )}

            {/* 옷장 의상 연결입니다. 옷의 모양은 Bunny.tsx에서 수정합니다. */}
            {clothing}

            {/* 2단계: 몽글이 가슴 앞 작은 팔
                각 path가 한쪽 팔입니다. motion 조건은 인사할 때 팔이 중복되지 않게 하므로 유지하세요. */}
            {!headOnly && safeLevel === 2 && (
              <g fill={white} stroke={edge} strokeWidth="2.8" strokeLinecap="round">
                <path d="M64 134q-6 14 4 19q9 4 13-9" />
                {motion !== 'wave' && <path d="M138 134q6 14-4 19q-9 4-13-9" />}
              </g>
            )}

            {/* 3단계: 보라 하트를 두 손으로 꼭 안은 모습
                translate(x y)=위치, scale(숫자)=크기, rotate(숫자)=각도. 현재 표시 조건의 단계에만 적용돼요. */}
            {!headOnly && safeLevel === 3 && (
              <>
                <path
                  transform="translate(101 164) scale(1.25)"
                  d="M0 20C-37-1-24-25-5-16L0-12 6-20C27-29 44-3 16 18l-10 8Z"
                  fill={purple}
                  stroke={edge}
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                />
                <g fill={white} stroke={edge} strokeWidth="3" strokeLinecap="round">
                  <ellipse cx="75" cy="166" rx="10" ry="9" />
                  {motion !== 'wave' && <ellipse cx="127" cy="166" rx="10" ry="9" />}
                </g>
              </>
            )}

            {/* 4단계: 판다 앞손 모은 모습
                각 path가 한쪽 손입니다. 위치만 옮기려면 해당 path에 transform="translate(x y)"를 추가하세요. */}
            {!headOnly && safeLevel === 4 && (
              <g fill={white} stroke={edge} strokeWidth="2.8" strokeLinecap="round">
                <path d="M74 148q13 8 26 2q-6 11-22 10Z" />
                {motion !== 'wave' && <path d="M126 148q-13 8-26 2q6 11 22 10Z" />}
              </g>
            )}

            {/* 5단계: 양팔 & 왼쪽 짙은 발 포인트
                ellipse=팔, circle=짙은 포인트. rotate(20 72 175)는 (72,175)를 중심으로 20도 회전합니다. */}
            {!headOnly && safeLevel === 5 && (
              <g fill={white} stroke={edge} strokeWidth="3">
                <ellipse cx="72" cy="175" rx="10" ry="15" transform="rotate(20 72 175)" />
                <circle cx="79" cy="183" r="4.5" fill="#5c4f47" stroke="none" />
                {motion !== 'wave' && (
                  <ellipse cx="132" cy="175" rx="10" ry="15" transform="rotate(-20 132 175)" />
                )}
              </g>
            )}

            {/* 6단계: 왼팔 & 오른쪽 위 하트를 향해 뻗은 오른팔
                첫 path=왼팔, 두 번째=뻗은 오른팔. d 좌표로 팔 길이와 곡선을 바꿉니다. */}
            {!headOnly && safeLevel === 6 && (
              <g fill={white} stroke={edge} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M65 164q-9 9-5 19q6 12 20 9l9-7" />
                {motion !== 'wave' && (
                  <path d="M134 128Q144 102 153 89Q162 84 163 96Q159 116 143 136" />
                )}
              </g>
            )}

            {/* 손인사(wave) 모션
                아래 path=인사용 팔, ellipse/circle=손바닥 무늬. ref와 className은 모션 연결용이므로 유지하세요. */}
            {!headOnly && safeLevel >= 1 && motion === 'wave' && (
              <g
                ref={animation.hand}
                className="mumu-wave-hand"
                fill={white}
                stroke={edge}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M145 162Q153 151 155 137L155 126Q155 115 166 114Q177 114 178 126Q180 141 168 154L158 166Q150 171 145 162Z" />
                <g fill="#dfccee" stroke="none">
                  <ellipse cx="166" cy="134" rx="5" ry="6" />
                  <circle cx="161" cy="123" r="2" />
                  <circle cx="168" cy="121" r="2" />
                  <circle cx="174" cy="125" r="2" />
                </g>
              </g>
            )}

            {/* 장착 아이템 연결입니다. 리본·목도리·모자는 Bunny.tsx에서 수정합니다. */}
            {accessories}
          </g>
        </g>
      </g>

      {/* 하트 뿜기(heart) 모션
                fill=날아가는 하트 색. 위치·크기·투명도는 useMumuAnimation.ts에서 재생 중 제어합니다. */}
      {motion === 'heart' && !headOnly && (
        <g ref={animation.hearts} aria-hidden="true" fill="#a17ae0" className="mumu-heart-effects">
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              opacity="0"
              fill={i === 1 ? '#ed9fbb' : '#a17ae0'}
              d="M0 8C-15-2-8-13 0-6C8-13 15-2 0 8Z"
            />
          ))}
        </g>
      )}
    </g>
  );
}
