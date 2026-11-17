'use client';
/* Lista de desejos, desafios de 30 dias, nossa trilha e cofrinhos. */
import { motion } from 'framer-motion';
import { Check, ExternalLink, Gift, Plus } from 'lucide-react';
import { useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { CollectionList, EntrySheet, Photo, Stars, useEntries, useEntryActions } from '@/components/ui/Collection';
import { Button, Chip, Glass, Section, Sheet } from '@/components/ui/primitives';
import { KINDS } from '@/lib/entries';
import { CHALLENGES } from '@/lib/data/fun';
import { celebrate, playSound } from '@/lib/fx';
import { openExternal } from '@/lib/native';
import type { Entry } from '@/lib/types';
import { addDays, cn, daysBetween, firstName, money, parseMoney, parseYmd, ymd } from '@/lib/utils';
import { EMERALD, Pills } from './kit';

/* ───── Lista de desejos ───── */
export function WishlistTool() {
  const { me, partner } = useAtlas();
  const { put } = useEntryActions();
  const all = useEntries('wish');
  const [tab, setTab] = useState<'theirs' | 'mine'>('theirs');
  const [edit, setEdit] = useState<Entry | null>(null);
  const [creating, setCreating] = useState(false);
  const mine = all.filter((e) => e.createdBy === me?.id && !e.done);
  const theirs = all.filter((e) => e.createdBy !== me?.id && !e.done).sort((a, b) => (b.data?.prio ?? 0) - (a.data?.prio ?? 0));
  return (
    <>
      <Pills value={tab} onChange={setTab} options={[['theirs', `Lista de ${firstName(partner?.displayName ?? 'meu amor')}`], ['mine', 'Minha lista']]} />
      {tab === 'mine' ? (
        <>
          <p className="mb-3 px-1 text-[13px] muted">Seu amor vê esta lista e pode reservar um item em segredo. Você nunca vê o que foi reservado 🤫</p>
          <div className="space-y-2">
            {mine.map((e) => <WishCard key={e.id} e={e} onClick={() => setEdit(e)} />)}
            <Button variant="primary" className="w-full" onClick={() => setCreating(true)}><Plus size={15} /> Adicionar desejo</Button>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          {theirs.length === 0 && <p className="py-6 text-center text-[14px] muted">{firstName(partner?.displayName ?? '')} ainda não colocou nada na lista.</p>}
          {theirs.map((e) => {
            const r = e.data?.reservedBy;
            return (
              <WishCard key={e.id} e={e} action={
                r && r !== me?.id ? <span className="text-[12px] muted">reservado</span> :
                r === me?.id ? (
                  <div className="flex gap-1.5"><Chip active onClick={() => put('wish', { data: { reservedBy: null } }, e)}>🤫 Reservado</Chip><Chip onClick={() => { put('wish', { done: true, data: { givenAt: ymd() } }, e); celebrate('Presente garantido 🎁'); }}>Dei!</Chip></div>
                ) : <Chip onClick={() => { put('wish', { data: { reservedBy: me?.id } }, e); playSound('done'); }}><Gift size={13} /> Reservar</Chip>
              } />
            );
          })}
        </div>
      )}
      <EntrySheet cfg={KINDS.wish} open={creating || !!edit} entry={edit} onClose={() => { setCreating(false); setEdit(null); }} />
    </>
  );
}
function WishCard({ e, action, onClick }: { e: Entry; action?: React.ReactNode; onClick?: () => void }) {
  return (
    <Glass className="flex items-center gap-3 p-3.5" onClick={onClick}>
      {e.data?.photo ? <Photo path={e.data.photo} className="h-14 w-14 shrink-0 rounded-2xl" /> : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-black/[0.04] text-[24px] dark:bg-white/[0.06]">🎁</span>}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">{e.title}</p>
        <div className="flex items-center gap-2 text-[12px] muted">{e.data?.price ? <span>{money(parseMoney(String(e.data.price)))}</span> : null}<Stars value={e.data?.prio ?? 0} size={11} /></div>
        {e.data?.link && <button onClick={(x) => { x.stopPropagation(); openExternal(e.data.link); }} className="mt-0.5 flex items-center gap-1 text-[12px] font-medium" style={{ color: EMERALD }}><ExternalLink size={11} /> Ver loja</button>}
      </div>
      {action && <div onClick={(x) => x.stopPropagation()}>{action}</div>}
    </Glass>
  );
}

/* ───── Desafios de 30 dias ───── */
export function ChallengesTool() {
  const { me, partner } = useAtlas();
  const { put, del } = useEntryActions();
  const all = useEntries('challenge');
  const active = all.filter((e) => !e.done);
  const today = ymd();
  return (
    <>
      {active.map((e) => {
        const c = CHALLENGES.find((x) => x.id === e.data.cid)!;
        const days: Record<string, string[]> = e.data.days ?? {};
        const start = parseYmd(e.data.start);
        const dayN = Math.min(29, daysBetween(start, new Date()));
        const both = Object.values(days).filter((v) => v.length >= 2).length;
        const iDid = (days[today] ?? []).includes(me?.id ?? '');
        const toggle = () => {
          if (!me) return;
          const cur = days[today] ?? [];
          const nv = { ...days, [today]: iDid ? cur.filter((x) => x !== me.id) : [...cur, me.id] };
          const fin = Object.values(nv).filter((v) => v.length >= 2).length >= 30;
          put('challenge', { data: { days: nv }, done: fin }, e);
          if (!iDid) { playSound('done'); if (fin) celebrate(`Desafio ${c.title} concluído! 🏁`); else if (cur.length) celebrate('Os dois fizeram hoje! 💚'); }
        };
        return (
          <Glass key={e.id} className="mb-4 p-5">
            <div className="flex items-center gap-3">
              <span className="text-[32px]">{c.emoji}</span>
              <div className="flex-1"><p className="text-[17px] font-bold">{c.title}</p><p className="text-[12.5px] muted">Dia {dayN + 1} de 30 · {both} dias juntos</p></div>
            </div>
            <div className="mt-4 grid grid-cols-10 gap-1.5">
              {Array.from({ length: 30 }, (_, i) => {
                const d = ymd(addDays(start, i));
                const n = (days[d] ?? []).length;
                return <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.01 }} className={cn('aspect-square rounded-md', d === today && 'ring-2 ring-current')} style={{ background: n >= 2 ? EMERALD : n === 1 ? EMERALD + '55' : 'rgba(127,127,127,.12)' }} />;
              })}
            </div>
            <p className="mt-3 text-[14px]">{c.daily[0]}</p>
            <div className="mt-3 flex gap-2">
              <Button variant={iDid ? 'secondary' : 'primary'} className="flex-1" onClick={toggle}>{iDid ? <><Check size={15} /> Fiz hoje</> : 'Marcar hoje'}</Button>
              <Button variant="ghost" onClick={() => del(e.id)}>Desistir</Button>
            </div>
            <p className="mt-2 text-center text-[11.5px] muted">{(days[today] ?? []).length === 2 ? 'Os dois já fizeram hoje 💚' : (days[today] ?? []).some((x) => x !== me?.id) ? `${firstName(partner?.displayName ?? '')} já fez hoje` : ''}</p>
          </Glass>
        );
      })}
      <Section title={active.length ? 'Começar outro' : 'Escolham um desafio'}>
        <div className="grid grid-cols-2 gap-2.5">
          {CHALLENGES.filter((c) => !active.some((a) => a.data.cid === c.id)).map((c) => (
            <Glass key={c.id} className="p-4" onClick={() => { put('challenge', { title: c.title, date: today, data: { cid: c.id, start: today, days: {} } }); playSound('chime'); }}>
              <span className="text-[26px]">{c.emoji}</span>
              <p className="mt-1.5 text-[14px] font-semibold leading-tight">{c.title}</p>
              <p className="text-[11.5px] muted">{c.hint}</p>
            </Glass>
          ))}
        </div>
      </Section>
      {all.some((e) => e.done) && <p className="px-1 text-[12.5px] muted">🏁 Concluídos: {all.filter((e) => e.done).map((e) => e.title).join(', ')}</p>}
    </>
  );
}

