'use client';

import { motion } from 'framer-motion';
import { Droplets, EyeOff, Flower2, Heart, Plus, Shield, Wind } from 'lucide-react';
import { useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI } from '@/components/providers/UIProvider';
import { useCycle } from '@/components/shell/useCycle';
import { MonthCalendar } from '@/components/ui/MonthCalendar';
import { CaffeineCard, SleepCard } from './BodyBits';
import { BodyView, MindView } from '@/components/hubs/MindBody';
import { CustomHabits } from '@/components/hubs/FocusHub';
import { Avatar, Button, CheckCircle, Empty, Field, Glass, IconButton, PageHeader, Progress, Section, Segmented, Switch } from '@/components/ui/primitives';
import { ACCENT, HABITS, PHASES, PROTECTION, WATER_GOAL, wordOfTheDay } from '@/lib/constants';
import { dayKind } from '@/lib/cycle';
import { addDays, cn, daysBetween, firstName, fmtDay, parseYmd, uid, WEEK_LETTERS, ymd } from '@/lib/utils';

export function HealthScreen() {
  const [seg, setSeg] = useState<'cycle' | 'habits' | 'mind' | 'body'>('cycle');
  const { openSheet } = useUI();
  const cycle = useCycle();
  return (
    <div>
      <PageHeader
        title={seg === 'cycle' ? 'Ciclo' : seg === 'habits' ? 'Hábitos' : seg === 'mind' ? 'Mente' : 'Corpo'}
        subtitle="Saúde"
        actions={
          seg === 'cycle' && cycle.isOwner ? (
            <IconButton label="Registrar hoje" onClick={() => openSheet('cycleDay', { day: ymd() })}>
              <Plus size={20} />
            </IconButton>
          ) : undefined
        }
      />
      <div className="mb-6">
        <Segmented id="health-seg" value={seg} onChange={setSeg} options={[{ value: 'cycle', label: 'Ciclo' }, { value: 'habits', label: 'Hábitos' }, { value: 'mind', label: 'Mente' }, { value: 'body', label: 'Corpo' }]} />
      </div>
      {seg === 'cycle' ? <CycleView /> : seg === 'habits' ? <HabitsView /> : seg === 'mind' ? <MindView /> : <BodyView />}
    </div>
  );
}

/* ═════════════ CICLO ═════════════ */
function Onboarding() {
  const { me, save, couple } = useAtlas();
  const [last, setLast] = useState(ymd(addDays(new Date(), -10)));
  const [cycleLen, setCycleLen] = useState(28);
  const [periodLen, setPeriodLen] = useState(5);
  const [share, setShare] = useState(true);
  if (!me || !couple) return null;
  const start = () => {
    save('cycle_settings', { id: me.id, tracking: true, shareWithPartner: share, cycleLength: cycleLen, periodLength: periodLen, updatedAt: new Date().toISOString() });
    for (let i = 0; i < periodLen; i++) {
      const d = ymd(addDays(parseYmd(last), i));
      if (d > ymd()) break;
      save('cycle_days', { id: uid(), profileId: me.id, day: d, flow: i === 0 || i === 1 ? 'medium' : 'light', symptoms: [], moods: [] });
    }
  };
  return (
    <Glass className="p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: `${ACCENT.cycle}22`, color: ACCENT.cycle }}>
          <Flower2 size={20} />
        </span>
        <div>
          <p className="text-[17px] font-semibold">Acompanhar meu ciclo</p>
          <p className="text-[13px] muted">Previsões de menstruação, janela fértil e sintomas.</p>
        </div>
      </div>
      <div className="space-y-4">
        <Field label="Primeiro dia da última menstruação">
          <input type="date" value={last} max={ymd()} onChange={(e) => setLast(e.target.value)} className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ciclo (dias)">
            <input type="number" min={18} max={60} value={cycleLen} onChange={(e) => setCycleLen(Number(e.target.value))} className="input" />
          </Field>
          <Field label="Menstruação (dias)">
            <input type="number" min={1} max={15} value={periodLen} onChange={(e) => setPeriodLen(Number(e.target.value))} className="input" />
          </Field>
        </div>
        <div className="glass-thin flex items-center gap-3 p-3.5">
          <div className="flex-1">
            <p className="text-[14px] font-semibold">Compartilhar com meu par</p>
            <p className="text-[12px] muted">Você pode mudar isso quando quiser.</p>
          </div>
          <Switch checked={share} onChange={setShare} label="Compartilhar ciclo" />
        </div>
        <Button variant="primary" className="w-full" onClick={start}>
          Começar a acompanhar
        </Button>
      </div>
    </Glass>
  );
}

