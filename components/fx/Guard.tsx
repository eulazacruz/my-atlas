'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Fingerprint } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { Button } from '@/components/ui/primitives';
import { readPrefs, usePrefs } from '@/lib/fx';
import { isNative } from '@/lib/native';
import { addDays, firstName, ymd } from '@/lib/utils';
import { AtlasGlyph } from './Intro';

/* ───────── Digital ───────── */
export async function biometricAvailable(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
    const r = await BiometricAuth.checkBiometry();
    return r.isAvailable || r.deviceIsSecure;
  } catch { return false; }
}
export async function authenticate(reason = 'Desbloquear o Vivalo'): Promise<boolean> {
  if (!isNative()) return true;
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
    await BiometricAuth.authenticate({ reason, androidTitle: 'Vivalo', androidSubtitle: reason, allowDeviceCredential: true, cancelTitle: 'Cancelar' });
    return true;
  } catch { return false; }
}
/** Pede a digital para áreas privadas (cofre, diário de emoções) quando o modo é "só o privado". */
let privateUntil = 0;
export async function unlockPrivate(): Promise<boolean> {
  const p = readPrefs();
  if (p.lock === 'off' || Date.now() < privateUntil) return true;
  const ok = await authenticate('Abrir área privada');
  if (ok) privateUntil = Date.now() + 5 * 60_000;
  return ok;
}

/** Tela de bloqueio ao abrir o app e ao voltar depois de 1 minuto. */
export function LockGate() {
  const { prefs } = usePrefs();
  const [locked, setLocked] = useState(false);
  const hiddenAt = useRef<number | null>(null);
  const trying = useRef(false);
  const tryUnlock = async () => {
    if (trying.current) return;
    trying.current = true;
    const ok = await authenticate();
    trying.current = false;
    if (ok) setLocked(false);
  };
  useEffect(() => {
    if (readPrefs().lock !== 'app' || !isNative()) return;
    setLocked(true);
    window.setTimeout(tryUnlock, 400);
    const on = () => {
      if (document.visibilityState === 'hidden') hiddenAt.current = Date.now();
      else if (hiddenAt.current && Date.now() - hiddenAt.current > 60_000 && readPrefs().lock === 'app') {
        setLocked(true);
        window.setTimeout(tryUnlock, 250);
      }
    };
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.lock]);
  return (
    <AnimatePresence>
      {locked && (
        <motion.div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-[#030303] text-white" initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.04 }}>
          <AtlasGlyph size={92} />
          <p className="mt-6 text-[20px] font-bold">Vivalo está bloqueado</p>
          <p className="mt-1 text-[14px] text-white/50">Use a digital ou o PIN do celular</p>
          <Button className="mt-8 h-12 !bg-white px-6 !text-black" onClick={tryUnlock}><Fingerprint size={18} /> Desbloquear</Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───────── Modo discreto: esconde valores em R$ ───────── */
const originals = new WeakMap<Text, string>();
const MONEY = /R\$\s?-?[\d.]+(,\d{2})?/g;
function mask(root: Node) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = w.nextNode())) {
    const t = n as Text;
    if (t.parentElement?.closest('input,textarea,[data-no-discreet]')) continue;
    const v = t.nodeValue ?? '';
    if (MONEY.test(v)) {
      MONEY.lastIndex = 0;
      if (!originals.has(t)) originals.set(t, v);
      t.nodeValue = v.replace(MONEY, 'R$ •••');
    }
    MONEY.lastIndex = 0;
  }
}
function unmask(root: Node) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = w.nextNode())) {
    const t = n as Text;
    const o = originals.get(t);
    if (o !== undefined) { t.nodeValue = o; originals.delete(t); }
  }
}
export function DiscreetMode() {
  const { prefs } = usePrefs();
  useEffect(() => {
    document.documentElement.classList.toggle('discreet', prefs.discreet);
    if (!prefs.discreet) { unmask(document.body); return; }
    mask(document.body);
    const mo = new MutationObserver((ms) => {
      mo.disconnect();
      ms.forEach((m) => { if (m.type === 'characterData') { const t = m.target as Text; originals.delete(t); } mask(m.target.nodeType === 3 ? m.target.parentNode ?? document.body : m.target); });
      mo.observe(document.body, { subtree: true, childList: true, characterData: true });
    });
    mo.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => mo.disconnect();
  }, [prefs.discreet]);
  return null;
}

