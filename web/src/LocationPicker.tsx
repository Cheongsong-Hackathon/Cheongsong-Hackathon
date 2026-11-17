import { useEffect, useId, useRef, useState } from 'react';
import { api, type LatLng } from './api';

export type SavedLocation = LatLng & { label: string };

export default function LocationPicker({ value, fallback, onChange }: {
  value: SavedLocation | null;
  fallback: string;
  onChange: (value: SavedLocation | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const inputId = useId();

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener('pointerdown', dismiss, true);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss, true);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  async function search() {
    if (busy || !query.trim()) return;
    setBusy(true);
    setError('');
    const r = await api.geocode(query.trim());
    setBusy(false);
    if (r.code !== 200 || !Number.isFinite(r.lat) || !Number.isFinite(r.lng) || !r.label) {
      setError(r.error ?? '주소를 찾지 못했어. 다른 주소로 다시 검색해 줘.');
      return;
    }
    onChange({ lat: r.lat, lng: r.lng, label: r.label });
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={root} className={`card location-picker${open ? ' is-open' : ''}`}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
      <button ref={toggle} type="button" className="location-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>📍 {value?.label ?? fallback}</span><small>{open ? '닫기' : '주소로 설정 · 바꾸기'}</small>
      </button>
      {open && <div className="location-editor">
        <label className="small" htmlFor={inputId}>주소나 장소 이름</label>
        <div className="row location-search">
          <input id={inputId} value={query} maxLength={100} placeholder="예: 영남대학교" aria-busy={busy} readOnly={busy}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); search(); } }} />
          <button type="button" className="btn" disabled={busy || !query.trim()} onClick={search}>{busy ? '검색 중…' : '설정'}</button>
        </div>
        <p className="small mute">선택한 주소는 이 브라우저에 저장돼요.</p>
        {error && <p className="small" role="alert">{error}</p>}
        {value && <button type="button" className="btn ghost" disabled={busy} onClick={() => { onChange(null); setOpen(false); }}>저장한 주소 해제</button>}
      </div>}
    </div>
  );
}
