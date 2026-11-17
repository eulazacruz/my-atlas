'use client';
import { speak, stopSpeak } from '@/lib/tts';

import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Check, Headphones, Pause, Image as ImageIcon, ChevronDown, ChevronLeft, ChevronRight, Copy, Minus, PenLine, Plus, Search, Share2, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIsland } from '@/components/island/IslandProvider';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { Avatar, Button, Glass, PageHeader, Section, Sheet } from '@/components/ui/primitives';
import { BIBLE_ATTRIBUTION, BOOKS, bookOf, hasRead, loadBook, MARK_COLORS, parseRef, PLANS, readingFor, refLabel, searchBible, type SearchHit } from '@/lib/bible';
import { haptic } from '@/lib/native';
import { celebrate, playSound } from '@/lib/fx';
import { shareStory } from '@/lib/share';
import type { BibleMark, Profile } from '@/lib/types';
import { cn, firstName, timeAgo, uid, ymd } from '@/lib/utils';

const POS_KEY = 'my-atlas:bible-pos';
const SIZE_KEY = 'my-atlas:bible-size';
type Pos = { book: number; chapter: number; verse?: number };

/** Abre a Bíblia numa referência a partir de qualquer tela. */
export function openBibleAt(pos: Pos) {
  try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch { /* noop */ }
  window.dispatchEvent(new CustomEvent('atlas:bible-open', { detail: pos }));
  window.dispatchEvent(new CustomEvent('atlas:navigate', { detail: 'bible' }));
}
const readPos = (): Pos | null => {
  try { return JSON.parse(localStorage.getItem(POS_KEY) || 'null'); } catch { return null; }
};

/** Texto do versículo: palavras entre [colchetes] são acréscimos do tradutor (em itálico). */
function VerseText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\])/g);
  return (
    <>
      {parts.map((p, i) => (p.startsWith('[') ? <i key={i} className="opacity-60">{p.slice(1, -1)}</i> : <span key={i}>{p}</span>))}
    </>
  );
}

function useVerse(book?: number, chapter?: number, verse?: number) {
  const [t, setT] = useState('');
  useEffect(() => {
    if (!book || !chapter || !verse) return;
    let on = true;
    loadBook(book).then((b) => on && setT(b[chapter - 1]?.[verse - 1] ?? '')).catch(() => {});
    return () => { on = false; };
  }, [book, chapter, verse]);
  return t;
}

