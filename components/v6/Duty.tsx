'use client';
/* Compromissos obrigatórios: humor diário e tarefas com horário tocam como alarme e só somem quando são cumpridos. */
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Check, ChevronRight, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI } from '@/components/providers/UIProvider';
import { useEntries, useEntryActions } from '@/components/ui/Collection';
import { Button, Glass, Section, Switch } from '@/components/ui/primitives';
import { MOOD_ORDER, MOODS } from '@/lib/constants';
import { uploadPhoto, usePhotoUrl } from '@/lib/files';
import { celebrate, playSound } from '@/lib/fx';
import { AtlasNative, isNative } from '@/lib/native';
import type { Entry, Mood, Task } from '@/lib/types';
import { cn, firstName, uid, ymd } from '@/lib/utils';
import { EMERALD } from './kit';

export interface DutyCfg { moodOn: boolean; moodTimes: string[]; tasksOn: boolean; snoozeMax: number }
export const DUTY_KEY = 'my-atlas:duty';
export const EXTRA_KEY = 'my-atlas:alarms-extra';
const DEFAULT: DutyCfg = { moodOn: false, moodTimes: ['08:00', '21:00'], tasksOn: true, snoozeMax: 2 };
export const readDuty = (): DutyCfg => { try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(DUTY_KEY) || '{}') }; } catch { return DEFAULT; } };
const EMOTIONS: [string, string][] = [['Alegria', '😄'], ['Paz', '😌'], ['Gratidão', '🙏'], ['Ansiedade', '😰'], ['Tristeza', '😢'], ['Raiva', '😠'], ['Medo', '😨'], ['Cansaço', '🥱']];

/* ───── regras ───── */
const dueAt = (t: Task) => (t.dueDate && t.dueTime ? new Date(`${t.dueDate}T${t.dueTime}:00`).getTime() : t.dueDate ? new Date(`${t.dueDate}T09:00:00`).getTime() : 0);
export const isMine = (t: Task, me: string) => t.assignee === me || (t.assignee === null && t.createdBy === me);
/** Precisa da aprovação de quem criou: tarefa que o par passou para mim. */
export const needsApproval = (t: Task, me: string) => t.createdBy !== me && t.assignee === me;
const latestProof = (proofs: Entry[], taskId: string) => proofs.filter((p) => p.data.taskId === taskId).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0];

/** Último horário de humor que já passou hoje (ou null). */
function lastMoodSlot(cfg: DutyCfg, now = new Date()) {
  const slots = cfg.moodTimes.map((t) => { const [h, m] = t.split(':').map(Number); const d = new Date(now); d.setHours(h, m, 0, 0); return d; }).filter((d) => d <= now).sort((a, b) => b.getTime() - a.getTime());
  return slots[0] ?? null;
}

/* ───── sincroniza com o despertador nativo ───── */
export function DutySync() {
  const { me, rows } = useAtlas();
  const proofs = useEntries('task_proof');
  const tasks = rows('tasks');
  const [v, setV] = useState(0);
  useEffect(() => { const on = () => setV((x) => x + 1); window.addEventListener('atlas:duty-cfg', on); return () => window.removeEventListener('atlas:duty-cfg', on); }, []);
  const sig = useMemo(() => {
    if (!me) return '[]';
    const cfg = readDuty();
    const out: Record<string, unknown>[] = [];
    if (cfg.moodOn) cfg.moodTimes.forEach((t) => out.push({ id: `mood-${t.replace(':', '')}`, time: t, days: [], on: true, kind: 'mood', title: '💭 Como você está?', text: 'Registre seu humor para desligar' }));
    if (cfg.tasksOn) {
      const now = Date.now();
      tasks.filter((t) => !t.done && t.mandatory && t.dueTime && isMine(t, me.id)).forEach((t) => {
        const at = dueAt(t);
        const p = latestProof(proofs, t.id);
        if (p?.data.status === 'pending') return;
        if (at > now && at < now + 14 * 864e5) out.push({ id: `task-${t.id}`, at, on: true, kind: 'task', title: `📌 ${t.title}`, text: t.needsProof ? 'Envie a foto para concluir' : 'Marque como concluída para desligar' });
      });
    }
    return JSON.stringify(out);
  }, [me, tasks, proofs, v]);
  useEffect(() => {
    try { localStorage.setItem(EXTRA_KEY, sig); } catch { /* noop */ }
    import('./Alarm').then((m) => m.resync()).catch(() => {});
  }, [sig]);
  return null;
}

