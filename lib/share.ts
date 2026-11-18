'use client';
/* Exportar arquivos e criar cartões para stories. */
import { isNative } from './native';

async function blobToBase64(b: Blob): Promise<string> {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1] ?? '');
    r.readAsDataURL(b);
  });
}

/** Salva/compartilha um arquivo: no Android abre a folha de compartilhar; no navegador baixa. */
export async function shareFile(name: string, data: Blob | string, mime: string, title = 'Vivalo') {
  const blob = typeof data === 'string' ? new Blob([data], { type: mime }) : data;
  if (isNative()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const res = await Filesystem.writeFile({ path: name, data: await blobToBase64(blob), directory: Directory.Cache });
    await Share.share({ title, files: [res.uri], dialogTitle: title }).catch(() => {});
    return;
  }
  const file = new File([blob], name, { type: mime });
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (mime.startsWith('image/') && nav.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return; } catch { /* cancelado → baixa */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ───────── Cartões 1080×1920 para stories ───────── */
export interface StoryCard {
  kicker: string;
  title?: string;
  body: string;
  foot?: string;
  serif?: boolean;
  theme?: 'night' | 'gold' | 'emerald' | 'rose';
  stats?: { v: string; l: string }[];
}
const THEMES = {
  night: { bg: ['#0B0B0D', '#15161A'], glow: 'rgba(16,185,129,0.35)', fg: '#F5F5F7', accent: '#10B981' },
  emerald: { bg: ['#052E22', '#0B1F1A'], glow: 'rgba(124,240,196,0.35)', fg: '#ECFDF5', accent: '#7CF0C4' },
  gold: { bg: ['#F7E7B4', '#E9C46A'], glow: 'rgba(255,255,255,0.5)', fg: '#1C1408', accent: '#7A5A10' },
  rose: { bg: ['#4C0519', '#1F0510'], glow: 'rgba(244,114,182,0.4)', fg: '#FFF1F2', accent: '#F9A8D4' },
};
function wrap(g: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}
const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

export async function drawStory(c: StoryCard): Promise<Blob> {
  const W = 1080, H = 1920;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  const th = THEMES[c.theme ?? 'night'];
  const grd = g.createLinearGradient(0, 0, W, H);
  grd.addColorStop(0, th.bg[0]); grd.addColorStop(1, th.bg[1]);
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  const rg = g.createRadialGradient(W * 0.25, H * 0.3, 0, W * 0.25, H * 0.3, 900);
  rg.addColorStop(0, th.glow); rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  await document.fonts.ready;
  const sans = '"Inter Variable", Inter, system-ui, sans-serif';
  const serif = '"Literata Variable", Georgia, serif';
  const X = 96, MW = W - X * 2;
  let y = 330;
  if (!c.title && !c.stats?.length) {
    g.font = c.serif ? `400 62px ${serif}` : `500 50px ${sans}`;
    const n = Math.min(13, wrap(g, c.body, MW).length);
    const blockH = 90 + n * (c.serif ? 88 : 72) + (c.foot ? 70 : 0);
    y = Math.max(330, Math.round((H - blockH) / 2) - 60);
  }
  g.fillStyle = th.accent;
  g.font = `700 34px ${sans}`;
  g.letterSpacing = '6px';
  g.fillText(c.kicker.toUpperCase(), X, y);
  g.letterSpacing = '0px';
  y += 90;
  g.fillStyle = th.fg;
  if (c.title) {
    g.font = `800 92px ${sans}`;
    for (const l of wrap(g, c.title, MW).slice(0, 4)) { g.fillText(l, X, y); y += 104; }
    y += 30;
  }
  if (c.stats?.length) {
    c.stats.slice(0, 6).forEach((s, i) => {
      const cx = X + (i % 2) * (MW / 2), cy = y + Math.floor(i / 2) * 230;
      g.fillStyle = th.fg; g.font = `800 120px ${sans}`; g.fillText(s.v, cx, cy + 100);
      g.globalAlpha = 0.6; g.font = `500 34px ${sans}`; g.fillText(s.l, cx, cy + 150); g.globalAlpha = 1;
    });
    y += Math.ceil(c.stats.length / 2) * 230 + 20;
  }
  if (c.body) {
    g.fillStyle = th.fg;
    g.font = c.serif ? `400 62px ${serif}` : `500 50px ${sans}`;
    const lh = c.serif ? 88 : 72;
    const lines = wrap(g, c.body, MW).slice(0, c.title ? 10 : 13);
    for (const l of lines) { g.fillText(l, X, y); y += lh; }
  }
  if (c.foot) {
    y += 30;
    g.globalAlpha = 0.65; g.font = `600 38px ${sans}`; g.fillText(c.foot, X, y); g.globalAlpha = 1;
  }
  try {
    const icon = await loadImg(c.theme === 'gold' ? '/icons/icon-day.png' : '/icons/icon-night.png');
    g.drawImage(icon, X, H - 250, 110, 110);
  } catch { /* sem ícone */ }
  g.fillStyle = th.fg;
  g.font = `800 44px ${sans}`;
  g.fillText('Vivalo', X + 140, H - 190);
  g.globalAlpha = 0.55; g.font = `500 30px ${sans}`; g.fillText('Life & Couple OS', X + 140, H - 148); g.globalAlpha = 1;
  return new Promise((res) => cv.toBlob((b) => res(b!), 'image/png'));
}
export async function shareStory(c: StoryCard) {
  const b = await drawStory(c);
  await shareFile(`my-atlas-${Date.now()}.png`, b, 'image/png', 'Compartilhar nos stories');
}

/* ───────── Exportações ───────── */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function toCSV(rows: Record<string, any>[]) {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const esc = (v: any) => { const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return '﻿' + [keys.join(';'), ...rows.map((r) => keys.map((k) => esc(r[k])).join(';'))].join('\n');
}
export async function makePdf(title: string, sections: { heading: string; meta?: string; text: string }[]): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const M = 54, W = 595 - M * 2;
  let y = 70;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.text(title, M, y); y += 18;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(120); doc.text(`Vivalo · exportado em ${new Date().toLocaleDateString('pt-BR')}`, M, y); y += 30;
  doc.setTextColor(20);
  for (const s of sections) {
    const body = doc.splitTextToSize(s.text || '—', W) as string[];
    const need = 40 + body.length * 14;
    if (y + Math.min(need, 200) > 800) { doc.addPage(); y = 64; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text(doc.splitTextToSize(s.heading, W), M, y); y += 16;
    if (s.meta) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(120); doc.text(s.meta, M, y); doc.setTextColor(20); y += 14; }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    for (const l of body) { if (y > 800) { doc.addPage(); y = 64; } doc.text(l, M, y); y += 14; }
    y += 18;
  }
  return doc.output('blob');
}
