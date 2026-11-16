'use client';

import { motion } from 'framer-motion';
import { CalendarDays, HeartPulse, House, LayoutGrid, NotebookPen } from 'lucide-react';
import { useUI, type Tab } from '@/components/providers/UIProvider';
import { cn, vibrate } from '@/lib/utils';

const ITEMS: { id: Tab; label: string; icon: typeof House }[] = [
  { id: 'home', label: 'Hoje', icon: House },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'notes', label: 'Notas', icon: NotebookPen },
  { id: 'health', label: 'Saúde', icon: HeartPulse },
  { id: 'more', label: 'Mais', icon: LayoutGrid },
];

export function TabBar() {
  const { tab, navigate } = useUI();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(0.9rem,env(safe-area-inset-bottom))]">
      <div className="glass flex w-full max-w-md items-center justify-between !rounded-[30px] !bg-white/80 p-1.5 dark:!bg-[#0c0c0c]/75">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => {
                vibrate(6);
                navigate(id);
              }}
              className={cn('relative flex h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[24px] text-[10.5px] font-semibold', active ? '' : 'muted')}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-[24px] bg-black/[0.07] dark:bg-white/[0.12]" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
              )}
              <Icon size={21} strokeWidth={active ? 2.3 : 1.8} className="relative" />
              <span className="relative">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
