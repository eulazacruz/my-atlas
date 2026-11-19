'use client';
/* Reclame Aqui do casal: abrir reclamação, prazo (SLA), resposta, solução, nota e reputação. */
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Clock, Megaphone, RotateCcw, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI, useSubNav } from '@/components/providers/UIProvider';
import { useEntries, useEntryActions } from '@/components/ui/Collection';
import { Button, Glass, Section } from '@/components/ui/primitives';
import { celebrate, playSound } from '@/lib/fx';
import type { Entry } from '@/lib/types';
import { cn, firstName } from '@/lib/utils';
import { Big, EMERALD, Pills } from './kit';

export const COMPLAINT_CATS: { id: string; label: string; emoji: string }[] = [
  { id: 'atencao', label: 'Atenção', emoji: '👀' },
  { id: 'comunicacao', label: 'Comunicação', emoji: '💬' },
  { id: 'casa', label: 'Tarefas de casa', emoji: '🧹' },
  { id: 'ciumes', label: 'Ciúmes', emoji: '😒' },
  { id: 'promessa', label: 'Promessa não cumprida', emoji: '🤞' },
  { id: 'financas', label: 'Finanças', emoji: '💸' },
  { id: 'tempo', label: 'Tempo juntos', emoji: '⏳' },
  { id: 'esquecimento', label: 'Esquecimento', emoji: '🧠' },
  { id: 'celular', label: 'Celular demais', emoji: '📱' },
  { id: 'outro', label: 'Outro', emoji: '📝' },
];
const SEVERITY = [
  { id: 'leve', label: 'Leve', hint: 'Dá pra conversar com calma', hours: 72, emoji: '🌤️' },
  { id: 'media', label: 'Média', hint: 'Precisa de atenção', hours: 48, emoji: '⛅' },
  { id: 'grave', label: 'Grave', hint: 'Resolve logo, por favor', hours: 24, emoji: '⛈️' },
] as const;
const STATUS: Record<string, { label: string; color: string }> = {
  open: { label: 'Aberta', color: '#F59E0B' },
  reopened: { label: 'Reaberta', color: '#EF4444' },
  progress: { label: 'Em andamento', color: '#3B82F6' },
  resolved: { label: 'Aguardando confirmação', color: '#8B5CF6' },
  closed: { label: 'Resolvida', color: EMERALD },
};
const ACTIVE = ['open', 'reopened', 'progress'];
const cat = (id?: string) => COMPLAINT_CATS.find((c) => c.id === id) ?? COMPLAINT_CATS[COMPLAINT_CATS.length - 1];

/* ───── relógio do SLA ───── */
function useNow(ms = 30_000) {
  const [n, setN] = useState(() => Date.now());
  useEffect(() => { const t = window.setInterval(() => setN(Date.now()), ms); return () => window.clearInterval(t); }, [ms]);
  return n;
}
function fmtLeft(ms: number) {
  const a = Math.abs(ms);
  const h = Math.floor(a / 3_600_000), m = Math.floor((a % 3_600_000) / 60_000);
  const s = h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : h ? `${h}h ${m}min` : `${m}min`;
  return ms >= 0 ? `${s} restantes` : `estourado há ${s}`;
}
function sla(e: Entry, now: number) {
  const d = e.data;
  const due = new Date(d.dueAt).getTime();
  const total = (d.slaHours ?? 48) * 3_600_000;
  const stopped = !ACTIVE.includes(d.status);
  const ref = stopped ? new Date(d.resolvedAt ?? d.closedAt ?? now).getTime() : now;
  const left = due - ref;
  const pct = Math.max(0, Math.min(1, left / total));
  const color = left < 0 ? '#EF4444' : pct < 0.25 ? '#F97316' : pct < 0.5 ? '#F59E0B' : EMERALD;
  return { left, pct, color, stopped, late: left < 0 };
}

function SlaBar({ e, big }: { e: Entry; big?: boolean }) {
  const now = useNow();
  const s = sla(e, now);
  return (
    <div>
      <div className="flex items-center justify-between text-[12px] font-medium">
        <span className="flex items-center gap-1" style={{ color: s.color }}><Clock size={12} />{s.stopped ? (s.late ? 'Resolvida fora do prazo' : 'Resolvida no prazo') : s.late ? `SLA ${fmtLeft(s.left)}` : fmtLeft(s.left)}</span>
        <span className="muted">SLA {e.data.slaHours}h</span>
      </div>
      <div className={cn('mt-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]', big ? 'h-2.5' : 'h-1.5')}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${(s.late ? 1 : s.pct) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} className={cn('h-full rounded-full', s.late && !s.stopped && 'animate-pulse')} style={{ background: s.color }} />
      </div>
    </div>
  );
}

