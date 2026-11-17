'use client';
/* Alimentação: registro de refeições com a tabela TACO (offline), metas simples e prato equilibrado. */
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI } from '@/components/providers/UIProvider';
import { Photo, useEntries, useEntryActions } from '@/components/ui/Collection';
import { Button, Chip, Glass, Section, Sheet } from '@/components/ui/primitives';
import { uploadPhoto } from '@/lib/files';
import { playSound } from '@/lib/fx';
import type { Entry } from '@/lib/types';
import { addDays, cn, firstName, fmtDay, parseYmd, ymd } from '@/lib/utils';
import { EMERALD, norm, useLocal } from './kit';

type Food = [string, number, number | null, number | null, number | null, number | null, number | null]; // nome, cat, kcal, prot, carb, gord, fibra (por 100 g)
let TACO: { cats: string[]; items: Food[] } | null = null;
async function loadTaco() {
  if (TACO) return TACO;
  TACO = await fetch('/data/taco.json').then((r) => r.json());
  return TACO!;
}
const MEALS = ['Café da manhã', 'Almoço', 'Lanche', 'Jantar', 'Ceia'];
const mealNow = () => { const h = new Date().getHours(); return h < 10 ? 0 : h < 15 ? 1 : h < 18 ? 2 : h < 22 ? 3 : 4; };
interface Item { name: string; g: number; kcal: number; p: number; c: number; f: number; cat: number }
const FRUITVEG = [1, 2];
const PROTEIN = [4, 5, 8, 13];

function totals(list: Entry[]) {
  const items: Item[] = list.flatMap((e) => e.data?.items ?? []);
  const sum = (k: 'kcal' | 'p' | 'c' | 'f') => Math.round(items.reduce((s, i) => s + (i[k] || 0), 0));
  return { kcal: sum('kcal') + list.reduce((s, e) => s + (Number(e.data?.extraKcal) || 0), 0), p: sum('p'), c: sum('c'), f: sum('f'), fv: items.filter((i) => FRUITVEG.includes(i.cat)).length, prot: items.some((i) => PROTEIN.includes(i.cat)) };
}

export function NutritionTool() {
  const { me, partner } = useAtlas();
  const { navigate } = useUI();
  const [day, setDay] = useState(ymd());
  const [who, setWho] = useState<'me' | 'partner'>('me');
  const [goals, setGoals] = useLocal('my-atlas:nutri-goals', { kcal: 2000, p: 100, fv: 5 });
  const [adding, setAdding] = useState(false);
  const [editGoals, setEditGoals] = useState(false);
  const uid = who === 'me' ? me?.id : partner?.id;
  const all = useEntries('meal').filter((e) => e.createdBy === uid);
  const list = all.filter((e) => e.date === day).sort((a, b) => (a.data?.meal ?? 0) - (b.data?.meal ?? 0));
  const t = totals(list);
  const week = Array.from({ length: 7 }, (_, i) => { const d = ymd(addDays(parseYmd(day), i - 6)); return { d, ...totals(all.filter((e) => e.date === d)) }; });
  const maxK = Math.max(goals.kcal, ...week.map((w) => w.kcal));
  const ring = (v: number, g: number) => Math.min(1, g ? v / g : 0);
  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => setDay(ymd(addDays(parseYmd(day), -1)))} className="glass grid h-10 w-10 place-items-center !rounded-full"><ChevronLeft size={18} /></button>
        <p className="flex-1 text-center text-[15px] font-semibold capitalize">{day === ymd() ? 'Hoje' : fmtDay(parseYmd(day), { weekday: 'long', day: 'numeric', month: 'short' })}</p>
        <button disabled={day >= ymd()} onClick={() => setDay(ymd(addDays(parseYmd(day), 1)))} className="glass grid h-10 w-10 place-items-center !rounded-full disabled:opacity-30"><ChevronRight size={18} /></button>
      </div>
      {partner && <div className="mb-4 flex gap-2"><Chip active={who === 'me'} onClick={() => setWho('me')}>Eu</Chip><Chip active={who === 'partner'} onClick={() => setWho('partner')}>{firstName(partner.displayName)}</Chip></div>}

      <Glass className="p-5" onClick={() => who === 'me' && setEditGoals(true)}>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { l: 'kcal', v: t.kcal, g: goals.kcal },
            { l: 'proteína', v: t.p, g: goals.p, u: 'g' },
            { l: 'frutas/verduras', v: t.fv, g: goals.fv },
          ].map((x) => (
            <div key={x.l}>
              <div className="relative mx-auto h-20 w-20">
                <svg viewBox="0 0 80 80" className="-rotate-90"><circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeOpacity={0.08} strokeWidth="8" /><motion.circle cx="40" cy="40" r="34" fill="none" stroke={EMERALD} strokeWidth="8" strokeLinecap="round" strokeDasharray={213.6} initial={{ strokeDashoffset: 213.6 }} animate={{ strokeDashoffset: 213.6 * (1 - ring(x.v, x.g)) }} transition={{ type: 'spring', stiffness: 80, damping: 18 }} /></svg>
                <span className="absolute inset-0 grid place-items-center text-[16px] font-bold tabular-nums">{x.v}{x.u ?? ''}</span>
              </div>
              <p className="mt-1 text-[11.5px] muted">{x.l}<br />meta {x.g}{x.u ?? ''}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-center gap-4 text-[12.5px]">
          <span className={cn(t.fv >= 2 ? 'font-semibold' : 'muted')}>{t.fv >= 2 ? '✅' : '⬜'} Metade do prato com vegetais</span>
          <span className={cn(t.prot ? 'font-semibold' : 'muted')}>{t.prot ? '✅' : '⬜'} Proteína</span>
        </div>
        <p className="mt-2 text-center text-[11.5px] muted">Carboidratos {t.c}g · Gorduras {t.f}g</p>
      </Glass>

      <Section className="mt-6" title="Refeições" action={who === 'me' ? <button onClick={() => setAdding(true)} className="text-[13px] font-semibold" style={{ color: EMERALD }}>+ Registrar</button> : undefined}>
        {list.length === 0 ? (
          <Glass className="p-5 text-center" onClick={() => who === 'me' && setAdding(true)}><p className="text-[30px]">🍽️</p><p className="mt-1 text-[14px] muted">{who === 'me' ? 'Toque para registrar a primeira refeição' : 'Nada registrado'}</p></Glass>
        ) : (
          <div className="space-y-2">{list.map((e) => <MealCard key={e.id} e={e} mine={who === 'me'} />)}</div>
        )}
      </Section>

      <Section title="Últimos 7 dias">
        <Glass className="p-4">
          <div className="flex h-28 items-end gap-2">
            {week.map((w) => (
              <button key={w.d} onClick={() => setDay(w.d)} className="flex flex-1 flex-col items-center gap-1">
                <motion.span initial={{ height: 0 }} animate={{ height: `${(w.kcal / maxK) * 88}px` }} className="w-full rounded-lg" style={{ background: w.d === day ? EMERALD : 'currentColor', opacity: w.d === day ? 1 : 0.15 }} />
                <span className="text-[10.5px] muted">{fmtDay(parseYmd(w.d), { weekday: 'narrow' })}</span>
              </button>
            ))}
          </div>
        </Glass>
      </Section>
      <Button className="w-full" onClick={() => navigate('col', 'recipe')}>🍲 Receitas da casa → lista de compras</Button>
      <p className="mt-3 px-1 text-[11.5px] muted">Valores por 100 g da Tabela Brasileira de Composição de Alimentos (TACO 4ª ed., NEPA/UNICAMP). Estimativas, não prescrição: para dietas específicas, fale com um nutricionista.</p>

      <AddMeal open={adding} day={day} onClose={() => setAdding(false)} />
      <Sheet open={editGoals} onClose={() => setEditGoals(false)} title="Minhas metas">
        <GoalsForm goals={goals} onSave={(g) => { setGoals(g); setEditGoals(false); }} />
      </Sheet>
    </>
  );
}

