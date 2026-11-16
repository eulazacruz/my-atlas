'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { BellOff, BookOpen, Share2, Check, ChevronRight, Eye, HandHeart, MessageCircle, Phone, Plus, RotateCcw, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI } from '@/components/providers/UIProvider';
import { BiblePlanMini, openBibleAt } from '@/components/screens/BibleScreen';
import { EntrySheet, useEntries, useEntryActions } from '@/components/ui/Collection';
import { Avatar, Button, Glass, PageHeader, Section, Sheet } from '@/components/ui/primitives';
import { BOOKS, parseRef, readingFor, refLabel } from '@/lib/bible';
import { KINDS } from '@/lib/entries';
import { haptic, setDoNotDisturb } from '@/lib/native';
import { shareStory } from '@/lib/share';
import type { Entry } from '@/lib/types';
import { addDays, cn, daysBetween, firstName, fmtDay, money, parseYmd, ymd } from '@/lib/utils';
import { HubTiles } from './FocusHub';

/* ───────── Devocional guiado (ligado à leitura do dia) ───────── */
export function DevotionalCard() {
  const { rows, me, partner } = useAtlas();
  const devs = useEntries('devotional');
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Entry | null>(null);
  if (!me || !partner) return null;
  const plan = rows('bible_plan')[0];
  const t = plan ? readingFor(plan.plan, plan.startDate) : null;
  const ref = t?.chapters.length ? t.chapters.map((c) => refLabel(c.book, c.chapter)).join(', ') : '';
  const today = ymd();
  const mine = devs.find((d) => d.createdBy === me.id && d.date === today);
  const theirs = devs.find((d) => d.createdBy === partner.id && d.date === today);
  return (
    <Glass className="p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl text-black" style={{ background: '#E9C46A' }}>✍️</span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">Devocional de hoje</p>
          <p className="truncate text-[12px] muted">{ref ? `Sobre ${ref}` : 'Escritura · Observação · Aplicação · Oração'}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant={mine ? 'secondary' : 'primary'} className="flex-1" onClick={() => (mine ? setView(mine) : setOpen(true))}>{mine ? 'Ver o meu' : 'Escrever'}</Button>
        <Button className="flex-1" disabled={!theirs} onClick={() => theirs && setView(theirs)}>
          {theirs ? `Ler o de ${firstName(partner.displayName)}` : `${firstName(partner.displayName)} ainda não`}
        </Button>
      </div>
      <EntrySheet cfg={KINDS.devotional} open={open} onClose={() => setOpen(false)} preset={{ ref, date: today }} />
      <Sheet open={!!view} onClose={() => setView(null)} title={view?.title || 'Devocional'}>
        {view && (
          <div className="space-y-3 pb-2">
            <p className="text-[12px] muted">{view.data?.ref} · {view.date ? fmtDay(parseYmd(view.date), { day: 'numeric', month: 'long' }) : ''} · {view.createdBy === me.id ? 'você' : firstName(partner.displayName)}</p>
            {([['s', 'Escritura'], ['o', 'Observação'], ['a', 'Aplicação'], ['p', 'Oração']] as const).map(([k, l]) => view.data?.[k] ? (
              <div key={k}>
                <p className="label">{l}</p>
                <p className={cn('mt-1 text-[15px] leading-relaxed', k === 's' && 'font-serif')}>{view.data[k]}</p>
              </div>
            ) : null)}
            <div className="flex gap-2">
              {view.data?.ref && <Button className="flex-1" onClick={() => { const r = parseRef(String(view.data.ref).split(',')[0]); if (r) openBibleAt(r); }}><BookOpen size={15} /> Bíblia</Button>}
              <Button className="flex-1" onClick={() => shareStory({ kicker: `Devocional · ${view.data?.ref ?? ''}`, title: view.title || undefined, body: view.data?.a ? `Aplicação: ${view.data.a}` : view.data?.o ?? '', foot: view.data?.s ? `“${String(view.data.s).slice(0, 120)}”` : undefined, theme: 'night' })}><Share2 size={15} /> Story</Button>
            </div>
          </div>
        )}
      </Sheet>
    </Glass>
  );
}

