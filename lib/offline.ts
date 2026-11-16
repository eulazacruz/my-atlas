/* Modo offline: cópia local dos dados + fila de gravações que sobe quando a internet voltar. */
import type { AtlasState, TableName } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type QueueOp =
  | { op: 'save'; table: TableName; row: any; at: number }
  | { op: 'delete'; table: TableName; id: string; at: number }
  | { op: 'couple'; row: any; at: number };

const CACHE = 'my-atlas:cache';
const QUEUE = 'my-atlas:queue';
const LAST = 'my-atlas:last-user';

export function readCache(): AtlasState | null {
  try {
    const uid = localStorage.getItem(LAST);
    if (!uid) return null;
    const raw = localStorage.getItem(`${CACHE}:${uid}`);
    return raw ? (JSON.parse(raw) as AtlasState) : null;
  } catch {
    return null;
  }
}
let cacheTimer: number | undefined;
export function writeCache(s: AtlasState) {
  window.clearTimeout(cacheTimer);
  cacheTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(LAST, s.meId);
      localStorage.setItem(`${CACHE}:${s.meId}`, JSON.stringify(s));
    } catch { /* cheio: ignora */ }
  }, 800);
}
export function clearCache() {
  try {
    const uid = localStorage.getItem(LAST);
    if (uid) {
      localStorage.removeItem(`${CACHE}:${uid}`);
      localStorage.removeItem(`${QUEUE}:${uid}`);
    }
    localStorage.removeItem(LAST);
  } catch { /* noop */ }
}

export function readQueue(uid: string): QueueOp[] {
  try { return JSON.parse(localStorage.getItem(`${QUEUE}:${uid}`) || '[]'); } catch { return []; }
}
export function writeQueue(uid: string, q: QueueOp[]) {
  try { localStorage.setItem(`${QUEUE}:${uid}`, JSON.stringify(q)); } catch { /* noop */ }
}
/** Junta operações repetidas na mesma linha (fica só a última). */
export function enqueue(uid: string, op: QueueOp) {
  const q = readQueue(uid).filter((x) => {
    if (op.op === 'couple') return x.op !== 'couple';
    const key = op.op === 'save' ? op.row.id : op.id;
    if (x.op === 'couple') return true;
    const k2 = x.op === 'save' ? x.row.id : x.id;
    return !(x.table === op.table && k2 === key);
  });
  q.push(op);
  writeQueue(uid, q);
}
export const isNetworkError = (e: any) =>
  (typeof navigator !== 'undefined' && !navigator.onLine) || /fetch|network|timeout|Load failed|ERR_/i.test(String(e?.message ?? e));

/** Aplica a fila pendente sobre os dados que vieram do servidor (para não "voltar no tempo"). */
export function applyQueue(s: AtlasState, q: QueueOp[]): AtlasState {
  const db: any = { ...s.db };
  let couple = s.couple;
  for (const o of q) {
    if (o.op === 'couple') couple = { ...couple, ...o.row };
    else if (o.op === 'save') {
      const list = (db[o.table] ?? []) as any[];
      db[o.table] = list.some((x) => x.id === o.row.id) ? list.map((x) => (x.id === o.row.id ? o.row : x)) : [...list, o.row];
    } else db[o.table] = ((db[o.table] ?? []) as any[]).filter((x) => x.id !== o.id);
  }
  return { ...s, couple, db };
}
