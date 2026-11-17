'use client';

import { useEffect, useState } from 'react';
import { HOME_HIDDEN_DEFAULT, HOME_SECTIONS, type HomeSectionId } from './constants';

const KEY = 'my-atlas:home-layout';
export interface HomeLayout { order: HomeSectionId[]; hidden: HomeSectionId[] }
const ALL = HOME_SECTIONS.map((s) => s.id) as HomeSectionId[];
const DEFAULT: HomeLayout = { order: ALL, hidden: HOME_HIDDEN_DEFAULT };

function read(): HomeLayout {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null') as HomeLayout | null;
    if (!v) return DEFAULT;
    const order = v.order.filter((x) => ALL.includes(x));
    // seções novas entram na posição padrão
    ALL.forEach((id, i) => { if (!order.includes(id)) order.splice(Math.min(i, order.length), 0, id); });
    return { order, hidden: v.hidden.filter((x) => ALL.includes(x)) };
  } catch {
    return DEFAULT;
  }
}

export function useHomeLayout() {
  const [layout, set] = useState<HomeLayout>(DEFAULT);
  useEffect(() => {
    set(read());
    const on = () => set(read());
    window.addEventListener('atlas:home-layout', on);
    return () => window.removeEventListener('atlas:home-layout', on);
  }, []);
  const update = (l: HomeLayout) => {
    try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* noop */ }
    set(l);
    window.dispatchEvent(new Event('atlas:home-layout'));
  };
  return { layout, update, reset: () => update(DEFAULT) };
}
