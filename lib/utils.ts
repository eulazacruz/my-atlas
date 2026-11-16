export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function uid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/* ───────── datas (sempre no fuso local) ───────── */
export function ymd(d: Date = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function parseYmd(s: string) {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
export function addMonths(d: Date, n: number) {
  const c = new Date(d);
  c.setMonth(c.getMonth() + n);
  return c;
}
export function daysBetween(a: Date, b: Date) {
  const A = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const B = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((B - A) / 86_400_000);
}
export const isSameDay = (a: Date, b: Date) => ymd(a) === ymd(b);

export const WEEK_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function fmtDay(s: string | Date, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }) {
  const d = typeof s === 'string' ? (s.length <= 10 ? parseYmd(s) : new Date(s)) : s;
  return d.toLocaleDateString('pt-BR', opts).replace('.', '');
}
export function hhmm(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
export function relDay(s: string) {
  const n = daysBetween(new Date(), parseYmd(s));
  if (n === 0) return 'Hoje';
  if (n === 1) return 'Amanhã';
  if (n === -1) return 'Ontem';
  if (n > 1 && n < 7) return parseYmd(s).toLocaleDateString('pt-BR', { weekday: 'long' });
  return fmtDay(s);
}
export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  return `há ${Math.floor(diff / 86400)} d`;
}
export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}
/** Próxima ocorrência (anual) de uma data especial. */
export function nextOccurrence(dateStr: string, recurring: boolean) {
  const d = parseYmd(dateStr);
  if (!recurring) return d;
  const today = new Date();
  const n = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (daysBetween(today, n) < 0) n.setFullYear(n.getFullYear() + 1);
  return n;
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const money = (n: number) => brl.format(n);
export const parseMoney = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'));

export function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}
export const firstName = (n: string) => n.split(' ')[0];

export function vibrate(pattern: number | number[] = 12) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* noop */
  }
}
