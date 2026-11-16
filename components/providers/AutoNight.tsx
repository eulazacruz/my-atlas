'use client';

import { useTheme } from 'next-themes';
import { useEffect } from 'react';
import { readReminders } from '@/components/hubs/MindBody';

/** Modo noturno automático: escuro das 18h às 6h, claro de dia (se ligado em Mente → Lembretes). */
export function AutoNight() {
  const { setTheme } = useTheme();
  useEffect(() => {
    const apply = () => {
      if (!readReminders().autoNight) return;
      const h = new Date().getHours();
      setTheme(h >= 18 || h < 6 ? 'dark' : 'light');
    };
    apply();
    const i = window.setInterval(apply, 60_000);
    window.addEventListener('atlas:reminders', apply);
    document.addEventListener('visibilitychange', apply);
    return () => { window.clearInterval(i); window.removeEventListener('atlas:reminders', apply); document.removeEventListener('visibilitychange', apply); };
  }, [setTheme]);
  return null;
}
