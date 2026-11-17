'use client';
/* Espiritualidade v6. */
import { motion } from 'framer-motion';
import { BookOpen, Pause, Play } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { openBibleAt } from '@/components/screens/BibleScreen';
import { ChurchMode, QuestionOfDay } from '@/components/hubs/FaithHub';
import { CollectionList, useEntries, useEntryActions } from '@/components/ui/Collection';
import { Button, Chip, Glass, Section, Switch } from '@/components/ui/primitives';
import { BOOKS, bookOf, loadBook } from '@/lib/bible';
import { ACTS, EXAMEN, FRUITS, GIFT_ITEMS, GIFTS, LECTIO, LECTIO_TEXTS, PSALM_FOR } from '@/lib/data/faith';
import { celebrate, playSound } from '@/lib/fx';
import { cancelNotif, notifyAt } from '@/lib/native';
import { setTtsRate, speak, stopSpeak } from '@/lib/tts';
import { addDays, cn, firstName, fmtDay, parseYmd, ymd } from '@/lib/utils';
import { Big, Countdown, Dots, EMERALD, Fade, Stepper, useLocal } from './kit';

type Ref = { b: number; c: number; v?: [number, number] };
export const refName = (r: Ref) => `${bookOf(r.b)?.name} ${r.c}${r.v ? `:${r.v[0]}${r.v[1] !== r.v[0] ? `-${r.v[1]}` : ''}` : ''}`;
const clean = (t: string) => t.replace(/[[\]]/g, '');

