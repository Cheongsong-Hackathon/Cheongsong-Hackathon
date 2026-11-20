import { useEffect, useRef, useState, type ChangeEvent } from 'react';

import { drawJournal as draw, themes, themeDescriptions, type JournalEntry as Entry, type JournalDecoration } from './journalRenderer';
type SavedEntry = { entry: Entry; image: string };
import JournalControls, { type Tool } from './JournalControls';
import MoodLabel, { JOURNAL_MOODS } from './MoodLabel';
const makeId = () => typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fresh = (): Entry => ({ id: makeId(), title: '오늘의 경험 도감 ♡', date: today(), mood: '', photos: [], theme: 0, note: '', decorations: [] });

// 사진과 도감은 외부 전송 없이 현재 origin의 IndexedDB에만 저장한다.
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('moodpass-journal', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('entries', { keyPath: 'entry.id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function library(action: 'read' | 'save' | 'delete', value?: SavedEntry | string): Promise<SavedEntry[]> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction('entries', action === 'read' ? 'readonly' : 'readwrite');
      const store = transaction.objectStore('entries');
      let rows: SavedEntry[] = [];
      if (action === 'read') { const request = store.getAll(); request.onsuccess = () => { rows = request.result; }; }
      else if (action === 'save') store.put(value);
      else store.delete(value as string);
      transaction.oncomplete = () => resolve(rows);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { db.close(); }
}
const image = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('이미지를 읽지 못했어요. JPG 또는 PNG로 다시 골라 주세요.')); img.src = src;
});
async function photo(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('사진 파일을 골라 주세요.');
  if (file.size > 20 * 1024 * 1024) throw new Error('사진은 한 장에 20MB 이하로 골라 주세요.');
  const url = URL.createObjectURL(file);
  try {
    const img = await image(url); const c = document.createElement('canvas');
    const ratio = Math.min(1, 1000 / Math.max(img.width, img.height));
    c.width = Math.round(img.width * ratio); c.height = Math.round(img.height * ratio);
    const ctx = c.getContext('2d'); if (!ctx) throw new Error('사진 편집을 지원하지 않는 브라우저예요.');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', .85);
  } finally { URL.revokeObjectURL(url); }
}
function JournalPreview({ entry, theme }: { entry: Entry; theme?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const target = canvas.current;
    if (!target) return;
    let cancelled = false;
    const render = () => {
      const buffer = document.createElement('canvas');
      draw(buffer, theme === undefined ? entry : { ...entry, theme, decorations: [] }).then(() => {
        if (!cancelled) target.getContext('2d')?.drawImage(buffer, 0, 0);
      }).catch(() => {});
    };
    const observer = theme === undefined && typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer?.disconnect();
      render();
    }, { rootMargin: '100px' }) : null;
    if (observer) observer.observe(target);
    else render();
    return () => { cancelled = true; observer?.disconnect(); };
  }, [entry, theme]);
  return <canvas ref={canvas} width={720} height={900}
    className={theme === undefined ? 'journal-saved-canvas' : 'journal-theme-canvas'}
    aria-hidden={theme === undefined} aria-label={theme === undefined ? undefined : `${themes[theme]} 실제 배치 미리보기`} />;
}

