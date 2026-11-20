import { useEffect, useRef, useState } from 'react';
import type { Booking } from './api';

export default function BookingNotification({ booking, error, enabled, onView, onRetry }: {
 booking: Booking | null; error: string; enabled: boolean; onView: () => void; onRetry: () => void;
}) {
 const [visible,setVisible]=useState(false);
 const seen=useRef('');
 const key=error ? `error:${error}` : booking ? `booking:${booking.id}:${booking.slotTime}` : '';
 useEffect(()=>{
  if(!enabled) { seen.current=''; setVisible(false); return; }
  if(!key) { seen.current=''; setVisible(false); return; }
  if(seen.current===key) return;
  seen.current=key; setVisible(true);
  const timer=window.setTimeout(()=>setVisible(false),6000);
  return ()=>window.clearTimeout(timer);
 },[enabled,key]);
 if(!enabled||!visible||(!booking&&!error)) return null;
 return <aside className="mumu-booking-notification" role="status" aria-live="polite">
  <span className="mumu-notification-icon" aria-hidden="true">{error?'!':'♡'}</span>
  <button type="button" className="mumu-notification-body" onClick={()=>{setVisible(false);error?onRetry():onView();}}>
   <span>{error?'연결 확인':'무무 · 예약 알림'}<small>지금</small></span>
   <strong>{error?'정보를 불러오지 못했어요':booking!.title}</strong>
   <span>{error?'눌러서 다시 시도해 주세요':booking!.placeName}</span>
  </button>
  <button type="button" className="mumu-notification-close" aria-label="알림 닫기" onClick={()=>setVisible(false)}>×</button>
 </aside>;
}
