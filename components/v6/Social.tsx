'use client';
/* Nosso cantinho: Instantes (somem depois de vistos), Timeline (tweets do casal) e Mural (fotos permanentes). */
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, Camera, Eye, Heart, ImagePlus, MessageCircle, Pin, Quote, Repeat2, Star, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI } from '@/components/providers/UIProvider';
import { Photo, useEntries, useEntryActions } from '@/components/ui/Collection';
import { Avatar, Button, Chip, Glass, Section } from '@/components/ui/primitives';
import { photoUrl, uploadPhoto } from '@/lib/files';
import { celebrate, playSound, vibe } from '@/lib/fx';
import { AtlasNative, isNative } from '@/lib/native';
import type { Entry } from '@/lib/types';
import { cn, firstName, fmtDay, MONTHS, parseYmd, timeAgo, ymd } from '@/lib/utils';
import { EMERALD, Fade, norm, Pills } from './kit';

const DAY = 86_400_000;
const isFresh = (e: Entry) => Date.now() - new Date(e.createdAt ?? 0).getTime() < DAY;

export function useInstants() {
  const { me } = useAtlas();
  const all = useEntries('instant');
  const inbox = all.filter((e) => e.createdBy !== me?.id && !e.data?.seenAt && isFresh(e)).sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
  const mine = all.filter((e) => e.createdBy === me?.id).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  return { all, inbox, mine };
}

/* ───────── Captura ───────── */
function useCapture() {
  const { state, mode, alert } = useAtlas();
  const { put } = useEntryActions();
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{ path: string; replyTo?: string } | null>(null);
  const input = useRef<HTMLInputElement | null>(null);
  const reply = useRef<string | undefined>(undefined);
  const open = (replyTo?: string) => { reply.current = replyTo; input.current?.click(); };
  const el = (
    <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
      const f = e.target.files?.[0];
      e.target.value = '';
      if (!f || !state) return;
      setBusy(true);
      try { setDraft({ path: await uploadPhoto(f, state.couple.id, mode === 'demo'), replyTo: reply.current }); }
      catch (err) { alert({ kind: 'sync', title: 'Não deu para enviar', subtitle: String((err as Error)?.message ?? ''), duration: 3000 }); }
      setBusy(false);
    }} />
  );
  const send = (caption: string) => {
    if (!draft) return;
    put('instant', { title: caption.slice(0, 60), date: ymd(), data: { path: draft.path, replyTo: draft.replyTo ?? null } });
    setDraft(null);
    playSound('love'); vibe('love');
    alert({ kind: 'success', title: 'Instante enviado 📸', subtitle: 'Some depois que for visto', duration: 2200 });
  };
  return { open, el, busy, draft, send, cancel: () => setDraft(null) };
}