function StatusChip({ st }: { st: string }) {
  const s = STATUS[st] ?? STATUS.open;
  return <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ color: s.color, background: s.color + '1f' }}>{s.label}</span>;
}

/* ───── reputação estilo Reclame Aqui ───── */
export function reputation(list: Entry[]) {
  const now = Date.now();
  const total = list.length;
  // Só pesa o que já devia estar resolvido: encerradas, aguardando confirmação ou com prazo estourado.
  const evalList = list.filter((e) => !ACTIVE.includes(e.data.status) || sla(e, now).late);
  const answered = list.filter((e) => e.data.response || e.data.status !== 'open').length;
  const done = list.filter((e) => e.data.status === 'closed');
  const solved = evalList.filter((e) => e.data.status === 'closed' || e.data.status === 'resolved');
  const ratings = done.map((e) => e.data.rating).filter(Boolean) as number[];
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  const onTime = solved.filter((e) => !sla(e, now).late).length;
  const hrs = done.map((e) => (new Date(e.data.closedAt ?? e.data.resolvedAt).getTime() - new Date(e.data.openedAt).getTime()) / 3_600_000).filter((x) => x > 0);
  const avgH = hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : 0;
  const resRate = total ? done.length / total : 0;
  const ansRate = total ? answered / total : 0;
  const onRate = solved.length ? onTime / solved.length : 0;
  const solveRate = evalList.length ? solved.length / evalList.length : 1;
  const score = !evalList.length ? 10 : Math.round((solveRate * 4.5 + (ratings.length ? avg / 5 : solveRate) * 3 + onRate * 2.5) * 10) / 10;
  const seal = !total ? { t: 'Sem reclamações', e: '😇', c: EMERALD } : !evalList.length ? { t: 'Dentro do prazo', e: '⏳', c: EMERALD } : score >= 8 ? { t: 'Ótimo', e: '🏆', c: EMERALD } : score >= 7 ? { t: 'Bom', e: '👍', c: '#22C55E' } : score >= 6 ? { t: 'Regular', e: '😐', c: '#F59E0B' } : score >= 5 ? { t: 'Ruim', e: '😬', c: '#F97316' } : { t: 'Não recomendado', e: '🚨', c: '#EF4444' };
  return { total, done: done.length, resRate, ansRate, avg, avgH, onRate, score, seal };
}

