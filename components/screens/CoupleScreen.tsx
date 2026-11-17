'use client';
import { useSticky } from '@/lib/sticky';

import { Hand, Heart, Plus } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI } from '@/components/providers/UIProvider';
import { Button, Chip, Empty, Glass, PageHeader, Progress, Section, Segmented } from '@/components/ui/primitives';
import { HouseholdCard, NeedsGrid, RingAvatar, StatusPicker } from './CoupleBits';
import { DATE_KINDS, MOOD_ORDER, MOODS } from '@/lib/constants';
import type { Profile } from '@/lib/types';
import { addDays, cn, daysBetween, firstName, fmtDay, money, nextOccurrence, timeAgo, uid, WEEK_LETTERS, ymd } from '@/lib/utils';

function PersonCard({ p, isMe }: { p: Profile; isMe: boolean }) {
  return (
    <Glass className="flex-1 p-4 text-center">
      <div className="flex justify-center">
        <RingAvatar p={p} size={56} />
      </div>
      <p className="mt-2 truncate text-[15px] font-semibold">{isMe ? 'Você' : p.pending ? 'Aguardando' : firstName(p.displayName)}</p>
      {!p.pending && (
        <>
          <p className="text-[13px]">
            {MOODS[p.mood].emoji} {MOODS[p.mood].label}
          </p>
          <p className="mb-2 text-[11px] muted">{isMe ? 'agora' : timeAgo(p.updatedAt)}</p>
          <div className="flex items-center gap-2">
            <Progress value={p.mentalBattery} className="flex-1" />
            <span className="text-[11px] font-semibold tabular-nums">{p.mentalBattery}%</span>
          </div>
        </>
      )}
    </Glass>
  );
}

export function CoupleScreen() {
  const [seg, setSeg] = useSticky<'now' | 'home' | 'dates' | 'goals' | 'prayer'>('couple-seg', 'now');
  return (
    <div>
      <PageHeader title="Nós dois" back />
      <div className="mb-6">
        <div>
          <Segmented
            id="couple-seg"
            value={seg}
            onChange={setSeg}
            options={[
              { value: 'now', label: 'Agora' },
              { value: 'home', label: 'Casa' },
              { value: 'dates', label: 'Datas' },
              { value: 'goals', label: 'Metas' },
              { value: 'prayer', label: 'Oração' },
            ]}
          />
        </div>
      </div>
      {seg === 'now' && <NowView />}
      {seg === 'home' && (
        <Section title="Acordos & termostato doméstico">
          <HouseholdCard />
        </Section>
      )}
      {seg === 'dates' && <DatesView />}
      {seg === 'goals' && <GoalsView />}
      {seg === 'prayer' && <PrayerView />}
    </div>
  );
}

