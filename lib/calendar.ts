'use client';
/* Agenda Google (endereço iCal secreto) — eventos vêm da função "calendar" do Supabase. */
import { useEffect, useSyncExternalStore } from 'react';
import { getSupabase } from './supabase';
import type { ExternalEvent } from './types';

const KEY = 'my-atlas:gcal';
interface Store { events: ExternalEvent[]; fetchedAt: string | null; loading: boolean; error: string | null; feeds: { owner: string; ok: boolean; error?: string; count?: number }[] }
let store: Store = { events: [], fetchedAt: null, loading: false, error: null, feeds: [] };
const subs = new Set<() => void>();
const set = (p: Partial<Store>) => {
  store = { ...store, ...p };
  subs.forEach((f) => f());
};
let loaded = false;
function hydrate() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (c) store = { ...store, events: c.events ?? [], fetchedAt: c.fetchedAt ?? null, feeds: c.feeds ?? [] };
  } catch { /* noop */ }
}

export async function refreshCalendar(force = false) {
  hydrate();
  const sb = getSupabase();
  if (!sb || store.loading) return;
  if (!force && store.fetchedAt && Date.now() - new Date(store.fetchedAt).getTime() < 10 * 60_000) return;
  const { data: s } = await sb.auth.getSession();
  if (!s.session) return;
  set({ loading: true, error: null });
  try {
    const { data, error } = await sb.functions.invoke('calendar', { body: {} });
    if (error) throw error;
    set({ events: data.events ?? [], feeds: data.feeds ?? [], fetchedAt: data.fetchedAt ?? new Date().toISOString(), loading: false });
    try { localStorage.setItem(KEY, JSON.stringify({ events: store.events, fetchedAt: store.fetchedAt, feeds: store.feeds })); } catch { /* noop */ }
  } catch (e) {
    set({ loading: false, error: String((e as Error)?.message ?? e) });
  }
}

/** Eventos de demonstração (turnos e compromissos) para o modo demo. */
export function demoExternal(meId: string, partnerId: string): ExternalEvent[] {
  const out: ExternalEvent[] = [];
  for (let i = -3; i < 21; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const wd = d.getDay();
    if (wd >= 1 && wd <= 5) {
      const s = new Date(d); s.setHours(8, 0, 0, 0);
      const e = new Date(d); e.setHours(14, 20, 0, 0);
      out.push({ id: `demo-aec-${i}`, title: 'Turno de trabalho', start: s.toISOString(), end: e.toISOString(), allDay: false, location: 'AeC · Recife', owner: meId });
    }
    if (wd === 2 || wd === 4) {
      const s = new Date(d); s.setHours(18, 30, 0, 0);
      out.push({ id: `demo-b-${i}`, title: 'Academia', start: s.toISOString(), end: null, allDay: false, location: null, owner: partnerId });
    }
  }
  return out;
}

export function useExternalEvents(enabled: boolean) {
  hydrate();
  const s = useSyncExternalStore(
    (f) => { subs.add(f); return () => subs.delete(f); },
    () => store,
    () => store,
  );
  useEffect(() => {
    if (enabled) refreshCalendar();
  }, [enabled]);
  return s;
}

export async function getMyFeed(profileId: string): Promise<string> {
  const sb = getSupabase();
  if (!sb) return '';
  const { data } = await sb.from('calendar_feeds').select('url').eq('id', profileId).maybeSingle();
  return data?.url ?? '';
}
export async function saveMyFeed(profileId: string, coupleId: string, url: string) {
  const sb = getSupabase();
  if (!sb) return;
  if (!url.trim()) {
    await sb.from('calendar_feeds').delete().eq('id', profileId);
  } else {
    const { error } = await sb.from('calendar_feeds').upsert({ id: profileId, couple_id: coupleId, url: url.trim(), updated_at: new Date().toISOString() });
    if (error) throw error;
  }
  await refreshCalendar(true);
}
