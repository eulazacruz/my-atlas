'use client';

import { motion } from 'framer-motion';
import { LifeBuoy, LayoutGrid, CalendarPlus, CheckSquare, ChevronRight, Droplets, FilePlus2, Heart, Moon, PawPrint, Plus, ShoppingBag, Sun, Wallet, Wind } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI } from '@/components/providers/UIProvider';
import { useCycle } from '@/components/shell/useCycle';
import { Avatar, CheckCircle, Glass, IconButton, PageHeader, Progress, Section } from '@/components/ui/primitives';
import { RingAvatar, StatusPicker } from './CoupleBits';
import { BiblePlanMini, openBibleAt } from './BibleScreen';
import { CheckinHomeCard } from './CheckinScreen';
import { parseRef } from '@/lib/bible';
import { CaffeineCard, SleepCard } from './BodyBits';
import { VirtualAtlas } from './PetScreen';
import { useHomeLayout } from '@/lib/homeLayout';
import { useExternalEvents } from '@/lib/calendar';
import { DaySummaryCard, FocusStarter, PrioritiesCard } from '@/components/hubs/FocusHub';
import { DevotionalCard, QuestionOfDay } from '@/components/hubs/FaithHub';
import { FatigueThermometer, ListenFirst, openSos } from '@/components/hubs/MindBody';
import { CoupleNightCard } from '@/components/hubs/LifeHub';
import { AlertsCard, WeeklyTeaser } from '@/components/hubs/Weekly';
import type { HomeSectionId } from '@/lib/constants';
import { ACCENT, DATE_KINDS, HABITS, MOODS, PHASES, statusOf, WATER_GOAL, wordOfTheDay } from '@/lib/constants';
import type { Profile } from '@/lib/types';
import { cn, daysBetween, firstName, fmtDay, greeting, hhmm, money, nextOccurrence, uid, ymd } from '@/lib/utils';

function QuickAction({ icon: Icon, label, onClick }: { icon: typeof Plus; label: string; onClick: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.92 }} onClick={onClick} className="glass flex w-[76px] shrink-0 flex-col items-center gap-1.5 !rounded-[22px] py-3">
      <Icon size={20} strokeWidth={1.9} />
      <span className="text-[11px] font-medium">{label}</span>
    </motion.button>
  );
}

function PersonMini({ p, me }: { p: Profile; me?: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <RingAvatar p={p} size={40} />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold">{me ? 'Você' : p.pending ? 'Convide' : firstName(p.displayName)}</p>
        {!p.pending && (
          <>
            <p className="truncate text-[12px] muted">
              {MOODS[p.mood].emoji} {MOODS[p.mood].label}
            </p>
            {statusOf(p.contextStatus) && <p className="truncate text-[11px] muted">{statusOf(p.contextStatus)!.emoji} {statusOf(p.contextStatus)!.label}</p>}
          </>
        )}
      </div>
    </div>
  );
}

