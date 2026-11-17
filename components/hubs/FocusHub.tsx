'use client';
import { useSticky } from '@/lib/sticky';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronRight, Flame, Pause, Play, Plus, Square, Target, Timer, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI } from '@/components/providers/UIProvider';
import { useEntries, useEntryActions } from '@/components/ui/Collection';
import { Avatar, Button, Glass, PageHeader, Section, Sheet } from '@/components/ui/primitives';
import { useExternalEvents } from '@/lib/calendar';
import { KINDS } from '@/lib/entries';
import { cancelNotif, haptic, notifyAt } from '@/lib/native';
import { celebrate, playSound, vibe } from '@/lib/fx';
import type { Entry } from '@/lib/types';
import { addDays, cn, firstName, hhmm, ymd } from '@/lib/utils';
import { weekOf } from '@/components/screens/CheckinScreen';

/* ───────── 3 prioridades do dia ───────── */
export function PrioritiesCard({ compact = false }: { compact?: boolean }) {
  const { me, partner } = useAtlas();
  const all = useEntries('priority');
  const { put, del } = useEntryActions();
  const [text, setText] = useState('');
  if (!me) return null;
  const today = ymd();
  const mine = all.filter((e) => e.createdBy === me.id && e.date === today).sort((a, b) => a.sort - b.sort);
  const theirs = partner ? all.filter((e) => e.createdBy === partner.id && e.date === today).sort((a, b) => a.sort - b.sort) : [];
  const add = () => {
    if (!text.trim() || mine.length >= 3) return;
    put('priority', { title: text.trim(), date: today, sort: Date.now() });
    setText('');
  };
  const done = mine.filter((e) => e.done).length;
  return (
    <Glass className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold">{new Date().getHours() < 12 ? 'Quais as 3 coisas que importam hoje?' : '3 prioridades de hoje'}</p>
        <span className="text-[12px] tabular-nums muted">{done}/{Math.max(mine.length, 3)}</span>
      </div>
      <div className="mt-3 space-y-2">
        {mine.map((e, i) => (
          <div key={e.id} className="flex items-center gap-3">
            <button onClick={() => { put('priority', { done: !e.done }, e); if (!e.done) { haptic('success'); playSound('done'); if (mine.length === 3 && mine.filter((x) => x.done).length === 2) celebrate('3 de 3 prioridades ✓'); } }} className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold ring-1', e.done ? 'text-white ring-transparent' : 'ring-black/20 dark:ring-white/25')} style={e.done ? { background: '#10B981' } : undefined}>
              {e.done ? <Check size={14} strokeWidth={3} /> : i + 1}
            </button>
            <p className={cn('flex-1 text-[15px]', e.done && 'line-through muted')}>{e.title}</p>
            {!compact && <button onClick={() => del(e.id)} aria-label="Remover" className="muted"><X size={15} /></button>}
          </div>
        ))}
        {mine.length < 3 && (
          <div className="flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder={`Prioridade ${mine.length + 1}`} className="input flex-1 !py-2.5" />
            <Button onClick={add} className="w-12 px-0" disabled={!text.trim()}><Plus size={16} /></Button>
          </div>
        )}
      </div>
      {theirs.length > 0 && partner && (
        <div className="mt-3 border-t pt-3 hairline">
          <p className="mb-1.5 flex items-center gap-1.5 text-[12px] muted"><Avatar profile={partner} size={18} /> {firstName(partner.displayName)}</p>
          {theirs.map((e) => <p key={e.id} className={cn('text-[13px]', e.done && 'line-through muted')}>{e.done ? '✓' : '○'} {e.title}</p>)}
        </div>
      )}
    </Glass>
  );
}

/* ───────── Modo foco ───────── */
const FOCUS_KEY = 'my-atlas:focus';
type FocusState = { start: number; minutes: number; prev: string | null; paused?: number | null; label?: string };
const readFocus = (): FocusState | null => { try { return JSON.parse(localStorage.getItem(FOCUS_KEY) || 'null'); } catch { return null; } };
const writeFocus = (f: FocusState | null) => {
  try { if (f) localStorage.setItem(FOCUS_KEY, JSON.stringify(f)); else localStorage.removeItem(FOCUS_KEY); } catch { /* noop */ }
  window.dispatchEvent(new Event('atlas:focus'));
};
export function useFocus() {
  const [f, setF] = useState<FocusState | null>(null);
  useEffect(() => {
    setF(readFocus());
    const on = () => setF(readFocus());
    window.addEventListener('atlas:focus', on);
    return () => window.removeEventListener('atlas:focus', on);
  }, []);
  return f;
}