function NowView() {
  const { me, partner, save, rows, sendNudge } = useAtlas();
  const { resolvedTheme } = useTheme();
  const [battery, setBattery] = useState(me?.mentalBattery ?? 70);
  useEffect(() => setBattery(me?.mentalBattery ?? 70), [me?.mentalBattery, me?.id]);
  const logs = rows('mood_logs');

  const wave = useMemo(() => {
    if (!me || !partner) return [];
    let a = me.mentalBattery;
    let b = partner.mentalBattery;
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(new Date(), i - 6);
      const avg = (id: string) => {
        const l = logs.filter((x) => x.profileId === id && ymd(new Date(x.createdAt)) === ymd(d));
        return l.length ? Math.round(l.reduce((s, x) => s + x.mentalBattery, 0) / l.length) : null;
      };
      a = avg(me.id) ?? a;
      b = partner.pending ? b : avg(partner.id) ?? b;
      return { day: WEEK_LETTERS[d.getDay()], me: a, partner: partner.pending ? undefined : b };
    });
  }, [logs, me, partner]);

  if (!me || !partner) return null;
  const fg = resolvedTheme === 'light' ? '#000' : '#fff';
  const sub = resolvedTheme === 'light' ? '#888' : '#8a8a8a';

  const update = (p: Partial<Profile>) => {
    const next = { ...me, ...p, updatedAt: new Date().toISOString() };
    save('profiles', next);
    save('mood_logs', { id: uid(), profileId: me.id, mood: next.mood, mentalBattery: next.mentalBattery, createdAt: next.updatedAt });
  };

  return (
    <>
      <Section title="Status agora">
        <StatusPicker />
      </Section>
      <Section>
        <div className="flex gap-3">
          <PersonCard p={me} isMe />
          <PersonCard p={partner} isMe={false} />
        </div>
      </Section>
      <Section title="Como você está?">
        <Glass className="p-4">
          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
            {MOOD_ORDER.map((m) => (
              <Chip key={m} active={me.mood === m} onClick={() => update({ mood: m })}>
                {MOODS[m].emoji} {MOODS[m].label}
              </Chip>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between">
            <p className="label">Bateria mental</p>
            <span className="text-[15px] font-bold tabular-nums">{battery}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={battery}
            onChange={(e) => setBattery(Number(e.target.value))}
            onPointerUp={() => battery !== me.mentalBattery && update({ mentalBattery: battery })}
            onTouchEnd={() => battery !== me.mentalBattery && update({ mentalBattery: battery })}
            className="range mt-3 w-full"
            style={{ ['--pct' as string]: `${battery}%` }}
            aria-label="Bateria mental"
          />
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button variant="primary" onClick={() => sendNudge('carinho')}>
              <Heart size={16} /> Carinho
            </Button>
            <Button onClick={() => sendNudge('cutucao')}>
              <Hand size={16} /> Cutucar
            </Button>
          </div>
        </Glass>
      </Section>
      <Section title="Preciso de…">
        <NeedsGrid />
      </Section>
      <Section title="Energia da semana">
        <Glass className="p-4">
          <div className="mb-2 flex gap-4 text-[12px] font-medium">
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: fg }} />Você</span>
            {!partner.pending && <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded border-t-2 border-dashed" style={{ borderColor: sub }} />{firstName(partner.displayName)}</span>}
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={wave} margin={{ top: 8, right: 4, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id="gm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={fg} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={fg} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: sub, fontSize: 11 }} />
                <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickLine={false} axisLine={false} tick={{ fill: sub, fontSize: 10 }} />
                <Tooltip contentStyle={{ background: resolvedTheme === 'light' ? '#fff' : '#111', border: 'none', borderRadius: 14, fontSize: 12 }} />
                <Area type="monotone" dataKey="me" name="Você" stroke={fg} strokeWidth={2.2} fill="url(#gm)" dot={false} />
                {!partner.pending && <Area type="monotone" dataKey="partner" name={firstName(partner.displayName)} stroke={sub} strokeWidth={2} strokeDasharray="5 4" fill="none" dot={false} />}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Glass>
      </Section>
    </>
  );
}

function DatesView() {
  const { rows, couple, updateCouple } = useAtlas();
  const { openSheet } = useUI();
  const list = rows('special_dates')
    .map((d) => ({ d, next: nextOccurrence(d.date, d.recurring) }))
    .sort((a, b) => a.next.getTime() - b.next.getTime());
  return (
    <>
      <Section title="Juntos desde">
        <Glass className="p-5">
          {couple?.startedAt ? (
            <>
              <p className="text-[40px] font-bold leading-none tabular-nums tracking-tight">{daysBetween(new Date(couple.startedAt + 'T12:00'), new Date()).toLocaleString('pt-BR')}</p>
              <p className="mt-1 text-[14px] muted">dias juntos · desde {fmtDay(couple.startedAt, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </>
          ) : (
            <p className="text-[14px] muted">Defina a data em que começaram para ver o contador.</p>
          )}
          <input type="date" value={couple?.startedAt ?? ''} onChange={(e) => updateCouple({ startedAt: e.target.value || null })} className="input mt-4" />
        </Glass>
      </Section>
      <Section
        title="Datas especiais"
        action={
          <button onClick={() => openSheet('specialDate')} className="flex items-center gap-1 text-[13px] font-medium muted">
            <Plus size={14} /> Adicionar
          </button>
        }
      >
        {list.length === 0 ? (
          <Empty icon={<Heart size={20} />} title="Nenhuma data ainda" hint="Casamento, aniversários, viagens…" />
        ) : (
          <div className="glass overflow-hidden">
            {list.map(({ d, next }) => {
              const n = daysBetween(new Date(), next);
              const years = d.recurring ? next.getFullYear() - Number(d.date.slice(0, 4)) : 0;
              return (
                <button key={d.id} onClick={() => openSheet('specialDate', { date: d })} className="flex w-full items-center gap-3 border-b px-4 py-3.5 text-left last:border-0 hairline">
                  <span className="text-[22px]">{DATE_KINDS.find((k) => k.value === d.kind)?.emoji ?? '⭐'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">{d.title}</p>
                    <p className="text-[12px] muted">
                      {fmtDay(next, { day: 'numeric', month: 'long' })}
                      {years > 0 && ` · ${years} ${d.kind === 'aniversario' ? 'anos' : years === 1 ? 'ano' : 'anos'}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[20px] font-bold tabular-nums leading-none">{n === 0 ? '🎉' : n}</p>
                    {n > 0 && <p className="text-[11px] muted">dias</p>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Section>
    </>
  );
}

function GoalsView() {
  const { rows } = useAtlas();
  const { openSheet } = useUI();
  const goals = rows('goals');
  return (
    <Section
      title="Metas do casal"
      action={
        <button onClick={() => openSheet('goal')} className="flex items-center gap-1 text-[13px] font-medium muted">
          <Plus size={14} /> Nova meta
        </button>
      }
    >
      {goals.length === 0 ? (
        <Empty icon={<Heart size={20} />} title="Sem metas ainda" hint="Reserva, viagem, leitura, casa própria…" />
      ) : (
        <div className="space-y-3">
          {goals.map((g) => {
            const pct = g.target ? (g.current / g.target) * 100 : 0;
            const fmt = (n: number) => (g.unit === 'R$' ? money(n) : `${n.toLocaleString('pt-BR')} ${g.unit}`);
            return (
              <Glass key={g.id} className="p-4" onClick={() => openSheet('goal', { goal: g })}>
                <div className="flex items-center gap-3">
                  <span className="text-[26px]">{g.emoji ?? '🎯'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">{g.title}</p>
                    <p className="text-[12px] muted">
                      {fmt(g.current)} de {fmt(g.target)}
                      {g.dueDate && ` · até ${fmtDay(g.dueDate, { month: 'short', year: 'numeric' })}`}
                    </p>
                  </div>
                  <span className={cn('text-[17px] font-bold tabular-nums', pct >= 100 && 'text-emerald-500')}>{Math.round(pct)}%</span>
                </div>
                <Progress value={pct} className="mt-3" />
              </Glass>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function PrayerView() {
  const { rows, nameOf } = useAtlas();
  const { openSheet } = useUI();
  const [tab, setTab] = useState<'open' | 'answered'>('open');
  const list = rows('prayers')
    .filter((p) => (tab === 'open' ? !p.answered : p.answered))
    .sort((a, b) => (b.answeredAt ?? b.createdAt).localeCompare(a.answeredAt ?? a.createdAt));
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <Chip active={tab === 'open'} onClick={() => setTab('open')}>Orando</Chip>
          <Chip active={tab === 'answered'} onClick={() => setTab('answered')}>Respondidas 🙌</Chip>
        </div>
        <button onClick={() => openSheet('prayer')} className="flex items-center gap-1 text-[13px] font-medium muted">
          <Plus size={14} /> Pedido
        </button>
      </div>
      {list.length === 0 ? (
        <Empty icon={<Heart size={20} />} title={tab === 'open' ? 'Nenhum pedido em aberto' : 'Nenhuma resposta registrada ainda'} />
      ) : (
        <div className="glass overflow-hidden">
          {list.map((p) => (
            <button key={p.id} onClick={() => openSheet('prayer', { prayer: p })} className="block w-full border-b px-4 py-3.5 text-left last:border-0 hairline">
              <p className="text-[15px] font-semibold">{p.title}</p>
              {p.details && <p className="mt-0.5 text-[13px] muted">{p.details}</p>}
              {p.answered && p.answerNote && <p className="mt-1.5 text-[13px]">🙌 {p.answerNote}</p>}
              <p className="mt-1 text-[11px] muted">
                {nameOf(p.createdBy)} · {p.answered && p.answeredAt ? `respondida ${timeAgo(p.answeredAt)}` : timeAgo(p.createdAt)}
              </p>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
