/* Camada genérica do Supabase: carga, gravação e realtime para todas as tabelas. */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Couple, DB, TableName } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

export const TABLES: TableName[] = [
  'profiles', 'mood_logs', 'habit_logs', 'transactions', 'pets', 'pet_walks', 'pet_vaccines',
  'cycle_settings', 'cycle_days', 'intimacy_logs', 'events', 'tasks', 'notes',
  'shopping_items', 'special_dates', 'goals', 'prayers',
  'household_tasks', 'pet_virtual_state', 'sleep_logs', 'caffeine_logs', 'vault_items', 'locations',
  'bible_marks', 'bible_reads', 'bible_plan', 'checkins', 'entries',
];

const NUMERIC = new Set(['amount', 'target', 'current', 'monthlyBudget', 'temperature', 'lat', 'lng', 'accuracy', 'speed']);
const camel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

export function fromRow<T>(r: Row): T {
  const o: Row = {};
  for (const [k, v] of Object.entries(r)) {
    const key = camel(k);
    o[key] = NUMERIC.has(key) && v !== null ? Number(v) : v;
  }
  return o as T;
}
export function toRow(o: Row): Row {
  const r: Row = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined && k !== 'pending') r[snake(k)] = v;
  return r;
}

export const emptyDB = (): DB => Object.fromEntries(TABLES.map((t) => [t, []])) as unknown as DB;

export async function ensureCouple(sb: SupabaseClient): Promise<string> {
  const { data, error } = await sb.rpc('ensure_couple');
  if (error) throw error;
  return data as string;
}
export async function joinCouple(sb: SupabaseClient, code: string) {
  const { error } = await sb.rpc('join_couple', { p_code: code });
  if (error) throw error;
}

export async function loadAll(sb: SupabaseClient, coupleId: string): Promise<{ couple: Couple; db: DB }> {
  const [c, ...results] = await Promise.all([
    sb.from('couples').select('*').eq('id', coupleId).single(),
    ...TABLES.map((t) => sb.from(t).select('*').eq('couple_id', coupleId)),
  ]);
  if (c.error) throw c.error;
  const db = emptyDB() as unknown as Record<TableName, unknown[]>;
  results.forEach((res, i) => {
    if (res.error) throw res.error;
    db[TABLES[i]] = (res.data as Row[]).map((r) => fromRow(r));
  });
  return { couple: fromRow<Couple>(c.data as Row), db: db as unknown as DB };
}

export async function saveRow(sb: SupabaseClient, table: TableName, row: Row, coupleId: string) {
  if (table === 'profiles') {
    const { id, coupleId: _c, role: _r, ...rest } = row;
    const { error } = await sb.from('profiles').update(toRow(rest)).eq('id', id);
    if (error) throw error;
    return;
  }
  const data = toRow({ ...row, coupleId });
  // Atualiza primeiro: o "upsert" exige a regra de INSERT (created_by = eu) e falhava quando
  // um editava o registro do outro (visto do instante, curtida, voto, reserva, depósito…).
  const { id: _id, created_by: _cb, ...patch } = data;
  const up = await sb.from(table).update(patch).eq('id', data.id).select('id');
  if (up.error) throw up.error;
  if (up.data && up.data.length > 0) return;
  const { error } = await sb.from(table).insert(data);
  if (error) {
    // corrida: já existia (ex.: duas gravações seguidas) → tenta atualizar de novo
    if ((error as { code?: string }).code === '23505') {
      const again = await sb.from(table).update(patch).eq('id', data.id);
      if (again.error) throw again.error;
      return;
    }
    throw error;
  }
}
export async function deleteRow(sb: SupabaseClient, table: TableName, id: string) {
  const { error } = await sb.from(table).delete().eq('id', id);
  if (error) throw error;
}
export async function saveCouple(sb: SupabaseClient, couple: Partial<Couple> & { id: string }) {
  const { id, inviteCode: _i, ...rest } = couple;
  const { error } = await sb.from('couples').update(toRow(rest)).eq('id', id);
  if (error) throw error;
}
export async function insertNudge(sb: SupabaseClient, coupleId: string, from: string, to: string, kind: string) {
  // tipos estendidos ("Preciso de…", Atlas virtual) vão em `message`; `kind` fica no formato original
  const base = kind === 'carinho' || kind === 'cutucao' ? kind : 'cutucao';
  const { error } = await sb.from('nudges').insert({ couple_id: coupleId, from_profile: from, to_profile: to, kind: base, message: base === kind ? null : kind });
  if (error) throw error;
}

export type ChangeHandler = (table: TableName | 'nudges' | 'couples', type: 'INSERT' | 'UPDATE' | 'DELETE', row: Row | null, oldId?: string) => void;

export function subscribeAll(sb: SupabaseClient, coupleId: string, onChange: ChangeHandler, onStatus: (ok: boolean) => void) {
  let ch = sb.channel(`atlas:${coupleId}`);
  for (const t of [...TABLES, 'nudges'] as const) {
    ch = ch
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: t, filter: `couple_id=eq.${coupleId}` }, (p) => onChange(t, 'INSERT', fromRow(p.new)))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: t, filter: `couple_id=eq.${coupleId}` }, (p) => onChange(t, 'UPDATE', fromRow(p.new)))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: t }, (p) => onChange(t, 'DELETE', null, (p.old as Row)?.id));
  }
  ch = ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${coupleId}` }, (p) => onChange('couples', 'UPDATE', fromRow(p.new)));
  ch.subscribe((s) => onStatus(s === 'SUBSCRIBED'));
  return () => {
    sb.removeChannel(ch);
  };
}

export async function savePushToken(sb: SupabaseClient, coupleId: string, profileId: string, token: string) {
  const { error } = await sb.from('push_tokens').upsert({ token, couple_id: coupleId, profile_id: profileId, platform: 'android', updated_at: new Date().toISOString() });
  if (error) throw error;
}
