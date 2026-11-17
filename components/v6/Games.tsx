'use client';
import { useSubNav } from '@/components/providers/UIProvider';
/* Jogos: Quanto você me conhece?, Quiz bíblico, Memória com fotos e Atlas Run. */
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { Photo, useEntries, useEntryActions } from '@/components/ui/Collection';
import { Button, Chip, Glass, Section } from '@/components/ui/primitives';
import { BIBLE_QUIZ } from '@/lib/data/faith';
import { KNOW_ME } from '@/lib/data/fun';
import { celebrate, playSound, vibe } from '@/lib/fx';
import { cn, firstName, ymd } from '@/lib/utils';
import { Choice } from './MindPlus';
import { Big, EMERALD, Fade, shuffle, useAtlasXp } from './kit';

type G = 'menu' | 'know' | 'quiz' | 'memory' | 'run';
const GAMES = [
  { id: 'know', emoji: '💞', t: 'Quanto você me conhece?', h: 'Acerte as respostas do seu amor' },
  { id: 'quiz', emoji: '📖', t: 'Quiz bíblico', h: 'Ganhe XP para o Atlas' },
  { id: 'memory', emoji: '🧠', t: 'Memória', h: 'Com as fotos de vocês' },
  { id: 'run', emoji: '🐕', t: 'Atlas Run', h: 'Corra, pule e pegue ossinhos' },
] as const;

function useScores(game: string) {
  const { me, partner } = useAtlas();
  const all = useEntries('game').filter((e) => e.data?.game === game);
  const best = (id?: string) => Math.max(0, ...all.filter((e) => e.createdBy === id).map((e) => e.data.score ?? 0));
  return { mine: best(me?.id), theirs: best(partner?.id) };
}
function Scoreboard({ game, label = 'Recorde' }: { game: string; label?: string }) {
  const { partner } = useAtlas();
  const s = useScores(game);
  return <p className="text-center text-[12.5px] muted">{label}: você {s.mine} · {firstName(partner?.displayName ?? 'par')} {s.theirs}</p>;
}

export function GamesTool() {
  const [g, setG] = useSubNav<G>('menu');
  if (g !== 'menu')
    return (
      <div>
        <button onClick={() => setG('menu')} className="mb-4 text-[14px] muted">← Jogos</button>
        {g === 'know' && <KnowMe />}
        {g === 'quiz' && <BibleQuiz />}
        {g === 'memory' && <Memory />}
        {g === 'run' && <AtlasRun />}
      </div>
    );
  return (
    <div className="grid grid-cols-2 gap-3">
      {GAMES.map((x, i) => (
        <motion.button key={x.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} whileTap={{ scale: 0.95 }} onClick={() => setG(x.id)} className="glass p-4 text-left">
          <span className="text-[34px]">{x.emoji}</span>
          <span className="block"><span className="mt-1 block text-[15px] font-semibold leading-tight">{x.t}</span><span className="block text-[12px] muted">{x.h}</span></span>
        </motion.button>
      ))}
    </div>
  );
}

function save(put: ReturnType<typeof useEntryActions>['put'], game: string, score: number) {
  put('game', { title: game, date: ymd(), data: { game, score } });
}

