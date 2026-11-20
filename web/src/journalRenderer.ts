import mumuIcon from './assets/mumu/face.webp'; // 도감 카드의 무무 얼굴
import { paintSticker } from './journalStickers';
export type JournalDecoration = { id: string; text: string; x: number; y: number; size: number; color: string; kind?: 'sticker' | 'text'; sticker?: string; font?: string; align?: CanvasTextAlign };
export type JournalEntry = {
  id: string; title: string; date: string; mood: string; photos: string[]; theme: number; note: string;
  captions?: string[]; paperColor?: string; pattern?: string; frame?: string;
  decorations: JournalDecoration[];
};
export const themes = ['말랑 다이어리', '빈티지 필름북', '미니멀 매거진', '키치 콜라주', '자연 크래프트', '여행 엽서'];
export const themeDescriptions = ['보랏빛 노트와 하트 낙서', '바랜 종이와 아날로그 필름', '여백을 담은 한 권의 잡지', '네온 핑크와 자유로운 조각들', '풀잎과 종이로 엮은 하루', '우표와 소인으로 남긴 여행'];
const serif = '"Batang", "Noto Serif KR", Georgia, serif';
const sans = '"NanumSquareRound", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
export const journalFonts: Record<string, string> = { '기본': sans, '손글씨': '"휴먼편지체", "Segoe Print", cursive', '둥글': '"NanumSquareRound", "Arial Rounded MT Bold", sans-serif', '빈티지': serif };
function surface(c: CanvasRenderingContext2D, e: JournalEntry) {
  c.save(); c.strokeStyle = '#8b729024'; c.fillStyle = '#8b72902b'; c.lineWidth = 1;
  if (e.pattern === 'grid') { for (let i = 0; i < 900; i += 24) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 900); c.moveTo(0, i); c.lineTo(720, i); c.stroke(); } }
  if (e.pattern === 'lines') for (let i = 0; i < 900; i += 28) { c.beginPath(); c.moveTo(0, i); c.lineTo(720, i); c.stroke(); }
  if (e.pattern === 'dots') for (let x = 12; x < 720; x += 24) for (let y = 12; y < 900; y += 24) { c.beginPath(); c.arc(x, y, 1.5, 0, Math.PI * 2); c.fill(); }
  c.restore();
}
let mascotImage: HTMLImageElement | null = null;
const photoCache = new Map<string, Promise<HTMLImageElement>>();
function loadImage(src: string) {
  if (!photoCache.has(src)) {
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = () => { photoCache.delete(src); reject(new Error('사진을 읽을 수 없어요.')); }; img.src = src;
    });
    if (photoCache.size >= 16) photoCache.delete(photoCache.keys().next().value!);
    photoCache.set(src, promise);
  }
  return photoCache.get(src)!;
}
type Ctx = CanvasRenderingContext2D;
function text(c: Ctx, value: string, x: number, y: number, size = 22, color = '#49372f', font = sans, width = 640, align: CanvasTextAlign = 'left') {
  c.save(); c.font = `${size >= 26 ? '700 ' : ''}${size}px ${font}`; c.fillStyle = color; c.textAlign = align; c.fillText(value, x, y, width); c.restore();
}
function lines(c: Ctx, value: string, x: number, y: number, width: number, size = 22, color = '#49372f', font = sans, max = 3) {
  c.save(); c.font = `${size >= 26 ? '700 ' : ''}${size}px ${font}`; c.fillStyle = color;
  const rows: string[] = []; let line = '';
  for (const char of value) {
    if (char === '\n' || c.measureText(line + char).width > width) { rows.push(line); line = ''; if (char === '\n') continue; }
    line += char;
  }
  rows.push(line);
  rows.slice(0, max).forEach((row, i) => {
    if (i === max - 1 && rows.length > max) {
      while (c.measureText(row + '…').width > width && row.length) row = row.slice(0, -1);
      row += '…';
    }
    c.fillText(row, x, y + i * size * 1.5);
  });
  c.restore();
}
function rect(c: Ctx, x: number, y: number, w: number, h: number, color: string) { c.fillStyle = color; c.fillRect(x, y, w, h); }
function rule(c: Ctx, x: number, y: number, w: number, color: string) { c.strokeStyle = color; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.stroke(); }
function paper(c: Ctx, color: string, seed: number, grain = true) {
  rect(c, 0, 0, 720, 900, color);
  if (!grain) return;
  let n = seed + 1; const random = () => { n = (Math.imul(n, 1664525) + 1013904223) | 0; return (n >>> 0) / 4294967296; };
  c.save();
  for (let i = 0; i < 10000; i++) { c.fillStyle = random() > .5 ? '#fff9e818' : '#5036150e'; c.fillRect(random() * 720, random() * 900, random() * 3 + .5, random() * 2 + .5); }
  c.restore();
}
function torn(c: Ctx, x: number, y: number, w: number, h: number, color: string, angle = 0) {
  c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(angle); c.translate(-w / 2, -h / 2);
  c.shadowColor = '#3c292d22'; c.shadowBlur = 7; c.shadowOffsetY = 3; c.fillStyle = color;
  c.beginPath(); c.moveTo(0, 3);
  for (let i = 0; i <= w; i += 10) c.lineTo(i, (i % 30 === 0 ? 1 : 5));
  c.lineTo(w, h - 3); for (let i = w; i >= 0; i -= 10) c.lineTo(i, h - (i % 30 === 0 ? 1 : 5)); c.closePath(); c.fill(); c.restore();
}
function tape(c: Ctx, x: number, y: number, w: number, color: string, angle = -.1) {
  c.save(); c.translate(x, y); c.rotate(angle); rect(c, -w / 2, -12, w, 24, color);
  c.fillStyle = '#ffffff55'; for (let i = -w / 2; i < w / 2; i += 14) c.fillRect(i, -12, 6, 24); c.restore();
}
function leaf(c: Ctx, x: number, y: number, scale: number, angle = 0, color = '#7a8860') {
  c.save(); c.translate(x, y); c.rotate(angle); c.scale(scale, scale); c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 2;
  c.beginPath(); c.moveTo(0, 12); c.quadraticCurveTo(15, -35, 0, -85); c.stroke();
  for (let i = 0; i < 5; i++) { const yy = -i * 16; c.beginPath(); c.ellipse(i % 2 ? 12 : -8, yy - 10, 6, 15, i % 2 ? .7 : -.7, 0, Math.PI * 2); c.fill(); }
  c.restore();
}
function heart(c: Ctx, x: number, y: number, size: number, color: string) {
  c.save(); c.translate(x, y); c.scale(size / 40, size / 40); c.strokeStyle = color; c.lineWidth = 3;
  c.beginPath(); c.moveTo(0, 12); c.bezierCurveTo(-45, -12, -12, -38, 0, -16); c.bezierCurveTo(12, -38, 45, -12, 0, 12); c.stroke(); c.restore();
}
function bunny(c: Ctx, x: number, y: number, scale: number) {
  if (mascotImage) c.drawImage(mascotImage, x - 40 * scale, y - 40 * scale, 80 * scale, 80 * scale);
}
function stamp(c: Ctx, x: number, y: number, label: string, color = '#937359') {
  c.save(); c.translate(x, y); c.rotate(-.12); c.strokeStyle = color; c.lineWidth = 1.4;
  c.beginPath(); c.arc(0, 0, 37, 0, 7); c.arc(0, 0, 31, 0, 7); c.stroke(); text(c, '무무', 0, -10, 10, color, serif, 62, 'center'); text(c, label, 0, 8, 12, color, serif, 60, 'center'); text(c, 'EXPERIENCE', 0, 23, 8, color, serif, 58, 'center');
  for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(36, i * 7 - 10); c.bezierCurveTo(55, i * 7 - 20, 70, i * 7, 95, i * 7 - 10); c.stroke(); } c.restore();
}
function placeholder(c: Ctx, x: number, y: number, w: number, h: number, i: number, theme: number) {
  const colors = [['#d9c5e9', '#af8aca'], ['#c8ab85', '#705b48'], ['#dbdfd7', '#7d8b78'], ['#ff8cc4', '#ffdd45'], ['#cbd3ac', '#6d8052'], ['#dbbba0', '#9d6950']][theme];
  const grad = c.createLinearGradient(0, y, 0, y + h); grad.addColorStop(0, colors[0]); grad.addColorStop(1, '#f8f2e7'); c.fillStyle = grad; c.fillRect(x, y, w, h);
  c.save(); c.translate(x + w / 2, y + h / 2); c.strokeStyle = colors[1]; c.lineWidth = 3; c.fillStyle = colors[1];
  if (i % 4 === 0) { c.beginPath(); c.ellipse(0, -20, 42, 12, 0, 0, 7); c.stroke(); c.beginPath(); c.moveTo(-42, -20); c.quadraticCurveTo(-40, 48, 0, 45); c.quadraticCurveTo(40, 48, 42, -20); c.stroke(); c.beginPath(); c.arc(46, 2, 17, -1.5, 1.5); c.stroke(); }
  else if (i % 4 === 1) { c.strokeRect(-55, -50, 110, 90); c.strokeRect(-46, -42, 92, 74); c.beginPath(); c.moveTo(-38, 19); c.lineTo(-12, -14); c.lineTo(7, 3); c.lineTo(32, -26); c.stroke(); }
  else if (i % 4 === 2) { c.beginPath(); c.arc(25, -27, 23, 0, 7); c.fill(); c.beginPath(); c.moveTo(-100, 37); c.quadraticCurveTo(-40, -5, 4, 27); c.quadraticCurveTo(54, 0, 110, 37); c.stroke(); }
  else { leaf(c, -15, 30, .9, -.2, colors[1]); leaf(c, 14, 33, .7, .5, colors[1]); }
  c.restore();
}
function fitPhoto(c: Ctx, img: HTMLImageElement | undefined, x: number, y: number, w: number, h: number, i: number, theme: number) {
  if (!img) return placeholder(c, x, y, w, h, i, theme);
  const ratio = Math.max(w / img.width, h / img.height), sw = w / ratio, sh = h / ratio;
  c.save(); if (theme === 1) c.filter = 'sepia(0.35) saturate(0.75)';
  c.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h); c.restore();
}
function polaroid(c: Ctx, img: HTMLImageElement | undefined, x: number, y: number, w: number, h: number, angle: number, caption: string, i: number, theme: number) {
  c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(angle); c.translate(-w / 2, -h / 2);
  c.shadowColor = '#4230342c'; c.shadowBlur = 10; c.shadowOffsetY = 4; rect(c, 0, 0, w, h, '#fffdf8'); c.shadowColor = 'transparent';
  fitPhoto(c, img, 10, 10, w - 20, h - 51, i, theme); text(c, caption, w / 2, h - 17, 19, theme === 0 ? '#805c94' : '#5c4f3a', theme === 4 || theme === 5 ? serif : sans, w - 26, 'center'); c.restore();
}
const caption = (e: JournalEntry, i: number) => e.captions?.[i]?.trim() || ['작은 즐거움을 발견한 순간', '새로운 시선으로 바라보기', '천천히 걷는 나의 시간', '오늘의 포근한 쉼', '오래 기억하고 싶은 장면'][i];
function note(c: Ctx, e: JournalEntry, theme: number) {
  const fill = ['#fffaf6', '#ead8ba', '#ffffff', '#fff59c', '#f5efdd', '#f8ebd5'][theme];
  if (theme === 2) { rule(c, 36, 755, 648, '#332c4944'); text(c, "TODAY'S MOOD", 42, 782, 11, '#555', sans); text(c, e.mood, 42, 823, 23, '#333', serif, 170); rule(c, 229, 772, 1, '#ddd'); lines(c, e.note || '작은 경험들이 모여 오늘을 더 풍성하게 만들었다.', 260, 794, 390, 19, '#444', serif, 3); }
  else { torn(c, 65, 758, 584, 105, fill, theme === 3 ? -.03 : .01); text(c, theme === 5 ? '오늘의 한 줄  /  TRAVEL MEMO' : '오늘의 한 줄 ♡', 88, 787, 17, '#6a584b', serif); lines(c, e.note || '작은 경험들이 모여, 오늘도 조금 더 행복했어 ♡', 88, 819, 532, 20, '#574650', serif, 2); }
}
export async function drawJournal(canvas: HTMLCanvasElement, e: JournalEntry) {
  await Promise.all([document.fonts.load('400 22px NanumSquareRound'), document.fonts.load('700 22px NanumSquareRound')]);
  const photos = await Promise.all(e.photos.map(loadImage));
  mascotImage = await loadImage(mumuIcon);
  const c = canvas.getContext('2d'); if (!c) throw new Error('도감 편집을 지원하지 않는 브라우저예요.');
  canvas.width = 720; canvas.height = 900;
  const t = e.theme >= 0 && e.theme < themes.length ? e.theme : 0;
  const count = photos.length || 4;
  const bg = ['#f4e9fb', '#d3b58f', '#fffefa', '#ff6bac', '#e7e2cd', '#eee0c9'][t]; paper(c, e.paperColor ?? bg, t, t !== 2);
  if (t === 0) {
    rect(c, 24, 131, 672, 735, e.paperColor ?? '#fffcff'); surface(c, e); for (let y = 155; y < 850; y += 30) rule(c, 52, y, 615, '#decfe544');
    for (let y = 150; y < 850; y += 45) { rect(c, 22, y, 23, 15, '#d3bbdf'); rect(c, 17, y + 1, 23, 11, '#f4e9fb'); }
    text(c, '♥  무무  ♡', 360, 30, 15, '#9166ab', sans, 600, 'center');
    torn(c, 142, 42, 438, 77, '#fffbff'); text(c, '말랑 다이어리', 360, 95, 43, '#78538e', sans, 430, 'center');
    tape(c, 72, 132, 100, '#c6a6e5bb', -.55); tape(c, 611, 132, 94, '#f0badaaa', .3);
    text(c, e.title, 69, 181, 27, '#88629b', sans, 480); text(c, `${e.date} · ${e.mood}`, 68, 212, 15, '#ac88b9'); bunny(c, 620, 82, .8);
    for (let i = 0; i < count; i++) {
      let single = count === 1, x = single ? 137 : 69 + i % 2 * 309, y = single ? 261 : 250 + Math.floor(i / 2) * 244, w = single ? 448 : 277, h = single ? 442 : 225;
      if (count === 5) { y = 238 + Math.floor(i / 2) * 166; h = 154; if (i === 4) x = (720 - w) / 2; }
      polaroid(c, photos[i], x, y, w, h, i % 2 ? .045 : -.045, caption(e, i), i, t); tape(c, x + w / 2, y + 1, 96, i % 2 ? '#be9adb99' : '#f1afd699', i % 2 ? .2 : -.12);
    }
    bunny(c, 42, 805, .8); [242, 540, 705].forEach((y, i) => heart(c, 671 - i * 5, y, 24, '#ed9ec6'));
  } else if (t === 1) {
    torn(c, 13, 23, 690, 850, e.paperColor ?? '#dfc6a3', -.01); surface(c, e); torn(c, 105, 48, 506, 78, '#ead3b0', -.02);
    text(c, '—  무무  —', 360, 33, 14, '#60442c', serif, 640, 'center'); text(c, '빈티지 필름북', 360, 101, 43, '#493321', serif, 480, 'center');
    text(c, e.title, 55, 161, 26, '#5c4028', serif, 450); text(c, `${e.date} / ${e.mood}`, 55, 193, 16, '#795940', serif); stamp(c, 614, 143, 'FILM 400', '#83613e');
    for (let i = 0; i < count; i++) {
      let single = count === 1, x = single ? 108 : 42 + i % 2 * 330, y = single ? 240 : 236 + Math.floor(i / 2) * 252, w = single ? 504 : 301, h = single ? 450 : 232;
      if (count === 5) { y = 236 + Math.floor(i / 2) * 166; h = 154; if (i === 4) x = (720 - w) / 2; }
      c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(i % 2 ? -.025 : .025); c.translate(-w / 2, -h / 2);
      rect(c, 0, 0, w, h - 34, '#3b2a20'); for (let sy = 9; sy < h - 40; sy += 22) { rect(c, 5, sy, 10, 13, '#bd9b70'); rect(c, w - 15, sy, 10, 13, '#bd9b70'); }
      fitPhoto(c, photos[i], 22, 15, w - 44, h - 68, i, t); text(c, `무무 FILM 400                     0${i + 1}`, 24, 11, 9, '#d5ae72', serif, w - 42);
      torn(c, 19, h - 47, w - 38, 46, '#f0ddba', -.02); text(c, caption(e, i), w / 2, h - 19, 19, '#5b3e25', serif, w - 50, 'center'); c.restore();
    }
    text(c, 'EXPERIENCE DIARY · small visits, big moods.', 360, 891, 13, '#745336', serif, 630, 'center');
  } else if (t === 2) {
    surface(c, e);
    text(c, '무무', 34, 34, 12, '#222'); text(c, 'EXPERIENCE DIARY  —  VOL. 01', 684, 34, 10, '#444', sans, 320, 'right');
    text(c, '미니멀 매거진', 360, 102, 48, '#262421', serif, 600, 'center'); rule(c, 250, 125, 220, '#baa991'); text(c, '무무   E X P E R I E N C E', 360, 151, 10, '#777', sans, 620, 'center');
    lines(c, e.title, 34, 222, 127, 29, '#333', serif, 3); rule(c, 35, 338, 120, '#555'); text(c, '경험한 날', 35, 371, 14, '#777'); text(c, e.date, 35, 397, 15, '#333', serif); text(c, '오늘의 기분', 35, 456, 14, '#777'); text(c, e.mood, 35, 485, 19, '#333', serif);
    for (let i = 0; i < count; i++) {
      let single = count === 1, x = single ? 185 : 185 + i % 2 * 250, y = single ? 196 : 196 + Math.floor(i / 2) * 274, w = single ? 495 : 242, h = single ? 482 : 215;
      if (count === 5) { y = 196 + Math.floor(i / 2) * 180; h = 140; if (i === 4) x = (865 - w) / 2; }
      fitPhoto(c, photos[i], x, y, w, h, i, t); text(c, `0${i + 1}`, x, y + h + 29, 27, '#222', serif); text(c, caption(e, i), x + 40, y + h + 26, 15, '#333', serif, w - 42);
    }
    for (let x = 540; x < 682; x += 4) rect(c, x, 864, x % 3 === 0 ? 2 : 1, 19, '#333');
  } else if (t === 3) {
    surface(c, e);
    for (let y = 0; y < 900; y += 90) { c.save(); c.translate(360, y); c.rotate(-.18); rect(c, -500, 0, 1000, 25, y % 180 ? '#ff9d2f' : '#f52991'); c.restore(); }
    for (let y = 24; y < 890; y += 20) for (let x = 666; x < 720; x += 20) rect(c, x, y, 20, 20, (x + y) % 40 ? '#111' : '#fff');
    torn(c, 80, 38, 552, 94, '#fffafc', -.04); text(c, '키치 콜라주', 360, 101, 53, '#16121a', sans, 550, 'center');
    text(c, '무무', 17, 23, 16, '#fff'); torn(c, 40, 142, 625, 76, '#fff9fc', .018); text(c, e.title, 67, 174, 28, '#1c1725', sans, 570); text(c, `${e.date}  /  ${e.mood}  ♡♡♡`, 69, 202, 16, '#bb2d7c');
    for (let i = 0; i < count; i++) {
      let single = count === 1, x = single ? 120 : 47 + i % 2 * 325, y = single ? 258 : 253 + Math.floor(i / 2) * 249, w = single ? 475 : 292, h = single ? 443 : 226;
      if (count === 5) { y = 238 + Math.floor(i / 2) * 166; h = 154; if (i === 4) x = (720 - w) / 2; }
      polaroid(c, photos[i], x, y, w, h, i % 2 ? .06 : -.06, caption(e, i), i, t); torn(c, x - 5, y - 16, w - 20, 34, i % 2 ? '#fff255' : '#ffa1da', -.045); text(c, `${i + 1}. MY HAPPY MOMENT!`, x + 7, y + 7, 15, '#292023', sans, w - 30);
    }
    text(c, '★', 639, 265, 76, '#ffed00'); text(c, '✦', 52, 723, 68, '#ffff33'); heart(c, 648, 77, 45, '#ff31a4'); heart(c, 628, 714, 53, '#ff278d');
  } else if (t === 4) {
    torn(c, 17, 20, 686, 865, e.paperColor ?? '#f6f0df'); surface(c, e); torn(c, 131, 41, 464, 82, '#bdc49a', -.02);
    text(c, '☘  무무', 360, 31, 13, '#6b7353', serif, 600, 'center'); text(c, '자연 크래프트', 360, 100, 42, '#4c593c', serif, 480, 'center');
    text(c, e.title, 54, 163, 26, '#5f664d', serif, 530); text(c, `${e.date} · ${e.mood}`, 55, 195, 16, '#858268', serif);
    for (let i = 0; i < count; i++) {
      let single = count === 1, x = single ? 120 : 57 + i % 2 * 320, y = single ? 250 : 242 + Math.floor(i / 2) * 252, w = single ? 480 : 289, h = single ? 445 : 232;
      if (count === 5) { y = 238 + Math.floor(i / 2) * 166; h = 154; if (i === 4) x = (720 - w) / 2; }
      polaroid(c, photos[i], x, y, w, h, i % 2 ? .035 : -.045, caption(e, i), i, t); tape(c, x + w / 2, y, 90, '#99a27699', i % 2 ? -.15 : .12);
    }
    leaf(c, 33, 173, 1.2, -.3); leaf(c, 687, 338, 1.3, .3); leaf(c, 675, 752, 1.1, -.5); leaf(c, 43, 846, .7, -.4);
    for (let y = 45; y < 880; y += 8) { c.strokeStyle = '#ab967b'; c.lineWidth = 2; c.beginPath(); c.moveTo(20, y); c.lineTo(22, y + 9); c.stroke(); }
  } else {
    for (let x = -20; x < 740; x += 42) { c.save(); c.translate(x, 0); c.rotate(.6); rect(c, 0, -24, 15, 51, x % 84 ? '#be8b80' : '#869ea4'); c.restore(); c.save(); c.translate(x, 888); c.rotate(.6); rect(c, 0, -16, 15, 48, x % 84 ? '#be8b80' : '#869ea4'); c.restore(); }
    torn(c, 24, 28, 672, 840, e.paperColor ?? '#fcf2e1'); surface(c, e); stamp(c, 606, 86, 'TRAVEL');
    text(c, '∿ 무무', 360, 33, 14, '#81664f', serif, 600, 'center'); torn(c, 161, 49, 360, 83, '#dac29f'); text(c, '여행 엽서', 340, 105, 48, '#6f4b35', serif, 350, 'center');
    text(c, e.title, 51, 174, 28, '#785d45', serif, 600); text(c, `${e.date}  ·  ${e.mood}  ·  우리 동네의 작은 여행`, 53, 207, 15, '#9c775e', serif, 610);
    for (let i = 0; i < count; i++) {
      let single = count === 1, x = single ? 117 : 51 + i % 2 * 327, y = single ? 253 : 249 + Math.floor(i / 2) * 249, w = single ? 486 : 291, h = single ? 443 : 226;
      if (count === 5) { y = 238 + Math.floor(i / 2) * 166; h = 154; if (i === 4) x = (720 - w) / 2; }
      torn(c, x - 5, y - 6, w + 10, h + 13, '#f7e6c9', i % 2 ? .04 : -.04); polaroid(c, photos[i], x, y, w, h, i % 2 ? .04 : -.04, `${i + 1}. ${caption(e, i)}`, i, t); tape(c, x + w / 2, y, 70, '#d3b18d99', -.12);
    }
    stamp(c, 632, 838, 'BON VOYAGE', '#987a60'); text(c, '✉', 30, 877, 24, '#846e5c');
  }
  note(c, e, t);
  c.save();
  if (e.frame === 'white') { c.strokeStyle = '#fffdfb'; c.lineWidth = 22; c.strokeRect(11, 11, 698, 878); }
  if (e.frame === 'double') { c.strokeStyle = '#816695'; c.lineWidth = 2; c.strokeRect(12, 12, 696, 876); c.strokeRect(20, 20, 680, 860); }
  if (e.frame === 'scallop') { c.strokeStyle = '#fffaf3'; c.lineWidth = 16; c.setLineDash([2, 14]); c.lineCap = 'round'; c.strokeRect(6, 6, 708, 888); }
  c.restore();
  for (const d of e.decorations) {
    if (d.sticker) paintSticker(c, d.sticker, d.x, d.y, d.size, mascotImage);
    else text(c, d.text, d.x, d.y, d.size, d.color, journalFonts[d.font ?? '기본'] ?? sans, 640, d.align ?? 'center');
  }
}
