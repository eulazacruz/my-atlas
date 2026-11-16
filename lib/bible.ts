/* Bíblia Livre (Almeida 1819, rev. 2018) — CC BY 4.0 BR. Arquivos em /public/bible/<livro>.json */
import BOOKS_JSON from './bible-books.json';
import type { BibleRead } from './types';

export interface BibleBook { id: number; name: string; abbr: string; chapters: number; nt: boolean }
export const BOOKS = BOOKS_JSON as BibleBook[];
export const bookOf = (id: number) => BOOKS[id - 1];
export const BIBLE_ATTRIBUTION = 'Bíblia Livre (BLIVRE) © 2018 Diego Santos, Mario Sérgio e Marco Teles — licença CC BY 4.0 BR.';

const cache = new Map<number, Promise<string[][]>>();
export function loadBook(id: number): Promise<string[][]> {
  if (!cache.has(id)) {
    const p = fetch(`/bible/${id}.json`).then((r) => {
      if (!r.ok) throw new Error('livro');
      return r.json();
    });
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return cache.get(id)!;
}

export const refLabel = (book: number, chapter: number, verse?: number) => `${bookOf(book)?.name ?? ''} ${chapter}${verse ? `:${verse}` : ''}`;

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** "jo 3:16", "João 3", "1 co 13 4", "salmos 23" → referência */
export function parseRef(q: string): { book: number; chapter: number; verse?: number } | null {
  const m = norm(q).match(/^([1-3]?\s?[a-z]+)\.?\s*(\d+)?(?:[:.\s](\d+))?$/);
  if (!m) return null;
  const key = m[1].replace(/\s/g, '');
  const book =
    BOOKS.find((b) => norm(b.abbr).replace(/\s/g, '') === key) ||
    BOOKS.find((b) => norm(b.name).replace(/\s/g, '') === key) ||
    BOOKS.find((b) => norm(b.name).replace(/\s/g, '').startsWith(key) && key.length >= 2);
  if (!book) return null;
  const chapter = Math.min(book.chapters, Math.max(1, Number(m[2] || 1)));
  return { book: book.id, chapter, verse: m[3] ? Number(m[3]) : undefined };
}

export interface SearchHit { book: number; chapter: number; verse: number; text: string }
/** Busca por palavras em toda a Bíblia (carrega os livros sob demanda). */
export async function searchBible(q: string, limit = 80, onProgress?: (hits: SearchHit[]) => void): Promise<SearchHit[]> {
  const terms = norm(q).split(' ').filter((t) => t.length > 1);
  if (!terms.length) return [];
  const hits: SearchHit[] = [];
  for (const b of BOOKS) {
    const chs = await loadBook(b.id);
    chs.forEach((vs, ci) =>
      vs.forEach((t, vi) => {
        if (hits.length >= limit) return;
        const n = norm(t);
        if (terms.every((x) => n.includes(x))) hits.push({ book: b.id, chapter: ci + 1, verse: vi + 1, text: t });
      }),
    );
    onProgress?.([...hits]);
    if (hits.length >= limit) break;
  }
  return hits;
}

/* ───────── Planos de leitura a dois ───────── */
export const PLANS = [
  { id: 'nt', name: 'Novo Testamento', hint: '1 capítulo por dia · 260 dias', books: BOOKS.filter((b) => b.nt).map((b) => b.id), days: 0 },
  { id: 'ev', name: 'Evangelhos', hint: '1 capítulo por dia · 89 dias', books: [40, 41, 42, 43], days: 0 },
  { id: 'sl', name: 'Salmos & Provérbios', hint: '1 capítulo por dia · 181 dias', books: [19, 20], days: 0 },
  { id: 'all', name: 'Bíblia em 1 ano', hint: '3 a 4 capítulos por dia · 365 dias', books: BOOKS.map((b) => b.id), days: 365 },
] as const;
export type PlanId = (typeof PLANS)[number]['id'];

export function planChapters(id: string): { book: number; chapter: number }[] {
  const p = PLANS.find((x) => x.id === id) ?? PLANS[0];
  return p.books.flatMap((b) => Array.from({ length: bookOf(b).chapters }, (_, i) => ({ book: b, chapter: i + 1 })));
}
export function planDay(startDate: string, date = new Date()) {
  const s = new Date(`${startDate}T00:00:00`);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((d.getTime() - s.getTime()) / 86_400_000);
}
export function readingFor(planId: string, startDate: string, date = new Date()) {
  const all = planChapters(planId);
  const p = PLANS.find((x) => x.id === planId) ?? PLANS[0];
  const days = p.days || all.length;
  const i = planDay(startDate, date);
  if (i < 0 || i >= days) return { day: i + 1, days, chapters: [] as { book: number; chapter: number }[], done: i >= days };
  const a = Math.round((i * all.length) / days);
  const b = Math.round(((i + 1) * all.length) / days);
  return { day: i + 1, days, chapters: all.slice(a, Math.max(b, a + 1)), done: false };
}
export const hasRead = (reads: BibleRead[], profileId: string, book: number, chapter: number) =>
  reads.some((r) => r.profileId === profileId && r.book === book && r.chapter === chapter);

export const MARK_COLORS: Record<string, { label: string; bg: string; dot: string }> = {
  gold: { label: 'Dourado', bg: 'rgba(233,196,106,0.28)', dot: '#E9C46A' },
  green: { label: 'Verde', bg: 'rgba(16,185,129,0.24)', dot: '#10B981' },
  blue: { label: 'Azul', bg: 'rgba(96,165,250,0.26)', dot: '#60A5FA' },
  rose: { label: 'Rosa', bg: 'rgba(244,114,182,0.24)', dot: '#F472B6' },
};
