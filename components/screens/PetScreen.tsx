'use client';
import { useSticky } from '@/lib/sticky';

import { motion } from 'framer-motion';
import { AlertTriangle, Bath, Bone, Footprints, Syringe } from 'lucide-react';
import { useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { Pitbull } from '@/components/ui/Pitbull';
import { Avatar, Button, Glass, PageHeader, Progress, Section, Segmented } from '@/components/ui/primitives';
import { ACCENT, HOUSE_TASKS, PET_ACTIONS } from '@/lib/constants';
import { petStats } from '@/lib/pet';
import type { Vaccine } from '@/lib/types';
import { addDays, addMonths, daysBetween, firstName, fmtDay, hhmm, parseYmd, uid, WEEK_LETTERS, ymd } from '@/lib/utils';

function status(v: Vaccine) {
  if (!v.validUntil) return { label: 'Sem registro', tone: ACCENT.negative };
  const d = daysBetween(new Date(), parseYmd(v.validUntil));
  if (d < 0) return { label: `Vencida há ${-d}d`, tone: ACCENT.negative };
  if (d <= 15) return { label: `Vence em ${d}d`, tone: ACCENT.warn };
  return { label: `Em dia até ${fmtDay(v.validUntil, { month: '2-digit', year: '2-digit' })}`, tone: null };
}

export function VirtualAtlas({ compact = false }: { compact?: boolean }) {
  const { rows, petAction, nameOf, me } = useAtlas();
  const st = petStats(rows('pet_virtual_state')[0], rows('habit_logs'), rows('household_tasks'));
  const last = rows('pet_virtual_state')[0];
  return (
    <Glass className={compact ? 'p-4' : 'p-5'}>
      <div className="flex items-center justify-between">
        <div>
          <p className="label">Atlas virtual · nível {st.level}</p>
          <p className="text-[19px] font-bold tracking-tight">{st.label}</p>
        </div>
        <span className="rounded-full bg-black/[0.06] px-3 py-1 text-[12px] font-semibold tabular-nums dark:bg-white/[0.08]">{st.xp} XP</span>
      </div>
      <div className="flex justify-center py-1">
        <Pitbull pose={st.pose} size={compact ? 170 : 230} />
      </div>
      <div className="space-y-2.5">
        {[
          { l: 'Felicidade', v: st.happiness },
          { l: 'Energia', v: st.energy },
          { l: `Nível ${st.level} → ${st.level + 1}`, v: st.levelPct },
        ].map((b) => (
          <div key={b.l} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-[12px] muted">{b.l}</span>
            <Progress value={b.v} className="flex-1" />
            <span className="w-9 text-right text-[12px] font-semibold tabular-nums">{Math.round(b.v)}%</span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {PET_ACTIONS.map((a) => (
          <motion.button key={a.kind} whileTap={{ scale: 0.9 }} onClick={() => petAction(a.kind)} className="glass-thin flex flex-col items-center gap-1 py-2.5">
            <span className="text-[20px]">{a.emoji}</span>
            <span className="text-center text-[10.5px] font-medium leading-tight">{a.label}</span>
          </motion.button>
        ))}
      </div>
      {!compact && last?.lastActionAt && (
        <p className="mt-3 text-center text-[12px] muted">
          Última interação: {last.lastActionBy === me?.id ? 'você' : nameOf(last.lastActionBy)} · {PET_ACTIONS.find((a) => a.kind === last.lastAction)?.label.toLowerCase()}
        </p>
      )}
      {!compact && <p className="mt-2 text-center text-[11px] muted">Ganha XP com hábitos batidos e tarefas da casa ({HOUSE_TASKS.map((h) => h.emoji).join(' ')}).</p>}
    </Glass>
  );
}

export function PetScreen() {
  const [tab, setTab] = useSticky<'virtual' | 'real'>('pet-tab', 'virtual');
  const { rows } = useAtlas();
  const pet = rows('pets')[0];
  return (
    <div>
      <PageHeader title={pet?.name ?? 'Pet'} subtitle={tab === 'virtual' ? 'Pet virtual · co-op' : pet?.breed ?? 'Prontuário'} back />
      <div className="mb-6">
        <Segmented id="pet-tab" value={tab} onChange={setTab} options={[{ value: 'virtual', label: 'Atlas virtual' }, { value: 'real', label: 'Prontuário & saúde' }]} />
      </div>
      {tab === 'virtual' ? (
        <Section>
          <VirtualAtlas />
        </Section>
      ) : (
        <PetHealth />
      )}
    </div>
  );
}

function PetHealth() {
  const { rows, me, save, patch, nameOf } = useAtlas();
  const pet = rows('pets')[0];
  if (!me) return null;
  if (!pet)
    return (
      <div>
        <p className="muted">Pet ainda não cadastrado.</p>
      </div>
    );

  const walks = rows('pet_walks').filter((w) => w.petId === pet.id).sort((a, b) => b.walkedAt.localeCompare(a.walkedAt));
  const todayWalks = walks.filter((w) => ymd(new Date(w.walkedAt)) === ymd());
  const bathDays = pet.lastBathAt ? daysBetween(new Date(pet.lastBathAt), new Date()) : null;
  const foodLeft = pet.foodRefilledAt ? pet.foodBagDays - daysBetween(new Date(pet.foodRefilledAt), new Date()) : 0;
  const vaccines = rows('pet_vaccines').filter((v) => v.petId === pet.id);
  const week = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i - 6));

  return (
    <div>

      <Section>
        <Glass className="flex items-center gap-4 p-5">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-black text-white dark:bg-white dark:text-black"><Bath size={24} /></span>
          <div className="flex-1">
            <p className="text-[13px] muted">Último banho</p>
            <p className="text-[22px] font-bold tracking-tight">{bathDays === null ? 'Sem registro' : bathDays === 0 ? 'Hoje ✨' : `há ${bathDays} dia${bathDays > 1 ? 's' : ''}`}</p>
          </div>
          <Button variant="primary" disabled={bathDays === 0} onClick={() => patch('pets', pet.id, { lastBathAt: new Date().toISOString() })}>Tomou banho hoje</Button>
        </Glass>
      </Section>
      <Section title="Hoje">
        <div className="grid grid-cols-3 gap-3">
          <Glass className="p-3.5">
            <Bath size={18} />
            <p className="mt-2.5 text-[26px] font-bold leading-none tabular-nums">{bathDays ?? '—'}<span className="text-[12px] font-medium muted">d</span></p>
            <p className="mt-1 text-[11px] muted">{bathDays === 0 ? 'Banho hoje ✨' : 'desde o banho'}</p>
            {bathDays !== null && bathDays >= 14 && <p className="mt-1 text-[11px] font-medium" style={{ color: ACCENT.warn }}>Hora do banho</p>}
          </Glass>
          <Glass className="p-3.5">
            <Footprints size={18} />
            <p className="mt-2.5 text-[26px] font-bold leading-none tabular-nums">{todayWalks.length}<span className="text-[12px] font-medium muted">x</span></p>
            <p className="mt-1 text-[11px] muted">{todayWalks[0] ? `${nameOf(todayWalks[0].walkedBy)} · ${hhmm(todayWalks[0].walkedAt)}` : 'sem passeio'}</p>
          </Glass>
          <Glass className="p-3.5">
            {foodLeft <= 5 ? <AlertTriangle size={18} style={{ color: ACCENT.warn }} /> : <Bone size={18} />}
            <p className="mt-2.5 text-[26px] font-bold leading-none tabular-nums">{Math.max(0, foodLeft)}<span className="text-[12px] font-medium muted">d</span></p>
            <p className="mt-1 text-[11px] muted">de ração</p>
            <Progress value={(Math.max(0, foodLeft) / pet.foodBagDays) * 100} className="mt-1.5" color={foodLeft <= 5 ? ACCENT.warn : undefined} />
          </Glass>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button onClick={() => patch('pets', pet.id, { lastBathAt: new Date().toISOString() })} disabled={bathDays === 0} className="px-2 text-[13px]">Dei banho</Button>
          <Button variant="primary" onClick={() => save('pet_walks', { id: uid(), petId: pet.id, walkedBy: me.id, walkedAt: new Date().toISOString() })} className="px-2 text-[13px]">Passeei</Button>
          <Button onClick={() => patch('pets', pet.id, { foodRefilledAt: new Date().toISOString() })} className="px-2 text-[13px]">Reabasteci</Button>
        </div>
      </Section>

      <Section title="Passeios da semana">
        <Glass className="p-4">
          <div className="flex justify-between">
            {week.map((d) => {
              const w = walks.filter((x) => ymd(new Date(x.walkedAt)) === ymd(d));
              const who = rows('profiles').find((p) => p.id === w[0]?.walkedBy);
              return (
                <div key={ymd(d)} className="flex flex-col items-center gap-1.5">
                  {who ? <Avatar profile={who} size={30} /> : <span className="h-[30px] w-[30px] rounded-full ring-1 ring-inset ring-black/15 dark:ring-white/15" />}
                  <span className="text-[11px] muted">{WEEK_LETTERS[d.getDay()]}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[12px] muted">
            Você: {walks.filter((w) => w.walkedBy === me.id && daysBetween(new Date(w.walkedAt), new Date()) < 7).length} · Seu par: {walks.filter((w) => w.walkedBy !== me.id && daysBetween(new Date(w.walkedAt), new Date()) < 7).length} nos últimos 7 dias
          </p>
        </Glass>
      </Section>

      <Section title="Cartão de vacinas">
        <div className="glass overflow-hidden">
          {vaccines.map((v) => {
            const s = status(v);
            return (
              <div key={v.id} className="flex items-center gap-3 border-b px-4 py-3.5 last:border-0 hairline">
                <Syringe size={17} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold">{v.name}</p>
                  <p className="text-[12px]" style={s.tone ? { color: s.tone } : undefined}>
                    <span className={s.tone ? '' : 'muted'}>{s.label}</span>
                    <span className="muted"> · a cada {v.intervalMonths} {v.intervalMonths === 1 ? 'mês' : 'meses'}</span>
                  </p>
                </div>
                <button
                  onClick={() => patch('pet_vaccines', v.id, { appliedOn: ymd(), validUntil: ymd(addMonths(new Date(), v.intervalMonths)) })}
                  className="h-8 rounded-full bg-black/[0.06] px-3 text-[12px] font-semibold dark:bg-white/[0.08]"
                >
                  Aplicada hoje
                </button>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Configurar">
        <Glass className="flex items-center gap-3 p-4">
          <p className="flex-1 text-[14px]">Um saco de ração dura</p>
          <input type="number" min={1} value={pet.foodBagDays} onChange={(e) => patch('pets', pet.id, { foodBagDays: Math.max(1, Number(e.target.value) || 30) })} className="w-16 rounded-xl bg-black/5 px-2 py-1.5 text-center outline-none dark:bg-white/10" />
          <span className="text-[13px] muted">dias</span>
        </Glass>
        <p className="mt-2 px-1 text-[12px] muted">Último passeio registrado por {walks[0] ? (walks[0].walkedBy === me.id ? 'você' : firstName(nameOf(walks[0].walkedBy))) : '—'}.</p>
      </Section>
    </div>
  );
}
