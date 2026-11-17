'use client';

import { toolTab } from '@/lib/tools';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type Tab = 'home' | 'agenda' | 'faith' | 'health' | 'more';
export type SubView = 'couple' | 'finance' | 'shopping' | 'pet' | 'settings' | 'location' | 'bible' | 'checkin' | 'notes' | 'focus' | 'mind' | 'life' | 'col' | 'insights' | 'weekly' | 'wrapped' | 'tool';
export type View = Tab | SubView;
export type SheetKind = 'event' | 'task' | 'expense' | 'cycleDay' | 'intimacy' | 'specialDate' | 'goal' | 'prayer' | 'shopItem' | 'widgets' | 'permissions' | 'vaultItem' | 'editHome';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface SheetState { kind: SheetKind; payload?: any }

interface UICtx {
  view: View;
  tab: Tab;
  navigate: (v: View, param?: string) => void;
  param: string | null;
  back: () => void;
  sheet: SheetState | null;
  openSheet: (kind: SheetKind, payload?: any) => void;
  closeSheet: () => void;
  noteId: string | null;
  openNote: (id: string) => void;
  closeNote: () => void;
  breathingOpen: boolean;
  setBreathingOpen: (v: boolean) => void;
}

const Ctx = createContext<UICtx | null>(null);
const TABS: Tab[] = ['home', 'agenda', 'faith', 'health', 'more'];
const FAITH_VIEWS = ['bible'];
const HEALTH_VIEWS = ['mind', 'insights'];
let lastParam: string | null = null;
export const tabOf = (v: View): Tab =>
  v === 'tool' ? toolTab(lastParam) : TABS.includes(v as Tab) ? (v as Tab) : FAITH_VIEWS.includes(v) || (v === 'col' && lastParam?.startsWith('f:')) ? 'faith' : HEALTH_VIEWS.includes(v) ? 'health' : 'more';

/**
 * Navegação com histórico do navegador: o botão "voltar" do Android
 * fecha a folha/nota aberta ou volta para a tela anterior.
 */
export function UIProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>('home');
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [breathingOpen, setBreathing] = useState(false);
  const [param, setParam] = useState<string | null>(null);
  const setParamRef = useRef(setParam);
  const overlays = useRef<Array<'sheet' | 'note' | 'breathing'>>([]);
  // Pilha própria de telas (o Next reescreve history.state, então não dependemos dele)
  const stack = useRef<View[]>(['home']);
  const params = useRef<(string | null)[]>([null]);

  const pushOverlay = (k: 'sheet' | 'note' | 'breathing') => {
    overlays.current.push(k);
    window.history.pushState({ overlay: k }, '');
  };
  const closeTop = (k: 'sheet' | 'note' | 'breathing') => {
    if (k === 'sheet') setSheet(null);
    if (k === 'note') setNoteId(null);
    if (k === 'breathing') setBreathing(false);
  };

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const top = overlays.current.pop();
      if (top) {
        closeTop(top);
        return;
      }
      if (stack.current.length > 1) { stack.current.pop(); params.current.pop(); }
      const pp = params.current[params.current.length - 1] ?? null;
      lastParam = pp;
      setParamRef.current(pp);
      setView(stack.current[stack.current.length - 1] ?? 'home');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((v: View, p?: string) => {
    if (p !== undefined) { lastParam = p; setParam(p); }
    const np = p !== undefined ? p : params.current[params.current.length - 1] ?? null;
    setView((cur) => {
      if (cur === v && p === undefined) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return cur;
      }
      const isTab = TABS.includes(v as Tab);
      if (isTab && TABS.includes(cur as Tab)) {
        stack.current[stack.current.length - 1] = v;
      } else {
        stack.current.push(v);
        params.current.push(np);
        window.history.pushState({ v }, '');
      }
      window.scrollTo({ top: 0 });
      return v;
    });
  }, []);
  useEffect(() => {
    const on = (e: Event) => { const d = String((e as CustomEvent).detail ?? ''); const [v, p] = d.split(':'); navigate(v as View, p); };
    window.addEventListener('atlas:navigate', on);
    return () => window.removeEventListener('atlas:navigate', on);
  }, [navigate]);

  const dismiss = useCallback((k: 'sheet' | 'note' | 'breathing') => {
    const idx = overlays.current.lastIndexOf(k);
    if (idx === overlays.current.length - 1 && idx >= 0) window.history.back();
    else {
      if (idx >= 0) overlays.current.splice(idx, 1);
      closeTop(k);
    }
  }, []);

  const value = useMemo<UICtx>(
    () => ({
      view,
      tab: tabOf(view),
      navigate,
      param,
      back: () => window.history.back(),
      sheet,
      openSheet: (kind, payload) => {
        if (!sheet) pushOverlay('sheet');
        setSheet({ kind, payload });
      },
      closeSheet: () => dismiss('sheet'),
      noteId,
      openNote: (id) => {
        if (!noteId) pushOverlay('note');
        setNoteId(id);
      },
      closeNote: () => dismiss('note'),
      breathingOpen,
      setBreathingOpen: (v) => {
        if (v) {
          pushOverlay('breathing');
          setBreathing(true);
        } else dismiss('breathing');
      },
    }),
    [view, param, sheet, noteId, breathingOpen, navigate, dismiss],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUI() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useUI fora do UIProvider');
  return c;
}