/* ───── Quanto você me conhece ───── */
function KnowMe() {
  const { me, partner } = useAtlas();
  const { put } = useEntryActions();
  const all = useEntries('knowme');
  const mine = all.find((e) => e.createdBy === me?.id);
  const theirs = all.find((e) => e.createdBy !== me?.id);
  const [mode, setMode] = useState<'me' | 'play'>(mine ? 'play' : 'me');
  const [ans, setAns] = useState<Record<number, string>>(mine?.data?.answers ?? {});
  const deck = useMemo(() => shuffle(KNOW_ME.map((q, i) => ({ ...q, i }))).slice(0, 8), []);
  const [k, setK] = useState(0);
  const [score, setScore] = useState(0);
  if (mode === 'me')
    return (
      <div className="space-y-3">
        <p className="px-1 text-[14px] muted">Responda sobre você. Depois, {firstName(partner?.displayName ?? 'seu amor')} tenta adivinhar.</p>
        {KNOW_ME.map((q, i) => (
          <Glass key={i} className="p-4"><p className="mb-2 text-[15px] font-semibold">{q.q}</p><div className="flex flex-wrap gap-1.5">{q.o.map((o) => <Chip key={o} active={ans[i] === o} onClick={() => setAns({ ...ans, [i]: o })}>{o}</Chip>)}</div></Glass>
        ))}
        <Button variant="primary" className="w-full" disabled={Object.keys(ans).length < KNOW_ME.length} onClick={() => { put('knowme', { title: 'Sobre mim', data: { answers: ans } }, mine); setMode('play'); }}>Salvar</Button>
      </div>
    );
  if (!theirs) return <><Big emoji="⏳" title="Falta a parte dele(a)" hint={`${firstName(partner?.displayName ?? 'Seu amor')} precisa responder "Sobre mim" primeiro.`} /><Button className="w-full" onClick={() => setMode('me')}>Editar minhas respostas</Button></>;
  if (k >= deck.length)
    return (
      <div className="text-center">
        <Big emoji={score >= 6 ? '🏆' : score >= 4 ? '💞' : '🌱'} title={`${score} de ${deck.length}`} hint={score >= 6 ? 'Vocês são almas gêmeas!' : 'Hora de conversar sobre os erros 😄'} />
        <Scoreboard game="know" />
        <Button variant="primary" className="mt-4" onClick={() => { setK(0); setScore(0); }}><RotateCcw size={14} /> De novo</Button>
      </div>
    );
  const q = deck[k];
  const right = q.o.indexOf(theirs.data.answers?.[q.i]);
  return (
    <div>
      <p className="mb-3 text-center text-[13px] muted">{k + 1}/{deck.length} · ⭐ {score}</p>
      <Fade k={k}><Choice q={q.q.replace('Minha', `A ${firstName(partner?.displayName ?? '')} acha que a`).replace(/^Meu /, 'O ').replace(/^Eu /, 'Ele(a) ')} opts={q.o} right={right} onAnswer={(ok) => { if (ok) { setScore((s) => s + 1); playSound('done'); } else vibe('tick'); setTimeout(() => { setK((x) => x + 1); if (k === deck.length - 1) save(put, 'know', score + (ok ? 1 : 0)); }, 1100); }} /></Fade>
    </div>
  );
}

/* ───── Quiz bíblico ───── */
function BibleQuiz() {
  const { put } = useEntryActions();
  const xp = useAtlasXp();
  const [round, setRound] = useState(0);
  const deck = useMemo(() => shuffle(BIBLE_QUIZ).slice(0, 10).map((q) => { const o = shuffle(q.o.map((t, i) => ({ t, ok: i === q.a }))); return { ...q, opts: o.map((x) => x.t), right: o.findIndex((x) => x.ok) }; }), [round]); // eslint-disable-line react-hooks/exhaustive-deps
  const [k, setK] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  if (k >= deck.length)
    return (
      <div className="text-center">
        <Big emoji={score >= 8 ? '👑' : score >= 5 ? '📖' : '🌱'} title={`${score} de ${deck.length}`} hint={`+${score * 5} XP para o Atlas 🐾`} />
        <Scoreboard game="quiz" />
        <Button variant="primary" className="mt-4" onClick={() => { setRound(round + 1); setK(0); setScore(0); setStreak(0); }}><RotateCcw size={14} /> Jogar de novo</Button>
      </div>
    );
  const q = deck[k];
  return (
    <div>
      <div className="mb-3 flex justify-between text-[13px] muted"><span>{k + 1}/{deck.length}</span>{streak >= 3 && <span style={{ color: EMERALD }}>🔥 {streak} seguidas</span>}<span>⭐ {score}</span></div>
      <Fade k={k}>
        <Choice q={q.q} opts={q.opts} right={q.right} onAnswer={(ok) => {
          if (ok) { setScore((s) => s + 1); setStreak((s) => s + 1); playSound('done'); } else { setStreak(0); vibe('tick'); }
          setTimeout(() => {
            if (k === deck.length - 1) { const f = score + (ok ? 1 : 0); save(put, 'quiz', f); xp(f * 5); if (f >= 8) celebrate('Mestre da Palavra 👑'); }
            setK((x) => x + 1);
          }, 1200);
        }} />
        {q.ref && <p className="mt-3 text-center text-[12px] muted">📖 {q.ref}</p>}
      </Fade>
    </div>
  );
}

