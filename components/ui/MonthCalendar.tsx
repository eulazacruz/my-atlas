'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { addMonths, cn, MONTHS, WEEK_LETTERS, ymd } from '@/lib/utils';

export interface DayDeco {
  style?: CSSProperties;
  className?: string;
  marks?: ReactNode;
}

/** Calendário mensal reutilizável (agenda e ciclo). */
export function MonthCalendar({
  month, onMonth, selected, onSelect, decorate,
}: {
  month: Date;
  onMonth: (d: Date) => void;
  selected: string;
  onSelect: (d: string) => void;
  decorate?: (d: string) => DayDeco | undefined;
}) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startPad = first.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: days }, (_, i) => ymd(new Date(month.getFullYear(), month.getMonth(), i + 1)))];
  while (cells.length % 7) cells.push(null);
  const today = ymd();

  return (
    <div className="glass p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[17px] font-semibold capitalize tracking-tight">
          {MONTHS[month.getMonth()]} <span className="muted">{month.getFullYear()}</span>
        </p>
        <div className="flex gap-1">
          <button aria-label="Mês anterior" onClick={() => onMonth(addMonths(first, -1))} className="grid h-8 w-8 place-items-center rounded-full bg-black/[0.05] dark:bg-white/[0.07]">
            <ChevronLeft size={16} />
          </button>
          <button aria-label="Próximo mês" onClick={() => onMonth(addMonths(first, 1))} className="grid h-8 w-8 place-items-center rounded-full bg-black/[0.05] dark:bg-white/[0.07]">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEK_LETTERS.map((l, i) => (
          <span key={i} className="pb-1 text-[11px] font-semibold muted">
            {l}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const deco = decorate?.(d);
          const isSel = d === selected;
          const isToday = d === today;
          return (
            <button key={d} onClick={() => onSelect(d)} className="flex flex-col items-center py-0.5">
              <span
                className={cn(
                  'grid h-9 w-9 place-items-center rounded-full text-[14px] tabular-nums transition-colors',
                  isSel ? 'bg-black font-bold text-white dark:bg-white dark:text-black' : isToday ? 'font-bold ring-1 ring-black/40 dark:ring-white/50' : '',
                  !isSel && deco?.className,
                )}
                style={isSel ? undefined : deco?.style}
              >
                {Number(d.slice(8))}
              </span>
              <span className="flex h-1.5 items-center gap-0.5">{deco?.marks}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const Dot = ({ color }: { color?: string }) => (
  <span className="h-1 w-1 rounded-full bg-black/60 dark:bg-white/70" style={color ? { background: color } : undefined} />
);
