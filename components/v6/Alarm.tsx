'use client';
/* Despertador com missão: alarme nativo (toca mesmo no silencioso) e só para depois de cumprir a missão. */
import { AnimatePresence, motion } from 'framer-motion';
import { AlarmClock, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { PrioritiesCard } from '@/components/hubs/FocusHub';
import { useEntryActions } from '@/components/ui/Collection';
import { Button, Chip, Glass, Section, Switch } from '@/components/ui/primitives';
import { wordOfTheDay } from '@/lib/constants';
import { celebrate, playSound } from '@/lib/fx';
import { AtlasNative, isNative } from '@/lib/native';
import { cn, firstName, uid, ymd } from '@/lib/utils';
import { EMERALD, norm, useLocal } from './kit';

export type Mission = 'math' | 'shake' | 'type' | 'barcode';
export interface AlarmCfg { id: string; time: string; days: number[]; on: boolean; mission: Mission; level: 1 | 2 | 3; label: string; notify: boolean; code?: string }
const KEY = 'my-atlas:alarms';
const MISSIONS: { id: Mission; emoji: string; t: string; h: string }[] = [
  { id: 'math', emoji: '🧮', t: 'Contas', h: 'Resolver 3 contas' },
  { id: 'shake', emoji: '📳', t: 'Chacoalhar', h: 'Sacudir o celular 30 vezes' },
  { id: 'type', emoji: '⌨️', t: 'Digitar o versículo', h: 'Escrever o versículo do dia' },
  { id: 'barcode', emoji: '🏷️', t: 'Código de barras', h: 'Levantar e escanear um objeto' },
];
const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const SHORT_VERSES = ['O Senhor é o meu pastor, nada me faltará', 'Tudo posso naquele que me fortalece', 'As misericórdias do Senhor se renovam a cada manhã', 'Este é o dia que o Senhor fez', 'Esforça-te e tem bom ânimo'];

const readAlarms = (): AlarmCfg[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
export async function syncAlarms(list: AlarmCfg[], snoozeAt: number | null = null) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* noop */ }
  if (!isNative()) return { exact: true, fullScreen: true };
  try { return await AtlasNative.setAlarms({ data: JSON.stringify({ alarms: list.filter((a) => a.on), snoozeAt }) }); } catch { return { exact: true, fullScreen: true }; }
}
const nextLabel = (a: AlarmCfg) => {
  const [h, m] = a.time.split(':').map(Number);
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(now); d.setDate(d.getDate() + i); d.setHours(h, m, 0, 0);
    if (d > now && (a.days.length === 0 || a.days.includes(d.getDay()))) {
      const mins = Math.round((d.getTime() - now.getTime()) / 60000);
      return mins < 60 * 24 ? `Toca em ${Math.floor(mins / 60)}h ${mins % 60}min` : `Toca ${d.toLocaleDateString('pt-BR', { weekday: 'long' })}`;
    }
  }
  return '';
};