/* ───────── Estou orando por você ───────── */
export function PrayingFor() {
  const { rows, me, partner } = useAtlas();
  const { put } = useEntryActions();
  const prayed = useEntries('prayed');
  if (!me || !partner) return null;
  const list = rows('prayers').filter((p) => !p.answered).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  if (!list.length) return <p className="px-1 text-[13px] muted">Nenhum pedido aberto. Adicione em Nós dois → Oração.</p>;
  return (
    <div className="glass overflow-hidden">
      {list.slice(0, 8).map((p) => {
        const count = prayed.filter((x) => x.data?.prayerId === p.id).length;
        const todayMine = prayed.some((x) => x.data?.prayerId === p.id && x.createdBy === me.id && x.date === ymd());
        const isMine = p.createdBy === me.id;
        return (
          <div key={p.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0 hairline">
            <Avatar profile={isMine ? me : partner} size={30} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium">{p.title}</p>
              <p className="text-[12px] muted">{count ? `🙏 orado ${count}x` : 'Ainda sem orações registradas'}</p>
            </div>
            <Button variant={todayMine ? 'secondary' : 'primary'} className="h-9 px-3 text-[13px]" disabled={todayMine} onClick={() => { put('prayed', { title: p.title, date: ymd(), data: { prayerId: p.id, to: p.createdBy === me.id ? null : p.createdBy } }); haptic('success'); }}>
              {todayMine ? <><Check size={14} /> Orei</> : 'Orei 🙏'}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

/* ───────── Versículos para memorizar (repetição espaçada) ───────── */
const BOX_DAYS = [0, 1, 2, 4, 8, 16, 32];
export function MemoryReview() {
  const all = useEntries('memory');
  const { me } = useAtlas();
  const { navigate } = useUI();
  const { put } = useEntryActions();
  const [reveal, setReveal] = useState(false);
  const [adding, setAdding] = useState(false);
  const due = all.filter((e) => (e.data?.next ?? '0000') <= ymd()).sort((a, b) => (a.data?.box ?? 0) - (b.data?.box ?? 0));
  const card = due[0];
  const grade = (ok: boolean) => {
    if (!card) return;
    const box = ok ? Math.min(6, (card.data?.box ?? 0) + 1) : 1;
    put('memory', { data: { box, next: ymd(addDays(new Date(), BOX_DAYS[box])), reviews: (card.data?.reviews ?? 0) + 1, by: me?.id } }, card);
    setReveal(false);
    haptic(ok ? 'success' : 'light');
  };
  const learned = all.filter((e) => (e.data?.box ?? 0) >= 5).length;
  return (
    <>
      <Glass className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-semibold">Memorizar</p>
          <p className="text-[12px] muted">{learned}/{all.length} decorados · {due.length} para hoje</p>
        </div>
        {card ? (
          <div className="mt-3">
            <button onClick={() => setReveal(true)} className="glass-thin block w-full p-4 text-left">
              <p className="text-[18px] font-bold">{card.data?.ref ?? card.title}</p>
              <AnimatePresence initial={false}>
                {reveal ? (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 font-serif text-[15.5px] leading-snug">{card.body || '(sem texto — edite para colar o versículo)'}</motion.p>
                ) : (
                  <p className="mt-1 flex items-center gap-1 text-[12px] muted"><Eye size={13} /> Tente lembrar e toque para conferir</p>
                )}
              </AnimatePresence>
            </button>
            {reveal && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button onClick={() => grade(false)}><RotateCcw size={14} /> Ainda não</Button>
                <Button variant="primary" onClick={() => grade(true)}><Check size={14} /> Lembrei</Button>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-2 text-[13px] muted">{all.length ? 'Tudo revisado por hoje. ✨' : 'Adicione um versículo para começar.'}</p>
        )}
        <div className="mt-3 flex gap-2">
          <Button className="flex-1" onClick={() => setAdding(true)}><Plus size={15} /> Versículo</Button>
          <Button className="flex-1" onClick={() => navigate('col', 'memory')}>Ver todos</Button>
        </div>
      </Glass>
      <EntrySheet cfg={KINDS.memory} open={adding} onClose={() => setAdding(false)} preset={{ }} />
    </>
  );
}

/* ───────── Modo culto ───────── */
export function ChurchMode() {
  const { alert } = useAtlas();
  const [on, setOn] = useState(false);
  const [note, setNote] = useState(false);
  useEffect(() => { try { setOn(localStorage.getItem('my-atlas:church') === '1'); } catch { /* noop */ } }, []);
  const toggle = async () => {
    const next = !on;
    const r = await setDoNotDisturb(next);
    if (r === 'permission') {
      alert({ kind: 'sync', title: 'Permita o “Não perturbe”', subtitle: 'Ative o My Atlas na tela que abriu e toque de novo', duration: 6000 });
      return;
    }
    setOn(next);
    try { localStorage.setItem('my-atlas:church', next ? '1' : '0'); } catch { /* noop */ }
    alert({ kind: 'bible', title: next ? 'Modo culto ativado ⛪' : 'Modo culto desligado', subtitle: next ? (r === 'ok' ? 'Celular silenciado. Bom culto!' : 'Anotações e Bíblia à mão') : 'Notificações de volta', duration: 3000 });
    if (next) setNote(true);
  };
  return (
    <>
      <Glass className={cn('flex items-center gap-3 p-4', on && 'ring-2 ring-[#E9C46A]')}>
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-black text-white dark:bg-white dark:text-black"><BellOff size={18} /></span>
        <div className="flex-1">
          <p className="text-[15px] font-semibold">Modo culto</p>
          <p className="text-[12px] muted">{on ? 'Ativo: celular em silêncio' : 'Silencia o celular e abre as anotações'}</p>
        </div>
        <Button variant={on ? 'secondary' : 'primary'} className="h-9 px-4 text-[13px]" onClick={toggle}>{on ? 'Encerrar' : 'Ativar'}</Button>
      </Glass>
      <EntrySheet cfg={KINDS.sermon} open={note} onClose={() => setNote(false)} />
    </>
  );
}

/* ───────── Jejum ativo ───────── */
export function ActiveFast() {
  const fasts = useEntries('fast');
  const [, t] = useState(0);
  useEffect(() => { const i = window.setInterval(() => t((x) => x + 1), 30_000); return () => window.clearInterval(i); }, []);
  const now = Date.now();
  const active = fasts.map((f) => {
    const start = new Date(`${f.date ?? ymd()}T${f.data?.start || '00:00'}:00`).getTime();
    const end = start + (Number(f.data?.hours) || 12) * 3600_000;
    return { f, start, end };
  }).find((x) => now >= x.start && now < x.end);
  if (!active) return null;
  const pct = ((now - active.start) / (active.end - active.start)) * 100;
  const left = Math.round((active.end - now) / 60_000);
  return (
    <Glass className="p-4">
      <p className="label">Jejum em andamento 🕊️</p>
      <p className="mt-1 text-[16px] font-semibold">{active.f.title}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/10"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#E9C46A' }} /></div>
      <p className="mt-1.5 text-[12px] muted">Faltam {Math.floor(left / 60)}h {left % 60}min · “Quando jejuardes, não vos mostreis contristados…” Mt 6:16</p>
    </Glass>
  );
}

/* ───────── Pergunta bíblica do dia ───────── */
const QUESTIONS = [
  'Qual versículo da leitura de hoje mais falou com você? Por quê?',
  'O que esse texto revela sobre o caráter de Deus?',
  'Em que área da nossa casa precisamos aplicar o que lemos?',
  'Qual promessa de Deus você precisa lembrar nesta semana?',
  'Se Jesus estivesse na nossa casa hoje, o que Ele notaria primeiro?',
  'Por qual pessoa Deus está colocando no seu coração para orar?',
  'O que você precisa entregar a Deus hoje?',
  'Qual foi a última oração que você viu ser respondida?',
  'Como podemos servir alguém juntos esta semana?',
  'Qual personagem bíblico mais parece com você agora? Por quê?',
  'O que significa “amar como Cristo amou a igreja” no nosso dia a dia?',
  'Que pecado ou hábito Deus está pedindo para você abandonar?',
  'Pelo que você é grato a Deus hoje, especificamente?',
  'Qual medo você quer trocar por fé?',
  'Como estamos guardando o descanso (sábado) na nossa rotina?',
  'O que você gostaria que nossos filhos aprendessem sobre fé com a gente?',
  'Qual versículo você quer que seja o lema do nosso casamento?',
  'Em que momento você sentiu Deus mais perto nesta semana?',
  'O que é generosidade para você? Estamos sendo generosos?',
  'Que hábito espiritual queremos construir juntos?',
];
export function QuestionOfDay() {
  const { me, partner } = useAtlas();
  const { put } = useEntryActions();
  const qa = useEntries('qa');
  const [a, setA] = useState('');
  if (!me || !partner) return null;
  const start = new Date(new Date().getFullYear(), 0, 0);
  const q = QUESTIONS[Math.floor((Date.now() - start.getTime()) / 86_400_000) % QUESTIONS.length];
  const today = ymd();
  const mine = qa.find((x) => x.createdBy === me.id && x.date === today);
  const theirs = qa.find((x) => x.createdBy === partner.id && x.date === today);
  return (
    <Glass className="p-4">
      <p className="label">Pergunta do dia</p>
      <p className="mt-1.5 text-[16px] font-semibold leading-snug">{q}</p>
      {!mine ? (
        <div className="mt-3 flex gap-2">
          <input value={a} onChange={(e) => setA(e.target.value)} placeholder="Sua resposta" className="input flex-1 !py-2.5" />
          <Button variant="primary" disabled={!a.trim()} onClick={() => { put('qa', { title: q, body: a.trim(), date: today }); setA(''); }}>Enviar</Button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {[{ p: me, e: mine }, { p: partner, e: theirs }].map(({ p, e }) => (
            <div key={p.id} className="flex gap-2.5">
              <Avatar profile={p} size={24} />
              <p className={cn('flex-1 text-[14px] leading-snug', !e && 'muted')}>{e ? e.body : `Aparece quando ${firstName(p.displayName)} responder`}</p>
            </div>
          ))}
        </div>
      )}
    </Glass>
  );
}

/* ───────── Mapa de leitura + ano espiritual ───────── */
export function ReadingMap() {
  const { rows, me, partner } = useAtlas();
  const [who, setWho] = useState<'me' | 'both'>('both');
  if (!me) return null;
  const reads = rows('bible_reads').filter((r) => who === 'both' || r.profileId === me.id);
  const per = new Map<number, Set<number>>();
  reads.forEach((r) => { if (!per.has(r.book)) per.set(r.book, new Set()); per.get(r.book)!.add(r.chapter); });
  const total = Array.from(per.values()).reduce((s, x) => s + x.size, 0);
  return (
    <Glass className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold">Mapa da Bíblia</p>
        <button onClick={() => setWho(who === 'me' ? 'both' : 'me')} className="text-[12px] font-semibold muted">{who === 'me' ? 'Só eu' : `Eu + ${firstName(partner?.displayName ?? '')}`}</button>
      </div>
      <p className="text-[12px] muted">{total} de 1.189 capítulos · {Math.round((total / 1189) * 100)}%</p>
      <div className="mt-3 grid grid-cols-11 gap-1">
        {BOOKS.map((b) => {
          const pct = (per.get(b.id)?.size ?? 0) / b.chapters;
          return (
            <button key={b.id} title={b.name} onClick={() => openBibleAt({ book: b.id, chapter: 1 })} className="relative aspect-square overflow-hidden rounded-[5px] bg-black/[0.06] dark:bg-white/[0.07]">
              <span className="absolute inset-x-0 bottom-0" style={{ height: `${pct * 100}%`, background: pct >= 1 ? '#10B981' : '#E9C46A' }} />
              <span className="relative text-[7.5px] font-bold leading-none opacity-70">{b.abbr}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-3 text-[10.5px] muted"><span>🟨 começado</span><span>🟩 completo</span></div>
    </Glass>
  );
}

export function SpiritualYear() {
  const { rows, me, partner } = useAtlas();
  if (!me || !partner) return null;
  const y = String(new Date().getFullYear());
  const e = rows('entries').filter((x) => (x.date ?? x.createdAt ?? '').startsWith(y));
  const stat = (pid: string) => ({
    cap: rows('bible_reads').filter((r) => r.profileId === pid && r.readAt.startsWith(y)).length,
    dev: e.filter((x) => x.kind === 'devotional' && x.createdBy === pid).length,
    marks: rows('bible_marks').filter((m) => m.createdBy === pid && (m.createdAt ?? '').startsWith(y)).length,
    prayed: e.filter((x) => x.kind === 'prayed' && x.createdBy === pid).length,
  });
  const a = stat(me.id);
  const b = stat(partner.id);
  const answered = rows('prayers').filter((p) => p.answered && (p.answeredAt ?? '').startsWith(y)).length;
  const fasts = e.filter((x) => x.kind === 'fast').length;
  const sermons = e.filter((x) => x.kind === 'sermon').length;
  const Row = ({ l, x, y: yy }: { l: string; x: number; y: number }) => (
    <div className="flex items-center justify-between border-b py-2 last:border-0 hairline">
      <span className="text-[13.5px]">{l}</span>
      <span className="flex gap-4 text-[14px] font-bold tabular-nums"><span>{x}</span><span style={{ color: '#10B981' }}>{yy}</span></span>
    </div>
  );
  return (
    <Glass className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold">Ano espiritual {y}</p>
        <span className="flex gap-4 text-[11px] font-semibold muted"><span>Você</span><span>{firstName(partner.displayName)}</span></span>
      </div>
      <div className="mt-2">
        <Row l="Capítulos lidos" x={a.cap} y={b.cap} />
        <Row l="Devocionais" x={a.dev} y={b.dev} />
        <Row l="Versículos marcados" x={a.marks} y={b.marks} />
        <Row l="Orações registradas" x={a.prayed} y={b.prayed} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[{ v: answered, l: 'orações respondidas' }, { v: fasts, l: 'jejuns' }, { v: sermons, l: 'cultos anotados' }].map((s) => (
          <div key={s.l} className="glass-thin p-2.5"><p className="text-[18px] font-bold">{s.v}</p><p className="text-[10.5px] muted">{s.l}</p></div>
        ))}
      </div>
    </Glass>
  );
}

/* ───────── Mural de testemunhos ───────── */
export function Testimonies() {
  const { rows, nameOf } = useAtlas();
  const { navigate } = useUI();
  const answered = rows('prayers').filter((p) => p.answered).sort((a, b) => (b.answeredAt ?? '').localeCompare(a.answeredAt ?? ''));
  const own = useEntries('testimony');
  const cards = [
    ...answered.map((p) => ({ id: p.id, title: p.title, body: p.answerNote, who: nameOf(p.createdBy), at: p.answeredAt ?? '' })),
    ...own.map((t) => ({ id: t.id, title: t.title, body: t.body, who: nameOf(t.createdBy), at: t.date ?? '' })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  if (!cards.length) return <p className="px-1 text-[13px] muted">Quando uma oração for marcada como respondida, ela aparece aqui como testemunho.</p>;
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
      {cards.slice(0, 12).map((c) => (
        <div key={c.id} onClick={() => shareStory({ kicker: '🙌 Deus respondeu', title: c.title, body: c.body ?? '', foot: `${firstName(c.who)}${c.at ? ' · ' + new Date(c.at).toLocaleDateString('pt-BR') : ''}`, theme: 'gold' })} className="w-[250px] shrink-0 cursor-pointer snap-start rounded-[26px] p-5 text-black" style={{ background: 'linear-gradient(150deg,#F7E7B4,#E9C46A)' }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-60">🙌 Deus respondeu</p>
          <p className="mt-2 text-[17px] font-bold leading-snug">{c.title}</p>
          {c.body && <p className="mt-1.5 line-clamp-3 text-[13px] opacity-75">{c.body}</p>}
          <p className="mt-3 text-[11px] opacity-60">{firstName(c.who)}{c.at ? ` · ${fmtDay(c.at.slice(0, 10), { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}</p>
        </div>
      ))}
      <button onClick={() => navigate('col', 'testimony')} className="grid w-24 shrink-0 place-items-center rounded-[26px] text-[13px] muted glass-thin">+ Novo</button>
    </div>
  );
}

/* ───────── Dízimo e ofertas ───────── */
export function TitheCard() {
  const { rows } = useAtlas();
  const { openSheet } = useUI();
  const month = ymd().slice(0, 7);
  const y = month.slice(0, 4);
  const tx = rows('transactions').filter((t) => t.type === 'expense' && ['Dízimo', 'Oferta'].includes(t.category));
  const m = tx.filter((t) => t.occurredOn.startsWith(month)).reduce((s, t) => s + t.amount, 0);
  const yr = tx.filter((t) => t.occurredOn.startsWith(y)).reduce((s, t) => s + t.amount, 0);
  return (
    <Glass className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[15px] font-semibold">Dízimos e ofertas</p>
          <p className="text-[12px] muted">Mês: {money(m)} · Ano: {money(yr)}</p>
        </div>
        <HandHeart size={20} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button onClick={() => openSheet('expense', { category: 'Dízimo', desc: 'Dízimo' })}>+ Dízimo</Button>
        <Button onClick={() => openSheet('expense', { category: 'Oferta', desc: 'Oferta' })}>+ Oferta</Button>
      </div>
    </Glass>
  );
}

/* ───────── Pessoas para cuidar (atrasadas) ───────── */
export function PeopleDue() {
  const people = useEntries('person');
  const { put } = useEntryActions();
  const due = people
    .map((p) => ({ p, late: p.data?.last ? daysBetween(parseYmd(p.data.last), new Date()) - (p.data?.every ?? 14) : 999 }))
    .filter((x) => x.late >= 0)
    .sort((a, b) => b.late - a.late)
    .slice(0, 4);
  if (!due.length) return null;
  return (
    <div className="glass overflow-hidden">
      {due.map(({ p }) => (
        <div key={p.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0 hairline">
          <span className="text-[18px]">🤝</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium">{p.title}</p>
            <p className="truncate text-[12px] muted">{p.data?.pray ? `Orar por: ${p.data.pray}` : 'Faz tempo que vocês não falam'}</p>
          </div>
          {p.data?.phone && <a href={`https://wa.me/55${String(p.data.phone).replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-full glass-thin"><MessageCircle size={15} /></a>}
          <Button className="h-9 px-3 text-[12.5px]" onClick={() => put('person', { data: { last: ymd() } }, p)}><Phone size={13} /> Falei</Button>
        </div>
      ))}
    </div>
  );
}

/* ───────── Tela Fé ───────── */
export function FaithHub() {
  const { navigate } = useUI();
  const [tab, setTab] = useState<'today' | 'grow' | 'church'>('today');
  const upcoming = useEntries('church').filter((e) => (e.date ?? '') >= ymd()).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')).slice(0, 3);
  const serve = useEntries('serve').filter((e) => (e.date ?? '') >= ymd()).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')).slice(0, 3);
  return (
    <div>
      <PageHeader title="Fé" subtitle="Vida cristã a dois" actions={<Button className="h-10" onClick={() => navigate('bible')}><BookOpen size={16} /> Bíblia</Button>} />
      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4">
        {([['today', 'Hoje'], ['grow', 'Crescer'], ['church', 'Igreja & pessoas']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className={cn('shrink-0 rounded-full px-4 py-2 text-[14px] font-semibold', tab === v ? 'bg-black text-white dark:bg-white dark:text-black' : 'glass-thin')}>{l}</button>
        ))}
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {tab === 'today' && (
            <>
              <Section><BiblePlanMini /></Section>
              <Section><DevotionalCard /></Section>
              <Section><ActiveFast /></Section>
              <Section title="Estou orando por você"><PrayingFor /></Section>
              <Section><QuestionOfDay /></Section>
              <Section><ChurchMode /></Section>
            </>
          )}
          {tab === 'grow' && (
            <>
              <Section><MemoryReview /></Section>
              <Section title="Testemunhos"><Testimonies /></Section>
              <Section><ReadingMap /></Section>
              <Section><SpiritualYear /></Section>
              <Section title="Registros"><HubTiles kinds={['devotional', 'sermon', 'fast', 'memory', 'testimony']} /></Section>
            </>
          )}
          {tab === 'church' && (
            <>
              <Section title="Próximos na igreja" action={<button onClick={() => navigate('col', 'church')} className="text-[13px] font-medium muted">Ver tudo</button>}>
                {upcoming.length || serve.length ? (
                  <div className="glass overflow-hidden">
                    {[...upcoming, ...serve].map((e) => (
                      <button key={e.id} onClick={() => navigate('col', e.kind)} className="flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-0 hairline">
                        <div className="w-11 shrink-0 text-center">
                          <p className="text-[10.5px] uppercase muted">{e.date ? fmtDay(parseYmd(e.date), { weekday: 'short' }) : ''}</p>
                          <p className="text-[17px] font-bold leading-tight">{e.date ? parseYmd(e.date).getDate() : '—'}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-medium">{e.title}</p>
                          <p className="truncate text-[12px] muted">{[e.kind === 'serve' ? 'Escala' : e.data?.type, e.data?.time, e.data?.who, e.data?.role].filter(Boolean).join(' · ')}</p>
                        </div>
                        <ChevronRight size={16} className="muted" />
                      </button>
                    ))}
                  </div>
                ) : <p className="px-1 text-[13px] muted">Nada marcado. Adicione cultos, células e escalas.</p>}
              </Section>
              <Section title="Pessoas para cuidar"><PeopleDue /></Section>
              <Section><TitheCard /></Section>
              <Section title="Organizar"><HubTiles kinds={['church', 'serve', 'person', 'sermon']} /></Section>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
export { Sparkles, useMemo };
