'use client';
/* Idiomas: inglês e espanhol no estilo Duolingo, com professor zoeiro e conversas simuladas offline. */
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Heart, Lock, Mic, Settings2, Snail, Volume2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useEntries, useEntryActions } from '@/components/ui/Collection';
import { Button, Chip, Glass, Section } from '@/components/ui/primitives';
import { celebrate, vibe } from '@/lib/fx';
import { AtlasNative, isNative } from '@/lib/native';
import type { Entry } from '@/lib/types';
import { addDays, cn, firstName, ymd } from '@/lib/utils';
import { EMERALD, shuffle, useLocal } from './kit';

/* ───────── Tipos e dados ───────── */
type Lang = 'en' | 'es';
interface Item { id: string; t: string; pt: string; alt: string[]; a: string }
interface ChatLine { t: string; pt: string; ok: string[]; ex: string; a: string; xa: string }
interface Unit { id: string; emoji: string; title: string; desc: string; lessons: string[][]; items: Item[]; chat: { title: string; who: string; emoji: string; lines: ChatLine[] } }
interface Course { lang: Lang; units: Unit[] }
type Mode = 'gentil' | 'zoeiro' | 'semfiltro';
type ProfCat = 'right' | 'wrong' | 'almost' | 'combo' | 'done' | 'perfect' | 'hearts' | 'start';
type Prof = Record<Mode, Record<ProfCat, { t: string; a: string }[]>>;

const LANGS: Record<Lang, { name: string; flag: string; speech: string }> = {
  en: { name: 'Inglês', flag: '🇺🇸', speech: 'en-US' },
  es: { name: 'Espanhol', flag: '🇪🇸', speech: 'es-MX' },
};
const cache: Record<string, unknown> = {};
async function load<T>(name: string): Promise<T> {
  if (!cache[name]) cache[name] = await fetch(`/lang/${name}.json`).then((r) => r.json());
  return cache[name] as T;
}
function useData<T>(name: string) {
  const [d, setD] = useState<T | null>((cache[name] as T) ?? null);
  useEffect(() => { let on = true; load<T>(name).then((x) => on && setD(x)); return () => { on = false; }; }, [name]);
  return d;
}

/* ───────── Áudio ───────── */
let current: HTMLAudioElement | null = null;
export function play(id: string, slow = false) {
  try {
    current?.pause();
    const a = new Audio(`/lang/a/${id}.ogg`);
    a.playbackRate = slow ? 0.72 : 1;
    current = a;
    return a.play().catch(() => {});
  } catch { return Promise.resolve(); }
}