export function AlarmTool() {
  const [list, setList] = useState<AlarmCfg[]>([]);
  const [perm, setPerm] = useState({ exact: true, fullScreen: true });
  const [edit, setEdit] = useState<AlarmCfg | null>(null);
  const [test, setTest] = useState<AlarmCfg | null>(null);
  useEffect(() => { const l = readAlarms(); setList(l); syncAlarms(l).then(setPerm); }, []);
  const update = (l: AlarmCfg[]) => { setList(l); syncAlarms(l).then(setPerm); };
  return (
    <>
      {isNative() && (!perm.exact || !perm.fullScreen) && (
        <Glass className="mb-4 p-4">
          <p className="text-[14.5px] font-semibold">⚠️ Falta uma permissão para o alarme tocar com a tela bloqueada</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {!perm.exact && <Button className="h-9" onClick={() => AtlasNative.openAlarmSettings({ which: 'exact' })}>Alarmes e lembretes</Button>}
            {!perm.fullScreen && <Button className="h-9" onClick={() => AtlasNative.openAlarmSettings({ which: 'fullscreen' })}>Notificações em tela cheia</Button>}
          </div>
        </Glass>
      )}
      {!isNative() && <p className="mb-4 px-1 text-[13px] muted">O despertador toca pelo app Android. Aqui no navegador você pode configurar e testar a missão.</p>}
      <div className="space-y-2">
        {list.map((a) => (
          <Glass key={a.id} className="p-4" onClick={() => setEdit(a)}>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className={cn('text-[38px] font-bold leading-none tracking-tight tabular-nums', !a.on && 'opacity-35')}>{a.time}</p>
                <p className="mt-1 text-[12.5px] muted">{a.label || 'Despertar'} · {a.days.length === 7 || !a.days.length ? 'Todo dia' : a.days.map((d) => DAYS[d]).join(' ')} · {MISSIONS.find((m) => m.id === a.mission)?.emoji}</p>
                {a.on && <p className="text-[12px] font-medium" style={{ color: EMERALD }}>{nextLabel(a)}</p>}
              </div>
              <div onClick={(e) => e.stopPropagation()}><Switch checked={a.on} onChange={(v) => update(list.map((x) => (x.id === a.id ? { ...x, on: v } : x)))} label="" /></div>
            </div>
          </Glass>
        ))}
      </div>
      <Button variant="primary" className="mt-4 w-full" onClick={() => setEdit({ id: uid(), time: '06:00', days: [1, 2, 3, 4, 5], on: true, mission: 'math', level: 2, label: '', notify: true })}><Plus size={16} /> Novo alarme</Button>
      <Section className="mt-7" title="Como funciona">
        <Glass className="space-y-2 p-4 text-[13.5px] leading-snug">
          <p>🔊 Toca no volume de alarme, mesmo com o celular no silencioso, e não para sozinho.</p>
          <p>🎯 Só desliga depois de cumprir a missão. Soneca de 5 minutos, no máximo 3 vezes.</p>
          <p>😴 Se apertar soneca, seu amor recebe uma notificação para te acordar.</p>
          <p>☀️ Depois de acordar: versículo do dia, suas 3 prioridades e o sono registrado.</p>
        </Glass>
      </Section>
      <AnimatePresence>{edit && <EditAlarm a={edit} onClose={() => setEdit(null)} onSave={(a) => { update(list.some((x) => x.id === a.id) ? list.map((x) => (x.id === a.id ? a : x)) : [...list, a]); setEdit(null); }} onDelete={(id) => { update(list.filter((x) => x.id !== id)); setEdit(null); }} onTest={(a) => { setEdit(null); setTest(a); }} />}</AnimatePresence>
      <AnimatePresence>{test && <Ringing cfg={test} test onDone={() => setTest(null)} />}</AnimatePresence>
    </>
  );
}

