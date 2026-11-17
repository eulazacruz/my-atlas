'use client';
import { useSubNav } from '@/components/providers/UIProvider';
/* Saúde mental v6: autotestes, TCC, preocupação, ativação, respirações, jogos e plano de segurança. */
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronRight, Phone, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useEntries, useEntryActions } from '@/components/ui/Collection';
import { Button, Chip, Glass, Section } from '@/components/ui/primitives';
import { LimitsCard, ReminderSettings, UnwindRoutine } from '@/components/hubs/MindBody';
import { PrivateGate } from '@/components/fx/MoreSettings';
import { celebrate, playSound, vibe } from '@/lib/fx';
import { notifyAt, cancelNotif } from '@/lib/native';
import { ACTIVITIES, bandOf, BREATHS, CVV, DETECTIVE, DISTORTIONS, REFRAME, SAFETY_PLAN, TEST_NOTE, TESTS, type Breath, type Test } from '@/lib/data/psych';
import type { Entry } from '@/lib/types';
import { cn, fmtDay, parseYmd, uid, ymd } from '@/lib/utils';
import { Big, Dots, EMERALD, Fade, Pills, shuffle, useLocal } from './kit';

const toneColor = { ok: EMERALD, mild: '#A3A3A3', warn: '#F59E0B', high: '#EF4444' } as const;

export function CrisisCard() {
  return (
    <Glass className="p-4" >
      <p className="text-[15px] font-semibold">Você não está sozinho(a) 🤍</p>
      <p className="mt-1 text-[13.5px] leading-snug muted">Se estiver pensando em se machucar, fale agora com alguém. {CVV.hint}. Em emergência, SAMU 192.</p>
      <div className="mt-3 flex gap-2">
        <a href={`tel:${CVV.phone}`} className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-black text-[14px] font-semibold text-white dark:bg-white dark:text-black"><Phone size={15} /> Ligar 188</a>
        <a href="tel:192" className="inline-flex h-11 items-center justify-center rounded-full bg-black/[0.06] px-4 text-[14px] font-semibold dark:bg-white/[0.08]">192</a>
      </div>
    </Glass>
  );
}

