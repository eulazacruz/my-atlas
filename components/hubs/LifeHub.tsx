'use client';

import { motion } from 'framer-motion';
import { Heart, Lock, ShoppingCart, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI } from '@/components/providers/UIProvider';
import { CollectionScreen, EntrySheet, Photo, Sorteio, useEntries, useEntryActions } from '@/components/ui/Collection';
import { Button, Chip, Glass, PageHeader, Section, Sheet } from '@/components/ui/primitives';
import { KINDS } from '@/lib/entries';
import { PrivateGate } from '@/components/fx/MoreSettings';
import { haptic } from '@/lib/native';
import type { Entry } from '@/lib/types';
import { addDays, cn, daysBetween, firstName, fmtDay, money, parseYmd, uid, ymd } from '@/lib/utils';
import { HubTiles, GoalQuick } from './FocusHub';
import { DevotionalCard, MemoryReview, ReadingMap, SpiritualYear, Testimonies, PeopleDue } from './FaithHub';

/* ───────── Noite do casal ───────── */
const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DATE_IDEAS = [
  'Jantar à luz de velas em casa, sem celular',
  'Cozinhar juntos uma receita nova',
  'Piquenique na praia de Maria Farinha ou no parque',
  'Cinema em casa com pipoca e o filme sorteado',
  'Caminhada ao pôr do sol',
  'Noite de jogos de tabuleiro ou cartas',
  'Ler um capítulo de um livro em voz alta, um para o outro',
  'Café da manhã especial no fim de semana',
  'Revisitar o lugar do primeiro encontro',
  'Noite de perguntas: “o que você sonha para nós daqui a 5 anos?”',
  'Sorvete e conversa no Recife Antigo',
  'Fazer uma playlist juntos e dançar na sala',
];
export function useCoupleNight() {
  const all = useEntries('setting');
  return all.find((e) => e.title === 'couple_night');
}
export function CoupleNightCard({ compact = false }: { compact?: boolean }) {
  const cfg = useCoupleNight();
  const { put } = useEntryActions();
  const [edit, setEdit] = useState(false);
  const [day, setDay] = useState(cfg?.data?.day ?? 5);
  const [time, setTime] = useState(cfg?.data?.time ?? '20:00');
  const today = new Date().getDay();
  const idea = DATE_IDEAS[Math.floor(Date.now() / 86_400_000 / 7) % DATE_IDEAS.length];
  if (!cfg && compact) return null;
  if (compact && cfg && today !== cfg.data.day && (today + 1) % 7 !== cfg.data.day) return null;
  return (
    <>
      <Glass className="p-4" onClick={() => !cfg && setEdit(true)}>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl text-white" style={{ background: 'linear-gradient(135deg,#F472B6,#E11D48)' }}><Heart size={18} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">Noite do casal{cfg ? ` · ${WEEKDAYS[cfg.data.day]} ${cfg.data.time}` : ''}</p>
            <p className="text-[12.5px] muted">{cfg ? (today === cfg.data.day ? 'É hoje! 🤍' : (today + 1) % 7 === cfg.data.day ? 'É amanhã' : 'Toda semana, protegida na agenda') : 'Escolham um dia fixo da semana só de vocês'}</p>
          </div>
          {cfg && <button onClick={(e) => { e.stopPropagation(); setEdit(true); }} className="text-[12px] font-semibold muted">Mudar</button>}
        </div>
        {cfg && <p className="mt-3 rounded-2xl bg-black/[0.04] px-3 py-2.5 text-[13.5px] dark:bg-white/[0.05]">💡 {idea}</p>}
      </Glass>
      <Sheet open={edit} onClose={() => setEdit(false)} title="Noite do casal" footer={<Button variant="primary" className="w-full" onClick={() => { put('setting', { title: 'couple_night', data: { day, time } }, cfg); setEdit(false); haptic('success'); }}>Salvar</Button>}>
        <div className="space-y-4 pt-1">
          <div className="flex flex-wrap gap-1.5">{WEEKDAYS.map((w, i) => <Chip key={w} active={day === i} onClick={() => setDay(i)}>{w}</Chip>)}</div>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input" />
          <p className="text-[12.5px] muted">Vocês recebem um lembrete na véspera e no dia, com uma sugestão do que fazer.</p>
        </div>
      </Sheet>
    </>
  );
}

/* ───────── Cápsula do casal ───────── */
function Capsules() {
  const { me, nameOf } = useAtlas();
  const all = useEntries('capsule').sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  const [open, setOpen] = useState<Entry | null>(null);
  const [creating, setCreating] = useState(false);
  return (
    <>
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {all.map((c) => {
          const locked = (c.date ?? '9999') > ymd() && c.createdBy !== me?.id;
          const left = c.date ? daysBetween(new Date(), parseYmd(c.date)) : 0;
          return (
            <motion.button whileTap={{ scale: 0.96 }} key={c.id} onClick={() => !locked && setOpen(c)} className="w-[170px] shrink-0 rounded-[24px] p-4 text-left text-white" style={{ background: locked ? 'linear-gradient(150deg,#27272a,#09090b)' : 'linear-gradient(150deg,#fb7185,#be123c)' }}>
              <span className="text-[24px]">{locked ? '🔒' : '💌'}</span>
              <p className="mt-2 line-clamp-2 text-[14px] font-semibold leading-snug">{c.title}</p>
              <p className="mt-1 text-[11px] opacity-70">{locked ? `Abre em ${left} dia(s)` : `De ${firstName(nameOf(c.createdBy))}`}</p>
            </motion.button>
          );
        })}
        <button onClick={() => setCreating(true)} className="glass-thin grid w-24 shrink-0 place-items-center !rounded-[24px] text-[13px] muted">+ Nova</button>
      </div>
      <EntrySheet cfg={KINDS.capsule} open={creating} onClose={() => setCreating(false)} preset={{ date: ymd(addDays(new Date(), 365)) }} />
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.title ?? ''}>
        <p className="whitespace-pre-wrap pb-3 font-serif text-[17px] leading-relaxed">{open?.body}</p>
        <p className="pb-2 text-[12px] muted">{open ? `De ${firstName(nameOf(open.createdBy))} · para abrir em ${open.date ? fmtDay(parseYmd(open.date), { day: 'numeric', month: 'long', year: 'numeric' }) : ''}` : ''}</p>
      </Sheet>
    </>
  );
}