export function FocusStarter() {
  const { me, setContextStatus } = useAtlas();
  const { put } = useEntryActions();
  const sessions = useEntries('focus').filter((e) => e.createdBy === me?.id && e.date === ymd());
  const [label, setLabel] = useState('');
  const f = useFocus();
  const start = (minutes: number) => {
    if (!me) return;
    writeFocus({ start: Date.now(), minutes, prev: me.contextStatus ?? null, label: label.trim() || undefined });
    setContextStatus('foco');
    put('focus', { title: label.trim() || 'Foco', date: ymd(), data: { minutes } });
    notifyAt(900_100, 'Foco concluído 🎯', `${minutes} minutos de foco. Hora de uma pausa!`, new Date(Date.now() + minutes * 60_000));
    haptic('medium');
  };
  const total = sessions.reduce((s, e) => s + (e.data?.minutes ?? 0), 0);
  if (f) return <FocusMini />;
  return (
    <Glass className="p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-black text-white dark:bg-white dark:text-black"><Timer size={19} /></span>
        <div className="flex-1">
          <p className="text-[15px] font-semibold">Modo foco</p>
          <p className="text-[12px] muted">Seu status vira “Em foco” para {`seu amor`} · hoje: {total} min</p>
        </div>
      </div>
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="No que vai focar? (opcional)" className="input mt-3 !py-2.5" />
      <div className="mt-3 grid grid-cols-4 gap-2">
        {[15, 25, 50, 90].map((m) => (
          <motion.button key={m} whileTap={{ scale: 0.92 }} onClick={() => start(m)} className="glass-thin py-2.5 text-center !rounded-2xl">
            <p className="text-[17px] font-bold tabular-nums">{m}</p>
            <p className="text-[10.5px] muted">min</p>
          </motion.button>
        ))}
      </div>
    </Glass>
  );
}

function fmtClock(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
export function stopFocus(setContextStatus: (v: string) => void, done: boolean, alert?: (e: { kind: 'success'; title: string; subtitle?: string }) => void) {
  const f = readFocus();
  writeFocus(null);
  cancelNotif(900_100);
  if (f?.prev && f.prev !== 'foco') setContextStatus(f.prev);
  if (done && alert) { alert({ kind: 'success', title: 'Foco concluído 🎯', subtitle: `${f?.minutes ?? 0} minutos. Respire e beba água.` }); vibe('focusDone'); playSound('celebrate'); }
}

function FocusMini() {
  const f = useFocus();
  const { setContextStatus, alert } = useAtlas();
  const [, tick] = useState(0);
  useEffect(() => { const i = window.setInterval(() => tick((x) => x + 1), 1000); return () => window.clearInterval(i); }, []);
  if (!f) return null;
  const left = f.start + f.minutes * 60_000 - Date.now();
  const pct = Math.min(100, ((f.minutes * 60_000 - left) / (f.minutes * 60_000)) * 100);
  return (
    <Glass className="p-4">
      <div className="flex items-center gap-4">
        <div className="relative grid h-20 w-20 place-items-center">
          <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90">
            <circle cx="40" cy="40" r="34" fill="none" strokeWidth="6" className="stroke-black/10 dark:stroke-white/10" />
            <circle cx="40" cy="40" r="34" fill="none" strokeWidth="6" stroke="#10B981" strokeLinecap="round" strokeDasharray={213.6} strokeDashoffset={213.6 * (1 - pct / 100)} />
          </svg>
          <span className="text-[16px] font-bold tabular-nums">{fmtClock(left)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="label" style={{ color: '#10B981' }}>Em foco</p>
          <p className="truncate text-[16px] font-semibold">{f.label ?? `${f.minutes} minutos`}</p>
          <div className="mt-2 flex gap-2">
            <Button className="h-9 px-3 text-[13px]" onClick={() => stopFocus(setContextStatus, left <= 0, alert)}><Square size={13} /> {left <= 0 ? 'Concluir' : 'Parar'}</Button>
          </div>
        </div>
      </div>
    </Glass>
  );
}

/** Pílula flutuante enquanto o foco está ativo (aparece em todas as telas). */
export function FocusPill() {
  const f = useFocus();
  const { setContextStatus, alert } = useAtlas();
  const [, tick] = useState(0);
  useEffect(() => {
    if (!f) return;
    const i = window.setInterval(() => {
      tick((x) => x + 1);
      const cur = readFocus();
      if (cur && Date.now() >= cur.start + cur.minutes * 60_000) stopFocus(setContextStatus, true, alert);
    }, 1000);
    return () => window.clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f?.start]);
  if (!f) return null;
  const left = f.start + f.minutes * 60_000 - Date.now();
  return (
    <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onClick={() => window.dispatchEvent(new CustomEvent('atlas:navigate', { detail: 'focus' }))} className="fixed bottom-[100px] left-4 z-30 flex items-center gap-2 rounded-full bg-black px-3.5 py-2 text-[13px] font-semibold text-white shadow-lg dark:bg-white dark:text-black">
      <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: '#10B981' }} /> Foco · {fmtClock(left)}
    </motion.button>
  );
}

