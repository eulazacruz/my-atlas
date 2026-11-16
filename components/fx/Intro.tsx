'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BookOpen, Fingerprint, HeartHandshake, LayoutGrid, MapPin, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { Button } from '@/components/ui/primitives';
import { playSound, readPrefs, vibe } from '@/lib/fx';
import { ensureLocationPermission, ensureNotificationPermission, isNative, registerPush } from '@/lib/native';
import { savePushToken } from '@/lib/db';
import { getSupabase } from '@/lib/supabase';
import { firstName } from '@/lib/utils';

/** Símbolo do Atlas desenhado em SVG (órbita + anel + ponto). */
export function AtlasGlyph({ size = 160, progress = 1, dot = 1, color = '#F5F5F7' }: { size?: number; progress?: number; dot?: number; color?: string }) {
  const C = 2 * Math.PI * 292;
  const E = 2 * Math.PI * Math.sqrt((292 * 292 + 112 * 112) / 2);
  // o ponto percorre a órbita até parar no lugar
  const a = (-Math.PI / 2) + (1 - dot) * -Math.PI * 1.6;
  const ex = 292 * Math.cos(a), ey = 112 * Math.sin(a);
  const r = (-45 * Math.PI) / 180;
  const fx = 512 + ex * Math.cos(r) - ey * Math.sin(r);
  const fy = 512 + ex * Math.sin(r) + ey * Math.cos(r);
  const px = dot >= 1 ? 655 : fx * (1 - dot ** 6) + 655 * dot ** 6;
  const py = dot >= 1 ? 369 : fy * (1 - dot ** 6) + 369 * dot ** 6;
  return (
    <svg viewBox="0 0 1024 1024" width={size} height={size}>
      <defs>
        <linearGradient id="atlas-em" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7CF0C4" /><stop offset="1" stopColor="#10B981" /></linearGradient>
      </defs>
      <g fill="none" stroke={color} strokeLinecap="round">
        <circle cx="512" cy="512" r="292" strokeWidth="76" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} transform="rotate(-90 512 512)" />
        <ellipse cx="512" cy="512" rx="292" ry="112" strokeWidth="62" transform="rotate(-45 512 512)" strokeDasharray={E} strokeDashoffset={E * (1 - Math.max(0, progress * 1.15 - 0.15))} />
      </g>
      {dot > 0 && (
        <>
          <circle cx={px} cy={py} r={76} fill="#030303" opacity={dot} />
          <circle cx={px} cy={py} r={54} fill="url(#atlas-em)" opacity={Math.min(1, dot * 2)} />
        </>
      )}
    </svg>
  );
}

const greet = () => {
  const h = new Date().getHours();
  return h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
};