/* ───── portão: decide o que precisa ser cumprido agora ───── */
type Gate = { kind: 'mood'; id: string; ring: boolean } | { kind: 'task'; id: string; taskId: string; ring: boolean };
export function DutyHost() {
  const { me, rows } = useAtlas();
  const proofs = useEntries('task_proof');
  const [gate, setGate] = useState<Gate | null>(null);
  const tasks = rows('tasks');
  const logs = rows('mood_logs');

  const check = useCallback(() => {
    if (!me || gate) return;
    const cfg = readDuty();
    // humor: passou do horário e não registrou depois dele
    if (cfg.moodOn) {
      const slot = lastMoodSlot(cfg);
      const key = `my-atlas:mood-done:${ymd()}:${slot?.toTimeString().slice(0, 5)}`;
      if (slot && !localStorage.getItem(key) && !logs.some((l) => l.profileId === me.id && new Date(l.createdAt) >= slot)) return setGate({ kind: 'mood', id: `mood-${slot.toTimeString().slice(0, 5).replace(':', '')}`, ring: false });
    }
    // tarefas obrigatórias vencidas
    if (cfg.tasksOn) {
      const late = tasks.filter((t) => !t.done && t.mandatory && isMine(t, me.id) && dueAt(t) && dueAt(t) <= Date.now()).find((t) => latestProof(proofs, t.id)?.data.status !== 'pending');
      if (late) setGate({ kind: 'task', id: `task-${late.id}`, taskId: late.id, ring: false });
    }
  }, [me, gate, logs, tasks, proofs]);

  useEffect(() => {
    const onDuty = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id.startsWith('mood-')) setGate({ kind: 'mood', id, ring: true });
      else if (id.startsWith('task-')) setGate({ kind: 'task', id, taskId: id.slice(5), ring: true });
    };
    window.addEventListener('atlas:duty', onDuty);
    const vis = () => document.visibilityState === 'visible' && setTimeout(check, 1200);
    document.addEventListener('visibilitychange', vis);
    const t = setTimeout(check, 2500);
    return () => { window.removeEventListener('atlas:duty', onDuty); document.removeEventListener('visibilitychange', vis); clearTimeout(t); };
  }, [check]);

  const close = async () => { if (isNative()) await AtlasNative.stopAlarm().catch(() => {}); setGate(null); };
  const task = gate?.kind === 'task' ? tasks.find((t) => t.id === gate.taskId) : undefined;
  // tarefa já resolvida em outro lugar: desliga sozinho
  useEffect(() => { if (gate?.kind === 'task' && (!task || task.done || latestProof(proofs, task.id)?.data.status === 'pending')) close(); }, [gate, task, proofs]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {gate?.kind === 'mood' && <MoodGate key="mood" gateId={gate.id} onDone={close} />}
      {gate?.kind === 'task' && task && <TaskGate key="task" gateId={gate.id} task={task} onDone={close} />}
    </AnimatePresence>
  );
}

/* ───── soneca limitada ───── */
function useSnooze(gateId: string) {
  const key = `my-atlas:dsnooze:${gateId}:${ymd()}`;
  const [n, setN] = useState(() => Number(localStorage.getItem(key) || 0));
  const max = readDuty().snoozeMax;
  const { me } = useAtlas();
  const { put } = useEntryActions();
  const snooze = async (label: string, onDone: () => void) => {
    const next = n + 1;
    localStorage.setItem(key, String(next)); setN(next);
    if (isNative()) {
      await AtlasNative.stopAlarm().catch(() => {});
      const m = await import('./Alarm');
      await m.resync(Date.now() + 10 * 60_000, gateId);
    }
    if (next >= max) put('duty_miss', { title: label, date: ymd(), data: { gate: gateId, n: next, who: me?.id } });
    onDone();
  };
  return { left: Math.max(0, max - n), snooze };
}