export function usePassage(r: Ref | null) {
  const [verses, setVerses] = useState<{ n: number; t: string }[] | null>(null);
  useEffect(() => {
    if (!r) return;
    let on = true;
    setVerses(null);
    loadBook(r.b).then((bk) => {
      if (!on) return;
      const ch = bk[r.c - 1] ?? [];
      const [a, z] = r.v ?? [1, ch.length];
      setVerses(ch.slice(a - 1, z).map((t, i) => ({ n: a + i, t: clean(t) })));
    });
    return () => { on = false; };
  }, [r?.b, r?.c, r?.v?.[0], r?.v?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  return verses;
}

export function Passage({ r, max, current }: { r: Ref; max?: number; current?: number }) {
  const vs = usePassage(r);
  if (!vs) return <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-4 animate-pulse rounded bg-black/5 dark:bg-white/5" />)}</div>;
  const list = max ? vs.slice(0, max) : vs;
  return (
    <div className="font-serif text-[17px] leading-[1.65]">
      {list.map((v, i) => (
        <span key={v.n} id={`pv-${v.n}`} className={cn('transition-colors', current === i && 'rounded bg-emerald-500/20')}><sup className="mr-0.5 font-sans text-[10px] muted">{v.n}</sup>{v.t} </span>
      ))}
      {max && vs.length > max && <span className="muted">…</span>}
    </div>
  );
}

/* ───── Palavra para o momento ───── */
export function PsalmTool() {
  const [k, setK] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const p = k ? PSALM_FOR[k] : null;
  const r = p ? p.refs[i % p.refs.length] : null;
  return (
    <>
      <p className="mb-3 px-1 text-[15px] font-semibold">Como você está agora?</p>
      <div className="grid grid-cols-5 gap-2">
        {Object.entries(PSALM_FOR).map(([id, x]) => (
          <motion.button key={id} whileTap={{ scale: 0.9 }} onClick={() => { setK(id); setI(Math.floor(Math.random() * x.refs.length)); playSound('pop'); }} className={cn('flex flex-col items-center gap-1 rounded-2xl py-2.5', k === id ? 'bg-black text-white dark:bg-white dark:text-black' : 'glass-thin')}>
            <span className="text-[22px]">{x.emoji}</span><span className="text-[10.5px] font-medium leading-tight">{x.label}</span>
          </motion.button>
        ))}
      </div>
      {r && (
        <Fade k={`${k}-${i}`}>
          <Glass className="mt-5 p-5">
            <p className="label">{refName(r)}</p>
            <div className="mt-2"><Passage r={r} max={14} /></div>
            <div className="mt-4 flex gap-2">
              <Button className="flex-1" onClick={() => setI(i + 1)}>Outro texto</Button>
              <Button variant="primary" className="flex-1" onClick={() => openBibleAt({ book: r.b, chapter: r.c, verse: r.v?.[0] })}><BookOpen size={15} /> Abrir</Button>
            </div>
          </Glass>
        </Fade>
      )}
    </>
  );
}

/* ───── Lectio Divina ───── */
export function LectioTool() {
  const { put } = useEntryActions();
  const hist = useEntries('lectio');
  const r = LECTIO_TEXTS[(hist.length + new Date().getDate()) % LECTIO_TEXTS.length];
  const [v, setV] = useState<Record<string, string>>({});
  const [go, setGo] = useState(false);
  if (!go)
    return (
      <>
        <Glass className="p-5">
          <p className="label">Texto de hoje · {refName(r)}</p>
          <div className="mt-2 max-h-72 overflow-y-auto"><Passage r={r} /></div>
        </Glass>
        <p className="mt-4 px-1 text-[13.5px] leading-snug muted">Uma prática antiga de leitura orante, em 4 movimentos. Leve uns 10 minutos, sem pressa.</p>
        <Button variant="primary" className="mt-4 w-full" onClick={() => setGo(true)}>Começar</Button>
        {hist.length > 0 && <p className="mt-4 text-center text-[12.5px] muted">{hist.length} Lectio feitas</p>}
      </>
    );
  return (
    <Stepper
      steps={LECTIO.map((s) => ({
        title: s.title,
        body: (
          <>
            <p className="text-[15px] leading-relaxed">{s.hint}</p>
            {s.key === 'word' && <div className="mt-3 max-h-48 overflow-y-auto rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]"><Passage r={r} /></div>}
            {s.timer ? <div className="mt-4"><Countdown seconds={s.timer} onEnd={() => playSound('calm')} /></div> : <textarea rows={3} className="input mt-3" value={v[s.key] ?? ''} onChange={(e) => setV({ ...v, [s.key]: e.target.value })} />}
          </>
        ),
      }))}
      onDone={() => { put('lectio', { title: refName(r), date: ymd(), body: v.word ?? '', data: v }); celebrate('Lectio concluída 🕯️'); setGo(false); setV({}); }}
    />
  );
}

/* ───── ACTS ───── */
export function ActsTool() {
  const { put } = useEntryActions();
  const [v, setV] = useState<Record<string, string>>({});
  const [n, setN] = useState(0);
  return (
    <Stepper
      key={n}
      steps={ACTS.map((s) => ({ title: s.title, body: <><p className="text-[15px] leading-relaxed muted">{s.hint}</p><textarea rows={4} className="input mt-3" placeholder={s.ph} value={v[s.key] ?? ''} onChange={(e) => setV({ ...v, [s.key]: e.target.value })} /><p className="mt-2 text-[12px] muted">Escrever é opcional. Pode orar em voz alta e só avançar.</p></> }))}
      onDone={() => { put('acts', { title: 'Oração', date: ymd(), private: true, data: v }); celebrate('Amém 🙏'); setV({}); setN(n + 1); }}
      doneLabel="Amém"
    />
  );
}

/* ───── Exame do dia ───── */
export function ExamenTool() {
  const { put } = useEntryActions();
  const [v, setV] = useState<Record<string, string>>({});
  const [n, setN] = useState(0);
  const hist = useEntries('examen');
  const streak = useMemo(() => { let s = 0; for (let d = new Date(); hist.some((e) => e.date === ymd(d)); d = addDays(d, -1)) s++; return s; }, [hist]);
  return (
    <>
      {streak > 0 && <p className="mb-3 text-center text-[13px] font-semibold" style={{ color: EMERALD }}>🔥 {streak} noite(s) seguidas</p>}
      <Stepper
        key={n}
        steps={EXAMEN.map((s) => ({ title: s.title, body: <><p className="text-[15px] leading-relaxed">{s.hint}</p>{s.key !== 'presence' && <textarea rows={3} className="input mt-3" value={v[s.key] ?? ''} onChange={(e) => setV({ ...v, [s.key]: e.target.value })} />}</> }))}
        onDone={() => { put('examen', { title: 'Revisão do dia', date: ymd(), private: true, data: v }); celebrate('Boa noite 🌌'); setV({}); setN(n + 1); }}
      />
    </>
  );
}

/* ───── Horários de oração ───── */
const DEF_TIMES = [{ label: 'Manhã', at: '06:30', on: true }, { label: 'Meio-dia', at: '12:00', on: true }, { label: 'Noite', at: '21:30', on: true }];
const PRAYER_MSG = ['Entregue o dia ao Senhor 🌅', 'Uma pausa: respire e agradeça 🙏', 'Antes de dormir, ore pelo seu amor 🌙'];
export function schedulePrayerTimes(times = DEF_TIMES) {
  (async () => {
    for (let k = 0; k < 21; k++) await cancelNotif(905100 + k);
    for (let d = 0; d < 7; d++)
      for (let i = 0; i < times.length; i++) {
        if (!times[i].on) continue;
        const [h, m] = times[i].at.split(':').map(Number);
        const at = addDays(new Date(), d); at.setHours(h, m, 0, 0);
        if (at > new Date()) await notifyAt(905100 + d * 3 + i, `Hora de orar · ${times[i].label}`, PRAYER_MSG[i] ?? 'Pausa para orar', at);
      }
  })();
}
export function PrayerTimesTool() {
  const [on, setOn] = useLocal('my-atlas:prayer-on', false);
  const [times, setTimes] = useLocal('my-atlas:prayer-times', DEF_TIMES);
  useEffect(() => { if (on) schedulePrayerTimes(times); else for (let k = 0; k < 21; k++) cancelNotif(905100 + k); }, [on, times]);
  return (
    <>
      <Glass className="p-5">
        <p className="text-[15px] leading-snug">"Tarde, manhã e ao meio-dia orarei" (Salmo 55:17). Três lembretes discretos por dia para voltar o coração a Deus.</p>
        <div className="mt-4 flex items-center justify-between"><span className="text-[15px] font-semibold">Lembrar nos horários</span><Switch checked={on} onChange={setOn} label="Lembrar nos horários" /></div>
      </Glass>
      <div className="mt-4 space-y-2">
        {times.map((t, i) => (
          <Glass key={t.label} className="flex items-center gap-3 p-4">
            <span className="flex-1 text-[15px] font-semibold">{t.label}</span>
            <input type="time" value={t.at} onChange={(e) => setTimes(times.map((x, j) => (j === i ? { ...x, at: e.target.value } : x)))} className="input !w-28 !py-2" />
            <Switch checked={t.on} onChange={(v) => setTimes(times.map((x, j) => (j === i ? { ...x, on: v } : x)))} label="" />
          </Glass>
        ))}
      </div>
    </>
  );
}

/* ───── Fruto do Espírito ───── */
const monday = (d = new Date()) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return ymd(x); };
export function FruitTool() {
  const { me } = useAtlas();
  const { put } = useEntryActions();
  const all = useEntries('fruit').filter((e) => e.createdBy === me?.id);
  const wk = monday();
  const cur = all.find((e) => e.date === wk);
  const prev = all.filter((e) => (e.date ?? '') < wk).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))[0];
  const [v, setV] = useState<Record<string, number>>(cur?.data?.scores ?? {});
  const done = Object.keys(v).length === FRUITS.length;
  const low = done ? [...FRUITS].sort((a, b) => v[a.key] - v[b.key])[0] : null;
  return (
    <>
      <p className="mb-4 px-1 text-[14px] leading-snug muted">Gálatas 5:22-23. Nesta semana, quanto cada fruto apareceu na sua vida? Seja honesto: isso é entre você e Deus.</p>
      <div className="space-y-2">
        {FRUITS.map((f) => (
          <Glass key={f.key} className="p-3.5">
            <div className="flex items-center gap-2">
              <span className="text-[20px]">{f.emoji}</span>
              <span className="flex-1 text-[15px] font-semibold">{f.name}</span>
              {prev?.data?.scores?.[f.key] && v[f.key] && v[f.key] !== prev.data.scores[f.key] && <span className="text-[11px] font-semibold" style={{ color: v[f.key] > prev.data.scores[f.key] ? EMERALD : '#F59E0B' }}>{v[f.key] > prev.data.scores[f.key] ? '▲' : '▼'}</span>}
            </div>
            <div className="mt-2 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setV({ ...v, [f.key]: n })} className={cn('h-8 flex-1 rounded-full text-[13px] font-semibold', (v[f.key] ?? 0) >= n ? 'text-white' : 'bg-black/[0.05] dark:bg-white/[0.07]')} style={(v[f.key] ?? 0) >= n ? { background: EMERALD } : undefined}>{n}</button>)}
            </div>
          </Glass>
        ))}
      </div>
      {low && <Glass className="mt-4 p-4"><p className="text-[14px]">🌱 Para crescer esta semana: <b>{low.name}</b>. Peça ao Espírito Santo, e escolha uma atitude prática.</p></Glass>}
      <Button variant="primary" className="mt-4 w-full" disabled={!done} onClick={() => { put('fruit', { title: `Semana ${fmtDay(parseYmd(wk))}`, date: wk, private: true, data: { scores: v } }, cur); playSound('done'); }}>{cur ? 'Atualizar semana' : 'Salvar semana'}</Button>
    </>
  );
}

