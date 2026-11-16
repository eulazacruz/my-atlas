'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, CheckSquare, ChevronDown, MapPin, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI } from '@/components/providers/UIProvider';
import { useCycle } from '@/components/shell/useCycle';
import { Dot, MonthCalendar } from '@/components/ui/MonthCalendar';
import { Avatar, CheckCircle, Chip, Empty, IconButton, PageHeader, Section, Segmented } from '@/components/ui/primitives';
import { ACCENT, DATE_KINDS } from '@/lib/constants';
import { dayKind } from '@/lib/cycle';
import type { ExternalEvent, Task } from '@/lib/types';
import { demoExternal, useExternalEvents } from '@/lib/calendar';
import { addDays, cn, firstName, fmtDay, hhmm, nextOccurrence, parseYmd, relDay, uid, ymd } from '@/lib/utils';

export function AgendaScreen() {
  const [seg, setSeg] = useState<'agenda' | 'tasks'>('agenda');
  const { openSheet } = useUI();
  return (
    <div>
      <PageHeader
        title={seg === 'agenda' ? 'Agenda' : 'Tarefas'}
        subtitle="Do casal"
        actions={
          <IconButton label="Adicionar" onClick={() => (seg === 'agenda' ? openSheet('event', { date: ymd() }) : openSheet('task'))}>
            <Plus size={20} />
          </IconButton>
        }
      />
      <div className="mb-6">
        <Segmented id="agenda-seg" value={seg} onChange={setSeg} options={[{ value: 'agenda', label: 'Agenda' }, { value: 'tasks', label: 'Tarefas' }]} />
      </div>
      {seg === 'agenda' ? <AgendaView /> : <TasksView />}
    </div>
  );
}

