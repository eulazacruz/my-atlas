'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Share2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI } from '@/components/providers/UIProvider';
import { bookOf } from '@/lib/bible';
import { shareStory } from '@/lib/share';
import { firstName } from '@/lib/utils';
import { AtlasGlyph } from './Intro';

/** Retrospectiva do ano (estilo "Wrapped"), em slides. */
export function useYearStats() {
  const { rows, me, partner } = useAtlas();
  return useMemo(() => {
    if (!me || !partner) return null;
    const y = String(new Date().getFullYear());
    const inY = (d?: string | null) => !!d && d.startsWith(y);
    const reads = rows('bible_reads').filter((r) => inY(r.readAt));
    const byBook = new Map<number, number>();
    reads.forEach((r) => byBook.set(r.book, (byBook.get(r.book) ?? 0) + 1));
    const topBook = [...byBook.entries()].sort((a, b) => b[1] - a[1])[0];
    const marks = rows('bible_marks').filter((m) => inY(m.createdAt));
    const e = rows('entries');
    const ent = (k: string) => e.filter((x) => x.kind === k && inY(x.date ?? x.createdAt));
    const focus = ent('focus').reduce((s, x) => s + (x.data?.minutes ?? 0), 0);
    const prDone = ent('priority').filter((x) => x.done).length;
    const workouts = ent('workout').length + rows('habit_logs').filter((h) => inY(h.logDate) && h.workout).length;
    const walks = rows('pet_walks').filter((w) => inY(w.walkedAt)).length;
    const house = rows('household_tasks').filter((h) => inY(h.doneAt)).length;
    const answered = rows('prayers').filter((p) => p.answered && inY(p.answeredAt)).length;
    const prayed = ent('prayed').length;
    const checkins = rows('checkins').filter((c) => inY(c.week)).length;
    const sleep = rows('sleep_logs').filter((s) => inY(s.wokeAt) && s.durationMin);
    const sleepAvg = sleep.length ? sleep.reduce((s, x) => s + (x.durationMin ?? 0), 0) / sleep.length : 0;
    const emotions = ent('emotion').filter((x) => x.createdBy === me.id);
    const topEmotion = emotions.length ? Object.entries(emotions.reduce<Record<string, number>>((a, x) => ((a[x.title] = (a[x.title] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1])[0][0] : null;
    return { y, reads: reads.length, topBook: topBook ? bookOf(topBook[0]).name : null, marks: marks.length, devotionals: ent('devotional').length, focus, prDone, workouts, walks, house, answered, prayed, checkins, sleepAvg, topEmotion, fasts: ent('fast').length, places: ent('place').length };
  }, [rows, me, partner]);
}

export function WrappedScreen() {
  const s = useYearStats();
  const { partner, me } = useAtlas();
  const { back } = useUI();
  const [i, setI] = useState(0);
  if (!s || !partner || !me) return null;
  const pName = firstName(partner.displayName);
  const slides = [
    { bg: ['#052E22', '#030303'], big: s.y, title: `O ano de ${firstName(me.displayName)} e ${pName}`, sub: 'Toque para ver a retrospectiva de vocês' },
    { bg: ['#3B2A06', '#0B0B0C'], big: String(s.reads), title: 'capítulos da Bíblia lidos', sub: s.topBook ? `O livro que vocês mais leram: ${s.topBook}` : 'Que venham muitos mais.' },
    { bg: ['#1E1B4B', '#030303'], big: String(s.devotionals + s.prayed), title: 'devocionais e orações registradas', sub: `${s.answered} orações respondidas 🙌 · ${s.marks} versículos marcados` },
    { bg: ['#064E3B', '#030303'], big: `${Math.round(s.focus / 60)}h`, title: 'de foco no que importa', sub: `${s.prDone} prioridades concluídas` },
    { bg: ['#4C0519', '#030303'], big: String(s.checkins), title: 'check-ins do casal', sub: `${s.fasts} jejuns · ${s.places} lugares favoritos guardados 🤍` },
    { bg: ['#0C4A6E', '#030303'], big: String(s.walks), title: 'passeios com o Atlas', sub: `${s.house} tarefas da casa divididas · ${s.workouts} treinos` },
    { bg: ['#1F2937', '#030303'], big: s.sleepAvg ? `${Math.floor(s.sleepAvg / 60)}h${String(Math.round(s.sleepAvg % 60)).padStart(2, '0')}` : '—', title: 'de sono por noite, em média', sub: s.topEmotion ? `A emoção que você mais registrou: ${s.topEmotion.toLowerCase()}` : 'Cuidar de dentro também é cuidar do casamento.' },
    { bg: ['#052E22', '#030303'], big: '🤍', title: 'Obrigado por mais um ano juntos', sub: '“Melhor é serem dois do que um.” — Eclesiastes 4:9' },
  ];
  const sl = slides[i];
  const last = i === slides.length - 1;
  const share = () => shareStory({
    kicker: `Retrospectiva ${s.y}`,
    title: `${firstName(me.displayName)} & ${pName}`,
    body: '',
    stats: [{ v: String(s.reads), l: 'capítulos lidos' }, { v: String(s.answered), l: 'orações respondidas' }, { v: `${Math.round(s.focus / 60)}h`, l: 'de foco' }, { v: String(s.checkins), l: 'check-ins do casal' }, { v: String(s.walks), l: 'passeios com o Atlas' }, { v: String(s.workouts), l: 'treinos' }],
    foot: '“Melhor é serem dois do que um.” Ec 4:9',
    theme: 'emerald',
  });
  return (
    <div className="fixed inset-0 z-[60] text-white" style={{ background: `linear-gradient(160deg, ${sl.bg[0]}, ${sl.bg[1]})`, transition: 'background .5s' }} onClick={() => !last && setI(i + 1)}>
      <div className="absolute inset-x-4 top-[calc(1rem+var(--sat,0px))] flex gap-1">
        {slides.map((_, k) => <span key={k} className="h-1 flex-1 rounded-full" style={{ background: k <= i ? '#fff' : 'rgba(255,255,255,.2)' }} />)}
      </div>
      <button onClick={(e) => { e.stopPropagation(); back(); }} className="absolute right-4 top-[calc(2rem+var(--sat,0px))] grid h-10 w-10 place-items-center rounded-full bg-white/10" aria-label="Fechar"><X size={18} /></button>
      <AnimatePresence mode="wait">
        <motion.div key={i} className="flex h-full flex-col justify-center px-8" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.35 }}>
          {i === 0 && <AtlasGlyph size={90} />}
          <motion.p initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 14 }} className="mt-6 text-[96px] font-black leading-none tracking-tight">{sl.big}</motion.p>
          <p className="mt-4 text-[28px] font-bold leading-tight">{sl.title}</p>
          <p className="mt-3 text-[16px] leading-relaxed text-white/65">{sl.sub}</p>
          {last && (
            <div className="mt-10 flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); share(); }} className="flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-bold text-black"><Share2 size={17} /> Compartilhar nos stories</button>
              <button onClick={(e) => { e.stopPropagation(); setI(0); }} className="h-12 rounded-full bg-white/10 px-5 text-[14px] font-semibold">Ver de novo</button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      {!last && <p className="absolute inset-x-0 bottom-[max(2rem,env(safe-area-inset-bottom))] text-center text-[12px] text-white/40">toque para continuar</p>}
    </div>
  );
}