function Shell({ children, top }: { children: React.ReactNode; top: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-black px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(2.5rem+var(--sat,env(safe-area-inset-top)))] text-white">
      <div className="mb-6">{top}</div>
      {children}
    </motion.div>
  );
}

/* ───── humor ───── */
export function MoodGate({ gateId, onDone, test }: { gateId: string; onDone: () => void; test?: boolean }) {
  const { me, save } = useAtlas();
  const { put } = useEntryActions();
  const [mood, setMood] = useState<Mood | null>(null);
  const [batt, setBatt] = useState(me?.mentalBattery ?? 60);
  const [emo, setEmo] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const { left, snooze } = useSnooze(gateId);
  const done = () => {
    if (!me || !mood || !emo) return;
    if (!test) {
      const at = new Date().toISOString();
      save('profiles', { ...me, mood, mentalBattery: batt, updatedAt: at });
      save('mood_logs', { id: uid(), profileId: me.id, mood, mentalBattery: batt, createdAt: at });
      put('emotion', { title: emo, date: ymd(), body: note.trim() || undefined, data: { level: 3, via: 'checkin' } });
      const slot = lastMoodSlot(readDuty());
      if (slot) localStorage.setItem(`my-atlas:mood-done:${ymd()}:${slot.toTimeString().slice(0, 5)}`, '1');
    }
    playSound('done'); celebrate('Humor registrado 💚');
    onDone();
  };
  return (
    <Shell top={<><p className="text-[13px] font-semibold uppercase tracking-widest text-white/45">Check-in obrigatório{test ? ' · teste' : ''}</p><p className="mt-1 text-[32px] font-bold leading-tight tracking-tight">Como você está, {firstName(me?.displayName ?? '')}?</p></>}>
      <p className="mb-2 text-[13px] font-semibold text-white/60">Humor</p>
      <div className="grid grid-cols-5 gap-2">
        {MOOD_ORDER.map((m) => (
          <motion.button key={m} whileTap={{ scale: 0.9 }} onClick={() => setMood(m)} className={cn('flex flex-col items-center gap-1 rounded-[18px] py-3 transition', mood === m ? 'bg-white text-black' : 'bg-white/[0.08]')}>
            <span className="text-[24px]">{MOODS[m].emoji}</span><span className="text-[10.5px] font-semibold leading-tight">{MOODS[m].label}</span>
          </motion.button>
        ))}
      </div>
      <p className="mb-2 mt-6 flex justify-between text-[13px] font-semibold text-white/60"><span>Bateria mental</span><span className="tabular-nums text-white">{batt}%</span></p>
      <input type="range" min={0} max={100} step={5} value={batt} onChange={(e) => setBatt(Number(e.target.value))} className="w-full accent-white" />
      <p className="mb-2 mt-6 text-[13px] font-semibold text-white/60">Como estou me sentindo</p>
      <div className="grid grid-cols-4 gap-2">
        {EMOTIONS.map(([o, e]) => (
          <motion.button key={o} whileTap={{ scale: 0.9 }} onClick={() => setEmo(o)} className={cn('flex flex-col items-center gap-1 rounded-[18px] py-2.5 transition', emo === o ? 'bg-white text-black' : 'bg-white/[0.08]')}>
            <span className="text-[22px]">{e}</span><span className="text-[11px] font-medium">{o}</span>
          </motion.button>
        ))}
      </div>
      <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Quer contar mais? (opcional)" className="mt-4 w-full rounded-2xl bg-white/[0.08] p-4 text-[15px] outline-none placeholder:text-white/35" />
      <div className="mt-auto pt-6">
        <button disabled={!mood || !emo} onClick={done} className="h-16 w-full rounded-full text-[18px] font-bold text-black transition disabled:opacity-30" style={{ background: EMERALD }}>Registrar e desligar</button>
        {test ? <button onClick={onDone} className="mt-3 h-12 w-full text-[14px] text-white/50">Fechar teste</button>
          : left > 0 ? <button onClick={() => snooze('humor', onDone)} className="mt-3 h-14 w-full rounded-full bg-white/10 text-[15px] font-semibold">Adiar 10 min · restam {left}</button>
          : <p className="mt-4 text-center text-[13px] text-white/50">Sem adiamentos. Seu amor já foi avisado 👀</p>}
      </div>
    </Shell>
  );
}