function GoalsForm({ goals, onSave }: { goals: { kcal: number; p: number; fv: number }; onSave: (g: { kcal: number; p: number; fv: number }) => void }) {
  const [g, setG] = useState(goals);
  return (
    <div className="space-y-3">
      {([['kcal', 'Calorias por dia'], ['p', 'Proteína (g)'], ['fv', 'Porções de frutas e verduras']] as const).map(([k, l]) => (
        <label key={k} className="block"><span className="text-[13px] muted">{l}</span><input inputMode="numeric" value={g[k]} onChange={(e) => setG({ ...g, [k]: Number(e.target.value) || 0 })} className="input mt-1" /></label>
      ))}
      <Button variant="primary" className="w-full" onClick={() => onSave(g)}>Salvar</Button>
    </div>
  );
}

function MealCard({ e, mine }: { e: Entry; mine: boolean }) {
  const { del } = useEntryActions();
  const t = totals([e]);
  return (
    <Glass className="flex gap-3 p-3.5">
      {e.data?.photo ? <Photo path={e.data.photo} className="h-16 w-16 shrink-0 rounded-2xl" /> : <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-black/[0.04] text-[26px] dark:bg-white/[0.06]">{['☕', '🍛', '🍎', '🍲', '🌙'][e.data?.meal ?? 1]}</span>}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between"><p className="text-[14.5px] font-semibold">{MEALS[e.data?.meal ?? 1]}</p><p className="text-[13px] font-bold tabular-nums">{t.kcal} kcal</p></div>
        <p className="line-clamp-2 text-[12.5px] muted">{(e.data?.items ?? []).map((i: Item) => `${i.name.split(',')[0]} ${i.g}g`).join(' · ') || e.title}</p>
      </div>
      {mine && <button onClick={() => del(e.id)} className="self-start muted"><Trash2 size={15} /></button>}
    </Glass>
  );
}

function AddMeal({ open, day, onClose }: { open: boolean; day: string; onClose: () => void }) {
  const { state, mode } = useAtlas();
  const { put } = useEntryActions();
  const recipes = useEntries('recipe');
  const [meal, setMeal] = useState(mealNow());
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState('');
  const [taco, setTaco] = useState<typeof TACO>(null);
  const [pick, setPick] = useState<Food | null>(null);
  const [g, setG] = useState(100);
  const [photo, setPhoto] = useState<string | null>(null);
  const [extra, setExtra] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => { if (open) { loadTaco().then(setTaco); setMeal(mealNow()); } }, [open]);
  const res = useMemo(() => {
    if (!taco || q.trim().length < 2) return [];
    const words = norm(q).split(/\s+/).filter(Boolean);
    return taco.items.filter((f) => { const n = norm(f[0]); return words.every((w) => n.includes(w)); }).sort((a, b) => a[0].length - b[0].length).slice(0, 25);
  }, [q, taco]);
  const add = () => {
    if (!pick) return;
    const k = g / 100;
    setItems([...items, { name: pick[0], g, cat: pick[1], kcal: Math.round((pick[2] ?? 0) * k), p: Math.round((pick[3] ?? 0) * k * 10) / 10, c: Math.round((pick[4] ?? 0) * k * 10) / 10, f: Math.round((pick[5] ?? 0) * k * 10) / 10 }]);
    setPick(null); setQ(''); setG(100); playSound('pop');
  };
  const save = () => {
    put('meal', { title: note || items.map((i) => i.name.split(',')[0]).join(', ') || MEALS[meal], date: day, data: { meal, items, photo, extraKcal: Number(extra) || 0 } });
    setItems([]); setPhoto(null); setExtra(''); setNote('');
    playSound('done');
    onClose();
  };
  const t = totals([{ data: { items, extraKcal: Number(extra) || 0 } } as unknown as Entry]);
  return (
    <Sheet open={open} onClose={onClose} title="Registrar refeição" footer={<Button variant="primary" className="w-full" disabled={!items.length && !note && !photo} onClick={save}>Salvar · {t.kcal} kcal</Button>}>
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">{MEALS.map((m, i) => <Chip key={m} active={meal === i} onClick={() => setMeal(i)}>{m}</Chip>)}</div>
      <div className="mt-4 flex items-center gap-3">
        {photo ? <Photo path={photo} className="h-16 w-16 rounded-2xl" /> : null}
        <label className="glass-thin cursor-pointer px-4 py-2.5 text-[14px] font-medium">📷 {photo ? 'Trocar foto' : 'Foto do prato'}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f && state) setPhoto(await uploadPhoto(f, state.couple.id, mode === 'demo')); }} />
        </label>
      </div>
      {items.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {items.map((i, j) => (
            <div key={j} className="glass-thin flex items-center gap-2 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-[13.5px]">{i.name} · {i.g}g</span>
              <span className="text-[12.5px] font-semibold tabular-nums">{i.kcal} kcal</span>
              <button onClick={() => setItems(items.filter((_, k) => k !== j))} className="muted"><X size={14} /></button>
            </div>
          ))}
        </div>
      )}
      <div className="relative mt-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 muted" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setPick(null); }} placeholder={taco ? 'Buscar alimento (ex.: arroz cozido)' : 'Carregando tabela…'} className="input !pl-10" />
      </div>
      <AnimatePresence>
        {pick ? (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="glass mt-2 p-4">
            <p className="text-[14.5px] font-semibold">{pick[0]}</p>
            <p className="text-[12px] muted">{pick[2] ?? '–'} kcal · {pick[3] ?? '–'}g proteína por 100 g</p>
            <div className="mt-3 flex flex-wrap gap-1.5">{[30, 50, 100, 150, 200, 300].map((x) => <Chip key={x} active={g === x} onClick={() => setG(x)}>{x}g</Chip>)}<input inputMode="numeric" value={g} onChange={(e) => setG(Number(e.target.value) || 0)} className="input !h-9 !w-20 !py-1" /></div>
            <Button variant="primary" className="mt-3 w-full" onClick={add}><Plus size={15} /> Adicionar · {Math.round(((pick[2] ?? 0) * g) / 100)} kcal</Button>
          </motion.div>
        ) : res.length > 0 && (
          <div className="glass mt-2 max-h-64 overflow-y-auto">
            {res.map((f) => <button key={f[0]} onClick={() => setPick(f)} className="flex w-full items-center gap-2 border-b px-4 py-2.5 text-left last:border-0 hairline"><span className="flex-1 text-[13.5px]">{f[0]}</span><span className="text-[11.5px] muted">{f[2] ?? '–'} kcal</span></button>)}
          </div>
        )}
      </AnimatePresence>
      {recipes.length > 0 && !q && (
        <div className="mt-4">
          <p className="mb-1.5 text-[12.5px] muted">Ou uma receita da casa</p>
          <div className="flex flex-wrap gap-1.5">{recipes.slice(0, 8).map((r) => <Chip key={r.id} active={note === r.title} onClick={() => setNote(note === r.title ? '' : r.title)}>🍲 {r.title}</Chip>)}</div>
        </div>
      )}
      <label className="mt-4 block"><span className="text-[12.5px] muted">Calorias extras (opcional, ex.: receita)</span><input inputMode="numeric" value={extra} onChange={(e) => setExtra(e.target.value)} className="input mt-1" placeholder="0" /></label>
    </Sheet>
  );
}
