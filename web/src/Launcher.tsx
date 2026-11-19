import { useEffect, useState, type ReactNode } from 'react';
import Bunny from './Bunny';

// 꾸밈용 가짜 앱 (눌러도 아무 일 없음). iOS 기본 앱 느낌으로 직접 그린 아이콘이다.
// 무무는 이 뒤, 셋째 줄 셋째 칸에 놓인다.
type App = { label: string; bg: string; art: ReactNode };
const PETALS = ['#fbb03b', '#f7e03c', '#a8d046', '#4fc28f', '#52b6e8', '#6a7fdb', '#b267c9', '#f0605d'];
const HANDSET = 'M7 4l3 1 1 4-2 1a10 10 0 0 0 5 5l1-2 4 1 1 3c-1 2-3 3-5 3A14 14 0 0 1 4 9c0-2 1-4 3-5z';

const apps = (now: Date): App[] => [
  {
    label: '캘린더',
    bg: '#fff',
    art: (
      <>
        <text x="30" y="17" textAnchor="middle" fontSize="10" fontWeight="600" fill="#ff3b30">
          {now.toLocaleDateString('ko-KR', { weekday: 'long' })}
        </text>
        <text x="30" y="48" textAnchor="middle" fontSize="33" fontWeight="300" fill="#111">
          {now.getDate()}
        </text>
      </>
    ),
  },
  {
    label: '사진',
    bg: '#fff',
    art: PETALS.map((c, i) => (
      <ellipse key={c} cx="30" cy="17.5" rx="6.6" ry="10.5" fill={c} opacity=".82" transform={`rotate(${i * 45} 30 30)`} />
    )),
  },
  {
    label: '메모',
    bg: '#fff',
    art: (
      <>
        <rect width="60" height="17" fill="#fcc419" />
        <path d="M0 19.5h60" stroke="#c9c9c9" strokeWidth="1" strokeDasharray="1.5 2.5" />
        <path d="M0 31h60M0 42h60M0 53h60" stroke="#d7d7d7" strokeWidth="1.2" />
      </>
    ),
  },
  {
    label: '날씨',
    bg: 'linear-gradient(#2f7fe0, #7cc6f7)',
    art: (
      <>
        <circle cx="22" cy="23" r="9.5" fill="#ffd43b" />
        <path d="M20 44a7.5 7.5 0 0 1 1.5-14.8A10 10 0 0 1 41 31.5a6.3 6.3 0 0 1 1 12.5z" fill="#fff" />
      </>
    ),
  },
  {
    label: '지도',
    bg: '#e8efe1',
    art: (
      <>
        <path d="M0 0h22L8 60H0z" fill="#b9e3a5" />
        <path d="M38 0h22v26z" fill="#8cc8f5" />
        <path d="M-4 44L64 14" stroke="#fff" strokeWidth="9" />
        <path d="M28 -4L40 64" stroke="#ffd95a" strokeWidth="7" />
        <circle cx="33" cy="31" r="9" fill="#fff" />
        <path d="M33 25l5 11-5-2.6-5 2.6z" fill="#2f7ff0" />
      </>
    ),
  },
  {
    label: '음악',
    bg: 'linear-gradient(#fb5c74, #fa233b)',
    art: (
      <g fill="#fff">
        {/* 겹친 8분음표: 기둥 두 개 + 위 막대 + 머리 두 개 */}
        <path d="M23 43V21M41 39V17" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M21.3 19.6L42.7 14.8v6.2L21.3 25.8z" />
        <ellipse cx="18.6" cy="43.2" rx="6.2" ry="4.8" transform="rotate(-18 18.6 43.2)" />
        <ellipse cx="36.6" cy="39.2" rx="6.2" ry="4.8" transform="rotate(-18 36.6 39.2)" />
      </g>
    ),
  },
  {
    label: '계산기',
    bg: '#1c1c1e',
    art: [12, 24, 36, 48].flatMap((x, col) =>
      [13, 25, 37, 49].map((y, row) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="4.7" fill={col === 3 ? '#ff9f0a' : row === 0 ? '#a5a5a5' : '#505052'} />
      )),
    ),
  },
  {
    label: '시계',
    bg: '#111',
    art: (
      <>
        <circle cx="30" cy="30" r="25" fill="#fff" />
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M30 8v3.5" stroke="#111" strokeWidth="1.6" transform={`rotate(${i * 30} 30 30)`} />
        ))}
        <path d="M30 30V15M30 30l10 6" stroke="#111" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M30 33L22 12" stroke="#ff9500" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="30" cy="30" r="2" fill="#ff9500" />
      </>
    ),
  },
  {
    label: '설정',
    bg: 'linear-gradient(#c7c7cc, #8e8e93)',
    art: (
      <g fill="none" stroke="#3a3a3c">
        <circle cx="30" cy="30" r="20" strokeWidth="5" strokeDasharray="4.2 3.65" />
        <circle cx="30" cy="30" r="16" strokeWidth="3" />
        <path d="M30 30V15.5M30 30l12.5 7.2M30 30l-12.5 7.2" strokeWidth="2.6" />
        <circle cx="30" cy="30" r="4.5" fill="#3a3a3c" stroke="none" />
      </g>
    ),
  },
  {
    label: '파일',
    bg: '#fff',
    art: (
      <>
        <path d="M10 18a3 3 0 0 1 3-3h11l4 5h19a3 3 0 0 1 3 3v3H10z" fill="#1a7cf0" />
        <rect x="10" y="23" width="40" height="23" rx="3.5" fill="#4aa8fb" />
      </>
    ),
  },
];

