'use client';
/* Leitura em voz alta: TextToSpeech nativo do Android (offline) com fallback do navegador. */
import { AtlasNative, isNative } from './native';

let webQueue: SpeechSynthesisUtterance[] = [];
let token = 0;
let rate = 1;
export const setTtsRate = (r: number) => { rate = r; };

export async function speak(parts: string[], onIndex?: (i: number) => void, onEnd?: () => void) {
  await stopSpeak();
  const my = ++token;
  if (isNative()) {
    try {
      const h1 = await AtlasNative.addListener('ttsProgress', (e: { index: number }) => { if (my === token) onIndex?.(e.index); });
      const h2 = await AtlasNative.addListener('ttsEnd', () => { if (my === token) onEnd?.(); h1.remove(); h2.remove(); });
      await AtlasNative.speak({ parts, rate });
      return;
    } catch { /* cai para o navegador */ }
  }
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) { onEnd?.(); return; }
  const voices = window.speechSynthesis.getVoices();
  const pt = voices.find((v) => v.lang === 'pt-BR') ?? voices.find((v) => v.lang.startsWith('pt'));
  webQueue = parts.map((p, i) => {
    const u = new SpeechSynthesisUtterance(p);
    u.lang = 'pt-BR';
    u.rate = rate;
    if (pt) u.voice = pt;
    u.onstart = () => my === token && onIndex?.(i);
    if (i === parts.length - 1) u.onend = () => my === token && onEnd?.();
    return u;
  });
  webQueue.forEach((u) => window.speechSynthesis.speak(u));
}

export async function stopSpeak() {
  token++;
  if (isNative()) { try { await AtlasNative.stopSpeak(); } catch { /* noop */ } }
  try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
  webQueue = [];
}
