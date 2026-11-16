'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CalendarDays, Check, CheckSquare, Droplets, Flower2, Heart, PawPrint, RefreshCw, ShoppingBag, Smile, Sparkles, Wallet, Wind, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ACCENT } from '@/lib/constants';
import type { IslandKind, SyncState } from '@/lib/types';
import { cn, initials } from '@/lib/utils';
import { useIsland } from './IslandProvider';

const SPRING = { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 } as const;
const IDLE_H = 34;

const KIND: Record<IslandKind, { icon: typeof Smile; label: string; color?: string }> = {
  mood: { icon: Smile, label: 'Humor' },
  expense: { icon: Wallet, label: 'Carteira' },
  water: { icon: Droplets, label: 'Hidratação', color: ACCENT.water },
  breathing: { icon: Wind, label: 'Respiração' },
  nudge: { icon: Heart, label: 'Nós dois' },
  pet: { icon: PawPrint, label: 'Atlas' },
  sync: { icon: RefreshCw, label: 'My Atlas' },
  success: { icon: Check, label: 'Pronto' },
  agenda: { icon: CalendarDays, label: 'Agenda' },
  task: { icon: CheckSquare, label: 'Tarefas' },
  cycle: { icon: Flower2, label: 'Ciclo', color: ACCENT.cycle },
  shopping: { icon: ShoppingBag, label: 'Compras' },
  prayer: { icon: Sparkles, label: 'Oração' },
};

const SYNC: Record<SyncState, { label: string; dot: string }> = {
  demo: { label: 'Demo', dot: '#a3a3a3' },
  syncing: { label: 'Sync…', dot: '#ffffff' },
  synced: { label: 'Sync', dot: '#ffffff' },
  offline: { label: 'Offline', dot: ACCENT.negative },
};

/** Lente simulada no centro — fica exatamente sobre o furo da câmera frontal. */
function Lens() {
  return (
    <span className="relative block h-[11px] w-[11px] shrink-0 rounded-full bg-[#06060a] ring-1 ring-white/[0.07]">
      <span className="absolute left-[3px] top-[2.5px] h-[3px] w-[3px] rounded-full bg-white/20" />
    </span>
  );
}

