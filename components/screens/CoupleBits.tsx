'use client';

import { motion } from 'framer-motion';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { Avatar, Glass, Progress } from '@/components/ui/primitives';
import { CONTEXT_STATUS, HOUSE_TASKS, NEEDS, statusOf } from '@/lib/constants';
import type { Profile } from '@/lib/types';
import { addDays, cn, daysBetween, firstName, timeAgo } from '@/lib/utils';

/** Avatar com anel de progresso = bateria mental. */
export function RingAvatar({ p, size = 64 }: { p: Profile; size?: number }) {
  const r = size / 2 + 5;
  const c = 2 * Math.PI * r;
  const v = p.pending ? 0 : p.mentalBattery / 100;
  return (
    <div className="relative grid place-items-center" style={{ width: size + 16, height: size + 16 }}>
      <svg width={size + 16} height={size + 16} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2 + 8} cy={size / 2 + 8} r={r} fill="none" strokeWidth="3" className="stroke-black/10 dark:stroke-white/10" />
        <motion.circle
          cx={size / 2 + 8} cy={size / 2 + 8} r={r} fill="none" strokeWidth="3" strokeLinecap="round" className="stroke-black dark:stroke-white"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ type: 'spring', stiffness: 80, damping: 18 }}
        />
      </svg>
      <Avatar profile={p} size={size} />
    </div>
  );
}

/** Seletor de status de contexto de 1 toque + status do parceiro. */
export function StatusPicker({ compact = false }: { compact?: boolean }) {
  const { me, partner, setContextStatus } = useAtlas();
  if (!me || !partner) return null;
  const ps = statusOf(partner.contextStatus);
  return (
    <div>
      {!partner.pending && (
        <div className="mb-3 flex items-center gap-2 px-1 text-[13px]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="font-semibold">{firstName(partner.displayName)}:</span>
          <span className="muted">{ps ? `${ps.emoji} ${ps.short}` : 'sem status'}</span>
          {partner.contextUpdatedAt && <span className="ml-auto text-[11px] muted">{timeAgo(partner.contextUpdatedAt)}</span>}
        </div>
      )}
      <div className={cn('no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4', !compact && 'pb-1')}>
        {CONTEXT_STATUS.map((s) => {
          const on = me.contextStatus === s.value;
          return (
            <motion.button
              key={s.value}
              whileTap={{ scale: 0.92 }}
              onClick={() => setContextStatus(s.value)}
              className={cn('flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2.5 text-[13px] font-medium transition-colors', on ? 'bg-black text-white dark:bg-white dark:text-black' : 'glass')}
            >
              <span className="text-[15px]">{s.emoji}</span>
              {s.short}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/** "Preciso de…" — comunicação sem palavras. */
export function NeedsGrid() {
  const { sendNudge } = useAtlas();
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {NEEDS.map((n) => (
        <motion.button key={n.kind} whileTap={{ scale: 0.95 }} onClick={() => sendNudge(n.kind)} className="glass flex items-center gap-3 p-3.5 text-left">
          <span className="text-[24px]">{n.emoji}</span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold leading-tight">{n.short}</p>
            <p className="truncate text-[11px] muted">{n.hint}</p>
          </div>
        </motion.button>
      ))}
    </div>
  );
}

/** Acordos & termostato doméstico com barra de equilíbrio semanal. */
export function HouseholdCard() {
  const { rows, me, partner, logHousehold } = useAtlas();
  if (!me || !partner) return null;
  const weekAgo = addDays(new Date(), -7);
  const logs = rows('household_tasks').filter((l) => new Date(l.doneAt) >= weekAgo);
  const pts = (id: string) => logs.filter((l) => l.createdBy === id).reduce((s, l) => s + (HOUSE_TASKS.find((t) => t.value === l.task)?.points ?? 1), 0);
  const mine = pts(me.id);
  const theirs = partner.pending ? 0 : pts(partner.id);
  const total = mine + theirs || 1;
  const pctMe = Math.round((mine / total) * 100);
  const today = (task: string) => logs.filter((l) => l.task === task && daysBetween(new Date(l.doneAt), new Date()) === 0);

  return (
    <Glass className="p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[15px] font-semibold">Equilíbrio da semana</p>
        <p className="text-[12px] muted">{mine + theirs} pts</p>
      </div>
      <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/[0.08]">
        <motion.div className="bg-black dark:bg-white" initial={false} animate={{ width: `${pctMe}%` }} transition={{ type: 'spring', stiffness: 100, damping: 20 }} />
        <motion.div className="bg-neutral-400 dark:bg-neutral-600" initial={false} animate={{ width: `${100 - pctMe}%` }} transition={{ type: 'spring', stiffness: 100, damping: 20 }} />
      </div>
      <div className="mt-2 flex justify-between text-[12px] font-medium">
        <span>{pctMe}% Você</span>
        <span className={cn(Math.abs(pctMe - 50) > 20 && 'text-amber-500')}>{Math.abs(pctMe - 50) > 20 ? 'Desequilibrado' : 'Justo ⚖️'}</span>
        <span>{firstName(partner.displayName)} {100 - pctMe}%</span>
      </div>
      <div className="mt-4 space-y-1">
        {HOUSE_TASKS.map((t) => {
          const done = today(t.value);
          return (
            <div key={t.value} className="flex items-center gap-3 border-b py-2.5 last:border-0 hairline">
              <span className="text-[18px]">{t.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium">{t.label}</p>
                <p className="text-[11px] muted">{done.length ? `Feito hoje por ${done.map((d) => (d.createdBy === me.id ? 'você' : firstName(partner.displayName))).join(', ')}` : `${t.points} pt${t.points > 1 ? 's' : ''}`}</p>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => logHousehold(t.value)} className="h-8 rounded-full bg-black/[0.06] px-3 text-[12px] font-semibold dark:bg-white/[0.08]">
                Eu fiz hoje
              </motion.button>
            </div>
          );
        })}
      </div>
    </Glass>
  );
}

export function BatteryRow({ p }: { p: Profile }) {
  return (
    <div className="flex items-center gap-2">
      <Progress value={p.mentalBattery} className="flex-1" />
      <span className="text-[11px] font-semibold tabular-nums">{p.mentalBattery}%</span>
    </div>
  );
}
