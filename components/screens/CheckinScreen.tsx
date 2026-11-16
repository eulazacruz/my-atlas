'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Lock, MessagesSquare, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { Avatar, Button, Glass, PageHeader, Section } from '@/components/ui/primitives';
import type { Checkin, Profile } from '@/lib/types';
import { addDays, cn, firstName, fmtDay, parseYmd, uid, ymd } from '@/lib/utils';

export const CHECKIN_QUESTIONS = [
  { key: 'bom', q: 'O melhor momento da nossa semana', ph: 'Aquele jantar, a conversa no carro…' },
  { key: 'pesou', q: 'O que pesou pra mim', ph: 'Cansaço, uma preocupação, algo que me chateou…' },
  { key: 'preciso', q: 'Do que eu preciso de você nesta semana', ph: 'Mais tempo juntos, ajuda com algo, paciência…' },
  { key: 'gratidao', q: 'Sou grato(a) por você porque…', ph: 'Algo que você notou e quer agradecer' },
] as const;
export const SCORES = [
  { v: 1, e: '😞', l: 'Difícil' },
  { v: 2, e: '😕', l: 'Meh' },
  { v: 3, e: '🙂', l: 'Ok' },
  { v: 4, e: '😊', l: 'Boa' },
  { v: 5, e: '🥰', l: 'Incrível' },
];

/** Domingo da semana atual (a semana do check-in vai de domingo a sábado). */
export const weekOf = (d = new Date()) => ymd(addDays(d, -d.getDay()));

export function useCheckinStatus() {
  const { rows, me, partner } = useAtlas();
  const week = weekOf();
  const list = rows('checkins');
  const mine = me ? list.find((c) => c.profileId === me.id && c.week === week) : undefined;
  const theirs = partner ? list.find((c) => c.profileId === partner.id && c.week === week) : undefined;
  return { week, mine, theirs };
}

function Form({ initial, onDone }: { initial?: Checkin; onDone: () => void }) {
  const { me, save } = useAtlas();
  const [score, setScore] = useState<number | null>(initial?.score ?? null);
  const [ans, setAns] = useState<Record<string, string>>(initial?.answers ?? {});
  const filled = CHECKIN_QUESTIONS.filter((q) => ans[q.key]?.trim()).length;
  if (!me) return null;
  const submit = () => {
    save('checkins', { id: initial?.id ?? uid(), profileId: me.id, week: weekOf(), score, answers: Object.fromEntries(Object.entries(ans).map(([k, v]) => [k, v.trim()])), createdAt: initial?.createdAt ?? new Date().toISOString() });
    onDone();
  };
  return (
    <div className="space-y-3">
      <Glass className="p-4">
        <p className="text-[15px] font-semibold">Como foi a nossa semana?</p>
        <div className="mt-3 grid grid-cols-5 gap-1.5">
          {SCORES.map((s) => (
            <motion.button key={s.v} whileTap={{ scale: 0.9 }} onClick={() => setScore(s.v)} className={cn('flex flex-col items-center gap-1 rounded-2xl py-2.5 transition', score === s.v ? 'bg-black text-white dark:bg-white dark:text-black' : 'glass-thin')}>
              <span className="text-[24px] leading-none">{s.e}</span>
              <span className="text-[10.5px] font-medium">{s.l}</span>
            </motion.button>
          ))}
        </div>
      </Glass>
      {CHECKIN_QUESTIONS.map((q, i) => (
        <Glass key={q.key} className="p-4">
          <p className="text-[12px] font-semibold muted">{i + 1} de {CHECKIN_QUESTIONS.length}</p>
          <p className="mt-0.5 text-[15px] font-semibold">{q.q}</p>
          <textarea rows={2} value={ans[q.key] ?? ''} onChange={(e) => setAns((a) => ({ ...a, [q.key]: e.target.value }))} placeholder={q.ph} className="input mt-2.5 resize-none" />
        </Glass>
      ))}
      <Button variant="primary" className="h-12 w-full text-[15px]" disabled={!score || filled < 2} onClick={submit}>
        {initial ? 'Salvar alterações' : 'Enviar meu check-in'}
      </Button>
      <p className="text-center text-[12px] muted">As respostas de cada um só aparecem quando os dois respondem.</p>
    </div>
  );
}

function Answers({ a, b, pa, pb }: { a: Checkin; b?: Checkin; pa: Profile; pb: Profile }) {
  return (
    <div className="space-y-3">
      <Glass className="flex items-center justify-around p-4">
        {[{ c: a, p: pa }, { c: b, p: pb }].map(({ c, p }) => (
          <div key={p.id} className="flex flex-col items-center gap-1.5">
            <Avatar profile={p} size={40} />
            <span className="text-[28px] leading-none">{SCORES.find((s) => s.v === c?.score)?.e ?? '—'}</span>
            <span className="text-[11px] muted">{firstName(p.displayName)}</span>
          </div>
        ))}
      </Glass>
      {CHECKIN_QUESTIONS.map((q) => (
        <Glass key={q.key} className="p-4">
          <p className="text-[13px] font-semibold">{q.q}</p>
          <div className="mt-2.5 space-y-2.5">
            {[{ c: a, p: pa }, { c: b, p: pb }].map(({ c, p }) => (
              <div key={p.id} className="flex gap-2.5">
                <Avatar profile={p} size={24} />
                <p className={cn('flex-1 text-[14px] leading-snug', !c?.answers[q.key] && 'muted')}>{c?.answers[q.key] || '—'}</p>
              </div>
            ))}
          </div>
        </Glass>
      ))}
    </div>
  );
}

