// Gera os ícones PNG do PWA no build (sem dependências: SDF + zlib).
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const OUT = new URL('../public/icons/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel((x + 0.5) / size, (y + 0.5) / size, 1 / size);
      const i = y * (size * 4 + 1) + 1 + x * 4;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const clamp = (v) => Math.max(0, Math.min(1, v));
const cov = (d, px) => clamp(0.5 - d / px); // cobertura antialias de um SDF
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const over = (dst, rgb, a) => [...mix(dst.slice(0, 3), rgb, a), Math.max(dst[3], a * 255)];
const sdCircle = (x, y, cx, cy, r) => Math.hypot(x - cx, y - cy) - r;
const sdRing = (x, y, cx, cy, r, w) => Math.abs(sdCircle(x, y, cx, cy, r)) - w / 2;
const sdRoundRect = (x, y, cx, cy, hw, hh, r) => {
  const qx = Math.abs(x - cx) - hw + r;
  const qy = Math.abs(y - cy) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
const sdEllipse = (x, y, cx, cy, rx, ry) => (Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry);

const VIOLET = [139, 92, 246];
const PINK = [244, 114, 182];
const WHITE = [255, 255, 255];

/** Ícone do app: fundo OLED com aurora, globo (Atlas) e a "island" no topo. */
function appIcon(x, y, px) {
  let c = [3, 3, 3, 255];
  const g1 = clamp(1 - Math.hypot(x - 0.3, y - 0.28) / 0.55) ** 2;
  const g2 = clamp(1 - Math.hypot(x - 0.75, y - 0.78) / 0.55) ** 2;
  c = over(c, VIOLET, g1 * 0.55);
  c = over(c, PINK, g2 * 0.45);
  const ringCol = mix(VIOLET.map((v) => v + 60), PINK.map((v) => v + 40), clamp(y)).map((v) => Math.min(255, v));
  c = over(c, ringCol, cov(sdRing(x, y, 0.5, 0.54, 0.27, 0.05), px));
  c = over(c, WHITE, 0.7 * cov(Math.abs(sdEllipse(x, y, 0.5, 0.54, 0.12, 0.27)) - 0.014, px));
  c = over(c, WHITE, 0.7 * cov(sdRoundRect(x, y, 0.5, 0.54, 0.27, 0.014, 0.014), px));
  c = over(c, [0, 0, 0], cov(sdRoundRect(x, y, 0.5, 0.17, 0.15, 0.045, 0.045), px));
  c = over(c, [167, 139, 250], cov(Math.abs(sdRoundRect(x, y, 0.5, 0.17, 0.15, 0.045, 0.045)) - 0.006, px));
  const mask = cov(sdRoundRect(x, y, 0.5, 0.5, 0.5, 0.5, 0.22), px);
  return [...c.slice(0, 3).map(Math.round), Math.round(255 * mask)];
}

const glyphs = {
  breathe: (x, y) =>
    Math.min(
      sdRoundRect(x, y, 0.45, 0.36, 0.17, 0.035, 0.035),
      sdRoundRect(x, y, 0.5, 0.5, 0.22, 0.035, 0.035),
      sdRoundRect(x, y, 0.42, 0.64, 0.14, 0.035, 0.035),
    ),
  expense: (x, y) => Math.min(sdRoundRect(x, y, 0.5, 0.5, 0.2, 0.04, 0.04), sdRoundRect(x, y, 0.5, 0.5, 0.04, 0.2, 0.04)),
  water: (x, y) => {
    const d = sdCircle(x, y, 0.5, 0.57, 0.17);
    const tri = y < 0.57 ? Math.abs(x - 0.5) - (y - 0.27) * 0.55 : 1;
    return Math.min(d, y > 0.27 ? tri : 1);
  },
  nudge: (x, y) => {
    const a = sdCircle(x, y, 0.415, 0.43, 0.105);
    const b = sdCircle(x, y, 0.585, 0.43, 0.105);
    const tri = y > 0.43 && y < 0.72 ? Math.abs(x - 0.5) - (0.72 - y) * 0.68 : 1;
    return Math.min(a, b, tri);
  },
};
const shortcut = (rgb, glyph) => (x, y, px) => {
  const a = cov(sdCircle(x, y, 0.5, 0.5, 0.5), px);
  const g = cov(glyphs[glyph](x, y), px);
  return [...mix(rgb, WHITE, g).map(Math.round), Math.round(255 * a)];
};

const files = {
  'icon-192.png': png(192, appIcon),
  'icon-512.png': png(512, appIcon),
  'shortcut-breathe.png': png(96, shortcut([139, 92, 246], 'breathe')),
  'shortcut-expense.png': png(96, shortcut([16, 185, 129], 'expense')),
  'shortcut-water.png': png(96, shortcut([14, 165, 233], 'water')),
  'shortcut-nudge.png': png(96, shortcut([244, 63, 94], 'nudge')),
};
for (const [name, buf] of Object.entries(files)) writeFileSync(new URL(name, OUT), buf);
console.log('icons ok:', Object.keys(files).join(', '));