/* ───── tela principal ───── */
export function ComplaintsTool() {
  const { me, partner } = useAtlas();
  const all = useEntries('complaint');
  const [tab, setTab] = useState<'against' | 'mine' | 'rep'>('against');
  const [page, setPage] = useSubNav<string>('');
  const now = useNow();
  const pName = firstName(partner?.displayName ?? 'seu amor');
  const against = all.filter((e) => e.data.against === me?.id).sort(sorter);
  const mine = all.filter((e) => e.createdBy === me?.id).sort(sorter);
  const openAgainst = against.filter((e) => ACTIVE.includes(e.data.status)).length;
  const lateAgainst = against.filter((e) => ACTIVE.includes(e.data.status) && sla(e, now).late).length;

  if (page === 'new') return <NewComplaint onDone={() => setPage('')} />;
  const cur = all.find((e) => e.id === page);
  if (page && cur) return <Detail e={cur} />;

  return (
    <>
      <Glass className="relative mb-4 overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-6 -top-6 text-[110px] opacity-[0.07]">📢</div>
        <p className="text-[18px] font-bold tracking-tight">Algo te incomodou?</p>
        <p className="mt-1 text-[13.5px] muted">Desabafe aqui. {pName} recebe na hora e tem um prazo pra resolver — com carinho, sem briga.</p>
        <Button variant="primary" className="mt-4 w-full" onClick={() => setPage('new')}><Megaphone size={15} /> Abrir reclamação</Button>
      </Glass>

      {openAgainst > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-[22px] p-4 text-[13.5px] font-medium" style={{ background: (lateAgainst ? '#EF4444' : '#F59E0B') + '1a', color: lateAgainst ? '#EF4444' : '#D97706' }}>
          {lateAgainst ? `🚨 ${lateAgainst} reclamação${lateAgainst > 1 ? 'ões' : ''} com SLA estourado. Corre!` : `⏳ Você tem ${openAgainst} reclamação${openAgainst > 1 ? 'ões' : ''} aberta${openAgainst > 1 ? 's' : ''} pra resolver.`}
        </motion.div>
      )}

      <Pills value={tab} onChange={setTab} options={[['against', `Contra mim${openAgainst ? ` · ${openAgainst}` : ''}`], ['mine', 'Que eu abri'], ['rep', 'Reputação']]} />

      {tab === 'rep' ? <Reputation mine={against} theirs={all.filter((e) => e.data.against && e.data.against !== me?.id)} pName={pName} /> : (
        <List items={tab === 'against' ? against : mine} empty={tab === 'against' ? { e: '😇', t: 'Nenhuma reclamação contra você', h: 'Continue assim. Ou abra uma pra ver como é 😏' } : { e: '🕊️', t: 'Você ainda não abriu nenhuma', h: 'Quando algo pesar, é só desabafar aqui.' }} onOpen={(id) => setPage(id)} who={tab === 'against' ? pName : 'Você'} />
      )}
    </>
  );
}
const ORDER: Record<string, number> = { reopened: 0, open: 1, progress: 2, resolved: 3, closed: 4 };
function sorter(a: Entry, b: Entry) { return (ORDER[a.data.status] ?? 9) - (ORDER[b.data.status] ?? 9) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''); }

