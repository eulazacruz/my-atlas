'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Activity, AlertCircle, ChevronRight, HeartHandshake, LifeBuoy, Moon, Sun, Wind, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI } from '@/components/providers/UIProvider';
import { CollectionList, EntrySheet, useEntries, useEntryActions } from '@/components/ui/Collection';
import { Button, Glass, PageHeader, Section, Switch } from '@/components/ui/primitives';
import { KINDS } from '@/lib/entries';
import { haptic } from '@/lib/native';
import { playSound } from '@/lib/fx';
import { addDays, cn, firstName, fmtDay, parseYmd, ymd } from '@/lib/utils';
import { HubTiles, streakOf } from './FocusHub';

/* ───────── Preferências de lembretes (por aparelho) ───────── */
const REM_KEY = 'my-atlas:reminders';
export type Reminders = { breaks: boolean; sun: boolean; unwind: boolean; unwindAt: string; autoNight: boolean };
const DEF: Reminders = { breaks: true, sun: true, unwind: true, unwindAt: '22:00', autoNight: false };
export function readReminders(): Reminders {
  try { return { ...DEF, ...JSON.parse(localStorage.getItem(REM_KEY) || '{}') }; } catch { return DEF; }
}
export function useReminders() {
  const [r, setR] = useState<Reminders>(DEF);
  useEffect(() => {
    setR(readReminders());
    const on = () => setR(readReminders());
    window.addEventListener('atlas:reminders', on);
    return () => window.removeEventListener('atlas:reminders', on);
  }, []);
  const update = (p: Partial<Reminders>) => {
    const n = { ...readReminders(), ...p };
    try { localStorage.setItem(REM_KEY, JSON.stringify(n)); } catch { /* noop */ }
    setR(n);
    window.dispatchEvent(new Event('atlas:reminders'));
  };
  return { r, update };
}

