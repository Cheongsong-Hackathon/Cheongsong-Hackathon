import { createContext, useContext, useState, type ReactNode } from 'react';

export const COLOR_ITEMS = [
  { id: 'ribbon', name: '리본', defaultColor: '#ff8fb3' },
  { id: 'scarf', name: '목도리', defaultColor: '#ffd45e' },
  { id: 'beret', name: '베레모', defaultColor: '#6a4bd8' },
] as const;
export type ColorItem = (typeof COLOR_ITEMS)[number]['id'];
type Colors = Record<ColorItem, string>;
const DEFAULTS = Object.fromEntries(COLOR_ITEMS.map((item) => [item.id, item.defaultColor])) as Colors;
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
      return Object.fromEntries(COLOR_ITEMS.map(({ id }) => [id, valid(value?.[id]) ? value[id] : DEFAULTS[id]])) as Colors;
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

/** 무무샵 미리보기: 액세서리 하나의 색만 잠깐 바꿔 그린다 (저장 안 함) */
export function AccessoryColorOverride({ item, color, children }: { item: ColorItem; color: string; children: ReactNode }) {
  const current = useAccessoryColors();
  return <Context.Provider value={{ ...current, colors: { ...current.colors, [item]: color } }}>{children}</Context.Provider>;
}
