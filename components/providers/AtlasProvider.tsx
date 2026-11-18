'use client';

import { bookOf } from '@/lib/bible';
import { playSound, vibe } from '@/lib/fx';
import { applyQueue, clearCache, enqueue, isNetworkError, readCache, readQueue, writeCache, writeQueue, type QueueOp } from '@/lib/offline';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useIsland } from '@/components/island/IslandProvider';
import { CONTEXT_STATUS, HOUSE_TASKS, MOODS, NEEDS, PET_ACTIONS, statusOf, WATER_GOAL, WATER_STEP, type NeedKind, type PetActionKind } from '@/lib/constants';
import { haptic, notifyNow } from '@/lib/native';
import { activeSleep, fmtDuration } from '@/lib/body';
import { TABLES, deleteRow, emptyDB, ensureCouple, insertNudge, joinCouple as rpcJoin, loadAll, saveCouple, saveRow, subscribeAll } from '@/lib/db';
import { createDemoData } from '@/lib/demo-data';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { AtlasState, Couple, HabitKey, HabitLog, Profile, TableName, Tables } from '@/lib/types';
void CONTEXT_STATUS;
import { firstName, money, uid, ymd } from '@/lib/utils';

const bookName = (id: number) => bookOf(id)?.name ?? '';
const DEMO_KEY = 'my-atlas:demo:v4';
export type NudgeKind = 'carinho' | 'cutucao' | NeedKind | PetActionKind;
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
  sendNudge: (kind: NudgeKind) => void;
  setContextStatus: (v: string) => void;
  petAction: (kind: PetActionKind) => void;
  logHousehold: (task: string) => void;
  startSleep: () => void;
  finishSleep: (confirm: boolean, at?: Date) => void;
  addCaffeine: (mg: number, kind: string) => void;
  alert: (e: Parameters<ReturnType<typeof useIsland>['push']>[0]) => void;
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
  pushRef.current = (e) => {
    island.push(e);
    const love = /carinho|lambida|colo|🤍|❤/.test(e.title);
    const sos = /precisa de você agora|ansiedade/i.test(e.title);
    if (sos) { vibe('sos'); playSound('calm'); }
    else if (love) { vibe('love'); playSound('love'); }
    else if (e.kind === 'sync') haptic('light');
    else { haptic('success'); playSound('chime'); }
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') notifyNow(e.title, e.subtitle ?? '');
  };
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
      const cached = readCache();
      let session = null as Awaited<ReturnType<NonNullable<typeof sb>['auth']['getSession']>>['data']['session'];
      try { session = (await sb!.auth.getSession()).data.session; } catch { /* offline */ }
      const uid = session?.user.id ?? (cached && !navigator.onLine ? cached.meId : null);
      if (!uid) return setStatus('unauthenticated');
      // 1) abre na hora com a cópia local (funciona sem internet)
      if (cached && cached.meId === uid) {
        setState(applyQueue({ ...cached, db: { ...emptyDB(), ...cached.db } }, readQueue(uid)));
        setStatus('ready');
      }
      if (!session) { island.setSync('offline'); return; }
      // 2) atualiza do servidor
      try {
        island.setSync('syncing');
        const coupleId = await ensureCouple(sb!);
        const { couple, db } = await loadAll(sb!, coupleId);
        if (cancelled) return;
        setState(applyQueue({ couple, db, meId: uid }, readQueue(uid)));
        setStatus('ready');
        unsub = subscribeAll(sb!, coupleId, onRemote(uid), (ok) => { island.setSync(ok ? 'synced' : 'offline'); if (ok) flushRef.current(); });
        flushRef.current();
      } catch (e) {
        console.error(e);
        island.setSync('offline');
        if (!(cached && cached.meId === uid)) {
          setError(e instanceof Error ? e.message : 'Falha ao carregar dados');
          setStatus('error');
        }
      }
    })();
    return () => {
      cancelled = true;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode !== 'demo' && state && status === 'ready') writeCache(state);
  }, [state, mode, status]);

  useEffect(() => {
    if (mode === 'demo' && state) {
      try {
        localStorage.setItem(DEMO_KEY, JSON.stringify(state));
      } catch { /* noop */ }
    }
  }, [state, mode]);

  /* ───────── realtime: muda o estado e avisa na ilha de notificações ───────── */
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
        pushRef.current(nudgeEvent(row.message || row.kind, n));
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
      const author = row.createdBy ?? row.walkedBy ?? row.profileId;
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
      if (t === 'profiles' && row.id !== myId && existing && row.contextStatus && existing.contextStatus !== row.contextStatus) {
        const st = statusOf(row.contextStatus);
        if (st) pushRef.current({ kind: 'status', title: `${firstName(row.displayName)}: ${st.label} ${st.emoji}`, subtitle: 'Status atualizado agora', avatar: { name: row.displayName, url: row.avatarUrl }, duration: 6000 });
      }
      if (type !== 'INSERT' || !fromPartner) return;
      if (t === 'household_tasks') {
        const ht = HOUSE_TASKS.find((h) => h.value === row.task);
        pushRef.current({ kind: 'success', title: `${who} fez: ${ht?.label ?? row.task} ${ht?.emoji ?? ''}`, subtitle: 'Equilíbrio da semana atualizado', duration: 3500 });
      }
      if (t === 'transactions')
        pushRef.current({ kind: 'expense', title: `${row.type === 'expense' ? 'Nova despesa' : 'Nova entrada'}: ${money(row.amount)}`, subtitle: `${who} · ${row.description}`, avatar: { name: who } });
      if (t === 'events') pushRef.current({ kind: 'agenda', title: `${who} marcou: ${row.title}`, subtitle: new Date(row.startsAt).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) });
      if (t === 'tasks' && (row.assignee === myId || !row.assignee)) pushRef.current({ kind: 'task', title: `Nova tarefa${row.assignee ? ' para você' : ' para vocês'}`, subtitle: row.title });
      if (t === 'shopping_items') pushRef.current({ kind: 'shopping', title: `${who} adicionou à lista`, subtitle: row.name, duration: 3000 });
      if (t === 'prayers') pushRef.current({ kind: 'prayer', title: `${who} pediu oração 🙏`, subtitle: row.title });
      if (t === 'entries') {
        const k = row.kind as string;
        if (k === 'sos') pushRef.current({ kind: 'need', title: `${who} precisa de você agora 🫂`, subtitle: 'Momento de ansiedade — liga ou manda um carinho', avatar: { name: who }, duration: 10000, actions: [{ label: 'Mandar carinho', primary: true, onClick: () => window.dispatchEvent(new Event('atlas:send-love')) }, { label: 'Ok' }] });
        if (k === 'prayed' && (!row.data?.to || row.data.to === myId)) pushRef.current({ kind: 'bible', title: `${who} orou pelo seu pedido 🙏`, subtitle: row.title, avatar: { name: who } });
        if (k === 'devotional') pushRef.current({ kind: 'bible', title: `${who} escreveu o devocional de hoje ✍️`, subtitle: row.title, avatar: { name: who } });
        if (k === 'focus') pushRef.current({ kind: 'status', title: `${who} entrou em modo foco 🎯`, subtitle: `${row.data?.minutes ?? 25} min`, avatar: { name: who }, duration: 3500 });
        const toSocial = () => window.dispatchEvent(new CustomEvent('atlas:navigate', { detail: 'tool:social' }));
        if (k === 'instant') pushRef.current({ kind: 'nudge', title: `${who} mandou um instante 📸`, subtitle: row.title || 'Some depois de visto', avatar: { name: who }, duration: 6000, actions: [{ label: 'Ver agora', primary: true, onClick: toSocial }, { label: 'Depois' }] });
        if (k === 'post') pushRef.current({ kind: 'nudge', title: row.data?.replyTo ? `${who} respondeu 💬` : row.data?.indireta ? `${who} postou uma indireta 👀` : `${who} postou`, subtitle: String(row.body ?? '').slice(0, 80), avatar: { name: who }, duration: 5000, actions: [{ label: 'Abrir', primary: true, onClick: toSocial }] });
        if (k === 'mural') pushRef.current({ kind: 'success', title: `${who} postou no mural 🖼️`, subtitle: row.title || 'Foto nova', avatar: { name: who } });
        if (k === 'alarm_snooze') pushRef.current({ kind: 'need', title: `${who} apertou soneca 😴`, subtitle: 'Vai lá acordar! ⏰', avatar: { name: who }, duration: 8000 });
        if (k === 'journey_hard') pushRef.current({ kind: 'checkin', title: `${who} escreveu a parte dele(a) 🧱`, subtitle: 'Conversa difícil · escreva a sua', avatar: { name: who } });
        if (k === 'capsule') pushRef.current({ kind: 'success', title: `${who} deixou uma cápsula do tempo 💌`, subtitle: 'Abre no futuro', avatar: { name: who } });
      }
      if (t === 'checkins') pushRef.current({ kind: 'checkin', title: `${who} fez o check-in da semana 💬`, subtitle: 'Faça o seu para ver as respostas de vocês dois', avatar: { name: who }, actions: [{ label: 'Fazer agora', primary: true, onClick: () => window.dispatchEvent(new CustomEvent('atlas:navigate', { detail: 'checkin' })) }, { label: 'Depois' }] });
      if (t === 'bible_reads') pushRef.current({ kind: 'bible', title: `${who} leu ${bookName(row.book)} ${row.chapter} 📖`, subtitle: 'Leitura a dois', avatar: { name: who }, duration: 4000 });
      if (t === 'bible_marks') pushRef.current({ kind: 'bible', title: `${who} marcou ${bookName(row.book)} ${row.chapter}:${row.verse}`, subtitle: row.note || 'Toque na Bíblia para ver', avatar: { name: who }, duration: 4000 });
      if (t === 'pet_walks') pushRef.current({ kind: 'pet', title: `${who} levou o Atlas para passear 🐾`, subtitle: 'Passeio do dia registrado' });
      if (t === 'notes' && !row.parentId) pushRef.current({ kind: 'sync', title: `${who} criou uma nota`, subtitle: row.title || 'Sem título', duration: 3000 });
    };
  }

  function nudgeEvent(kind: string, n: string): Parameters<typeof island.push>[0] {
    const need = NEEDS.find((x) => x.kind === kind);
    if (need)
      return {
        kind: 'need',
        title: `${n}: ${need.label} ${need.emoji}`,
        subtitle: need.hint,
        avatar: { name: n },
        actions: need.kind === 'silencio' ? [{ label: 'Entendido 🤍', primary: true }] : [{ label: 'Estou indo', primary: true, onClick: () => nudgeRef.current('carinho') }, { label: 'Depois' }],
        duration: 10000,
      };
    const pet = PET_ACTIONS.find((x) => x.kind === kind);
    if (pet) return { kind: 'pet', title: `${n} ${pet.notify} ${pet.emoji}`, subtitle: 'Atlas virtual', actions: [{ label: 'Brincar também', primary: true, onClick: () => petRef.current('pet_carinho') }, { label: 'Ok' }], duration: 7000 };
    if (kind.startsWith('reply_')) return { kind: 'nudge', title: `${n} recebeu e respondeu 🤍`, subtitle: 'Já está a caminho.', avatar: { name: n }, duration: 5000 };
    return {
      kind: 'nudge',
      title: kind === 'carinho' ? `${n} te mandou um carinho 🤍` : `${n} te cutucou 👉`,
      subtitle: kind === 'carinho' ? 'Pensando em você agora.' : 'Ei! Dá uma olhadinha aqui.',
      avatar: { name: n },
      actions: [{ label: 'Retribuir', primary: true, onClick: () => nudgeRef.current('carinho') }, { label: 'Fechar' }],
      duration: 8000,
    };
  }

  /* ───────── CRUD genérico (com fila offline) ───────── */
  const flushing = useRef(false);
  const flush = useCallback(async () => {
    const s0 = ref.current;
    if (mode !== 'supabase' || !sb || !s0 || flushing.current) return;
    flushing.current = true;
    const uid = s0.meId;
    try {
      let q = readQueue(uid);
      if (q.length) island.setSync('syncing');
      while (q.length) {
        const o = q[0];
        try {
          if (o.op === 'save') await saveRow(sb, o.table, o.row, ref.current?.couple.id ?? s0.couple.id);
          else if (o.op === 'delete') await deleteRow(sb, o.table, o.id);
          else await saveCouple(sb, o.row);
        } catch (e) {
          if (isNetworkError(e)) { island.setSync('offline'); return; }
          console.error(e);
          pushRef.current({ kind: 'sync', title: 'Não consegui salvar um item', subtitle: (e as Error)?.message ?? '', duration: 4000 });
        }
        q = readQueue(uid).filter((x) => JSON.stringify(x) !== JSON.stringify(o));
        writeQueue(uid, q);
      }
      island.setSync('synced');
    } finally {
      flushing.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sb]);
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => {
    if (mode !== 'supabase') return;
    const on = () => flushRef.current();
    window.addEventListener('online', on);
    document.addEventListener('visibilitychange', on);
    const i = window.setInterval(() => { if (ref.current && readQueue(ref.current.meId).length) on(); }, 30_000);
    return () => { window.removeEventListener('online', on); document.removeEventListener('visibilitychange', on); window.clearInterval(i); };
  }, [mode]);
  const write = useCallback(
    (op: QueueOp) => {
      const s0 = ref.current;
      if (mode !== 'supabase' || !sb || !s0) return;
      enqueue(s0.meId, op);
      flushRef.current();
    },
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
    write({ op: 'save', table: t, row, at: Date.now() });
  }, [write, sb]);
  const saveRef = useRef<(t: TableName, row: any) => void>(() => {});
  saveRef.current = save as (t: TableName, row: any) => void;

  const patch = useCallback(<K extends TableName>(t: K, id: string, partial: Partial<Tables[K]>) => {
    const cur = (ref.current?.db[t] as any[] | undefined)?.find((x) => x.id === id);
    if (cur) save(t, { ...cur, ...partial });
  }, [save]);

  const remove = useCallback((t: TableName, id: string) => {
    const s = ref.current;
    if (!s) return;
    const old = (s.db[t] as any[]).find((x) => x.id === id);
    const ns = { ...s, db: { ...s.db, [t]: (s.db[t] as any[]).filter((x) => x.id !== id) } };
    ref.current = ns;
    setState(ns);
    write({ op: 'delete', table: t, id, at: Date.now() });
    // desfazer: itens que a pessoa apaga de propósito
    const UNDO: TableName[] = ['notes', 'tasks', 'events', 'transactions', 'entries', 'prayers', 'special_dates', 'goals', 'vault_items'];
    const quiet = t === 'entries' && ['setting', 'prayed', 'qa', 'focus', 'block', 'priority'].includes(old?.kind);
    if (old && UNDO.includes(t) && !quiet) {
      const label = old.title ?? old.description ?? old.name ?? old.label ?? '';
      pushRef.current({
        kind: 'sync',
        title: 'Apagado',
        subtitle: String(label).slice(0, 60),
        duration: 5000,
        actions: [{ label: 'Desfazer', primary: true, onClick: () => saveRef.current(t, old) }, { label: 'Ok' }],
      });
    }
  }, [write, sb]);

  const updateCouple = useCallback((partial: Partial<Couple>) => {
    const s = ref.current;
    if (!s) return;
    const couple = { ...s.couple, ...partial };
    setState({ ...s, couple });
    write({ op: 'couple', row: couple, at: Date.now() });
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

  const sendNudge = useCallback((kind: NudgeKind) => {
    const s = ref.current;
    if (!s) return;
    const p = s.db.profiles.find((x) => x.id !== s.meId);
    if (!p) {
      island.push({ kind: 'nudge', title: 'Seu par ainda não entrou', subtitle: `Compartilhe o código ${s.couple.inviteCode} em Ajustes.` });
      return;
    }
    haptic('medium');
    const pn = firstName(p.displayName);
    const need = NEEDS.find((n) => n.kind === kind);
    if (!kind.startsWith('pet_'))
      island.push({
        kind: need ? 'need' : 'nudge',
        title: need ? `Enviado para ${pn}: ${need.short} ${need.emoji}` : kind === 'carinho' ? `Carinho enviado para ${pn} 🤍` : `Você cutucou ${pn} 👉`,
        subtitle: 'Vai aparecer ao redor da câmera dele(a).',
        duration: 2400,
      });
    if (mode === 'supabase' && sb) insertNudge(sb, s.couple.id, s.meId, p.id, kind).catch(() => pushRef.current({ kind: 'sync', title: 'Sem internet', subtitle: 'O aviso não foi enviado', duration: 3000 }));
    else
      window.setTimeout(() => {
        const reply = need ? (need.kind === 'silencio' ? null : 'carinho') : kind.startsWith('pet_') ? null : 'carinho';
        if (reply) pushRef.current(nudgeEvent(need ? `reply_${need.kind}` : 'carinho', pn));
      }, 3200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, write, sb]);
  const sendNudgeRef2 = useRef(sendNudge);
  sendNudgeRef2.current = sendNudge;
  useEffect(() => {
    const on = () => sendNudgeRef2.current('carinho');
    window.addEventListener('atlas:send-love', on);
    return () => window.removeEventListener('atlas:send-love', on);
  }, []);
  const nudgeRef = useRef(sendNudge);
  nudgeRef.current = sendNudge;

  const setContextStatus = useCallback((v: string) => {
    const s = ref.current;
    const meP = s?.db.profiles.find((x) => x.id === s.meId);
    if (!s || !meP) return;
    haptic('light');
    const now = new Date().toISOString();
    save('profiles', { ...meP, contextStatus: v, contextUpdatedAt: now, updatedAt: now });
    const st = statusOf(v);
    island.push({ kind: 'status', title: `Status: ${st?.label} ${st?.emoji}`, subtitle: 'Seu par vê isso na ilha de notificações.', duration: 2200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save]);

  const petAction = useCallback((kind: PetActionKind) => {
    const s = ref.current;
    if (!s) return;
    const a = PET_ACTIONS.find((x) => x.kind === kind)!;
    const cur = s.db.pet_virtual_state[0];
    const now = new Date();
    const since = cur ? (now.getTime() - new Date(cur.updatedAt).getTime()) / 3_600_000 : 0;
    const happiness = Math.min(100, Math.max(5, Math.round((cur?.happiness ?? 80) - since * 3)) + a.happiness);
    const energy = Math.max(5, Math.min(100, Math.round((cur?.energy ?? 80) + since * 4) + a.energy));
    save('pet_virtual_state', { id: cur?.id ?? uid(), happiness, energy, bonusXp: (cur?.bonusXp ?? 0) + a.xp, lastAction: kind, lastActionBy: s.meId, lastActionAt: now.toISOString(), updatedAt: now.toISOString() });
    sendNudge(kind);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save, sendNudge]);
  const petRef = useRef(petAction);
  petRef.current = petAction;

  const logHousehold = useCallback((task: string) => {
    const s = ref.current;
    if (!s) return;
    haptic('success');
    save('household_tasks', { id: uid(), createdBy: s.meId, task, doneAt: new Date().toISOString() });
    const ht = HOUSE_TASKS.find((h) => h.value === task);
    island.push({ kind: 'success', title: `${ht?.label ?? task} ✓ +${(ht?.points ?? 1) * 10} XP`, subtitle: 'O Atlas virtual também ficou mais forte.', duration: 2600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save]);

  const startSleep = useCallback(() => {
    const s = ref.current;
    if (!s || activeSleep(s.db.sleep_logs, s.meId)) return;
    save('sleep_logs', { id: uid(), profileId: s.meId, sleptAt: new Date().toISOString(), wokeAt: null, durationMin: null, confirmed: false });
    try {
      localStorage.setItem('my-atlas:sleeping', '1');
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save]);

  const finishSleep = useCallback((confirm: boolean, at = new Date()) => {
    const s = ref.current;
    if (!s) return;
    const cur = activeSleep(s.db.sleep_logs, s.meId);
    try {
      localStorage.removeItem('my-atlas:sleeping');
    } catch { /* noop */ }
    if (!cur) return;
    if (!confirm) return remove('sleep_logs', cur.id);
    const dur = Math.max(1, Math.round((at.getTime() - new Date(cur.sleptAt).getTime()) / 60_000));
    save('sleep_logs', { ...cur, wokeAt: at.toISOString(), durationMin: dur, confirmed: true });
    island.push({ kind: 'sleep', title: `Sono registrado: ${fmtDuration(dur)} 🌙`, subtitle: dur >= 420 ? 'Noite bem dormida. Bora!' : 'Abaixo de 7h — pega leve hoje.', duration: 3500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save, remove]);

  const addCaffeine = useCallback((mg: number, kind: string) => {
    const s = ref.current;
    if (!s) return;
    haptic('light');
    save('caffeine_logs', { id: uid(), profileId: s.meId, takenAt: new Date().toISOString(), mg, kind });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save]);

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
    clearCache();
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
    sendNudge, setContextStatus, petAction, logHousehold, startSleep, finishSleep, addCaffeine,
    alert: (e) => pushRef.current(e),
    switchPerspective, resetDemo, joinCouple, signOut,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAtlas() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAtlas fora do AtlasProvider');
  return c;
}
