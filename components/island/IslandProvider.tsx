'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { IslandEvent, SyncState } from '@/lib/types';
import { uid } from '@/lib/utils';

interface IslandCtx {
  current: IslandEvent | null;
  queueSize: number;
  history: IslandEvent[];
  push: (e: Omit<IslandEvent, 'id'>) => void;
  dismiss: () => void;
  sync: SyncState;
  setSync: (s: SyncState) => void;
  breathingStartedAt: number | null;
  setBreathingStartedAt: (t: number | null) => void;
  calib: IslandCalib;
  setCalib: (c: IslandCalib) => void;
}
export interface IslandCalib { dx: number; dy: number; scale: number }
const CALIB_KEY = 'my-atlas:island-calib';

const Ctx = createContext<IslandCtx | null>(null);

export function IslandProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<IslandEvent[]>([]);
  const [history, setHistory] = useState<IslandEvent[]>([]);
  const [sync, setSync] = useState<SyncState>('syncing');
  const [breathingStartedAt, setBreathingStartedAt] = useState<number | null>(null);
  const lastKey = useRef<{ key: string; at: number } | null>(null);
  const [calib, setCalibState] = useState<IslandCalib>({ dx: 0, dy: 0, scale: 1 });
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CALIB_KEY);
      if (raw) setCalibState(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);
  const setCalib = useCallback((c: IslandCalib) => {
    setCalibState(c);
    try {
      localStorage.setItem(CALIB_KEY, JSON.stringify(c));
    } catch { /* noop */ }
  }, []);

  const push = useCallback((e: Omit<IslandEvent, 'id'>) => {
    const key = `${e.kind}|${e.title}|${e.subtitle ?? ''}`;
    const now = Date.now();
    if (lastKey.current && lastKey.current.key === key && now - lastKey.current.at < 1500) return;
    lastKey.current = { key, at: now };
    const ev = { ...e, id: uid() };
    setQueue((q) => [...q, ev].slice(-6));
    setHistory((h) => [ev, ...h].slice(0, 12));
  }, []);

  const dismiss = useCallback(() => setQueue((q) => q.slice(1)), []);

  const value = useMemo(
    () => ({ current: queue[0] ?? null, queueSize: queue.length, history, push, dismiss, sync, setSync, breathingStartedAt, setBreathingStartedAt, calib, setCalib }),
    [queue, history, push, dismiss, sync, breathingStartedAt, calib, setCalib],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useIsland() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useIsland fora do IslandProvider');
  return c;
}
