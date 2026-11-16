'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Check, ChevronRight, Lock, Plus, Shuffle, Star, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { Avatar, Button, Chip, Empty, Field as FieldWrap, Glass, IconButton, PageHeader, Section, Sheet, Switch } from '@/components/ui/primitives';
import { getField, kindOf, sortEntries, type Field, type KindConfig } from '@/lib/entries';
import { uploadPhoto, usePhotoUrl } from '@/lib/files';
import type { Entry } from '@/lib/types';
import { cn, daysBetween, firstName, fmtDay, money, parseMoney, parseYmd, uid, ymd } from '@/lib/utils';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Values = Record<string, any>;

export function useEntries(kind: string) {
  const { rows } = useAtlas();
  return rows('entries').filter((e) => e.kind === kind);
}

/** Cria/atualiza um registro genérico. */
export function useEntryActions() {
  const { me, save, remove } = useAtlas();
  const put = (kind: string, v: Partial<Entry> & { data?: Values }, cur?: Entry) => {
    if (!me) return;
    const now = new Date().toISOString();
    const e: Entry = {
      id: cur?.id ?? uid(),
      createdBy: cur?.createdBy ?? me.id,
      kind,
      title: v.title ?? cur?.title ?? '',
      body: v.body !== undefined ? v.body : cur?.body ?? null,
      date: v.date !== undefined ? v.date : cur?.date ?? null,
      done: v.done ?? cur?.done ?? false,
      private: v.private ?? cur?.private ?? false,
      data: { ...(cur?.data ?? {}), ...(v.data ?? {}) },
      sort: v.sort ?? cur?.sort ?? Date.now(),
      createdAt: cur?.createdAt ?? now,
      updatedAt: now,
    };
    save('entries', e);
    return e;
  };
  return { put, del: (id: string) => remove('entries', id) };
}

function Stars({ value, onChange, size = 22 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n === value ? 0 : n)} aria-label={`${n}`}>
          <Star size={size} className={n <= value ? 'fill-current' : 'opacity-25'} />
        </button>
      ))}
    </div>
  );
}

export function Photo({ path, className }: { path?: string | null; className?: string }) {
  const url = usePhotoUrl(path);
  if (!path) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt="" className={cn('object-cover', className)} /> : <div className={cn('animate-pulse bg-black/5 dark:bg-white/5', className)} />;
}

function StepsInput({ value, onChange }: { value: { t: string; done: boolean }[]; onChange: (v: { t: string; done: boolean }[]) => void }) {
  const [t, setT] = useState('');
  const add = () => { if (t.trim()) { onChange([...value, { t: t.trim(), done: false }]); setT(''); } };
  return (
    <div className="space-y-1.5">
      {value.map((s, i) => (
        <div key={i} className="glass-thin flex items-center gap-2 px-3 py-2">
          <button type="button" onClick={() => onChange(value.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))} className={cn('grid h-5 w-5 place-items-center rounded-full ring-1 ring-current', s.done && 'bg-current')}>
            {s.done && <Check size={12} className="text-white dark:text-black" strokeWidth={3} />}
          </button>
          <span className={cn('flex-1 text-[14px]', s.done && 'line-through muted')}>{s.t}</span>
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="muted"><X size={14} /></button>
        </div>
      ))}
      <div className="flex gap-2">
        <input value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} placeholder="Adicionar item" className="input flex-1 !py-2.5" />
        <Button onClick={add} className="w-12 px-0"><Plus size={16} /></Button>
      </div>
    </div>
  );
}