/* ───────── Autotestes ───────── */
export function TestsTool() {
  return <PrivateGate><TestsInner /></PrivateGate>;
}
function TestsInner() {
  const [t, setT] = useSubNav<Test | null>(null);
  const hist = useEntries('selftest');
  if (t) return <TestRun t={t} onClose={() => setT(null)} />;
  return (
    <>
      <p className="mb-4 px-1 text-[13px] leading-snug muted">🔒 {TEST_NOTE}</p>
      <div className="space-y-2">
        {TESTS.map((x) => {
          const last = hist.filter((h) => h.data?.test === x.id).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
          const l = last[0];
          const b = l ? bandOf(x, l.data.raw) : null;
          return (
            <Glass key={x.id} className="p-4" onClick={() => setT(x)}>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-[16px] font-semibold">{x.name}</p>
                  <p className="text-[12.5px] muted">{x.items.length} perguntas · 1 minuto</p>
                </div>
                {b && <span className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={{ background: toneColor[b.tone] + '22', color: toneColor[b.tone] }}>{b.label}</span>}
                <ChevronRight size={17} className="muted" />
              </div>
              {last.length > 1 && (
                <div className="mt-3 flex h-10 items-end gap-1">
                  {last.slice(0, 12).reverse().map((h) => (
                    <div key={h.id} className="flex-1 rounded-t" style={{ height: `${Math.max(8, (h.data.raw / x.max) * 100)}%`, background: toneColor[bandOf(x, h.data.raw).tone], opacity: 0.8 }} title={h.date ?? ''} />
                  ))}
                </div>
              )}
            </Glass>
          );
        })}
      </div>
      <p className="mt-4 px-1 text-[12px] muted">Faça a cada 2 semanas para acompanhar a evolução. O gráfico mostra seus últimos resultados.</p>
    </>
  );
}
function TestRun({ t, onClose }: { t: Test; onClose: () => void }) {
  const { put } = useEntryActions();
  const [ans, setAns] = useState<number[]>([]);
  const i = ans.length;
  if (i >= t.items.length) {
    const raw = ans.reduce((s, x) => s + x, 0);
    const b = bandOf(t, raw);
    const risk = t.id === 'phq9' && ans[8] > 0;
    return (
      <div>
        <Glass className="p-6 text-center">
          <p className="label">{t.name}</p>
          <p className="mt-2 text-[48px] font-bold leading-none" style={{ color: toneColor[b.tone] }}>{t.scale ? raw * t.scale : raw}<span className="text-[18px] muted">/{t.scale ? 100 : t.max}</span></p>
          <p className="mt-2 text-[18px] font-semibold">{b.label}</p>
          <p className="mx-auto mt-2 max-w-sm text-[14px] leading-snug muted">{b.text}</p>
        </Glass>
        {risk && <div className="mt-3"><CrisisCard /></div>}
        <p className="mt-3 px-1 text-[12px] muted">{TEST_NOTE}</p>
        <Button variant="primary" className="mt-4 w-full" onClick={() => { put('selftest', { title: t.name, date: ymd(), private: true, data: { test: t.id, raw, answers: ans } }); onClose(); }}>Salvar resultado</Button>
        <Button variant="ghost" className="mt-1 w-full" onClick={onClose}>Descartar</Button>
      </div>
    );
  }
  return (
    <div>
      <Dots n={t.items.length} i={i} />
      <p className="mt-4 px-1 text-[13px] muted">{t.intro}</p>
      <Fade k={i}>
        <h3 className="mt-2 px-1 text-[22px] font-bold leading-snug tracking-tight">{t.items[i]}</h3>
        <div className="mt-5 space-y-2">
          {t.options.map((o) => (
            <motion.button key={o.value} whileTap={{ scale: 0.97 }} onClick={() => { setAns([...ans, o.value]); vibe('tick'); }} className="glass w-full p-4 text-left text-[15px] font-medium">{o.label}</motion.button>
          ))}
        </div>
      </Fade>
      {i > 0 && <button onClick={() => setAns(ans.slice(0, -1))} className="mt-4 text-[13px] muted">← Voltar</button>}
    </div>
  );
}