/* ───── tarefa ───── */
export function TaskGate({ gateId, task, onDone, inline }: { gateId: string; task: Task; onDone: () => void; inline?: boolean }) {
  const { me, partner, patch, state, mode } = useAtlas();
  const { put } = useEntryActions();
  const { left, snooze } = useSnooze(gateId);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const url = usePhotoUrl(photo);
  if (!me) return null;
  const approval = needsApproval(task, me.id);
  const canFinish = !task.needsProof || !!photo;
  const finish = () => {
    if (!canFinish) return;
    if (approval) {
      put('task_proof', { title: task.title, date: ymd(), body: note.trim() || undefined, data: { taskId: task.id, photo, status: 'pending', approver: task.createdBy } });
      celebrate(`Enviado para ${firstName(partner?.displayName ?? 'seu amor')} aprovar ✅`);
    } else {
      if (photo) put('task_proof', { title: task.title, date: ymd(), body: note.trim() || undefined, data: { taskId: task.id, photo, status: 'approved', approver: me.id } });
      patch('tasks', task.id, { done: true, doneAt: new Date().toISOString(), doneBy: me.id });
      celebrate('Tarefa concluída ✅');
    }
    playSound('done');
    onDone();
  };
  const pick = async (f?: File) => {
    if (!f || !state) return;
    setBusy(true);
    try { setPhoto(await uploadPhoto(f, state.couple.id, mode === 'demo')); } catch { /* noop */ }
    setBusy(false);
  };
  const body = (
    <>
      {task.notes && <p className="mb-4 rounded-2xl bg-white/[0.08] p-4 text-[15px] text-white/80">{task.notes}</p>}
      <label className={cn('relative grid aspect-[4/3] w-full cursor-pointer place-items-center overflow-hidden rounded-[26px] border border-dashed', photo ? 'border-transparent' : 'border-white/25 bg-white/[0.05]')}>
        {url ? <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : (
          <span className="flex flex-col items-center gap-2 text-white/60"><Camera size={30} /><span className="text-[14px] font-semibold">{busy ? 'Enviando…' : task.needsProof ? 'Tirar foto da prova (obrigatório)' : 'Anexar foto (opcional)'}</span></span>
        )}
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Comentário (opcional)" className="mt-3 w-full rounded-2xl bg-white/[0.08] p-4 text-[15px] outline-none placeholder:text-white/35" />
      {approval && <p className="mt-3 text-center text-[12.5px] text-white/55">{firstName(partner?.displayName ?? 'Seu amor')} criou essa tarefa e precisa aprovar para ela contar como feita.</p>}
    </>
  );
  return (
    <Shell top={<><p className="text-[13px] font-semibold uppercase tracking-widest text-white/45">{inline ? 'Concluir tarefa' : 'Tarefa obrigatória'}</p><p className="mt-1 text-[30px] font-bold leading-tight tracking-tight">{task.title}</p>{task.dueTime && <p className="mt-1 text-[14px] text-white/55">Prazo: {task.dueDate?.split('-').reverse().slice(0, 2).join('/')} às {task.dueTime}</p>}</>}>
      {body}
      <div className="mt-auto pt-6">
        <button disabled={!canFinish || busy} onClick={finish} className="flex h-16 w-full items-center justify-center gap-2 rounded-full text-[18px] font-bold text-black transition disabled:opacity-30" style={{ background: EMERALD }}><Check size={20} /> {approval ? 'Enviar para aprovação' : 'Marcar como concluída'}</button>
        {inline ? <button onClick={onDone} className="mt-3 h-12 w-full text-[14px] text-white/50">Cancelar</button>
          : left > 0 ? <button onClick={() => snooze(task.title, onDone)} className="mt-3 h-14 w-full rounded-full bg-white/10 text-[15px] font-semibold">Adiar 10 min · restam {left}</button>
          : <p className="mt-4 text-center text-[13px] text-white/50">Sem adiamentos. Bora resolver 💪</p>}
      </div>
    </Shell>
  );
}

