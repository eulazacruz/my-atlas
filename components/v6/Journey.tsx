'use client';
/* Jornada a Dois: um "coaching" do casal em modos curtos e guiados. */
import { motion } from 'framer-motion';
import { Check, ChevronRight, Lock, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useEntries, useEntryActions } from '@/components/ui/Collection';
import { Button, Chip, Glass, Progress, Section } from '@/components/ui/primitives';
import { celebrate, playSound } from '@/lib/fx';
import { APOLOGY_STEPS, BADGES, FEELINGS, FORGIVE_NOTE, HARD_FIELDS, HELP_NOTE, JOURNEY_RULES, LEVELS, LISTEN_STEPS, MAP_ITEMS, QUESTIONS, TRAILS } from '@/lib/data/journey';
import { cn, daysBetween, firstName, parseYmd, uid, ymd } from '@/lib/utils';
import { Big, Countdown, Dots, EMERALD, Fade, shuffle, Stepper } from './kit';

type Mode = 'home' | 'cards' | 'listen' | 'hard' | 'map' | 'apology' | 'trails';
const MODES: { id: Exclude<Mode, 'home'>; emoji: string; title: string; hint: string }[] = [
  { id: 'cards', emoji: '🃏', title: 'Cartas de perguntas', hint: '3 níveis: leve, fundo e coração' },
  { id: 'listen', emoji: '👂', title: 'Escuta guiada', hint: 'Espelhar, validar e empatizar' },
  { id: 'hard', emoji: '🧱', title: 'Conversa difícil', hint: 'Cada um escreve em segredo, depois revela' },
  { id: 'map', emoji: '🗺️', title: 'Mapa do outro', hint: 'Quanto você conhece o coração dele(a)?' },
  { id: 'apology', emoji: '🤍', title: 'Desculpas e perdão', hint: 'Um roteiro para restaurar' },
  { id: 'trails', emoji: '🏔️', title: 'Trilhas de 7 dias', hint: 'Um passo por dia, juntos' },
];

function useJourneyStats() {
  const sessions = useEntries('journey');
  const trails = useEntries('journey_trail');
  const deep = sessions.reduce((s, e) => s + (e.data?.deep ?? 0), 0);
  const trailDone = trails.some((t) => (t.data?.done ?? []).length >= 7);
  const n = sessions.length;
  const earned = BADGES.filter((b) => (b.id === 'trail' ? trailDone : b.id === 'deep' ? deep >= 5 : n >= b.need));
  const level = Math.floor(n / 3) + 1;
  return { n, earned, level, toNext: 3 - (n % 3) };
}

function useFinish() {
  const { put } = useEntryActions();
  return (mode: string, extra: Record<string, unknown> = {}) => {
    put('journey', { title: MODES.find((m) => m.id === mode)?.title ?? mode, date: ymd(), data: { mode, ...extra } });
    playSound('celebrate');
    celebrate('Sessão concluída 🤍');
  };
}

