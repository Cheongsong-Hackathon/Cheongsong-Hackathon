import { useEffect, useRef, useState, type ReactNode } from 'react';
import { stickerGroups, stickerNames, stickerShapes } from './journalStickers';
import { themes, type JournalEntry, type JournalDecoration } from './journalRenderer';
export type Tool = '테마 변경' | '배경' | '스티커' | '텍스트' | '프레임';
export function StickerIcon({ id }: { id: string }) {
  return <svg viewBox="0 0 68 68" aria-hidden="true">{stickerShapes(id).map((s, i) => <path key={i} d={s.d} fill={s.fill} stroke={s.stroke} strokeWidth={s.width ?? 2} strokeLinecap="round" strokeLinejoin="round" />)}</svg>;
}
const colors = ['#29232e', '#ae875e', '#a48acf', '#efb1cf', '#f5cb9a', '#ffe39a', '#b5dcd0'];
const fonts = ['기본', '손글씨', '둥글', '빈티지'];
export default function JournalControls(p: { tool: Tool; entry: JournalEntry; selected: string | null; onClose: () => void; onPatch: (v: Partial<JournalEntry>) => void; onAdd: (d: Partial<JournalDecoration> & { text: string }) => void; onSelect: (id: string | null) => void; onUpdate: (v: Partial<JournalDecoration>) => void; }) {
  const panel = useRef<HTMLElement>(null);
  const [category, setCategory] = useState('추천');
  const d = p.entry.decorations.find(item => item.id === p.selected);
  const textDecoration = d?.kind === 'text' ? d : undefined;
  const [text, setText] = useState(textDecoration?.text ?? '오늘의 경험 도감 ♡');
  const [font, setFont] = useState(textDecoration?.font ?? '기본');
  const [color, setColor] = useState(textDecoration?.color ?? '#a48acf');
  const [size, setSize] = useState(Math.min(100, textDecoration?.size ?? 44));
  const [align, setAlign] = useState<CanvasTextAlign>(textDecoration?.align ?? 'center');
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>('button')?.focus();
    return () => previous?.focus();
  }, []);
  const option = (label: string, children: ReactNode) => <div className="journal-control-group"><h3>{label}</h3>{children}</div>;
  return <div className="journal-panel-scrim" onClick={p.onClose}>
    <section className="journal-panel" ref={panel} role="dialog" aria-modal="true" aria-label={p.tool === '텍스트' ? '텍스트 추가' : p.tool} onClick={e => e.stopPropagation()} onKeyDown={e => {
      if (e.key === 'Escape') { e.stopPropagation(); p.onClose(); }
      if (e.key !== 'Tab') return;
      const nodes = [...(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, textarea, select') ?? [])];
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }}>
      <header><span /><strong>{p.tool === '텍스트' ? '텍스트 추가' : p.tool}</strong><button className="icon-btn" onClick={p.onClose} aria-label="꾸미기 도구 닫기">×</button></header>
      {p.tool === '스티커' && <><div className="journal-category" aria-label="스티커 분류">{Object.keys(stickerGroups).map(c => <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>)}</div><div className="journal-sticker-gallery">{stickerGroups[category].map(id => <button key={id} aria-label={`${stickerNames[id]} 스티커 추가`} onClick={() => { p.onAdd({ text: stickerNames[id], kind: 'sticker', sticker: id, size: 110 }); p.onClose(); }}><StickerIcon id={id} /></button>)}</div></>}
      {p.tool === '텍스트' && <>
        <label className="journal-text-input"><span className="sr-only">추가할 텍스트</span><textarea maxLength={36} value={text} onChange={e => setText(e.target.value)} /></label>
        {option('글꼴', <div className="journal-fonts">{fonts.map(f => <button key={f} className={`font-${fonts.indexOf(f)}`} aria-pressed={font === f} onClick={() => setFont(f)}>{f}</button>)}</div>)}
        {option('색상', <div className="journal-swatches">{colors.map((c, i) => <button style={{ background: c }} aria-label={['먹색', '갈색', '보라색', '분홍색', '살구색', '노란색', '민트색'][i]} aria-pressed={color === c} key={c} onClick={() => setColor(c)} />)}<label className="journal-custom-color"><span className="sr-only">사용자 지정 색상</span><input type="color" value={color} onChange={e => setColor(e.target.value)} /></label></div>)}
        {option('크기', <input aria-label="텍스트 크기" type="range" min={24} max={100} value={size} onChange={e => setSize(Number(e.target.value))} />)}
        {option('정렬', <div className="journal-alignment">{(['left', 'center', 'right'] as const).map((a, i) => <button aria-label={['왼쪽 정렬', '가운데 정렬', '오른쪽 정렬'][i]} aria-pressed={align === a} key={a} onClick={() => setAlign(a)}>{['☰', '≡', '☰'][i]}</button>)}</div>)}
        <div className="row two">{d?.kind === 'text' && <button className="btn ghost" disabled={!text.trim()} onClick={() => { p.onUpdate({ text: text.trim(), font, size, color, align }); p.onClose(); }}>선택한 글 수정</button>}<button className="btn" disabled={!text.trim()} onClick={() => { p.onAdd({ text: text.trim(), kind: 'text', font, color, size, align }); p.onClose(); }}>텍스트 추가</button></div>
      </>}
      {p.tool === '배경' && <>{option('종이 색', <div className="journal-backgrounds">{[['#f4e9fb', '라벤더'], ['#fffaf4', '크림'], ['#f5e3eb', '로즈'], ['#e8eedf', '세이지']].map(([c, name]) => <button key={c} aria-pressed={p.entry.paperColor === c} onClick={() => p.onPatch({ paperColor: c })}><span style={{ background: c }} />{name}</button>)}<button aria-pressed={!p.entry.paperColor} onClick={() => p.onPatch({ paperColor: undefined })}><span className="journal-original-bg" />테마 기본</button></div>)}{option('종이 무늬', <div className="journal-fonts">{[['none', '기본'], ['grid', '체크'], ['lines', '줄노트'], ['dots', '도트']].map(([v, name]) => <button key={v} aria-pressed={(p.entry.pattern ?? 'none') === v} onClick={() => p.onPatch({ pattern: v })}>{name}</button>)}</div>)}</>}
      {p.tool === '프레임' && <>{option('도감 테두리', <div className="journal-frame-options">{[['none', '기본'], ['white', '화이트'], ['double', '더블 라인'], ['scallop', '우표 테두리']].map(([v, name]) => <button key={v} aria-pressed={(p.entry.frame ?? 'none') === v} onClick={() => p.onPatch({ frame: v })}><span className={`frame-sample frame-${v}`} />{name}</button>)}</div>)}</>}
      {p.tool === '테마 변경' && <div className="journal-theme-options">{themes.map((t, i) => <button key={t} aria-pressed={p.entry.theme === i} onClick={() => p.onPatch({ theme: i })}>{t}</button>)}</div>}
      {!!p.entry.decorations.length && p.tool !== '텍스트' && <div className="journal-selection-tools"><label>꾸미기 선택<select value={d?.id ?? ''} onChange={e => p.onSelect(e.target.value || null)}><option value="">선택 안 함 · 화면 스크롤</option>{p.entry.decorations.map((item, i) => <option key={item.id} value={item.id}>{i + 1}. {item.text}</option>)}</select></label>{d && <>
        <label>가로 위치<input type="range" min={32} max={688} value={d.x} onChange={e => p.onUpdate({ x: Number(e.target.value) })} /></label><label>세로 위치<input type="range" min={56} max={840} value={d.y} onChange={e => p.onUpdate({ y: Number(e.target.value) })} /></label><label>꾸미기 크기<input type="range" min={24} max={200} value={d.size} onChange={e => p.onUpdate({ size: Number(e.target.value) })} /></label><button className="btn ghost" onClick={() => { p.onPatch({ decorations: p.entry.decorations.filter(item => item.id !== d.id) }); p.onSelect(null); }}>선택한 꾸미기 지우기</button>
      </>}</div>}
    </section>
  </div>;
}
