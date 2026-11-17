import { useEffect, useState } from 'react';
import Snail from './Snail';

// 꾸밈용 가짜 앱 (눌러도 아무 일 없음)
const DUMMY: [string, string, string][] = [
  ['사진', '#e9c46a', 'M5 7h14v11H5zM8 15l3-3 2 2 2-3 3 4'],
  ['날씨', '#8fb7c9', 'M7 16a4 4 0 1 1 1-7.9A5 5 0 0 1 18 10a3 3 0 0 1 0 6z'],
  ['메모', '#f1e3b0', 'M7 4h10v16H7zM9.5 9h5M9.5 12h5M9.5 15h3'],
  ['음악', '#d98f7a', 'M10 17V6l8-2v11M10 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM18 15a2 2 0 1 1-4 0 2 2 0 0 1 4 0z'],
  ['지도', '#9db47a', 'M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2zM9 4v14M15 6v14'],
  ['달력', '#f4f1ea', 'M5 6h14v13H5zM5 10h14M9 4v4M15 4v4'],
  ['설정', '#b9b6aa', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2'],
];
const DOCK: [string, string, string][] = [
  ['전화', '#7fae6e', 'M7 4l3 1 1 4-2 1a10 10 0 0 0 5 5l1-2 4 1 1 3c-1 2-3 3-5 3A14 14 0 0 1 4 9c0-2 1-4 3-5z'],
  ['메시지', '#8fb7c9', 'M4 6h16v10H10l-5 4v-4H4z'],
  ['카메라', '#74766a', 'M4 8h4l2-2h4l2 2h4v10H4zM12 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
];

function Icon({ label, color, d }: { label: string; color: string; d: string }) {
  return (
    <div className="app-icon" aria-hidden="true">
      <span className="tile" style={{ background: color }}>
        <svg viewBox="0 0 24 24">
          <path d={d} />
        </svg>
      </span>
      <span className="name">{label}</span>
    </div>
  );
}

/** 휴대폰 메인 화면. 느리 아이콘을 누르면 앱이 열린다. */
export default function Launcher({ onOpen }: { onOpen: () => void }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="launcher">
      <div className="clock">
        <strong>{now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}</strong>
        <span>{now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}</span>
      </div>
      <div className="grid">
        <button className="app-icon neuri" onClick={onOpen} aria-label="느리 앱 열기">
          <span className="tile">
            <Snail size={54} />
          </span>
          <span className="name">느리</span>
        </button>
        {DUMMY.map(([label, color, d]) => (
          <Icon key={label} label={label} color={color} d={d} />
        ))}
      </div>
      <div className="dock">
        {DOCK.map(([label, color, d]) => (
          <Icon key={label} label={label} color={color} d={d} />
        ))}
      </div>
    </div>
  );
}
