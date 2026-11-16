'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useIsland } from '@/components/island/IslandProvider';
import { MOODS, WATER_GOAL, WATER_STEP } from '@/lib/constants';
import { TABLES, deleteRow, emptyDB, ensureCouple, insertNudge, joinCouple as rpcJoin, loadAll, saveCouple, saveRow, subscribeAll } from '@/lib/db';
import { createDemoData } from '@/lib/demo-data';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { AtlasState, Couple, HabitKey, HabitLog, Profile, TableName, Tables } from '@/lib/types';
import { firstName, money, uid, ymd } from '@/lib/utils';

const DEMO_KEY = 'my-atlas:demo:v2';
type Status = 'loading' | 'ready' | 'unauthenticated' | 'error';

interface AtlasCtx {
  mode: 'demo' | 'supabase';
  status: Status;
  error: string | null;
  state: AtlasState | null;
  me: Profile | null;
  partner: Profile | null;
  couple: Couple | null;
  rows: <K extends TableName>(t: K) => Tables[K][];
  save: <K extends TableName>(t: K, row: Tables[K]) => void;
  patch: <K extends TableName>(t: K, id: string, partial: Partial<Tables[K]>) => void;
  remove: (t: TableName, id: string) => void;
  updateCouple: (partial: Partial<Couple>) => void;
  nameOf: (id: string | null | undefined) => string;
  todayHabit: (profileId: string) => HabitLog;
  toggleHabit: (k: HabitKey) => void;
  addWater: (ml?: number) => void;
  sendNudge: (kind: 'carinho' | 'cutucao') => void;
  switchPerspective: () => void;
  resetDemo: () => void;
  joinCouple: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AtlasCtx | null>(null);

export function AtlasProvider({ children }: { children: ReactNode }) {
  const island = useIsland();
  const mode: 'demo' | 'supabase' = isSupabaseConfigured ? 'supabase' : 'demo';
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<AtlasState | null>(null);
  const ref = useRef<AtlasState | null>(null);
  ref.current = state;
  const pushRef = useRef(island.push);
  pushRef.current = island.push;
  const sb = useMemo(() => getSupabase(), []);

  const nameOf = useCallback((id: string | null | undefined) => {
    if (!id) return 'Nós dois';
    return firstName(ref.current?.db.profiles.find((p) => p.id === id)?.displayName ?? 'Seu par');
  }, []);

  /* ───────── carga inicial ───────── */
  useEffect(() => {
    if (mode === 'demo') {
      let s: AtlasState | null = null;
      try {
        const raw = localStorage.getItem(DEMO_KEY);
        if (raw) s = JSON.parse(raw);
      } catch { /* noop */ }
      if (s) s.db = { ...emptyDB(), ...s.db };
      setState(s ?? createDemoData());
      setStatus('ready');
      island.setSync('demo');
      return;
    }
    let unsub = () => {};
    let cancelled = false;
    (async () => {
      const { data: { session } } = await sb!.auth.getSession();
      if (!session) return setStatus('unauthenticated');
      try {
        island.setSync('syncing');
        const coupleId = await ensureCouple(sb!);
        const { couple, db } = await loadAll(sb!, coupleId);
        if (cancelled) return;
        setState({ couple, db, meId: session.user.id });
        setStatus('ready');
        unsub = subscribeAll(sb!, coupleId, onRemote(session.user.id), (ok) => island.setSync(ok ? 'synced' : 'offline'));
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'Falha ao carregar dados');
        setStatus('error');
        island.setSync('offline');
      }
    })();
    return () => {
      cancelled = true;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode === 'demo' && state) {
      try {
        localStorage.setItem(DEMO_KEY, JSON.stringify(state));
      } catch { /* noop */ }
    }
  }, [state, mode]);

