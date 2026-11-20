import { useEffect, useRef, useState } from 'react';
import type { Booking } from './api';
import mumuFace from './assets/mumu/face.webp';

export default function BookingNotification({ booking, error, enabled, hidden, onView, onRetry }: {
 booking: Booking | null; error: string; enabled: boolean; hidden: boolean; onView: () => void; onRetry: () => void;
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
 if(!enabled||hidden||!visible||(!booking&&!error)) return null;
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

const formatTime = new Intl.DateTimeFormat('ko-KR', {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Seoul',
});

function BookingAlert({ booking, label, timestamp }: { booking: Booking; label: string; timestamp?: string | null }) {
  return <li className="mumu-alert-entry">
    <img src={mumuFace} alt="" />
    <div>
      <small>{label}</small>
      <strong>{booking.title}</strong>
      {booking.placeName && booking.placeName !== booking.title && <span>{booking.placeName}</span>}
      {timestamp && Number.isFinite(Date.parse(timestamp)) && <time dateTime={timestamp}>{formatTime.format(new Date(timestamp))}</time>}
    </div>
  </li>;
}

export function BookingAlerts({ booking, completed, loading, error, onRetry, onClose }: {
  booking: Booking | null;
  completed: Booking[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  onClose: () => void;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const trigger = document.activeElement;
    closeButton.current?.focus();
    return () => { if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus(); };
  }, []);

  return <div className="mumu-alert-layer">
    <div className="mumu-alert-backdrop" aria-hidden="true" onClick={onClose} />
    <section id="mumu-notifications" className="mumu-alert-panel" role="dialog" aria-modal="true" aria-labelledby="mumu-alert-title"
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        } else if (event.key === 'Tab') {
          const buttons = event.currentTarget.querySelectorAll('button:not(:disabled)');
          const first = buttons[0] as HTMLButtonElement | undefined;
          const last = buttons[buttons.length - 1] as HTMLButtonElement | undefined;
          if (event.shiftKey ? document.activeElement === first : document.activeElement === last) {
            event.preventDefault();
            (event.shiftKey ? last : first)?.focus();
          }
        }
      }}>
      <header>
        <h2 id="mumu-alert-title">알림</h2>
        <button ref={closeButton} type="button" aria-label="알림 목록 닫기" onClick={onClose}>×</button>
      </header>
      <div className="mumu-alert-content">
        {(booking || completed.length > 0) && <ul aria-label="최근 알림">
          {booking && <BookingAlert booking={booking} label={booking.arrivedAt ? '도착 확인' : '진행 중인 예약'} timestamp={booking.arrivedAt ?? booking.slotTime} />}
          {completed.slice(0, 4).map(item => <BookingAlert key={item.id} booking={item} label="체험 기록 완료" timestamp={item.completedAt} />)}
        </ul>}
        {loading ? <p role="status">알림을 불러오는 중이에요…</p> : error ? <div role="status">
          <p>{error}</p>
          <button className="mumu-alert-retry" type="button" onClick={onRetry}>다시 불러오기</button>
        </div> : !booking && !completed.length && <p>아직 알림이 없어요.</p>}
      </div>
    </section>
  </div>;
}