function PhotoInput({ value, onChange }: { value?: string; onChange: (v: string | null) => void }) {
  const { state, mode, alert } = useAtlas();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-3">
      {value ? <Photo path={value} className="h-20 w-20 rounded-2xl" /> : <div className="grid h-20 w-20 place-items-center rounded-2xl bg-black/5 dark:bg-white/5"><Camera size={20} className="muted" /></div>}
      <label className="glass-thin cursor-pointer px-4 py-2.5 text-[14px] font-medium">
        {busy ? 'Enviando…' : value ? 'Trocar foto' : 'Adicionar foto'}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f || !state) return;
            setBusy(true);
            try {
              onChange(await uploadPhoto(f, state.couple.id, mode === 'demo'));
            } catch (err) {
              alert({ kind: 'sync', title: 'Não deu para enviar a foto', subtitle: String((err as Error)?.message ?? 'Sem internet?'), duration: 3500 });
            }
            setBusy(false);
          }}
        />
      </label>
      {value && <button type="button" onClick={() => onChange(null)} className="text-[13px] muted">Remover</button>}
    </div>
  );
}

function FieldInput({ f, v, set }: { f: Field; v: any; set: (x: any) => void }) {
  switch (f.type) {
    case 'textarea':
      return <textarea rows={3} value={v ?? ''} onChange={(e) => set(e.target.value)} placeholder={f.placeholder} className="input" />;
    case 'number':
      return <input inputMode="decimal" value={v ?? ''} onChange={(e) => set(e.target.value.replace(',', '.'))} placeholder={f.placeholder} className="input" />;
    case 'money':
      return <input inputMode="decimal" value={v ?? ''} onChange={(e) => set(e.target.value)} placeholder="0,00" className="input" />;
    case 'date':
      return <input type="date" value={v ?? ''} onChange={(e) => set(e.target.value || null)} className="input" />;
    case 'time':
      return <input type="time" value={v ?? ''} onChange={(e) => set(e.target.value)} className="input" />;
    case 'select':
      return (
        <div className="flex flex-wrap gap-1.5">
          {f.options!.map((o) => <Chip key={o} active={v === o} onClick={() => set(v === o ? null : o)}>{o}</Chip>)}
        </div>
      );
    case 'rating':
      return <Stars value={Number(v ?? 0)} onChange={set} />;
    case 'check':
      return <Switch checked={!!v} onChange={set} label={f.label} />;
    case 'photo':
      return <PhotoInput value={v} onChange={set} />;
    case 'steps':
      return <StepsInput value={Array.isArray(v) ? v : []} onChange={set} />;
    case 'lines':
      return <textarea rows={4} value={Array.isArray(v) ? v.join('\n') : v ?? ''} onChange={(e) => set(e.target.value)} placeholder="Um item por linha" className="input" />;
    default:
      return <input value={v ?? ''} onChange={(e) => set(e.target.value)} placeholder={f.placeholder} className="input" />;
  }
}

const defOf = (f: Field) => (f.def === 'today' ? ymd() : f.def === 'now' ? new Date().toTimeString().slice(0, 5) : f.def ?? (f.type === 'steps' ? [] : ''));

