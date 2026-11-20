import MumuArtwork from './MumuArtwork';
import { useEffect, useState } from 'react';
// 앱 안 상태 표시줄도 실행기 화면처럼 지금 시각 (10초마다 갱신)
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 10_000); return () => clearInterval(t); }, []);
  return now.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: false });
}
// 아이콘은 실행기 화면과 같은 방식으로 1:1 크기로 그린다 (줄여 그리면 보통 화면에서 선이 흐려져 잘려 보임)
export function PhoneStatus() { const time = useClock(); return <div className="new-phone-status" aria-hidden="true"><strong>{time}</strong><svg viewBox="0 0 70 14" width="70" height="14" fill="none" stroke="currentColor" strokeLinecap="round"><path d="M1.5 13V10M6.5 13V7.5M11.5 13V5M16.5 13V2" strokeWidth="2.4"/><path d="M23.5 6.2q6.5-5.8 13 0M26.3 9q3.7-3.3 7.4 0" strokeWidth="1.7"/><circle cx="30" cy="11.8" r="1.3" fill="currentColor" stroke="none"/><rect x="43" y="1.5" width="22" height="11" rx="3.5" strokeWidth="1.4"/><rect x="45" y="3.5" width="15" height="7" rx="1.8" fill="currentColor" stroke="none"/><path d="M67.5 5v4" strokeWidth="2.4"/></svg></div>; }
export default function MumuWelcome({onStart}:{onStart:()=>void}) {
 return <div className="new-welcome"><PhoneStatus/><header className="new-brand"><MumuArtwork className="mumu-brand-logo"/><span className="welcome-dots"><i/><i/><i/></span></header>
 <div className="welcome-copy"><h1>기분만 말해,<br/>갈 곳은 무무가 찾아줄게<span></span></h1><p>집 안에 머문 마음도, 집 밖의 하루도.<br/>무무가 기분전환을 도와줄게.</p></div>
 <div className="welcome-illustration"><MumuArtwork kind="home" className="mumu-welcome-character" label="함께 외출할 준비를 하는 무무"/></div>
 <div className="welcome-bottom"><button className="new-primary" onClick={onStart}>다음 <span>→</span></button><button className="welcome-skip" onClick={onStart}>건너뛰기</button></div></div>;
}
