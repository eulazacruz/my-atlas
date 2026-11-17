'use client';
/* Peças compartilhadas da v6: grid de ferramentas, abas em pílula, passo a passo, cronômetro. */
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI } from '@/components/providers/UIProvider';
import { Button } from '@/components/ui/primitives';
import { TOOL_META } from '@/lib/tools';
import { cn, uid } from '@/lib/utils';

export const EMERALD = '#10B981';

/** Grid compacto de ferramentas: ícone + nome. Abre cada uma em sua página. */
export function ToolGrid({ ids, cols = 3, badges }: { ids: string[]; cols?: 2 | 3 | 4; badges?: Record<string, string | number | undefined> }) {
  const { navigate } = useUI();
  return (
    <div className={cn('grid gap-2.5', cols === 2 ? 'grid-cols-2' : cols === 4 ? 'grid-cols-4' : 'grid-cols-3')}>
      {ids.map((id, i) => {
        const m = TOOL_META[id];
        if (!m) return null;
        const b = badges?.[id];
        return (
          <motion.button
            key={id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.025, 0.3), type: 'spring', stiffness: 500, damping: 34 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => navigate('tool', id)}
            className="glass relative flex flex-col items-start gap-2 !rounded-[22px] p-3 text-left"
          >
            <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-black/[0.05] text-[21px] dark:bg-white/[0.07]">{m.emoji}</span>
            <span className="text-[13px] font-semibold leading-tight">{m.title}</span>
            {b !== undefined && b !== '' && b !== 0 && (
              <span className="absolute right-2.5 top-2.5 grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold text-white" style={{ background: EMERALD }}>{b}</span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

/** Linha larga de ferramenta (para listas de destaque). */
export function ToolRow({ id, sub }: { id: string; sub?: string }) {
  const { navigate } = useUI();
  const m = TOOL_META[id];
  return (
    <motion.button whileTap={{ scale: 0.98 }} onClick={() => navigate('tool', id)} className="glass flex w-full items-center gap-3 p-3.5 text-left">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] bg-black/[0.05] text-[22px] dark:bg-white/[0.07]">{m.emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{m.title}</span>
        <span className="block truncate text-[12.5px] muted">{sub ?? m.hint}</span>
      </span>
      <ChevronRight size={17} className="muted" />
    </motion.button>
  );
}

export function Pills<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4">
      {options.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)} className={cn('relative shrink-0 rounded-full px-4 py-2 text-[14px] font-semibold', value === v ? 'text-white dark:text-black' : 'glass-thin')}>
          {value === v && <motion.span layoutId={`pill-${options.map((o) => o[0]).join('')}`} className="absolute inset-0 rounded-full bg-black dark:bg-white" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
          <span className="relative">{l}</span>
        </button>
      ))}
    </div>
  );
}

export function Fade({ k, children }: { k: string | number; children: ReactNode }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Pontinhos de progresso. */
export function Dots({ n, i }: { n: number; i: number }) {
  return (
    <div className="flex justify-center gap-1.5">
      {Array.from({ length: n }).map((_, j) => (
        <motion.span key={j} animate={{ width: j === i ? 20 : 6, opacity: j <= i ? 1 : 0.25 }} className="h-1.5 rounded-full bg-current" />
      ))}
    </div>
  );
}

/** Passo a passo genérico: um cartão grande por vez. */
export function Stepper({ steps, onDone, doneLabel = 'Concluir' }: { steps: { title: string; body: ReactNode }[]; onDone: () => void; doneLabel?: string }) {
  const [i, setI] = useState(0);
  const last = i === steps.length - 1;
  return (
    <div>
      <Dots n={steps.length} i={i} />
      <Fade k={i}>
        <div className="glass mt-4 p-5">
          <p className="label">Passo {i + 1} de {steps.length}</p>
          <h3 className="mt-1 text-[22px] font-bold tracking-tight">{steps[i].title}</h3>
          <div className="mt-3">{steps[i].body}</div>
        </div>
      </Fade>
      <div className="mt-4 flex gap-2">
        {i > 0 && <Button className="flex-1" onClick={() => setI(i - 1)}>Voltar</Button>}
        <Button variant="primary" className="flex-1" onClick={() => (last ? onDone() : setI(i + 1))}>{last ? doneLabel : 'Próximo'}</Button>
      </div>
    </div>
  );
}

/** Cronômetro regressivo circular. */
export function Countdown({ seconds, running = true, onEnd, size = 120 }: { seconds: number; running?: boolean; onEnd?: () => void; size?: number }) {
  const [left, setLeft] = useState(seconds);
  const end = useRef(onEnd);
  end.current = onEnd;
  useEffect(() => setLeft(seconds), [seconds]);
  useEffect(() => {
    if (!running || left <= 0) return;
    const t = window.setTimeout(() => {
      setLeft((l) => {
        if (l - 1 <= 0) end.current?.();
        return l - 1;
      });
    }, 1000);
    return () => window.clearTimeout(t);
  }, [left, running]);
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={6} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={EMERALD} strokeWidth={6} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - left / Math.max(1, seconds))} style={{ transition: 'stroke-dashoffset 1s linear' }} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[26px] font-bold tabular-nums">{Math.floor(Math.max(0, left) / 60)}:{String(Math.max(0, left) % 60).padStart(2, '0')}</span>
    </div>
  );
}

/** XP extra para o Atlas virtual (jogos, quiz). */
export function useAtlasXp() {
  const { rows, save, me } = useAtlas();
  return (n: number) => {
    const cur = rows('pet_virtual_state')[0];
    const now = new Date().toISOString();
    save('pet_virtual_state', { ...(cur ?? { id: uid(), happiness: 80, energy: 80, bonusXp: 0 }), bonusXp: (cur?.bonusXp ?? 0) + n, lastActionBy: me?.id ?? null, updatedAt: now } as never);
  };
}

/** Estado persistido em localStorage (preferências locais). */
export function useLocal<T>(key: string, def: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(def);
  useEffect(() => {
    try { const r = localStorage.getItem(key); if (r) setV(JSON.parse(r)); } catch { /* noop */ }
  }, [key]);
  return [v, (x: T) => { setV(x); try { localStorage.setItem(key, JSON.stringify(x)); } catch { /* noop */ } }];
}

export function Big({ emoji, title, hint }: { emoji: string; title: string; hint?: string }) {
  return (
    <div className="py-6 text-center">
      <motion.p initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }} className="text-[52px]">{emoji}</motion.p>
      <p className="mt-2 text-[20px] font-bold tracking-tight">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-xs text-[14px] muted">{hint}</p>}
    </div>
  );
}

export const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