function List({ items, empty, onOpen, who }: { items: Entry[]; empty: { e: string; t: string; h: string }; onOpen: (id: string) => void; who: string }) {
  if (!items.length) return <Big emoji={empty.e} title={empty.t} hint={empty.h} />;
  return (
    <div className="space-y-2.5">
      {items.map((e, i) => {
        const c = cat(e.data.category);
        return (
          <motion.button key={e.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }} whileTap={{ scale: 0.98 }} onClick={() => onOpen(e.id)} className="glass block w-full p-4 text-left">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] bg-black/[0.05] text-[22px] dark:bg-white/[0.07]">{c.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><p className="min-w-0 flex-1 truncate text-[15px] font-semibold">{e.title}</p><StatusChip st={e.data.status} /></div>
                <p className="mt-0.5 truncate text-[12.5px] muted">{c.label} · {who === 'Você' ? 'você abriu' : `${who} abriu`} {ago(e.data.openedAt)}</p>
              </div>
            </div>
            <div className="mt-3"><SlaBar e={e} /></div>
          </motion.button>
        );
      })}
    </div>
  );
}
function ago(iso?: string) {
  if (!iso) return '';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `há ${Math.max(1, m)} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.round(h / 24);
  return `há ${d} dia${d > 1 ? 's' : ''}`;
}

/* ───── abrir reclamação ───── */
function NewComplaint({ onDone }: { onDone: () => void }) {
  const { partner } = useAtlas();
  const { put } = useEntryActions();
  const [c, setC] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [sev, setSev] = useState<(typeof SEVERITY)[number]['id']>('media');
  const ok = c && title.trim().length > 2;
  const send = () => {
    if (!ok || !partner) return;
    const s = SEVERITY.find((x) => x.id === sev)!;
    const now = new Date();
    const ev = { at: now.toISOString(), ev: 'open', text: text.trim() };
    put('complaint', {
      title: title.trim(), body: text.trim(),
      data: { category: c, categoryLabel: cat(c).label, severity: sev, slaHours: s.hours, against: partner.id, status: 'open', openedAt: now.toISOString(), dueAt: new Date(now.getTime() + s.hours * 3_600_000).toISOString(), events: [ev] },
    });
    playSound('pop');
    celebrate('Reclamação registrada 📢');
    onDone();
  };
  return (
    <div>
      <p className="mb-4 px-1 text-[13.5px] muted">Contra {firstName(partner?.displayName ?? 'seu amor')}. Seja sincero(a), mas com carinho 💚</p>
      <Section title="Categoria">
        <div className="grid grid-cols-2 gap-2">
          {COMPLAINT_CATS.map((x) => (
            <motion.button key={x.id} whileTap={{ scale: 0.95 }} onClick={() => setC(x.id)} className={cn('flex items-center gap-2 rounded-[18px] p-3 text-left text-[13.5px] font-semibold transition', c === x.id ? 'bg-black text-white dark:bg-white dark:text-black' : 'glass-thin')}>
              <span className="text-[19px]">{x.emoji}</span><span className="leading-tight">{x.label}</span>
            </motion.button>
          ))}
        </div>
      </Section>
      <Section title="O que aconteceu">
        <input className="input" placeholder="Resumo em uma frase" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
        <textarea rows={6} className="input mt-2" placeholder="Desabafa aqui… pode contar tudo, sem filtro." value={text} onChange={(e) => setText(e.target.value)} />
      </Section>
      <Section title="Gravidade e prazo">
        <div className="space-y-2">
          {SEVERITY.map((s) => (
            <button key={s.id} onClick={() => setSev(s.id)} className={cn('flex w-full items-center gap-3 rounded-[18px] p-3.5 text-left transition', sev === s.id ? 'bg-black text-white dark:bg-white dark:text-black' : 'glass-thin')}>
              <span className="text-[22px]">{s.emoji}</span>
              <span className="flex-1"><span className="block text-[14.5px] font-semibold">{s.label}</span><span className={cn('text-[12px]', sev === s.id ? 'opacity-70' : 'muted')}>{s.hint}</span></span>
              <span className="text-[13px] font-bold tabular-nums">{s.hours}h</span>
            </button>
          ))}
        </div>
      </Section>
      <Button variant="primary" className="w-full" disabled={!ok} onClick={send}><Megaphone size={15} /> Enviar reclamação</Button>
    </div>
  );
}

/* ───── detalhe ───── */
function Detail({ e }: { e: Entry }) {
  const { me, partner } = useAtlas();
  const { put } = useEntryActions();
  const [txt, setTxt] = useState('');
  const [mode, setMode] = useState<'' | 'respond' | 'resolve' | 'rate' | 'reopen'>('');
  const [rating, setRating] = useState(0);
  const d = e.data;
  const c = cat(d.category);
  const iAmAccused = d.against === me?.id;
  const iAmAuthor = e.createdBy === me?.id;
  const author = iAmAuthor ? 'Você' : firstName(partner?.displayName ?? 'Seu amor');
  const accused = iAmAccused ? 'Você' : firstName(partner?.displayName ?? 'Seu amor');
  const events: { at: string; ev: string; text?: string; rating?: number }[] = d.events ?? [];
  const push = (patch: Record<string, unknown>, ev: { ev: string; text?: string; rating?: number }, extra: Partial<Entry> = {}) => {
    put('complaint', { ...extra, data: { ...patch, events: [...events, { at: new Date().toISOString(), ...ev }] } }, e);
    setTxt(''); setMode('');
  };
  const respond = () => { push({ status: 'progress', response: txt.trim() }, { ev: 'respond', text: txt.trim() }); playSound('done'); };
  const resolve = () => { push({ status: 'resolved', resolution: txt.trim(), resolvedAt: new Date().toISOString() }, { ev: 'resolve', text: txt.trim() }); playSound('done'); celebrate('Enviado para confirmação ✅'); };
  const accept = () => { push({ status: 'closed', rating, closedAt: new Date().toISOString() }, { ev: 'close', rating, text: txt.trim() }, { done: true }); playSound('celebrate'); celebrate('Reclamação encerrada 🤝'); };
  const reopen = () => { const now = Date.now(); push({ status: 'reopened', slaHours: 24, dueAt: new Date(now + 24 * 3_600_000).toISOString(), resolvedAt: null }, { ev: 'reopen', text: txt.trim() }); playSound('pop'); };
  const LABEL: Record<string, string> = { open: `${author} abriu a reclamação`, respond: `${accused} respondeu`, resolve: `${accused} marcou como resolvida`, close: `${author} aceitou a solução`, reopen: `${author} reabriu` };

  return (
    <div>
      <Glass className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-black/[0.05] text-[26px] dark:bg-white/[0.07]">{c.emoji}</span>
          <div className="min-w-0 flex-1"><p className="text-[12px] font-semibold uppercase tracking-wider muted">{c.label} · {SEVERITY.find((s) => s.id === d.severity)?.label}</p><p className="text-[18px] font-bold leading-tight tracking-tight">{e.title}</p></div>
        </div>
        <div className="mt-3"><StatusChip st={d.status} /></div>
        <div className="mt-4"><SlaBar e={e} big /></div>
      </Glass>

      <Section title="Linha do tempo">
        <div className="relative space-y-3 pl-5">
          <span className="absolute bottom-2 left-[5px] top-2 w-px bg-current opacity-15" />
          {events.map((v, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="relative">
              <span className="absolute -left-5 top-1.5 h-[11px] w-[11px] rounded-full ring-4 ring-[var(--bg,#000)]" style={{ background: v.ev === 'close' ? EMERALD : v.ev === 'reopen' ? '#EF4444' : v.ev === 'open' ? '#F59E0B' : '#3B82F6' }} />
              <p className="text-[13px] font-semibold">{LABEL[v.ev] ?? v.ev} <span className="font-normal muted">· {new Date(v.at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></p>
              {v.rating ? <p className="mt-0.5 flex gap-0.5">{Array.from({ length: 5 }, (_, k) => <Star key={k} size={13} className={k < v.rating! ? 'fill-amber-400 text-amber-400' : 'opacity-25'} />)}</p> : null}
              {v.text ? <p className="glass-thin mt-1.5 whitespace-pre-wrap rounded-[16px] p-3 text-[14px]">{v.text}</p> : null}
            </motion.div>
          ))}
        </div>
      </Section>

      <AnimatePresence mode="wait">
        {mode && (
          <motion.div key={mode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-3">
            {mode === 'rate' && (
              <div className="mb-3 text-center">
                <p className="text-[14px] font-semibold">Que nota você dá pra solução?</p>
                <div className="mt-2 flex justify-center gap-2">{[1, 2, 3, 4, 5].map((n) => <motion.button key={n} whileTap={{ scale: 0.8 }} onClick={() => setRating(n)}><Star size={32} className={n <= rating ? 'fill-amber-400 text-amber-400' : 'opacity-25'} /></motion.button>)}</div>
              </div>
            )}
            <textarea rows={4} autoFocus className="input" value={txt} onChange={(x) => setTxt(x.target.value)} placeholder={mode === 'respond' ? 'Explique o seu lado ou diga o que vai fazer…' : mode === 'resolve' ? 'O que você fez pra resolver?' : mode === 'rate' ? 'Um recadinho (opcional)' : 'Por que ainda não ficou bom?'} />
            <div className="mt-2 flex gap-2">
              <Button className="flex-1" onClick={() => { setMode(''); setTxt(''); }}>Cancelar</Button>
              <Button variant="primary" className="flex-1" disabled={(mode === 'rate' ? !rating : !txt.trim())} onClick={mode === 'respond' ? respond : mode === 'resolve' ? resolve : mode === 'rate' ? accept : reopen}>Enviar</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!mode && iAmAccused && ACTIVE.includes(d.status) && (
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => setMode('respond')}>Responder</Button>
          <Button variant="primary" className="flex-1" onClick={() => setMode('resolve')}>Marcar como resolvida</Button>
        </div>
      )}
      {!mode && iAmAuthor && d.status === 'resolved' && (
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => setMode('reopen')}><RotateCcw size={14} /> Reabrir</Button>
          <Button variant="primary" className="flex-1" onClick={() => setMode('rate')}>Aceitar e avaliar</Button>
        </div>
      )}
      {!mode && iAmAuthor && ACTIVE.includes(d.status) && <p className="text-center text-[12.5px] muted">Aguardando {accused === 'Você' ? 'você' : accused} resolver dentro do prazo.</p>}
      {!mode && iAmAccused && d.status === 'resolved' && <p className="text-center text-[12.5px] muted">Aguardando {author} confirmar a solução.</p>}
    </div>
  );
}

/* ───── reputação ───── */
function Reputation({ mine, theirs, pName }: { mine: Entry[]; theirs: Entry[]; pName: string }) {
  const [who, setWho] = useState<'me' | 'them'>('me');
  const r = useMemo(() => reputation(who === 'me' ? mine : theirs), [who, mine, theirs]);
  const stat = (v: string, l: string) => <div className="glass-thin rounded-[18px] p-3 text-center"><p className="text-[20px] font-bold tabular-nums">{v}</p><p className="text-[11.5px] muted">{l}</p></div>;
  return (
    <div>
      <div className="mb-4 flex justify-center gap-2">
        {(['me', 'them'] as const).map((k) => <button key={k} onClick={() => setWho(k)} className={cn('rounded-full px-4 py-1.5 text-[13px] font-semibold', who === k ? 'bg-black text-white dark:bg-white dark:text-black' : 'glass-thin')}>{k === 'me' ? 'Você' : pName}</button>)}
      </div>
      <Glass className="p-6 text-center">
        <motion.p key={who} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-[52px]">{r.seal.e}</motion.p>
        <p className="mt-1 text-[13px] font-semibold uppercase tracking-wider" style={{ color: r.seal.c }}>{r.seal.t}</p>
        <p className="mt-2 text-[44px] font-black leading-none tabular-nums tracking-tight">{r.score.toFixed(1)}<span className="text-[18px] font-semibold muted">/10</span></p>
        <p className="mt-2 text-[12.5px] muted">Índice de reputação de {who === 'me' ? 'você' : pName} no casal</p>
      </Glass>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {stat(String(r.total), 'reclamações')}
        {stat(`${Math.round(r.ansRate * 100)}%`, 'respondidas')}
        {stat(`${Math.round(r.resRate * 100)}%`, 'resolvidas')}
        {stat(r.avg ? r.avg.toFixed(1) + '★' : '—', 'nota média')}
        {stat(`${Math.round(r.onRate * 100)}%`, 'no prazo')}
        {stat(r.avgH ? (r.avgH < 24 ? `${Math.round(r.avgH)}h` : `${(r.avgH / 24).toFixed(1)}d`) : '—', 'tempo médio')}
      </div>
      {r.total > 0 && <TopCats list={who === 'me' ? mine : theirs} />}
    </div>
  );
}
function TopCats({ list }: { list: Entry[] }) {
  const counts = COMPLAINT_CATS.map((c) => ({ c, n: list.filter((e) => e.data.category === c.id).length })).filter((x) => x.n).sort((a, b) => b.n - a.n).slice(0, 4);
  const max = counts[0]?.n ?? 1;
  return (
    <Section title="Mais reclamado">
      <div className="space-y-2">
        {counts.map(({ c, n }) => (
          <div key={c.id} className="flex items-center gap-3 text-[13.5px]">
            <span className="w-6 text-center">{c.emoji}</span><span className="w-32 truncate">{c.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]"><motion.div initial={{ width: 0 }} animate={{ width: `${(n / max) * 100}%` }} className="h-full rounded-full bg-current" /></div>
            <span className="w-5 text-right font-semibold tabular-nums">{n}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ───── aviso na Home ───── */
export function ComplaintBanner() {
  const { me, partner } = useAtlas();
  const { navigate } = useUI();
  const all = useEntries('complaint');
  const now = useNow();
  const open = all.filter((e) => e.data.against === me?.id && ACTIVE.includes(e.data.status));
  const toConfirm = all.filter((e) => e.createdBy === me?.id && e.data.status === 'resolved');
  if (!open.length && !toConfirm.length) return null;
  const late = open.filter((e) => sla(e, now).late).length;
  const next = open.map((e) => sla(e, now).left).sort((a, b) => a - b)[0];
  const color = !open.length ? '#8B5CF6' : late ? '#EF4444' : '#F59E0B';
  return (
    <motion.button whileTap={{ scale: 0.98 }} onClick={() => navigate('tool', 'reclamacoes')} className="glass mb-3 flex w-full items-center gap-3 p-3.5 text-left">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] text-[22px]" style={{ background: color + '22' }}>{late ? '🚨' : open.length ? '📢' : '✅'}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{open.length ? `${open.length} reclamação${open.length > 1 ? 'ões' : ''} de ${firstName(partner?.displayName ?? '')}` : 'Confirme a solução'}</span>
        <span className="block truncate text-[12.5px] font-medium" style={{ color }}>{open.length ? (late ? `${late} com SLA estourado` : fmtLeft(next)) : `${toConfirm.length} aguardando sua nota`}</span>
      </span>
      <ChevronRight size={17} className="muted" />
    </motion.button>
  );
}
