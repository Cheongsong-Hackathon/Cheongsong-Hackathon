import { createContext, useContext, useState, type ReactNode } from 'react';

export const EXPRESSIONS = ['기본', '기뻐', '지쳤어', '답답해', '불안해', '심심해', '평온해'] as const;
export type Expression = typeof EXPRESSIONS[number];
const Context = createContext<{ expression: Expression; setExpression: (value: Expression) => void }>({ expression: '기본', setExpression: () => {} });

export function CharacterExpressionProvider({ children }: { children: ReactNode }) {
  const [key] = useState(() => {
    try { return `moodpass.expression.${localStorage.getItem('moodpass-user') ?? 'guest'}`; }
    catch { return 'moodpass.expression.guest'; }
  });
  const [expression, update] = useState<Expression>(() => {
    try {
      const value = localStorage.getItem(key);
      return EXPRESSIONS.includes(value as Expression) ? value as Expression : '기본';
    } catch { return '기본'; }
  });
  const setExpression = (value: Expression) => {
    if (!EXPRESSIONS.includes(value)) return;
    update(value);
    try { localStorage.setItem(key, value); } catch {}
  };
  return <Context.Provider value={{ expression, setExpression }}>{children}</Context.Provider>;
}

export const useCharacterExpression = () => useContext(Context);
