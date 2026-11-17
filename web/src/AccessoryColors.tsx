import { createContext, useContext, useState, type ReactNode } from 'react';

export type ColorItem = 'ribbon' | 'scarf';
type Colors = Record<ColorItem, string>;
const DEFAULTS: Colors = { ribbon: '#ff8fb3', scarf: '#ffd45e' };
const valid = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const Context = createContext({ colors: DEFAULTS, setColor: (_item: ColorItem, _color: string) => {} });

export function AccessoryColorsProvider({ children }: { children: ReactNode }) {
  const [storageKey] = useState(() => {
    try { return `moodpass.accessory-colors.${localStorage.getItem('moodpass-user') ?? 'guest'}`; }
    catch { return 'moodpass.accessory-colors.guest'; }
  });
  const [colors, setColors] = useState<Colors>(() => {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
      return { ribbon: valid(value?.ribbon) ? value.ribbon : DEFAULTS.ribbon, scarf: valid(value?.scarf) ? value.scarf : DEFAULTS.scarf };
    } catch { return DEFAULTS; }
  });
  const setColor = (item: ColorItem, color: string) => {
    if (!valid(color)) return;
    setColors((previous) => {
      const next = { ...previous, [item]: color };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  return <Context.Provider value={{ colors, setColor }}>{children}</Context.Provider>;
}

export const useAccessoryColors = () => useContext(Context);

/** 윤곽과 주름도 선택한 색에 맞춘다. */
export function tint(color: string, amount: number) {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(color.slice(start, start + 2), 16);
    return Math.round(amount >= 0 ? value + (255 - value) * amount : value * (1 + amount)).toString(16).padStart(2, '0');
  });
  return `#${channels.join('')}`;
}
