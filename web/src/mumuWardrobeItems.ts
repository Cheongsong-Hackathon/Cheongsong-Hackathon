import base from './assets/mumu/wardrobe/base.png';
import fullLook from './assets/mumu/wardrobe/full-look.png';
import cap from './assets/mumu/wardrobe/star-cap.png';
import headset from './assets/mumu/wardrobe/star-headset.png';
import hoodie from './assets/mumu/wardrobe/cloud-hoodie.png';
import overalls from './assets/mumu/wardrobe/cloud-overalls.png';
import scarf from './assets/mumu/wardrobe/yellow-scarf.png';

export { base, fullLook };

export type WardrobeItem = {
  id: string;
  name: string;
  category: '모자' | '상의' | '하의' | '액세서리';
  slot: 'hat' | 'body' | 'headset' | 'scarf';
  image: string;
  price: number;
  // 단품 원본을 직접 입힐 때 사용하는 옷장 무무 캔버스(1122×1402)의 위치.
  fit?: { x: number; y: number; width: number; height: number; transform?: string };
};

export const wardrobeItems: readonly WardrobeItem[] = [
  { id: 'star-cap', name: '별 모자', category: '모자', slot: 'hat', image: cap, price: 450,
    fit: { x: 163, y: 72, width: 825, height: 515, transform: 'rotate(-11 560 350)' } },
  { id: 'cloud-hoodie', name: '구름 후드티', category: '상의', slot: 'body', image: hoodie, price: 850,
    fit: { x: 115, y: 630, width: 925, height: 655, transform: 'rotate(-3 560 985)' } },
  { id: 'cloud-overalls', name: '구름 멜빵', category: '하의', slot: 'body', image: overalls, price: 950,
    fit: { x: 173, y: 743, width: 799, height: 542, transform: 'rotate(-4 560 1070)' } },
  { id: 'star-headset', name: '별 헤드셋', category: '액세서리', slot: 'headset', image: headset, price: 700 },
  { id: 'yellow-scarf', name: '노란 목도리', category: '액세서리', slot: 'scarf', image: scarf, price: 400 },
];

export function clearLegacyWardrobe() {
  try {
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index);
      if (key && (key === 'moodpass.mumu-shop.v1' || key === 'moodpass.mumu-wardrobe.v2' ||
        key.startsWith('moodpass.outfit-scarf.') || key.startsWith('moodpass.accessory-colors.'))) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // 옷장 시착은 저장소에 접근할 수 없어도 동작합니다.
  }
}