/* ───────── Tamanho do texto ───────── */
export function TextScale() {
  const { prefs } = usePrefs();
  useEffect(() => {
    const s = prefs.textScale || 1;
    (document.body.style as CSSStyleDeclaration & { zoom: string }).zoom = s === 1 ? '' : String(s);
  }, [prefs.textScale]);
  return null;
}

/* ───────── Tema da estação / datas especiais ───────── */
export function useSeason() {
  const { rows, me, partner, couple } = useAtlas();
  const today = new Date();
  const md = ymd(today).slice(5);
  const special = rows('special_dates').find((d) => d.date.slice(5) === md && ['casamento', 'aniversario', 'namoro'].includes(d.kind));
  if (special) {
    const years = today.getFullYear() - Number(special.date.slice(0, 4));
    if (special.kind === 'casamento') return { emoji: '💍', title: `Feliz aniversário de casamento${years > 0 ? ` · ${years} ano${years > 1 ? 's' : ''}` : ''}!`, colors: ['#F472B6', '#E9C46A'], party: true };
    if (special.kind === 'namoro') return { emoji: '❤️', title: 'Hoje é aniversário de namoro de vocês!', colors: ['#F43F5E', '#F472B6'], party: true };
    return { emoji: '🎂', title: `Hoje é dia de festa: ${special.title}!`, colors: ['#E9C46A', '#10B981'], party: true };
  }
  if (couple?.startedAt && couple.startedAt.slice(5, 10) === md) return { emoji: '💍', title: 'Hoje é um dia especial para vocês dois!', colors: ['#F472B6', '#E9C46A'], party: true };
  const m = today.getMonth() + 1, d = today.getDate();
  if (m === 12 && d >= 1) return { emoji: d >= 24 && d <= 25 ? '🎄' : '✨', title: d >= 24 && d <= 25 ? 'Feliz Natal! Jesus é o melhor presente.' : 'Tempo de Advento: preparando o coração para o Natal', colors: ['#DC2626', '#10B981'], party: d === 25 };
  if (m === 1 && d <= 3) return { emoji: '🎆', title: 'Feliz ano novo! Que tal definir as metas do ano juntos?', colors: ['#E9C46A', '#60A5FA'], party: d === 1 };
  if (m === 6 && d === 12) return { emoji: '💘', title: 'Feliz Dia dos Namorados!', colors: ['#F43F5E', '#F472B6'], party: true };
  void me; void partner; void addDays;
  return null;
}
export function SeasonBanner() {
  const s = useSeason();
  useEffect(() => {
    if (!s?.party) return;
    const k = `atlas:party:${ymd()}`;
    try { if (localStorage.getItem(k)) return; localStorage.setItem(k, '1'); } catch { /* noop */ }
    const t = window.setTimeout(() => window.dispatchEvent(new CustomEvent('atlas:celebrate', { detail: s.emoji })), 2600);
    return () => window.clearTimeout(t);
  }, [s?.party, s?.emoji]);
  if (!s) return null;
  return (
    <div className="relative mb-6 overflow-hidden rounded-[24px] p-4 text-white" style={{ background: `linear-gradient(120deg, ${s.colors[0]}, ${s.colors[1]})` }}>
      <p className="text-[24px]">{s.emoji}</p>
      <p className="mt-1 text-[16px] font-bold leading-snug">{s.title}</p>
    </div>
  );
}
export { firstName };