function CycleRing({ day, total, period }: { day: number; total: number; period: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, day / total);
  const periodArc = Math.min(1, period / total);
  return (
    <svg width="176" height="176" viewBox="0 0 176 176" className="-rotate-90">
      <circle cx="88" cy="88" r={r} fill="none" strokeWidth="10" className="stroke-black/[0.07] dark:stroke-white/[0.08]" />
      <circle cx="88" cy="88" r={r} fill="none" strokeWidth="10" stroke={ACCENT.cycle} strokeOpacity={0.35} strokeDasharray={`${c * periodArc} ${c}`} strokeLinecap="round" />
      <motion.circle
        cx="88" cy="88" r={r} fill="none" strokeWidth="10" strokeLinecap="round" className="stroke-black dark:stroke-white"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - pct) }}
        transition={{ type: 'spring', stiffness: 60, damping: 18 }}
      />
    </svg>
  );
}

function CycleView() {
  const { rows, me, partner, patch } = useAtlas();
  const { openSheet } = useUI();
  const cycle = useCycle();
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(ymd());
  const intimacy = rows('intimacy_logs').sort((a, b) => b.happenedAt.localeCompare(a.happenedAt));
  const today = ymd();

  const intimacySection = (
    <Section
      title="Intimidade"
      action={
        <button onClick={() => openSheet('intimacy')} className="flex items-center gap-1 text-[13px] font-medium muted">
          <Plus size={14} /> Registrar
        </button>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Este mês', value: intimacy.filter((i) => i.happenedAt.slice(0, 7) === today.slice(0, 7)).length },
          { label: '30 dias', value: intimacy.filter((i) => daysBetween(new Date(i.happenedAt), new Date()) <= 30).length },
          { label: 'Este ano', value: intimacy.filter((i) => i.happenedAt.slice(0, 4) === today.slice(0, 4)).length },
        ].map((s) => (
          <Glass key={s.label} className="p-3.5 text-center">
            <p className="text-[26px] font-bold tabular-nums">{s.value}</p>
            <p className="text-[11px] muted">{s.label}</p>
          </Glass>
        ))}
      </div>
      {intimacy.length > 0 && (
        <div className="glass mt-3 overflow-hidden">
          {intimacy.slice(0, 6).map((i) => {
            const k = cycle.active ? dayKind(ymd(new Date(i.happenedAt)), cycle.days, cycle.info) : null;
            return (
              <button key={i.id} onClick={() => openSheet('intimacy', { log: i })} className="flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-0 hairline">
                <Heart size={16} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium">{fmtDay(i.happenedAt, { weekday: 'short', day: '2-digit', month: 'short' })}</p>
                  <p className="text-[12px] muted">{PROTECTION.find((p) => p.value === i.protection)?.label ?? i.protection}</p>
                </div>
                {(k === 'fertile' || k === 'ovulation') && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${ACCENT.fertile}22`, color: ACCENT.fertile }}>
                    janela fértil
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </Section>
  );

  if (!cycle.settings && !cycle.hidden) {
    return (
      <>
        <Section>
          <Onboarding />
          {partner && !partner.pending && (
            <p className="mt-3 px-2 text-center text-[12px] muted">
              Se for a {firstName(partner.displayName)} quem vai acompanhar, ela ativa pelo celular dela e decide se compartilha com você.
            </p>
          )}
        </Section>
        {intimacySection}
      </>
    );
  }
  if (cycle.hidden) {
    return (
      <>
        <Section>
          <Empty icon={<EyeOff size={20} />} title="Ciclo privado" hint={`${firstName(cycle.owner?.displayName ?? 'Seu par')} optou por não compartilhar o ciclo. As relações registradas continuam visíveis para os dois.`} />
        </Section>
        {intimacySection}
      </>
    );
  }

  const { info, days, settings, isOwner, owner } = cycle;
  const sel = days.find((d) => d.day === selected);
  const selKind = dayKind(selected, days, info);
  const intimacyDays = new Set(intimacy.map((i) => ymd(new Date(i.happenedAt))));
  const symptomCount = new Map<string, number>();
  days.filter((d) => daysBetween(parseYmd(d.day), new Date()) <= 90).forEach((d) => d.symptoms.forEach((s) => symptomCount.set(s, (symptomCount.get(s) ?? 0) + 1)));
  const topSymptoms = [...symptomCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <>
      {!isOwner && (
        <p className="mb-4 flex items-center gap-2 px-1 text-[13px] muted">
          <Avatar profile={owner} size={22} /> Ciclo da {firstName(owner?.displayName ?? '')} · somente leitura
        </p>
      )}

      {/* Herói */}
      <Section>
        <Glass className="p-5">
          {info.lastStart ? (
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <CycleRing day={info.cycleDay ?? 0} total={info.avgCycle} period={info.avgPeriod} />
                <div className="absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] muted">Dia</p>
                    <p className="text-[40px] font-bold leading-none tabular-nums">{info.cycleDay}</p>
                    <p className="text-[11px] muted">de {info.avgCycle}</p>
                  </div>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="label" style={{ color: ACCENT.cycle }}>{info.phase ? PHASES[info.phase].label : ''}</p>
                <p className="mt-1 text-[20px] font-bold leading-tight tracking-tight">
                  {info.daysLate > 0 ? `Atrasada ${info.daysLate} dia${info.daysLate > 1 ? 's' : ''}` : info.daysToNext === 0 ? 'Menstruação prevista hoje' : `Menstruação em ${info.daysToNext} dia${info.daysToNext === 1 ? '' : 's'}`}
                </p>
                <p className="mt-1.5 text-[12px] leading-snug muted">{info.phase ? PHASES[info.phase].tip : ''}</p>
              </div>
            </div>
          ) : (
            <p className="text-[14px] muted">Registre o primeiro dia da menstruação para ver as previsões.</p>
          )}
          {info.nextPeriod && (
            <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-4 text-center hairline">
              <div>
                <p className="text-[11px] muted">Próxima</p>
                <p className="text-[14px] font-semibold">{fmtDay(info.nextPeriod)}</p>
              </div>
              <div>
                <p className="text-[11px] muted">Fértil</p>
                <p className="text-[14px] font-semibold">{fmtDay(info.fertileStart!, { day: '2-digit' })}–{fmtDay(info.fertileEnd!)}</p>
              </div>
              <div>
                <p className="text-[11px] muted">Ovulação</p>
                <p className="text-[14px] font-semibold">{fmtDay(info.ovulation!)}</p>
              </div>
            </div>
          )}
          {isOwner && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="primary" onClick={() => openSheet('cycleDay', { day: today })}>
                Registrar hoje
              </Button>
              <Button onClick={() => openSheet('intimacy')}>
                <Heart size={15} /> Relação
              </Button>
            </div>
          )}
        </Glass>
      </Section>

      {/* Calendário */}
      <Section title="Calendário">
        <MonthCalendar
          month={month}
          onMonth={setMonth}
          selected={selected}
          onSelect={(d) => {
            setSelected(d);
            if (isOwner && d <= today) openSheet('cycleDay', { day: d });
          }}
          decorate={(d) => {
            const k = dayKind(d, days, info);
            return {
              style:
                k === 'period' ? { background: ACCENT.cycle, color: '#000', fontWeight: 600 } :
                k === 'predicted' ? { boxShadow: `inset 0 0 0 1.5px ${ACCENT.cycle}` } :
                k === 'ovulation' ? { boxShadow: `inset 0 0 0 1.5px ${ACCENT.fertile}`, color: ACCENT.fertile, fontWeight: 600 } :
                k === 'fertile' ? { background: `${ACCENT.fertile}26` } : undefined,
              marks: (
                <>
                  {intimacyDays.has(d) && <Heart size={6} fill="currentColor" className="opacity-70" />}
                  {days.find((x) => x.day === d && (x.symptoms.length || x.notes)) && <span className="h-1 w-1 rounded-full bg-black/50 dark:bg-white/60" />}
                </>
              ),
            };
          }}
        />
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11px] muted">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: ACCENT.cycle }} />Menstruação</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ boxShadow: `inset 0 0 0 1.5px ${ACCENT.cycle}` }} />Prevista</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: `${ACCENT.fertile}55` }} />Fértil</span>
          <span className="flex items-center gap-1.5"><Heart size={9} fill="currentColor" />Relação</span>
        </div>
        {!isOwner && (sel || selKind) && (
          <Glass className="mt-3 p-4">
            <p className="text-[14px] font-semibold">{fmtDay(selected, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <p className="text-[13px] muted">
              {selKind === 'period' ? 'Menstruação' : selKind === 'predicted' ? 'Menstruação prevista' : selKind === 'ovulation' ? 'Ovulação prevista' : selKind === 'fertile' ? 'Janela fértil' : ''}
              {sel?.symptoms.length ? ` · ${sel.symptoms.join(', ')}` : ''}
              {sel?.moods.length ? ` · ${sel.moods.join(', ')}` : ''}
            </p>
            {sel?.notes && <p className="mt-1 text-[13px]">{sel.notes}</p>}
          </Glass>
        )}
      </Section>

      {intimacySection}

      {/* Estatísticas */}
      <Section title="Histórico">
        <div className="grid grid-cols-2 gap-3">
          <Glass className="p-4">
            <p className="text-[12px] muted">Ciclo médio</p>
            <p className="text-[26px] font-bold tabular-nums">{info.avgCycle}<span className="text-[13px] font-medium muted"> dias</span></p>
          </Glass>
          <Glass className="p-4">
            <p className="text-[12px] muted">Menstruação média</p>
            <p className="text-[26px] font-bold tabular-nums">{info.avgPeriod}<span className="text-[13px] font-medium muted"> dias</span></p>
          </Glass>
        </div>
        {info.starts.length > 0 && (
          <div className="glass mt-3 overflow-hidden">
            {[...info.starts].reverse().slice(0, 6).map((s, i, arr) => {
              const idx = info.starts.indexOf(s);
              const len = info.cycleLengths[idx] ?? (idx === info.starts.length - 1 ? info.cycleDay : null);
              return (
                <div key={s} className="flex items-center gap-3 border-b px-4 py-3 last:border-0 hairline">
                  <span className="h-2 w-2 rounded-full" style={{ background: ACCENT.cycle }} />
                  <p className="flex-1 text-[14px]">{fmtDay(s, { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  <p className="text-[13px] tabular-nums muted">
                    {info.periodLengths[idx]}d menstruação · {len ? `${len}d ${idx === info.starts.length - 1 ? '(atual)' : 'ciclo'}` : '—'}
                  </p>
                  {i === arr.length && null}
                </div>
              );
            })}
          </div>
        )}
        {topSymptoms.length > 0 && (
          <Glass className="mt-3 p-4">
            <p className="mb-3 text-[13px] font-semibold">Sintomas mais frequentes · 90 dias</p>
            <div className="space-y-2.5">
              {topSymptoms.map(([s, n]) => (
                <div key={s} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-[13px]">{s}</span>
                  <Progress value={(n / topSymptoms[0][1]) * 100} className="flex-1" />
                  <span className="w-5 text-right text-[12px] tabular-nums muted">{n}</span>
                </div>
              ))}
            </div>
          </Glass>
        )}
      </Section>

      {isOwner && settings && me && (
        <Section title="Privacidade & ajustes">
          <div className="glass overflow-hidden">
            <div className="flex items-center gap-3 border-b px-4 py-3.5 hairline">
              <Shield size={18} />
              <div className="flex-1">
                <p className="text-[14px] font-medium">Compartilhar com {partner && !partner.pending ? firstName(partner.displayName) : 'meu par'}</p>
                <p className="text-[12px] muted">{settings.shareWithPartner ? 'Seu par vê fase, previsões e registros.' : 'Só você vê seu ciclo.'}</p>
              </div>
              <Switch checked={settings.shareWithPartner} onChange={(v) => patch('cycle_settings', settings.id, { shareWithPartner: v })} label="Compartilhar ciclo" />
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <p className="flex-1 text-[14px]">Ciclo padrão</p>
              <input type="number" min={18} max={60} value={settings.cycleLength} onChange={(e) => patch('cycle_settings', settings.id, { cycleLength: Number(e.target.value) || 28 })} className="w-16 rounded-xl bg-black/5 px-2 py-1.5 text-center text-[14px] outline-none dark:bg-white/10" />
              <span className="text-[13px] muted">dias</span>
            </div>
          </div>
        </Section>
      )}
    </>
  );
}

/* ═════════════ HÁBITOS ═════════════ */
function HabitsView() {
  const { me, partner, rows, todayHabit, toggleHabit, addWater } = useAtlas();
  const { setBreathingOpen } = useUI();
  if (!me || !partner) return null;
  const h = todayHabit(me.id);
  const ph = partner.pending ? null : todayHabit(partner.id);
  const word = wordOfTheDay();
  const week = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i - 6));
  const logs = rows('habit_logs');
  const streak = (key: (typeof HABITS)[number]['key']) => {
    let n = 0;
    for (let i = 0; i < 60; i++) {
      const d = ymd(addDays(new Date(), -i));
      const l = logs.find((x) => x.profileId === me.id && x.logDate === d);
      if (l?.[key]) n++;
      else if (i > 0 || !l?.[key]) { if (i > 0) break; }
    }
    return n;
  };

  return (
    <>
      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4">
        {HABITS.map((x) => {
          const n = streak(x.key);
          return (
            <span key={x.key} className={cn('shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold', n ? 'text-white' : 'bg-black/5 muted dark:bg-white/[0.07]')} style={n ? { background: '#10B981' } : undefined}>
              {x.emoji} {n} {n === 1 ? 'dia' : 'dias'}
            </span>
          );
        })}
      </div>

      <Section title={`${word.kind} do dia`}>
        <Glass className="p-5">
          <p className="text-[17px] font-medium leading-snug">“{word.text}”</p>
          <p className="mt-2 text-[13px] muted">— {word.ref}</p>
        </Glass>
      </Section>

      <Section title="Seus hábitos hoje">
        <div className="glass overflow-hidden">
          {HABITS.map((x) => (
            <div key={x.key} role="button" onClick={() => toggleHabit(x.key)} className="flex cursor-pointer items-center gap-3 border-b px-4 py-3.5 last:border-0 hairline">
              <span className="text-[20px]">{x.emoji}</span>
              <p className={cn('flex-1 text-[15px] font-medium', h[x.key] && 'line-through muted')}>{x.label}</p>
              <CheckCircle checked={h[x.key]} onClick={() => toggleHabit(x.key)} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Hábitos pessoais">
        <CustomHabits />
      </Section>

      <Section title="Água">
        <Glass className="p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[34px] font-bold tabular-nums tracking-tight">{(h.waterMl / 1000).toFixed(1)}L</p>
              <p className="text-[13px] muted">de {(WATER_GOAL / 1000).toFixed(1)}L · {Math.max(0, Math.ceil((WATER_GOAL - h.waterMl) / 500))} copos de 500ml restantes</p>
            </div>
            <Droplets size={28} style={{ color: ACCENT.water }} />
          </div>
          <div className="mt-4 flex gap-1.5">
            {Array.from({ length: WATER_GOAL / 500 }).map((_, i) => (
              <span key={i} className="h-8 flex-1 rounded-lg transition-colors" style={{ background: i < h.waterMl / 500 ? ACCENT.water : 'rgba(127,127,140,0.15)' }} />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button onClick={() => addWater(-500)} disabled={h.waterMl <= 0}>− 500ml</Button>
            <Button variant="primary" onClick={() => addWater(500)}>+ 500ml</Button>
          </div>
        </Glass>
      </Section>

      <Section title="Consistência · 7 dias">
        <Glass className="p-4">
          <div className="flex items-end justify-between gap-1.5 px-1">
            {week.map((d) => {
              const l = logs.find((x) => x.profileId === me.id && x.logDate === ymd(d));
              const pct = l ? [l.devotional, l.workout, l.cleanDiet, l.reading, l.waterMl >= WATER_GOAL].filter(Boolean).length / 5 : 0;
              const isToday = ymd(d) === ymd();
              return (
                <div key={ymd(d)} className="flex flex-col items-center gap-1.5">
                  <div className="relative h-24 w-7 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.07]">
                    <motion.div className={cn('absolute inset-x-0 bottom-0 rounded-full', pct >= 0.8 ? '' : 'bg-black dark:bg-white')} style={pct >= 0.8 ? { background: '#10B981' } : undefined} initial={{ height: 0 }} animate={{ height: `${Math.max(pct * 100, 5)}%` }} transition={{ type: 'spring', stiffness: 140, damping: 20 }} />
                  </div>
                  <span className={cn('text-[11px]', isToday ? 'font-bold' : 'muted')}>{WEEK_LETTERS[d.getDay()]}</span>
                </div>
              );
            })}
          </div>
        </Glass>
      </Section>

      <Section title="Sono inteligente">
        <SleepCard />
      </Section>

      <Section title="Cafeína">
        <CaffeineCard />
      </Section>

      {ph && (
        <Section title={`${firstName(partner.displayName)} hoje`}>
          <Glass className="p-4">
            <div className="flex flex-wrap gap-2">
              {HABITS.map((x) => (
                <span key={x.key} className={cn('rounded-full px-3 py-1.5 text-[12px] font-medium', ph[x.key] ? 'text-white' : 'bg-black/5 muted dark:bg-white/[0.07]')} style={ph[x.key] ? { background: '#10B981' } : undefined}>
                  {x.emoji} {x.label}
                </span>
              ))}
            </div>
            <p className="mt-3 text-[12px] muted">Água: {(ph.waterMl / 1000).toFixed(1)}L</p>
          </Glass>
        </Section>
      )}

      <Section title="Saúde mental">
        <Glass className="p-5" onClick={() => setBreathingOpen(true)}>
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-black text-white dark:bg-white dark:text-black">
              <Wind size={22} />
            </span>
            <div>
              <p className="text-[16px] font-semibold">Reset mental</p>
              <p className="text-[13px] muted">Box breathing 4·4·4·4 com guia visual</p>
            </div>
          </div>
        </Glass>
      </Section>
    </>
  );
}