const DOCK: App[] = [
  {
    label: '전화',
    bg: 'linear-gradient(#63ef6f, #0cbb2b)',
    art: <path d={HANDSET} fill="#fff" transform="translate(9.6 9.6) scale(1.7)" />,
  },
  {
    label: '메시지',
    bg: 'linear-gradient(#63ef6f, #0cbb2b)',
    art: <path d="M30 13c-11 0-19 6.8-19 15.5 0 5 2.8 9.4 7.2 12.2-.4 2.6-1.6 4.8-3.6 6.6 4 0 7.2-1.300 9.600-3.500 1.800.4 3.800.7 5.800.7 11 0 19-6.800 19-15.500S41 13 30 13z" fill="#fff" />,
  },
  {
    label: '카메라',
    bg: 'linear-gradient(#dedee2, #9a9aa0)',
    art: (
      <>
        <path d="M11 22a4 4 0 0 1 4-4h5l3-4h14l3 4h5a4 4 0 0 1 4 4v19a4 4 0 0 1-4 4H15a4 4 0 0 1-4-4z" fill="#2c2c2e" />
        <circle cx="30" cy="31" r="9" fill="#55555a" />
        <circle cx="30" cy="31" r="5.5" fill="#1c1c1e" />
      </>
    ),
  },
  {
    label: 'Safari',
    bg: '#fff',
    art: (
      <>
        <circle cx="30" cy="30" r="25" fill="#1e8cf3" />
        {Array.from({ length: 24 }, (_, i) => (
          <path key={i} d="M30 7.5v3" stroke="#fff" strokeWidth="1" transform={`rotate(${i * 15} 30 30)`} />
        ))}
        <path d="M44 16L26.500 26.500 33.500 33.500z" fill="#ff3b30" />
        <path d="M16 44L26.500 26.500 33.500 33.500z" fill="#fff" />
      </>
    ),
  },
];

function Icon({ label, bg, art }: App) {
  return (
    <div className="app-icon dim" aria-hidden="true">
      <span className="tile" style={{ background: bg }}>
        <svg viewBox="0 0 60 60">{art}</svg>
      </span>
      <span className="name">{label}</span>
    </div>
  );
}

/** 휴대폰 메인 화면. 무무 아이콘(또는 말풍선)을 누르면 앱이 열린다. */
export default function Launcher({ onOpen, stage = 1 }: { onOpen: () => void; stage?: number }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="launcher">
      <div className="status" aria-hidden="true">
        <strong>{now.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: false })}</strong>
        <span className="island" />
        <svg viewBox="0 0 52 14" className="status-icons">
          <path d="M1 13V10M6 13V7.5M11 13V5M16 13V2" className="signal" />
          <rect x="24" y="1.5" width="22" height="11" rx="3.5" className="batt" />
          <rect x="26" y="3.5" width="15" height="7" rx="1.8" className="batt-fill" />
          <path d="M48.5 5v4" className="signal" />
        </svg>
      </div>

      <div className="widget" aria-hidden="true">
        <span>무무 · 오늘의 작은 회복</span>
        <strong>오늘 많이 지쳤지?</strong>
        <span>무무한테 말해 주면, 가까운 데서 30분 쉬다 올 곳 찾아 줄게</span>
      </div>

      <div className="grid">
        {apps(now).map((a) => (
          <Icon key={a.label} {...a} />
        ))}
        <button className="app-icon neuri" onClick={onOpen} aria-label="무무 앱 열기">
          <span className="glow" />
          <span className="tile">
            <Bunny size={60} stage={stage} />
          </span>
          <svg viewBox="0 0 24 24" className="hand" aria-hidden="true">
            <path d="M9 11V4.5a1.5 1.5 0 0 1 3 0V10l5.2 1.1c1 .2 1.8 1.1 1.8 2.2l-.8 5.5A2.5 2.5 0 0 1 15.7 21H11a3 3 0 0 1-2.3-1.1l-3.9-4.7.9-.9c.5-.5 1.2-.6 1.8-.3L9 15z" />
          </svg>
          <span className="name">무무</span>
          <span className="tip">
            <strong>클릭!</strong>
            오늘 기분에 맞는 체험을
            <br />
            가까운 곳에서 찾아 줘요
          </span>
        </button>
      </div>

      <div className="dots" aria-hidden="true">
        <i className="on" />
        <i />
      </div>
      <div className="dock">
        {DOCK.map((a) => (
          <Icon key={a.label} {...a} />
        ))}
      </div>
      <span className="home-line" aria-hidden="true" />
    </div>
  );
}
