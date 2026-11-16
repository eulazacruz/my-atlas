'use client';

import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useIsland } from '@/components/island/IslandProvider';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI } from '@/components/providers/UIProvider';
import { NewSheets } from './NewSheets';
import { Button, Chip, Field, Segmented, Sheet, Switch } from '@/components/ui/primitives';
import { CYCLE_MOODS, DATE_KINDS, DISCHARGE, FLOWS, PRIORITY, PROTECTION, SYMPTOMS, TX_CATEGORIES } from '@/lib/constants';
import type { CalEvent, CycleDay, Flow, Goal, IntimacyLog, Prayer, SpecialDate, Task } from '@/lib/types';
import { firstName, fmtDay, money, parseMoney, uid, ymd } from '@/lib/utils';

const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
const localTime = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const combine = (date: string, time: string) => new Date(`${date}T${time || '00:00'}:00`).toISOString();

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="danger" onClick={onClick} className="w-12 shrink-0 px-0" >
      <Trash2 size={16} />
    </Button>
  );
}

/* ───────── Evento ───────── */
function EventSheet() {
  const { sheet, closeSheet } = useUI();
  const { me, partner, save, remove } = useAtlas();
  const open = sheet?.kind === 'event';
  const ev: CalEvent | undefined = sheet?.payload?.event;
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(ymd());
  const [start, setStart] = useState('19:00');
  const [end, setEnd] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [owner, setOwner] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(ev?.title ?? '');
    setDate(ev ? ymd(new Date(ev.startsAt)) : sheet?.payload?.date ?? ymd());
    setStart(ev && !ev.allDay ? localTime(ev.startsAt) : '19:00');
    setEnd(ev?.endsAt ? localTime(ev.endsAt) : '');
    setAllDay(ev?.allDay ?? false);
    setLocation(ev?.location ?? '');
    setNotes(ev?.notes ?? '');
    setOwner(ev?.owner ?? null);
  }, [open, ev, sheet?.payload?.date]);
  if (!me) return null;

  const submit = () => {
    if (!title.trim()) return;
    save('events', {
      id: ev?.id ?? uid(), createdBy: ev?.createdBy ?? me.id, owner, title: title.trim(),
      startsAt: combine(date, allDay ? '00:00' : start), endsAt: !allDay && end ? combine(date, end) : null,
      allDay, location: location.trim() || null, notes: notes.trim() || null,
    });
    closeSheet();
  };

  return (
    <Sheet
      open={open}
      onClose={closeSheet}
      title={ev ? 'Editar evento' : 'Novo evento'}
      footer={
        <div className="flex gap-2">
          {ev && <DeleteButton onClick={() => { remove('events', ev.id); closeSheet(); }} />}
          <Button variant="primary" className="flex-1" disabled={!title.trim()} onClick={submit}>Salvar</Button>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        <input autoFocus={!ev} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do evento" className="input text-[17px] font-semibold" />
        <div className="glass-thin flex items-center justify-between p-3.5">
          <span className="text-[15px]">Dia todo</span>
          <Switch checked={allDay} onChange={setAllDay} label="Dia todo" />
        </div>
        <Field label="Data">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
        </Field>
        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Início"><input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="input" /></Field>
            <Field label="Fim"><input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="input" /></Field>
          </div>
        )}
        <Field label="Local"><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Opcional" className="input" /></Field>
        <Field label="De quem é">
          <div className="flex flex-wrap gap-2">
            <Chip active={owner === null} onClick={() => setOwner(null)}>Do casal</Chip>
            <Chip active={owner === me.id} onClick={() => setOwner(me.id)}>Meu</Chip>
            {partner && !partner.pending && <Chip active={owner === partner.id} onClick={() => setOwner(partner.id)}>{firstName(partner.displayName)}</Chip>}
          </div>
        </Field>
        <Field label="Notas"><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="input" /></Field>
      </div>
    </Sheet>
  );
}