function GRow({ e, compact }: { e: ExternalEvent; compact?: boolean }) {
  const { me, nameOf } = useAtlas();
  const d = new Date(e.start);
  return (
    <div className="flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-0 hairline">
      {compact ? (
        <div className="w-12 shrink-0 text-center">
          <p className="text-[11px] uppercase muted">{fmtDay(d, { weekday: 'short' })}</p>
          <p className="text-[18px] font-bold leading-tight">{d.getDate()}</p>
        </div>
      ) : (
        <div className="w-12 shrink-0 text-[13px] font-semibold tabular-nums">
          {e.allDay ? 'Dia' : hhmm(e.start)}
          {e.end && !e.allDay && <p className="text-[11px] font-normal muted">{hhmm(e.end)}</p>}
        </div>
      )}
      <span className="h-9 w-[3px] shrink-0 rounded-full" style={{ background: e.owner === me?.id ? '#4285F4' : '#10B981' }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium">{e.title}</p>
        <p className="flex items-center gap-1 truncate text-[12px] muted">
          <span className="rounded bg-black/[0.06] px-1 text-[10px] font-bold dark:bg-white/10">Google</span>
          {compact && !e.allDay ? `${hhmm(e.start)} · ` : ''}
          {e.location ? `${e.location} · ` : ''}
          {e.owner === me?.id ? 'Sua agenda' : `Agenda de ${firstName(nameOf(e.owner))}`}
        </p>
      </div>
    </div>
  );
}

function AgendaView() {
  const { rows, me, partner, mode } = useAtlas();
  const ext = useExternalEvents(mode !== 'demo');
  const gEvents = useMemo(() => (mode === 'demo' && me && partner ? demoExternal(me.id, partner.id) : ext.events), [mode, me, partner, ext.events]);
  const { openSheet } = useUI();
  const cycle = useCycle();
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(ymd());
  const events = rows('events');
  const special = rows('special_dates');
  const tasks = rows('tasks');

  const byDay = useMemo(() => {
    const m = new Map<string, number>();
    events.forEach((e) => m.set(ymd(new Date(e.startsAt)), (m.get(ymd(new Date(e.startsAt))) ?? 0) + 1));
    gEvents.forEach((e) => m.set(ymd(new Date(e.start)), (m.get(ymd(new Date(e.start))) ?? 0) + 1));
    return m;
  }, [events, gEvents]);
  const dayG = gEvents.filter((e) => ymd(new Date(e.start)) === selected);
  const upG = gEvents.filter((e) => { const d = new Date(e.start); return d > new Date() && d < addDays(new Date(), 7) && ymd(d) !== selected; }).slice(0, 8);
  const specialOn = (d: string) => special.filter((s) => (s.recurring ? s.date.slice(5) === d.slice(5) && d >= s.date : s.date === d));

  const dayEvents = events.filter((e) => ymd(new Date(e.startsAt)) === selected).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const dayTasks = tasks.filter((t) => t.dueDate === selected);
  const daySpecial = specialOn(selected);
  const ck = cycle.active ? dayKind(selected, cycle.days, cycle.info) : null;

  const upcoming = events
    .filter((e) => {
      const d = new Date(e.startsAt);
      return d > addDays(new Date(), 0) && d < addDays(new Date(), 14) && ymd(d) !== selected;
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 6);

  return (
    <>
      <Section>
        <MonthCalendar
          month={month}
          onMonth={setMonth}
          selected={selected}
          onSelect={setSelected}
          decorate={(d) => {
            const k = cycle.active ? dayKind(d, cycle.days, cycle.info) : null;
            const n = byDay.get(d) ?? 0;
            return {
              style: k === 'period' ? { background: `${ACCENT.cycle}33` } : k === 'predicted' ? { boxShadow: `inset 0 0 0 1px ${ACCENT.cycle}88` } : undefined,
              marks: (
                <>
                  {Array.from({ length: Math.min(n, 3) }).map((_, i) => <Dot key={i} />)}
                  {specialOn(d).length > 0 && <Dot color={ACCENT.warn} />}
                </>
              ),
            };
          }}
        />
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11px] muted">
          <span className="flex items-center gap-1"><Dot /> Evento</span>
          <span className="flex items-center gap-1"><Dot color={ACCENT.warn} /> Data especial</span>
          {cycle.active && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: `${ACCENT.cycle}66` }} /> Menstruação</span>}
        </div>
      </Section>

      <Section title={relDay(selected) === fmtDay(selected) ? fmtDay(selected, { weekday: 'long', day: 'numeric', month: 'long' }) : relDay(selected)}>
        <div className="glass overflow-hidden">
          {daySpecial.map((s) => (
            <div key={s.id} className="flex items-center gap-3 border-b px-4 py-3 hairline">
              <span className="text-[18px]">{DATE_KINDS.find((k) => k.value === s.kind)?.emoji}</span>
              <p className="text-[15px] font-medium">{s.title}</p>
            </div>
          ))}
          {ck && (
            <div className="flex items-center gap-3 border-b px-4 py-3 hairline">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: ACCENT.cycle }} />
              <p className="text-[14px]">
                {ck === 'period' ? 'Menstruação' : ck === 'predicted' ? 'Menstruação prevista' : ck === 'ovulation' ? 'Ovulação prevista' : 'Janela fértil'}
                {!cycle.isOwner && cycle.owner ? ` · ${firstName(cycle.owner.displayName)}` : ''}
              </p>
            </div>
          )}
          {dayEvents.map((e) => (
            <button key={e.id} onClick={() => openSheet('event', { event: e })} className="flex w-full items-center gap-3 border-b px-4 py-3 text-left hairline last:border-0">
              <div className="w-12 shrink-0 text-[13px] font-semibold tabular-nums">
                {e.allDay ? 'Dia' : hhmm(e.startsAt)}
                {e.endsAt && !e.allDay && <p className="text-[11px] font-normal muted">{hhmm(e.endsAt)}</p>}
              </div>
              <span className="h-9 w-[3px] shrink-0 rounded-full bg-black dark:bg-white" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">{e.title}</p>
                <p className="flex items-center gap-1 truncate text-[12px] muted">
                  {e.location && (
                    <>
                      <MapPin size={11} /> {e.location} ·{' '}
                    </>
                  )}
                  {e.owner ? (e.owner === me?.id ? 'Seu' : 'Do seu par') : 'Do casal'}
                </p>
              </div>
            </button>
          ))}
          {dayG.map((e) => <GRow key={e.id} e={e} />)}
          {dayTasks.map((t) => (
            <TaskRow key={t.id} t={t} />
          ))}
          {!dayEvents.length && !dayG.length && !dayTasks.length && !daySpecial.length && !ck && <p className="px-4 py-5 text-[14px] muted">Nada marcado neste dia.</p>}
          <button onClick={() => openSheet('event', { date: selected })} className="flex w-full items-center gap-2 border-t px-4 py-3 text-[14px] font-medium muted hairline">
            <Plus size={16} /> Adicionar evento
          </button>
        </div>
      </Section>

      {upG.length > 0 && (
        <Section title="Google Agenda · próximos 7 dias" action={<button onClick={() => window.dispatchEvent(new CustomEvent('atlas:navigate', { detail: 'settings' }))} className="text-[13px] font-medium muted">Ajustar</button>}>
          <div className="glass overflow-hidden">{upG.map((e) => <GRow key={e.id} e={e} compact />)}</div>
        </Section>
      )}

      {upcoming.length > 0 && (
        <Section title="Próximos 14 dias">
          <div className="glass overflow-hidden">
            {upcoming.map((e) => (
              <button key={e.id} onClick={() => openSheet('event', { event: e })} className="flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-0 hairline">
                <div className="w-12 shrink-0 text-center">
                  <p className="text-[11px] uppercase muted">{fmtDay(new Date(e.startsAt), { weekday: 'short' })}</p>
                  <p className="text-[18px] font-bold leading-tight">{new Date(e.startsAt).getDate()}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{e.title}</p>
                  <p className="text-[12px] muted">{e.allDay ? 'Dia todo' : hhmm(e.startsAt)}{e.location ? ` · ${e.location}` : ''}</p>
                </div>
              </button>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

function TaskRow({ t }: { t: Task }) {
  const { patch, me, rows } = useAtlas();
  const { openSheet } = useUI();
  const assignee = rows('profiles').find((p) => p.id === t.assignee);
  const overdue = !t.done && t.dueDate && t.dueDate < ymd();
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-3 border-b px-4 py-3 last:border-0 hairline">
      <CheckCircle checked={t.done} onClick={() => patch('tasks', t.id, { done: !t.done, doneAt: t.done ? null : new Date().toISOString(), doneBy: t.done ? null : me?.id })} />
      <button onClick={() => openSheet('task', { task: t })} className="min-w-0 flex-1 text-left">
        <p className={cn('truncate text-[15px]', t.done && 'line-through muted')}>
          {t.priority === 2 && <span className="mr-1 font-bold">!!</span>}
          {t.priority === 1 && <span className="mr-1 font-bold">!</span>}
          {t.title}
        </p>
        <p className={cn('text-[12px] muted', overdue && '!text-red-500')}>
          {t.dueDate ? relDay(t.dueDate) : 'Sem data'}
          {t.notes ? ' · ' + t.notes.slice(0, 40) : ''}
        </p>
      </button>
      {assignee ? <Avatar profile={assignee} size={24} /> : <span className="text-[11px] font-medium muted">Nós</span>}
    </motion.div>
  );
}

function TasksView() {
  const { rows, me, partner, save } = useAtlas();
  const [filter, setFilter] = useState<'all' | 'me' | 'partner' | 'us'>('all');
  const [title, setTitle] = useState('');
  const [showDone, setShowDone] = useState(false);
  const today = ymd();

  const all = rows('tasks').filter((t) =>
    filter === 'all' ? true : filter === 'me' ? t.assignee === me?.id : filter === 'partner' ? t.assignee === partner?.id : !t.assignee,
  );
  const open = all.filter((t) => !t.done).sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || b.priority - a.priority);
  const groups = [
    { title: 'Atrasadas', items: open.filter((t) => t.dueDate && t.dueDate < today) },
    { title: 'Hoje', items: open.filter((t) => t.dueDate === today) },
    { title: 'Próximas', items: open.filter((t) => t.dueDate && t.dueDate > today) },
    { title: 'Sem data', items: open.filter((t) => !t.dueDate) },
  ].filter((g) => g.items.length);
  const done = all.filter((t) => t.done).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''));

  const add = () => {
    if (!title.trim() || !me) return;
    save('tasks', { id: uid(), createdBy: me.id, assignee: filter === 'me' ? me.id : filter === 'partner' && partner && !partner.pending ? partner.id : null, title: title.trim(), dueDate: null, priority: 0, done: false, createdAt: new Date().toISOString() });
    setTitle('');
  };

  return (
    <>
      <div className="glass mb-4 flex items-center gap-2 p-2 pl-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Nova tarefa rápida…" className="flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-black/35 dark:placeholder:text-white/30" />
        <button onClick={add} disabled={!title.trim()} className="grid h-9 w-9 place-items-center rounded-full bg-black text-white disabled:opacity-30 dark:bg-white dark:text-black">
          <Plus size={18} />
        </button>
      </div>
      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>Todas</Chip>
        <Chip active={filter === 'me'} onClick={() => setFilter('me')}>Minhas</Chip>
        {partner && !partner.pending && <Chip active={filter === 'partner'} onClick={() => setFilter('partner')}>{firstName(partner.displayName)}</Chip>}
        <Chip active={filter === 'us'} onClick={() => setFilter('us')}>Nossas</Chip>
      </div>
      {groups.length === 0 && <Empty icon={<CheckSquare size={22} />} title="Tudo em dia" hint="Nenhuma tarefa pendente aqui." />}
      {groups.map((g) => (
        <Section key={g.title} title={`${g.title} · ${g.items.length}`}>
          <div className="glass overflow-hidden">
            <AnimatePresence initial={false}>
              {g.items.map((t) => (
                <TaskRow key={t.id} t={t} />
              ))}
            </AnimatePresence>
          </div>
        </Section>
      ))}
      {done.length > 0 && (
        <Section>
          <button onClick={() => setShowDone((s) => !s)} className="mb-2.5 flex items-center gap-1 px-1 label">
            Concluídas · {done.length} <ChevronDown size={14} className={cn('transition-transform', showDone && 'rotate-180')} />
          </button>
          {showDone && (
            <div className="glass overflow-hidden">
              {done.slice(0, 20).map((t) => (
                <TaskRow key={t.id} t={t} />
              ))}
            </div>
          )}
        </Section>
      )}
      <p className="mt-2 flex items-center justify-center gap-1.5 text-[12px] muted">
        <CalendarDays size={13} /> Tarefas com data aparecem também na agenda.
      </p>
    </>
  );
}

