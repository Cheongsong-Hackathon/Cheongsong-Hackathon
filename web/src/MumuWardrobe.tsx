import { createContext, useContext, useState, type ReactNode } from 'react';
export const SHOP_ITEMS = [{ id: 'vest', name: '라벤더 니트 조끼', description: '포근하게 입는 보랏빛 니트', icon: '♧' }, { id: 'cape', name: '민트 케이프', description: '산뜻한 하루를 위한 가벼운 옷', icon: '✧' }, { id: 'glasses', name: '동그란 안경', description: '오늘은 조금 더 지적인 무무', icon: '◎' }] as const;
export type ShopId = typeof SHOP_ITEMS[number]['id'];
export type Wardrobe = { owned: ShopId[]; equipped: ShopId | null; colors?: Record<string, string> };
const Context = createContext<{ state: Wardrobe; save: (value: Wardrobe) => boolean }>({ state: { owned: [], equipped: null }, save: () => false });
const key = 'moodpass.mumu-shop.v1';
export function MumuWardrobeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Wardrobe>(() => {
    try { const value = JSON.parse(localStorage.getItem(key) ?? '{}'); const owned = SHOP_ITEMS.filter(i => value.owned?.includes(i.id)).map(i => i.id); return { owned, equipped: owned.includes(value.equipped) ? value.equipped : null, colors: Object.fromEntries(SHOP_ITEMS.filter(i => /^#[0-9a-f]{6}$/i.test(value.colors?.[i.id] ?? '')).map(i => [i.id, value.colors[i.id]])) }; }
    catch { return { owned: [], equipped: null }; }
  });
  function save(value: Wardrobe) { try { localStorage.setItem(key, JSON.stringify(value)); setState(value); return true; } catch { return false; } }
  return <Context.Provider value={{ state, save }}>{children}</Context.Provider>;
}
export const useMumuWardrobe = () => useContext(Context);