export default function Journal({ onFocusChange, initialStep = 'library', onExit }: { onFocusChange: (focus: boolean) => void; initialStep?: 'library' | 'record'; onExit?: () => void }) {
  const [history, setHistory] = useState<{ past: Entry[]; entry: Entry; future: Entry[] }>(() => ({ past: [], entry: fresh(), future: [] }));
  const entry = history.entry;
  const [step, setStep] = useState<'library' | 'record' | 'theme' | 'edit' | 'done'>(initialStep);
  const [saved, setSaved] = useState<SavedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [tool, setTool] = useState<Tool | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [themePage, setThemePage] = useState(0);
  const [ready, setReady] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const header = useRef<HTMLElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const renderVersion = useRef(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => { onFocusChange(step !== 'library'); header.current?.scrollIntoView({ block: 'start' }); }, [step, onFocusChange]);
  async function reload() {
    setLoading(true);
    try { setSaved((await library('read')).reverse()); }
    catch { setMessage('도감을 불러오지 못했어요. 브라우저 저장 공간을 확인해 주세요.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);
  useEffect(() => {
    const version = ++renderVersion.current; setReady(false);
    if (!canvas.current) return;
    const buffer = document.createElement('canvas');
    draw(buffer, entry).then(() => {
      if (version !== renderVersion.current || !canvas.current) return;
      canvas.current.width = 720; canvas.current.height = 900;
      canvas.current.getContext('2d')?.drawImage(buffer, 0, 0); setReady(true);
    }).catch(() => { if (version === renderVersion.current) setMessage('사진을 표시하지 못했어요. 다른 사진을 선택해 주세요.'); });
    return () => { renderVersion.current += 1; };
  }, [entry, step]);
  function patch(value: Partial<Entry>, record = true) {
    setReady(false); setMessage('');
    setHistory(h => ({ past: record ? [...h.past, h.entry].slice(-50) : h.past, entry: { ...h.entry, ...value }, future: [] }));
  }
  function reset(value: Entry) { setReady(false); setHistory({ past: [], entry: value, future: [] }); setSelected(null); setTool(null); setConfirmDelete(false); }
  function undo() { setReady(false); setHistory(h => h.past.length ? { past: h.past.slice(0, -1), entry: h.past[h.past.length - 1], future: [h.entry, ...h.future] } : h); }
  function redo() { setReady(false); setHistory(h => h.future.length ? { past: [...h.past, h.entry], entry: h.future[0], future: h.future.slice(1) } : h); }
  async function choose(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])]; e.target.value = '';
    if (!files.length) return;
    setBusy(true); setMessage('');
    try {
      if (entry.photos.length + files.length > 5) throw new Error('사진은 최대 5장까지 담을 수 있어요.');
      patch({ photos: [...entry.photos, ...await Promise.all(files.map(photo))] });
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  function add(value: Partial<JournalDecoration> & { text: string }) {
    if (entry.decorations.length >= 16) return setMessage('꾸미기는 16개까지 추가할 수 있어요. 하나를 지운 뒤 추가해 주세요.');
    const id = makeId(); patch({ decorations: [...entry.decorations, { id, x: value.kind === 'text' ? (value.align === 'left' ? 72 : value.align === 'right' ? 648 : 360) : 520, y: 680, size: 44, color: '#a48acf', ...value }] }); setSelected(id);
  }
  function updateDecoration(value: Partial<JournalDecoration>, id = selected, record = true) {
    patch({ decorations: entry.decorations.map(d => d.id === id ? { ...d, ...value } : d) }, record);
  }
  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const box = e.currentTarget.getBoundingClientRect(); const scale = Math.min(box.width / 720, box.height / 900);
    return { x: (e.clientX - box.left - (box.width - scale * 720) / 2) / scale, y: (e.clientY - box.top - (box.height - scale * 900) / 2) / scale };
  }
  async function save() {
    if (!ready || !canvas.current) return;
    setBusy(true); setMessage('');
    try { await library('save', { entry, image: canvas.current.toDataURL('image/png') }); await reload(); setTool(null); setStep('done'); }
    catch { setMessage('저장 공간이 부족하거나 저장이 차단됐어요. 이미지 내려받기로 보관해 주세요.'); }
    finally { setBusy(false); }
  }
  function download() {
    if (!ready || !canvas.current) return;
    canvas.current.toBlob(blob => {
      if (!blob) return setMessage('이미지를 만들지 못했어요. 다시 시도해 주세요.');
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.download = `무무-${entry.date}.png`; a.href = url; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }, 'image/png');
  }
  function back() {
    setTool(null); setMessage('');
    if (step === 'edit') { setThemePage(Math.floor(entry.theme / 4)); setStep('theme'); }
    else if (step === 'theme') setStep('record');
    else if (onExit) onExit();
    else setStep('library');
  }
  const preview = <canvas ref={canvas} className="journal-canvas" style={{ touchAction: step === 'edit' && selected ? 'none' : 'pan-y' }} aria-label="완성될 경험 도감 미리보기" onPointerDown={e => {
    if (step !== 'edit') return;
    const p = point(e);
    const hit = [...entry.decorations].reverse().find(d => Math.abs(p.x - d.x) < (d.sticker ? d.size / 2 : Math.max(d.size / 2, d.size * d.text.length / 4)) && p.y >= d.y - d.size && p.y <= d.y + 8);
    if (!hit) { setSelected(null); return; }
    setSelected(hit.id); drag.current = { id: hit.id, dx: p.x - hit.x, dy: p.y - hit.y };
    setHistory(h => ({ ...h, past: [...h.past, h.entry].slice(-50), future: [] }));
    e.currentTarget.setPointerCapture(e.pointerId);
  }} onPointerMove={e => {
    if (!drag.current) return; const p = point(e);
    updateDecoration({ x: Math.max(32, Math.min(688, p.x - drag.current.dx)), y: Math.max(56, Math.min(840, p.y - drag.current.dy)) }, drag.current.id, false);
  }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} />;
  return <div className={`page journal journal-step-${step}`}>
    <header ref={header} className="journal-header">
      <button className="icon-btn" aria-label={step === 'library' ? '도감 목록 새로고침' : '이전 단계로'} onClick={step === 'library' && onExit ? onExit : step === 'library' ? reload : back}>‹</button>
      <strong>{({ library: '도감 내역', record: '경험 기록하기', theme: '테마 선택', edit: '도감 꾸미기', done: '기록 완료!' })[step]}</strong>
      {step === 'edit' ? <div className="journal-history"><button aria-label="실행 취소" disabled={!history.past.length} onClick={undo}>↶</button><button aria-label="다시 실행" disabled={!history.future.length} onClick={redo}>↷</button><button className="journal-finish" disabled={!ready || busy} onClick={save}>{busy ? '저장 중' : '완료'}</button></div> : <span aria-hidden="true">✧</span>}
    </header>
    {message && <p className="journal-message" role="status">{message}</p>}
    {step === 'library' ? <>
      <p className="small mute">사진과 도감은 이 브라우저에만 저장돼요. 브라우저 데이터를 지우면 사라지니, 소중한 기록은 이미지로 내려받아 주세요.</p>
      <h2 className="label">나의 도감 <span className="pill">{saved.length}</span></h2>
      {loading ? <p role="status">도감을 펼치는 중이에요…</p> : !saved.length ? <div className="journal-empty"><span aria-hidden="true">♡</span><strong>첫 번째 페이지를 기다리고 있어요</strong><p>사진 없이 글과 스티커만으로도 남길 수 있어요.</p></div> : <div className="journal-library">{saved.map(row => <button className="journal-saved" key={row.entry.id} onClick={() => { reset(row.entry); setStep('edit'); }}><JournalPreview entry={row.entry} /><strong>{row.entry.title}</strong><small>{row.entry.date}</small></button>)}</div>}
    </> : step === 'record' ? <>
      <h1 className="title journal-record-title">오늘의 경험을<br />도감에 남겨볼까요? 📷</h1>
      <div className="journal-photos"><button className="journal-add-photo" onClick={() => file.current?.click()} disabled={busy || entry.photos.length >= 5}><b>＋</b><span>{busy ? '사진 준비 중…' : '사진 추가'}</span><small>(최대 5장)</small></button>{entry.photos.map((src, i) => <div className="journal-photo" key={src + i}><img src={src} alt={`선택한 사진 ${i + 1}`} /><button aria-label={`사진 ${i + 1} 빼기`} disabled={busy} onClick={() => patch({ photos: entry.photos.filter((_, n) => n !== i), captions: entry.photos.flatMap((_, n) => n === i ? [] : [entry.captions?.[n] ?? '']) })}>×</button></div>)}</div>
      <input ref={file} type="file" accept="image/*" multiple hidden onChange={choose} />
      <div className="journal-record-fields">
        <label className="journal-field"><span className="journal-field-label"><span className="journal-field-icon activity-icon" aria-hidden="true">⚑</span>활동 이름</span><input value={entry.title} maxLength={36} onChange={e => patch({ title: e.target.value })} placeholder="도자기 만들기 & 한강 산책" /></label>
        <label className="journal-field"><span className="journal-field-label"><svg className="journal-field-icon" viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4" width="14" height="13" rx="2" /><path d="M3 8h14M7 2v5M13 2v5M6 11h4" /></svg>날짜</span><input type="date" value={entry.date} onChange={e => patch({ date: e.target.value })} /></label>
        <fieldset className="journal-field journal-mood-field"><legend><span className="journal-field-label"><span className="journal-field-icon" aria-hidden="true">♡</span>오늘의 기분 <small>(선택)</small></span></legend><div className="chips">{JOURNAL_MOODS.map(([m, icon]) => <button className={`chip${entry.mood === m ? ' on' : ''}`} aria-pressed={entry.mood === m} onClick={() => patch({ mood: entry.mood === m ? '' : m })} key={m}><MoodLabel label={m} emoji={icon} /></button>)}</div></fieldset>
      </div>
      <details className="journal-extra"><summary>한 줄 기록·사진 제목 더하기 <span>선택</span></summary><label className="journal-field">오늘의 한 줄<textarea maxLength={70} value={entry.note} onChange={e => patch({ note: e.target.value })} placeholder="어떤 순간이 가장 기억에 남나요?" /></label>{entry.photos.map((_, i) => <label className="journal-field" key={i}>사진 {i + 1}의 제목<input maxLength={24} value={entry.captions?.[i] ?? ''} placeholder="예: 도자기 만들기 ♡" onChange={e => patch({ captions: entry.photos.map((_, n) => n === i ? e.target.value : entry.captions?.[n] ?? '') })} /></label>)}</details>
      <button className="btn big journal-next" disabled={busy || !entry.title.trim() || !entry.date} onClick={() => { setThemePage(Math.floor(entry.theme / 4)); setStep('theme'); }}>다음</button>
    </> : step === 'theme' ? <>
      <h1 className="title journal-theme-title">어떤 분위기로 꾸밀까요?<br />원하는 테마를 골라보세요!</h1>
      <div className="journal-themes">{themes.slice(themePage * 4, themePage * 4 + 4).map((name, n) => { const i = themePage * 4 + n; return <button key={name} className={`journal-theme theme-${i}${entry.theme === i ? ' selected' : ''}`} aria-pressed={entry.theme === i} onClick={() => patch({ theme: i })}><JournalPreview entry={entry} theme={i} /><strong>{name}</strong><span className="sr-only">{themeDescriptions[i]}</span>{entry.theme === i && <span className="journal-check">✓</span>}</button>; })}</div>
      <div className="journal-pagination" aria-label="테마 페이지">{[0, 1].map(n => <button aria-label={`테마 ${n + 1}페이지`} aria-pressed={themePage === n} onClick={() => setThemePage(n)} key={n}><span /></button>)}</div>
      <button className="btn big journal-next" onClick={() => setStep('edit')}>다음</button>
    </> : step === 'edit' ? <>
      <div className="journal-preview">{preview}</div>
      <p className="journal-drag-hint">꾸미기를 눌러 끌어보세요 · 도구에서 위치도 조절할 수 있어요</p>
      <div className="journal-editor-toolbar" role="group" aria-label="꾸미기 도구">{(['테마 변경', '배경', '스티커', '텍스트', '프레임'] as const).map((t, i) => <button key={t} aria-pressed={tool === t} onClick={() => setTool(t)}><span aria-hidden="true">{['♧', '▨', '☺', 'T', '▣'][i]}</span>{t}</button>)}</div>
      {tool && <JournalControls key={tool} tool={tool} entry={entry} selected={selected} onClose={() => setTool(null)} onPatch={patch} onAdd={add} onSelect={setSelected} onUpdate={updateDecoration} />}
    </> : <>
      <div className="journal-done-layout"><div className="journal-preview">{preview}</div><div className="journal-done-actions"><h1>경험 도감이 완성됐어요! 🎉</h1><p>이 브라우저에 저장했어요.<br />이미지로 소중하게 간직해요.</p><button className="btn ghost" disabled={!ready} onClick={download}>↓ 이미지 저장</button><button className="btn ghost" onClick={() => setStep('edit')}>✧ 더 꾸미기</button></div></div>
      <button className="btn big journal-next" onClick={() => setStep('library')}>내 도감 보기</button>
      <p className="small center mute">다른 기기에서는 보이지 않아요. 이미지로 내려받아 보관해 주세요.</p>
      {confirmDelete ? <div className="card soft"><p>이 브라우저에서 도감을 지울까요?</p><div className="row two"><button className="btn ghost" onClick={() => setConfirmDelete(false)}>유지하기</button><button className="btn danger" disabled={busy} onClick={async () => { setBusy(true); try { await library('delete', entry.id); await reload(); setStep('library'); setConfirmDelete(false); } catch { setMessage('도감을 지우지 못했어요. 다시 시도해 주세요.'); } finally { setBusy(false); } }}>도감 지우기</button></div></div> : <button className="btn text" onClick={() => setConfirmDelete(true)}>이 도감 지우기</button>}
    </>}
  </div>;
}