/* ───────── Botão de ansiedade (SOS) ───────── */
const PEACE = [
  { t: 'Não andeis ansiosos de coisa alguma; em tudo, porém, sejam conhecidas, diante de Deus, as vossas petições, pela oração e pela súplica, com ações de graças.', r: 'Filipenses 4:6' },
  { t: 'Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos aliviarei.', r: 'Mateus 11:28' },
  { t: 'Deixo-vos a paz, a minha paz vos dou; não vo-la dou como o mundo a dá. Não se turbe o vosso coração, nem se atemorize.', r: 'João 14:27' },
  { t: 'Lançando sobre ele toda a vossa ansiedade, porque ele tem cuidado de vós.', r: '1 Pedro 5:7' },
  { t: 'O SENHOR é o meu pastor; nada me faltará.', r: 'Salmos 23:1' },
  { t: 'Não temas, porque eu sou contigo; não te assombres, porque eu sou teu Deus.', r: 'Isaías 41:10' },
];
const GROUND = [
  { n: 5, s: 'coisas que você consegue VER' },
  { n: 4, s: 'coisas que você consegue TOCAR' },
  { n: 3, s: 'sons que você consegue OUVIR' },
  { n: 2, s: 'cheiros que você sente' },
  { n: 1, s: 'gosto na boca, ou uma coisa boa sobre você' },
];
export function SosOverlay() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [g, setG] = useState(0);
  const [phase, setPhase] = useState(0);
  const { partner } = useAtlas();
  const { put } = useEntryActions();
  const { setBreathingOpen } = useUI();
  const [sent, setSent] = useState(false);
  const verse = useMemo(() => PEACE[Math.floor(Math.random() * PEACE.length)], [open]);
  useEffect(() => {
    const on = () => { setOpen(true); setStep(0); setG(0); setSent(false); };
    window.addEventListener('atlas:sos', on);
    return () => window.removeEventListener('atlas:sos', on);
  }, []);
  useEffect(() => {
    if (!open || step !== 0) return;
    const i = window.setInterval(() => setPhase((p) => (p + 1) % 4), 4000);
    return () => window.clearInterval(i);
  }, [open, step]);
  const labels = ['Inspire…', 'Segure…', 'Solte devagar…', 'Segure…'];
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex flex-col bg-[#05070a] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(4rem+var(--sat,0px))] text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button onClick={() => setOpen(false)} className="absolute right-5 top-[calc(1.25rem+var(--sat,0px))] grid h-10 w-10 place-items-center rounded-full bg-white/10" aria-label="Fechar"><X size={18} /></button>
          <div className="mb-6 flex gap-1.5">{[0, 1, 2].map((i) => <span key={i} className={cn('h-1 flex-1 rounded-full', i <= step ? 'bg-white' : 'bg-white/15')} />)}</div>
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            {step === 0 && (
              <>
                <p className="text-[13px] uppercase tracking-[0.2em] text-white/40">Respire comigo</p>
                <motion.div className="my-10 grid h-52 w-52 place-items-center rounded-full bg-emerald-400/15 ring-1 ring-emerald-300/30" animate={{ scale: phase === 0 ? 1.15 : phase === 2 ? 0.8 : phase === 1 ? 1.15 : 0.8 }} transition={{ duration: 4, ease: 'easeInOut' }}>
                  <span className="text-[22px] font-light">{labels[phase]}</span>
                </motion.div>
                <p className="max-w-[280px] text-[14px] text-white/55">Você está seguro(a). Isso vai passar. Respire no ritmo do círculo por alguns ciclos.</p>
              </>
            )}
            {step === 1 && (
              <>
                <p className="text-[13px] uppercase tracking-[0.2em] text-white/40">Volte para o agora</p>
                <p className="mt-6 text-[64px] font-light leading-none">{GROUND[g].n}</p>
                <p className="mt-3 max-w-[280px] text-[20px] leading-snug">{GROUND[g].s}</p>
                <p className="mt-4 text-[13px] text-white/45">Diga em voz baixa ou só pense. Sem pressa.</p>
                <Button className="mt-8 !bg-white/10 !text-white" onClick={() => (g < 4 ? setG(g + 1) : setStep(2))}>{g < 4 ? 'Próximo' : 'Feito'}</Button>
              </>
            )}
            {step === 2 && (
              <>
                <p className="text-[13px] uppercase tracking-[0.2em] text-white/40">Uma palavra para você</p>
                <p className="mt-6 max-w-[320px] font-serif text-[22px] leading-snug">“{verse.t}”</p>
                <p className="mt-3 text-[14px] text-white/50">— {verse.r}</p>
              </>
            )}
          </div>
          <div className="space-y-2">
            {partner && !partner.pending && (
              <Button className={cn('h-12 w-full !text-[15px]', sent ? '!bg-white/10 !text-white' : '!bg-white !text-black')} disabled={sent} onClick={() => { put('sos', { title: 'Momento de ansiedade', date: ymd() }); setSent(true); haptic('medium'); playSound('love'); }}>
                <HeartHandshake size={17} /> {sent ? `${firstName(partner.displayName)} foi avisada 🤍` : `Avisar ${firstName(partner.displayName)}`}
              </Button>
            )}
            <div className="flex gap-2">
              {step > 0 && <Button className="h-12 flex-1 !bg-white/10 !text-white" onClick={() => setStep(step - 1)}>Voltar</Button>}
              {step < 2 ? <Button className="h-12 flex-1 !bg-white/10 !text-white" onClick={() => setStep(step + 1)}>Continuar</Button> : <Button className="h-12 flex-1 !bg-white/10 !text-white" onClick={() => { setOpen(false); setBreathingOpen(false); }}>Estou melhor</Button>}
            </div>
            <p className="pt-1 text-center text-[11px] text-white/35">Se a crise não passar ou houver risco, ligue 188 (CVV) ou 192.</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
export const openSos = () => window.dispatchEvent(new Event('atlas:sos'));

export function SosButton() {
  return (
    <Glass className="flex items-center gap-3 p-4" onClick={openSos}>
      <span className="grid h-12 w-12 place-items-center rounded-2xl text-white" style={{ background: 'linear-gradient(135deg,#34D399,#0EA5E9)' }}><LifeBuoy size={22} /></span>
      <div className="flex-1">
        <p className="text-[16px] font-semibold">Estou ansioso(a)</p>
        <p className="text-[12px] muted">Respirar · voltar para o agora · uma palavra · avisar seu amor</p>
      </div>
      <ChevronRight size={18} className="muted" />
    </Glass>
  );
}

/* ───────── Limites da semana (check diário) ───────── */
export function LimitsCard() {
  const { me } = useAtlas();
  const limits = useEntries('limit').filter((e) => e.createdBy === me?.id);
  const { put } = useEntryActions();
  const { navigate } = useUI();
  const today = ymd();
  if (!limits.length) return <Glass className="p-4" onClick={() => navigate('col', 'limit')}><p className="text-[15px] font-semibold">🛡️ Limites da semana</p><p className="text-[12px] muted">Defina combinados (ex.: domingo sem celular) e marque quando cumprir.</p></Glass>;
  return (
    <div className="glass overflow-hidden">
      {limits.map((l) => {
        const days = (l.data?.days ?? {}) as Record<string, boolean>;
        return (
          <div key={l.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0 hairline">
            <span>🛡️</span>
            <div className="min-w-0 flex-1"><p className="truncate text-[15px]">{l.title}</p><p className="text-[11.5px] muted">{Object.keys(days).filter((d) => days[d] && d >= ymd(addDays(new Date(), -6))).length}/7 dias cumpridos</p></div>
            <Switch checked={!!days[today]} onChange={(v) => put('limit', { data: { days: { ...days, [today]: v } } }, l)} label="Cumpri hoje" />
          </div>
        );
      })}
      <button onClick={() => navigate('col', 'limit')} className="w-full px-4 py-2.5 text-left text-[13px] font-medium muted">Gerenciar limites</button>
    </div>
  );
}

/* ───────── Rotina para desligar ───────── */
export function UnwindRoutine() {
  const { startSleep, me } = useAtlas();
  const { put } = useEntryActions();
  const [g, setG] = useState('');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const { r } = useReminders();
  const steps = ['Guardar o celular longe da cama', 'Escrever uma gratidão', 'Orar juntos', 'Luz baixa e respiração'];
  if (!me) return null;
  return (
    <Glass className="p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-500/15 text-indigo-300"><Moon size={18} /></span>
        <div className="flex-1"><p className="text-[15px] font-semibold">Rotina para desligar</p><p className="text-[12px] muted">Lembrete às {r.unwindAt}</p></div>
      </div>
      <div className="mt-3 space-y-2">
        {steps.map((s) => (
          <button key={s} onClick={() => setChecks((c) => ({ ...c, [s]: !c[s] }))} className="flex w-full items-center gap-3 text-left">
            <span className={cn('grid h-6 w-6 place-items-center rounded-full ring-1', checks[s] ? 'text-white ring-transparent' : 'ring-black/20 dark:ring-white/25')} style={checks[s] ? { background: '#10B981' } : undefined}>{checks[s] ? '✓' : ''}</span>
            <span className={cn('text-[14.5px]', checks[s] && 'line-through muted')}>{s}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input value={g} onChange={(e) => setG(e.target.value)} placeholder="Hoje sou grato(a) por…" className="input flex-1 !py-2.5" />
        <Button disabled={!g.trim()} onClick={() => { put('win', { title: `Gratidão: ${g.trim()}`, date: ymd() }); setG(''); setChecks((c) => ({ ...c, [steps[1]]: true })); }}>Salvar</Button>
      </div>
      <Button variant="primary" className="mt-3 w-full" onClick={startSleep}><Moon size={15} /> Iniciar sono</Button>
    </Glass>
  );
}

export function ReminderSettings() {
  const { r, update } = useReminders();
  const Row = ({ k, t, d }: { k: 'breaks' | 'sun' | 'unwind' | 'autoNight'; t: string; d: string }) => (
    <div className="flex items-center gap-3 border-b px-4 py-3 last:border-0 hairline">
      <div className="flex-1"><p className="text-[15px]">{t}</p><p className="text-[12px] muted">{d}</p></div>
      <Switch checked={r[k]} onChange={(v) => update({ [k]: v })} label={t} />
    </div>
  );
  return (
    <div className="glass overflow-hidden">
      <Row k="breaks" t="Pausas de respiro" d="10h30, 15h e 17h30: 1 minuto para respirar e beber água" />
      <Row k="sun" t="Sol e movimento" d="16h30: sair, caminhar com o Atlas e pegar sol" />
      <Row k="unwind" t="Rotina para desligar" d={`${r.unwindAt}: hora de desacelerar`} />
      <Row k="autoNight" t="Modo noturno automático" d="Tema escuro depois das 18h e claro de dia" />
      <div className="flex items-center gap-3 px-4 py-3">
        <p className="flex-1 text-[14px]">Horário para desligar</p>
        <input type="time" value={r.unwindAt} onChange={(e) => update({ unwindAt: e.target.value || '22:00' })} className="input !w-28 !py-2" />
      </div>
    </div>
  );
}

/* ───────── Descobertas do mês (correlações simples) ───────── */
export function useInsights() {
  const { rows, me } = useAtlas();
  return useMemo(() => {
    if (!me) return [] as { icon: string; text: string; tone: 'good' | 'warn' | 'info' }[];
    const out: { icon: string; text: string; tone: 'good' | 'warn' | 'info' }[] = [];
    const days = Array.from({ length: 30 }, (_, i) => ymd(addDays(new Date(), -i)));
    const moodScore: Record<string, number> = { radiante: 5, focado: 4, em_paz: 4, cansado: 2, estressado: 1 };
    const moodBy = new Map<string, number>();
    rows('mood_logs').filter((m) => m.profileId === me.id).forEach((m) => moodBy.set(ymd(new Date(m.createdAt)), moodScore[m.mood] ?? 3));
    const battBy = new Map<string, number>();
    rows('mood_logs').filter((m) => m.profileId === me.id).forEach((m) => battBy.set(ymd(new Date(m.createdAt)), m.mentalBattery));
    const sleepBy = new Map<string, number>();
    rows('sleep_logs').filter((s) => s.profileId === me.id && s.wokeAt && s.durationMin).forEach((s) => sleepBy.set(ymd(new Date(s.wokeAt!)), s.durationMin!));
    const cafBy = new Map<string, number>();
    rows('caffeine_logs').filter((c) => c.profileId === me.id).forEach((c) => { const d = ymd(new Date(c.takenAt)); cafBy.set(d, (cafBy.get(d) ?? 0) + c.mg); });
    const readBy = new Set(rows('bible_reads').filter((r) => r.profileId === me.id).map((r) => ymd(new Date(r.readAt))));
    const trainBy = new Set([...rows('entries').filter((e) => e.kind === 'workout' && e.createdBy === me.id).map((e) => e.date ?? ''), ...rows('habit_logs').filter((h) => h.profileId === me.id && h.workout).map((h) => h.logDate)]);
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
    const cmp = (cond: (d: string) => boolean, map: Map<string, number>) => {
      const a = days.filter((d) => map.has(d) && cond(d)).map((d) => map.get(d)!);
      const b = days.filter((d) => map.has(d) && !cond(d)).map((d) => map.get(d)!);
      return { a: avg(a), b: avg(b), na: a.length, nb: b.length };
    };
    // sono x humor/bateria (dia seguinte ao sono = dia do registro)
    const s = cmp((d) => (sleepBy.get(d) ?? 999) < 360, battBy);
    if (s.na >= 2 && s.nb >= 2 && s.b - s.a >= 8) out.push({ icon: '😴', text: `Nos dias em que você dormiu menos de 6h, sua bateria mental ficou em média ${Math.round(s.a)}% (contra ${Math.round(s.b)}% nos outros dias).`, tone: 'warn' });
    const t = cmp((d) => trainBy.has(d), battBy);
    if (t.na >= 2 && t.nb >= 2 && t.a - t.b >= 5) out.push({ icon: '🏋️', text: `Nos dias com treino, sua bateria mental foi ${Math.round(t.a - t.b)} pontos maior.`, tone: 'good' });
    const r = cmp((d) => readBy.has(d), moodBy);
    if (r.na >= 2 && r.nb >= 2 && r.a > r.b) out.push({ icon: '📖', text: `Seu humor costuma ser melhor nos dias em que você lê a Bíblia.`, tone: 'good' });
    const c = cmp((d) => (cafBy.get(d) ?? 0) >= 250, moodBy);
    if (c.na >= 2 && c.nb >= 2 && c.b - c.a >= 0.5) out.push({ icon: '☕', text: `Nos dias com muita cafeína (250 mg+), seu humor caiu um pouco.`, tone: 'warn' });
    const sleeps = days.map((d) => sleepBy.get(d)).filter(Boolean) as number[];
    if (sleeps.length >= 3) out.push({ icon: '🌙', text: `Sua média de sono no último mês foi ${Math.floor(avg(sleeps) / 60)}h${String(Math.round(avg(sleeps) % 60)).padStart(2, '0')}.`, tone: avg(sleeps) >= 420 ? 'good' : 'info' });
    const emo = rows('entries').filter((e) => e.kind === 'emotion' && e.createdBy === me.id && (e.date ?? '') >= days[29]);
    if (emo.length >= 3) {
      const count = new Map<string, number>();
      emo.forEach((e) => count.set(e.title, (count.get(e.title) ?? 0) + 1));
      const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0];
      out.push({ icon: '🫧', text: `A emoção que você mais registrou no mês foi ${top[0].toLowerCase()} (${top[1]}x).`, tone: 'info' });
    }
    const habitDays = rows('habit_logs').filter((h) => h.profileId === me.id && h.logDate >= days[6]);
    const dev = habitDays.filter((h) => h.devotional).length;
    out.push({ icon: '🙏', text: `Devocional em ${dev} dos últimos 7 dias.`, tone: dev >= 5 ? 'good' : 'info' });
    if (out.length < 3) out.push({ icon: '📊', text: 'Continue registrando humor, sono e treinos. Com mais dados, as descobertas ficam mais precisas.', tone: 'info' });
    return out;
  }, [rows, me]);
}
export function InsightsList() {
  const ins = useInsights();
  return (
    <div className="space-y-2">
      {ins.map((i, k) => (
        <Glass key={k} className="flex gap-3 p-4">
          <span className="text-[22px]">{i.icon}</span>
          <p className={cn('flex-1 text-[14px] leading-snug', i.tone === 'warn' && 'text-amber-600 dark:text-amber-400')}>{i.text}</p>
        </Glass>
      ))}
    </div>
  );
}
export function InsightsScreen() {
  return (
    <div>
      <PageHeader title="Descobertas" subtitle="Últimos 30 dias" back />
      <Section><InsightsList /></Section>
      <p className="px-2 text-center text-[11.5px] muted">São padrões dos seus registros, não diagnósticos. Se algo te preocupar, converse com alguém de confiança ou um profissional.</p>
    </div>
  );
}

/* ───────── Mente (segmento da Saúde) ───────── */
export function MindView() {
  const { navigate } = useUI();
  const ins = useInsights();
  return (
    <>
      <Section><SosButton /></Section>
      <Section title="Como você está?" action={<button onClick={() => navigate('col', 'emotion')} className="text-[13px] font-medium muted">Diário</button>}>
        <EmotionQuick />
      </Section>
      <Section title="Descobertas" action={<button onClick={() => navigate('insights')} className="text-[13px] font-medium muted">Ver todas</button>}>
        <Glass className="flex gap-3 p-4" onClick={() => navigate('insights')}><span className="text-[22px]">{ins[0]?.icon}</span><p className="flex-1 text-[14px] leading-snug">{ins[0]?.text}</p></Glass>
      </Section>
      <Section title="Limites da semana"><LimitsCard /></Section>
      <Section><UnwindRoutine /></Section>
      <Section title="Para os dias difíceis"><HubTiles kinds={['win', 'emotion']} /></Section>
      <Section title="Lembretes de cuidado"><ReminderSettings /></Section>
    </>
  );
}
function EmotionQuick() {
  const [pick, setPick] = useState<string | null>(null);
  const opts = ['Alegria', 'Paz', 'Gratidão', 'Ansiedade', 'Tristeza', 'Raiva', 'Medo', 'Cansaço'];
  const emo: Record<string, string> = { Alegria: '😄', Paz: '😌', Gratidão: '🙏', Ansiedade: '😰', Tristeza: '😢', Raiva: '😠', Medo: '😨', Cansaço: '🥱' };
  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        {opts.map((o) => (
          <motion.button key={o} whileTap={{ scale: 0.9 }} onClick={() => setPick(o)} className="glass-thin flex flex-col items-center gap-1 py-2.5 !rounded-2xl">
            <span className="text-[22px]">{emo[o]}</span><span className="text-[11px] font-medium">{o}</span>
          </motion.button>
        ))}
      </div>
      <EntrySheet cfg={KINDS.emotion} open={!!pick} onClose={() => setPick(null)} preset={{ title: pick, date: ymd(), level: 3 }} />
    </>
  );
}

/* ───────── Corpo (segmento da Saúde) ───────── */
export function BodyView() {
  const { me } = useAtlas();
  const { resolvedTheme } = { resolvedTheme: 'dark' };
  const workouts = useEntries('workout').filter((e) => e.createdBy === me?.id);
  const measures = useEntries('measure').filter((e) => e.createdBy === me?.id).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = addDays(new Date(), -i * 7);
    const start = addDays(end, -6);
    return workouts.filter((w) => (w.date ?? '') >= ymd(start) && (w.date ?? '') <= ymd(end)).length;
  }).reverse();
  let streak = 0;
  for (let i = weeks.length - 1; i >= 0 && weeks[i] > 0; i--) streak++;
  const chart = measures.map((m) => ({ d: m.date ? fmtDay(parseYmd(m.date), { day: '2-digit', month: '2-digit' }) : '', kg: m.data?.weight }));
  return (
    <>
      <Section title="Treinos">
        <Glass className="p-4">
          <div className="flex items-end justify-between">
            <div><p className="text-[28px] font-bold leading-none">{weeks[7]}</p><p className="text-[12px] muted">treinos nesta semana</p></div>
            <p className="text-[12px] font-semibold" style={{ color: '#10B981' }}>{streak} semana(s) seguidas</p>
          </div>
          <div className="mt-3 flex h-14 items-end gap-1.5">
            {weeks.map((n, i) => <div key={i} className="flex-1 rounded-md" style={{ height: `${Math.min(100, n * 20) || 6}%`, background: n ? '#10B981' : 'currentColor', opacity: n ? 1 : 0.1 }} />)}
          </div>
        </Glass>
        <div className="mt-3"><CollectionList kind="workout" limit={5} /></div>
      </Section>
      <Section title="Peso e medidas">
        {chart.length >= 2 && (
          <Glass className="mb-3 p-4">
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ top: 6, right: 4, left: -28, bottom: 0 }}>
                  <XAxis dataKey="d" tickLine={false} axisLine={false} tick={{ fill: '#888', fontSize: 10 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#888', fontSize: 10 }} domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip contentStyle={{ background: resolvedTheme === 'light' ? '#fff' : '#111', border: 'none', borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="kg" stroke="#10B981" strokeWidth={2} fill="#10B98122" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Glass>
        )}
        <CollectionList kind="measure" limit={4} />
      </Section>
      <Section title="Sol e movimento">
        <Glass className="flex items-center gap-3 p-4"><Sun size={20} /><p className="flex-1 text-[13.5px]">Lembrete diário às 16h30 para sair, caminhar com o Atlas e pegar sol. Ajuste em Mente → Lembretes de cuidado.</p></Glass>
      </Section>
    </>
  );
}

/* ───────── Casal: ouvir antes de responder + termômetro de cansaço ───────── */
const NEED_TIPS: Record<string, string> = {
  silencio: 'Dê espaço: menos perguntas, mais presença em silêncio. Um café sem cobrança ajuda.',
  colo: 'Abraço demorado, carinho e atenção sem celular. Pergunte só “quer conversar ou só colo?”.',
  desabafar: 'Escute sem dar solução. Repita o que ouviu e valide: “faz sentido você se sentir assim”.',
  comer: 'Resolva a logística: escolha o lugar e vá. Fome e cansaço juntos pioram tudo.',
};
export function ListenFirst() {
  const { me, partner } = useAtlas();
  if (!me || !partner || partner.pending) return null;
  const low = partner.mentalBattery < 40 || ['cansado', 'estressado'].includes(partner.mood);
  if (!low) return null;
  const tip = partner.mood === 'estressado' ? NEED_TIPS.desabafar : partner.mentalBattery < 25 ? NEED_TIPS.silencio : NEED_TIPS.colo;
  return (
    <Glass className="flex gap-3 p-4">
      <span className="text-[22px]">👂</span>
      <div className="flex-1">
        <p className="text-[14px] font-semibold">Ouvir antes de responder</p>
        <p className="mt-0.5 text-[13px] leading-snug muted">{firstName(partner.displayName)} está com a bateria em {partner.mentalBattery}%. {tip}</p>
      </div>
    </Glass>
  );
}
export function FatigueThermometer() {
  const { me, partner } = useAtlas();
  if (!me || !partner || partner.pending) return null;
  if (!(me.mentalBattery < 40 && partner.mentalBattery < 40)) return null;
  return (
    <Glass className="flex gap-3 p-4" >
      <AlertCircle size={22} className="shrink-0 text-amber-500" />
      <div className="flex-1">
        <p className="text-[14px] font-semibold">Os dois estão cansados hoje</p>
        <p className="mt-0.5 text-[13px] leading-snug muted">Que tal uma noite tranquila? Comida simples, sem tarefas extras, oração curta e cama cedo. Adiem o que não é urgente.</p>
      </div>
    </Glass>
  );
}
export { Activity, Wind, streakOf };
