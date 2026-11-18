'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useIsland } from '@/components/island/IslandProvider';
import { useUI } from '@/components/providers/UIProvider';
import { vibrate } from '@/lib/utils';

const PHASES = [
  { label: 'Inspire', hint: 'pelo nariz, devagar' },
  { label: 'Segure', hint: 'pulmões cheios' },
  { label: 'Expire', hint: 'pela boca, soltando' },
  { label: 'Segure', hint: 'pulmões vazios' },
];
const S = 4;
const SIZE = 220;

export function BoxBreathing() {
  const { breathingOpen, setBreathingOpen } = useUI();
  const island = useIsland();
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);
  const cyclesRef = useRef(0);

  useEffect(() => {
    if (!breathingOpen) {
      if (startRef.current) {
        island.setBreathingStartedAt(null);
        if (cyclesRef.current >= 1)
          island.push({ kind: 'breathing', title: `Reset mental concluído · ${cyclesRef.current} ${cyclesRef.current === 1 ? 'ciclo' : 'ciclos'}`, subtitle: 'Volte quando precisar. 🕊️', duration: 4000 });
        startRef.current = 0;
      }
      return;
    }
    startRef.current = Date.now();
    setElapsed(0);
    island.setBreathingStartedAt(startRef.current);
    const i = window.setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 250);
    return () => window.clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breathingOpen]);

  const phase = Math.floor(elapsed / S) % 4;
  const sec = S - (elapsed % S);
  const cycles = Math.floor(elapsed / (S * 4));
  cyclesRef.current = cycles;
  useEffect(() => {
    if (breathingOpen && elapsed > 0 && elapsed % S === 0) vibrate(phase === 0 ? [20, 60, 20] : 15);
  }, [phase, breathingOpen, elapsed]);

  return (
    <AnimatePresence>
      {breathingOpen && (
        <motion.div className="fixed inset-0 z-[45] flex flex-col items-center justify-center bg-[#f2f2f4]/85 backdrop-blur-3xl dark:bg-black/85" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <p className="label mb-2">Reset mental · Box breathing</p>
          <p className="mb-10 text-[14px] muted">Ciclo {cycles + 1} · 4 segundos em cada lado</p>
          <div className="relative" style={{ width: SIZE, height: SIZE }}>
            <div className="absolute inset-0 rounded-[40px] border border-black/15 dark:border-white/15" />
            <motion.div
              className="absolute inset-8 rounded-[30px] bg-black/[0.06] dark:bg-white/[0.08]"
              animate={{ scale: [0.55, 1, 1, 0.55, 0.55] }}
              transition={{ duration: S * 4, repeat: Infinity, ease: 'easeInOut', times: [0, 0.25, 0.5, 0.75, 1] }}
            />
            <motion.span
              className="absolute -left-2 -top-2 h-4 w-4 rounded-full bg-black dark:bg-white"
              style={{ boxShadow: '0 0 20px 4px rgba(255,255,255,0.35)' }}
              animate={{ x: [0, SIZE, SIZE, 0, 0], y: [0, 0, SIZE, SIZE, 0] }}
              transition={{ duration: S * 4, repeat: Infinity, ease: 'linear', times: [0, 0.25, 0.5, 0.75, 1] }}
            />
            <div className="absolute inset-0 grid place-items-center text-center">
              <AnimatePresence mode="wait">
                <motion.div key={`${phase}-${cycles}`} initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }} transition={{ duration: 0.35 }}>
                  <p className="text-[30px] font-semibold tracking-tight">{PHASES[phase].label}</p>
                  <p className="text-[14px] muted">{PHASES[phase].hint}</p>
                  <p className="mt-2 text-[42px] font-bold tabular-nums">{sec}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <p className="mt-12 max-w-xs text-center text-[13px] muted">Faça pelo menos 4 ciclos. O timer continua na ilha de notificações.</p>
          <button onClick={() => setBreathingOpen(false)} className="mt-6 h-12 rounded-full bg-black px-8 text-[15px] font-semibold text-white dark:bg-white dark:text-black">
            Concluir
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
