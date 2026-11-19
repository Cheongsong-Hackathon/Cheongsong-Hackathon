import { createContext } from 'react';
export const MumuGrowthContext = createContext<number | null>(null);
// Visual milestones only. Server growth and item unlock rules stay unchanged.
export const MUMU_MILESTONES = [0, 20, 40, 75, 120, 160] as const;
export const MUMU_FORMS = ['알껍질 모자 무무', '점박이 몽글 무무', '하트를 안은 무무', '판다 귀 무무', '큰 하트 무무', '고양이 무무'] as const;
export function mumuForm(exp: number) {
  const safe = Number.isFinite(exp) ? Math.max(0, exp) : 0;
  return MUMU_MILESTONES.reduce((level, threshold, index) => safe >= threshold ? index + 1 : level, 1);
}

export function mumuProgress(exp: number) {
  const level = mumuForm(exp);
  const min = MUMU_MILESTONES[level - 1];
  const next = MUMU_MILESTONES[level] ?? null;
  return { level, min, next, percent: next === null ? 100 : Math.max(0, Math.min(100, (exp - min) / (next - min) * 100)) };
}