/* ───────── Registro de pensamentos (TCC) ───────── */
export function ThoughtsTool() {
  return <PrivateGate><ThoughtsInner /></PrivateGate>;
}
function ThoughtsInner() {
  const list = useEntries('thought').sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  const [open, setOpen] = useSubNav(false);
  const [view, setView] = useSubNav<Entry | null>(null);
  if (open) return <ThoughtForm onDone={() => setOpen(false)} />;
  if (view)
    return (
      <div>
        <button onClick={() => setView(null)} className="mb-3 text-[14px] muted">← Registros</button>
        <Glass className="space-y-3 p-5">
          {[['Situação', view.data.situation], ['Pensamento', view.title], ['Emoção', `${view.data.emotion} · ${view.data.before}%`], ['Armadilhas', (view.data.distortions ?? []).map((d: string) => DISTORTIONS.find((x) => x.id === d)?.name).join(', ')], ['A favor', view.data.pro], ['Contra', view.data.con], ['Pensamento equilibrado', view.data.balanced], ['Depois', `${view.data.after}%`]].map(([k, v]) => v ? <div key={k}><p className="text-[11.5px] font-semibold uppercase tracking-wide muted">{k}</p><p className="text-[15px] leading-snug">{v}</p></div> : null)}
        </Glass>
      </div>
    );
  return (
    <>
      <Glass className="p-5">
        <p className="text-[17px] font-semibold">Pensamento pesado agora?</p>
        <p className="mt-1 text-[13.5px] leading-snug muted">Em 6 passos você separa o fato da interpretação e chega a um pensamento mais justo. É a técnica central da terapia cognitivo-comportamental.</p>
        <Button variant="primary" className="mt-4 w-full" onClick={() => setOpen(true)}><Plus size={15} /> Novo registro</Button>
      </Glass>
      {list.length > 0 && (
        <Section className="mt-6" title="Registros">
          <div className="glass overflow-hidden">
            {list.map((e) => (
              <button key={e.id} onClick={() => setView(e)} className="flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-0 hairline">
                <div className="min-w-0 flex-1"><p className="truncate text-[15px] font-medium">{e.title}</p><p className="text-[12px] muted">{e.date ? fmtDay(parseYmd(e.date)) : ''} · {e.data.before}% → {e.data.after}%</p></div>
                {e.data.after < e.data.before && <span className="text-[12px] font-semibold" style={{ color: EMERALD }}>−{e.data.before - e.data.after}%</span>}
              </button>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
function Slider({ v, set }: { v: number; set: (n: number) => void }) {
  return (
    <div>
      <input type="range" min={0} max={100} step={5} value={v} onChange={(e) => set(Number(e.target.value))} className="w-full accent-emerald-500" />
      <p className="text-center text-[28px] font-bold tabular-nums">{v}%</p>
    </div>
  );
}
function ThoughtForm({ onDone }: { onDone: () => void }) {
  const { put } = useEntryActions();
  const [i, setI] = useState(0);
  const [v, setV] = useState<Record<string, any>>({ before: 70, after: 40, distortions: [] }); // eslint-disable-line @typescript-eslint/no-explicit-any
  const set = (k: string, x: unknown) => setV({ ...v, [k]: x });
  const steps = [
    { t: 'O que aconteceu?', b: <textarea rows={3} className="input" placeholder="Onde eu estava, com quem, o que aconteceu (só os fatos)" value={v.situation ?? ''} onChange={(e) => set('situation', e.target.value)} /> },
    { t: 'O que passou pela sua cabeça?', b: <textarea rows={3} className="input" placeholder="A frase exata que você pensou" value={v.thought ?? ''} onChange={(e) => set('thought', e.target.value)} /> },
    { t: 'O que você sentiu, e quanto?', b: <><div className="mb-3 flex flex-wrap gap-1.5">{['Ansiedade', 'Tristeza', 'Raiva', 'Culpa', 'Vergonha', 'Medo', 'Frustração'].map((x) => <Chip key={x} active={v.emotion === x} onClick={() => set('emotion', x)}>{x}</Chip>)}</div><Slider v={v.before} set={(n) => set('before', n)} /></> },
    { t: 'Caiu em alguma armadilha?', b: <div className="space-y-1.5">{DISTORTIONS.map((d) => { const on = v.distortions.includes(d.id); return <button key={d.id} onClick={() => set('distortions', on ? v.distortions.filter((x: string) => x !== d.id) : [...v.distortions, d.id])} className={cn('flex w-full items-start gap-2.5 rounded-2xl p-3 text-left', on ? 'bg-emerald-500/15' : 'bg-black/[0.03] dark:bg-white/[0.05]')}><span className="text-[18px]">{d.emoji}</span><span><span className="block text-[14px] font-semibold">{d.name}</span><span className="block text-[12.5px] muted">{d.hint}</span></span></button>; })}</div> },
    { t: 'Examine as provas', b: <><p className="mb-1 text-[13px] font-semibold">O que confirma esse pensamento?</p><textarea rows={2} className="input" value={v.pro ?? ''} onChange={(e) => set('pro', e.target.value)} /><p className="mb-1 mt-3 text-[13px] font-semibold">O que não confirma? O que eu diria a um amigo?</p><textarea rows={2} className="input" value={v.con ?? ''} onChange={(e) => set('con', e.target.value)} /></> },
    { t: 'Um pensamento mais justo', b: <><textarea rows={3} className="input" placeholder="Uma frase equilibrada e verdadeira" value={v.balanced ?? ''} onChange={(e) => set('balanced', e.target.value)} /><p className="mb-1 mt-4 text-[13px] font-semibold">E agora, quanto da emoção ficou?</p><Slider v={v.after} set={(n) => set('after', n)} /></> },
  ];
  const last = i === steps.length - 1;
  return (
    <div>
      <Dots n={steps.length} i={i} />
      <Fade k={i}><div className="mt-4"><h3 className="mb-3 px-1 text-[22px] font-bold tracking-tight">{steps[i].t}</h3>{steps[i].b}</div></Fade>
      <div className="mt-5 flex gap-2">
        <Button className="flex-1" onClick={() => (i ? setI(i - 1) : onDone())}>{i ? 'Voltar' : 'Cancelar'}</Button>
        <Button variant="primary" className="flex-1" onClick={() => { if (!last) return setI(i + 1); put('thought', { title: v.thought || 'Pensamento', date: ymd(), private: true, data: v }); if (v.after < v.before) celebrate(`A emoção caiu ${v.before - v.after}% 🌿`); onDone(); }}>{last ? 'Salvar' : 'Próximo'}</Button>
      </div>
    </div>
  );
}

/* ───────── Hora da preocupação ───────── */
export function WorryTool() {
  const { put, del } = useEntryActions();
  const { me, save } = useAtlas();
  const all = useEntries('worry');
  const parked = all.filter((e) => !e.done);
  const [t, setT] = useState('');
  const [at, setAt] = useLocal('my-atlas:worry-at', '19:00');
  const [review, setReview] = useState(false);
  useEffect(() => {
    const [h, m] = at.split(':').map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0); if (d < new Date()) d.setDate(d.getDate() + 1);
    cancelNotif(905001).then(() => notifyAt(905001, 'Hora da preocupação 🅿️', `${parked.length} preocupação(ões) estacionada(s). 15 minutos para olhar com calma.`, d));
  }, [at, parked.length]);
  return (
    <>
      <Glass className="p-5">
        <p className="text-[15px] leading-snug">Quando uma preocupação aparecer fora de hora, <b>estacione aqui</b> e volte ao que estava fazendo. No horário marcado, você olha todas de uma vez, por 15 minutos.</p>
        <div className="mt-4 flex gap-2">
          <input value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && t.trim() && (put('worry', { title: t.trim(), private: true, date: ymd() }), setT(''))} placeholder="O que está te preocupando?" className="input flex-1" />
          <Button variant="primary" className="w-12 px-0" onClick={() => { if (t.trim()) { put('worry', { title: t.trim(), private: true, date: ymd() }); setT(''); playSound('pop'); } }}><Plus size={17} /></Button>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[14px] muted">Minha hora da preocupação</span>
          <input type="time" value={at} onChange={(e) => setAt(e.target.value)} className="input !w-28 !py-2" />
        </div>
      </Glass>
      <Section className="mt-6" title={`Estacionadas · ${parked.length}`} action={parked.length ? <button onClick={() => setReview(!review)} className="text-[13px] font-semibold" style={{ color: EMERALD }}>{review ? 'Fechar' : 'Revisar agora'}</button> : undefined}>
        {parked.length === 0 ? <p className="px-1 text-[14px] muted">Nada estacionado. Que paz 🕊️</p> : (
          <div className="space-y-2">
            {parked.map((e) => (
              <Glass key={e.id} className="p-4">
                <p className="text-[15px] font-medium">{e.title}</p>
                {review && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Chip onClick={() => { put('worry', { done: true, data: { result: 'action' } }, e); if (me) save('tasks', { id: uid(), createdBy: me.id, assignee: me.id, title: e.title, dueDate: ymd(), priority: 1, done: false, createdAt: new Date().toISOString() }); playSound('done'); }}>✅ Posso agir: virar tarefa</Chip>
                    <Chip onClick={() => { put('worry', { done: true, data: { result: 'release' } }, e); playSound('calm'); }}>🙏 Não depende de mim: entregar</Chip>
                    <Chip onClick={() => del(e.id)}><Trash2 size={13} /></Chip>
                  </div>
                )}
              </Glass>
            ))}
          </div>
        )}
      </Section>
      {all.some((e) => e.done) && <p className="px-1 text-[12.5px] muted">{all.filter((e) => e.done && e.data?.result === 'release').length} preocupações entregues a Deus · {all.filter((e) => e.data?.result === 'action').length} viraram ação</p>}
    </>
  );
}

/* ───────── Ativação comportamental ───────── */
export function ActivateTool() {
  const { put } = useEntryActions();
  const all = useEntries('activity');
  const today = all.filter((e) => e.date === ymd());
  const [rate, setRate] = useState<Entry | null>(null);
  const done = all.filter((e) => e.done && e.data?.after != null);
  const lift = done.length ? done.reduce((s, e) => s + (e.data.after - (e.data.before ?? 3)), 0) / done.length : 0;
  const ideas = useMemo(() => shuffle(ACTIVITIES).slice(0, 6), []);
  const [custom, setCustom] = useState('');
  return (
    <>
      <Glass className="p-5">
        <p className="text-[15px] leading-snug">Quando o desânimo bate, a motivação vem <b>depois</b> da ação, não antes. Escolha 1 a 3 coisas pequenas para hoje e veja como o humor muda.</p>
        {done.length >= 3 && <p className="mt-3 text-[14px] font-semibold" style={{ color: EMERALD }}>Em média, seu humor sobe {lift.toFixed(1)} ponto(s) depois de uma atividade.</p>}
      </Glass>
      <Section className="mt-6" title="Hoje">
        {today.length === 0 ? <p className="px-1 text-[14px] muted">Escolha algo abaixo 👇</p> : (
          <div className="space-y-2">
            {today.map((e) => (
              <Glass key={e.id} className="flex items-center gap-3 p-4" onClick={() => !e.done && setRate(e)}>
                <span className={cn('grid h-7 w-7 place-items-center rounded-full', e.done ? 'text-white' : 'ring-1 ring-current/30')} style={e.done ? { background: EMERALD } : undefined}>{e.done && <Check size={14} strokeWidth={3} />}</span>
                <span className={cn('flex-1 text-[15px]', e.done && 'muted line-through')}>{e.title}</span>
                <span className="text-[11px] font-semibold muted">{e.data.k === 'P' ? 'Prazer' : 'Domínio'}</span>
              </Glass>
            ))}
          </div>
        )}
      </Section>
      <Section title="Ideias">
        <div className="flex flex-wrap gap-2">
          {ideas.map((a) => <Chip key={a.t} onClick={() => { put('activity', { title: a.t, date: ymd(), private: true, data: { k: a.k } }); playSound('pop'); }}>+ {a.t}</Chip>)}
        </div>
        <div className="mt-3 flex gap-2">
          <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Outra atividade" className="input flex-1" />
          <Button onClick={() => { if (custom.trim()) { put('activity', { title: custom.trim(), date: ymd(), private: true, data: { k: 'P' } }); setCustom(''); } }}><Plus size={16} /></Button>
        </div>
      </Section>
      <RateSheet e={rate} onClose={() => setRate(null)} onSave={(before, after) => { if (rate) put('activity', { done: true, data: { before, after } }, rate); celebrate('Feito! 💪'); setRate(null); }} />
    </>
  );
}
function RateSheet({ e, onClose, onSave }: { e: Entry | null; onClose: () => void; onSave: (b: number, a: number) => void }) {
  const [b, setB] = useState(2);
  const [a, setA] = useState(3);
  const faces = ['😞', '🙁', '😐', '🙂', '😄'];
  if (!e) return null;
  return (
    <div className="fixed inset-0 z-[80] grid place-items-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: 300 }} animate={{ y: 0 }} className="glass-strong w-full rounded-t-[32px] p-6 pb-10" onClick={(x) => x.stopPropagation()}>
        <p className="text-[18px] font-bold">{e.title}</p>
        {([['Humor antes', b, setB], ['Humor agora', a, setA]] as const).map(([l, v, s]) => (
          <div key={l} className="mt-4"><p className="mb-2 text-[13px] muted">{l}</p><div className="flex justify-between">{faces.map((f, i) => <button key={f} onClick={() => s(i + 1)} className={cn('text-[30px] transition', v === i + 1 ? 'scale-125' : 'opacity-40')}>{f}</button>)}</div></div>
        ))}
        <Button variant="primary" className="mt-6 w-full" onClick={() => onSave(b, a)}>Concluir</Button>
      </motion.div>
    </div>
  );
}

/* ───────── Respirações ───────── */
export function BreathsTool() {
  const [b, setB] = useSubNav<Breath | null>(null);
  if (b) return <BreathPlayer b={b} onClose={() => setB(null)} />;
  return (
    <div className="space-y-2">
      {BREATHS.map((x) => (
        <Glass key={x.id} className="flex items-center gap-3 p-4" onClick={() => setB(x)}>
          <span className="grid h-12 w-12 place-items-center rounded-full text-[12px] font-bold" style={{ background: EMERALD + '22', color: EMERALD }}>{({ '478': '4·7·8', sigh: '2×', coherence: '5,5', box: '4×4' } as Record<string, string>)[x.id]}</span>
          <span className="flex-1"><span className="block text-[16px] font-semibold">{x.name}</span><span className="text-[12.5px] muted">{x.hint} · {Math.round((x.steps.reduce((s, y) => s + y.s, 0) * x.rounds) / 60 * 10) / 10} min</span></span>
          <ChevronRight size={17} className="muted" />
        </Glass>
      ))}
    </div>
  );
}
function BreathPlayer({ b, onClose }: { b: Breath; onClose: () => void }) {
  const [k, setK] = useState(0);
  const total = b.steps.length * b.rounds;
  const step = b.steps[k % b.steps.length];
  const done = k >= total;
  useEffect(() => {
    if (done) { playSound('calm'); return; }
    vibe('tick');
    const t = window.setTimeout(() => setK((x) => x + 1), step.s * 1000);
    return () => window.clearTimeout(t);
  }, [k, done, step.s]);
  const scale = step.label.startsWith('Inspire') ? (step.label === 'Inspire mais' ? 1.15 : 1) : step.label === 'Expire' ? 0.55 : undefined;
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      {done ? <Big emoji="🌿" title="Muito bem" hint="Perceba como está o seu corpo agora." /> : (
        <>
          <div className="relative grid h-64 w-64 place-items-center">
            <motion.div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${EMERALD}55, ${EMERALD}11 70%)` }} animate={scale !== undefined ? { scale } : {}} transition={{ duration: step.s, ease: 'easeInOut' }} />
            <div className="relative text-center"><p className="text-[26px] font-bold">{step.label}</p><p className="text-[14px] muted">{step.s}s</p></div>
          </div>
          <p className="mt-6 text-[13px] muted">Ciclo {Math.floor(k / b.steps.length) + 1} de {b.rounds}</p>
        </>
      )}
      <Button className="mt-8" onClick={onClose}>{done ? 'Fechar' : 'Parar'}</Button>
    </div>
  );
}

/* ───────── Jogos da mente ───────── */
export function MindGamesTool() {
  const [g, setG] = useSubNav<'menu' | 'detective' | 'reframe' | 'bubbles' | 'focus'>('menu');
  const games = [
    { id: 'detective', emoji: '🕵️', t: 'Detetive de pensamentos', h: 'Identifique a armadilha mental' },
    { id: 'reframe', emoji: '🔄', t: 'Reenquadrar', h: 'Escolha o pensamento mais justo' },
    { id: 'bubbles', emoji: '🫧', t: 'Bolhas da calma', h: '60 segundos para desacelerar' },
    { id: 'focus', emoji: '🎯', t: 'Treino de atenção', h: 'Ache o diferente, cada vez mais rápido' },
  ] as const;
  if (g !== 'menu')
    return (
      <div>
        <button onClick={() => setG('menu')} className="mb-4 text-[14px] muted">← Jogos</button>
        {g === 'detective' && <Detective />}
        {g === 'reframe' && <Reframe />}
        {g === 'bubbles' && <Bubbles />}
        {g === 'focus' && <FocusGame />}
      </div>
    );
  return (
    <div className="grid grid-cols-2 gap-3">
      {games.map((x) => (
        <Glass key={x.id} className="p-4" onClick={() => setG(x.id)}>
          <span className="text-[30px]">{x.emoji}</span>
          <p className="mt-2 text-[15px] font-semibold leading-tight">{x.t}</p>
          <p className="mt-0.5 text-[12px] leading-snug muted">{x.h}</p>
        </Glass>
      ))}
    </div>
  );
}
function QuizShell({ total, render }: { total: number; render: (i: number, answer: (ok: boolean) => void) => JSX.Element }) {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  if (i >= total) return <div className="text-center"><Big emoji={score >= total * 0.7 ? '🏆' : '🌱'} title={`${score} de ${total}`} hint={score >= total * 0.7 ? 'Mandou muito bem!' : 'Treinar o olhar já é metade do caminho.'} /><Button variant="primary" onClick={() => { setI(0); setScore(0); }}>Jogar de novo</Button></div>;
  return (
    <div>
      <div className="mb-3 flex justify-between text-[13px] muted"><span>{i + 1}/{total}</span><span>⭐ {score}</span></div>
      <Fade k={i}>{render(i, (ok) => { if (ok) { setScore((s) => s + 1); playSound('done'); } else vibe('tick'); window.setTimeout(() => setI((x) => x + 1), 1100); })}</Fade>
    </div>
  );
}
function Detective() {
  const deck = useMemo(() => shuffle(DETECTIVE).slice(0, 8).map((d) => ({ ...d, opts: shuffle([d.a, ...shuffle(DISTORTIONS.filter((x) => x.id !== d.a)).slice(0, 3).map((x) => x.id)]) })), []);
  return <QuizShell total={deck.length} render={(i, answer) => <Choice q={`"${deck[i].s}"`} opts={deck[i].opts.map((o) => { const d = DISTORTIONS.find((x) => x.id === o)!; return `${d.emoji} ${d.name}`; })} right={deck[i].opts.indexOf(deck[i].a)} onAnswer={answer} />} />;
}
function Reframe() {
  const deck = useMemo(() => shuffle(REFRAME), []);
  return <QuizShell total={deck.length} render={(i, answer) => <Choice q={`"${deck[i].s}"`} opts={deck[i].opts} right={deck[i].a} onAnswer={answer} />} />;
}
export function Choice({ q, opts, right, onAnswer }: { q: string; opts: string[]; right: number; onAnswer: (ok: boolean) => void }) {
  const [pick, setPick] = useState<number | null>(null);
  return (
    <div>
      <Glass className="p-5"><p className="text-[19px] font-semibold leading-snug">{q}</p></Glass>
      <div className="mt-3 space-y-2">
        {opts.map((o, j) => (
          <motion.button key={o} whileTap={{ scale: 0.97 }} disabled={pick !== null} onClick={() => { setPick(j); onAnswer(j === right); }}
            animate={pick !== null && j === pick && j !== right ? { x: [0, -6, 6, -4, 0] } : {}}
            className={cn('glass w-full p-4 text-left text-[15px] font-medium transition-colors', pick !== null && j === right && '!bg-emerald-500 !text-white', pick === j && j !== right && '!bg-red-500/80 !text-white')}>
            {o}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
function Bubbles() {
  const [bubbles, setBubbles] = useState<{ id: number; x: number; s: number; d: number }[]>([]);
  const [popped, setPopped] = useState(0);
  const [left, setLeft] = useState(60);
  const n = useRef(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = window.setInterval(() => { setBubbles((b) => [...b.slice(-14), { id: n.current++, x: 8 + Math.random() * 78, s: 44 + Math.random() * 46, d: 7 + Math.random() * 5 }]); }, 900);
    const c = window.setInterval(() => setLeft((l) => l - 1), 1000);
    return () => { window.clearInterval(t); window.clearInterval(c); };
  }, [left]);
  if (left <= 0) return <Big emoji="🌊" title={`${popped} bolhas`} hint="Respire fundo mais uma vez antes de voltar." />;
  return (
    <div>
      <p className="mb-2 text-center text-[13px] muted">Estoure devagar, respirando junto · {left}s</p>
      <div className="relative h-[60vh] overflow-hidden rounded-[28px] bg-gradient-to-b from-emerald-500/5 to-emerald-500/20">
        <AnimatePresence>
          {bubbles.map((b) => (
            <motion.button key={b.id} initial={{ y: '62vh', opacity: 0 }} animate={{ y: -120, opacity: 0.9 }} exit={{ scale: 1.6, opacity: 0 }} transition={{ duration: b.d, ease: 'linear' }}
              onClick={() => { setBubbles((x) => x.filter((y) => y.id !== b.id)); setPopped((p) => p + 1); playSound('pop'); vibe('tick'); }}
              className="absolute rounded-full border-2 border-emerald-400/70 bg-emerald-400/25 shadow-inner" style={{ left: `${b.x}%`, width: b.s, height: b.s }} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
function FocusGame() {
  const [lvl, setLvl] = useState(1);
  const [left, setLeft] = useState(45);
  const [best, setBest] = useLocal('my-atlas:focus-best', 0);
  const size = Math.min(7, 2 + Math.ceil(lvl / 2));
  const diff = Math.max(4, 40 - lvl * 3);
  const target = useMemo(() => Math.floor(Math.random() * size * size), [lvl, size]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (left <= 0) { if (lvl - 1 > best) setBest(lvl - 1); return; } const t = window.setTimeout(() => setLeft(left - 1), 1000); return () => window.clearTimeout(t); }, [left]); // eslint-disable-line react-hooks/exhaustive-deps
  if (left <= 0) return <div className="text-center"><Big emoji="🎯" title={`Nível ${lvl - 1}`} hint={`Recorde: ${Math.max(best, lvl - 1)}`} /><Button variant="primary" onClick={() => { setLvl(1); setLeft(45); }}>De novo</Button></div>;
  return (
    <div>
      <div className="mb-3 flex justify-between text-[13px] muted"><span>Nível {lvl}</span><span>{left}s</span></div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {Array.from({ length: size * size }).map((_, i) => (
          <motion.button key={`${lvl}-${i}`} whileTap={{ scale: 0.85 }} onClick={() => { if (i === target) { setLvl(lvl + 1); playSound('pop'); } else { vibe('tick'); setLeft((l) => Math.max(0, l - 2)); } }}
            className="aspect-square rounded-full" style={{ background: `hsl(160 84% ${i === target ? 39 + diff * 0.4 : 39}%)` }} />
        ))}
      </div>
      <p className="mt-3 text-center text-[12px] muted">Toque na bolinha de tom diferente. Errar custa 2 segundos.</p>
    </div>
  );
}

/* ───────── Plano de segurança ───────── */
export function SafetyTool() {
  return <PrivateGate><SafetyInner /></PrivateGate>;
}
function SafetyInner() {
  const { put } = useEntryActions();
  const cur = useEntries('safety')[0];
  const [v, setV] = useState<Record<string, string>>(cur?.data ?? {});
  const [saved, setSaved] = useState(false);
  return (
    <>
      <CrisisCard />
      <p className="mt-5 px-1 text-[13.5px] leading-snug muted">Preencha num dia bom, para usar num dia ruim. Só você vê. Mostre para quem você confia, se quiser.</p>
      <div className="mt-4 space-y-3">
        {SAFETY_PLAN.map((f, i) => (
          <Glass key={f.key} className="p-4">
            <p className="text-[14.5px] font-semibold">{i + 1}. {f.label}</p>
            <textarea rows={2} className="input mt-2" placeholder={f.ph} value={v[f.key] ?? ''} onChange={(e) => { setV({ ...v, [f.key]: e.target.value }); setSaved(false); }} />
          </Glass>
        ))}
      </div>
      <Button variant="primary" className="mt-4 w-full" onClick={() => { put('safety', { title: 'Meu plano', private: true, data: v }, cur); setSaved(true); playSound('done'); }}>{saved ? 'Salvo ✓' : 'Salvar plano'}</Button>
    </>
  );
}

/* ───────── Rotina de cuidado (movido da tela Mente) ───────── */
export function CareTool() {
  return (
    <>
      <Section title="Limites da semana"><LimitsCard /></Section>
      <Section><UnwindRoutine /></Section>
      <Section title="Lembretes de cuidado"><ReminderSettings /></Section>
    </>
  );
}
export { Pills };
