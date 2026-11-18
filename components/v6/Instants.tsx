'use client';
/* Instantes: faixa da tela inicial, captura, visualização única e widget. */
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
export const isFresh = (e: Entry) => Date.now() - new Date(e.createdAt ?? 0).getTime() < DAY;

export function useInstants() {
  const { me } = useAtlas();
  const all = useEntries('instant');
  const inbox = all.filter((e) => e.createdBy !== me?.id && !e.data?.seenAt && isFresh(e)).sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
  const mine = all.filter((e) => e.createdBy === me?.id).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  return { all, inbox, mine };
}

/* ───────── Captura ───────── */
export function useCapture() {
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

export function DraftSheet({ draft, onSend, onCancel }: { draft: { path: string } | null; onSend: (c: string) => void; onCancel: () => void }) {
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
export function Viewer({ list: live, onClose, onReply }: { list: Entry[]; onClose: () => void; onReply: (id: string) => void }) {
  const { nameOf } = useAtlas();
  const { put } = useEntryActions();
  // congela a lista ao abrir: marcar como visto não pode fazer o instante sumir da tela
  const [list] = useState(live);
  const [i, setI] = useState(0);
  const e = list[i];
  const seen = useRef(new Set<string>());
  const markSeen = (x?: Entry) => {
    if (!x || seen.current.has(x.id)) return;
    seen.current.add(x.id);
    put('instant', { data: { seenAt: new Date().toISOString() } }, x);
  };
  useEffect(() => () => { markSeen(list[i]); }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
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
          <motion.button key={em} whileTap={{ scale: 1.4 }} onClick={() => { seen.current.add(e.id); put('instant', { data: { reaction: em, seenAt: new Date().toISOString() } }, e); vibe('love'); next(); }} className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-[22px]">{em}</motion.button>
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