function DraftSheet({ draft, onSend, onCancel }: { draft: { path: string } | null; onSend: (c: string) => void; onCancel: () => void }) {
  const [c, setC] = useState('');
  return (
    <AnimatePresence>
      {draft && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] flex flex-col bg-black p-4 pt-[calc(1rem+var(--sat,env(safe-area-inset-top)))] text-white">
          <div className="relative flex-1 overflow-hidden rounded-[28px]"><Photo path={draft.path} className="h-full w-full" /></div>
          <div className="mt-3 flex gap-2 pb-[env(safe-area-inset-bottom)]">
            <button onClick={onCancel} className="grid h-12 w-12 place-items-center rounded-full bg-white/10"><X size={20} /></button>
            <input value={c} maxLength={60} onChange={(e) => setC(e.target.value)} placeholder="Legenda curtinha (opcional)" className="h-12 flex-1 rounded-full bg-white/10 px-4 text-[15px] outline-none placeholder:text-white/50" />
            <button onClick={() => { onSend(c); setC(''); }} className="h-12 rounded-full px-5 text-[15px] font-semibold text-black" style={{ background: EMERALD }}>Enviar</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───────── Visualizador (uma vez só) ───────── */
function Viewer({ list, onClose, onReply }: { list: Entry[]; onClose: () => void; onReply: (id: string) => void }) {
  const { nameOf } = useAtlas();
  const { put } = useEntryActions();
  const [i, setI] = useState(0);
  const e = list[i];
  const seen = useRef(new Set<string>());
  useEffect(() => {
    if (!e || seen.current.has(e.id)) return;
    seen.current.add(e.id);
    put('instant', { data: { seenAt: new Date().toISOString() } }, e);
  }, [e]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!e) return null;
  const next = () => (i < list.length - 1 ? setI(i + 1) : onClose());
  return (
    <motion.div initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] flex flex-col bg-black text-white">
      <div className="absolute inset-x-3 top-[calc(0.75rem+var(--sat,env(safe-area-inset-top)))] z-10 flex gap-1">{list.map((x, j) => <span key={x.id} className={cn('h-0.5 flex-1 rounded-full', j <= i ? 'bg-white' : 'bg-white/30')} />)}</div>
      <div className="absolute inset-x-4 top-[calc(1.6rem+var(--sat,env(safe-area-inset-top)))] z-10 flex items-center gap-2">
        <Avatar name={nameOf(e.createdBy)} size={30} />
        <span className="text-[14px] font-semibold">{firstName(nameOf(e.createdBy))}</span>
        <span className="text-[12px] text-white/60">{timeAgo(e.createdAt ?? '')}</span>
        <button onClick={onClose} className="ml-auto"><X size={22} /></button>
      </div>
      <button className="flex-1" onClick={next}><Photo path={e.data.path} className="h-full w-full object-contain" /></button>
      {e.title && <p className="absolute inset-x-0 bottom-36 text-center text-[17px] font-semibold drop-shadow">{e.title}</p>}
      <div className="flex items-center gap-2 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {['🤍', '😂', '😍', '🔥', '🥺'].map((em) => (
          <motion.button key={em} whileTap={{ scale: 1.4 }} onClick={() => { put('instant', { data: { reaction: em } }, e); vibe('love'); next(); }} className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-[22px]">{em}</motion.button>
        ))}
        <button onClick={() => { onClose(); onReply(e.id); }} className="ml-auto flex h-12 items-center gap-1.5 rounded-full bg-white px-4 text-[14px] font-semibold text-black"><Camera size={16} /> Responder</button>
      </div>
      <p className="pb-3 text-center text-[11px] text-white/50">Este instante some depois que você fechar</p>
    </motion.div>
  );
}

/** Faixa estilo "stories" para a tela inicial. */
export function InstantsStrip() {
  const { me, partner } = useAtlas();
  const { navigate } = useUI();
  const { inbox, mine } = useInstants();
  const cap = useCapture();
  const [view, setView] = useState(false);
  const posts = useEntries('post');
  const lastPost = posts.filter((p) => !p.data?.replyTo).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0];
  const sentToday = mine.find(isFresh);
  return (
    <>
      <Glass className="p-3.5">
        <div className="flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.92 }} onClick={() => (inbox.length ? setView(true) : navigate('tool', 'social'))} className="relative shrink-0">
            <span className="block rounded-full p-[2.5px]" style={{ background: inbox.length ? `conic-gradient(${EMERALD}, #34D399, ${EMERALD})` : 'transparent' }}>
              <span className="block rounded-full bg-white p-[2px] dark:bg-black"><Avatar profile={partner} size={48} /></span>
            </span>
            {inbox.length > 0 && <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} className="absolute -bottom-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold text-white ring-2 ring-white dark:ring-black" style={{ background: EMERALD }}>{inbox.length}</motion.span>}
          </motion.button>
          <button onClick={() => (inbox.length ? setView(true) : navigate('tool', 'social'))} className="min-w-0 flex-1 text-left">
            <p className="text-[15px] font-semibold">{inbox.length ? `${firstName(partner?.displayName ?? '')} mandou ${inbox.length > 1 ? `${inbox.length} instantes` : 'um instante'}` : 'Nosso cantinho'}</p>
            <p className="truncate text-[12.5px] muted">{inbox.length ? 'Toque para ver · some depois' : lastPost ? `“${lastPost.body}”` : 'Instantes, timeline e mural'}</p>
          </button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => cap.open()} aria-label="Mandar instante" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-black text-white dark:bg-white dark:text-black">
            {cap.busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Camera size={20} />}
          </motion.button>
        </div>
        {sentToday?.data?.reaction && <p className="mt-2 pl-[64px] text-[12px] muted">{firstName(partner?.displayName ?? '')} reagiu {sentToday.data.reaction} ao seu instante</p>}
        {cap.el}
      </Glass>
      <AnimatePresence>{view && <Viewer list={inbox} onClose={() => setView(false)} onReply={(id) => cap.open(id)} />}</AnimatePresence>
      <DraftSheet draft={cap.draft} onSend={cap.send} onCancel={cap.cancel} />
      {me && null}
    </>
  );
}