export function JourneyTool() {
  const [mode, setMode] = useState<Mode>('home');
  const st = useJourneyStats();
  const [rules, setRules] = useState(false);
  if (mode !== 'home')
    return (
      <div>
        <button onClick={() => setMode('home')} className="mb-4 text-[14px] font-medium muted">← Todos os modos</button>
        {mode === 'cards' && <Cards onDone={() => setMode('home')} />}
        {mode === 'listen' && <Listen onDone={() => setMode('home')} />}
        {mode === 'hard' && <Hard />}
        {mode === 'map' && <MapOther />}
        {mode === 'apology' && <Apology onDone={() => setMode('home')} />}
        {mode === 'trails' && <Trails />}
      </div>
    );
  return (
    <>
      <Glass className="overflow-hidden p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="label">Nível do casal</p>
            <p className="text-[34px] font-bold leading-none tracking-tight">{st.level}</p>
          </div>
          <div className="flex -space-x-1">{st.earned.map((b) => <span key={b.id} title={b.title} className="grid h-10 w-10 place-items-center rounded-full bg-black/[0.05] text-[19px] ring-2 ring-white dark:bg-white/[0.08] dark:ring-black">{b.emoji}</span>)}</div>
        </div>
        <Progress className="mt-4" value={((3 - st.toNext) / 3) * 100} color={EMERALD} />
        <p className="mt-2 text-[12.5px] muted">{st.n} sessões · faltam {st.toNext} para o nível {st.level + 1}</p>
      </Glass>

      <Section className="mt-6" title="Escolham um modo">
        <div className="space-y-2">
          {MODES.map((m, i) => (
            <motion.button key={m.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} whileTap={{ scale: 0.98 }} onClick={() => setMode(m.id)} className="glass flex w-full items-center gap-3 p-3.5 text-left">
              <span className="grid h-11 w-11 place-items-center rounded-[15px] bg-black/[0.05] text-[22px] dark:bg-white/[0.07]">{m.emoji}</span>
              <span className="flex-1"><span className="block text-[15px] font-semibold">{m.title}</span><span className="block text-[12.5px] muted">{m.hint}</span></span>
              <ChevronRight size={17} className="muted" />
            </motion.button>
          ))}
        </div>
      </Section>

      <Section title="Combinados">
        <Glass className="p-4" onClick={() => setRules(!rules)}>
          <p className="text-[14px] font-semibold">📜 As 5 regras da sessão {rules ? '' : '· toque para ver'}</p>
          {rules && <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[14px] leading-snug">{JOURNEY_RULES.map((r) => <li key={r}>{r}</li>)}</ol>}
        </Glass>
      </Section>
      <Section title="Conquistas">
        <div className="grid grid-cols-5 gap-2">
          {BADGES.map((b) => {
            const has = st.earned.some((x) => x.id === b.id);
            return (
              <div key={b.id} className={cn('glass-thin flex flex-col items-center gap-1 p-2 text-center !rounded-2xl', !has && 'opacity-35')}>
                <span className="text-[22px]">{has ? b.emoji : '🔒'}</span>
                <span className="text-[10px] font-medium leading-tight">{b.title}</span>
              </div>
            );
          })}
        </div>
      </Section>
      <p className="px-1 text-[12.5px] leading-snug muted">💛 {HELP_NOTE}</p>
    </>
  );
}

/* ───── Cartas ───── */
function Cards({ onDone }: { onDone: () => void }) {
  const { me, partner } = useAtlas();
  const finish = useFinish();
  const [lvl, setLvl] = useState<1 | 2 | 3 | null>(null);
  const deck = useMemo(() => (lvl ? shuffle(QUESTIONS.filter((q) => q.level === lvl)) : []), [lvl]);
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  if (!lvl)
    return (
      <div className="space-y-2">
        <p className="mb-3 px-1 text-[14px] muted">Respondam em voz alta, um de cada vez. Quem lê a carta responde primeiro.</p>
        {LEVELS.map((l) => (
          <Glass key={l.level} className="flex items-center gap-3 p-4" onClick={() => { setLvl(l.level as 1 | 2 | 3); setI(0); setFlip(false); }}>
            <span className="text-[28px]">{l.emoji}</span>
            <span className="flex-1"><span className="block text-[16px] font-semibold">{l.name}</span><span className="text-[12.5px] muted">{l.hint}</span></span>
            <ChevronRight size={17} className="muted" />
          </Glass>
        ))}
      </div>
    );
  const who = i % 2 === 0 ? me : partner;
  const q = deck[i % deck.length];
  return (
    <div>
      <p className="mb-3 text-center text-[13px] muted">Carta {i + 1} · vez de <b>{firstName(who?.displayName ?? 'você')}</b></p>
      <motion.button
        key={i}
        onClick={() => setFlip(true)}
        initial={{ rotateY: 90, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="glass-strong mx-auto grid aspect-[3/4] w-full max-w-sm place-items-center rounded-[32px] p-8 text-center"
        style={{ boxShadow: flip ? `0 20px 60px -20px ${EMERALD}66` : undefined }}
      >
        {flip ? <p className="text-[24px] font-bold leading-snug tracking-tight">{q.q}</p> : <span><span className="block text-[54px]">{LEVELS[lvl - 1].emoji}</span><span className="mt-3 block text-[14px] muted">Toque para virar</span></span>}
      </motion.button>
      <div className="mt-5 flex gap-2">
        <Button className="flex-1" onClick={() => { finish('cards', { count: i + 1, deep: lvl === 3 ? i + 1 : 0 }); onDone(); }}>Encerrar</Button>
        <Button variant="primary" className="flex-1" onClick={() => { setI(i + 1); setFlip(false); playSound('pop'); }}>Próxima carta</Button>
      </div>
    </div>
  );
}

/* ───── Escuta guiada ───── */
function Listen({ onDone }: { onDone: () => void }) {
  const { me, partner } = useAtlas();
  const finish = useFinish();
  const [round, setRound] = useState(0);
  const [i, setI] = useState(0);
  const speaker = round % 2 === 0 ? me : partner;
  const listener = round % 2 === 0 ? partner : me;
  const s = LISTEN_STEPS[i];
  const next = () => {
    if (i < LISTEN_STEPS.length - 1) return setI(i + 1);
    if (round === 0) { setRound(1); setI(0); return; }
    finish('listen'); onDone();
  };
  const role = s.who === 'speaker' ? `${firstName(speaker?.displayName ?? '')} fala` : s.who === 'listener' ? `${firstName(listener?.displayName ?? '')} escuta e responde` : 'Os dois';
  return (
    <div>
      <p className="mb-2 text-center text-[13px] muted">Rodada {round + 1} de 2</p>
      <Dots n={LISTEN_STEPS.length} i={i} />
      <Fade k={`${round}-${i}`}>
        <Glass className="mt-4 p-6 text-center">
          <p className="label">{role}</p>
          <h3 className="mt-1 text-[26px] font-bold tracking-tight">{s.title}</h3>
          <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed">{s.hint}</p>
          {s.seconds > 0 && <div className="mt-5"><Countdown key={`${round}-${i}`} seconds={s.seconds} onEnd={() => playSound('chime')} /></div>}
        </Glass>
      </Fade>
      <Button variant="primary" className="mt-4 w-full" onClick={next}>{i === LISTEN_STEPS.length - 1 && round === 1 ? 'Concluir' : 'Próximo'}</Button>
    </div>
  );
}

/* ───── Conversa difícil ───── */
function Hard() {
  const { me, partner } = useAtlas();
  const { put } = useEntryActions();
  const all = useEntries('journey_hard');
  const open = all.filter((e) => !e.done).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  const round = open[0]?.data?.round as string | undefined;
  const mine = all.find((e) => e.data?.round === round && e.createdBy === me?.id);
  const theirs = all.find((e) => e.data?.round === round && e.createdBy !== me?.id);
  const [v, setV] = useState<Record<string, string>>({});
  const [feel, setFeel] = useState<string[]>([]);
  const submit = () => {
    put('journey_hard', { title: v.fact?.slice(0, 60) || 'Conversa difícil', date: ymd(), data: { round: round && !mine ? round : uid(), ...v, feel: [feel.join(', '), v.feel].filter(Boolean).join('. ') } });
    setV({}); setFeel([]);
  };
  const close = () => { [mine, theirs].forEach((e) => e && put('journey_hard', { done: true }, e)); put('journey', { title: 'Conversa difícil', date: ymd(), data: { mode: 'hard' } }); celebrate('Vocês conversaram de verdade 🤍'); };

  if (mine && theirs)
    return (
      <div>
        <Big emoji="🫱🏼‍🫲🏽" title="Revelado" hint="Leiam em voz alta, um de cada vez. Quem ouve só espelha: 'entendi que…'." />
        {[mine, theirs].map((e) => (
          <Glass key={e.id} className="mb-3 p-4">
            <p className="label">{firstName(e.createdBy === me?.id ? me?.displayName ?? '' : partner?.displayName ?? '')}</p>
            {HARD_FIELDS.map((f) => e.data?.[f.key] && <div key={f.key} className="mt-2"><p className="text-[11.5px] font-semibold uppercase tracking-wide muted">{f.label}</p><p className="text-[15px] leading-snug">{e.data[f.key]}</p></div>)}
          </Glass>
        ))}
        <Button variant="primary" className="w-full" onClick={close}><Check size={16} /> Conversamos</Button>
      </div>
    );
  if (mine)
    return <Big emoji="🔒" title="Sua parte está guardada" hint={`Quando ${firstName(partner?.displayName ?? 'seu par')} escrever a dele(a), as duas aparecem juntas aqui.`} />;
  return (
    <div className="space-y-3">
      <p className="px-1 text-[14px] leading-snug muted">{theirs ? `${firstName(partner?.displayName ?? '')} já escreveu. Escreva a sua parte para revelar as duas.` : 'Cada um escreve sem ver o do outro. Quando os dois terminarem, o app revela.'} <Lock size={12} className="inline" /></p>
      {HARD_FIELDS.map((f) => (
        <Glass key={f.key} className="p-4">
          <p className="text-[15px] font-semibold">{f.label}</p>
          <p className="mb-2 text-[12.5px] muted">{f.hint}</p>
          {f.key === 'feel' && <div className="mb-2 flex flex-wrap gap-1.5">{FEELINGS.map((x) => <Chip key={x} active={feel.includes(x)} onClick={() => setFeel(feel.includes(x) ? feel.filter((y) => y !== x) : [...feel, x])}>{x}</Chip>)}</div>}
          <textarea rows={2} className="input" placeholder={f.ph} value={v[f.key] ?? ''} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
        </Glass>
      ))}
      <Button variant="primary" className="w-full" disabled={!v.fact || !v.ask} onClick={submit}>Guardar em segredo</Button>
    </div>
  );
}

/* ───── Mapa do outro ───── */
function MapOther() {
  const { me, partner } = useAtlas();
  const { put } = useEntryActions();
  const maps = useEntries('journey_map');
  const mine = maps.find((e) => e.createdBy === me?.id);
  const theirs = maps.find((e) => e.createdBy !== me?.id);
  const [tab, setTab] = useState<'me' | 'guess'>(mine ? 'guess' : 'me');
  const [ans, setAns] = useState<Record<string, string>>(mine?.data?.answers ?? {});
  const [guess, setGuess] = useState<Record<string, string>>({});
  const [shown, setShown] = useState(false);
  const score = MAP_ITEMS.filter((m) => guess[m.key] && guess[m.key] === theirs?.data?.answers?.[m.key]).length;
  return (
    <div>
      <div className="mb-4 flex gap-2">
        <Chip active={tab === 'me'} onClick={() => setTab('me')}>Sobre mim</Chip>
        <Chip active={tab === 'guess'} onClick={() => setTab('guess')}>Adivinhar {firstName(partner?.displayName ?? '')}</Chip>
      </div>
      {tab === 'me' && (
        <div className="space-y-3">
          {MAP_ITEMS.map((m) => (
            <Glass key={m.key} className="p-4">
              <p className="mb-2 text-[15px] font-semibold">{m.label}</p>
              <div className="flex flex-wrap gap-1.5">{m.options.map((o) => <Chip key={o} active={ans[m.key] === o} onClick={() => setAns({ ...ans, [m.key]: o })}>{o}</Chip>)}</div>
            </Glass>
          ))}
          <Button variant="primary" className="w-full" disabled={Object.keys(ans).length < MAP_ITEMS.length} onClick={() => { put('journey_map', { title: 'Meu mapa', data: { answers: ans } }, mine); setTab('guess'); }}>Salvar meu mapa</Button>
        </div>
      )}
      {tab === 'guess' && (!theirs ? (
        <Big emoji="⏳" title="Ainda falta o mapa dele(a)" hint={`Peça para ${firstName(partner?.displayName ?? 'seu par')} preencher "Sobre mim".`} />
      ) : (
        <div className="space-y-3">
          {MAP_ITEMS.map((m) => {
            const right = theirs.data.answers?.[m.key];
            return (
              <Glass key={m.key} className="p-4">
                <p className="mb-2 text-[15px] font-semibold">{m.label.replace('eu ', 'ele(a) ').replace('Eu ', 'Ele(a) ').replace('Meu', 'O').replace('me ', '').replace('comigo', 'com ele(a)')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {m.options.map((o) => (
                    <Chip key={o} active={guess[m.key] === o} onClick={() => !shown && setGuess({ ...guess, [m.key]: o })} className={cn(shown && o === right && '!bg-emerald-500 !text-white')}>{o}</Chip>
                  ))}
                </div>
              </Glass>
            );
          })}
          {shown ? (
            <Glass className="p-5 text-center">
              <p className="text-[40px] font-bold">{score}/{MAP_ITEMS.length}</p>
              <p className="text-[14px] muted">{score >= 6 ? 'Vocês se conhecem muito! 🔥' : score >= 4 ? 'Bom! Conversem sobre os erros.' : 'Ótima chance de se conhecerem mais 🤍'}</p>
              <Button className="mt-3" onClick={() => { setGuess({}); setShown(false); }}><RotateCcw size={14} /> De novo</Button>
            </Glass>
          ) : (
            <Button variant="primary" className="w-full" disabled={Object.keys(guess).length < MAP_ITEMS.length} onClick={() => { setShown(true); put('journey', { title: 'Mapa do outro', date: ymd(), data: { mode: 'map', score } }); playSound('celebrate'); }}>Ver resultado</Button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ───── Desculpas ───── */
function Apology({ onDone }: { onDone: () => void }) {
  const finish = useFinish();
  return (
    <>
      <Stepper
        steps={APOLOGY_STEPS.map((s) => ({ title: s.title, body: <p className="text-[16px] leading-relaxed">{s.hint}</p> }))}
        onDone={() => { finish('apology'); onDone(); }}
        doneLabel="Pedimos e liberamos perdão"
      />
      <p className="mt-4 px-1 text-[13px] leading-snug muted">🕊️ {FORGIVE_NOTE}</p>
    </>
  );
}

/* ───── Trilhas ───── */
function Trails() {
  const { put } = useEntryActions();
  const all = useEntries('journey_trail');
  const [sel, setSel] = useState<string | null>(all.find((e) => !e.done)?.data?.trail ?? null);
  const t = TRAILS.find((x) => x.id === sel);
  const e = all.find((x) => x.data?.trail === sel && !x.done);
  if (!t)
    return (
      <div className="space-y-2">
        {TRAILS.map((tr) => {
          const has = all.find((x) => x.data?.trail === tr.id);
          return (
            <Glass key={tr.id} className="flex items-center gap-3 p-4" onClick={() => setSel(tr.id)}>
              <span className="text-[28px]">{tr.emoji}</span>
              <span className="flex-1"><span className="block text-[16px] font-semibold">{tr.title}</span><span className="text-[12.5px] muted">{has ? `${(has.data.done ?? []).length}/7 dias` : tr.hint}</span></span>
              <ChevronRight size={17} className="muted" />
            </Glass>
          );
        })}
      </div>
    );
  const done: number[] = e?.data?.done ?? [];
  const today = e ? Math.min(6, daysBetween(parseYmd(e.data.start), new Date())) : 0;
  const toggle = (d: number) => {
    const nd = done.includes(d) ? done.filter((x) => x !== d) : [...done, d];
    const cur = e ?? put('journey_trail', { title: t.title, data: { trail: t.id, start: ymd(), done: [] } });
    if (!cur) return;
    put('journey_trail', { data: { done: nd } }, cur);
    if (nd.length === 7) { put('journey', { title: `Trilha ${t.title}`, date: ymd(), data: { mode: 'trail' } }); celebrate(`Trilha ${t.title} completa! 🏔️`); }
    else playSound('done');
  };
  return (
    <div>
      <button onClick={() => setSel(null)} className="mb-3 text-[13px] muted">Trocar trilha</button>
      <Big emoji={t.emoji} title={t.title} hint={e ? `Dia ${today + 1} de 7` : 'Comece hoje: marque o dia 1 quando fizerem.'} />
      <div className="space-y-2">
        {t.days.map((d, i) => (
          <Glass key={i} className={cn('flex gap-3 p-4', i > today && !done.includes(i) && e && 'opacity-50')} onClick={() => toggle(i)}>
            <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-bold', done.includes(i) ? 'text-white' : 'bg-black/[0.05] dark:bg-white/[0.08]')} style={done.includes(i) ? { background: EMERALD } : undefined}>{done.includes(i) ? <Check size={15} strokeWidth={3} /> : i + 1}</span>
            <span><span className="block text-[15px] font-semibold">{d.t}</span><span className="block text-[13px] leading-snug muted">{d.d}</span></span>
          </Glass>
        ))}
      </div>
    </div>
  );
}