/* ───────── Hábitos personalizados ───────── */
export function streakOf(days: Record<string, boolean> = {}) {
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const d = ymd(addDays(new Date(), -i));
    if (days[d]) n++;
    else if (i > 0) break;
  }
  return n;
}
export function CustomHabits() {
  const { me } = useAtlas();
  const habits = useEntries('habit').filter((e) => e.createdBy === me?.id);
  const { put, del } = useEntryActions();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('✨');
  const today = ymd();
  return (
    <>
      <div className="glass overflow-hidden">
        {habits.map((h) => {
          const days = (h.data?.days ?? {}) as Record<string, boolean>;
          const on = !!days[today];
          const st = streakOf(days);
          return (
            <div key={h.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0 hairline">
              <span className="text-[20px]">{h.data?.emoji ?? '✨'}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">{h.title}</p>
                <div className="mt-1 flex gap-1">
                  {Array.from({ length: 7 }, (_, i) => {
                    const d = ymd(addDays(new Date(), i - 6));
                    return <span key={d} className="h-1.5 w-4 rounded-full" style={{ background: days[d] ? '#10B981' : 'currentColor', opacity: days[d] ? 1 : 0.12 }} />;
                  })}
                </div>
              </div>
              {st > 0 && <span className="flex items-center gap-0.5 text-[12px] font-semibold" style={{ color: '#10B981' }}><Flame size={13} />{st}</span>}
              <button onClick={() => { put('habit', { data: { days: { ...days, [today]: !on } } }, h); if (!on) { haptic('success'); playSound('pop'); } }} onContextMenu={(e) => { e.preventDefault(); if (confirm(`Apagar "${h.title}"?`)) del(h.id); }} className={cn('grid h-9 w-9 place-items-center rounded-full ring-1', on ? 'text-white ring-transparent' : 'ring-black/15 dark:ring-white/20')} style={on ? { background: '#10B981' } : undefined}>
                <Check size={16} strokeWidth={3} className={on ? '' : 'opacity-30'} />
              </button>
            </div>
          );
        })}
        <button onClick={() => setAdding(true)} className="flex w-full items-center gap-2 px-4 py-3 text-[14px] font-medium muted"><Plus size={16} /> Novo hábito</button>
      </div>
      <Sheet open={adding} onClose={() => setAdding(false)} title="Novo hábito" footer={<Button variant="primary" className="w-full" disabled={!title.trim()} onClick={() => { put('habit', { title: title.trim(), data: { emoji, days: {} } }); setTitle(''); setAdding(false); }}>Criar</Button>}>
        <div className="space-y-3 pt-1">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Estudar inglês 20 min" className="input" />
          <div className="flex flex-wrap gap-2">
            {['✨', '📖', '🇺🇸', '🏃', '🧘', '💧', '🥗', '🎸', '✍️', '💤', '🙏', '📵'].map((e) => (
              <button key={e} onClick={() => setEmoji(e)} className={cn('grid h-11 w-11 place-items-center rounded-2xl text-[20px]', emoji === e ? 'bg-black/10 ring-2 ring-current dark:bg-white/15' : 'glass-thin')}>{e}</button>
            ))}
          </div>
          <p className="text-[12px] muted">Toque e segure um hábito na lista para apagar.</p>
        </div>
      </Sheet>
    </>
  );
}

/* ───────── Bloco de tempo ───────── */
export function TimeBlocks() {
  const { rows, me, mode } = useAtlas();
  const { put, del } = useEntryActions();
  const gcal = useExternalEvents(mode !== 'demo');
  const [day, setDay] = useState(ymd());
  const [add, setAdd] = useState<{ start: string } | null>(null);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const blocks = useEntries('block').filter((e) => e.createdBy === me?.id && e.date === day);
  const tasks = rows('tasks').filter((t) => !t.done).slice(0, 12);
  if (!me) return null;
  const evs = [
    ...rows('events').filter((e) => ymd(new Date(e.startsAt)) === day && !e.allDay).map((e) => ({ id: e.id, title: e.title, s: hhmm(e.startsAt), e: e.endsAt ? hhmm(e.endsAt) : null, kind: 'ev' as const })),
    ...gcal.events.filter((e) => e.owner === me.id && !e.allDay && ymd(new Date(e.start)) === day).map((e) => ({ id: e.id, title: e.title, s: hhmm(e.start), e: e.end ? hhmm(e.end) : null, kind: 'g' as const })),
    ...blocks.map((b) => ({ id: b.id, title: b.title, s: b.data?.start as string, e: (b.data?.end as string) ?? null, kind: 'b' as const, done: b.done, entry: b })),
  ].sort((a, b) => a.s.localeCompare(b.s));
  const hours = Array.from({ length: 18 }, (_, i) => i + 6);
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const H = 44;
  return (
    <>
      <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
        {Array.from({ length: 7 }, (_, i) => addDays(new Date(), i)).map((d) => (
          <button key={ymd(d)} onClick={() => setDay(ymd(d))} className={cn('shrink-0 rounded-2xl px-3 py-2 text-center', day === ymd(d) ? 'bg-black text-white dark:bg-white dark:text-black' : 'glass-thin')}>
            <p className="text-[10.5px] uppercase opacity-70">{d.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}</p>
            <p className="text-[16px] font-bold">{d.getDate()}</p>
          </button>
        ))}
      </div>
      <Glass className="relative overflow-hidden p-0">
        <div className="relative" style={{ height: hours.length * H }}>
          {hours.map((h, i) => (
            <button key={h} onClick={() => { const t = `${String(h).padStart(2, '0')}:00`; setStart(t); setEnd(`${String(Math.min(23, h + 1)).padStart(2, '0')}:00`); setTitle(''); setAdd({ start: t }); }} className="absolute inset-x-0 flex border-t text-left hairline" style={{ top: i * H, height: H }}>
              <span className="w-12 pl-3 pt-1 text-[10.5px] tabular-nums muted">{String(h).padStart(2, '0')}:00</span>
            </button>
          ))}
          {evs.map((e) => {
            const top = ((toMin(e.s) - 360) / 60) * H;
            const h = Math.max(26, (((e.e ? toMin(e.e) : toMin(e.s) + 45) - toMin(e.s)) / 60) * H - 2);
            if (top < 0) return null;
            const isB = e.kind === 'b';
            return (
              <div key={e.id} className={cn('absolute left-14 right-2 overflow-hidden rounded-xl px-2.5 py-1 text-[12.5px]', isB ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-white')} style={{ top: top + 1, height: h, background: isB ? undefined : e.kind === 'g' ? '#4285F4cc' : '#10B981cc' }}
                onClick={() => isB && 'entry' in e && e.entry && (confirm(`Remover "${e.title}"?`) ? del(e.entry.id) : put('block', { done: !e.entry.done }, e.entry))}>
                <p className={cn('truncate font-semibold', isB && 'done' in e && e.done && 'line-through opacity-60')}>{e.title}</p>
                <p className="truncate text-[10.5px] opacity-75">{e.s}{e.e ? `–${e.e}` : ''}{e.kind === 'g' ? ' · Google' : e.kind === 'ev' ? ' · Agenda' : ''}</p>
              </div>
            );
          })}
        </div>
      </Glass>
      <p className="mt-2 text-center text-[12px] muted">Toque num horário para reservar um bloco. Toque no bloco para remover.</p>
      <Sheet open={!!add} onClose={() => setAdd(null)} title="Reservar bloco" footer={<Button variant="primary" className="w-full" disabled={!title.trim() || end <= start} onClick={() => { put('block', { title: title.trim(), date: day, data: { start, end } }); setAdd(null); }}>Reservar</Button>}>
        <div className="space-y-3 pt-1">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="O que vai fazer nesse horário?" className="input" />
          {tasks.length > 0 && (
            <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5">
              {tasks.map((t) => <button key={t.id} onClick={() => setTitle(t.title)} className="glass-thin shrink-0 px-3 py-1.5 text-[12.5px] !rounded-full">{t.title}</button>)}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[12px] muted">Início<input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="input mt-1" /></label>
            <label className="text-[12px] muted">Fim<input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="input mt-1" /></label>
          </div>
        </div>
      </Sheet>
    </>
  );
}

/* ───────── Revisão semanal pessoal ───────── */
export function WeeklyReview() {
  const { me } = useAtlas();
  const { put } = useEntryActions();
  const week = weekOf();
  const all = useEntries('review').filter((e) => e.createdBy === me?.id);
  const cur = all.find((e) => e.date === week);
  const [v, setV] = useState<{ good: string; behind: string; next: string }>({ good: '', behind: '', next: '' });
  const [edit, setEdit] = useState(false);
  useEffect(() => { setV({ good: cur?.data?.good ?? '', behind: cur?.data?.behind ?? '', next: cur?.data?.next ?? '' }); setEdit(!cur); }, [cur]);
  const prev = all.filter((e) => e.date !== week).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))[0];
  return (
    <Glass className="p-4">
      <p className="text-[15px] font-semibold">Revisão da semana</p>
      {prev?.data?.next && <p className="mt-1 text-[12px] muted">Metas que você definiu na semana passada: {prev.data.next}</p>}
      {edit ? (
        <div className="mt-3 space-y-2.5">
          {([['good', 'O que deu certo'], ['behind', 'O que ficou para trás'], ['next', 'Metas da próxima semana']] as const).map(([k, l]) => (
            <label key={k} className="block text-[12px] font-medium muted">{l}
              <textarea rows={2} value={v[k]} onChange={(e) => setV((s) => ({ ...s, [k]: e.target.value }))} className="input mt-1 resize-none" />
            </label>
          ))}
          <Button variant="primary" className="w-full" disabled={!v.good.trim() && !v.next.trim()} onClick={() => { put('review', { title: 'Revisão', date: week, data: v }, cur); setEdit(false); }}>Salvar revisão</Button>
        </div>
      ) : (
        <div className="mt-2 space-y-1.5 text-[13.5px]">
          <p><b>Deu certo:</b> {cur?.data?.good || '—'}</p>
          <p><b>Ficou pra trás:</b> {cur?.data?.behind || '—'}</p>
          <p><b>Próxima semana:</b> {cur?.data?.next || '—'}</p>
          <button onClick={() => setEdit(true)} className="pt-1 text-[12px] font-semibold muted">Editar</button>
        </div>
      )}
    </Glass>
  );
}

/* ───────── Resumo do dia (noite) ───────── */
export function useDaySummary() {
  const { rows, me, todayHabit } = useAtlas();
  return useMemo(() => {
    if (!me) return null;
    const today = ymd();
    const pr = rows('entries').filter((e) => e.kind === 'priority' && e.createdBy === me.id && e.date === today);
    const focus = rows('entries').filter((e) => e.kind === 'focus' && e.createdBy === me.id && e.date === today).reduce((s, e) => s + (e.data?.minutes ?? 0), 0);
    const tasksDone = rows('tasks').filter((t) => t.done && t.doneAt && ymd(new Date(t.doneAt)) === today && t.doneBy === me.id).length;
    const pending = rows('tasks').filter((t) => !t.done && t.dueDate && t.dueDate <= today).length;
    const h = todayHabit(me.id);
    const read = rows('bible_reads').some((r) => r.profileId === me.id && ymd(new Date(r.readAt)) === today);
    const tomorrow = ymd(addDays(new Date(), 1));
    const tomorrowEv = rows('events').filter((e) => ymd(new Date(e.startsAt)) === tomorrow);
    return { pr, prDone: pr.filter((p) => p.done).length, focus, tasksDone, pending, water: h.waterMl, read, tomorrowEv };
  }, [rows, me, todayHabit]);
}
export function DaySummaryCard() {
  const s = useDaySummary();
  if (!s) return null;
  const items = [
    { k: 'Prioridades', v: s.pr.length ? `${s.prDone}/${s.pr.length}` : '—' },
    { k: 'Foco', v: `${s.focus} min` },
    { k: 'Tarefas feitas', v: String(s.tasksDone) },
    { k: 'Água', v: `${(s.water / 1000).toFixed(1)}L` },
    { k: 'Bíblia', v: s.read ? '✓' : '—' },
    { k: 'Pendentes', v: String(s.pending) },
  ];
  return (
    <Glass className="p-4">
      <p className="text-[15px] font-semibold">Resumo do seu dia 🌙</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {items.map((i) => (
          <div key={i.k} className="glass-thin p-2.5 text-center">
            <p className="text-[17px] font-bold tabular-nums">{i.v}</p>
            <p className="text-[10.5px] muted">{i.k}</p>
          </div>
        ))}
      </div>
      {s.tomorrowEv.length > 0 && <p className="mt-3 text-[12.5px] muted">Amanhã: {s.tomorrowEv.map((e) => `${e.allDay ? '' : hhmm(e.startsAt) + ' '}${e.title}`).join(' · ')}</p>}
    </Glass>
  );
}

/* ───────── Tela do hub ───────── */
function Tile({ kind, count }: { kind: string; count: number }) {
  const { navigate } = useUI();
  const k = KINDS[kind];
  return (
    <Glass className="p-4" onClick={() => navigate('col', kind)}>
      <span className="text-[22px]">{k.emoji}</span>
      <p className="mt-2 text-[15px] font-semibold">{k.title}</p>
      <p className="text-[12px] muted">{count ? `${count} registro(s)` : k.hint}</p>
    </Glass>
  );
}
export function HubTiles({ kinds }: { kinds: string[] }) {
  const { rows } = useAtlas();
  const all = rows('entries');
  return <div className="grid grid-cols-2 gap-3">{kinds.map((k) => <Tile key={k} kind={k} count={all.filter((e) => e.kind === k).length} />)}</div>;
}

export function FocusHub() {
  const [tab, setTab] = useSticky<'today' | 'time' | 'habits'>('focus-tab', 'today');
  const late = new Date().getHours() >= 18;
  return (
    <div>
      <PageHeader title="Produtividade" subtitle="Foco no que importa" back />
      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4">
        {([['today', 'Hoje'], ['time', 'Bloco de tempo'], ['habits', 'Hábitos']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className={cn('shrink-0 rounded-full px-4 py-2 text-[14px] font-semibold', tab === v ? 'bg-black text-white dark:bg-white dark:text-black' : 'glass-thin')}>{l}</button>
        ))}
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {tab === 'today' && (
            <>
              <Section><PrioritiesCard /></Section>
              <Section><FocusStarter /></Section>
              {late && <Section><DaySummaryCard /></Section>}
              <Section title="Ferramentas"><HubTiles kinds={['idea', 'project', 'goal', 'book', 'learning']} /></Section>
              <Section title="Domingo"><WeeklyReview /></Section>
              {!late && <Section title="Até agora"><DaySummaryCard /></Section>}
            </>
          )}
          {tab === 'time' && <Section><TimeBlocks /></Section>}
          {tab === 'habits' && (
            <Section title="Seus hábitos">
              <CustomHabits />
              <p className="mt-2 px-1 text-[12px] muted">Os 4 hábitos do casal (devocional, treino, dieta e leitura) continuam em Saúde.</p>
            </Section>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function GoalQuick({ e }: { e: Entry }) {
  const { put } = useEntryActions();
  if (!e.data?.target) return null;
  return (
    <div className="flex gap-2 px-4 pb-3">
      <Button className="h-8 px-3 text-[12px]" onClick={() => put('goal', { data: { current: Math.max(0, (e.data.current ?? 0) - 1) } }, e)}>−1</Button>
      <Button className="h-8 px-3 text-[12px]" onClick={() => { const n = (e.data.current ?? 0) + 1; put('goal', { data: { current: n } }, e); haptic('success'); if (n === e.data.target) celebrate(`Meta batida: ${e.title} 🎯`); }}>+1 {e.data.unit ?? ''}</Button>
    </div>
  );
}
export { ChevronRight, Pause, Play, Target };
