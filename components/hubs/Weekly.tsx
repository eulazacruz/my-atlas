'use client';

import { AlertTriangle, ChevronRight, Share2, Sparkles } from 'lucide-react';
import { shareStory } from '@/lib/share';
import { useMemo } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI } from '@/components/providers/UIProvider';
import { Avatar, Glass, IconButton, PageHeader, Section } from '@/components/ui/primitives';
import { MOODS } from '@/lib/constants';
import type { Profile } from '@/lib/types';
import { addDays, firstName, money, ymd } from '@/lib/utils';
import { InsightsList } from './MindBody';

/** Resumo da semana montado pelo próprio app (sem IA externa). */
export function useWeekly() {
  const { rows, me, partner } = useAtlas();
  return useMemo(() => {
    if (!me || !partner) return null;
    const from = ymd(addDays(new Date(), -6));
    const inWeek = (d?: string | null) => !!d && d.slice(0, 10) >= from;
    const person = (p: Profile) => {
      const moods = rows('mood_logs').filter((m) => m.profileId === p.id && inWeek(m.createdAt));
      const top = moods.length ? Object.entries(moods.reduce<Record<string, number>>((a, m) => ((a[m.mood] = (a[m.mood] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1])[0][0] : null;
      const batt = moods.length ? Math.round(moods.reduce((s, m) => s + m.mentalBattery, 0) / moods.length) : null;
      const sleep = rows('sleep_logs').filter((s) => s.profileId === p.id && inWeek(s.wokeAt) && s.durationMin);
      const sleepAvg = sleep.length ? Math.round(sleep.reduce((s, x) => s + (x.durationMin ?? 0), 0) / sleep.length) : null;
      const reads = rows('bible_reads').filter((r) => r.profileId === p.id && inWeek(r.readAt)).length;
      const habits = rows('habit_logs').filter((h) => h.profileId === p.id && inWeek(h.logDate));
      const workouts = habits.filter((h) => h.workout).length + rows('entries').filter((e) => e.kind === 'workout' && e.createdBy === p.id && inWeek(e.date)).length;
      const prs = rows('entries').filter((e) => e.kind === 'priority' && e.createdBy === p.id && inWeek(e.date));
      const focus = rows('entries').filter((e) => e.kind === 'focus' && e.createdBy === p.id && inWeek(e.date)).reduce((s, e) => s + (e.data?.minutes ?? 0), 0);
      const tasks = rows('tasks').filter((t) => t.done && t.doneBy === p.id && inWeek(t.doneAt)).length;
      return { p, top, batt, sleepAvg, reads, workouts, prDone: prs.filter((x) => x.done).length, prTotal: prs.length, focus, tasks };
    };
    const a = person(me);
    const b = person(partner);
    const spent = rows('transactions').filter((t) => t.type === 'expense' && inWeek(t.occurredOn)).reduce((s, t) => s + t.amount, 0);
    const house = rows('household_tasks').filter((h) => inWeek(h.doneAt)).length;
    const answered = rows('prayers').filter((p) => p.answered && inWeek(p.answeredAt)).length;
    const walks = rows('pet_walks').filter((w) => inWeek(w.walkedAt)).length;
    const devs = rows('entries').filter((e) => e.kind === 'devotional' && inWeek(e.date)).length;
    const wins = rows('entries').filter((e) => e.kind === 'win' && inWeek(e.date)).map((e) => e.title).slice(0, 3);
    return { a, b, spent, house, answered, walks, devs, wins };
  }, [rows, me, partner]);
}

/** Alertas de atenção: padrões que merecem cuidado (só regras locais). */
export function useAlerts() {
  const { rows, me, partner } = useAtlas();
  return useMemo(() => {
    const out: { text: string; who: string }[] = [];
    if (!me || !partner || partner.pending) return out;
    const days3 = ymd(addDays(new Date(), -3));
    for (const p of [me, partner]) {
      const name = p.id === me.id ? 'Você' : firstName(p.displayName);
      const moods = rows('mood_logs').filter((m) => m.profileId === p.id && ymd(new Date(m.createdAt)) >= days3);
      if (moods.length >= 3 && moods.every((m) => m.mentalBattery < 40)) out.push({ who: p.id, text: `${name} está há 3 dias com a bateria mental baixa.` });
      const sleeps = rows('sleep_logs').filter((s) => s.profileId === p.id && s.wokeAt && ymd(new Date(s.wokeAt)) >= days3 && s.durationMin);
      if (sleeps.length >= 2 && sleeps.every((s) => (s.durationMin ?? 0) < 330)) out.push({ who: p.id, text: `${name} dormiu menos de 5h30 nas últimas noites.` });
      const anx = rows('entries').filter((e) => e.kind === 'sos' && e.createdBy === p.id && (e.date ?? '') >= ymd(addDays(new Date(), -7))).length;
      if (anx >= 2) out.push({ who: p.id, text: `${name} teve ${anx} momentos de ansiedade nesta semana. Vale uma conversa com calma.` });
    }
    const lastRead = rows('bible_reads').filter((r) => r.profileId === me.id).sort((a, b) => b.readAt.localeCompare(a.readAt))[0];
    if (rows('bible_plan')[0] && (!lastRead || ymd(new Date(lastRead.readAt)) < ymd(addDays(new Date(), -4)))) out.push({ who: me.id, text: 'Faz 4 dias ou mais que você não registra leitura bíblica.' });
    return out;
  }, [rows, me, partner]);
}

export function AlertsCard() {
  const alerts = useAlerts();
  const { navigate } = useUI();
  if (!alerts.length) return null;
  return (
    <Glass className="p-4" onClick={() => navigate('weekly')}>
      <div className="flex items-center gap-2"><AlertTriangle size={16} className="text-amber-500" /><p className="text-[14px] font-semibold">Atenção</p></div>
      <div className="mt-1.5 space-y-1">{alerts.slice(0, 2).map((a, i) => <p key={i} className="text-[13px] leading-snug muted">{a.text}</p>)}</div>
    </Glass>
  );
}

export function WeeklyScreen() {
  const w = useWeekly();
  const alerts = useAlerts();
  if (!w) return null;
  const sl = (m: number | null) => (m == null ? '—' : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`);
  type P = NonNullable<typeof w>['a'];
  const rowsDef: [string, (x: P) => string][] = [
    ['Humor mais comum', (x) => (x.top ? `${MOODS[x.top as keyof typeof MOODS]?.emoji ?? ''} ${MOODS[x.top as keyof typeof MOODS]?.label ?? x.top}` : '—')],
    ['Bateria média', (x) => (x.batt == null ? '—' : `${x.batt}%`)],
    ['Sono médio', (x) => sl(x.sleepAvg)],
    ['Capítulos lidos', (x) => String(x.reads)],
    ['Treinos', (x) => String(x.workouts)],
    ['Prioridades', (x) => (x.prTotal ? `${x.prDone}/${x.prTotal}` : '—')],
    ['Minutos de foco', (x) => String(x.focus)],
    ['Tarefas feitas', (x) => String(x.tasks)],
  ];
  const story = [
    w.a.reads + w.b.reads > 0 && `vocês leram ${w.a.reads + w.b.reads} capítulos da Bíblia`,
    w.devs > 0 && `escreveram ${w.devs} devocional(is)`,
    w.answered > 0 && `viram ${w.answered} oração(ões) respondida(s) 🙌`,
    w.house > 0 && `fizeram ${w.house} tarefas da casa`,
    w.walks > 0 && `levaram o Atlas para passear ${w.walks}x`,
    `gastaram ${money(w.spent)}`,
  ].filter(Boolean) as string[];
  return (
    <div>
      <PageHeader title="Resumo da semana" subtitle="Últimos 7 dias" back actions={<IconButton label="Compartilhar" onClick={() => shareStory({ kicker: 'Nossa semana', title: `${firstName(w.a.p.displayName)} & ${firstName(w.b.p.displayName)}`, body: '', stats: [{ v: String(w.a.reads + w.b.reads), l: 'capítulos lidos' }, { v: String(w.devs), l: 'devocionais' }, { v: String(w.house), l: 'tarefas da casa' }, { v: String(w.walks), l: 'passeios com o Atlas' }], foot: w.answered ? `${w.answered} oração(ões) respondida(s) 🙌` : 'Um passo de cada vez, juntos.', theme: 'emerald' })}><Share2 size={18} /></IconButton>} />
      <Section>
        <Glass className="p-5">
          <Sparkles size={18} />
          <p className="mt-2 text-[16px] leading-relaxed">Nesta semana {story.slice(0, -1).join(', ')}{story.length > 1 ? ' e ' : ''}{story[story.length - 1]}.</p>
          {w.wins.length > 0 && <p className="mt-2 text-[13.5px] muted">Conquistas: {w.wins.join(' · ')}</p>}
        </Glass>
      </Section>
      {alerts.length > 0 && (
        <Section title="Atenção">
          <div className="space-y-2">{alerts.map((a, i) => <Glass key={i} className="flex gap-3 p-4"><AlertTriangle size={18} className="shrink-0 text-amber-500" /><p className="text-[14px] leading-snug">{a.text}</p></Glass>)}</div>
        </Section>
      )}
      <Section title="Lado a lado">
        <Glass className="p-4">
          <div className="mb-2 flex items-center justify-end gap-6">
            <Avatar profile={w.a.p} size={26} />
            <Avatar profile={w.b.p} size={26} />
          </div>
          {rowsDef.map(([l, f]) => (
            <div key={l} className="flex items-center justify-between border-b py-2.5 last:border-0 hairline">
              <span className="text-[13.5px]">{l}</span>
              <span className="flex gap-6 text-right text-[13.5px] font-semibold tabular-nums"><span className="w-14">{f(w.a)}</span><span className="w-14" style={{ color: '#10B981' }}>{f(w.b)}</span></span>
            </div>
          ))}
        </Glass>
      </Section>
      <Section title="Descobertas"><InsightsList /></Section>
    </div>
  );
}
export function WeeklyTeaser() {
  const { navigate } = useUI();
  const w = useWeekly();
  if (!w) return null;
  return (
    <Glass className="flex items-center gap-3 p-4" onClick={() => navigate('weekly')}>
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-black text-white dark:bg-white dark:text-black"><Sparkles size={18} /></span>
      <div className="min-w-0 flex-1"><p className="text-[15px] font-semibold">Resumo da semana</p><p className="truncate text-[12.5px] muted">{w.a.reads + w.b.reads} capítulos · {w.house} tarefas da casa · {money(w.spent)} gastos</p></div>
      <ChevronRight size={17} className="muted" />
    </Glass>
  );
}
