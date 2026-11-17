'use client';
/* Estado "grudento": lembra a aba/segmento escolhido enquanto o app está aberto,
   para que voltar de uma tela interna não resete tudo. */
import { useCallback, useState } from 'react';

const mem = new Map<string, unknown>();

export function useSticky<T>(key: string, def: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => (mem.has(key) ? (mem.get(key) as T) : def));
  const set = useCallback((x: T) => { mem.set(key, x); setV(x); }, [key]);
  return [v, set];
}