/** Intro animada no primeiro carregamento da sessão (toque para pular). */
export function Intro() {
  const { me, status } = useAtlas();
  const [show, setShow] = useState(false);
  const [t, setT] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (!readPrefs().intro || window.location.pathname.startsWith('/voltar')) return;
    try { if (sessionStorage.getItem('atlas:intro')) return; sessionStorage.setItem('atlas:intro', '1'); } catch { /* noop */ }
    setShow(true);
    const t0 = performance.now();
    let chimed = false;
    const tick = (now: number) => {
      const s = (now - t0) / 1000;
      setT(s);
      if (s > 0.15 && !chimed) { chimed = true; playSound('intro'); }
      if (s < 2.2) raf.current = requestAnimationFrame(tick);
      else setShow(false);
    };
    raf.current = requestAnimationFrame(tick);
    const v = window.setTimeout(() => vibe('tick'), 1050);
    return () => { cancelAnimationFrame(raf.current); window.clearTimeout(v); };
  }, []);
  const ease = (x: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
  const progress = ease((t - 0.05) / 0.75);
  const dot = ease((t - 0.55) / 0.55);
  const word = ease((t - 0.95) / 0.4);
  const hi = ease((t - 1.2) / 0.4);
  const day = new Date().getHours() >= 6 && new Date().getHours() < 18;
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro"
          onClick={() => setShow(false)}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
          style={{ background: day ? '#F4F4F6' : '#030303', color: day ? '#0B0B0C' : '#F5F5F7' }}
          exit={{ opacity: 0, scale: 1.06, filter: 'blur(8px)' }}
          transition={{ duration: 0.45 }}
        >
          <div className="absolute h-72 w-72 rounded-full blur-3xl" style={{ background: `rgba(16,185,129,${0.18 * dot})` }} />
          <div style={{ transform: `scale(${0.85 + 0.15 * progress})` }} className="relative">
            <AtlasGlyph size={150} progress={progress} dot={dot} color={day ? '#0B0B0C' : '#F5F5F7'} />
          </div>
          <p className="relative mt-7 text-[30px] font-bold tracking-tight" style={{ opacity: word, letterSpacing: `${(1 - word) * 10 - 0.5}px` }}>My Atlas</p>
          <p className="relative mt-1.5 text-[15px] opacity-60" style={{ opacity: hi * 0.6, transform: `translateY(${(1 - hi) * 8}px)` }}>
            {greet()}{me && status === 'ready' ? `, ${firstName(me.displayName)}` : ''}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───────── Apresentação do primeiro uso ───────── */
const SLIDES = [
  { icon: Sparkles, title: 'A vida de vocês dois num só lugar', text: 'Fé, rotina, saúde mental, finanças e o Atlas — tudo sincronizado em tempo real entre você e seu amor.' },
  { icon: HeartHandshake, title: 'Saiba como o outro está', text: 'Status, humor, bateria mental e “preciso de colo, silêncio, desabafar…”. O aviso aparece ao redor da câmera.' },
  { icon: BookOpen, title: 'Fé a dois', text: 'Leitura bíblica juntos, devocional, “orei por você”, jejum e check-in toda semana.' },
  { icon: LayoutGrid, title: 'Widgets e botões rápidos', text: 'Segure a tela inicial → Widgets → My Atlas. No painel de cima, adicione Água, Despesa, Humor e Ansioso.' },
  { icon: Fingerprint, title: 'Só falta permitir', text: 'Notificações para receber os avisos do casal e localização para o mapa em tempo real. Você pode mudar depois em Ajustes.' },
];
export function Onboarding() {
  const { me, status, state, mode, save } = useAtlas();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [perm, setPerm] = useState({ n: false, l: false });
  useEffect(() => {
    if (status !== 'ready') return;
    try { if (localStorage.getItem('my-atlas:onboarded')) return; } catch { /* noop */ }
    const t = window.setTimeout(() => setOpen(true), readPrefs().intro ? 2300 : 300);
    return () => window.clearTimeout(t);
  }, [status]);
  const finish = () => {
    try { localStorage.setItem('my-atlas:onboarded', '1'); } catch { /* noop */ }
    setOpen(false);
  };
  const s = SLIDES[i];
  const last = i === SLIDES.length - 1;
  const askN = async () => {
    const ok = await ensureNotificationPermission();
    setPerm((p) => ({ ...p, n: ok }));
    if (ok && mode === 'supabase' && state) { const sb = getSupabase(); await registerPush((tk) => { if (sb) savePushToken(sb, state.couple.id, state.meId, tk).catch(() => {}); }); }
  };
  const askL = async () => {
    const ok = await ensureLocationPermission();
    setPerm((p) => ({ ...p, l: ok }));
    if (ok && me) save('locations', { id: me.id, sharing: true, lat: null, lng: null, accuracy: null, speed: null, battery: null, updatedAt: new Date().toISOString() });
  };
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[150] flex flex-col bg-[var(--bg)] px-7 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(3.5rem+var(--sat,0px))]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: 30 }}>
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">{SLIDES.map((_, k) => <span key={k} className="h-1.5 rounded-full transition-all" style={{ width: k === i ? 22 : 6, background: k <= i ? '#10B981' : 'rgba(127,127,127,.3)' }} />)}</div>
            {!last && <button onClick={finish} className="text-[14px] font-medium muted">Pular</button>}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={i} className="flex flex-1 flex-col justify-center" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.28 }}>
              {i === 0 ? <AtlasGlyph size={96} /> : (
                <span className="grid h-20 w-20 place-items-center rounded-[26px] bg-black text-white dark:bg-white dark:text-black"><s.icon size={34} /></span>
              )}
              <h2 className="mt-8 text-[34px] font-bold leading-[1.08] tracking-tight">{s.title}</h2>
              <p className="mt-3 text-[17px] leading-relaxed muted">{s.text}</p>
              {last && (
                <div className="mt-8 space-y-2.5">
                  <Button className="h-14 w-full justify-start px-5 text-[15px]" onClick={askN}><Bell size={18} /> {perm.n ? 'Notificações ativadas ✓' : 'Permitir notificações'}</Button>
                  <Button className="h-14 w-full justify-start px-5 text-[15px]" onClick={askL}><MapPin size={18} /> {perm.l ? 'Localização ativada ✓' : 'Permitir localização'}</Button>
                  {!isNative() && <p className="text-[12px] muted">No APK do celular essas permissões ficam completas.</p>}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          <Button variant="primary" className="h-14 w-full text-[16px]" onClick={() => (last ? finish() : setI(i + 1))}>{last ? 'Começar' : 'Continuar'}</Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───────── Confete ───────── */
export function Confetti() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    const on = (e: Event) => {
      const c = ref.current;
      if (!c) return;
      setMsg((e as CustomEvent).detail ?? null);
      window.setTimeout(() => setMsg(null), 2600);
      const g = c.getContext('2d')!;
      c.width = window.innerWidth * devicePixelRatio;
      c.height = window.innerHeight * devicePixelRatio;
      g.scale(devicePixelRatio, devicePixelRatio);
      const colors = ['#10B981', '#7CF0C4', '#E9C46A', '#F472B6', '#60A5FA', '#ffffff'];
      const P = Array.from({ length: 120 }, () => ({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 80, y: window.innerHeight * 0.35,
        vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 13 - 4, r: Math.random() * 360, vr: (Math.random() - 0.5) * 14,
        w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, c: colors[(Math.random() * colors.length) | 0],
      }));
      const t0 = performance.now();
      const frame = (now: number) => {
        const s = (now - t0) / 1000;
        g.clearRect(0, 0, window.innerWidth, window.innerHeight);
        P.forEach((p) => {
          p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
          g.save(); g.translate(p.x, p.y); g.rotate((p.r * Math.PI) / 180); g.globalAlpha = Math.max(0, 1 - s / 2.4);
          g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore();
        });
        if (s < 2.5) requestAnimationFrame(frame);
        else g.clearRect(0, 0, window.innerWidth, window.innerHeight);
      };
      requestAnimationFrame(frame);
    };
    window.addEventListener('atlas:celebrate', on);
    return () => window.removeEventListener('atlas:celebrate', on);
  }, []);
  return (
    <>
      <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[120] h-full w-full" />
      <AnimatePresence>
        {msg && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="pointer-events-none fixed inset-x-0 top-[38%] z-[121] text-center">
            <span className="rounded-full bg-black/80 px-5 py-3 text-[17px] font-bold text-white backdrop-blur">{msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