/* ───────── Tarefa ───────── */
function TaskSheet() {
  const { sheet, closeSheet } = useUI();
  const { me, partner, save, remove } = useAtlas();
  const open = sheet?.kind === 'task';
  const t: Task | undefined = sheet?.payload?.task;
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [due, setDue] = useState('');
  const [assignee, setAssignee] = useState<string | null>(null);
  const [priority, setPriority] = useState(0);
  useEffect(() => {
    if (!open) return;
    setTitle(t?.title ?? '');
    setNotes(t?.notes ?? '');
    setDue(t?.dueDate ?? sheet?.payload?.date ?? '');
    setAssignee(t?.assignee ?? null);
    setPriority(t?.priority ?? 0);
  }, [open, t, sheet?.payload?.date]);
  if (!me) return null;
  const submit = () => {
    if (!title.trim()) return;
    save('tasks', {
      id: t?.id ?? uid(), createdBy: t?.createdBy ?? me.id, assignee, title: title.trim(), notes: notes.trim() || null,
      dueDate: due || null, priority, done: t?.done ?? false, doneAt: t?.doneAt ?? null, doneBy: t?.doneBy ?? null, createdAt: t?.createdAt ?? new Date().toISOString(),
    });
    closeSheet();
  };
  return (
    <Sheet
      open={open}
      onClose={closeSheet}
      title={t ? 'Editar tarefa' : 'Nova tarefa'}
      footer={
        <div className="flex gap-2">
          {t && <DeleteButton onClick={() => { remove('tasks', t.id); closeSheet(); }} />}
          <Button variant="primary" className="flex-1" disabled={!title.trim()} onClick={submit}>Salvar</Button>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        <input autoFocus={!t} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="O que precisa ser feito?" className="input text-[17px] font-semibold" />
        <Field label="Responsável">
          <div className="flex flex-wrap gap-2">
            <Chip active={assignee === null} onClick={() => setAssignee(null)}>Nós dois</Chip>
            <Chip active={assignee === me.id} onClick={() => setAssignee(me.id)}>Eu</Chip>
            {partner && !partner.pending && <Chip active={assignee === partner.id} onClick={() => setAssignee(partner.id)}>{firstName(partner.displayName)}</Chip>}
          </div>
        </Field>
        <Field label="Prazo">
          <div className="flex gap-2">
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="input" />
            {due && <Button onClick={() => setDue('')}>Limpar</Button>}
          </div>
        </Field>
        <Field label="Prioridade">
          <Segmented id="prio" value={String(priority)} onChange={(v) => setPriority(Number(v))} options={PRIORITY.map((p) => ({ value: String(p.value), label: p.label }))} />
        </Field>
        <Field label="Notas"><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="input" /></Field>
      </div>
    </Sheet>
  );
}

/* ───────── Lançamento financeiro ───────── */
function ExpenseSheet() {
  const { sheet, closeSheet } = useUI();
  const { me, save } = useAtlas();
  const { push } = useIsland();
  const open = sheet?.kind === 'expense';
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [scope, setScope] = useState<'shared' | 'individual'>('shared');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState('Mercado');
  const [date, setDate] = useState(ymd());
  useEffect(() => {
    if (open) {
      setAmount('');
      setDesc(sheet?.payload?.desc ?? '');
      setDate(ymd());
      if (sheet?.payload?.category) { setCat(sheet.payload.category); setType('expense'); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  if (!me) return null;
  const value = parseMoney(amount);
  const valid = value > 0 && desc.trim().length > 0;
  const submit = () => {
    if (!valid) return;
    save('transactions', { id: uid(), createdBy: me.id, type, scope, amount: value, description: desc.trim(), category: type === 'income' ? 'Renda' : cat, occurredOn: date, createdAt: new Date().toISOString() });
    push({ kind: 'expense', title: `${type === 'expense' ? 'Despesa' : 'Entrada'} registrada: ${money(value)}`, subtitle: `${desc.trim()} · ${scope === 'shared' ? 'Nossa' : 'Individual'}`, duration: 3000 });
    closeSheet();
  };
  return (
    <Sheet open={open} onClose={closeSheet} title="Novo lançamento" footer={<Button variant="primary" className="w-full" disabled={!valid} onClick={submit}>Registrar {value > 0 ? money(value) : ''}</Button>}>
      <div className="space-y-4 pt-1">
        <Segmented id="tx-type" value={type} onChange={setType} options={[{ value: 'expense', label: 'Saída' }, { value: 'income', label: 'Entrada' }]} />
        <div className="flex items-baseline gap-2 border-b pb-2 hairline">
          <span className="text-[24px] font-semibold muted">R$</span>
          <input autoFocus inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="0,00" className="w-full bg-transparent text-[40px] font-bold tabular-nums tracking-tight outline-none placeholder:text-black/20 dark:placeholder:text-white/20" />
        </div>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descrição (ex.: Supermercado)" className="input" />
        {type === 'expense' && (
          <Field label="Categoria">
            <div className="flex flex-wrap gap-2">
              {TX_CATEGORIES.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
            </div>
          </Field>
        )}
        <Field label="De quem é">
          <Segmented id="tx-scope" value={scope} onChange={setScope} options={[{ value: 'shared', label: 'Nossa' }, { value: 'individual', label: 'Individual' }]} />
        </Field>
        <Field label="Data"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" /></Field>
      </div>
    </Sheet>
  );
}

/* ───────── Registro do dia do ciclo ───────── */
function CycleDaySheet() {
  const { sheet, closeSheet } = useUI();
  const { me, rows, save, remove } = useAtlas();
  const { push } = useIsland();
  const open = sheet?.kind === 'cycleDay';
  const day: string = sheet?.payload?.day ?? ymd();
  const existing = rows('cycle_days').find((d) => d.profileId === me?.id && d.day === day);
  const [flow, setFlow] = useState<Flow>('none');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [moods, setMoods] = useState<string[]>([]);
  const [discharge, setDischarge] = useState<string | null>(null);
  const [temp, setTemp] = useState('');
  const [ovu, setOvu] = useState<CycleDay['ovulationTest']>(null);
  const [preg, setPreg] = useState<CycleDay['pregnancyTest']>(null);
  const [notes, setNotes] = useState('');
  useEffect(() => {
    if (!open) return;
    setFlow(existing?.flow ?? 'none');
    setSymptoms(existing?.symptoms ?? []);
    setMoods(existing?.moods ?? []);
    setDischarge(existing?.discharge ?? null);
    setTemp(existing?.temperature ? String(existing.temperature).replace('.', ',') : '');
    setOvu(existing?.ovulationTest ?? null);
    setPreg(existing?.pregnancyTest ?? null);
    setNotes(existing?.notes ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, day]);
  if (!me) return null;

  const submit = () => {
    const empty = flow === 'none' && !symptoms.length && !moods.length && !discharge && !temp && !ovu && !preg && !notes.trim();
    if (empty) {
      if (existing) remove('cycle_days', existing.id);
    } else {
      save('cycle_days', {
        id: existing?.id ?? uid(), profileId: me.id, day, flow, symptoms, moods, discharge,
        temperature: temp ? parseMoney(temp) : null, ovulationTest: ovu, pregnancyTest: preg, notes: notes.trim() || null, updatedAt: new Date().toISOString(),
      });
    }
    if (flow !== 'none' && existing?.flow !== flow) push({ kind: 'cycle', title: 'Ciclo atualizado', subtitle: 'Previsões recalculadas.', duration: 2400 });
    closeSheet();
  };

  const Test = ({ value, set, label }: { value: CycleDay['ovulationTest']; set: (v: CycleDay['ovulationTest']) => void; label: string }) => (
    <Field label={label}>
      <div className="flex gap-2">
        <Chip active={value === 'positive'} onClick={() => set(value === 'positive' ? null : 'positive')}>Positivo</Chip>
        <Chip active={value === 'negative'} onClick={() => set(value === 'negative' ? null : 'negative')}>Negativo</Chip>
      </div>
    </Field>
  );

  return (
    <Sheet open={open} onClose={closeSheet} title={fmtDay(day, { weekday: 'long', day: 'numeric', month: 'long' })} footer={<Button variant="primary" className="w-full" onClick={submit}>Salvar registro</Button>}>
      <div className="space-y-5 pt-1">
        <Field label="Fluxo">
          <div className="grid grid-cols-5 gap-1.5">
            {FLOWS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFlow(f.value)}
                className={`flex flex-col items-center gap-1 rounded-2xl py-2.5 text-[11px] font-medium transition-colors ${flow === f.value ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-black/[0.04] dark:bg-white/[0.06]'}`}
              >
                <span className="flex h-3 items-center gap-0.5">
                  {f.value === 'none' ? <span className="h-2 w-2 rounded-full ring-1 ring-current opacity-50" /> : Array.from({ length: f.dots }).map((_, i) => <span key={i} className="h-2 w-2 rounded-full bg-[#f472b6]" style={f.value === 'spotting' ? { opacity: 0.5 } : undefined} />)}
                </span>
                {f.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Sintomas">
          <div className="flex flex-wrap gap-2">{SYMPTOMS.map((s) => <Chip key={s} active={symptoms.includes(s)} onClick={() => setSymptoms(toggle(symptoms, s))}>{s}</Chip>)}</div>
        </Field>
        <Field label="Humor">
          <div className="flex flex-wrap gap-2">{CYCLE_MOODS.map((s) => <Chip key={s} active={moods.includes(s)} onClick={() => setMoods(toggle(moods, s))}>{s}</Chip>)}</div>
        </Field>
        <Field label="Muco cervical">
          <div className="flex flex-wrap gap-2">{DISCHARGE.map((d) => <Chip key={d.value} active={discharge === d.value} onClick={() => setDischarge(discharge === d.value ? null : d.value)}>{d.label}</Chip>)}</div>
        </Field>
        <Field label="Temperatura basal (°C)">
          <input inputMode="decimal" value={temp} onChange={(e) => setTemp(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="36,5" className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Test value={ovu} set={setOvu} label="Teste de ovulação" />
          <Test value={preg} set={setPreg} label="Teste de gravidez" />
        </div>
        <Field label="Anotações"><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Como você se sentiu hoje?" className="input" /></Field>
      </div>
    </Sheet>
  );
}

/* ───────── Relação ───────── */
function IntimacySheet() {
  const { sheet, closeSheet } = useUI();
  const { me, save, remove } = useAtlas();
  const open = sheet?.kind === 'intimacy';
  const log: IntimacyLog | undefined = sheet?.payload?.log;
  const [date, setDate] = useState(ymd());
  const [time, setTime] = useState('22:00');
  const [protection, setProtection] = useState('none');
  const [notes, setNotes] = useState('');
  useEffect(() => {
    if (!open) return;
    setDate(log ? ymd(new Date(log.happenedAt)) : ymd());
    setTime(log ? localTime(log.happenedAt) : localTime(new Date().toISOString()));
    setProtection(log?.protection ?? 'none');
    setNotes(log?.notes ?? '');
  }, [open, log]);
  if (!me) return null;
  return (
    <Sheet
      open={open}
      onClose={closeSheet}
      title={log ? 'Editar registro' : 'Registrar relação'}
      footer={
        <div className="flex gap-2">
          {log && <DeleteButton onClick={() => { remove('intimacy_logs', log.id); closeSheet(); }} />}
          <Button variant="primary" className="flex-1" onClick={() => { save('intimacy_logs', { id: log?.id ?? uid(), createdBy: log?.createdBy ?? me.id, happenedAt: combine(date, time), protection, notes: notes.trim() || null }); closeSheet(); }}>
            Salvar
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" /></Field>
          <Field label="Hora"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input" /></Field>
        </div>
        <Field label="Proteção">
          <div className="flex flex-wrap gap-2">{PROTECTION.map((p) => <Chip key={p.value} active={protection === p.value} onClick={() => setProtection(p.value)}>{p.label}</Chip>)}</div>
        </Field>
        <Field label="Notas (opcional)"><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="input" /></Field>
        <p className="text-[12px] muted">Visível apenas para vocês dois.</p>
      </div>
    </Sheet>
  );
}

/* ───────── Data especial ───────── */
function SpecialDateSheet() {
  const { sheet, closeSheet } = useUI();
  const { me, save, remove } = useAtlas();
  const open = sheet?.kind === 'specialDate';
  const d: SpecialDate | undefined = sheet?.payload?.date;
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(ymd());
  const [kind, setKind] = useState('outro');
  const [recurring, setRecurring] = useState(true);
  useEffect(() => {
    if (!open) return;
    setTitle(d?.title ?? '');
    setDate(d?.date ?? ymd());
    setKind(d?.kind ?? 'aniversario');
    setRecurring(d?.recurring ?? true);
  }, [open, d]);
  if (!me) return null;
  return (
    <Sheet
      open={open}
      onClose={closeSheet}
      title={d ? 'Editar data' : 'Nova data especial'}
      footer={
        <div className="flex gap-2">
          {d && <DeleteButton onClick={() => { remove('special_dates', d.id); closeSheet(); }} />}
          <Button variant="primary" className="flex-1" disabled={!title.trim()} onClick={() => { save('special_dates', { id: d?.id ?? uid(), createdBy: d?.createdBy ?? me.id, title: title.trim(), date, kind, recurring }); closeSheet(); }}>Salvar</Button>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Aniversário de casamento" className="input text-[17px] font-semibold" />
        <Field label="Tipo"><div className="flex flex-wrap gap-2">{DATE_KINDS.map((k) => <Chip key={k.value} active={kind === k.value} onClick={() => setKind(k.value)}>{k.emoji} {k.label}</Chip>)}</div></Field>
        <Field label="Data"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" /></Field>
        <div className="glass-thin flex items-center justify-between p-3.5">
          <span className="text-[15px]">Repete todo ano</span>
          <Switch checked={recurring} onChange={setRecurring} label="Repete todo ano" />
        </div>
      </div>
    </Sheet>
  );
}

/* ───────── Meta ───────── */
function GoalSheet() {
  const { sheet, closeSheet } = useUI();
  const { me, save, remove } = useAtlas();
  const open = sheet?.kind === 'goal';
  const g: Goal | undefined = sheet?.payload?.goal;
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [unit, setUnit] = useState('R$');
  const [due, setDue] = useState('');
  const [add, setAdd] = useState('');
  useEffect(() => {
    if (!open) return;
    setTitle(g?.title ?? '');
    setEmoji(g?.emoji ?? '🎯');
    setTarget(g ? String(g.target).replace('.', ',') : '');
    setCurrent(g ? String(g.current).replace('.', ',') : '0');
    setUnit(g?.unit ?? 'R$');
    setDue(g?.dueDate ?? '');
    setAdd('');
  }, [open, g]);
  if (!me) return null;
  const submit = () => {
    if (!title.trim()) return;
    save('goals', { id: g?.id ?? uid(), createdBy: g?.createdBy ?? me.id, title: title.trim(), emoji, target: parseMoney(target) || 0, current: (parseMoney(current) || 0) + (parseMoney(add) || 0), unit, dueDate: due || null });
    closeSheet();
  };
  return (
    <Sheet
      open={open}
      onClose={closeSheet}
      title={g ? 'Meta' : 'Nova meta'}
      footer={
        <div className="flex gap-2">
          {g && <DeleteButton onClick={() => { remove('goals', g.id); closeSheet(); }} />}
          <Button variant="primary" className="flex-1" disabled={!title.trim()} onClick={submit}>Salvar</Button>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        <div className="flex gap-2">
          <input value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 2))} className="input w-16 text-center text-[22px]" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Reserva de emergência" className="input text-[16px] font-semibold" />
        </div>
        <Field label="Unidade"><div className="flex flex-wrap gap-2">{['R$', 'livros', 'km', 'dias', 'vezes'].map((u) => <Chip key={u} active={unit === u} onClick={() => setUnit(u)}>{u}</Chip>)}</div></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Alvo"><input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} className="input" /></Field>
          <Field label="Atual"><input inputMode="decimal" value={current} onChange={(e) => setCurrent(e.target.value)} className="input" /></Field>
        </div>
        {g && <Field label="Adicionar progresso"><input inputMode="decimal" value={add} onChange={(e) => setAdd(e.target.value)} placeholder={unit === 'R$' ? 'Ex.: 300' : 'Ex.: 1'} className="input" /></Field>}
        <Field label="Prazo (opcional)"><input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="input" /></Field>
      </div>
    </Sheet>
  );
}

/* ───────── Oração ───────── */
function PrayerSheet() {
  const { sheet, closeSheet } = useUI();
  const { me, save, remove } = useAtlas();
  const open = sheet?.kind === 'prayer';
  const p: Prayer | undefined = sheet?.payload?.prayer;
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [answered, setAnswered] = useState(false);
  const [note, setNote] = useState('');
  useEffect(() => {
    if (!open) return;
    setTitle(p?.title ?? '');
    setDetails(p?.details ?? '');
    setAnswered(p?.answered ?? false);
    setNote(p?.answerNote ?? '');
  }, [open, p]);
  if (!me) return null;
  return (
    <Sheet
      open={open}
      onClose={closeSheet}
      title={p ? 'Pedido de oração' : 'Novo pedido'}
      footer={
        <div className="flex gap-2">
          {p && <DeleteButton onClick={() => { remove('prayers', p.id); closeSheet(); }} />}
          <Button
            variant="primary"
            className="flex-1"
            disabled={!title.trim()}
            onClick={() => {
              save('prayers', { id: p?.id ?? uid(), createdBy: p?.createdBy ?? me.id, title: title.trim(), details: details.trim() || null, answered, answeredAt: answered ? p?.answeredAt ?? new Date().toISOString() : null, answerNote: answered ? note.trim() || null : null, createdAt: p?.createdAt ?? new Date().toISOString() });
              closeSheet();
            }}
          >
            Salvar
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pelo que vamos orar?" className="input text-[16px] font-semibold" />
        <textarea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Detalhes (opcional)" className="input" />
        <div className="glass-thin flex items-center justify-between p-3.5">
          <span className="text-[15px]">Oração respondida 🙌</span>
          <Switch checked={answered} onChange={setAnswered} label="Respondida" />
        </div>
        {answered && <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Como Deus respondeu?" className="input" />}
      </div>
    </Sheet>
  );
}

export function Sheets() {
  return (
    <>
      <EventSheet />
      <TaskSheet />
      <ExpenseSheet />
      <CycleDaySheet />
      <IntimacySheet />
      <SpecialDateSheet />
      <GoalSheet />
      <PrayerSheet />
      <NewSheets />
    </>
  );
}
