import { createContext, useContext } from 'react';

export const OutfitContext = createContext({ scarf: false });
export const useOutfit = () => useContext(OutfitContext);

export function nextOutfit(equipped: string | null, scarf: boolean, selected: string | null) {
  const head = equipped === 'scarf' ? null : equipped;
  return {
    head: selected === null ? null : selected === 'scarf' ? head : head === selected ? null : selected,
    scarf: selected === null ? false : selected === 'scarf' ? !scarf : scarf,
  };
}

export function scarfStorageKey() {
  try { return `moodpass.outfit-scarf.${localStorage.getItem('moodpass-user') ?? 'guest'}`; }
  catch { return 'moodpass.outfit-scarf.guest'; }
}
