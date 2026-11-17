import { useRef, useState } from 'react';
import { api, getPos, type Booking } from './api';

export default function Arrival({ booking, onConfirmed }: { booking: Booking; onConfirmed: () => void }) {
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState('');
  const pending = useRef(false);

  async function arrive() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMessage('');
    try {
      // 방문 확인에는 저장한 주소가 아닌 실제 현재 위치를 사용한다.
      const r = await api.arrive(booking.id, await getPos());
      if (r.code === 200 && r.arrived) {
        setConfirmed(true);
        setMessage(r.demo ? '체험 모드로 방문을 확인했어.' : '방문을 확인했어. 편하게 체험하고 와.');
        onConfirmed();
      } else {
        setMessage(`${r.error ?? '아직 매장 가까이에서 위치가 확인되지 않았어.'} 방문 확인 없이도 ‘다녀왔어’로 기록할 수 있어.`);
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="arrival">
      {booking.arrivedAt || confirmed ? (
        <p className="pill" role="status">방문 확인 ✓</p>
      ) : (
        <>
          <button className="btn ghost" disabled={busy} aria-busy={busy} onClick={arrive}>
            {busy ? '현재 위치 확인 중…' : '도착했어'}
          </button>
          <p className="small mute">누르면 현재 위치로 방문을 확인해요. 확인하지 않아도 체험 기록은 남길 수 있어요.</p>
        </>
      )}
      {message && <p className="small" role="status">{message}</p>}
    </div>
  );
}