/** Concluir pelo check da Agenda: tarefas do par passam pela prova/aprovação. */
export function TaskProofHost() {
  const { rows } = useAtlas();
  const [id, setId] = useState<string | null>(null);
  useEffect(() => { const on = (e: Event) => setId((e as CustomEvent<string>).detail); window.addEventListener('atlas:task-proof', on); return () => window.removeEventListener('atlas:task-proof', on); }, []);
  const t = rows('tasks').find((x) => x.id === id);
  return <AnimatePresence>{t && <TaskGate key="tp" gateId={`task-${t.id}`} task={t} inline onDone={() => setId(null)} />}</AnimatePresence>;
}

/* ───── aprovações (para quem criou a tarefa) ───── */
export function ProofBanner() {
  const { me, partner, rows, patch } = useAtlas();
  const proofs = useEntries('task_proof');
  const { put } = useEntryActions();
  const [open, setOpen] = useState<Entry | null>(null);
  const pending = proofs.filter((p) => p.data.status === 'pending' && p.data.approver === me?.id);
  const mine = proofs.filter((p) => p.createdBy === me?.id && p.data.status === 'pending');
  if (!me || (!pending.length && !mine.length)) return null;
  const decide = (p: Entry, ok: boolean, why = '') => {
    put('task_proof', { data: { status: ok ? 'approved' : 'rejected', decidedAt: new Date().toISOString(), why } }, p);
    if (ok) { const t = rows('tasks').find((x) => x.id === p.data.taskId); if (t) patch('tasks', t.id, { done: true, doneAt: new Date().toISOString(), doneBy: p.createdBy }); celebrate('Aprovada ✅'); }
    playSound(ok ? 'done' : 'pop');
    setOpen(null);
  };
  return (
    <>
      {pending.map((p) => (
        <motion.button key={p.id} whileTap={{ scale: 0.98 }} onClick={() => setOpen(p)} className="glass mb-3 flex w-full items-center gap-3 p-3.5 text-left">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] text-[22px]" style={{ background: EMERALD + '22' }}>📸</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-semibold">{firstName(partner?.displayName ?? '')} concluiu: {p.title}</span><span className="block text-[12.5px] font-medium" style={{ color: EMERALD }}>Toque para aprovar</span></span>
          <ChevronRight size={17} className="muted" />
        </motion.button>
      ))}
      {!pending.length && mine.map((p) => (
        <div key={p.id} className="glass mb-3 flex items-center gap-3 p-3.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] bg-black/[0.05] text-[22px] dark:bg-white/[0.07]">⏳</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-semibold">{p.title}</span><span className="block text-[12.5px] muted">Aguardando {firstName(partner?.displayName ?? '')} aprovar</span></span>
        </div>
      ))}
      <AnimatePresence>{open && <Approve p={open} onClose={() => setOpen(null)} onDecide={decide} />}</AnimatePresence>
    </>
  );
}
function Approve({ p, onClose, onDecide }: { p: Entry; onClose: () => void; onDecide: (p: Entry, ok: boolean, why?: string) => void }) {
  const url = usePhotoUrl(p.data.photo);
  const [why, setWhy] = useState('');
  const [no, setNo] = useState(false);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] flex items-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }} transition={{ type: 'spring', stiffness: 380, damping: 36 }} className="glass-strong max-h-[92vh] w-full overflow-y-auto rounded-t-[32px] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3"><p className="text-[20px] font-bold leading-tight tracking-tight">{p.title}</p><button onClick={onClose} className="muted"><X size={20} /></button></div>
        {url ? <img src={url} alt="" className="mt-4 aspect-[4/3] w-full rounded-[22px] object-cover" /> : <p className="mt-4 rounded-[18px] bg-black/[0.04] p-4 text-center text-[13.5px] muted dark:bg-white/[0.06]">Sem foto — marcou como feita.</p>}
        {p.body && <p className="mt-3 text-[14.5px]">“{p.body}”</p>}
        {no && <textarea autoFocus rows={2} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="O que ainda falta?" className="input mt-3" />}
        <div className="mt-4 flex gap-2">
          {no ? <Button className="flex-1" disabled={!why.trim()} onClick={() => onDecide(p, false, why.trim())}>Devolver</Button> : <Button className="flex-1" onClick={() => setNo(true)}>Ainda não</Button>}
          <Button variant="primary" className="flex-1" onClick={() => onDecide(p, true)}>Aprovar ✅</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───── configurações ───── */