function EditAlarm({ a, onClose, onSave, onDelete, onTest }: { a: AlarmCfg; onClose: () => void; onSave: (a: AlarmCfg) => void; onDelete: (id: string) => void; onTest: (a: AlarmCfg) => void }) {
  const [v, setV] = useState(a);
  const [scan, setScan] = useState(false);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[85] flex items-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }} transition={{ type: 'spring', stiffness: 380, damping: 36 }} className="glass-strong max-h-[92vh] w-full overflow-y-auto rounded-t-[32px] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
        <input type="time" value={v.time} onChange={(e) => setV({ ...v, time: e.target.value })} className="mx-auto block bg-transparent text-center text-[56px] font-bold tabular-nums outline-none" />
        <div className="mt-2 flex justify-center gap-1.5">
          {DAYS.map((d, i) => <button key={i} onClick={() => setV({ ...v, days: v.days.includes(i) ? v.days.filter((x) => x !== i) : [...v.days, i].sort() })} className={cn('h-10 w-10 rounded-full text-[13px] font-semibold', v.days.includes(i) ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-black/[0.05] dark:bg-white/[0.08]')}>{d}</button>)}
        </div>
        <input value={v.label} onChange={(e) => setV({ ...v, label: e.target.value })} placeholder="Nome (ex.: Trabalho)" className="input mt-4" />
        <p className="mb-2 mt-5 text-[13px] font-semibold">Missão para desligar</p>
        <div className="grid grid-cols-2 gap-2">
          {MISSIONS.map((m) => (
            <button key={m.id} onClick={() => { setV({ ...v, mission: m.id }); if (m.id === 'barcode' && !v.code) setScan(true); }} className={cn('rounded-2xl p-3 text-left', v.mission === m.id ? 'bg-emerald-500/15 ring-2 ring-emerald-500' : 'bg-black/[0.04] dark:bg-white/[0.06]')}>
              <span className="text-[22px]">{m.emoji}</span><p className="mt-1 text-[13.5px] font-semibold">{m.t}</p><p className="text-[11.5px] leading-snug muted">{m.h}</p>
            </button>
          ))}
        </div>
        {v.mission === 'barcode' && <p className="mt-2 text-[12.5px] muted">{v.code ? `Objeto cadastrado ✓ (${v.code.slice(0, 6)}…) ` : 'Cadastre o código de algo longe da cama (pasta de dente, café…). '}<button onClick={() => setScan(true)} className="font-semibold underline">{v.code ? 'Trocar' : 'Cadastrar'}</button></p>}
        {v.mission === 'math' && <div className="mt-3 flex gap-2">{([1, 2, 3] as const).map((l) => <Chip key={l} active={v.level === l} onClick={() => setV({ ...v, level: l })}>{['Fácil', 'Médio', 'Difícil'][l - 1]}</Chip>)}</div>}
        <div className="mt-4 flex items-center justify-between gap-3"><span className="text-[14px]">Avisar meu amor se eu apertar soneca 😴</span><Switch checked={v.notify} onChange={(x) => setV({ ...v, notify: x })} label="Avisar meu amor" /></div>
        <div className="mt-5 flex gap-2">
          <Button variant="danger" onClick={() => onDelete(v.id)}><Trash2 size={15} /></Button>
          <Button className="flex-1" onClick={() => onTest(v)}>Testar</Button>
          <Button variant="primary" className="flex-1" disabled={v.mission === 'barcode' && !v.code} onClick={() => onSave(v)}>Salvar</Button>
        </div>
      </motion.div>
      {scan && <Scanner onCode={(c) => { setV({ ...v, code: c, mission: 'barcode' }); setScan(false); }} onClose={() => setScan(false)} />}
    </motion.div>
  );
}

/* ───── Leitor de código de barras (BarcodeDetector do Chrome/WebView) ───── */
function Scanner({ onCode, onClose, expect }: { onCode: (c: string) => void; onClose: () => void; expect?: string }) {
  const video = useRef<HTMLVideoElement | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let on = true;
    (async () => {
      const BD = (window as unknown as { BarcodeDetector?: new (o?: unknown) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
      if (!BD) { setErr('Este aparelho não lê códigos. Escolha outra missão.'); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!video.current || !on) return;
        video.current.srcObject = stream;
        await video.current.play();
        const det = new BD();
        const loop = async () => {
          if (!on || !video.current) return;
          try { const r = await det.detect(video.current); if (r[0]?.rawValue && (!expect || r[0].rawValue === expect)) { onCode(r[0].rawValue); return; } } catch { /* noop */ }
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch { setErr('Sem acesso à câmera.'); }
    })();
    return () => { on = false; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="fixed inset-0 z-[95] flex flex-col bg-black text-white" onClick={(e) => e.stopPropagation()}>
      <video ref={video} playsInline muted className="flex-1 object-cover" />
      <div className="pointer-events-none absolute inset-x-10 top-1/3 h-32 rounded-3xl border-2" style={{ borderColor: EMERALD }} />
      <div className="p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-center">
        <p className="text-[15px]">{err ?? (expect ? 'Escaneie o objeto cadastrado' : 'Aponte para um código de barras')}</p>
        <button onClick={onClose} className="mt-3 h-11 rounded-full bg-white/15 px-6 text-[14px] font-semibold">{err ? 'Fechar' : 'Cancelar'}</button>
      </div>
    </div>
  );
}

/* ───── Tela do alarme tocando ───── */
function MathMission({ level, onDone }: { level: number; onDone: () => void }) {
  const make = () => {
    const r = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
    if (level === 1) { const a = r(10, 40), b = r(5, 30); return { q: `${a} + ${b}`, a: a + b }; }
    if (level === 2) { const a = r(6, 13), b = r(6, 12), c = r(10, 60); return { q: `${a} × ${b} + ${c}`, a: a * b + c }; }
    const a = r(12, 25), b = r(11, 19), c = r(20, 99); return { q: `${a} × ${b} − ${c}`, a: a * b - c };
  };
  const [p, setP] = useState(make);
  const [n, setN] = useState(0);
  const [v, setV] = useState('');
  const [bad, setBad] = useState(false);
  return (
    <div className="text-center">
      <p className="text-[13px] text-white/60">Conta {n + 1} de 3</p>
      <motion.p key={p.q} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1, x: bad ? [0, -10, 10, -6, 0] : 0 }} className="mt-2 text-[44px] font-bold tabular-nums">{p.q}</motion.p>
      <p className="mt-2 h-14 text-[40px] font-bold tabular-nums" style={{ color: EMERALD }}>{v || ' '}</p>
      <div className="mx-auto mt-3 grid max-w-xs grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '−', '0', '⌫'].map((k) => (
          <motion.button key={k} whileTap={{ scale: 0.9 }} onClick={() => setV(k === '⌫' ? v.slice(0, -1) : k === '−' ? (v.startsWith('-') ? v.slice(1) : '-' + v) : (v + k).slice(0, 6))} className="h-14 rounded-2xl bg-white/10 text-[22px] font-semibold">{k}</motion.button>
        ))}
      </div>
      <button onClick={() => { if (Number(v) === p.a) { if (n === 2) onDone(); else { setN(n + 1); setP(make()); setV(''); playSound('pop'); } } else { setBad(true); setV(''); setTimeout(() => setBad(false), 400); } }} className="mx-auto mt-3 block h-14 w-full max-w-xs rounded-2xl text-[17px] font-bold text-black" style={{ background: EMERALD }}>Confirmar</button>
    </div>
  );
}
function ShakeMission({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(0);
  const last = useRef(0);
  useEffect(() => {
    const h = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity; if (!a) return;
      const m = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2);
      if (m > 22 && Date.now() - last.current > 220) { last.current = Date.now(); setN((x) => x + 1); }
    };
    window.addEventListener('devicemotion', h);
    return () => window.removeEventListener('devicemotion', h);
  }, []);
  useEffect(() => { if (n >= 30) onDone(); }, [n, onDone]);
  return (
    <div className="text-center">
      <motion.p animate={{ rotate: [0, -12, 12, -8, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="text-[70px]">📳</motion.p>
      <p className="mt-2 text-[56px] font-bold tabular-nums">{Math.max(0, 30 - n)}</p>
      <p className="text-white/60">sacudidas restantes</p>
      <button onClick={() => setN((x) => x + 1)} className="mt-6 text-[11px] text-white/25">(sem sensor? toque aqui)</button>
    </div>
  );
}
function TypeMission({ onDone }: { onDone: () => void }) {
  const target = useMemo(() => SHORT_VERSES[new Date().getDate() % SHORT_VERSES.length], []);
  const [v, setV] = useState('');
  const ok = norm(v).replace(/[^a-z ]/g, '').trim() === norm(target).replace(/[^a-z ]/g, '').trim();
  useEffect(() => { if (ok) onDone(); }, [ok, onDone]);
  return (
    <div>
      <p className="text-center text-[22px] font-semibold leading-snug">“{target}”</p>
      <textarea autoFocus rows={3} value={v} onChange={(e) => setV(e.target.value)} className="mt-5 w-full rounded-2xl bg-white/10 p-4 text-[18px] outline-none" placeholder="Digite o versículo…" />
      <p className="mt-2 text-center text-[12px] text-white/50">{Math.round((Math.min(v.length, target.length) / target.length) * 100)}%</p>
    </div>
  );
}

export function Ringing({ cfg, test, onDone }: { cfg: AlarmCfg; test?: boolean; onDone: () => void }) {
  const { me, finishSleep } = useAtlas();
  const { put } = useEntryActions();
  const [stage, setStage] = useState<'ring' | 'mission' | 'morning'>('ring');
  const [snoozes, setSnoozes] = useLocal(`my-atlas:snoozes:${ymd()}`, 0);
  const [scan, setScan] = useState(false);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const word = wordOfTheDay();
  const stop = async () => { if (!test && isNative()) await AtlasNative.stopAlarm().catch(() => {}); };
  const dismiss = async () => {
    await stop();
    if (!test) finishSleep(true);
    celebrate('Bom dia! ☀️');
    setStage('morning');
  };
  const snooze = async () => {
    await stop();
    setSnoozes(snoozes + 1);
    if (!test) {
      await syncAlarms(readAlarms(), Date.now() + 5 * 60_000);
      if (cfg.notify) put('alarm_snooze', { title: `${firstName(me?.displayName ?? '')} apertou soneca`, date: ymd(), data: { n: snoozes + 1 } });
    }
    onDone();
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex flex-col bg-black px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(3rem+var(--sat,env(safe-area-inset-top)))] text-white">
      {stage === 'ring' && (
        <>
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="grid h-28 w-28 place-items-center rounded-full" style={{ background: EMERALD + '33', boxShadow: `0 0 80px ${EMERALD}66` }}><AlarmClock size={52} style={{ color: EMERALD }} /></motion.div>
            <p className="mt-8 text-[76px] font-bold leading-none tracking-tight tabular-nums">{now.toTimeString().slice(0, 5)}</p>
            <p className="mt-2 text-[17px] text-white/70">{cfg.label || 'Hora de levantar'}{test ? ' · teste' : ''}</p>
          </div>
          <button onClick={() => (cfg.mission === 'barcode' ? setScan(true) : setStage('mission'))} className="h-16 w-full rounded-full text-[18px] font-bold text-black" style={{ background: EMERALD }}>Desligar ({MISSIONS.find((m) => m.id === cfg.mission)?.t})</button>
          {snoozes < 3 ? <button onClick={snooze} className="mt-3 h-14 w-full rounded-full bg-white/10 text-[16px] font-semibold">Soneca 5 min {cfg.notify ? '· avisa seu amor 😴' : ''}</button> : <p className="mt-4 text-center text-[13px] text-white/50">Sonecas esgotadas. Bora levantar! 💪</p>}
        </>
      )}
      {stage === 'mission' && (
        <div className="flex flex-1 flex-col justify-center">
          {cfg.mission === 'math' && <MathMission level={cfg.level} onDone={dismiss} />}
          {cfg.mission === 'shake' && <ShakeMission onDone={dismiss} />}
          {cfg.mission === 'type' && <TypeMission onDone={dismiss} />}
          {cfg.mission === 'barcode' && <MathMission level={2} onDone={dismiss} />}
        </div>
      )}
      {stage === 'morning' && (
        <div className="flex flex-1 flex-col overflow-y-auto">
          <p className="text-[34px] font-bold tracking-tight">Bom dia, {firstName(me?.displayName ?? '')} ☀️</p>
          <div className="mt-5 rounded-[26px] bg-white/[0.08] p-5"><p className="text-[11px] font-semibold uppercase tracking-widest text-white/50">{word.kind} do dia</p><p className="mt-2 font-serif text-[19px] leading-snug">“{word.text}”</p><p className="mt-2 text-[13px] text-white/60">{word.ref}</p></div>
          <div className="mt-4 text-black dark:text-white"><PrioritiesCard compact /></div>
          <button onClick={onDone} className="mt-auto h-14 w-full rounded-full bg-white text-[16px] font-bold text-black">Começar o dia</button>
        </div>
      )}
      {scan && <Scanner expect={cfg.code} onCode={() => { setScan(false); dismiss(); }} onClose={() => { setScan(false); setStage('mission'); }} />}
    </motion.div>
  );
}

/** Montado no AppShell: abre a tela do alarme quando o Android dispara. */
export function AlarmHost() {
  const [ring, setRing] = useState<AlarmCfg | null>(null);
  useEffect(() => {
    if (!isNative()) return;
    const show = (id?: string) => {
      const l = readAlarms();
      setRing(l.find((a) => a.id === id) ?? l[0] ?? { id: 'x', time: '', days: [], on: true, mission: 'math', level: 2, label: '', notify: true });
    };
    AtlasNative.alarmState().then((s) => s.ringing && show(s.id)).catch(() => {});
    let h: { remove: () => void } | null = null;
    AtlasNative.addListener('alarm', (e) => show(e.id)).then((x) => { h = x; }).catch(() => {});
    const vis = () => document.visibilityState === 'visible' && AtlasNative.alarmState().then((s) => s.ringing && show(s.id)).catch(() => {});
    document.addEventListener('visibilitychange', vis);
    return () => { h?.remove(); document.removeEventListener('visibilitychange', vis); };
  }, []);
  return <AnimatePresence>{ring && <Ringing cfg={ring} onDone={() => setRing(null)} />}</AnimatePresence>;
}