/* ───────── Receitas → lista de compras ───────── */
export function RecipeToShopping({ e }: { e: Entry }) {
  const { me, rows, save, alert } = useAtlas();
  const ing = (e.data?.ingredients ?? []) as string[];
  if (!ing.length || !me) return null;
  const add = () => {
    const have = new Set(rows('shopping_items').filter((i) => !i.checked).map((i) => i.name.toLowerCase()));
    let n = 0;
    ing.forEach((name) => {
      if (have.has(name.toLowerCase())) return;
      save('shopping_items', { id: uid(), createdBy: me.id, name, qty: null, category: 'Mercado', checked: false, createdAt: new Date().toISOString() });
      n++;
    });
    alert({ kind: 'shopping', title: `${n} ingrediente(s) na lista 🛒`, subtitle: e.title, duration: 3000 });
  };
  return <div className="px-4 pb-3"><Button className="h-8 px-3 text-[12px]" onClick={add}><ShoppingCart size={13} /> Ingredientes → compras</Button></div>;
}

/* ───────── Tela Casa & lazer ───────── */
export function LifeHub() {
  const watch = useEntries('watch').filter((w) => w.data?.status !== 'Visto');
  const places = useEntries('place').filter((p) => p.data?.again);
  const docs = useEntries('document').filter((d) => d.date && daysBetween(new Date(), parseYmd(d.date)) <= 30);
  const trips = useEntries('trip').filter((t) => (t.data?.end ?? t.date ?? '') >= ymd());
  return (
    <div>
      <PageHeader title="Casa & lazer" subtitle="Vida a dois" back />
      <Section><CoupleNightCard /></Section>
      {docs.length > 0 && (
        <Section title="Vencendo em breve">
          <div className="glass overflow-hidden">
            {docs.map((d) => {
              const left = daysBetween(new Date(), parseYmd(d.date!));
              return <div key={d.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0 hairline"><span>🧾</span><p className="flex-1 truncate text-[14.5px]">{d.title}</p><span className={cn('text-[12px] font-semibold', left < 0 ? 'text-red-500' : 'text-amber-500')}>{left < 0 ? 'vencido' : `${left} dias`}</span></div>;
            })}
          </div>
        </Section>
      )}
      {trips[0] && (
        <Section title="Próxima viagem">
          <Glass className="p-4">
            <p className="text-[17px] font-bold">✈️ {trips[0].title}</p>
            <p className="text-[12.5px] muted">{trips[0].date ? fmtDay(parseYmd(trips[0].date), { day: 'numeric', month: 'short' }) : ''}{trips[0].data?.budget ? ` · ${money(trips[0].data.spent ?? 0)} de ${money(trips[0].data.budget)}` : ''}</p>
            {trips[0].data?.packing?.length > 0 && <p className="mt-1 text-[12.5px] muted">Mala: {trips[0].data.packing.filter((p: { done: boolean }) => p.done).length}/{trips[0].data.packing.length} itens</p>}
          </Glass>
        </Section>
      )}
      <Section title="O que assistir hoje?"><Sorteio items={watch.map((w) => w.title)} label="Sortear filme" /></Section>
      <Section title="Aonde ir?"><Sorteio items={places.map((p) => p.title)} label="Sortear lugar" /></Section>
      <Section title="Cápsula do casal"><Capsules /></Section>
      <Section title="Organizar"><HubTiles kinds={['recipe', 'watch', 'place', 'trip', 'plan', 'document']} /></Section>
    </div>
  );
}

/* ───────── Tela genérica "col" com extras por tipo ───────── */
export function ColScreen() {
  const { param } = useUI();
  const kind = (param ?? 'idea').replace(/^[a-z]:/, '');
  const watch = useEntries('watch').filter((w) => w.data?.status !== 'Visto').map((w) => w.title);
  if (!KINDS[kind]) return null;
  const extra = kind === 'recipe' ? (e: Entry) => <RecipeToShopping e={e} /> : kind === 'goal' ? (e: Entry) => <GoalQuick e={e} /> : undefined;
  if (kind === 'emotion' || kind === 'measure') return <PrivateGate><CollectionScreen kind={kind} /></PrivateGate>;
  return (
    <CollectionScreen kind={kind} extraRow={extra}>
      {kind === 'memory' && <Section><MemoryReview /></Section>}
      {kind === 'devotional' && <Section><DevotionalCard /></Section>}
      {kind === 'testimony' && <Section><Testimonies /></Section>}
      {kind === 'person' && <Section title="Para falar logo"><PeopleDue /></Section>}
      {kind === 'watch' && <Section><Sorteio items={watch} label="Sortear" /></Section>}
    </CollectionScreen>
  );
}
export { GoalQuick, Lock, Photo, ReadingMap, SpiritualYear, Sparkles };