export function DutySettings() {
  const [cfg, setCfg] = useState<DutyCfg>(DEFAULT);
  const [testing, setTesting] = useState(false);
  useEffect(() => setCfg(readDuty()), []);
  const upd = (c: DutyCfg) => { setCfg(c); try { localStorage.setItem(DUTY_KEY, JSON.stringify(c)); } catch { /* noop */ } window.dispatchEvent(new Event('atlas:duty-cfg')); };
  return (
    <Section title="Compromissos obrigatórios">
      <Glass className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1"><p className="text-[15px] font-medium">Check-in de humor</p><p className="text-[12px] muted">Toca como alarme e só para quando você registrar humor e sentimento.</p></div>
          <Switch checked={cfg.moodOn} onChange={(v) => upd({ ...cfg, moodOn: v })} label="Check-in de humor" />
        </div>
        {cfg.moodOn && (
          <div className="flex flex-wrap items-center gap-2">
            {cfg.moodTimes.map((t, i) => (
              <div key={i} className="glass-thin flex items-center gap-1 rounded-full py-1 pl-3 pr-1">
                <input type="time" value={t} onChange={(e) => upd({ ...cfg, moodTimes: cfg.moodTimes.map((x, k) => (k === i ? e.target.value : x)).sort() })} className="bg-transparent text-[15px] font-semibold tabular-nums outline-none" />
                {cfg.moodTimes.length > 1 && <button onClick={() => upd({ ...cfg, moodTimes: cfg.moodTimes.filter((_, k) => k !== i) })} className="grid h-7 w-7 place-items-center rounded-full muted"><X size={14} /></button>}
              </div>
            ))}
            {cfg.moodTimes.length < 4 && <button onClick={() => upd({ ...cfg, moodTimes: [...cfg.moodTimes, '13:00'].sort() })} className="rounded-full px-3 py-2 text-[13px] font-semibold muted">+ horário</button>}
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="flex-1"><p className="text-[15px] font-medium">Tarefas com horário</p><p className="text-[12px] muted">Tarefas marcadas como obrigatórias tocam na hora e só param ao concluir (com foto, se exigida).</p></div>
          <Switch checked={cfg.tasksOn} onChange={(v) => upd({ ...cfg, tasksOn: v })} label="Tarefas obrigatórias" />
        </div>
        <p className="text-[12px] muted">Adiar: até {cfg.snoozeMax}× de 10 min. Depois disso, seu amor é avisado.</p>
        <Button className="w-full" onClick={() => setTesting(true)}>Testar o check-in</Button>
      </Glass>
      <AnimatePresence>{testing && <MoodGate gateId="test" test onDone={() => setTesting(false)} />}</AnimatePresence>
    </Section>
  );
}