/* ───────── Correção ───────── */
const CONTR: [RegExp, string][] = [[/\bi'm\b/g, 'i am'], [/\byou're\b/g, 'you are'], [/\bit's\b/g, 'it is'], [/\bdon't\b/g, 'do not'], [/\bdidn't\b/g, 'did not'], [/\bi'll\b/g, 'i will'], [/\bi'd\b/g, 'i would'], [/\blet's\b/g, 'let us'], [/\bwhat's\b/g, 'what is'], [/\bwe're\b/g, 'we are'], [/\bthey're\b/g, 'they are'], [/\bhe's\b/g, 'he is'], [/\bshe's\b/g, 'she is'], [/\bcan't\b/g, 'cannot']];
const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
export function norm(s: string, keepAccents = false) {
  let x = s.toLowerCase().replace(/[’`]/g, "'");
  CONTR.forEach(([r, v]) => { x = x.replace(r, v); });
  x = x.replace(/[¿¡?!.,;:"()]/g, ' ').replace(/\s+/g, ' ').trim();
  return keepAccents ? x : strip(x);
}
function lev(a: string, b: string) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
/** 'right' | 'almost' (erro de digitação/acento) | 'wrong' */
export function grade(answer: string, accepted: string[]): 'right' | 'almost' | 'wrong' {
  const a = norm(answer);
  if (!a) return 'wrong';
  let best = 1;
  for (const acc of accepted) {
    const b = norm(acc);
    if (a === b) {
      if (norm(answer, true) !== norm(acc, true)) return 'almost';
      return 'right';
    }
    best = Math.min(best, lev(a, b) / Math.max(b.length, 1));
  }
  return best <= 0.12 ? 'almost' : 'wrong';
}

/* ───────── Progresso (uma entrada por pessoa e idioma) ───────── */
interface Progress { done: string[]; chats: string[]; xp: number; days: Record<string, number>; srs: Record<string, [number, string]>; placed?: boolean }
const EMPTY: Progress = { done: [], chats: [], xp: 0, days: {}, srs: {} };
function useProgress(lang: Lang) {
  const { me, partner } = useAtlas();
  const { put } = useEntryActions();
  const all = useEntries('lang');
  const mineE = all.find((e) => e.createdBy === me?.id && e.data?.lang === lang);
  const theirsE = all.find((e) => e.createdBy === partner?.id && e.data?.lang === lang);
  const p: Progress = { ...EMPTY, ...(mineE?.data ?? {}) };
  const save = useCallback((patch: Partial<Progress>) => {
    put('lang', { title: LANGS[lang].name, data: { lang, ...p, ...patch } }, mineE as Entry | undefined);
  }, [put, lang, p, mineE]); // eslint-disable-line react-hooks/exhaustive-deps
  return { p, theirs: { ...EMPTY, ...(theirsE?.data ?? {}) } as Progress, save };
}
const streakOf = (days: Record<string, number>) => {
  let s = 0;
  let d = new Date();
  if (!days[ymd(d)]) d = addDays(d, -1);
  while (days[ymd(d)]) { s++; d = addDays(d, -1); }
  return s;
};
const weekXp = (days: Record<string, number>) => Array.from({ length: 7 }, (_, i) => days[ymd(addDays(new Date(), -i))] ?? 0).reduce((a, b) => a + b, 0);

/* ───────── Professor ───────── */
function useProfessor() {
  const prof = useData<Prof>('prof');
  const [mode, setMode] = useLocal<Mode>('my-atlas:prof-mode', 'zoeiro');
  const [voice, setVoice] = useLocal('my-atlas:prof-voice', true);
  const last = useRef<Record<string, number>>({});
  const say = useCallback((cat: ProfCat) => {
    const list = prof?.[mode]?.[cat];
    if (!list?.length) return '';
    let i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === last.current[cat]) i = (i + 1) % list.length;
    last.current[cat] = i;
    if (voice) window.setTimeout(() => play(list[i].a), 250);
    return list[i].t;
  }, [prof, mode, voice]);
  return { say, mode, setMode, voice, setVoice };
}

/* ───────── Exercícios ───────── */
type Ex =
  | { k: 'pick'; item: Item; opts: Item[] }        // PT → escolher no idioma
  | { k: 'hear'; item: Item; opts: Item[] }        // ouvir → escolher tradução
  | { k: 'build'; item: Item; tiles: string[] }    // PT → montar com blocos
  | { k: 'type'; item: Item }                      // PT → digitar no idioma
  | { k: 'listen'; item: Item }                    // ouvir → digitar
  | { k: 'speak'; item: Item }                     // ler → falar
  | { k: 'pairs'; items: Item[] };
const words = (s: string) => s.replace(/[¿¡?!.,]/g, '').split(/\s+/).filter(Boolean);
const canSpeak = () => isNative() || (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window));

function makeLesson(items: Item[], pool: Item[]): Ex[] {
  const out: Ex[] = [];
  const others = (it: Item, n: number) => shuffle(pool.filter((x) => x.id !== it.id && x.t !== it.t)).slice(0, n);
  items.forEach((it, i) => {
    const n = words(it.t).length;
    const opts = shuffle([it, ...others(it, 3)]);
    if (n <= 2) {
      out.push(i % 2 ? { k: 'hear', item: it, opts } : { k: 'pick', item: it, opts });
      out.push(i % 2 ? { k: 'type', item: it } : { k: 'listen', item: it });
    } else {
      const extra = shuffle(others(it, 4).flatMap((o) => words(o.t))).filter((w) => !words(it.t).map((x) => x.toLowerCase()).includes(w.toLowerCase())).slice(0, 3);
      out.push({ k: 'build', item: it, tiles: shuffle([...words(it.t), ...extra]) });
      out.push([{ k: 'listen', item: it } as Ex, { k: 'pick', item: it, opts } as Ex, ...(canSpeak() ? [{ k: 'speak', item: it } as Ex] : [])][i % (canSpeak() ? 3 : 2)]);
    }
  });
  const body = shuffle(out).slice(0, 11);
  body.splice(Math.min(5, body.length), 0, { k: 'pairs', items: shuffle(items).slice(0, 5) });
  return body;
}

/* ───────── Tela principal ───────── */
export function LangTool() {
  const [lang, setLang] = useLocal<Lang>('my-atlas:lang', 'en');
  const course = useData<Course>(lang);
  const { p, theirs, save } = useProgress(lang);
  const { partner } = useAtlas();
  const prof = useProfessor();
  const [run, setRun] = useState<{ unit: Unit; li: number | 'review' } | null>(null);
  const [chat, setChat] = useState<Unit | null>(null);
  const [placing, setPlacing] = useState(false);
  const [cfg, setCfg] = useState(false);
  const pathRef = useRef<HTMLDivElement | null>(null);

  const isDone = (u: Unit, li: number) => p.done.includes(`${u.id}:${li}`);
  const unitOpen = (ui: number) => ui === 0 || (course ? course.units[ui - 1].lessons.every((_, li) => isDone(course.units[ui - 1], li)) : false);
  const nextKey = useMemo(() => {
    if (!course) return '';
    for (const u of course.units) for (let li = 0; li < u.lessons.length; li++) if (!p.done.includes(`${u.id}:${li}`)) return `${u.id}:${li}`;
    return '';
  }, [course, p.done]);
  useEffect(() => { const t = window.setTimeout(() => document.getElementById(`node-${nextKey}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 400); return () => window.clearTimeout(t); }, [nextKey]);

  const due = useMemo(() => Object.entries(p.srs).filter(([, [, d]]) => d <= ymd()).map(([id]) => id), [p.srs]);
  const streak = streakOf(p.days);
  const finishLesson = (unit: Unit, li: number | 'review', xp: number, results: Record<string, boolean>) => {
    const srs = { ...p.srs };
    Object.entries(results).forEach(([id, ok]) => {
      const box = Math.max(0, Math.min(5, (srs[id]?.[0] ?? 0) + (ok ? 1 : -2)));
      srs[id] = [box, ymd(addDays(new Date(), [1, 1, 2, 4, 8, 16][box]))];
    });
    const done = li === 'review' ? p.done : Array.from(new Set([...p.done, `${unit.id}:${li}`]));
    save({ done, srs, xp: p.xp + xp, days: { ...p.days, [ymd()]: (p.days[ymd()] ?? 0) + xp } });
  };

  if (!course) return <div className="grid h-[40vh] place-items-center"><span className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent opacity-30" /></div>;

  return (
    <>
      {/* Idioma + status */}
      <div className="mb-4 flex items-center gap-2">
        {(Object.keys(LANGS) as Lang[]).map((l) => <Chip key={l} active={lang === l} onClick={() => setLang(l)}>{LANGS[l].flag} {LANGS[l].name}</Chip>)}
        <button onClick={() => setCfg(true)} className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-black/[0.05] dark:bg-white/[0.08]"><Settings2 size={16} /></button>
      </div>
      <Glass className="grid grid-cols-3 gap-2 p-4 text-center">
        <div><p className="text-[22px] font-bold">🔥 {streak}</p><p className="text-[11.5px] muted">dias seguidos</p></div>
        <div><p className="text-[22px] font-bold">⚡ {p.xp}</p><p className="text-[11.5px] muted">XP total</p></div>
        <div><p className="text-[22px] font-bold">{weekXp(p.days)}<span className="text-[13px] muted"> × {weekXp(theirs.days)}</span></p><p className="text-[11.5px] muted">semana · você × {firstName(partner?.displayName ?? 'par')}</p></div>
      </Glass>

      {!p.placed && p.done.length === 0 && (
        <Glass className="mt-4 p-5">
          <p className="text-[16px] font-semibold">Já sabe um pouco de {LANGS[lang].name.toLowerCase()}?</p>
          <p className="mt-1 text-[13px] muted">Faça um nivelamento rápido e pule o que você já domina.</p>
          <div className="mt-3 flex gap-2">
            <Button className="flex-1" onClick={() => save({ placed: true })}>Começar do zero</Button>
            <Button variant="primary" className="flex-1" onClick={() => setPlacing(true)}>Nivelamento</Button>
          </div>
        </Glass>
      )}

      {due.length >= 5 && (
        <Glass className="mt-4 flex items-center gap-3 p-4" onClick={() => setRun({ unit: course.units[0], li: 'review' })}>
          <span className="text-[28px]">🧠</span>
          <div className="flex-1"><p className="text-[15px] font-semibold">Revisão inteligente</p><p className="text-[12.5px] muted">{due.length} palavras e frases para fortalecer</p></div>
          <span className="rounded-full px-3 py-1.5 text-[12px] font-bold text-white" style={{ background: EMERALD }}>Revisar</span>
        </Glass>
      )}

      {/* Trilha */}
      <div ref={pathRef} className="mt-6 space-y-8">
        {course.units.map((u, ui) => {
          const open = unitOpen(ui);
          const allDone = u.lessons.every((_, li) => isDone(u, li));
          return (
            <div key={u.id}>
              <div className={cn('mb-5 flex items-center gap-3 rounded-[22px] p-4', open ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-black/[0.05] dark:bg-white/[0.06]')}>
                <span className="text-[28px]">{u.emoji}</span>
                <div className="flex-1"><p className="text-[11px] font-semibold uppercase tracking-widest opacity-60">Unidade {ui + 1}</p><p className="text-[17px] font-bold leading-tight">{u.title}</p><p className="text-[12px] opacity-60">{u.desc}</p></div>
                {allDone && <span className="text-[20px]">👑</span>}
              </div>
              <div className="flex flex-col items-center gap-4">
                {u.lessons.map((_, li) => {
                  const key = `${u.id}:${li}`;
                  const done = isDone(u, li);
                  const avail = open && (li === 0 || isDone(u, li - 1));
                  const cur = key === nextKey;
                  const off = [0, 56, 0, -56][li % 4];
                  return (
                    <motion.button id={`node-${key}`} key={key} disabled={!avail} whileTap={{ scale: 0.9, y: 4 }} onClick={() => setRun({ unit: u, li })} style={{ x: off }} className="relative">
                      {cur && <motion.span className="absolute -inset-2 rounded-full" style={{ border: `3px solid ${EMERALD}` }} animate={{ scale: [1, 1.12, 1], opacity: [0.8, 0.3, 0.8] }} transition={{ repeat: Infinity, duration: 1.8 }} />}
                      <span className={cn('grid h-[68px] w-[68px] place-items-center rounded-full text-[24px] shadow-[0_6px_0_rgba(0,0,0,0.18)]', !avail && 'opacity-40')} style={{ background: done ? EMERALD : avail ? '#111' : 'rgba(127,127,127,.25)', color: '#fff' }}>
                        {done ? <Check size={30} strokeWidth={3} /> : avail ? '★' : <Lock size={22} />}
                      </span>
                      {cur && <span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-black px-3 py-1.5 text-[12px] font-bold text-white dark:bg-white dark:text-black">Começar</span>}
                    </motion.button>
                  );
                })}
                <motion.button disabled={!allDone} whileTap={{ scale: 0.95 }} onClick={() => setChat(u)} className={cn('mt-1 flex items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-semibold', allDone ? 'text-white' : 'bg-black/[0.05] opacity-50 dark:bg-white/[0.06]')} style={allDone ? { background: EMERALD } : undefined}>
                  {u.chat.emoji} Conversa: {u.chat.title} {p.chats.includes(u.id) ? '✓' : ''}
                </motion.button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-10 text-center text-[11.5px] muted">Vozes geradas com Piper (código aberto) · funcionam offline</p>

      <AnimatePresence>
        {run && (
          <LessonPlayer
            key={`${run.unit.id}-${run.li}`}
            lang={lang}
            items={run.li === 'review' ? course.units.flatMap((u) => u.items).filter((it) => due.includes(it.id)).slice(0, 8) : run.unit.items.filter((it) => run.unit.lessons[run.li as number].includes(it.id))}
            pool={run.li === 'review' ? course.units.flatMap((u) => u.items) : run.unit.items}
            prof={prof}
            onClose={() => setRun(null)}
            onDone={(xp, res) => { finishLesson(run.unit, run.li, xp, res); }}
          />
        )}
        {chat && <ChatPlayer lang={lang} unit={chat} prof={prof} onClose={() => setChat(null)} onDone={() => { save({ chats: Array.from(new Set([...p.chats, chat.id])), xp: p.xp + 20, days: { ...p.days, [ymd()]: (p.days[ymd()] ?? 0) + 20 } }); }} />}
        {placing && <Placement course={course} onClose={() => setPlacing(false)} onResult={(units) => { const done = course.units.slice(0, units).flatMap((u) => u.lessons.map((_, li) => `${u.id}:${li}`)); save({ placed: true, done: Array.from(new Set([...p.done, ...done])) }); setPlacing(false); if (units) celebrate(`Você pulou ${units} unidade${units > 1 ? 's' : ''}! 🚀`); }} />}
        {cfg && <ProfSettings prof={prof} onClose={() => setCfg(false)} />}
      </AnimatePresence>
    </>
  );
}

function ProfSettings({ prof, onClose }: { prof: ReturnType<typeof useProfessor>; onClose: () => void }) {
  const modes: [Mode, string, string][] = [['gentil', '😇 Gentil', 'Incentiva com carinho'], ['zoeiro', '😜 Zoeiro', 'Tira onda, mas com amor'], ['semfiltro', '🔥 Sem filtro', 'Te chama de burro mesmo']];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[85] flex items-end bg-black/40" onClick={onClose}>
      <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="glass-strong w-full rounded-t-[32px] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
        <p className="text-[18px] font-bold">Seu professor</p>
        <div className="mt-3 space-y-2">
          {modes.map(([m, t, h]) => (
            <button key={m} onClick={() => prof.setMode(m)} className={cn('flex w-full items-center gap-3 rounded-2xl p-3.5 text-left', prof.mode === m ? 'bg-emerald-500/15 ring-2 ring-emerald-500' : 'bg-black/[0.04] dark:bg-white/[0.06]')}>
              <span className="flex-1"><span className="block text-[15px] font-semibold">{t}</span><span className="text-[12.5px] muted">{h}</span></span>
              {prof.mode === m && <Check size={18} style={{ color: EMERALD }} />}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between"><span className="text-[14.5px]">Professor fala em voz alta</span><button onClick={() => prof.setVoice(!prof.voice)} className={cn('h-[30px] w-[50px] rounded-full p-[3px] transition', prof.voice ? 'bg-emerald-500' : 'bg-black/15 dark:bg-white/20')}><span className={cn('block h-6 w-6 rounded-full bg-white transition', prof.voice && 'translate-x-5')} /></button></div>
        <Button className="mt-5 w-full" onClick={onClose}>Pronto</Button>
      </motion.div>
    </motion.div>
  );
}

/* ───────── Player de lição ───────── */
function LessonPlayer({ lang, items, pool, prof, onClose, onDone }: { lang: Lang; items: Item[]; pool: Item[]; prof: ReturnType<typeof useProfessor>; onClose: () => void; onDone: (xp: number, res: Record<string, boolean>) => void }) {
  const [queue, setQueue] = useState<Ex[]>(() => makeLesson(items, pool));
  const total = useRef(queue.length);
  const [i, setI] = useState(0);
  const [hearts, setHearts] = useState(5);
  const [fb, setFb] = useState<{ r: 'right' | 'almost' | 'wrong'; line: string; answer: string } | null>(null);
  const [combo, setCombo] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const res = useRef<Record<string, boolean>>({});
  const [end, setEnd] = useState<null | 'win' | 'lose'>(null);
  const [endLine, setEndLine] = useState('');
  const ex = queue[i];
  useEffect(() => { prof.say('start'); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = (r: 'right' | 'almost' | 'wrong', correct: string, id?: string) => {
    if (id && res.current[id] === undefined) res.current[id] = r !== 'wrong';
    if (r === 'wrong') {
      vibe('tick');
      setMistakes((m) => m + 1);
      setCombo(0);
      const h = hearts - 1;
      setHearts(h);
      setQueue((q) => [...q, ex]); // volta no fim
      setFb({ r, line: prof.say(h <= 0 ? 'hearts' : 'wrong'), answer: correct });
    } else {
      const c = combo + 1;
      setCombo(c);
      setFb({ r, line: prof.say(c > 0 && c % 5 === 0 ? 'combo' : r === 'almost' ? 'almost' : 'right'), answer: correct });
    }
  };
  const next = () => {
    setFb(null);
    if (hearts <= 0) { setEnd('lose'); return; }
    if (i + 1 >= queue.length) {
      const xp = 10 + (mistakes === 0 ? 5 : 0);
      setEndLine(prof.say(mistakes === 0 ? 'perfect' : 'done'));
      onDone(xp, res.current);
      setEnd('win');
      celebrate(mistakes === 0 ? 'Lição perfeita! 💎' : `+${xp} XP`);
      return;
    }
    setI(i + 1);
  };

  return (
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }} className="fixed inset-0 z-[95] flex flex-col bg-[var(--bg)] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+var(--sat,env(safe-area-inset-top)))]">
      <div className="flex items-center gap-3">
        <button onClick={onClose} aria-label="Sair"><X size={24} className="muted" /></button>
        <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/[0.1]"><motion.div className="h-full rounded-full" style={{ background: EMERALD }} animate={{ width: `${(Math.min(i + (fb && fb.r !== 'wrong' ? 1 : 0), total.current) / total.current) * 100}%` }} /></div>
        <span className="flex items-center gap-1 text-[15px] font-bold text-red-500"><Heart size={18} className="fill-current" />{hearts}</span>
      </div>
      {combo >= 3 && !end && <p className="mt-2 text-center text-[12px] font-bold" style={{ color: EMERALD }}>🔥 {combo} seguidas</p>}

      <div className="flex-1 overflow-y-auto pt-6">
        {end ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }} className="text-[72px]">{end === 'win' ? (mistakes === 0 ? '💎' : '🏆') : '💔'}</motion.p>
            <p className="mt-2 text-[26px] font-bold">{end === 'win' ? 'Lição concluída!' : 'Acabaram os corações'}</p>
            {end === 'win' && <p className="mt-1 text-[15px] muted">+{10 + (mistakes === 0 ? 5 : 0)} XP · {Math.round((Object.values(res.current).filter(Boolean).length / Math.max(1, Object.keys(res.current).length)) * 100)}% de acerto</p>}
            <p className="mx-auto mt-5 max-w-xs rounded-2xl bg-black/[0.05] p-4 text-[15px] italic dark:bg-white/[0.07]">🧑‍🏫 “{endLine || fb?.line}”</p>
          </div>
        ) : ex && (
          <motion.div key={i} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}>
            <ExerciseView ex={ex} lang={lang} locked={!!fb} onAnswer={answer} />
          </motion.div>
        )}
      </div>

      {end ? (
        <Button variant="primary" className="h-14 w-full text-[16px]" onClick={onClose}>{end === 'win' ? 'Continuar' : 'Tentar de novo depois'}</Button>
      ) : (
        <AnimatePresence>
          {fb && (
            <motion.div initial={{ y: 120 }} animate={{ y: 0 }} exit={{ y: 120 }} className={cn('-mx-5 -mb-[calc(1rem+env(safe-area-inset-bottom))] rounded-t-[28px] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5', fb.r === 'wrong' ? 'bg-red-500/15' : 'bg-emerald-500/15')}>
              <p className={cn('text-[18px] font-bold', fb.r === 'wrong' ? 'text-red-500' : 'text-emerald-500')}>{fb.r === 'wrong' ? '✖ ' : '✔ '}{fb.line}</p>
              {fb.r !== 'right' && <p className="mt-1 text-[14.5px]"><span className="muted">{fb.r === 'almost' ? 'Atenção:' : 'Certo:'}</span> <b>{fb.answer}</b></p>}
              <button onClick={next} className={cn('mt-4 h-14 w-full rounded-2xl text-[16px] font-bold text-white', fb.r === 'wrong' ? 'bg-red-500' : 'bg-emerald-500')}>Continuar</button>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}

function SpeakerBtn({ id, big }: { id: string; big?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => play(id)} className={cn('grid place-items-center rounded-2xl text-white', big ? 'h-20 w-20' : 'h-12 w-12')} style={{ background: EMERALD }}><Volume2 size={big ? 34 : 20} /></motion.button>
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => play(id, true)} className={cn('grid place-items-center rounded-2xl bg-black/[0.06] dark:bg-white/[0.08]', big ? 'h-14 w-14' : 'h-10 w-10')}><Snail size={big ? 22 : 16} /></motion.button>
    </div>
  );
}

function ExerciseView({ ex, lang, locked, onAnswer }: { ex: Ex; lang: Lang; locked: boolean; onAnswer: (r: 'right' | 'almost' | 'wrong', correct: string, id?: string) => void }) {
  const [sel, setSel] = useState<number | null>(null);
  const [built, setBuilt] = useState<number[]>([]);
  const [text, setText] = useState('');
  const accepted = 'item' in ex ? [ex.item.t, ...ex.item.alt] : [];
  useEffect(() => { if (('item' in ex) && (ex.k === 'hear' || ex.k === 'listen')) play(ex.item.a); }, [ex]);

  const check = () => {
    if (!('item' in ex)) return;
    if (ex.k === 'pick' || ex.k === 'hear') { if (sel === null) return; const ok = ex.opts[sel].id === ex.item.id; onAnswer(ok ? 'right' : 'wrong', ex.k === 'pick' ? ex.item.t : ex.item.pt, ex.item.id); if (ex.k === 'pick') play(ex.item.a); return; }
    if (ex.k === 'build') { const s = built.map((b) => ex.tiles[b]).join(' '); onAnswer(grade(s, accepted) === 'wrong' ? 'wrong' : 'right', ex.item.t, ex.item.id); play(ex.item.a); return; }
    if (ex.k === 'type' || ex.k === 'listen') { const g = grade(text, accepted); onAnswer(g, ex.item.t, ex.item.id); if (ex.k === 'type') play(ex.item.a); }
  };
  const title = { pick: 'Como se diz?', hear: 'O que significa?', build: 'Monte a frase', type: `Escreva em ${LANGS[lang].name.toLowerCase()}`, listen: 'Escreva o que você ouvir', speak: 'Fale esta frase', pairs: 'Ligue os pares' }[ex.k];

  return (
    <div className="flex min-h-full flex-col">
      <h3 className="text-[22px] font-bold tracking-tight">{title}</h3>
      {(ex.k === 'pick' || ex.k === 'build' || ex.k === 'type') && (
        <div className="mt-4 flex items-start gap-3">
          <span className="text-[38px]">🧑‍🏫</span>
          <div className="rounded-2xl rounded-tl-sm border px-4 py-3 text-[17px] font-medium hairline">{ex.item.pt}</div>
        </div>
      )}
      {(ex.k === 'hear' || ex.k === 'listen') && <div className="mt-6 flex justify-center"><SpeakerBtn id={ex.item.a} big /></div>}
      {ex.k === 'hear' && <p className="mt-3 text-center text-[17px] font-semibold">{ex.item.t}</p>}

      {(ex.k === 'pick' || ex.k === 'hear') && (
        <div className="mt-6 space-y-2.5">
          {ex.opts.map((o, j) => (
            <motion.button key={o.id} whileTap={{ scale: 0.97 }} disabled={locked} onClick={() => { setSel(j); if (ex.k === 'pick') play(o.a); }} className={cn('w-full rounded-2xl border-2 p-4 text-left text-[16px] font-medium shadow-[0_3px_0_rgba(0,0,0,0.08)]', sel === j ? 'border-emerald-500 bg-emerald-500/10' : 'border-black/10 dark:border-white/10')}>
              {ex.k === 'pick' ? o.t : o.pt}
            </motion.button>
          ))}
        </div>
      )}

      {ex.k === 'build' && (
        <>
          <div className="mt-6 flex min-h-[64px] flex-wrap content-start gap-2 border-b-2 border-t-2 py-3 hairline">
            {built.map((b, j) => <motion.button layout key={b} disabled={locked} onClick={() => setBuilt(built.filter((_, k) => k !== j))} className="rounded-xl border-2 border-black/10 px-3 py-2 text-[16px] font-medium shadow-[0_3px_0_rgba(0,0,0,0.1)] dark:border-white/15">{ex.tiles[b]}</motion.button>)}
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {ex.tiles.map((w, j) => (
              <motion.button layout key={j} disabled={locked || built.includes(j)} onClick={() => setBuilt([...built, j])} className={cn('rounded-xl border-2 px-3 py-2 text-[16px] font-medium shadow-[0_3px_0_rgba(0,0,0,0.1)]', built.includes(j) ? 'border-transparent bg-black/[0.06] text-transparent shadow-none dark:bg-white/[0.06]' : 'border-black/10 dark:border-white/15')}>{w}</motion.button>
            ))}
          </div>
        </>
      )}

      {(ex.k === 'type' || ex.k === 'listen') && (
        <textarea autoFocus={ex.k === 'type'} rows={3} value={text} disabled={locked} onChange={(e) => setText(e.target.value)} placeholder={ex.k === 'listen' ? 'Digite o que ouviu…' : 'Digite a tradução…'} autoCapitalize="none" autoCorrect="off" spellCheck={false} className="input mt-6 !text-[17px]" />
      )}

      {ex.k === 'speak' && <Speak item={ex.item} lang={lang} locked={locked} onAnswer={onAnswer} />}
      {ex.k === 'pairs' && <Pairs items={ex.items} onDone={(ok) => onAnswer(ok ? 'right' : 'wrong', 'Treine os pares de novo')} />}

      {ex.k !== 'speak' && ex.k !== 'pairs' && !locked && (
        <button onClick={check} disabled={(ex.k === 'pick' || ex.k === 'hear') ? sel === null : ex.k === 'build' ? built.length === 0 : !text.trim()} className="mt-auto h-14 w-full rounded-2xl bg-emerald-500 text-[16px] font-bold text-white disabled:opacity-30">Verificar</button>
      )}
    </div>
  );
}

async function recognize(lang: Lang): Promise<string[]> {
  if (isNative()) {
    const r = await AtlasNative.listen({ lang: LANGS[lang].speech, prompt: 'Fale a frase' });
    return r.results ?? [];
  }
  return new Promise((resolve) => {
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const C = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!C) return resolve([]);
    const r = new C();
    r.lang = LANGS[lang].speech; r.maxAlternatives = 5;
    r.onresult = (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => resolve(Array.from(e.results[0]).map((x) => x.transcript));
    r.onerror = () => resolve([]);
    r.start();
  });
}
interface SpeechRec { lang: string; maxAlternatives: number; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: () => void; start: () => void }

function Speak({ item, lang, locked, onAnswer }: { item: Item; lang: Lang; locked: boolean; onAnswer: (r: 'right' | 'almost' | 'wrong', correct: string, id?: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [heard, setHeard] = useState('');
  const go = async () => {
    setBusy(true);
    try {
      const rs = await recognize(lang);
      setHeard(rs[0] ?? '');
      if (!rs.length) { setBusy(false); return; }
      const best = rs.map((r) => grade(r, [item.t, ...item.alt])).sort((a, b) => ['right', 'almost', 'wrong'].indexOf(a) - ['right', 'almost', 'wrong'].indexOf(b))[0];
      onAnswer(best === 'wrong' ? 'wrong' : 'right', item.t, item.id);
    } catch { /* noop */ }
    setBusy(false);
  };
  return (
    <div className="mt-4">
      <div className="flex items-center gap-3"><SpeakerBtn id={item.a} /><p className="text-[19px] font-semibold">{item.t}</p></div>
      <p className="mt-1 text-[13px] muted">{item.pt}</p>
      {heard && <p className="mt-4 text-center text-[14px] muted">Ouvi: “{heard}”</p>}
      {!locked && (
        <>
          <motion.button whileTap={{ scale: 0.95 }} onClick={go} disabled={busy} className="mx-auto mt-8 flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg" style={{ background: EMERALD }}>
            {busy ? <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Mic size={32} />}
          </motion.button>
          <p className="mt-2 text-center text-[12.5px] muted">Toque e fale</p>
          <button onClick={() => onAnswer('right', item.t)} className="mx-auto mt-6 block text-[12.5px] muted underline">Não posso falar agora</button>
        </>
      )}
    </div>
  );
}

function Pairs({ items, onDone }: { items: Item[]; onDone: (ok: boolean) => void }) {
  const left = useMemo(() => shuffle(items), [items]);
  const right = useMemo(() => shuffle(items), [items]);
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [ok, setOk] = useState<string[]>([]);
  const [bad, setBad] = useState<string | null>(null);
  const [miss, setMiss] = useState(0);
  useEffect(() => {
    if (!a || !b) return;
    if (a === b) { const n = [...ok, a]; setOk(n); setA(null); setB(null); vibe('tick'); if (n.length === items.length) window.setTimeout(() => onDone(miss <= 1), 300); }
    else { setBad(a + b); setMiss((m) => m + 1); vibe('tick'); window.setTimeout(() => { setA(null); setB(null); setBad(null); }, 450); }
  }, [a, b]); // eslint-disable-line react-hooks/exhaustive-deps
  const cls = (id: string, sel: boolean) => cn('w-full rounded-2xl border-2 p-3 text-[14.5px] font-medium shadow-[0_3px_0_rgba(0,0,0,0.08)] transition', ok.includes(id) ? 'border-transparent opacity-25 shadow-none' : sel ? (bad ? 'border-red-500 bg-red-500/10' : 'border-emerald-500 bg-emerald-500/10') : 'border-black/10 dark:border-white/10');
  return (
    <div className="mt-6 grid grid-cols-2 gap-2.5">
      <div className="space-y-2.5">{left.map((x) => <button key={x.id} disabled={ok.includes(x.id)} onClick={() => { setA(x.id); play(x.a); }} className={cls(x.id, a === x.id)}>{x.t}</button>)}</div>
      <div className="space-y-2.5">{right.map((x) => <button key={x.id} disabled={ok.includes(x.id)} onClick={() => setB(x.id)} className={cls(x.id, b === x.id)}>{x.pt}</button>)}</div>
    </div>
  );
}

/* ───────── Conversa simulada ───────── */
function ChatPlayer({ lang, unit, prof, onClose, onDone }: { lang: Lang; unit: Unit; prof: ReturnType<typeof useProfessor>; onClose: () => void; onDone: () => void }) {
  const lines = unit.chat.lines;
  const [step, setStep] = useState(0);
  const [log, setLog] = useState<{ me: boolean; t: string; pt?: string; a?: string; note?: string }[]>([]);
  const [text, setText] = useState('');
  const [hint, setHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);
  const [showPt, setShowPt] = useState<number | null>(null);
  useEffect(() => {
    if (step < lines.length) {
      const l = lines[step];
      const t = window.setTimeout(() => { setLog((g) => [...g, { me: false, t: l.t, pt: l.pt, a: l.a }]); play(l.a); }, step ? 700 : 300);
      return () => window.clearTimeout(t);
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' }); }, [log]);

  const send = (msg: string) => {
    const l = lines[step];
    if (!msg.trim() || !l) return;
    const n = norm(msg);
    const ok = l.ok.some((k) => n.includes(norm(k))) || grade(msg, [l.ex]) !== 'wrong';
    setText(''); setHint(false);
    if (ok) {
      setLog((g) => [...g, { me: true, t: msg }]);
      if (step + 1 >= lines.length) { setDone(true); onDone(); prof.say('done'); celebrate('Conversa concluída! +20 XP'); }
      setStep(step + 1);
    } else {
      setLog((g) => [...g, { me: true, t: msg, note: `🧑‍🏫 ${prof.say('wrong')} Tente algo como: “${l.ex}”` }]);
      setHint(true);
    }
  };
  const mic = async () => { setBusy(true); try { const r = await recognize(lang); if (r[0]) send(r[0]); } catch { /* noop */ } setBusy(false); };

  return (
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }} className="fixed inset-0 z-[95] flex flex-col bg-[var(--bg)] pb-[env(safe-area-inset-bottom)] pt-[var(--sat,env(safe-area-inset-top))]">
      <div className="flex items-center gap-3 border-b px-4 py-3 hairline">
        <button onClick={onClose}><X size={22} className="muted" /></button>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-black/[0.06] text-[20px] dark:bg-white/[0.08]">{unit.chat.emoji}</span>
        <div className="flex-1"><p className="text-[15px] font-semibold">{unit.chat.who}</p><p className="text-[12px] muted">{unit.chat.title}</p></div>
        <span className="text-[12px] muted">{Math.min(step, lines.length)}/{lines.length}</span>
      </div>
      <div ref={box} className="flex-1 space-y-2.5 overflow-y-auto p-4">
        {log.map((m, j) => (
          <motion.div key={j} initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={cn('flex', m.me ? 'justify-end' : 'justify-start')}>
            <div className="max-w-[80%]">
              <button onClick={() => { if (m.a) play(m.a); setShowPt(showPt === j ? null : j); }} className={cn('rounded-[20px] px-4 py-2.5 text-left text-[15.5px]', m.me ? 'rounded-br-md text-white' : 'rounded-bl-md bg-black/[0.06] dark:bg-white/[0.08]')} style={m.me ? { background: m.note ? '#ef4444' : EMERALD } : undefined}>
                {m.t} {!m.me && <Volume2 size={13} className="ml-1 inline opacity-50" />}
              </button>
              {showPt === j && m.pt && <p className="mt-1 px-2 text-[12.5px] muted">{m.pt}</p>}
              {m.note && <p className="mt-1.5 rounded-2xl bg-black/[0.04] px-3 py-2 text-[13px] dark:bg-white/[0.06]">{m.note}</p>}
            </div>
          </motion.div>
        ))}
        {done && <p className="py-4 text-center text-[14px] font-semibold" style={{ color: EMERALD }}>Conversa concluída! 🎉</p>}
      </div>
      {!done ? (
        <div className="border-t p-3 hairline">
          {!hint && step < lines.length && <button onClick={() => setHint(true)} className="mb-2 text-[12.5px] muted">💡 Preciso de uma dica</button>}
          {hint && step < lines.length && <button onClick={() => { setText(lines[step].ex); play(lines[step].xa); }} className="mb-2 block text-left text-[13px]">💡 <span className="muted">Sugestão:</span> {lines[step].ex}</button>}
          <div className="flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send(text)} placeholder={`Responda em ${LANGS[lang].name.toLowerCase()}…`} autoCapitalize="none" autoCorrect="off" className="input flex-1" />
            {canSpeak() && <button onClick={mic} disabled={busy} className="grid h-12 w-12 place-items-center rounded-full bg-black/[0.06] dark:bg-white/[0.08]">{busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Mic size={18} />}</button>}
            <button onClick={() => send(text)} className="h-12 rounded-full px-4 text-[14px] font-bold text-white" style={{ background: EMERALD }}>Enviar</button>
          </div>
        </div>
      ) : (
        <div className="p-4"><Button variant="primary" className="h-14 w-full" onClick={onClose}>Continuar</Button></div>
      )}
    </motion.div>
  );
}

/* ───────── Nivelamento ───────── */
function Placement({ course, onClose, onResult }: { course: Course; onClose: () => void; onResult: (units: number) => void }) {
  const qs = useMemo(() => course.units.map((u) => {
    const it = shuffle(u.items.filter((x) => words(x.t).length >= 2))[0] ?? u.items[0];
    const opts = shuffle([it, ...shuffle(course.units.flatMap((x) => x.items).filter((x) => x.id !== it.id)).slice(0, 3)]);
    return { u, it, opts };
  }), [course]);
  const [i, setI] = useState(0);
  const [miss, setMiss] = useState(0);
  const [passed, setPassed] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const q = qs[i];
  const answer = (j: number) => {
    setPick(j);
    const ok = q.opts[j].id === q.it.id;
    window.setTimeout(() => {
      setPick(null);
      const m = ok ? 0 : miss + 1;
      const p = ok ? i + 1 : passed;
      if (ok) setPassed(i + 1);
      setMiss(m);
      if (m >= 2 || i + 1 >= qs.length) { onResult(Math.max(0, (ok ? p : passed) - (m >= 2 ? 1 : 0))); return; }
      setI(i + 1);
    }, 700);
  };
  return (
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed inset-0 z-[95] flex flex-col bg-[var(--bg)] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+var(--sat,env(safe-area-inset-top)))]">
      <div className="flex items-center gap-3"><button onClick={onClose}><X size={24} className="muted" /></button><p className="flex-1 text-center text-[14px] font-semibold">Nivelamento · {i + 1}/{qs.length}</p><span className="w-6" /></div>
      <motion.div key={i} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="mt-8">
        <p className="label">{q.u.emoji} {q.u.title}</p>
        <h3 className="mt-2 text-[22px] font-bold">O que significa?</h3>
        <div className="mt-4 flex items-center gap-3"><SpeakerBtn id={q.it.a} /><p className="text-[19px] font-semibold">{q.it.t}</p></div>
        <div className="mt-6 space-y-2.5">
          {q.opts.map((o, j) => (
            <button key={o.id} disabled={pick !== null} onClick={() => answer(j)} className={cn('w-full rounded-2xl border-2 p-4 text-left text-[16px] font-medium', pick === null ? 'border-black/10 dark:border-white/10' : o.id === q.it.id ? 'border-emerald-500 bg-emerald-500/10' : pick === j ? 'border-red-500 bg-red-500/10' : 'border-black/10 opacity-50 dark:border-white/10')}>{o.pt}</button>
          ))}
        </div>
      </motion.div>
      <p className="mt-auto text-center text-[12px] muted">Errou duas seguidas, o teste para e você começa daí.</p>
    </motion.div>
  );
}

/** Cartão para a tela inicial. */
export function LangHomeCard() {
  const [lang] = useLocal<Lang>('my-atlas:lang', 'en');
  const { p } = useProgress(lang);
  const did = (p.days[ymd()] ?? 0) > 0;
  const s = streakOf(p.days);
  return (
    <Glass className="flex items-center gap-3 p-4" onClick={() => window.dispatchEvent(new CustomEvent('atlas:navigate', { detail: 'tool:idiomas' }))}>
      <span className="text-[30px]">{LANGS[lang].flag}</span>
      <div className="flex-1">
        <p className="text-[15px] font-semibold">{did ? 'Lição de hoje feita ✓' : `Hora da lição de ${LANGS[lang].name.toLowerCase()}`}</p>
        <p className="text-[12.5px] muted">🔥 {s} dia{s === 1 ? '' : 's'} seguidos · ⚡ {p.xp} XP</p>
      </div>
      {!did && <span className="rounded-full px-3 py-1.5 text-[12px] font-bold text-white" style={{ background: EMERALD }}>5 min</span>}
    </Glass>
  );
}
