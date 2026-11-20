import MumuArtwork from './MumuArtwork';
import { useEffect, useState } from 'react';
// 앱 안 상태 표시줄도 실행기 화면처럼 지금 시각 (10초마다 갱신)
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 10_000); return () => clearInterval(t); }, []);
  return now.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: false });
}
export function PhoneStatus() { const time = useClock(); return <div className="new-phone-status" aria-hidden="true"><strong>{time}</strong><svg viewBox="0 0 55 15" width="48" height="14"><path d="M2 13v-3m4 3V8m4 5V5m4 8V2" stroke="currentColor" strokeWidth="2"/><path d="M20 5q6-6 12 0m-10 3q4-4 8 0m-6 3q2-2 4 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><rect x="37" y="2" width="14" height="10" rx="2" fill="none" stroke="currentColor"/><rect x="39" y="4" width="10" height="6" rx="1" fill="currentColor"/><path d="M53 5v4" stroke="currentColor"/></svg></div>; }
export default function MumuWelcome({onStart}:{onStart:()=>void}) {
 return <div className="new-welcome"><PhoneStatus/><header className="new-brand"><MumuArtwork className="mumu-brand-logo"/><span className="welcome-dots"><i/><i/><i/></span></header>
 <div className="welcome-copy"><h1>기분만 말해,<br/>갈 곳은 무무가 찾아줄게<span></span></h1><p>집 안에 머문 마음도, 집 밖의 하루도.<br/>무무가 기분전환을 도와줄게.</p></div>
 <div className="welcome-illustration"><MumuArtwork kind="home" className="mumu-welcome-character" label="함께 외출할 준비를 하는 무무"/></div>
 <div className="welcome-bottom"><button className="new-primary" onClick={onStart}>다음 <span>→</span></button><button className="welcome-skip" onClick={onStart}>건너뛰기</button></div></div>;
}