/* ───────── Leitura a dois ───────── */
function PlanCard({ onRead }: { onRead: (p: Pos) => void }) {
  const { rows, me, partner, save, remove, mode } = useAtlas();
  const [choose, setChoose] = useState(false);
  if (!me || !partner) return null;
  const plan = rows('bible_plan')[0];
  const reads = rows('bible_reads');
  if (!plan || choose)
    return (
      <Glass className="p-4">
        <p className="text-[15px] font-semibold">Leitura a dois</p>
        <p className="mt-0.5 text-[13px] muted">Escolham um plano: os dois leem o mesmo trecho por dia e um vê quando o outro leu.</p>
        <div className="mt-3 space-y-2">
          {PLANS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                if (plan) remove('bible_plan', plan.id);
                save('bible_plan', { id: plan && mode === 'demo' ? plan.id : uid(), plan: p.id, startDate: ymd() });
                setChoose(false);
              }}
              className={cn('glass-thin flex w-full items-center gap-3 p-3 text-left', plan?.plan === p.id && 'ring-1 ring-current')}
            >
              <BookOpen size={18} />
              <div className="flex-1">
                <p className="text-[14px] font-semibold">{p.name}</p>
                <p className="text-[12px] muted">{p.hint}</p>
              </div>
              <ChevronRight size={16} className="muted" />
            </button>
          ))}
        </div>
        {plan && <button onClick={() => setChoose(false)} className="mt-3 w-full text-center text-[13px] muted">Cancelar</button>}
      </Glass>
    );
  const meta = PLANS.find((p) => p.id === plan.plan) ?? PLANS[0];
  const today = readingFor(plan.plan, plan.startDate);
  const doneBy = (p: Profile) => today.chapters.length > 0 && today.chapters.every((c) => hasRead(reads, p.id, c.book, c.chapter));
  // atraso: capítulos do plano até hoje que eu não li
  let behind = 0;
  for (let d = 0; d < Math.min(today.day - 1, 60); d++) {
    const r = readingFor(plan.plan, plan.startDate, new Date(Date.now() - (d + 1) * 86_400_000));
    behind += r.chapters.filter((c) => !hasRead(reads, me.id, c.book, c.chapter)).length;
  }
  const pct = Math.min(100, Math.round(((today.day - 1) / today.days) * 100));
  return (
    <Glass className="overflow-hidden p-0">
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between">
          <p className="label">Leitura a dois · {meta.name}</p>
          <button onClick={() => setChoose(true)} className="text-[12px] muted">Trocar</button>
        </div>
        {today.done ? (
          <p className="mt-2 text-[20px] font-bold">Plano concluído! 🎉</p>
        ) : (
          <>
            <p className="mt-1.5 text-[22px] font-bold tracking-tight">{today.chapters.map((c) => refLabel(c.book, c.chapter)).join(' · ')}</p>
            <p className="text-[12px] muted">Dia {today.day} de {today.days} · {pct}% do plano</p>
          </>
        )}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
          <motion.div className="h-full rounded-full" style={{ background: '#10B981' }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 flex items-center gap-4">
          {[me, partner].map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <div className="relative">
                <Avatar profile={p} size={28} />
                {doneBy(p) && (
                  <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full text-white" style={{ background: '#10B981' }}>
                    <Check size={10} strokeWidth={3} />
                  </span>
                )}
              </div>
              <span className="text-[12px] muted">{p.id === me.id ? 'Você' : firstName(p.displayName)} · {doneBy(p) ? 'leu' : 'pendente'}</span>
            </div>
          ))}
        </div>
        {behind > 0 && <p className="mt-2 text-[12px] text-amber-500">Você tem {behind} capítulo(s) atrasado(s) no plano.</p>}
      </div>
      {!today.done && today.chapters[0] && (
        <button onClick={() => onRead(today.chapters[0])} className="flex h-12 w-full items-center justify-center gap-2 border-t text-[14px] font-semibold hairline">
          <BookOpen size={16} /> Ler agora
        </button>
      )}
    </Glass>
  );
}

function MarkRow({ m, onOpen }: { m: BibleMark; onOpen: () => void }) {
  const { nameOf, me } = useAtlas();
  const text = useVerse(m.book, m.chapter, m.verse);
  return (
    <button onClick={onOpen} className="flex w-full gap-3 border-b px-4 py-3 text-left last:border-0 hairline">
      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: MARK_COLORS[m.color]?.dot ?? '#E9C46A' }} />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] muted">
          {refLabel(m.book, m.chapter, m.verse)} · {m.createdBy === me?.id ? 'você' : firstName(nameOf(m.createdBy))}
        </p>
        <p className="line-clamp-2 font-serif text-[14.5px] leading-snug">{text ? <VerseText text={text} /> : '…'}</p>
        {m.note && <p className="mt-1 text-[12.5px] italic muted">“{m.note}”</p>}
      </div>
    </button>
  );
}

