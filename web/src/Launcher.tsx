import { useEffect, useState } from 'react';
import Snail from './Snail';

// 꾸밈용 가짜 앱 (눌러도 아무 일 없음). 느리는 이 뒤, 셋째 줄 셋째 칸에 놓인다.
const DUMMY: [string, string, string][] = [
  ['달력', '#4a6fa5', 'M5 6h14v13H5zM5 10h14M9 4v4M15 4v4'],
  ['사진', '#b5654d', 'M5 6h14v12H5zM8 15l3-3 2 2 2-3 3 4'],
  ['메모', '#c9952f', 'M7 4h10v16H7zM9.5 9h5M9.5 12h5M9.5 15h3'],
  ['날씨', '#5d94b8', 'M7 17a4 4 0 1 1 1-7.9A5 5 0 0 1 18 11a3 3 0 0 1 0 6z'],
  ['지도', '#6b4f9a', 'M12 21s-6-6-6-11a6 6 0 0 1 12 0c0 5-6 11-6 11zM12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z'],
  ['음악', '#9c3f5d', 'M10 17V6l8-2v11M10 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM18 15a2 2 0 1 1-4 0 2 2 0 0 1 4 0z'],
  ['계산기', '#3d3a36', 'M7 4h10v16H7zM9.5 8h5M9.5 12h1M13.5 12h1M9.5 16h1M13.5 16h1'],
  ['시계', '#40798c', 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4l3 2'],
  ['설정', '#77756e', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2'],
  ['파일', '#3f7a58', 'M4 7h6l2 2h8v10H4z'],
];
const DOCK: [string, string, string][] = [
  ['전화', '#3f8f4f', 'M7 4l3 1 1 4-2 1a10 10 0 0 0 5 5l1-2 4 1 1 3c-1 2-3 3-5 3A14 14 0 0 1 4 9c0-2 1-4 3-5z'],
  ['메시지', '#3f86b8', 'M4 6h16v10H10l-5 4v-4H4z'],
  ['카메라', '#55524d', 'M4 8h4l2-2h4l2 2h4v10H4zM12 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  ['인터넷', '#3f5fa8', 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16'],
];

function Icon({ label, color, d }: { label: string; color: string; d: string }) {
  return (
    <div className="app-icon dim" aria-hidden="true">
      <span className="tile" style={{ background: color }}>
        <svg viewBox="0 0 24 24">
          <path d={d} />
        </svg>
      </span>
      <span className="name">{label}</span>
    </div>
  );
}

/** 휴대폰 메인 화면. 느리 아이콘(또는 말풍선)을 누르면 앱이 열린다. */
export default function Launcher({ onOpen }: { onOpen: () => void }) {
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
        <span>느리 · 오늘의 한마디</span>
        <strong>
          기분이 처지는 날,
          <br />
          아주 작은 것 하나만
        </strong>
        <span>누워 있어도 괜찮아요. 느리는 천천히 기다려요</span>
      </div>

      <div className="grid">
        {DUMMY.map(([label, color, d]) => (
          <Icon key={label} label={label} color={color} d={d} />
        ))}
        <button className="app-icon neuri" onClick={onOpen} aria-label="느리 앱 열기">
          <span className="glow" />
          <span className="tile">
            <Snail size={62} />
          </span>
          <svg viewBox="0 0 24 24" className="hand" aria-hidden="true">
            <path d="M9 11V4.5a1.5 1.5 0 0 1 3 0V10l5.2 1.1c1 .2 1.8 1.1 1.8 2.2l-.8 5.5A2.5 2.5 0 0 1 15.7 21H11a3 3 0 0 1-2.3-1.1l-3.9-4.7.9-.9c.5-.5 1.2-.6 1.8-.3L9 15z" />
          </svg>
          <span className="name">느리</span>
          <span className="tip">
            <strong>클릭!</strong>
            달팽이 느리와 대화하고
            <br />
            지금 기운에 맞는 활동 하나를 받아요
          </span>
        </button>
      </div>

      <div className="dots" aria-hidden="true">
        <i className="on" />
        <i />
      </div>
      <div className="dock">
        {DOCK.map(([label, color, d]) => (
          <Icon key={label} label={label} color={color} d={d} />
        ))}
      </div>
      <span className="home-line" aria-hidden="true" />
    </div>
  );
}