function useMeasuredHeight() {
  const [h, setH] = useState(0);
  const ro = useRef<ResizeObserver | null>(null);
  const ref = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    ro.current?.disconnect();
    setH(node.offsetHeight);
    ro.current = new ResizeObserver(() => setH(node.offsetHeight));
    ro.current.observe(node);
  }, []);
  return [ref, h] as const;
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export function AtlasIsland() {
  const { current, dismiss, sync, breathingStartedAt, history, queueSize } = useIsland();
  const [peek, setPeek] = useState(false);
  const [, tick] = useState(0);
  const [measureRef, contentH] = useMeasuredHeight();
  const [vw, setVw] = useState(390);

  useEffect(() => {
    const on = () => setVw(window.innerWidth);
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  useEffect(() => {
    if (!current) return;
    setPeek(false);
    const t = window.setTimeout(dismiss, current.duration ?? 5500);
    return () => window.clearTimeout(t);
  }, [current, dismiss]);
  useEffect(() => {
    if (!peek) return;
    const t = window.setTimeout(() => setPeek(false), 4500);
    return () => window.clearTimeout(t);
  }, [peek]);
  useEffect(() => {
    if (!breathingStartedAt) return;
    const i = window.setInterval(() => tick((x) => x + 1), 1000);
    return () => window.clearInterval(i);
  }, [breathingStartedAt]);

  const expanded = Boolean(current) || peek;
  const breathing = Boolean(breathingStartedAt);
  const meta = current ? KIND[current.kind] : null;
  const glow = meta?.color ?? '#ffffff';
  const expandedW = Math.min(vw * 0.92, 384);
  const width = expanded ? expandedW : breathing ? 156 : 122;
  const height = expanded ? Math.max(contentH + 3, 64) : IDLE_H;
  const radius = expanded ? 30 : IDLE_H / 2;
  const Icon = meta?.icon ?? Bell;

  return (
    <div className="pointer-events-none fixed left-1/2 top-1.5 z-50 -translate-x-1/2" style={{ marginTop: 'env(safe-area-inset-top)' }} aria-live="polite">
      <motion.div
        role="status"
        className="pointer-events-auto relative cursor-pointer select-none overflow-hidden bg-black text-white"
        initial={false}
        animate={{
          width,
          height,
          borderRadius: radius,
          boxShadow: expanded
            ? `0 0 0 1px ${glow}33, 0 0 26px 0 ${glow}2e, 0 20px 50px -14px rgba(0,0,0,0.9)`
            : '0 0 0 1px rgba(255,255,255,0.07), 0 6px 18px -6px rgba(0,0,0,0.6)',
        }}
        transition={SPRING}
        drag={expanded ? 'y' : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.35, bottom: 0.08 }}
        onDragEnd={(_, info) => {
          if (info.offset.y < -18) {
            if (current) dismiss();
            setPeek(false);
          }
        }}
        onClick={() => !current && setPeek((p) => !p)}
      >
        <motion.div
          aria-hidden
          className="absolute left-1/2 top-1/2 aspect-square w-[220%] -translate-x-1/2 -translate-y-1/2 animate-island-spin"
          style={{ background: `conic-gradient(from 0deg, transparent 0deg, ${glow}cc 40deg, transparent 100deg, transparent 180deg, ${glow}66 230deg, transparent 290deg)` }}
          animate={{ opacity: expanded ? 1 : 0 }}
          transition={{ duration: 0.35 }}
        />
        <motion.div aria-hidden className="absolute inset-[1.5px] bg-black" animate={{ borderRadius: Math.max(radius - 1.5, 0) }} transition={SPRING} />

        <AnimatePresence initial={false} mode="popLayout">
          {expanded ? (
            <motion.div
              key={current?.id ?? 'peek'}
              className="relative"
              style={{ width: expandedW }}
              initial={{ opacity: 0, filter: 'blur(8px)', scale: 0.94, y: -6 }}
              animate={{ opacity: 1, filter: 'blur(0px)', scale: 1, y: 0 }}
              exit={{ opacity: 0, filter: 'blur(8px)', scale: 0.94, y: -6 }}
              transition={{ ...SPRING, opacity: { duration: 0.18 } }}
            >
              <div ref={measureRef} className="px-3.5 pb-3.5 pt-[5px]">
                <div className="flex h-[30px] items-center justify-between">
                  <div className="flex w-[40%] items-center gap-2">
                    {current?.avatar ? (
                      <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-white text-[11px] font-bold text-black">
                        {current.avatar.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={current.avatar.url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initials(current.avatar.name)
                        )}
                      </span>
                    ) : (
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10" style={{ color: meta?.color ?? '#fff' }}>
                        <Icon size={14} strokeWidth={2.4} />
                      </span>
                    )}
                    <span className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">{meta?.label ?? 'Atlas Island'}</span>
                  </div>
                  <Lens />
                  <div className="flex w-[40%] items-center justify-end gap-2">
                    <span className="text-[11px] text-white/40">{queueSize > 1 ? `+${queueSize - 1}` : 'agora'}</span>
                    <button
                      aria-label="Fechar"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (current) dismiss();
                        setPeek(false);
                      }}
                      className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-white/70 active:scale-90"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {current ? (
                  <div className="mt-2 px-0.5">
                    <p className="text-[15px] font-semibold leading-snug tracking-[-0.01em]">{current.title}</p>
                    {current.subtitle && <p className="mt-0.5 text-[13px] leading-snug text-white/55">{current.subtitle}</p>}
                    {current.actions && current.actions.length > 0 && (
                      <div className="mt-3 flex gap-2">
                        {current.actions.map((a) => (
                          <button
                            key={a.label}
                            onClick={(e) => {
                              e.stopPropagation();
                              a.onClick?.();
                              dismiss();
                            }}
                            className={cn('h-9 flex-1 rounded-full text-[13px] font-semibold transition active:scale-95', a.primary ? 'bg-white text-black' : 'bg-white/10 text-white/85')}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 space-y-1.5 px-0.5">
                    <div className="flex items-center gap-2 text-[13px]">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: SYNC[sync].dot }} />
                      <span className="font-semibold">
                        {sync === 'demo' ? 'Modo demonstração' : sync === 'synced' ? 'Sincronizado com seu par' : sync === 'syncing' ? 'Sincronizando…' : 'Sem conexão'}
                      </span>
                      {breathing && <span className="ml-auto text-white/60">Respirando · {fmt(Date.now() - (breathingStartedAt ?? 0))}</span>}
                    </div>
                    {history.length === 0 ? (
                      <p className="text-[12px] text-white/45">Nenhum alerta ainda.</p>
                    ) : (
                      history.slice(0, 3).map((h) => (
                        <p key={h.id} className="truncate text-[12px] text-white/50">
                          · {h.title}
                        </p>
                      ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              className="absolute inset-0 flex items-center justify-between px-3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              {breathing ? (
                <motion.span animate={{ scale: [0.8, 1.15, 1.15, 0.8, 0.8] }} transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', times: [0, 0.25, 0.5, 0.75, 1] }}>
                  <Wind size={14} strokeWidth={2.6} />
                </motion.span>
              ) : (
                <span className="relative flex h-2 w-2">
                  {sync === 'syncing' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />}
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: SYNC[sync].dot }} />
                </span>
              )}
              <Lens />
              <span className="text-[11px] font-semibold tabular-nums text-white/60">{breathing ? fmt(Date.now() - (breathingStartedAt ?? 0)) : SYNC[sync].label}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