export function HomeScreen() {
  const { me, partner, couple, rows, patch, todayHabit, toggleHabit, addWater, sendNudge } = useAtlas();
  const { navigate, openSheet, openNote, setBreathingOpen } = useUI();
  const { save, startSleep } = useAtlas();
  const { layout } = useHomeLayout();
  const { mode } = useAtlas();
  const gcal = useExternalEvents(mode !== 'demo');
  const cycle = useCycle();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!me || !partner || !couple) return null;

  const today = ymd();
  const events = rows('events')
    .filter((e) => ymd(new Date(e.startsAt)) === today && (!e.owner || e.owner === me.id || true))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const tasks = rows('tasks')
    .filter((t) => !t.done && t.dueDate && t.dueDate <= today && (!t.assignee || t.assignee === me.id))
    .sort((a, b) => b.priority - a.priority);
  const habit = todayHabit(me.id);
  const habitsDone = HABITS.filter((h) => habit[h.key]).length;
  const word = wordOfTheDay();

  const month = today.slice(0, 7);
  const mtx = rows('transactions').filter((t) => t.occurredOn.startsWith(month));
  const balance = mtx.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
  const spent = mtx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const shopping = rows('shopping_items').filter((i) => !i.checked).length;
  const pet = rows('pets')[0];
  const foodLeft = pet?.foodRefilledAt ? pet.foodBagDays - daysBetween(new Date(pet.foodRefilledAt), new Date()) : null;
  const walked = rows('pet_walks').some((w) => ymd(new Date(w.walkedAt)) === today);
  const nextDate = rows('special_dates')
    .map((d) => ({ d, next: nextOccurrence(d.date, d.recurring) }))
    .filter((x) => daysBetween(new Date(), x.next) >= 0)
    .sort((a, b) => a.next.getTime() - b.next.getTime())[0];

  const newNote = () => {
    const id = uid();
    const now = new Date().toISOString();
    save('notes', { id, createdBy: me.id, parentId: null, title: '', icon: '📝', blocks: [{ id: uid(), type: 'p', text: '' }], isPrivate: false, pinned: false, createdAt: now, updatedAt: now });
    openNote(id);
  };

  const blocks: Record<HomeSectionId, JSX.Element | null> = {
    status: (
      <>
      <Section title="Agora" action={<button onClick={() => navigate('couple')} className="text-[13px] font-medium muted">Preciso de…</button>}>
        <StatusPicker compact />
        <div className="mt-3 empty:hidden"><CheckinHomeCard /></div>
      </Section>
      </>
    ),
    quick: (
      <>
      <div className="no-scrollbar -mx-4 mb-7 flex gap-2 overflow-x-auto px-4 pb-1">
        <QuickAction icon={Wallet} label="Despesa" onClick={() => openSheet('expense')} />
        <QuickAction icon={CalendarPlus} label="Evento" onClick={() => openSheet('event', { date: today })} />
        <QuickAction icon={CheckSquare} label="Tarefa" onClick={() => openSheet('task')} />
        <QuickAction icon={FilePlus2} label="Nota" onClick={newNote} />
        <QuickAction icon={Droplets} label="+500ml" onClick={() => addWater(500)} />
        <QuickAction icon={Wind} label="Respirar" onClick={() => setBreathingOpen(true)} />
        <QuickAction icon={Heart} label="Carinho" onClick={() => sendNudge('carinho')} />
        <QuickAction icon={Moon} label="Dormir" onClick={startSleep} />
        <QuickAction icon={LifeBuoy} label="Ansioso" onClick={openSos} />
      </div>

      </>
    ),
    couple: (
      <>
      <Section title="Nós dois" action={<button onClick={() => navigate('couple')} className="text-[13px] font-medium muted">Abrir</button>}>
        <Glass className="p-4" onClick={() => navigate('couple')}>
          <div className="flex items-center gap-3">
            <PersonMini p={me} me />
            <div className="h-10 w-px bg-black/10 dark:bg-white/10" />
            <PersonMini p={partner} />
          </div>
          {couple.startedAt && (
            <p className="mt-3 border-t pt-3 text-[12px] muted hairline">
              Juntos há <span className="font-semibold text-black dark:text-white">{daysBetween(new Date(couple.startedAt + 'T12:00'), new Date()).toLocaleString('pt-BR')} dias</span>
            </p>
          )}
        </Glass>
      </Section>

      </>
    ),
    today: (
      <>
      <Section title="Hoje" action={<button onClick={() => navigate('agenda')} className="text-[13px] font-medium muted">Agenda</button>}>
        <div className="glass overflow-hidden">
          {events.length === 0 && tasks.length === 0 && !gcal.events.some((e) => ymd(new Date(e.start)) === today) && <p className="px-4 py-5 text-[14px] muted">Dia livre. Nenhum compromisso ou tarefa pendente. ✨</p>}
          {gcal.events.filter((e) => ymd(new Date(e.start)) === today && new Date(e.end ?? e.start) > new Date(Date.now() - 3600_000)).slice(0, 4).map((e) => (
            <div key={e.id} className="flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-0 hairline">
              <span className="w-12 shrink-0 text-[13px] font-semibold tabular-nums">{e.allDay ? 'Dia' : hhmm(e.start)}</span>
              <span className="h-8 w-[3px] shrink-0 rounded-full" style={{ background: e.owner === me.id ? '#4285F4' : '#10B981' }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">{e.title}</p>
                <p className="truncate text-[12px] muted">Google · {e.owner === me.id ? 'sua agenda' : firstName(partner.displayName)}</p>
              </div>
            </div>
          ))}
          {events.map((e) => (
            <button key={e.id} onClick={() => openSheet('event', { event: e })} className="flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-0 hairline">
              <span className="w-12 shrink-0 text-[13px] font-semibold tabular-nums">{e.allDay ? 'Dia' : hhmm(e.startsAt)}</span>
              <span className="h-8 w-[3px] shrink-0 rounded-full bg-black dark:bg-white" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">{e.title}</p>
                {e.location && <p className="truncate text-[12px] muted">{e.location}</p>}
              </div>
            </button>
          ))}
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0 hairline">
              <CheckCircle checked={t.done} onClick={() => patch('tasks', t.id, { done: true, doneAt: new Date().toISOString(), doneBy: me.id })} />
              <button onClick={() => openSheet('task', { task: t })} className="min-w-0 flex-1 text-left">
                <p className="truncate text-[15px]">{t.title}</p>
                <p className="text-[12px] muted">{t.dueDate! < today ? 'Atrasada' : 'Hoje'}{t.priority > 0 ? ` · ${t.priority === 2 ? 'Urgente' : 'Importante'}` : ''}</p>
              </button>
            </div>
          ))}
        </div>
      </Section>

      </>
    ),
    body: (
      <>
      <Section title="Corpo & mente">
        <div className="grid grid-cols-2 gap-3">
          <Glass className="p-4">
            <div className="flex items-center justify-between">
              <Droplets size={18} style={{ color: ACCENT.water }} />
              <span className="text-[12px] muted">{Math.round((habit.waterMl / WATER_GOAL) * 100)}%</span>
            </div>
            <p className="mt-3 text-[26px] font-bold tabular-nums tracking-tight">{(habit.waterMl / 1000).toFixed(1)}<span className="text-[14px] font-medium muted"> / 3L</span></p>
            <Progress value={(habit.waterMl / WATER_GOAL) * 100} className="mt-2" color={ACCENT.water} />
            <button onClick={() => addWater(500)} className="mt-3 h-9 w-full rounded-full bg-black/[0.06] text-[13px] font-semibold dark:bg-white/[0.08]">+ 500ml</button>
          </Glass>
          <Glass className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold">Hábitos</span>
              <span className="text-[12px] muted">{habitsDone}/4</span>
            </div>
            <div className="mt-2.5 space-y-2">
              {HABITS.map((h) => (
                <div key={h.key} role="button" onClick={() => toggleHabit(h.key)} className="flex w-full cursor-pointer items-center gap-2 text-left">
                  <CheckCircle checked={habit[h.key]} onClick={() => toggleHabit(h.key)} size={20} />
                  <span className={cn('text-[13px]', habit[h.key] && 'line-through muted')}>{h.label}</span>
                </div>
              ))}
            </div>
          </Glass>
        </div>

        {cycle.active && cycle.info.lastStart && (
          <Glass className="mt-3 p-4" onClick={() => navigate('health')}>
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full" style={{ boxShadow: `inset 0 0 0 2px ${ACCENT.cycle}` }}>
                <span className="text-[17px] font-bold tabular-nums">{cycle.info.cycleDay}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="label" style={{ color: ACCENT.cycle }}>
                  Ciclo {cycle.isOwner ? '' : `· ${firstName(cycle.owner?.displayName ?? '')}`}
                </p>
                <p className="text-[15px] font-semibold">{cycle.info.phase ? PHASES[cycle.info.phase].label : '—'}</p>
                <p className="text-[12px] muted">
                  {cycle.info.daysLate > 0 ? `Atrasada ${cycle.info.daysLate} dia(s)` : `Próxima menstruação em ${cycle.info.daysToNext} dia(s)`}
                </p>
              </div>
              <ChevronRight size={18} className="muted" />
            </div>
          </Glass>
        )}

        <Glass className="mt-3 p-4" onClick={() => setBreathingOpen(true)}>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-black text-white dark:bg-white dark:text-black">
              <Wind size={18} />
            </span>
            <div className="flex-1">
              <p className="text-[15px] font-semibold">Reset mental</p>
              <p className="text-[12px] muted">Box breathing guiado · 4 ciclos</p>
            </div>
            <ChevronRight size={18} className="muted" />
          </div>
        </Glass>
      </Section>

      </>
    ),
    sleep: (
      <>
      <Section title="Sono & cafeína">
        <div className="space-y-3">
          <SleepCard />
          <CaffeineCard />
        </div>
      </Section>
      </>
    ),
    pet: (
      <>
      <Section title="Atlas virtual" action={<button onClick={() => navigate('pet')} className="text-[13px] font-medium muted">Prontuário</button>}>
        <VirtualAtlas compact />
      </Section>
      </>
    ),
    focus: (
      <>
      <Section title="Foco do dia" action={<button onClick={() => navigate('focus')} className="text-[13px] font-medium muted">Produtividade</button>}>
        <div className="space-y-3">
          <PrioritiesCard compact />
          <FocusStarter />
        </div>
      </Section>
      </>
    ),
    care: (
      <>
      <div className="mb-7 space-y-3 empty:hidden">
        <AlertsCard />
        <ListenFirst />
        <FatigueThermometer />
        <CoupleNightCard compact />
      </div>
      </>
    ),
    faith: (
      <>
      <Section title="Fé do dia" action={<button onClick={() => navigate('faith')} className="text-[13px] font-medium muted">Abrir</button>}>
        <div className="space-y-3">
          <DevotionalCard />
          <QuestionOfDay />
        </div>
      </Section>
      </>
    ),
    summary: (
      <>
      <Section title="Resumos">
        <div className="space-y-3">
          {new Date().getHours() >= 18 && <DaySummaryCard />}
          <WeeklyTeaser />
        </div>
      </Section>
      </>
    ),
    word: (
      <>
      <Section title={`${word.kind} do dia`} action={<button onClick={() => navigate('bible')} className="text-[13px] font-medium muted">Bíblia</button>}>
        <Glass className="p-5" onClick={() => { const r = parseRef(word.ref); if (r) openBibleAt(r); }}>
          <p className="font-serif text-[18px] leading-snug">“{word.text}”</p>
          <p className="mt-2 text-[13px] muted">— {word.ref}</p>
        </Glass>
        <div className="mt-3"><BiblePlanMini /></div>
      </Section>

      </>
    ),
    house: (
      <>
      <Section title="Casa">
        <div className="grid grid-cols-2 gap-3">
          <Glass className="p-4" onClick={() => navigate('finance')}>
            <Wallet size={18} />
            <p className="mt-3 text-[12px] muted">Saldo do mês</p>
            <p className={cn('text-[19px] font-bold tabular-nums tracking-tight', balance < 0 && 'text-red-500')}>{money(balance)}</p>
            <Progress value={(spent / couple.monthlyBudget) * 100} className="mt-2" />
          </Glass>
          <Glass className="p-4" onClick={() => navigate('shopping')}>
            <ShoppingBag size={18} />
            <p className="mt-3 text-[12px] muted">Lista de compras</p>
            <p className="text-[19px] font-bold">{shopping} {shopping === 1 ? 'item' : 'itens'}</p>
          </Glass>
          <Glass className="p-4" onClick={() => navigate('pet')}>
            <PawPrint size={18} />
            <p className="mt-3 text-[12px] muted">{pet?.name ?? 'Pet'}</p>
            <p className="text-[15px] font-semibold">{walked ? 'Passeou hoje ✓' : 'Sem passeio hoje'}</p>
            {foodLeft !== null && foodLeft <= 5 && <p className="mt-1 text-[12px] font-medium" style={{ color: ACCENT.warn }}>Ração acabando</p>}
          </Glass>
          {nextDate && (
            <Glass className="p-4" onClick={() => navigate('couple')}>
              <span className="text-[18px]">{DATE_KINDS.find((k) => k.value === nextDate.d.kind)?.emoji ?? '⭐'}</span>
              <p className="mt-2.5 truncate text-[12px] muted">{nextDate.d.title}</p>
              <p className="text-[19px] font-bold">
                {daysBetween(new Date(), nextDate.next) === 0 ? 'Hoje!' : `${daysBetween(new Date(), nextDate.next)} dias`}
              </p>
              <p className="text-[11px] muted">{fmtDay(nextDate.next)}</p>
            </Glass>
          )}
        </div>
      </Section>
      </>
    ),
  };

  return (
    <div>
      <PageHeader
        subtitle={new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        title={`${greeting()}, ${firstName(me.displayName)}`}
        actions={
          <>
            <IconButton label="Editar tela" onClick={() => openSheet('editHome')}>
              <LayoutGrid size={18} />
            </IconButton>
            <IconButton label="Alternar tema" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
              {mounted && resolvedTheme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </IconButton>
          </>
        }
      />

      {layout.order.filter((id) => !layout.hidden.includes(id)).map((id) => (
        <div key={id}>{blocks[id]}</div>
      ))}
      <button onClick={() => openSheet('editHome')} className="mx-auto mt-2 flex h-10 items-center gap-2 rounded-full px-5 text-[13px] font-medium muted">
        <LayoutGrid size={15} /> Editar tela
      </button>
    </div>
  );
}