/* ───── Dons espirituais ───── */
export function GiftsTool() {
  const { me, partner } = useAtlas();
  const { put } = useEntryActions();
  const all = useEntries('gifts');
  const mine = all.find((e) => e.createdBy === me?.id);
  const theirs = all.find((e) => e.createdBy !== me?.id);
  const [run, setRun] = useState(false);
  const [ans, setAns] = useState<number[]>([]);
  if (run) {
    const i = ans.length;
    if (i >= GIFT_ITEMS.length) {
      const sc: Record<string, number> = {};
      GIFT_ITEMS.forEach((it, j) => { sc[it.g] = (sc[it.g] ?? 0) + ans[j]; });
      const top = Object.entries(sc).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g);
      put('gifts', { title: 'Meus dons', date: ymd(), data: { top, sc } }, mine);
      celebrate('Seus dons foram revelados 🎁');
      setRun(false); setAns([]);
      return null;
    }
    return (
      <div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10"><motion.div className="h-full" style={{ background: EMERALD }} animate={{ width: `${(i / GIFT_ITEMS.length) * 100}%` }} /></div>
        <p className="text-[12px] muted">{i + 1} de {GIFT_ITEMS.length}</p>
        <Fade k={i}>
          <h3 className="mt-2 text-[21px] font-bold leading-snug tracking-tight">{GIFT_ITEMS[i].s}</h3>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {['Nada a ver', 'Um pouco', 'Bastante', 'Sou eu!'].map((l, n) => <Button key={l} className="h-14" variant={n === 3 ? 'primary' : 'secondary'} onClick={() => setAns([...ans, n])}>{l}</Button>)}
          </div>
        </Fade>
      </div>
    );
  }
  const Card = ({ who, e }: { who: string; e?: typeof mine }) => (
    <Glass className="p-5">
      <p className="label">{who}</p>
      {e ? (
        <div className="mt-3 space-y-3">{(e.data.top as string[]).map((g, i) => <div key={g} className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white" style={{ background: EMERALD, opacity: 1 - i * 0.25 }}>{i + 1}</span><div><p className="text-[15px] font-semibold">{GIFTS[g]?.name}</p><p className="text-[13px] leading-snug muted">{GIFTS[g]?.text} · {GIFTS[g]?.verse}</p></div></div>)}</div>
      ) : <p className="mt-2 text-[14px] muted">Ainda não fez o teste.</p>}
    </Glass>
  );
  return (
    <>
      <Card who="Você" e={mine} />
      <div className="mt-3"><Card who={firstName(partner?.displayName ?? 'Seu amor')} e={theirs} /></div>
      <Button variant="primary" className="mt-4 w-full" onClick={() => setRun(true)}>{mine ? 'Refazer o teste' : 'Fazer o teste (3 min)'}</Button>
      <p className="mt-3 px-1 text-[12.5px] leading-snug muted">Um ponto de partida para conversar com seu pastor sobre onde servir. Dons crescem com o uso!</p>
    </>
  );
}

/* ───── Mapa da Graça ───── */
export function GraceTool() {
  const list = useEntries('grace').filter((e) => e.date).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  return (
    <>
      {list.length > 0 && (
        <div className="relative mb-6 ml-3 border-l-2 pl-5" style={{ borderColor: EMERALD + '55' }}>
          {list.map((e, i) => (
            <motion.div key={e.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative mb-5">
              <span className="absolute -left-[29px] top-1 h-3.5 w-3.5 rounded-full ring-4 ring-white dark:ring-black" style={{ background: EMERALD }} />
              <p className="text-[12px] font-semibold muted">{parseYmd(e.date!).getFullYear()} · {e.data?.type ?? ''}</p>
              <p className="text-[16px] font-semibold leading-snug">{e.title}</p>
              {e.data?.ref && <p className="text-[12.5px] muted">{e.data.ref}</p>}
            </motion.div>
          ))}
        </div>
      )}
      <Section title="Marcos"><CollectionList kind="grace" /></Section>
    </>
  );
}

/* ───── Bíblia narrada ───── */
export function NarratedTool() {
  const [pos, setPos] = useLocal('my-atlas:narrate-pos', { b: 19, c: 23 });
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(-1);
  const [rate, setRate] = useLocal('my-atlas:tts-rate', 1);
  const r = useMemo(() => ({ b: pos.b, c: pos.c }), [pos.b, pos.c]);
  const vs = usePassage(r);
  const book = bookOf(pos.b);
  useEffect(() => () => { stopSpeak(); }, []);
  useEffect(() => { if (cur >= 0) document.getElementById(`pv-${cur + 1}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, [cur]);
  const play = () => {
    if (!vs) return;
    if (playing) { stopSpeak(); setPlaying(false); return; }
    setTtsRate(rate);
    setPlaying(true);
    speak([`${book.name}, capítulo ${pos.c}.`, ...vs.map((v) => v.t)], (i) => setCur(i - 1), () => {
      setPlaying(false); setCur(-1);
      if (pos.c < book.chapters) setPos({ b: pos.b, c: pos.c + 1 });
    });
  };
  const change = (p: { b: number; c: number }) => { stopSpeak(); setPlaying(false); setCur(-1); setPos(p); };
  return (
    <>
      <Glass className="sticky top-[calc(0.5rem+var(--sat,env(safe-area-inset-top)))] z-10 p-4">
        <div className="flex gap-2">
          <select value={pos.b} onChange={(e) => change({ b: Number(e.target.value), c: 1 })} className="input flex-1 !py-2.5">{BOOKS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          <select value={pos.c} onChange={(e) => change({ b: pos.b, c: Number(e.target.value) })} className="input !w-24 !py-2.5">{Array.from({ length: book.chapters }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={play} className="grid h-14 w-14 place-items-center rounded-full text-white" style={{ background: EMERALD }}>{playing ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}</motion.button>
          <div className="flex flex-1 gap-1.5">{[0.85, 1, 1.15, 1.3].map((x) => <Chip key={x} active={rate === x} onClick={() => { setRate(x); setTtsRate(x); }}>{x}×</Chip>)}</div>
        </div>
      </Glass>
      <div className="mt-5 px-1"><Passage r={r} current={cur} /></div>
      <p className="mt-6 text-center text-[11.5px] muted">Voz do próprio celular · funciona offline</p>
    </>
  );
}

/* ───── Dia de culto ───── */
export function ChurchDayTool() {
  return (
    <>
      <Section><ChurchMode /></Section>
      <Section><QuestionOfDay /></Section>
    </>
  );
}
export { Big, Dots };
