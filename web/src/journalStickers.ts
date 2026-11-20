export type StickerShape = { d: string; fill: string; stroke?: string; width?: number };
export const stickerGroups: Record<string, string[]> = {
  '추천': ['cloud', 'happy', 'heart', 'stars', 'double-heart', 'tape-green', 'tape-purple', 'bunny', 'flower', 'sun', 'cup', 'camera'],
  '감정': ['cloud', 'happy', 'heart', 'double-heart', 'stars'],
  '일상': ['cup', 'camera', 'book', 'tape-green', 'tape-purple'],
  '여행': ['camera', 'pin', 'sun', 'stars'],
  '계절': ['flower', 'leaf', 'sun', 'stars'],
  '캐릭터': ['cloud', 'happy', 'bunny'],
};
export const stickerNames: Record<string, string> = { cloud: '말랑 구름', happy: '신나는 구름', heart: '보라 하트', stars: '반짝 별', 'double-heart': '두근두근 하트', 'tape-green': '초록 마스킹 테이프', 'tape-purple': '보라 마스킹 테이프', bunny: '다정한 무무', flower: '봄꽃', sun: '따뜻한 해', cup: '커피 한 잔', camera: '보라 카메라', book: '작은 책', pin: '여행 핀', leaf: '초록 잎' };
const lavender = '#b49bd8', ink = '#80659f', pink = '#f2a9cc';
export function stickerShapes(id: string): StickerShape[] {
  const shape = (d: string, fill: string, stroke?: string, width = 2.3): StickerShape => ({ d, fill, stroke, width });
  const face = [shape('M26 35a2 2 0 1 0 .1 0M42 35a2 2 0 1 0 .1 0', ink), shape('M30 41q4 5 8 0', 'none', ink, 1.7), shape('M17 40a5 3 0 1 0 10 0a5 3 0 1 0-10 0M41 40a5 3 0 1 0 10 0a5 3 0 1 0-10 0', pink)];
  if (id === 'cloud' || id === 'happy') return [shape('M15 48C3 46 5 34 11 30C4 20 18 13 25 17C30 5 45 10 46 17C60 13 65 25 58 32C68 41 57 52 49 49C44 61 30 56 28 51C21 57 13 55 15 48Z', '#f3eafa', lavender), ...face, ...(id === 'happy' ? [shape('M10 10L7 4M21 8V1M53 10L58 4M3 19L0 14M63 21L67 15', 'none', lavender, 2.5)] : [])];
  if (id === 'heart') return [shape('M34 57C-9 30 7 1 31 18C51-8 79 20 34 57Z', '#dcc7f3'), shape('M33 45C13 31 18 17 31 25C43 12 55 27 33 45Z', '#f8f1ff')];
  if (id === 'double-heart') return [shape('M28 48C-4 26 8 7 25 22C42 4 62 24 28 48ZM45 59C24 45 35 31 45 41C55 27 71 44 45 59Z', 'none', pink, 3)];
  if (id === 'stars') return [shape('M17 8l5 11 12 2-9 9 2 13-10-6-11 6 2-13-8-9 12-2Z', '#cfb4ec'), shape('M48 27l5 10 11 2-8 8 2 12-10-5-10 5 2-12-8-8 11-2Z', '#ffe592'), shape('M47 2l2 5 6 1-4 4 1 5-5-2-5 2 1-5-4-4 6-1Z', '#e5d4f5')];
  if (id.startsWith('tape-')) return [shape('M6 15L60 8 57 17 64 24 58 31 63 40 7 49 11 41 3 34 10 28Z', id === 'tape-green' ? '#cde0b5' : '#d7bfed')];
  if (id === 'flower') return [shape('M34 34L30 63M31 53Q8 37 13 55Q20 63 31 55', 'none', '#9ab57e', 3), shape('M32 10C20-3 9 12 20 22C1 25 9 42 24 35C24 53 43 50 43 35C62 39 65 18 47 19C52 3 37-4 32 10Z', '#e9c2dd'), shape('M25 24a9 9 0 1 0 18 0a9 9 0 1 0-18 0', '#ffe897')];
  if (id === 'sun') return [shape('M33 1V9M33 56V64M2 32H10M56 32H64M10 10L16 16M50 50L57 57M11 55L17 49M50 16L57 9', 'none', '#e9c276', 3), shape('M16 32a17 17 0 1 0 34 0a17 17 0 1 0-34 0', '#ffe6a2'), ...face.slice(0, 2)];
  if (id === 'camera') return [shape('M6 20L20 17 23 10 44 8 49 14 59 13 64 49 10 56Z', '#cbb4e4', ink), shape('M24 31a14 14 0 1 0 28 0a14 14 0 1 0-28 0', '#fff8ff', ink), shape('M29 31a9 9 0 1 0 18 0a9 9 0 1 0-18 0', '#9575b5'), shape('M12 26L19 25 20 31 13 32Z', '#fff')];
  if (id === 'cup') return [shape('M13 24H48L45 50Q30 63 17 50ZM48 28C68 20 68 49 47 46M23 18Q15 10 23 3M35 18Q27 10 35 3', '#f4e7d4', '#ae9275', 2.5)];
  if (id === 'book') return [shape('M32 16Q16 6 4 14V52Q17 44 32 55Q49 44 62 52V14Q46 6 32 16ZM32 16V55M11 24L24 26M11 33L24 35M40 26L54 24M40 35L54 33', '#f1e5d2', '#aa9176')];
  if (id === 'pin') return [shape('M33 61Q3 33 14 14C28-7 57 6 55 26Q54 41 33 61Z', '#eeb9c9', '#c7879f'), shape('M24 24a9 9 0 1 0 18 0a9 9 0 1 0-18 0', '#fff8f5')];
  return [shape('M13 55Q0 9 58 5Q65 52 13 55ZM13 55L49 16', '#bfd3a1', '#8fa775')];
}
export function paintSticker(c: CanvasRenderingContext2D, id: string, x: number, y: number, size: number, mumu: HTMLImageElement | null) {
  if (id === 'bunny') {
    if (mumu) c.drawImage(mumu, x - size / 2, y - size, size, size);
    return;
  }
  c.save(); c.translate(x - size / 2, y - size); c.scale(size / 68, size / 68);
  for (const s of stickerShapes(id)) { const path = new Path2D(s.d); if (s.fill !== 'none') { c.fillStyle = s.fill; c.fill(path); } if (s.stroke) { c.strokeStyle = s.stroke; c.lineWidth = s.width ?? 2; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(path); } }
  c.restore();
}