/* ───── Memória ───── */
function Memory() {
  const { rows } = useAtlas();
  const { put } = useEntryActions();
  const photos = useMemo(() => {
    const p = rows('entries').filter((e) => ['mural', 'instant', 'place', 'recipe', 'memory'].includes(e.kind)).map((e) => e.data?.path ?? e.data?.photo).filter(Boolean) as string[];
    return Array.from(new Set(p));
  }, [rows]);
  const EMOJI = ['🐕', '💍', '🏠', '🙏', '🌊', '🍕', '🎵', '✈️'];
  const [seed, setSeed] = useState(0);
  const cards = useMemo(() => {
    const src = shuffle(photos).slice(0, 6);
    const faces = [...src.map((p) => ({ p })), ...EMOJI.slice(0, 6 - src.length).map((e) => ({ e }))];
    return shuffle([...faces, ...faces].map((f, i) => ({ ...f, k: JSON.stringify(f), i })));
  }, [photos, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [open, setOpen] = useState<number[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [t0, setT0] = useState(Date.now());
  const flip = (i: number) => {
    if (open.length === 2 || open.includes(i) || done.includes(cards[i].k)) return;
    const o = [...open, i];
    setOpen(o);
    vibe('tick');
    if (o.length === 2) {
      setMoves((m) => m + 1);
      if (cards[o[0]].k === cards[o[1]].k) {
        const d = [...done, cards[i].k];
        setTimeout(() => { setDone(d); setOpen([]); playSound('pop'); if (d.length === 6) { const s = Math.max(10, 200 - moves * 8 - Math.round((Date.now() - t0) / 1000)); save(put, 'memory', s); celebrate(`Memória completa em ${moves + 1} jogadas 🧠`); } }, 450);
      } else setTimeout(() => setOpen([]), 850);
    }
  };
  const won = done.length === 6;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-[13px] muted"><span>{moves} jogadas</span><button onClick={() => { setSeed(seed + 1); setOpen([]); setDone([]); setMoves(0); setT0(Date.now()); }} className="flex items-center gap-1"><RotateCcw size={13} /> Reiniciar</button></div>
      <div className="grid grid-cols-3 gap-2.5">
        {cards.map((c, i) => {
          const up = open.includes(i) || done.includes(c.k);
          return (
            <motion.button key={`${seed}-${i}`} onClick={() => flip(i)} animate={{ rotateY: up ? 0 : 180 }} transition={{ duration: 0.35 }} className={cn('relative aspect-square overflow-hidden rounded-[20px]', done.includes(c.k) && 'ring-2 ring-emerald-500')} style={{ transformStyle: 'preserve-3d' }}>
              {up ? ('p' in c && c.p ? <Photo path={c.p} className="h-full w-full" /> : <span className="grid h-full w-full place-items-center bg-black/[0.04] text-[40px] dark:bg-white/[0.06]">{'e' in c ? c.e : ''}</span>) : <span className="grid h-full w-full place-items-center bg-black text-[24px] text-white dark:bg-white dark:text-black">✦</span>}
            </motion.button>
          );
        })}
      </div>
      {won && <div className="mt-4"><Scoreboard game="memory" label="Melhor pontuação" /></div>}
      {photos.length < 6 && <p className="mt-3 text-center text-[12px] muted">Poste fotos no Mural para o jogo usar as fotos de vocês 📷</p>}
    </div>
  );
}

/* ───── Atlas Run ───── */
function AtlasRun() {
  const { put } = useEntryActions();
  const xp = useAtlasXp();
  const cv = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState<'ready' | 'play' | 'over'>('ready');
  const [score, setScore] = useState(0);
  const game = useRef({ y: 0, vy: 0, jumps: 0, obs: [] as { x: number; w: number; h: number; bone?: boolean }[], speed: 5, dist: 0, bones: 0, t: 0 });
  const jump = useCallback(() => {
    const g = game.current;
    if (state !== 'play') return;
    if (g.jumps < 2) { g.vy = g.jumps ? 10.5 : 13; g.jumps++; vibe('tick'); }
  }, [state]);
  useEffect(() => {
    if (state !== 'play') return;
    const c = cv.current!; const ctx = c.getContext('2d')!;
    const W = (c.width = c.clientWidth * 2); const H = (c.height = c.clientHeight * 2);
    const ground = H - 70;
    const dark = document.documentElement.classList.contains('dark');
    const fg = dark ? '#F5F5F7' : '#0A0A0A';
    const g = game.current;
    Object.assign(g, { y: 0, vy: 0, jumps: 0, obs: [], speed: 9, dist: 0, bones: 0, t: 0 });
    let raf = 0; let alive = true;
    const loop = () => {
      if (!alive) return;
      g.t++;
      g.speed = 9 + g.t / 400;
      g.dist += g.speed / 10;
      g.vy -= 0.62; g.y = Math.max(0, g.y + g.vy); if (g.y === 0) { g.vy = 0; g.jumps = 0; }
      if (g.t % Math.max(38, Math.round(90 - g.t / 60)) === 0) g.obs.push(Math.random() < 0.32 ? { x: W + 20, w: 40, h: 22, bone: true } : { x: W + 20, w: 34 + Math.random() * 24, h: 46 + Math.random() * 40 });
      g.obs.forEach((o) => (o.x -= g.speed * 1.4));
      g.obs = g.obs.filter((o) => o.x > -80);
      const dx = 120, dw = 92, dh = 60, dy = ground - dh - g.y;
      for (const o of g.obs) {
        const oy = o.bone ? ground - 150 : ground - o.h;
        const hit = dx + dw - 14 > o.x && dx + 14 < o.x + o.w && dy + dh > oy + 6 && dy < oy + (o.bone ? o.h : o.h);
        if (hit && o.bone) { g.bones++; o.x = -999; playSound('pop'); }
        else if (hit) { alive = false; const s = Math.round(g.dist) + g.bones * 10; setScore(s); setState('over'); save(put, 'run', s); xp(Math.min(40, Math.round(s / 40))); vibe('sos'); return; }
      }
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = fg; ctx.globalAlpha = 0.12; ctx.fillRect(0, ground, W, 3); ctx.globalAlpha = 1;
      for (let i = 0; i < 6; i++) { ctx.globalAlpha = 0.08; ctx.fillRect(((i * 240 - g.dist * 6) % (W + 240) + W + 240) % (W + 240) - 120, ground + 22, 60, 3); }
      ctx.globalAlpha = 1;
      // Atlas (cachorrinho)
      const leg = g.y > 0 ? 0 : Math.sin(g.t / 3) * 8;
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.roundRect(dx, dy + 12, 70, 34, 16); ctx.fill();
      ctx.beginPath(); ctx.roundRect(dx + 54, dy - 4, 38, 34, 14); ctx.fill();
      ctx.beginPath(); ctx.ellipse(dx + 62, dy - 2, 8, 14, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(dx + 8, dy + 40, 10, 20 + leg); ctx.fillRect(dx + 50, dy + 40, 10, 20 - leg);
      ctx.beginPath(); ctx.moveTo(dx + 2, dy + 20); ctx.quadraticCurveTo(dx - 22, dy + 2 + Math.sin(g.t / 2) * 6, dx - 14, dy - 8); ctx.lineWidth = 7; ctx.strokeStyle = fg; ctx.stroke();
      ctx.fillStyle = EMERALD; ctx.beginPath(); ctx.arc(dx + 80, dy + 8, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(dx + 50, dy + 28, 10, 6);
      // obstáculos
      for (const o of g.obs) {
        if (o.bone) { ctx.fillStyle = EMERALD; const by = ground - 150; ctx.beginPath(); ctx.roundRect(o.x + 6, by + 7, 28, 8, 4); ctx.fill(); [[o.x + 6, by + 5], [o.x + 6, by + 17], [o.x + 34, by + 5], [o.x + 34, by + 17]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); }); }
        else { ctx.fillStyle = fg; ctx.beginPath(); ctx.roundRect(o.x, ground - o.h, o.w, o.h, [10, 10, 2, 2]); ctx.fill(); ctx.fillRect(o.x - 6, ground - o.h * 0.6, o.w + 12, 8); }
      }
      ctx.fillStyle = fg; ctx.font = '600 34px Inter Variable, system-ui'; ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(g.dist)} m   🦴 ${g.bones}`, W - 30, 56);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div>
      <div className="relative overflow-hidden rounded-[28px] bg-black/[0.03] dark:bg-white/[0.04]" onPointerDown={() => (state === 'play' ? jump() : setState('play'))}>
        <canvas ref={cv} className="block h-64 w-full touch-none" />
        {state !== 'play' && (
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-[44px]">{state === 'over' ? '💥' : '🐕'}</p>
              <p className="text-[20px] font-bold">{state === 'over' ? `${score} pontos` : 'Atlas Run'}</p>
              <p className="text-[13px] muted">{state === 'over' ? 'Toque para correr de novo' : 'Toque para pular · toque duas vezes no ar para pulo duplo'}</p>
            </div>
          </div>
        )}
      </div>
      <div className="mt-4"><Scoreboard game="run" /></div>
      <Section className="mt-5"><p className="px-1 text-center text-[12px] muted">Cada corrida dá XP para o Atlas virtual 🐾 · Ossinho = 10 pontos</p></Section>
    </div>
  );
}