/* ───────── Seletor de livro/capítulo ───────── */
function BookPicker({ open, onClose, onPick, current }: { open: boolean; onClose: () => void; onPick: (p: Pos) => void; current: Pos }) {
  const [book, setBook] = useState<number | null>(null);
  useEffect(() => { if (open) setBook(null); }, [open]);
  const b = book ? bookOf(book) : null;
  return (
    <Sheet open={open} onClose={onClose} title={b ? b.name : 'Livros'}>
      {!b ? (
        <div className="space-y-4 pb-2">
          {[false, true].map((nt) => (
            <div key={String(nt)}>
              <p className="label mb-2">{nt ? 'Novo Testamento' : 'Antigo Testamento'}</p>
              <div className="grid grid-cols-4 gap-1.5">
                {BOOKS.filter((x) => x.nt === nt).map((x) => (
                  <button key={x.id} onClick={() => setBook(x.id)} className={cn('glass-thin h-11 truncate px-1 text-[12.5px] font-medium !rounded-xl', current.book === x.id && 'bg-black text-white dark:bg-white dark:text-black')}>
                    {x.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="pb-2">
          <button onClick={() => setBook(null)} className="mb-3 flex items-center gap-1 text-[13px] muted"><ChevronLeft size={16} /> Livros</button>
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: b.chapters }, (_, i) => (
              <button key={i} onClick={() => onPick({ book: b.id, chapter: i + 1 })} className={cn('glass-thin h-11 text-[14px] font-semibold tabular-nums !rounded-xl', current.book === b.id && current.chapter === i + 1 && 'bg-black text-white dark:bg-white dark:text-black')}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}

/* ───────── Leitor ───────── */
function Reader({ pos, setPos, onClose }: { pos: Pos; setPos: (p: Pos) => void; onClose: () => void }) {
  const { rows, me, partner, save, remove, mode } = useAtlas();
  const island = useIsland();
  const [verses, setVerses] = useState<string[] | null>(null);
  const [sel, setSel] = useState<number[]>([]);
  const [picker, setPicker] = useState(false);
  const [noteFor, setNoteFor] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [size, setSize] = useState(18);
  const [speaking, setSpeaking] = useState(-2);
  const top = useRef<HTMLDivElement | null>(null);
  useEffect(() => () => { stopSpeak(); }, []);
  useEffect(() => { stopSpeak(); setSpeaking(-2); }, [pos.book, pos.chapter]);
  useEffect(() => { if (speaking >= 0) document.getElementById(`v-${speaking + 1}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, [speaking]);
  const book = bookOf(pos.book);

  useEffect(() => {
    try { setSize(Number(localStorage.getItem(SIZE_KEY)) || 18); } catch { /* noop */ }
    document.body.dataset.reading = '1';
    return () => { delete document.body.dataset.reading; };
  }, []);
  useEffect(() => {
    let on = true;
    setVerses(null);
    setSel([]);
    loadBook(pos.book).then((b) => {
      if (!on) return;
      setVerses(b[pos.chapter - 1] ?? []);
      window.setTimeout(() => {
        if (pos.verse) document.getElementById(`v-${pos.verse}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        else window.scrollTo({ top: 0 });
      }, 60);
    });
    try { localStorage.setItem(POS_KEY, JSON.stringify({ book: pos.book, chapter: pos.chapter })); } catch { /* noop */ }
    return () => { on = false; };
  }, [pos.book, pos.chapter, pos.verse]);

  if (!me) return null;
  const marks = rows('bible_marks').filter((m) => m.book === pos.book && m.chapter === pos.chapter);
  const mine = (v: number) => marks.find((m) => m.verse === v && m.createdBy === me.id);
  const theirs = (v: number) => marks.find((m) => m.verse === v && m.createdBy !== me.id);
  const read = hasRead(rows('bible_reads'), me.id, pos.book, pos.chapter);
  const partnerRead = partner ? hasRead(rows('bible_reads'), partner.id, pos.book, pos.chapter) : false;

  const go = (d: number) => {
    let { book: b, chapter: c } = pos;
    c += d;
    if (c < 1) { b = Math.max(1, b - 1); c = bookOf(b).chapters; }
    if (c > bookOf(b).chapters) { if (b === 66) return; b += 1; c = 1; }
    haptic('light');
    setPos({ book: b, chapter: c });
  };
  const setFont = (n: number) => {
    const v = Math.max(14, Math.min(26, n));
    setSize(v);
    try { localStorage.setItem(SIZE_KEY, String(v)); } catch { /* noop */ }
  };
  const selectedText = () => sel.sort((a, b) => a - b).map((v) => `${v} ${verses?.[v - 1] ?? ''}`.replace(/[[\]]/g, '')).join(' ');
  const selRef = () => {
    const s = [...sel].sort((a, b) => a - b);
    const range = s.length > 1 && s[s.length - 1] - s[0] === s.length - 1 ? `${s[0]}-${s[s.length - 1]}` : s.join(',');
    return `${book.name} ${pos.chapter}:${range}`;
  };
  const mark = (color: string) => {
    sel.forEach((v) => {
      const m = mine(v);
      save('bible_marks', { id: m?.id ?? uid(), createdBy: me.id, book: pos.book, chapter: pos.chapter, verse: v, color, note: m?.note ?? null, createdAt: m?.createdAt ?? new Date().toISOString() });
    });
    haptic('success');
    setSel([]);
  };
  const unmark = () => {
    sel.forEach((v) => { const m = mine(v); if (m) remove('bible_marks', m.id); });
    setSel([]);
  };
  const copy = async () => {
    const txt = `“${selectedText()}” — ${selRef()}`;
    try { await navigator.clipboard.writeText(txt); } catch { /* noop */ }
    island.push({ kind: 'bible', title: 'Versículo copiado ✓', subtitle: selRef(), duration: 2500 });
    setSel([]);
  };
  const share = async () => {
    const txt = `“${selectedText()}” — ${selRef()}`;
    try {
      if (navigator.share) await navigator.share({ text: txt });
      else await navigator.clipboard.writeText(txt);
    } catch { /* cancelado */ }
    setSel([]);
  };
  const openNote = () => {
    const v = sel[0];
    setNoteFor(v);
    setNote(mine(v)?.note ?? '');
  };
  const saveNote = () => {
    if (noteFor == null) return;
    const m = mine(noteFor);
    save('bible_marks', { id: m?.id ?? uid(), createdBy: me.id, book: pos.book, chapter: pos.chapter, verse: noteFor, color: m?.color ?? 'gold', note: note.trim() || null, createdAt: m?.createdAt ?? new Date().toISOString() });
    setNoteFor(null);
    setSel([]);
  };
  const markRead = () => {
    if (read) {
      const r = rows('bible_reads').find((x) => x.profileId === me.id && x.book === pos.book && x.chapter === pos.chapter);
      if (r) remove('bible_reads', r.id);
      return;
    }
    save('bible_reads', { id: uid(), profileId: me.id, book: pos.book, chapter: pos.chapter, readAt: new Date().toISOString() });
    haptic('success');
    if (partnerRead) celebrate('Leram juntos 📖'); else playSound('chime');
    island.push({ kind: 'bible', title: `${book.name} ${pos.chapter} lido ✓`, subtitle: partnerRead ? `${firstName(partner?.displayName ?? '')} também já leu 🤍` : 'Seu amor vai ser avisado', duration: 3000 });
    void mode;
  };

  return (
    <div ref={top}>
      {/* barra do leitor */}
      <div className="sticky top-0 z-20 -mx-4 mb-2 bar-blur px-4 pb-2 pt-[calc(0.75rem+var(--sat,env(safe-area-inset-top)))] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button onClick={onClose} aria-label="Voltar" className="glass grid h-10 w-10 place-items-center !rounded-full"><ChevronLeft size={19} /></button>
          <button onClick={() => setPicker(true)} className="glass flex h-10 flex-1 items-center justify-center gap-1.5 !rounded-full px-4 text-[15px] font-semibold">
            {book.name} {pos.chapter} <ChevronDown size={15} className="muted" />
          </button>
          <button onClick={() => { if (speaking > -2) { stopSpeak(); setSpeaking(-2); return; } if (!verses) return; setSpeaking(-1); speak([`${book.name}, capítulo ${pos.chapter}.`, ...verses.map((t) => t.replace(/[[\]]/g, ''))], (i) => setSpeaking(i - 1), () => setSpeaking(-2)); }} aria-label="Ouvir capítulo" className={`glass grid h-10 w-10 place-items-center !rounded-full ${speaking > -2 ? '!bg-emerald-500 text-white' : ''}`}>{speaking > -2 ? <Pause size={16} /> : <Headphones size={16} />}</button>
          <button onClick={() => setFont(size - 1)} aria-label="Diminuir letra" className="glass grid h-10 w-10 place-items-center !rounded-full"><Minus size={16} /></button>
          <button onClick={() => setFont(size + 1)} aria-label="Aumentar letra" className="glass grid h-10 w-10 place-items-center !rounded-full"><Plus size={16} /></button>
        </div>
      </div>

      <article className="px-1 pb-6 pt-4">
        <p className="label mb-1">{book.nt ? 'Novo Testamento' : 'Antigo Testamento'}</p>
        <h2 className="mb-5 font-serif text-[34px] font-semibold leading-none tracking-tight">{book.name} <span className="muted">{pos.chapter}</span></h2>
        {!verses && <div className="space-y-3">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-4 animate-pulse rounded bg-black/5 dark:bg-white/[0.06]" style={{ width: `${70 + ((i * 37) % 30)}%` }} />)}</div>}
        <div className="font-serif" style={{ fontSize: size, lineHeight: 1.62 }}>
          {verses?.map((t, i) => {
            const v = i + 1;
            const m = mine(v);
            const o = theirs(v);
            const isSel = sel.includes(v);
            return (
              <span key={v} id={`v-${v}`}>
                <span
                  role="button"
                  onClick={() => setSel((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]))}
                  className={cn('cursor-pointer rounded-[4px] transition-colors', isSel && 'underline decoration-2 underline-offset-4', pos.verse === v && !m && 'bg-black/[0.05] dark:bg-white/[0.07]', speaking === i && 'bg-emerald-500/20')}
                  style={{
                    background: m ? MARK_COLORS[m.color]?.bg : undefined,
                    textDecorationLine: !isSel && o ? 'underline' : undefined,
                    textDecorationStyle: !isSel && o ? 'dotted' : undefined,
                    textDecorationColor: !isSel && o ? MARK_COLORS[o.color]?.dot : undefined,
                    textUnderlineOffset: 5,
                  }}
                >
                  <sup className="mr-1 select-none font-sans text-[0.55em] font-bold tabular-nums muted">{v}</sup>
                  <VerseText text={t} />
                </span>{' '}
                {(m?.note || o?.note) && (
                  <span className="mb-2 mt-1 block rounded-xl bg-black/[0.04] px-3 py-2 font-sans text-[12.5px] leading-snug dark:bg-white/[0.05]">
                    {m?.note && <span className="block"><b>Você:</b> {m.note}</span>}
                    {o?.note && <span className="block"><b>{firstName(partner?.displayName ?? '')}:</b> {o.note}</span>}
                  </span>
                )}
              </span>
            );
          })}
        </div>

        {verses && (
          <div className="mt-8 space-y-3">
            <Button variant={read ? 'secondary' : 'primary'} className="w-full" onClick={markRead}>
              <Check size={16} /> {read ? 'Lido · desfazer' : 'Marcar capítulo como lido'}
            </Button>
            {partnerRead && <p className="text-center text-[12px] muted">{firstName(partner?.displayName ?? '')} já leu este capítulo 🤍</p>}
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => go(-1)}><ChevronLeft size={16} /> Anterior</Button>
              <Button className="flex-1" onClick={() => go(1)}>Próximo <ChevronRight size={16} /></Button>
            </div>
            <p className="pt-2 text-center text-[10.5px] leading-snug muted">{BIBLE_ATTRIBUTION}</p>
          </div>
        )}
      </article>

      {/* ações do versículo */}
      <AnimatePresence>
        {sel.length > 0 && (
          <motion.div initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }} className="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="glass-strong w-full max-w-md p-3 !rounded-[26px]">
              <div className="mb-2.5 flex items-center justify-between px-1">
                <p className="text-[13px] font-semibold">{selRef()}</p>
                <button onClick={() => setSel([])} aria-label="Fechar" className="muted"><X size={17} /></button>
              </div>
              <div className="flex items-center gap-2">
                {Object.entries(MARK_COLORS).map(([k, c]) => (
                  <button key={k} onClick={() => mark(k)} aria-label={c.label} className="h-9 w-9 shrink-0 rounded-full ring-2 ring-white/20" style={{ background: c.dot }} />
                ))}
                <div className="mx-1 h-7 w-px bg-black/10 dark:bg-white/15" />
                {sel.some((v) => mine(v)) && <button onClick={unmark} aria-label="Remover marcação" className="grid h-9 w-9 place-items-center rounded-full muted"><Trash2 size={17} /></button>}
                <button onClick={openNote} aria-label="Anotação" className="grid h-9 w-9 place-items-center rounded-full"><PenLine size={17} /></button>
                <button onClick={copy} aria-label="Copiar" className="grid h-9 w-9 place-items-center rounded-full"><Copy size={17} /></button>
                <button onClick={share} aria-label="Compartilhar" className="grid h-9 w-9 place-items-center rounded-full"><Share2 size={17} /></button>
                <button onClick={() => { shareStory({ kicker: selRef(), body: `“${selectedText().replace(/^\d+\s/, '').replace(/\s\d+\s/g, ' ')}”`, serif: true, theme: 'night', foot: 'Lendo a Bíblia a dois' }); setSel([]); }} aria-label="Imagem para stories" className="grid h-9 w-9 place-items-center rounded-full"><ImageIcon size={17} /></button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BookPicker open={picker} onClose={() => setPicker(false)} current={pos} onPick={(p) => { setPicker(false); setPos(p); }} />
      <Sheet
        open={noteFor != null}
        onClose={() => setNoteFor(null)}
        title={noteFor ? `Anotação · ${book.name} ${pos.chapter}:${noteFor}` : 'Anotação'}
        footer={<Button variant="primary" className="w-full" onClick={saveNote}>Salvar</Button>}
      >
        <p className="mb-3 font-serif text-[15px] leading-snug muted">{noteFor ? <VerseText text={verses?.[noteFor - 1] ?? ''} /> : null}</p>
        <textarea autoFocus rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="O que Deus falou com você aqui? Seu amor também vai ver." className="input" />
      </Sheet>
    </div>
  );
}

/* ───────── Tela ───────── */
export function BibleScreen() {
  const { rows, me } = useAtlas();
  const [pos, setPos] = useState<Pos | null>(null);
  const [reading, setReading] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [picker, setPicker] = useState(false);
  const searchId = useRef(0);

  useEffect(() => {
    const p = readPos();
    setPos(p ?? { book: 43, chapter: 1 });
    if (p?.verse) setReading(true);
    const on = (e: Event) => { setPos((e as CustomEvent).detail as Pos); setReading(true); };
    window.addEventListener('atlas:bible-open', on);
    return () => window.removeEventListener('atlas:bible-open', on);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 3 || parseRef(term)) { setHits(null); setSearching(false); return; }
    const id = ++searchId.current;
    setSearching(true);
    const t = window.setTimeout(() => {
      searchBible(term, 60, (h) => id === searchId.current && setHits(h)).then((h) => {
        if (id !== searchId.current) return;
        setHits(h);
        setSearching(false);
      });
    }, 350);
    return () => window.clearTimeout(t);
  }, [q]);

  const marks = useMemo(() => [...rows('bible_marks')].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')).slice(0, 12), [rows]);
  if (!me || !pos) return null;
  const open = (p: Pos) => { setPos(p); setReading(true); };
  if (reading) return <Reader pos={pos} setPos={setPos} onClose={() => setReading(false)} />;

  const ref = q.trim() ? parseRef(q) : null;
  const lastRead = [...rows('bible_reads')].filter((r) => r.profileId === me.id).sort((a, b) => b.readAt.localeCompare(a.readAt))[0];

  return (
    <div>
      <PageHeader title="Bíblia" subtitle="Bíblia Livre · Almeida" back />
      <div className="glass mb-6 flex h-12 items-center gap-2 !rounded-full px-4">
        <Search size={17} className="muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: “Jo 3:16”, “ansiedade”, “Salmos 23”" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
        {q && <button onClick={() => setQ('')} aria-label="Limpar" className="muted"><X size={16} /></button>}
      </div>

      {q.trim() ? (
        <Section title={ref ? 'Ir para' : searching ? 'Buscando…' : `${hits?.length ?? 0} resultado(s)`}>
          {ref && (
            <Glass className="flex items-center gap-3 p-4" onClick={() => open(ref)}>
              <BookOpen size={18} />
              <p className="flex-1 text-[16px] font-semibold">{refLabel(ref.book, ref.chapter, ref.verse)}</p>
              <ChevronRight size={17} className="muted" />
            </Glass>
          )}
          {!ref && hits && hits.length > 0 && (
            <div className="glass overflow-hidden">
              {hits.map((h) => (
                <button key={`${h.book}-${h.chapter}-${h.verse}`} onClick={() => open(h)} className="block w-full border-b px-4 py-3 text-left last:border-0 hairline">
                  <p className="text-[12px] font-semibold muted">{refLabel(h.book, h.chapter, h.verse)}</p>
                  <p className="line-clamp-3 font-serif text-[15px] leading-snug"><VerseText text={h.text} /></p>
                </button>
              ))}
            </div>
          )}
          {!ref && !searching && hits?.length === 0 && <p className="px-1 text-[14px] muted">Nada encontrado. Tente outra palavra.</p>}
        </Section>
      ) : (
        <>
          <Section>
            <PlanCard onRead={open} />
          </Section>

          <Section title="Continuar lendo">
            <div className="grid grid-cols-2 gap-3">
              <Glass className="p-4" onClick={() => open({ book: pos.book, chapter: pos.chapter })}>
                <BookOpen size={18} />
                <p className="mt-3 text-[12px] muted">Onde você parou</p>
                <p className="text-[17px] font-bold tracking-tight">{refLabel(pos.book, pos.chapter)}</p>
              </Glass>
              <Glass className="p-4" onClick={() => setPicker(true)}>
                <Search size={18} />
                <p className="mt-3 text-[12px] muted">{lastRead ? `Último lido ${timeAgo(lastRead.readAt)}` : 'Escolher'}</p>
                <p className="text-[17px] font-bold tracking-tight">Livros</p>
              </Glass>
            </div>
          </Section>

          <Section title="Marcações de vocês">
            {marks.length === 0 ? (
              <p className="px-1 text-[14px] muted">Toque num versículo durante a leitura para marcar com uma cor ou escrever uma anotação. O seu amor vê as suas marcações.</p>
            ) : (
              <div className="glass overflow-hidden">
                {marks.map((m) => <MarkRow key={m.id} m={m} onOpen={() => open({ book: m.book, chapter: m.chapter, verse: m.verse })} />)}
              </div>
            )}
          </Section>
          <p className="pb-4 text-center text-[10.5px] leading-snug muted">{BIBLE_ATTRIBUTION}</p>
        </>
      )}
      <BookPicker open={picker} onClose={() => setPicker(false)} current={pos} onPick={(p) => { setPicker(false); open(p); }} />
    </div>
  );
}

/** Linha compacta para a tela inicial: leitura de hoje do plano a dois. */
export function BiblePlanMini() {
  const { rows, me, partner } = useAtlas();
  const plan = rows('bible_plan')[0];
  if (!me || !partner) return null;
  if (!plan)
    return (
      <Glass className="flex items-center gap-3 p-4" onClick={() => window.dispatchEvent(new CustomEvent('atlas:navigate', { detail: 'bible' }))}>
        <BookOpen size={18} />
        <p className="flex-1 text-[14px] font-medium">Começar uma leitura a dois</p>
        <ChevronRight size={16} className="muted" />
      </Glass>
    );
  const t = readingFor(plan.plan, plan.startDate);
  if (!t.chapters.length) return null;
  const reads = rows('bible_reads');
  const done = (p: Profile) => t.chapters.every((c) => hasRead(reads, p.id, c.book, c.chapter));
  return (
    <Glass className="flex items-center gap-3 p-4" onClick={() => openBibleAt(t.chapters[0])}>
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-black text-white dark:bg-white dark:text-black"><BookOpen size={17} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] muted">Leitura de hoje · dia {t.day}</p>
        <p className="truncate text-[15px] font-semibold">{t.chapters.map((c) => refLabel(c.book, c.chapter)).join(' · ')}</p>
      </div>
      <div className="flex -space-x-1.5">
        {[me, partner].map((p) => (
          <span key={p.id} className={cn('rounded-full ring-2 ring-[var(--bg)]', !done(p) && 'opacity-35 grayscale')}><Avatar profile={p} size={26} /></span>
        ))}
      </div>
    </Glass>
  );
}
