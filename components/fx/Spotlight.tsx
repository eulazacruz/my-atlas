'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, CalendarPlus, CheckSquare, Droplet, Dumbbell, HandHeart, Lightbulb, NotebookPen, Plus, Receipt, Search, ShoppingBag, Smile, Star, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI } from '@/components/providers/UIProvider';
import { openBibleAt } from '@/components/screens/BibleScreen';
import { EntrySheet } from '@/components/ui/Collection';
import { parseRef, refLabel, searchBible, type SearchHit } from '@/lib/bible';
import { KINDS } from '@/lib/entries';
import { playSound } from '@/lib/fx';
import { haptic } from '@/lib/native';
import { cn, money, uid, ymd } from '@/lib/utils';
import { newNote } from '@/components/screens/NotesScreen';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
type Hit = { id: string; icon: string; title: string; sub: string; go: () => void };

/** Busca geral: notas, tarefas, agenda, finanças, registros, oração, compras e Bíblia. */
export function Spotlight() {
  const { rows, nameOf } = useAtlas();
  const { navigate, openSheet, openNote } = useUI();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [bible, setBible] = useState<SearchHit[]>([]);
  const input = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const on = () => { setOpen(true); setQ(''); setBible([]); window.setTimeout(() => input.current?.focus(), 120); };
    window.addEventListener('atlas:search', on);
    return () => window.removeEventListener('atlas:search', on);
  }, []);
  useEffect(() => {
    if (!open || q.trim().length < 3 || parseRef(q)) { setBible([]); return; }
    let alive = true;
    const t = window.setTimeout(() => searchBible(q, 8).then((h) => alive && setBible(h)), 300);
    return () => { alive = false; window.clearTimeout(t); };
  }, [q, open]);
  const hits = useMemo<Hit[]>(() => {
    const term = norm(q.trim());
    if (term.length < 2) return [];
    const has = (...xs: (string | null | undefined)[]) => xs.some((x) => x && norm(x).includes(term));
    const close = (fn: () => void) => () => { setOpen(false); fn(); };
    const out: Hit[] = [];
    rows('notes').forEach((n) => { if (has(n.title, ...n.blocks.map((b) => b.text))) out.push({ id: n.id, icon: n.icon || '📝', title: n.title || 'Sem título', sub: 'Nota', go: close(() => { navigate('notes'); openNote(n.id); }) }); });
    rows('tasks').forEach((t) => { if (has(t.title)) out.push({ id: t.id, icon: t.done ? '✅' : '☑️', title: t.title, sub: 'Tarefa', go: close(() => openSheet('task', { task: t })) }); });
    rows('events').forEach((e) => { if (has(e.title, e.location)) out.push({ id: e.id, icon: '📅', title: e.title, sub: `Evento · ${new Date(e.startsAt).toLocaleDateString('pt-BR')}`, go: close(() => openSheet('event', { event: e })) }); });
    rows('transactions').forEach((t) => { if (has(t.description, t.category)) out.push({ id: t.id, icon: t.type === 'expense' ? '💸' : '💰', title: t.description, sub: `${t.category} · ${money(t.amount)}`, go: close(() => navigate('finance')) }); });
    rows('prayers').forEach((p) => { if (has(p.title, p.details)) out.push({ id: p.id, icon: '🙏', title: p.title, sub: `Oração · ${nameOf(p.createdBy).split(' ')[0]}`, go: close(() => navigate('couple')) }); });
    rows('shopping_items').forEach((i) => { if (has(i.name)) out.push({ id: i.id, icon: '🛒', title: i.name, sub: i.checked ? 'Compras · comprado' : 'Compras', go: close(() => navigate('shopping')) }); });
    rows('entries').forEach((e) => {
      const k = KINDS[e.kind];
      if (!k) return;
      if (has(e.title, e.body, ...Object.values(e.data ?? {}).filter((v) => typeof v === 'string'))) out.push({ id: e.id, icon: k.emoji, title: e.title || k.singular, sub: k.title, go: close(() => navigate('col', e.kind)) });
    });
    return out.slice(0, 40);
  }, [q, rows, navigate, openSheet, openNote, nameOf]);
  const ref = q.trim() ? parseRef(q) : null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
          <motion.div onClick={(e) => e.stopPropagation()} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="glass-strong mx-3 mt-[calc(2.5rem+var(--sat,0px))] max-h-[78vh] overflow-hidden !rounded-[28px]">
            <div className="flex items-center gap-2 border-b px-4 py-3 hairline">
              <Search size={18} className="muted" />
              <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar em tudo…" className="min-w-0 flex-1 bg-transparent text-[17px] outline-none" />
              <button onClick={() => setOpen(false)} aria-label="Fechar" className="muted"><X size={18} /></button>
            </div>
            <div className="max-h-[66vh] overflow-y-auto">
              {ref && (
                <button onClick={() => { setOpen(false); openBibleAt(ref); }} className="flex w-full items-center gap-3 border-b px-4 py-3 text-left hairline">
                  <BookOpen size={18} /><span className="flex-1 text-[15px] font-semibold">Abrir {refLabel(ref.book, ref.chapter, ref.verse)}</span>
                </button>
              )}
              {hits.map((h) => (
                <button key={h.id} onClick={h.go} className="flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-0 hairline">
                  <span className="text-[18px]">{h.icon}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-[15px] font-medium">{h.title}</p><p className="truncate text-[12px] muted">{h.sub}</p></div>
                </button>
              ))}
              {bible.length > 0 && <p className="label px-4 pb-1 pt-3">Na Bíblia</p>}
              {bible.map((b) => (
                <button key={`${b.book}-${b.chapter}-${b.verse}`} onClick={() => { setOpen(false); openBibleAt(b); }} className="block w-full border-b px-4 py-3 text-left last:border-0 hairline">
                  <p className="text-[12px] font-semibold muted">{refLabel(b.book, b.chapter, b.verse)}</p>
                  <p className="line-clamp-2 font-serif text-[14.5px]">{b.text.replace(/[[\]]/g, '')}</p>
                </button>
              ))}
              {q.trim().length >= 2 && !hits.length && !bible.length && !ref && <p className="px-4 py-6 text-center text-[14px] muted">Nada encontrado.</p>}
              {q.trim().length < 2 && <p className="px-4 py-6 text-center text-[13px] muted">Notas, tarefas, agenda, gastos, orações, compras, registros e versículos.</p>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───────── Botão "+" inteligente ───────── */
export function QuickAdd() {
  const { me, addWater, save } = useAtlas();
  const { openSheet, view, openNote, navigate } = useUI();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<string | null>(null);
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener('atlas:quickadd', on);
    return () => window.removeEventListener('atlas:quickadd', on);
  }, []);
  const items: { icon: typeof Plus; label: string; run: () => void }[] = [
    { icon: Receipt, label: 'Despesa', run: () => openSheet('expense') },
    { icon: CheckSquare, label: 'Tarefa', run: () => openSheet('task') },
    { icon: CalendarPlus, label: 'Evento', run: () => openSheet('event') },
    { icon: Star, label: 'Prioridade', run: () => setKind('priority') },
    { icon: Lightbulb, label: 'Ideia', run: () => setKind('idea') },
    { icon: NotebookPen, label: 'Nota', run: () => { const n = newNote(me!.id); save('notes', n); navigate('notes'); openNote(n.id); } },
    { icon: HandHeart, label: 'Oração', run: () => openSheet('prayer') },
    { icon: Smile, label: 'Emoção', run: () => setKind('emotion') },
    { icon: Dumbbell, label: 'Treino', run: () => setKind('workout') },
    { icon: ShoppingBag, label: 'Compras', run: () => openSheet('shopItem') },
    { icon: BookOpen, label: 'Versículo', run: () => setKind('memory') },
    { icon: Droplet, label: '+500 ml', run: () => { addWater(500); playSound('pop'); } },
  ];
  const hideOn = ['bible'];
  if (!me) return null;
  return (
    <>
      {!hideOn.includes(view) && (
        <motion.button whileTap={{ scale: 0.88 }} onClick={() => { haptic('light'); setOpen(true); }} aria-label="Adicionar" className="fixed bottom-[calc(96px+env(safe-area-inset-bottom))] right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-black text-white shadow-[0_12px_30px_-8px_rgba(0,0,0,.55)] dark:bg-white dark:text-black">
          <Plus size={24} strokeWidth={2.4} />
        </motion.button>
      )}
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[80] flex items-end bg-black/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ type: 'spring', stiffness: 380, damping: 34 }} className="glass-strong m-3 mb-[max(0.75rem,env(safe-area-inset-bottom))] w-full p-4 !rounded-[30px]">
              <p className="mb-3 px-1 text-[17px] font-bold">O que você quer registrar?</p>
              <div className="grid grid-cols-4 gap-2">
                {items.map((it, k) => (
                  <motion.button key={it.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.015 }} onClick={() => { setOpen(false); it.run(); }} className="flex flex-col items-center gap-1.5 rounded-2xl py-3 hover:bg-black/5 dark:hover:bg-white/5">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-black/[0.05] dark:bg-white/[0.08]"><it.icon size={20} /></span>
                    <span className={cn('text-[11.5px] font-medium')}>{it.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {kind && kind !== 'priority' && <EntrySheet cfg={KINDS[kind]} open onClose={() => setKind(null)} />}
      {kind === 'priority' && <PrioritySheet onClose={() => setKind(null)} />}
    </>
  );
}

function PrioritySheet({ onClose }: { onClose: () => void }) {
  const { me, rows, save } = useAtlas();
  const [t, setT] = useState('');
  const today = ymd();
  const n = rows('entries').filter((e) => e.kind === 'priority' && e.createdBy === me?.id && e.date === today).length;
  return (
    <motion.div className="fixed inset-0 z-[85] flex items-end bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="glass-strong m-3 w-full p-4 !rounded-[28px]">
        <p className="text-[16px] font-bold">Prioridade de hoje {n >= 3 ? '(já tem 3)' : `${n + 1}/3`}</p>
        <div className="mt-3 flex gap-2">
          <input autoFocus value={t} onChange={(e) => setT(e.target.value)} className="input flex-1" placeholder="O que importa hoje?" />
          <button disabled={!t.trim() || n >= 3} onClick={() => { save('entries', { id: uid(), createdBy: me!.id, kind: 'priority', title: t.trim(), body: null, date: ymd(), done: false, private: false, data: {}, sort: Date.now(), createdAt: new Date().toISOString() }); onClose(); }} className="rounded-2xl bg-black px-4 font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-black">Salvar</button>
        </div>
      </div>
    </motion.div>
  );
}