/* ───────── Aba Instantes ───────── */
function InstantsTab() {
  const { me, partner } = useAtlas();
  const { inbox, mine, all } = useInstants();
  const cap = useCapture();
  const [view, setView] = useState(false);
  const months = useMemo(() => Array.from(new Set(all.map((e) => (e.createdAt ?? '').slice(0, 7)))).sort().reverse(), [all]);
  const [recap, setRecap] = useState<string | null>(null);
  const curMonth = ymd().slice(0, 7);
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Glass className="p-5 text-center" onClick={() => cap.open()}>
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full text-white" style={{ background: EMERALD }}><Camera size={24} /></span>
          <p className="mt-3 text-[15px] font-semibold">{cap.busy ? 'Enviando…' : 'Mandar instante'}</p>
          <p className="text-[12px] muted">Sem filtro, sem editar</p>
        </Glass>
        <Glass className={cn('p-5 text-center', !inbox.length && 'opacity-60')} onClick={() => inbox.length && setView(true)}>
          <span className="mx-auto block w-fit rounded-full p-[2.5px]" style={{ background: inbox.length ? EMERALD : 'transparent' }}><span className="block rounded-full bg-white p-[2px] dark:bg-black"><Avatar profile={partner} size={50} /></span></span>
          <p className="mt-3 text-[15px] font-semibold">{inbox.length ? `${inbox.length} novo(s)` : 'Nada novo'}</p>
          <p className="text-[12px] muted">de {firstName(partner?.displayName ?? '')}</p>
        </Glass>
      </div>
      {cap.el}
      <Section className="mt-7" title="Meu arquivo" action={<span className="text-[12px] muted">só você vê</span>}>
        {mine.length === 0 ? <p className="px-1 text-[14px] muted">Os instantes que você manda ficam guardados aqui.</p> : (
          <div className="grid grid-cols-3 gap-1.5">
            {mine.slice(0, 30).map((e) => (
              <div key={e.id} className="relative aspect-[3/4] overflow-hidden rounded-2xl">
                <Photo path={e.data.path} className="h-full w-full" />
                <span className="absolute bottom-1 left-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] text-white">{e.data.seenAt ? <><Eye size={9} className="inline" /> {e.data.reaction ?? ''}</> : 'não visto'}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
      {months.length > 0 && (
        <Section title="Resumo do mês">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {months.map((m) => <Chip key={m} active={recap === m} onClick={() => setRecap(recap === m ? null : m)}>{MONTHS[Number(m.slice(5, 7)) - 1]} {m < curMonth ? '' : '(até agora)'}</Chip>)}
          </div>
          {recap && <Recap list={all.filter((e) => (e.createdAt ?? '').startsWith(recap) && (recap < curMonth || e.createdBy === me?.id))} title={`${MONTHS[Number(recap.slice(5, 7)) - 1]} de vocês`} />}
        </Section>
      )}
      <AnimatePresence>{view && <Viewer list={inbox} onClose={() => setView(false)} onReply={(id) => cap.open(id)} />}</AnimatePresence>
      <DraftSheet draft={cap.draft} onSend={cap.send} onCancel={cap.cancel} />
    </>
  );
}
function Recap({ list, title }: { list: Entry[]; title: string }) {
  const [i, setI] = useState(0);
  useEffect(() => { if (!list.length) return; const t = window.setInterval(() => setI((x) => (x + 1) % list.length), 1400); return () => window.clearInterval(t); }, [list.length]);
  if (!list.length) return null;
  return (
    <div className="mt-3 overflow-hidden rounded-[28px]">
      <div className="relative aspect-[3/4] bg-black">
        <AnimatePresence mode="popLayout"><motion.div key={list[i].id} initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="absolute inset-0"><Photo path={list[i].data.path} className="h-full w-full" /></motion.div></AnimatePresence>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 text-white">
          <p className="text-[12px] uppercase tracking-widest opacity-70">Resumo</p>
          <p className="text-[24px] font-bold capitalize">{title}</p>
          <p className="text-[13px] opacity-80">{list.length} instantes · {list[i].title || fmtDay(list[i].createdAt ?? '')}</p>
        </div>
      </div>
    </div>
  );
}

/* ───────── Timeline ───────── */
const TOPICS = ['Uma coisa que me fez rir hoje', 'Minha opinião impopular sobre comida', 'O que eu faria com um dia de folga amanhã', 'Indireta construtiva da semana 👀', 'Um elogio público', 'Qual a melhor parte de ser casado(a)?', 'Uma meta que ninguém sabe', 'Coisa que eu nunca vou entender', 'Música do dia', 'Ranking: as 3 melhores comidas da casa'];
const STOP = new Set('a o e de da do das dos que em um uma pra para com não nao no na nos nas se eu você voce me te é é mas por mais isso esse essa ele ela tá ta vou foi ser ter tem já ja só so muito meu minha seu sua hoje quando como ao aos às'.split(' '));

function useTimeline() {
  const all = useEntries('post');
  const root = all.filter((p) => !p.data?.replyTo).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  const replies = (id: string) => all.filter((p) => p.data?.replyTo === id).sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
  return { all, root, replies, byId: (id: string) => all.find((p) => p.id === id) };
}

function Composer({ replyTo, quote, onDone, autoFocus }: { replyTo?: string; quote?: Entry | null; onDone?: () => void; autoFocus?: boolean }) {
  const { put } = useEntryActions();
  const [t, setT] = useState('');
  const [ind, setInd] = useState(false);
  const [poll, setPoll] = useState<string[] | null>(null);
  const topic = TOPICS[new Date().getDate() % TOPICS.length];
  const left = 280 - t.length;
  const send = () => {
    if (!t.trim()) return;
    put('post', { title: t.slice(0, 60), body: t.trim(), date: ymd(), data: { likes: [], replyTo: replyTo ?? null, quote: quote?.id ?? null, indireta: ind, poll: poll && poll.filter(Boolean).length >= 2 ? { opts: poll.filter(Boolean), votes: {} } : null } });
    setT(''); setInd(false); setPoll(null);
    playSound('pop');
    onDone?.();
  };
  return (
    <div className={cn(!replyTo && 'glass p-4')}>
      {!replyTo && !t && !quote && <button onClick={() => setT(`${topic}: `)} className="mb-2 text-[12.5px] font-medium" style={{ color: EMERALD }}>💡 Assunto do dia: {topic}</button>}
      {quote && <div className="mb-2 rounded-2xl border p-3 text-[13px] hairline"><Quote size={12} className="mr-1 inline" />{quote.body}</div>}
      <textarea autoFocus={autoFocus} rows={replyTo ? 2 : 3} maxLength={280} value={t} onChange={(e) => setT(e.target.value)} placeholder={replyTo ? 'Responder…' : 'O que está acontecendo? 👀'} className="input resize-none !text-[16px]" />
      {poll && (
        <div className="mt-2 space-y-1.5">
          {poll.map((o, i) => <input key={i} value={o} maxLength={40} onChange={(e) => setPoll(poll.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Opção ${i + 1}`} className="input !py-2" />)}
          {poll.length < 4 && <button onClick={() => setPoll([...poll, ''])} className="text-[12.5px] muted">+ opção</button>}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        {!replyTo && <Chip active={ind} onClick={() => setInd(!ind)}>👀 Indireta</Chip>}
        {!replyTo && <Chip active={!!poll} onClick={() => setPoll(poll ? null : ['', ''])}><BarChart3 size={13} /> Enquete</Chip>}
        <span className={cn('ml-auto text-[12px] tabular-nums', left < 20 ? 'text-red-500' : 'muted')}>{left}</span>
        <Button variant="primary" className="h-9 px-4" disabled={!t.trim()} onClick={send}>{replyTo ? 'Responder' : 'Postar'}</Button>
      </div>
    </div>
  );
}

function PostCard({ p, depth = 0 }: { p: Entry; depth?: number }) {
  const { me, nameOf, rows } = useAtlas();
  const { put, del } = useEntryActions();
  const { replies, byId } = useTimeline();
  const [open, setOpen] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const likes: string[] = p.data?.likes ?? [];
  const liked = !!me && likes.includes(me.id);
  const reps = replies(p.id);
  const q = p.data?.quote ? byId(p.data.quote) : null;
  const mine = p.createdBy === me?.id;
  const poll = p.data?.poll as { opts: string[]; votes: Record<string, number> } | null;
  const myVote = me && poll ? poll.votes?.[me.id] : undefined;
  const total = poll ? Object.keys(poll.votes ?? {}).length : 0;
  const stars: string[] = p.data?.stars ?? [];
  const toggle = (k: 'likes' | 'stars') => {
    if (!me) return;
    const arr: string[] = p.data?.[k] ?? [];
    put('post', { data: { [k]: arr.includes(me.id) ? arr.filter((x) => x !== me.id) : [...arr, me.id] } }, p);
    if (k === 'likes' && !arr.includes(me.id)) { vibe('love'); playSound('love'); }
  };
  void rows;
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn(depth === 0 ? 'glass p-4' : 'border-l-2 pl-3 pt-3 hairline')}>
      <div className="flex gap-3">
        <Avatar name={nameOf(p.createdBy)} size={depth ? 28 : 38} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[13px]">
            <span className="font-semibold">{firstName(nameOf(p.createdBy))}</span>
            <span className="muted">· {timeAgo(p.createdAt ?? '')}</span>
            {p.data?.pinned && <Pin size={12} className="muted" />}
          </div>
          {p.data?.indireta && <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: EMERALD + '22', color: EMERALD }}>👀 isso é pra alguém…</span>}
          <p className="mt-1 whitespace-pre-wrap text-[15.5px] leading-snug [overflow-wrap:anywhere]">{p.body}</p>
          {q && <div className="mt-2 rounded-2xl border p-3 text-[13.5px] hairline"><span className="font-semibold">{firstName(nameOf(q.createdBy))}</span> <span className="muted">·</span> {q.body}</div>}
          {poll && (
            <div className="mt-2 space-y-1.5">
              {poll.opts.map((o, i) => {
                const n = Object.values(poll.votes ?? {}).filter((v) => v === i).length;
                const pct = total ? Math.round((n / total) * 100) : 0;
                return (
                  <button key={i} disabled={myVote !== undefined || !me} onClick={() => me && put('post', { data: { poll: { ...poll, votes: { ...(poll.votes ?? {}), [me.id]: i } } } }, p)} className="relative block w-full overflow-hidden rounded-xl bg-black/[0.04] px-3 py-2 text-left text-[14px] dark:bg-white/[0.06]">
                    {myVote !== undefined && <motion.span initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="absolute inset-y-0 left-0" style={{ background: EMERALD + (myVote === i ? '55' : '22') }} />}
                    <span className="relative flex justify-between"><span>{o}</span>{myVote !== undefined && <span className="font-semibold">{pct}%</span>}</span>
                  </button>
                );
              })}
              <p className="text-[11.5px] muted">{total} voto(s)</p>
            </div>
          )}
          <div className="-ml-2 mt-2 flex items-center gap-1 text-[12.5px] muted">
            <button onClick={() => toggle('likes')} className={cn('flex items-center gap-1 rounded-full px-2 py-1', liked && 'text-red-500')}><motion.span animate={liked ? { scale: [1, 1.4, 1] } : {}}><Heart size={15} className={liked ? 'fill-current' : ''} /></motion.span>{likes.length || ''}</button>
            {depth === 0 && <button onClick={() => setOpen(!open)} className="flex items-center gap-1 rounded-full px-2 py-1"><MessageCircle size={15} />{reps.length || ''}</button>}
            {depth === 0 && <button onClick={() => setQuoting(!quoting)} className="flex items-center gap-1 rounded-full px-2 py-1"><Repeat2 size={15} /></button>}
            {depth === 0 && <button onClick={() => toggle('stars')} className={cn('flex items-center gap-1 rounded-full px-2 py-1', me && stars.includes(me.id) && 'text-amber-500')} title="Melhor post do mês"><Star size={15} className={me && stars.includes(me.id) ? 'fill-current' : ''} /></button>}
            {mine && depth === 0 && <button onClick={() => put('post', { data: { pinned: !p.data?.pinned } }, p)} className="rounded-full px-2 py-1"><Pin size={14} /></button>}
            {mine && <button onClick={() => del(p.id)} className="ml-auto rounded-full px-2 py-1"><Trash2 size={14} /></button>}
          </div>
          {!mine && p.data?.indireta && depth === 0 && !reps.some((r) => r.createdBy === me?.id) && (
            <button onClick={() => put('post', { title: 'foi pra mim?', body: 'foi pra mim? 👀', date: ymd(), data: { likes: [], replyTo: p.id } })} className="mt-1 rounded-full bg-black/[0.05] px-3 py-1.5 text-[12.5px] font-semibold dark:bg-white/[0.08]">Foi pra mim? 👀</button>
          )}
          {quoting && <div className="mt-3"><Composer quote={p} onDone={() => setQuoting(false)} autoFocus /></div>}
          {(open || (depth === 0 && reps.length > 0 && reps.length <= 2)) && depth === 0 && (
            <div className="mt-2 space-y-1">
              {reps.map((r) => <PostCard key={r.id} p={r} depth={1} />)}
              {open && <div className="pt-2"><Composer replyTo={p.id} autoFocus /></div>}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function TimelineTab() {
  const { root, all } = useTimeline();
  const pinned = root.filter((p) => p.data?.pinned);
  const rest = root.filter((p) => !p.data?.pinned);
  const trending = useMemo(() => {
    const since = Date.now() - 7 * DAY;
    const c: Record<string, number> = {};
    all.filter((p) => new Date(p.createdAt ?? 0).getTime() > since).forEach((p) => norm(p.body ?? '').split(/[^a-z0-9#]+/).filter((w) => w.length > 3 && !STOP.has(w)).forEach((w) => { c[w] = (c[w] ?? 0) + 1; }));
    return Object.entries(c).filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [all]);
  const month = ymd().slice(0, 7);
  const best = root.filter((p) => (p.createdAt ?? '').startsWith(month)).map((p) => ({ p, s: (p.data?.stars?.length ?? 0) * 3 + (p.data?.likes?.length ?? 0) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s)[0];
  return (
    <>
      <Composer />
      {(trending.length > 0 || best) && (
        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
          {best && <Glass className="w-56 shrink-0 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide muted">⭐ Post do mês</p><p className="mt-1 line-clamp-2 text-[13.5px]">{best.p.body}</p></Glass>}
          {trending.length > 0 && <Glass className="w-56 shrink-0 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide muted">🔥 Em alta no casal</p>{trending.map(([w, n], i) => <p key={w} className="text-[13px]"><span className="muted">{i + 1}.</span> {w} <span className="muted">· {n}</span></p>)}</Glass>}
        </div>
      )}
      <div className="mt-4 space-y-3">
        {[...pinned, ...rest].map((p) => <PostCard key={p.id} p={p} />)}
        {root.length === 0 && <p className="py-8 text-center text-[14px] muted">Ninguém postou ainda. Começa com uma indireta 👀</p>}
      </div>
    </>
  );
}

/* ───────── Mural ───────── */
function MuralTab() {
  const { state, mode, me, rows, nameOf, alert } = useAtlas();
  const { put, del } = useEntryActions();
  const mural = useEntries('mural').sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  const instants = useEntries('instant');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{ path: string; cap: string; date: string } | null>(null);
  const md = ymd().slice(5);
  const yearsAgo = [...mural, ...instants].filter((e) => (e.date ?? '').slice(5) === md && (e.date ?? '').slice(0, 4) < ymd().slice(0, 4));
  const milestones = rows('special_dates').filter((d) => d.date.slice(5) === md && d.date.slice(0, 4) < ymd().slice(0, 4)).map((d) => ({ d, years: Number(ymd().slice(0, 4)) - Number(d.date.slice(0, 4)) }));
  return (
    <>
      <label className="glass flex cursor-pointer items-center gap-3 p-4">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-black text-white dark:bg-white dark:text-black"><ImagePlus size={20} /></span>
        <span className="flex-1"><span className="block text-[15px] font-semibold">{busy ? 'Enviando…' : 'Postar no mural'}</span><span className="text-[12.5px] muted">Fotos que ficam para sempre</span></span>
        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0]; e.target.value = '';
          if (!f || !state) return;
          setBusy(true);
          try { setDraft({ path: await uploadPhoto(f, state.couple.id, mode === 'demo'), cap: '', date: ymd() }); } catch { alert({ kind: 'sync', title: 'Não deu para enviar a foto', duration: 2500 }); }
          setBusy(false);
        }} />
      </label>
      {draft && (
        <Glass className="mt-3 p-4">
          <Photo path={draft.path} className="aspect-square w-full rounded-2xl" />
          <input value={draft.cap} onChange={(e) => setDraft({ ...draft, cap: e.target.value })} placeholder="Legenda" className="input mt-3" />
          <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="input mt-2" />
          <div className="mt-3 flex gap-2"><Button className="flex-1" onClick={() => setDraft(null)}>Cancelar</Button><Button variant="primary" className="flex-1" onClick={() => { put('mural', { title: draft.cap, date: draft.date, data: { path: draft.path, likes: [] } }); setDraft(null); playSound('done'); }}>Postar</Button></div>
        </Glass>
      )}
      {milestones.map(({ d, years }) => (
        <Glass key={d.id} className="mt-3 p-5 text-center"><p className="text-[34px]">🎉</p><p className="text-[18px] font-bold">Hoje faz {years} ano{years > 1 ? 's' : ''}</p><p className="text-[14px] muted">{d.title}</p></Glass>
      ))}
      {yearsAgo.length > 0 && (
        <Section className="mt-6" title="Neste dia, anos atrás">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {yearsAgo.map((e) => <div key={e.id} className="relative h-44 w-32 shrink-0 overflow-hidden rounded-2xl"><Photo path={e.data.path} className="h-full w-full" /><span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white">há {Number(ymd().slice(0, 4)) - Number(e.date!.slice(0, 4))} ano(s)</span></div>)}
          </div>
        </Section>
      )}
      <div className="mt-5 space-y-4">
        {mural.map((e) => {
          const likes: string[] = e.data?.likes ?? [];
          const liked = !!me && likes.includes(me.id);
          return (
            <motion.div key={e.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass overflow-hidden">
              <button className="block w-full" onDoubleClick={() => me && !liked && put('mural', { data: { likes: [...likes, me.id] } }, e)}><Photo path={e.data.path} className="aspect-[4/5] w-full" /></button>
              <div className="flex items-center gap-2 p-3.5">
                <button onClick={() => me && put('mural', { data: { likes: liked ? likes.filter((x) => x !== me.id) : [...likes, me.id] } }, e)} className={cn(liked && 'text-red-500')}><Heart size={20} className={liked ? 'fill-current' : ''} /></button>
                <div className="min-w-0 flex-1"><p className="truncate text-[14px]"><b>{firstName(nameOf(e.createdBy))}</b> {e.title}</p><p className="text-[11.5px] muted">{e.date ? fmtDay(parseYmd(e.date), { day: '2-digit', month: 'long', year: 'numeric' }) : ''}</p></div>
                {e.createdBy === me?.id && <button onClick={() => del(e.id)} className="muted"><Trash2 size={15} /></button>}
              </div>
            </motion.div>
          );
        })}
        {mural.length === 0 && <p className="py-6 text-center text-[14px] muted">O mural começa com a primeira foto de vocês 📷</p>}
      </div>
    </>
  );
}

export function SocialTool() {
  const [tab, setTab] = useState<'instants' | 'timeline' | 'mural'>('instants');
  const { inbox } = useInstants();
  return (
    <>
      <Pills value={tab} onChange={setTab} options={[['instants', `Instantes${inbox.length ? ` · ${inbox.length}` : ''}`], ['timeline', 'Timeline'], ['mural', 'Mural']]} />
      <Fade k={tab}>{tab === 'instants' ? <InstantsTab /> : tab === 'timeline' ? <TimelineTab /> : <MuralTab />}</Fade>
    </>
  );
}

/** Atualiza o widget "Instante na tela" com o último instante não visto do par. */
export function InstantWidgetSync() {
  const { inbox } = useInstants();
  const { nameOf } = useAtlas();
  const last = inbox[inbox.length - 1];
  const key = last?.id ?? 'none';
  useEffect(() => {
    if (!isNative()) return;
    let on = true;
    (async () => {
      if (!last) { await AtlasNative.setInstantWidget({ image: '', caption: '', from: '' }).catch(() => {}); return; }
      const url = await photoUrl(last.data.path);
      if (!url || !on) return;
      try {
        const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = url; });
        const k = Math.min(1, 640 / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k;
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        const b64 = c.toDataURL('image/jpeg', 0.8).split(',')[1];
        await AtlasNative.setInstantWidget({ image: b64, caption: last.title || 'Toque para ver', from: firstName(nameOf(last.createdBy)) });
      } catch { /* noop */ }
    })();
    return () => { on = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  void celebrate;
  return null;
}
