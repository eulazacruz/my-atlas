'use client';

import { ArrowDownLeft, ArrowUpRight, Plus, Trash2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, XAxis } from 'recharts';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI } from '@/components/providers/UIProvider';
import { Avatar, Glass, IconButton, PageHeader, Progress, Section, Segmented } from '@/components/ui/primitives';
import { ACCENT } from '@/lib/constants';
import { addDays, cn, firstName, fmtDay, money, MONTHS, WEEK_LETTERS, ymd } from '@/lib/utils';

export function FinanceScreen() {
  const { rows, me, couple, remove } = useAtlas();
  const { openSheet } = useUI();
  const { resolvedTheme } = useTheme();
  const [tab, setTab] = useState<'all' | 'shared' | 'individual'>('all');
  const [showAll, setShowAll] = useState(false);
  if (!me || !couple) return null;

  const now = new Date();
  const month = ymd().slice(0, 7);
  const tx = rows('transactions');
  const mtx = tx.filter((t) => t.occurredOn.startsWith(month));
  const income = mtx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const out = mtx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - out;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daily = couple.monthlyBudget / daysInMonth;
  const fg = resolvedTheme === 'light' ? '#0a0a0a' : '#ffffff';
  const sub = resolvedTheme === 'light' ? '#c4c4c8' : '#3a3a3d';

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(now, i - 6);
    return { day: WEEK_LETTERS[d.getDay()], total: tx.filter((t) => t.type === 'expense' && t.occurredOn === ymd(d)).reduce((s, t) => s + t.amount, 0) };
  });
  const shared = mtx.filter((t) => t.type === 'expense' && t.scope === 'shared');
  const sharedTotal = shared.reduce((s, t) => s + t.amount, 0) || 1;
  const people = rows('profiles').map((p) => ({ p, total: shared.filter((t) => t.createdBy === p.id).reduce((s, t) => s + t.amount, 0) }));
  const cats = new Map<string, number>();
  mtx.filter((t) => t.type === 'expense').forEach((t) => cats.set(t.category, (cats.get(t.category) ?? 0) + t.amount));
  const topCats = [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const list = mtx.filter((t) => (tab === 'all' ? true : t.scope === tab)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div>
      <PageHeader
        title="Finanças"
        subtitle={MONTHS[now.getMonth()]}
        back
        actions={
          <IconButton label="Novo lançamento" onClick={() => openSheet('expense')}>
            <Plus size={20} />
          </IconButton>
        }
      />
      <Section>
        <Glass className="p-5">
          <p className="label">Saldo conjunto</p>
          <p className={cn('mt-1 text-[38px] font-bold tabular-nums tracking-[-0.03em]', balance < 0 && 'text-red-500')}>{money(balance)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="glass-thin p-3">
              <p className="flex items-center gap-1 text-[12px] muted"><ArrowDownLeft size={13} style={{ color: ACCENT.positive }} /> Entradas</p>
              <p className="text-[16px] font-bold tabular-nums">{money(income)}</p>
            </div>
            <div className="glass-thin p-3">
              <p className="flex items-center gap-1 text-[12px] muted"><ArrowUpRight size={13} style={{ color: ACCENT.negative }} /> Saídas</p>
              <p className="text-[16px] font-bold tabular-nums">{money(out)}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-[12px] muted">
              <span>Orçamento usado</span>
              <span>{money(out)} / {money(couple.monthlyBudget)}</span>
            </div>
            <Progress value={(out / couple.monthlyBudget) * 100} color={out > couple.monthlyBudget ? ACCENT.negative : undefined} />
          </div>
        </Glass>
      </Section>

      <Section title="Gastos da semana">
        <Glass className="p-4">
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={week} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: resolvedTheme === 'light' ? '#888' : '#8a8a8a', fontSize: 11 }} />
                <ReferenceLine y={daily} stroke={resolvedTheme === 'light' ? '#999' : '#666'} strokeDasharray="4 4" />
                <Bar dataKey="total" radius={[8, 8, 8, 8]} maxBarSize={22}>
                  {week.map((w, i) => (
                    <Cell key={i} fill={w.total > daily ? fg : sub} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] muted">Linha tracejada = limite diário ({money(daily)}). Barras escuras passaram do limite.</p>
        </Glass>
      </Section>

      <Section title="Quem pagou as despesas da casa">
        <Glass className="p-4">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/[0.08]">
            {people.map(({ p, total }, i) => (
              <div key={p.id} className={i === 0 ? 'bg-black dark:bg-white' : 'bg-neutral-400 dark:bg-neutral-600'} style={{ width: `${(total / sharedTotal) * 100}%` }} />
            ))}
          </div>
          <div className="mt-3 space-y-2">
            {people.map(({ p, total }) => (
              <div key={p.id} className="flex items-center gap-2">
                <Avatar profile={p} size={22} />
                <span className="flex-1 text-[14px]">{p.id === me.id ? 'Você' : firstName(p.displayName)}</span>
                <span className="text-[14px] font-semibold tabular-nums">{money(total)}</span>
                <span className="w-10 text-right text-[12px] muted">{Math.round((total / sharedTotal) * 100)}%</span>
              </div>
            ))}
          </div>
        </Glass>
      </Section>

      {topCats.length > 0 && (
        <Section title="Por categoria">
          <Glass className="space-y-2.5 p-4">
            {topCats.map(([c, v]) => (
              <div key={c} className="flex items-center gap-3">
                <span className="w-24 shrink-0 truncate text-[13px]">{c}</span>
                <Progress value={(v / topCats[0][1]) * 100} className="flex-1" />
                <span className="w-24 text-right text-[13px] tabular-nums">{money(v)}</span>
              </div>
            ))}
          </Glass>
        </Section>
      )}

      <Section title="Lançamentos">
        <div className="mb-3">
          <Segmented id="fin-tab" value={tab} onChange={setTab} options={[{ value: 'all', label: 'Todas' }, { value: 'shared', label: 'Nossas' }, { value: 'individual', label: 'Individuais' }]} />
        </div>
        <div className="glass overflow-hidden">
          {list.length === 0 && <p className="px-4 py-5 text-[14px] muted">Nada lançado aqui ainda.</p>}
          {(showAll ? list : list.slice(0, 8)).map((t) => {
            const by = rows('profiles').find((p) => p.id === t.createdBy);
            return (
              <div key={t.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0 hairline">
                <Avatar profile={by} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{t.description}</p>
                  <p className="text-[12px] muted">
                    {t.category} · {fmtDay(t.occurredOn)} · {t.scope === 'shared' ? 'Nossa' : 'Individual'}
                  </p>
                </div>
                <p className={cn('text-[15px] font-semibold tabular-nums', t.type === 'income' && 'text-emerald-600 dark:text-emerald-400')}>
                  {t.type === 'income' ? '+' : '−'}
                  {money(t.amount)}
                </p>
                {t.createdBy === me.id && (
                  <button aria-label="Excluir" onClick={() => window.confirm('Excluir este lançamento?') && remove('transactions', t.id)} className="grid h-7 w-7 place-items-center rounded-full muted">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {list.length > 8 && (
          <button onClick={() => setShowAll((s) => !s)} className="mt-2 w-full py-2 text-center text-[13px] font-medium muted">
            {showAll ? 'Mostrar menos' : `Ver todos (${list.length})`}
          </button>
        )}
      </Section>
    </div>
  );
}
