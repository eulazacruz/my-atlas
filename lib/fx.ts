'use client';
/* Acabamento: preferências do aparelho, sons sintetizados, vibrações próprias e comemorações. */
import { useEffect, useState } from 'react';
import { isNative } from './native';

const KEY = 'my-atlas:prefs';
export interface Prefs {
  sounds: boolean;
  textScale: number; // 1, 1.1, 1.2
  discreet: boolean;
  lock: 'off' | 'app' | 'private';
  intro: boolean;
}
const DEF: Prefs = { sounds: true, textScale: 1, discreet: false, lock: 'off', intro: true };
export function readPrefs(): Prefs {
  try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return DEF; }
}
export function setPrefs(p: Partial<Prefs>) {
  const n = { ...readPrefs(), ...p };
  try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* noop */ }
  window.dispatchEvent(new Event('atlas:prefs'));
  return n;
}
export function usePrefs() {
  const [p, setP] = useState<Prefs>(DEF);
  useEffect(() => {
    setP(readPrefs());
    const on = () => setP(readPrefs());
    window.addEventListener('atlas:prefs', on);
    return () => window.removeEventListener('atlas:prefs', on);
  }, []);
  return { prefs: p, set: setPrefs };
}

/* ───────── Sons (sintetizados, sem arquivos) ───────── */
let ctx: AudioContext | null = null;
const ac = () => {
  if (typeof window === 'undefined') return null;
  try {
    ctx = ctx ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
};
function tone(freq: number, at: number, dur: number, vol = 0.08, type: OscillatorType = 'sine') {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + at);
  g.gain.setValueAtTime(0.0001, c.currentTime + at);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + at);
  o.stop(c.currentTime + at + dur + 0.05);
}
export type Sound = 'done' | 'chime' | 'love' | 'pop' | 'celebrate' | 'intro' | 'calm';
export function playSound(s: Sound) {
  if (!readPrefs().sounds) return;
  switch (s) {
    case 'done': tone(880, 0, 0.18, 0.06); tone(1318.5, 0.07, 0.28, 0.05); break;
    case 'chime': tone(1046.5, 0, 0.5, 0.05); tone(1568, 0.04, 0.6, 0.03); break;
    case 'love': tone(659.3, 0, 0.22, 0.06, 'triangle'); tone(783.99, 0.12, 0.35, 0.05, 'triangle'); break;
    case 'pop': tone(520, 0, 0.08, 0.05, 'triangle'); break;
    case 'celebrate': [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.07, 0.35, 0.05, 'triangle')); break;
    case 'intro': tone(392, 0, 0.9, 0.04); tone(587.33, 0.18, 0.9, 0.035); tone(783.99, 0.36, 1.1, 0.03); break;
    case 'calm': tone(261.63, 0, 1.6, 0.03); tone(392, 0.2, 1.6, 0.02); break;
  }
}

/* ───────── Vibrações com padrão próprio ───────── */
type Pattern = 'love' | 'sos' | 'focusDone' | 'tick' | 'celebrate';
const PATTERNS: Record<Pattern, number[]> = {
  love: [0, 30, 90, 30],
  sos: [0, 420],
  focusDone: [0, 40, 70, 40, 70, 40],
  tick: [0, 10],
  celebrate: [0, 25, 50, 25, 50, 60],
};
export async function vibe(p: Pattern) {
  const seq = PATTERNS[p];
  if (!isNative()) { try { navigator.vibrate?.(seq.slice(1)); } catch { /* noop */ } return; }
  const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
  // sequência de pulsos: índices ímpares vibram, pares esperam
  for (let i = 1; i < seq.length; i++) {
    if (i % 2 === 1) {
      if (seq[i] >= 200) await Haptics.vibrate({ duration: seq[i] });
      else await Haptics.impact({ style: seq[i] >= 40 ? ImpactStyle.Heavy : seq[i] >= 25 ? ImpactStyle.Medium : ImpactStyle.Light });
    } else await new Promise((r) => setTimeout(r, seq[i]));
  }
}

/* ───────── Comemorações ───────── */
export function celebrate(title?: string) {
  window.dispatchEvent(new CustomEvent('atlas:celebrate', { detail: title }));
  playSound('celebrate');
  vibe('celebrate');
}
