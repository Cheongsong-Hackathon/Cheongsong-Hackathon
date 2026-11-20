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
  // 단품 원본(1254×1254)에서 남길 부분 (다각형 점, 원본 좌표). 상품 사진에 보이는 안감처럼 쓴 모습에서는 안 보일 곳을 잘라 낸다
  crop?: string;
};

export const wardrobeItems: readonly WardrobeItem[] = [
  // 모자: 아래에서 본 상품 사진이라 챙 아래 안감을 잘라 내고, 머리 크기에 맞춰 눈썹 위까지 깊게 씌운다 (2026-11-21 착용샷으로 다시 맞춤)
  { id: 'star-cap', name: '별 모자', category: '모자', slot: 'hat', image: cap, price: 450,
    fit: { x: 120, y: -5, width: 880, height: 760, transform: 'rotate(-5 560 375)' },
    crop: '0,0 1254,0 1254,790 880,800 800,842 740,848 680,848 620,832 560,812 500,792 440,776 300,762 200,776 140,784 0,784' },
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