/* ───── Nossa trilha ───── */
export function TrilhaTool() {
  const songs = useEntries('song');
  return (
    <>
      {songs.length > 0 && (
        <Glass className="mb-5 overflow-hidden p-5" >
          <p className="label">Trilha sonora de vocês</p>
          <p className="mt-1 text-[28px] font-bold">{songs.length} música{songs.length > 1 ? 's' : ''}</p>
          <div className="mt-3 flex h-10 items-end gap-1">{Array.from({ length: 28 }, (_, i) => <motion.span key={i} className="flex-1 rounded-full" style={{ background: EMERALD }} animate={{ height: [8, 14 + ((i * 7) % 26), 8] }} transition={{ repeat: Infinity, duration: 1 + (i % 5) * 0.2, delay: i * 0.04 }} />)}</div>
        </Glass>
      )}
      <CollectionList kind="song" extraRow={(e) => e.data?.link ? <div className="px-4 pb-3"><Button className="h-8 px-3 text-[12px]" onClick={() => openExternal(e.data.link)}>▶ Ouvir</Button></div> : null} />
    </>
  );
}

/* ───── Cofrinhos ───── */
export function PiggyTool() {
  const { me, nameOf } = useAtlas();
  const { put } = useEntryActions();
  const list = useEntries('piggy');
  const [creating, setCreating] = useState(false);
  const [dep, setDep] = useState<Entry | null>(null);
  const [v, setV] = useState('');
  const total = list.reduce((s, e) => s + saved(e), 0);
  return (
    <>
      <Glass className="p-5">
        <p className="label">Guardado nos cofrinhos</p>
        <p className="mt-1 text-[32px] font-bold tracking-tight">{money(total)}</p>
      </Glass>
      <div className="mt-4 space-y-3">
        {list.map((e) => {
          const goal = parseMoney(String(e.data?.goal ?? '0')) || 0;
          const s = saved(e);
          const pct = goal ? Math.min(100, (s / goal) * 100) : 0;
          const last = (e.data?.deposits ?? []).slice(-1)[0];
          const months = e.date ? Math.max(1, Math.ceil(daysBetween(new Date(), parseYmd(e.date)) / 30)) : null;
          return (
            <Glass key={e.id} className="p-4" onClick={() => setDep(e)}>
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-black/[0.04] text-[24px] dark:bg-white/[0.06]">{e.data?.emoji || '🐷'}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-[15.5px] font-semibold">{e.title}</p><p className="text-[12.5px] muted">{money(s)} de {money(goal)}{months && goal > s ? ` · ${money((goal - s) / months)}/mês` : ''}</p></div>
                <span className="text-[15px] font-bold" style={{ color: pct >= 100 ? EMERALD : undefined }}>{Math.round(pct)}%</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]"><motion.div className="h-full rounded-full" style={{ background: EMERALD }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 60, damping: 16 }} /></div>
              {last && <p className="mt-2 text-[11.5px] muted">Último: {firstName(nameOf(last.by))} guardou {money(last.amount)}</p>}
            </Glass>
          );
        })}
      </div>
      <Button variant="primary" className="mt-4 w-full" onClick={() => setCreating(true)}><Plus size={15} /> Novo cofrinho</Button>
      <EntrySheet cfg={KINDS.piggy} open={creating} onClose={() => setCreating(false)} />
      <Sheet open={!!dep} onClose={() => setDep(null)} title={dep ? `${dep.data?.emoji ?? '🐷'} ${dep.title}` : ''} footer={
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => { if (dep && me && v) { put('piggy', { data: { deposits: [...(dep.data?.deposits ?? []), { by: me.id, amount: -Math.abs(parseMoney(v)), at: new Date().toISOString() }] } }, dep); setV(''); setDep(null); } }}>Retirar</Button>
          <Button variant="primary" className="flex-1" onClick={() => {
            if (!dep || !me || !v) return;
            const amount = Math.abs(parseMoney(v));
            const ne = put('piggy', { data: { deposits: [...(dep.data?.deposits ?? []), { by: me.id, amount, at: new Date().toISOString() }] } }, dep);
            const goal = parseMoney(String(dep.data?.goal ?? '0'));
            if (ne && saved(ne) >= goal && saved(dep) < goal) celebrate(`Meta batida: ${dep.title}! 🎉`); else playSound('done');
            setV(''); setDep(null);
          }}>Guardar</Button>
        </div>
      }>
        <input inputMode="decimal" autoFocus value={v} onChange={(e) => setV(e.target.value)} placeholder="R$ 0,00" className="input text-center !text-[28px] font-bold" />
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">{[20, 50, 100, 200, 500].map((x) => <Chip key={x} onClick={() => setV(String(x))}>R$ {x}</Chip>)}</div>
        {dep && (dep.data?.deposits ?? []).length > 0 && (
          <div className="mt-5 space-y-1">{[...(dep.data.deposits as { by: string; amount: number; at: string }[])].reverse().slice(0, 8).map((d, i) => <p key={i} className="flex justify-between text-[13px]"><span className="muted">{firstName(nameOf(d.by))} · {new Date(d.at).toLocaleDateString('pt-BR')}</span><span className={d.amount < 0 ? 'text-red-500' : ''}>{money(d.amount)}</span></p>)}</div>
        )}
      </Sheet>
    </>
  );
}
const saved = (e: Entry) => ((e.data?.deposits ?? []) as { amount: number }[]).reduce((s, d) => s + d.amount, 0);