/** Folha de criação/edição gerada a partir da configuração. */
export function EntrySheet({ cfg, open, onClose, entry, preset }: { cfg: KindConfig; open: boolean; onClose: () => void; entry?: Entry | null; preset?: Values }) {
  const { me } = useAtlas();
  const { put, del } = useEntryActions();
  const [vals, setVals] = useState<Values>({});
  const [priv, setPriv] = useState(false);
  useEffect(() => {
    if (!open) return;
    const v: Values = {};
    cfg.fields.forEach((f) => (v[f.key] = entry ? getField(entry, f.key) : preset?.[f.key] ?? defOf(f)));
    setVals(v);
    setPriv(entry ? entry.private : !!cfg.privateDefault);
  }, [open, entry, cfg, preset]);
  const mine = !entry || entry.createdBy === me?.id;
  const ok = cfg.fields.every((f) => !f.required || (vals[f.key] !== '' && vals[f.key] != null));
  const submit = () => {
    const data: Values = {};
    const top: Values = {};
    cfg.fields.forEach((f) => {
      let x = vals[f.key];
      if (f.type === 'number') x = x === '' || x == null ? null : Number(x);
      if (f.type === 'money') x = x === '' || x == null ? null : typeof x === 'number' ? x : parseMoney(String(x));
      if (f.type === 'lines') x = (Array.isArray(x) ? x : String(x ?? '').split('\n')).map((s: string) => s.trim()).filter(Boolean);
      if (['title', 'body', 'date'].includes(f.key)) top[f.key] = x ?? (f.key === 'title' ? '' : null);
      else data[f.key] = x;
    });
    put(cfg.kind, { ...top, private: cfg.allowPrivate ? priv : false, data }, entry ?? undefined);
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={entry ? cfg.singular : `Novo: ${cfg.singular.toLowerCase()}`}
      footer={
        <div className="flex gap-2">
          {entry && mine && <Button variant="danger" className="w-12 shrink-0 px-0" onClick={() => { del(entry.id); onClose(); }}><Trash2 size={16} /></Button>}
          <Button variant="primary" className="flex-1" disabled={!ok || !mine} onClick={submit}>{mine ? 'Salvar' : 'Só quem criou pode editar'}</Button>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {cfg.fields.map((f) =>
          f.type === 'check' ? (
            <div key={f.key} className="glass-thin flex items-center justify-between p-3.5">
              <span className="text-[15px]">{f.label}</span>
              <FieldInput f={f} v={vals[f.key]} set={(x) => setVals((s) => ({ ...s, [f.key]: x }))} />
            </div>
          ) : (
            <FieldWrap key={f.key} label={f.label}>
              <FieldInput f={f} v={f.type === 'money' && typeof vals[f.key] === 'number' ? String(vals[f.key]).replace('.', ',') : vals[f.key]} set={(x) => setVals((s) => ({ ...s, [f.key]: x }))} />
            </FieldWrap>
          ),
        )}
        {cfg.allowPrivate && (
          <div className="glass-thin flex items-center justify-between p-3.5">
            <span className="flex items-center gap-2 text-[15px]"><Lock size={15} /> Só pra mim</span>
            <Switch checked={priv} onChange={setPriv} label="Privado" />
          </div>
        )}
      </div>
    </Sheet>
  );
}

/* ───────── Linha da lista (resumo por tipo) ───────── */
function summary(e: Entry, cfg: KindConfig): { title: string; sub: string; right?: ReactNode; pct?: number } {
  const d = e.data ?? {};
  const date = e.date ? fmtDay(parseYmd(e.date), { day: '2-digit', month: 'short' }) : '';
  const steps = (d.steps ?? d.packing) as { done: boolean }[] | undefined;
  const sp = steps?.length ? Math.round((steps.filter((s) => s.done).length / steps.length) * 100) : undefined;
  switch (cfg.kind) {
    case 'book': return { title: e.title, sub: [d.author, d.status, d.pages ? `${d.page ?? 0}/${d.pages} pág.` : ''].filter(Boolean).join(' · '), pct: d.pages ? Math.round(((d.page ?? 0) / d.pages) * 100) : undefined, right: d.rating ? `${'★'.repeat(d.rating)}` : undefined };
    case 'goal': return { title: e.title, sub: [d.area, d.target ? `${d.current ?? 0}/${d.target} ${d.unit ?? ''}` : '', date && `até ${date}`].filter(Boolean).join(' · '), pct: d.target ? Math.min(100, Math.round(((d.current ?? 0) / d.target) * 100)) : sp };
    case 'project': case 'plan': return { title: e.title, sub: [d.owner, date && `até ${date}`, d.cost ? `${money(d.saved ?? 0)} de ${money(d.cost)}` : '', steps?.length ? `${steps.filter((s) => s.done).length}/${steps.length} etapas` : ''].filter(Boolean).join(' · '), pct: d.cost ? Math.min(100, Math.round(((d.saved ?? 0) / d.cost) * 100)) : sp };
    case 'person': {
      const late = d.last ? daysBetween(parseYmd(d.last), new Date()) - (d.every ?? 14) : 0;
      return { title: e.title, sub: [d.relation, d.last ? `último contato ${fmtDay(parseYmd(d.last), { day: '2-digit', month: 'short' })}` : 'sem contato registrado'].filter(Boolean).join(' · '), right: late > 0 ? <span className="text-[11px] font-semibold text-amber-500">{late}d atrasado</span> : undefined };
    }
    case 'emotion': return { title: e.title, sub: [date, d.cause].filter(Boolean).join(' · '), right: d.level ? '●'.repeat(d.level) : undefined };
    case 'workout': return { title: e.title, sub: [date, d.minutes ? `${d.minutes} min` : '', e.body].filter(Boolean).join(' · ') };
    case 'measure': return { title: `${d.weight ?? '—'} kg`, sub: [date, d.waist ? `cintura ${d.waist} cm` : ''].filter(Boolean).join(' · ') };
    case 'watch': return { title: e.title, sub: [d.type, d.where, d.status].filter(Boolean).join(' · '), right: d.rating ? '★'.repeat(d.rating) : undefined };
    case 'place': return { title: e.title, sub: [d.type, d.again ? 'queremos voltar' : '', d.address].filter(Boolean).join(' · '), right: d.rating ? '★'.repeat(d.rating) : undefined };
    case 'trip': return { title: e.title, sub: [date, d.budget ? `${money(d.spent ?? 0)} de ${money(d.budget)}` : ''].filter(Boolean).join(' · '), pct: d.budget ? Math.min(100, Math.round(((d.spent ?? 0) / d.budget) * 100)) : sp };
    case 'document': {
      const left = e.date ? daysBetween(new Date(), parseYmd(e.date)) : null;
      return { title: e.title, sub: [d.type, e.date ? `vence ${date}` : ''].filter(Boolean).join(' · '), right: left !== null && left <= 30 ? <span className={cn('text-[11px] font-semibold', left < 0 ? 'text-red-500' : 'text-amber-500')}>{left < 0 ? 'vencido' : `${left}d`}</span> : undefined };
    }
    case 'fast': return { title: e.title, sub: [date, d.start, d.hours ? `${d.hours}h` : '', d.type, d.together ? 'juntos' : ''].filter(Boolean).join(' · ') };
    case 'church': case 'serve': return { title: e.title, sub: [date, d.time, d.type ?? d.role, d.who, d.place].filter(Boolean).join(' · ') };
    case 'devotional': case 'sermon': return { title: e.title || d.ref || cfg.singular, sub: [date, d.ref, d.preacher].filter(Boolean).join(' · ') };
    case 'recipe': return { title: e.title, sub: [d.minutes ? `${d.minutes} min` : '', d.ingredients?.length ? `${d.ingredients.length} ingredientes` : ''].filter(Boolean).join(' · ') };
    default: return { title: e.title, sub: [date, d.tag, e.body].filter(Boolean).join(' · ') };
  }
}

export function EntryRow({ e, cfg, onOpen, extra }: { e: Entry; cfg: KindConfig; onOpen: () => void; extra?: ReactNode }) {
  const { me, nameOf } = useAtlas();
  const s = summary(e, cfg);
  return (
    <div className="border-b last:border-0 hairline">
      <button onClick={onOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        {e.data?.photo ? <Photo path={e.data.photo} className="h-11 w-11 shrink-0 rounded-xl" /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black/[0.05] text-[18px] dark:bg-white/[0.06]">{cfg.emoji}</span>}
        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-[15px] font-medium', e.done && 'line-through muted')}>{s.title || '—'}</p>
          <p className="truncate text-[12px] muted">
            {e.private && <Lock size={10} className="mr-1 inline" />}
            {e.createdBy !== me?.id ? `${firstName(nameOf(e.createdBy))} · ` : ''}
            {s.sub}
          </p>
          {s.pct !== undefined && (
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.pct >= 100 ? '#10B981' : 'currentColor' }} />
            </div>
          )}
        </div>
        {s.right && <span className="shrink-0 text-[12px] muted">{s.right}</span>}
        <ChevronRight size={16} className="shrink-0 muted" />
      </button>
      {extra}
    </div>
  );
}

/** Lista completa de uma coleção, com busca e criação. */
export function CollectionList({ kind, filter, extraRow, header, limit }: { kind: string; filter?: (e: Entry) => boolean; extraRow?: (e: Entry) => ReactNode; header?: ReactNode; limit?: number }) {
  const cfg = kindOf(kind);
  const all = useEntries(kind);
  const [edit, setEdit] = useState<Entry | null>(null);
  const [creating, setCreating] = useState(false);
  const list = useMemo(() => sortEntries(all.filter(filter ?? (() => true)), cfg.sort), [all, filter, cfg.sort]);
  return (
    <>
      {header}
      {list.length === 0 ? (
        <Empty icon={<span className="text-[26px]">{cfg.emoji}</span>} title={`Nenhum registro em ${cfg.title.toLowerCase()}`} hint={cfg.empty ?? cfg.hint} action={<Button variant="primary" onClick={() => setCreating(true)}><Plus size={15} /> Adicionar</Button>} />
      ) : (
        <div className="glass overflow-hidden">
          {list.slice(0, limit ?? 999).map((e) => <EntryRow key={e.id} e={e} cfg={cfg} onOpen={() => setEdit(e)} extra={extraRow?.(e)} />)}
          <button onClick={() => setCreating(true)} className="flex w-full items-center gap-2 border-t px-4 py-3 text-[14px] font-medium muted hairline"><Plus size={16} /> Adicionar {cfg.singular.toLowerCase()}</button>
        </div>
      )}
      <EntrySheet cfg={cfg} open={creating || !!edit} entry={edit} onClose={() => { setCreating(false); setEdit(null); }} />
    </>
  );
}

/** Tela inteira de uma coleção (rota "col"). */
export function CollectionScreen({ kind, children, actions, extraRow }: { kind: string; children?: ReactNode; actions?: ReactNode; extraRow?: (e: Entry) => ReactNode }) {
  const cfg = kindOf(kind);
  const [creating, setCreating] = useState(false);
  if (!cfg) return null;
  return (
    <div>
      <PageHeader title={cfg.title} subtitle={cfg.hint} back actions={<>{actions}<IconButton label="Adicionar" onClick={() => setCreating(true)}><Plus size={20} /></IconButton></>} />
      {children}
      <Section>
        <CollectionList kind={kind} extraRow={extraRow} />
      </Section>
      <EntrySheet cfg={cfg} open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

export { Stars };
export function Sorteio({ items, label = 'Sortear' }: { items: string[]; label?: string }) {
  const [pick, setPick] = useState<string | null>(null);
  const [spin, setSpin] = useState(false);
  const go = () => {
    if (!items.length) return;
    setSpin(true);
    let n = 0;
    const i = window.setInterval(() => {
      setPick(items[Math.floor(Math.random() * items.length)]);
      if (++n > 12) { window.clearInterval(i); setSpin(false); }
    }, 80);
  };
  return (
    <Glass className="flex items-center gap-3 p-4">
      <Button variant="primary" onClick={go} disabled={!items.length || spin}><Shuffle size={15} /> {label}</Button>
      <AnimatePresence mode="popLayout">
        {pick && <motion.p key={pick} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex-1 truncate text-[16px] font-semibold">{pick}</motion.p>}
      </AnimatePresence>
      {!pick && <p className="flex-1 text-[13px] muted">{items.length ? `${items.length} opções` : 'Adicione opções primeiro'}</p>}
    </Glass>
  );
}
export { Avatar };
