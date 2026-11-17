'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Coffee, Moon, Sunrise } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
const AreaMini = dynamic(() => import('@/components/ui/charts'), { ssr: false });
import { useAtlas } from '@/components/providers/AtlasProvider';
import { Button, Glass } from '@/components/ui/primitives';
import { activeSleep, caffeineAt, caffeineCurve, fmtDuration, lastNight } from '@/lib/body';
import { CAFFEINE_PRESETS, CAFFEINE_SLEEP_LIMIT } from '@/lib/constants';
import { addDays, cn, hhmm, WEEK_LETTERS, ymd } from '@/lib/utils';

export function SleepCard() {
  const { rows, me, startSleep } = useAtlas();
  if (!me) return null;
  const logs = rows('sleep_logs');
  const active = activeSleep(logs, me.id);
  const last = lastNight(logs, me.id);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), i - 6);
    const l = logs.find((x) => x.profileId === me.id && x.wokeAt && ymd(new Date(x.wokeAt)) === ymd(d));
    return { d, min: l?.durationMin ?? 0 };
  });
  const avg = week.filter((w) => w.min).reduce((s, w, _, a) => s + w.min / a.length, 0);
  return (
    <Glass className="p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-black text-white dark:bg-white dark:text-black">
          <Moon size={19} />
        </span>
        <div className="flex-1">
          <p className="text-[12px] muted">Última noite</p>
          <p className="text-[20px] font-bold tabular-nums tracking-tight">{last?.durationMin ? fmtDuration(last.durationMin) : '—'}</p>
        </div>
        <div className="text-right">
          <p className="text-[12px] muted">Média 7d</p>
          <p className="text-[15px] font-semibold tabular-nums">{avg ? fmtDuration(avg) : '—'}</p>
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between gap-1.5 px-1">
        {week.map((w) => (
          <div key={ymd(w.d)} className="flex flex-col items-center gap-1">
            <div className="relative h-14 w-6 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.07]">
              <motion.div className="absolute inset-x-0 bottom-0 rounded-full" style={{ background: w.min >= 420 ? '#10B981' : 'currentColor' }} initial={{ height: 0 }} animate={{ height: `${Math.min(100, (w.min / 540) * 100)}%` }} />
            </div>
            <span className="text-[10px] muted">{WEEK_LETTERS[w.d.getDay()]}</span>
          </div>
        ))}
      </div>
      <Button variant="primary" className="mt-4 w-full" onClick={startSleep} disabled={!!active}>
        <Moon size={15} /> {active ? `Dormindo desde ${hhmm(active.sleptAt)}` : 'Iniciar sono 🌙'}
      </Button>
      <p className="mt-2 text-center text-[11px] muted">Ao desbloquear o celular de manhã, o app detecta que você acordou.</p>
    </Glass>
  );
}

/** Overlay escuro e relaxante enquanto o sono está ativo. */
export function SleepOverlay() {
  const { rows, me, finishSleep } = useAtlas();
  const [, tick] = useState(0);
  const [hidden, setHidden] = useState(false);
  const active = me ? activeSleep(rows('sleep_logs'), me.id) : undefined;
  useEffect(() => {
    if (!active) return;
    setHidden(false);
    const i = window.setInterval(() => tick((x) => x + 1), 30_000);
    return () => window.clearInterval(i);
  }, [active]);
  const min = active ? (Date.now() - new Date(active.sleptAt).getTime()) / 60_000 : 0;
  return (
    <AnimatePresence>
      {active && !hidden && (
        <motion.div className="fixed inset-0 z-[44] flex flex-col items-center justify-center bg-black text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 8, repeat: Infinity }} />
          <Moon size={34} className="relative opacity-70" />
          <p className="relative mt-5 text-[13px] uppercase tracking-[0.2em] text-white/40">Modo sono</p>
          <p className="relative mt-2 text-[54px] font-light tabular-nums tracking-tight">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          <p className="relative text-[14px] text-white/45">dormindo há {fmtDuration(min)}</p>
          <div className="relative mt-12 flex gap-2">
            <button onClick={() => finishSleep(true)} className="flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-black">
              <Sunrise size={17} /> Acordei
            </button>
            <button onClick={() => setHidden(true)} className="h-12 rounded-full bg-white/10 px-5 text-[14px] font-medium text-white/70">
              Minimizar
            </button>
          </div>
          <button onClick={() => finishSleep(false)} className="relative mt-6 text-[13px] text-white/35">
            Cancelar registro
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function CaffeineCard() {
  const { rows, me, addCaffeine, remove } = useAtlas();
  const { resolvedTheme } = useTheme();
  if (!me) return null;
  const logs = rows('caffeine_logs').filter((c) => c.profileId === me.id);
  const recent = logs.filter((c) => Date.now() - new Date(c.takenAt).getTime() < 24 * 3600_000).sort((a, b) => b.takenAt.localeCompare(a.takenAt));
  const now = Math.round(caffeineAt(logs, new Date()));
  const at22 = Math.round(caffeineAt(logs, new Date(new Date().setHours(22, 0, 0, 0))));
  const curve = caffeineCurve(logs);
  const bad = at22 >= CAFFEINE_SLEEP_LIMIT;
  const fg = resolvedTheme === 'light' ? '#000' : '#fff';
  return (
    <Glass className="p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-black/[0.06] dark:bg-white/[0.08]">
          <Coffee size={19} />
        </span>
        <div className="flex-1">
          <p className="text-[12px] muted">Cafeína ativa agora</p>
          <p className="text-[20px] font-bold tabular-nums tracking-tight">{now} mg</p>
        </div>
        <div className="text-right">
          <p className="text-[12px] muted">Às 22h</p>
          <p className={cn('text-[15px] font-semibold tabular-nums', bad && 'text-amber-500')}>{at22} mg</p>
        </div>
      </div>
      <div className="mt-3 h-28">
        <AreaMini data={curve} x="t" y="mg" stroke={fg} gradient light={resolvedTheme === 'light'} interval={5} left={-32} refY={CAFFEINE_SLEEP_LIMIT} refX="22:00" unit={['mg', 'Ativa']} />
      </div>
      <p className={cn('mt-1 text-[12px]', bad ? 'text-amber-500' : 'muted')}>
        {bad ? `⚠️ ${at22} mg às 22h podem atrapalhar seu sono. Evite mais cafeína hoje.` : 'Na hora de dormir a cafeína já estará baixa. 👌'}
      </p>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {CAFFEINE_PRESETS.map((p) => (
          <motion.button key={p.kind} whileTap={{ scale: 0.92 }} onClick={() => addCaffeine(p.mg, p.kind)} className="glass-thin shrink-0 px-3 py-2 text-left !rounded-2xl">
            <p className="text-[13px] font-semibold">+1 {p.kind}</p>
            <p className="text-[11px] muted">{p.mg} mg</p>
          </motion.button>
        ))}
      </div>
      {recent.length > 0 && (
        <p className="mt-3 text-[11px] muted">
          Hoje: {recent.map((r) => `${r.kind} ${hhmm(r.takenAt)}`).join(' · ')}{' '}
          <button className="underline" onClick={() => remove('caffeine_logs', recent[0].id)}>desfazer último</button>
        </p>
      )}
    </Glass>
  );
}