  /* ───────── realtime: muda o estado e avisa na Atlas Island ───────── */
  /* eslint-disable @typescript-eslint/no-explicit-any */
  function onRemote(myId: string) {
    return (table: string, type: 'INSERT' | 'UPDATE' | 'DELETE', row: any, oldId?: string) => {
      const prev = ref.current;
      if (table === 'couples') {
        setState((s) => (s ? { ...s, couple: { ...s.couple, ...row } } : s));
        return;
      }
      if (table === 'nudges') {
        if (type !== 'INSERT' || row.fromProfile === myId || (row.toProfile && row.toProfile !== myId)) return;
        const n = nameOf(row.fromProfile);
        pushRef.current({
          kind: 'nudge',
          title: row.kind === 'carinho' ? `${n} te mandou um carinho 🤍` : `${n} te cutucou 👉`,
          subtitle: row.kind === 'carinho' ? 'Pensando em você agora.' : 'Ei! Dá uma olhadinha aqui.',
          avatar: { name: n },
          actions: [{ label: 'Retribuir', primary: true, onClick: () => nudgeRef.current('carinho') }, { label: 'Fechar' }],
          duration: 8000,
        });
        return;
      }
      if (!TABLES.includes(table as TableName)) return;
      const t = table as TableName;
      const existing = (prev?.db[t] as any[] | undefined)?.find((x) => x.id === (row?.id ?? oldId));
      setState((s) => {
        if (!s) return s;
        const list = s.db[t] as any[];
        const next = type === 'DELETE' ? list.filter((x) => x.id !== oldId) : existing ? list.map((x) => (x.id === row.id ? row : x)) : [...list, row];
        return { ...s, db: { ...s.db, [t]: next } };
      });
      if (type === 'DELETE') return;
      const author = row.createdBy ?? row.walkedBy;
      const fromPartner = author && author !== myId;
      const who = nameOf(author);
      if (t === 'profiles' && row.id !== myId && existing && existing.mood !== row.mood) {
        pushRef.current({
          kind: 'mood',
          title: `${firstName(row.displayName)} está ${MOODS[row.mood as keyof typeof MOODS].label.toLowerCase()} ${MOODS[row.mood as keyof typeof MOODS].emoji}`,
          subtitle: `Bateria mental em ${row.mentalBattery}%`,
          avatar: { name: row.displayName, url: row.avatarUrl },
          actions: [{ label: 'Enviar carinho', primary: true, onClick: () => nudgeRef.current('carinho') }, { label: 'Ok' }],
        });
      }
      if (type !== 'INSERT' || !fromPartner) return;
      if (t === 'transactions')
        pushRef.current({ kind: 'expense', title: `${row.type === 'expense' ? 'Nova despesa' : 'Nova entrada'}: ${money(row.amount)}`, subtitle: `${who} · ${row.description}`, avatar: { name: who } });
      if (t === 'events') pushRef.current({ kind: 'agenda', title: `${who} marcou: ${row.title}`, subtitle: new Date(row.startsAt).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) });
      if (t === 'tasks' && (row.assignee === myId || !row.assignee)) pushRef.current({ kind: 'task', title: `Nova tarefa${row.assignee ? ' para você' : ' para vocês'}`, subtitle: row.title });
      if (t === 'shopping_items') pushRef.current({ kind: 'shopping', title: `${who} adicionou à lista`, subtitle: row.name, duration: 3000 });
      if (t === 'prayers') pushRef.current({ kind: 'prayer', title: `${who} pediu oração 🙏`, subtitle: row.title });
      if (t === 'pet_walks') pushRef.current({ kind: 'pet', title: `${who} levou o Atlas para passear 🐾`, subtitle: 'Passeio do dia registrado' });
      if (t === 'notes' && !row.parentId) pushRef.current({ kind: 'sync', title: `${who} criou uma nota`, subtitle: row.title || 'Sem título', duration: 3000 });
    };
  }

  /* ───────── CRUD genérico ───────── */
  const write = useCallback(
    (fn: () => Promise<unknown>) => {
      if (mode !== 'supabase' || !sb) return;
      island.setSync('syncing');
      fn()
        .then(() => island.setSync('synced'))
        .catch((e) => {
          console.error(e);
          island.setSync('offline');
          pushRef.current({ kind: 'sync', title: 'Não consegui salvar', subtitle: e?.message ?? 'Verifique sua conexão.', duration: 4000 });
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, sb],
  );

  const save = useCallback(<K extends TableName>(t: K, row: Tables[K]) => {
    const s = ref.current;
    if (!s) return;
    const list = s.db[t] as Tables[K][];
    const exists = list.some((x) => (x as { id: string }).id === (row as { id: string }).id);
    const next = exists ? list.map((x) => ((x as { id: string }).id === (row as { id: string }).id ? row : x)) : [...list, row];
    const ns = { ...s, db: { ...s.db, [t]: next } };
    ref.current = ns;
    setState(ns);
    write(() => saveRow(sb!, t, row as any, s.couple.id));
  }, [write, sb]);

  const patch = useCallback(<K extends TableName>(t: K, id: string, partial: Partial<Tables[K]>) => {
    const cur = (ref.current?.db[t] as any[] | undefined)?.find((x) => x.id === id);
    if (cur) save(t, { ...cur, ...partial });
  }, [save]);

  const remove = useCallback((t: TableName, id: string) => {
    const s = ref.current;
    if (!s) return;
    const ns = { ...s, db: { ...s.db, [t]: (s.db[t] as any[]).filter((x) => x.id !== id) } };
    ref.current = ns;
    setState(ns);
    write(() => deleteRow(sb!, t, id));
  }, [write, sb]);

  const updateCouple = useCallback((partial: Partial<Couple>) => {
    const s = ref.current;
    if (!s) return;
    const couple = { ...s.couple, ...partial };
    setState({ ...s, couple });
    write(() => saveCouple(sb!, couple));
  }, [write, sb]);

  /* ───────── helpers de domínio ───────── */
  const me = state?.db.profiles.find((p) => p.id === state.meId) ?? null;
  const partner: Profile | null = state
    ? state.db.profiles.find((p) => p.id !== state.meId) ??
      { id: 'pending', role: me?.role === 'A' ? 'B' : 'A', displayName: 'Convide seu par', mood: 'em_paz', mentalBattery: 0, updatedAt: new Date().toISOString(), pending: true }
    : null;

  const todayHabit = useCallback(
    (profileId: string): HabitLog =>
      state?.db.habit_logs.find((h) => h.profileId === profileId && h.logDate === ymd()) ?? {
        id: uid(), profileId, logDate: ymd(), devotional: false, workout: false, cleanDiet: false, reading: false, waterMl: 0,
      },
    [state],
  );
  const myHabit = () => {
    const s = ref.current!;
    return s.db.habit_logs.find((h) => h.profileId === s.meId && h.logDate === ymd()) ?? {
      id: uid(), profileId: s.meId, logDate: ymd(), devotional: false, workout: false, cleanDiet: false, reading: false, waterMl: 0,
    };
  };
  const toggleHabit = useCallback((k: HabitKey) => {
    if (!ref.current) return;
    const h = myHabit();
    save('habit_logs', { ...h, [k]: !h[k], updatedAt: new Date().toISOString() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save]);
  const addWater = useCallback((ml = WATER_STEP) => {
    if (!ref.current) return;
    const h = myHabit();
    const water = Math.max(0, h.waterMl + ml);
    save('habit_logs', { ...h, waterMl: water, updatedAt: new Date().toISOString() });
    if (ml > 0)
      island.push({ kind: 'water', title: water >= WATER_GOAL ? 'Meta de água batida 💧' : `+${ml}ml de água`, subtitle: `${(water / 1000).toFixed(1)}L de ${(WATER_GOAL / 1000).toFixed(1)}L hoje`, duration: 2400 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save]);

  const sendNudge = useCallback((kind: 'carinho' | 'cutucao') => {
    const s = ref.current;
    if (!s) return;
    const p = s.db.profiles.find((x) => x.id !== s.meId);
    if (!p) {
      island.push({ kind: 'nudge', title: 'Seu par ainda não entrou', subtitle: `Compartilhe o código ${s.couple.inviteCode} em Ajustes.` });
      return;
    }
    island.push({ kind: 'nudge', title: kind === 'carinho' ? `Carinho enviado para ${firstName(p.displayName)} 🤍` : `Você cutucou ${firstName(p.displayName)} 👉`, subtitle: 'Vai aparecer ao redor da câmera dele(a).', duration: 2400 });
    if (mode === 'supabase') write(() => insertNudge(sb!, s.couple.id, s.meId, p.id, kind));
    else
      window.setTimeout(() => {
        pushRef.current({
          kind: 'nudge',
          title: `${firstName(p.displayName)} te mandou um carinho de volta 🤍`,
          subtitle: 'Também tô pensando em você!',
          avatar: { name: p.displayName },
          actions: [{ label: 'Retribuir', primary: true, onClick: () => nudgeRef.current('carinho') }, { label: 'Fechar' }],
          duration: 7000,
        });
      }, 3200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, write, sb]);
  const nudgeRef = useRef(sendNudge);
  nudgeRef.current = sendNudge;

  const switchPerspective = useCallback(() => {
    const s = ref.current;
    const other = s?.db.profiles.find((p) => p.id !== s.meId);
    if (!s || !other || mode !== 'demo') return;
    setState({ ...s, meId: other.id });
    island.push({ kind: 'sync', title: `Vendo como ${firstName(other.displayName)}`, subtitle: 'Modo demo · troca de perspectiva', duration: 2400 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const resetDemo = useCallback(() => {
    localStorage.removeItem(DEMO_KEY);
    setState(createDemoData());
    island.push({ kind: 'success', title: 'Dados de demonstração restaurados', duration: 2400 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const joinCouple = useCallback(async (code: string) => {
    if (!sb) return;
    await rpcJoin(sb, code);
    window.location.reload();
  }, [sb]);
  const signOut = useCallback(async () => {
    if (sb) await sb.auth.signOut();
    window.location.href = '/login';
  }, [sb]);

  /* ───────── lembrete de água ───────── */
  const addWaterRef = useRef(addWater);
  addWaterRef.current = addWater;
  useEffect(() => {
    if (status !== 'ready') return;
    const remind = () => {
      const s = ref.current;
      if (!s) return;
      const h = new Date().getHours();
      if (h < 7 || h > 22) return;
      const water = s.db.habit_logs.find((x) => x.profileId === s.meId && x.logDate === ymd())?.waterMl ?? 0;
      if (water >= WATER_GOAL) return;
      pushRef.current({
        kind: 'water',
        title: 'Hora de beber 500ml de água 💧',
        subtitle: `Você está em ${(water / 1000).toFixed(1)}L de ${(WATER_GOAL / 1000).toFixed(1)}L`,
        actions: [{ label: '+500ml', primary: true, onClick: () => addWaterRef.current(WATER_STEP) }, { label: 'Depois' }],
        duration: 9000,
      });
    };
    const first = window.setTimeout(remind, 60_000);
    const every = window.setInterval(remind, 90 * 60_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
    };
  }, [status]);

  const rows = useCallback(<K extends TableName>(t: K) => (state?.db[t] ?? []) as Tables[K][], [state]);

  const value: AtlasCtx = {
    mode, status, error, state, me, partner, couple: state?.couple ?? null,
    rows, save, patch, remove, updateCouple, nameOf, todayHabit, toggleHabit, addWater,
    sendNudge, switchPerspective, resetDemo, joinCouple, signOut,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAtlas() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAtlas fora do AtlasProvider');
  return c;
}