export function CheckinScreen() {
  const { rows, me, partner, sendNudge, alert } = useAtlas();
  const { week, mine, theirs } = useCheckinStatus();
  const [editing, setEditing] = useState(false);
  const [openWeek, setOpenWeek] = useState<string | null>(null);
  useEffect(() => setEditing(!mine), [mine]);
  if (!me || !partner) return null;
  const pName = firstName(partner.displayName);
  const weeks = Array.from(new Set(rows('checkins').map((c) => c.week))).filter((w) => w !== week).sort().reverse();
  const at = (w: string, p: Profile) => rows('checkins').find((c) => c.week === w && c.profileId === p.id);
  const chart = [...weeks].reverse().slice(-8).concat(mine || theirs ? [week] : []);

  return (
    <div>
      <PageHeader title="Check-in" subtitle={`Semana de ${fmtDay(parseYmd(week), { day: 'numeric', month: 'long' })}`} back />

      <AnimatePresence mode="popLayout" initial={false}>
        {editing ? (
          <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Section>
              <Form initial={mine} onDone={() => setEditing(false)} />
            </Section>
          </motion.div>
        ) : mine && theirs ? (
          <motion.div key="both" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Section title="Vocês dois" action={<button onClick={() => setEditing(true)} className="flex items-center gap-1 text-[13px] muted"><Pencil size={13} /> Editar</button>}>
              <Answers a={mine} b={theirs} pa={me} pb={partner} />
            </Section>
          </motion.div>
        ) : (
          <motion.div key="wait" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Section>
              <Glass className="flex flex-col items-center p-6 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-black/[0.05] dark:bg-white/[0.07]"><Lock size={22} /></span>
                <p className="mt-4 text-[17px] font-semibold">Seu check-in foi enviado ✓</p>
                <p className="mt-1 max-w-[280px] text-[13px] muted">As respostas aparecem quando {pName} fizer o check-in dela.</p>
                <div className="mt-5 flex w-full gap-2">
                  <Button className="flex-1" onClick={() => setEditing(true)}><Pencil size={15} /> Editar</Button>
                  <Button variant="primary" className="flex-1" onClick={() => { sendNudge('cutucao'); alert({ kind: 'checkin', title: `${pName} foi lembrada 💬`, duration: 2500 }); }}>Lembrar {pName}</Button>
                </div>
              </Glass>
            </Section>
          </motion.div>
        )}
      </AnimatePresence>

      {chart.length > 1 && (
        <Section title="Termômetro">
          <Glass className="p-4">
            <div className="flex h-28 items-end justify-between gap-2">
              {chart.map((w) => {
                const a = at(w, me)?.score ?? 0;
                const b = at(w, partner)?.score ?? 0;
                return (
                  <div key={w} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="flex h-20 items-end gap-[3px]">
                      <motion.div className="w-2.5 rounded-full bg-black dark:bg-white" initial={{ height: 0 }} animate={{ height: `${(a / 5) * 100}%` }} />
                      <motion.div className="w-2.5 rounded-full" style={{ background: '#10B981' }} initial={{ height: 0 }} animate={{ height: `${(b / 5) * 100}%` }} />
                    </div>
                    <span className="text-[10px] tabular-nums muted">{fmtDay(parseYmd(w), { day: '2-digit', month: '2-digit' })}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex gap-4 text-[11px] muted">
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-black dark:bg-white" /> Você</span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: '#10B981' }} /> {pName}</span>
            </div>
          </Glass>
        </Section>
      )}

      {weeks.length > 0 && (
        <Section title="Semanas anteriores">
          <div className="space-y-2">
            {weeks.map((w) => {
              const a = at(w, me);
              const b = at(w, partner);
              const open = openWeek === w;
              return (
                <div key={w}>
                  <Glass className="flex items-center gap-3 p-4" onClick={() => setOpenWeek(open ? null : w)}>
                    <MessagesSquare size={18} />
                    <p className="flex-1 text-[14px] font-medium">Semana de {fmtDay(parseYmd(w), { day: 'numeric', month: 'short' })}</p>
                    <span className="text-[18px]">{SCORES.find((s) => s.v === a?.score)?.e ?? '·'}</span>
                    <span className="text-[18px]">{SCORES.find((s) => s.v === b?.score)?.e ?? '·'}</span>
                  </Glass>
                  {open && a && b && <div className="mt-2"><Answers a={a} b={b} pa={me} pb={partner} /></div>}
                  {open && (!a || !b) && <p className="mt-2 px-2 text-[12px] muted">Só um de vocês respondeu nessa semana.</p>}
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}

/** Cartão para a tela inicial (aparece de sexta a domingo, ou quando o par já respondeu). */
export function CheckinHomeCard() {
  const { partner } = useAtlas();
  const { mine, theirs } = useCheckinStatus();
  const day = new Date().getDay();
  if (!partner) return null;
  const pName = firstName(partner.displayName);
  if (mine && theirs) return null;
  if (!mine && !theirs && day !== 0 && day !== 5 && day !== 6) return null;
  const text = !mine && theirs ? `${pName} já respondeu. Faça o seu para ver.` : mine ? `Esperando ${pName} responder.` : 'Dois minutos para conversar sobre a semana.';
  return (
    <Glass className="flex items-center gap-3 p-4" onClick={() => window.dispatchEvent(new CustomEvent('atlas:navigate', { detail: 'checkin' }))}>
      <span className="grid h-11 w-11 place-items-center rounded-2xl text-white" style={{ background: '#10B981' }}><MessagesSquare size={19} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold">Check-in da semana</p>
        <p className="truncate text-[12.5px] muted">{text}</p>
      </div>
    </Glass>
  );
}
