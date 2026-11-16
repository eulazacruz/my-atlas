'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type Tab = 'home' | 'agenda' | 'notes' | 'health' | 'more';
export type SubView = 'couple' | 'finance' | 'shopping' | 'pet' | 'settings';
export type View = Tab | SubView;
export type SheetKind = 'event' | 'task' | 'expense' | 'cycleDay' | 'intimacy' | 'specialDate' | 'goal' | 'prayer' | 'shopItem' | 'widgets';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface SheetState { kind: SheetKind; payload?: any }

interface UICtx {
  view: View;
  tab: Tab;
  navigate: (v: View) => void;
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
const TABS: Tab[] = ['home', 'agenda', 'notes', 'health', 'more'];
export const tabOf = (v: View): Tab => (TABS.includes(v as Tab) ? (v as Tab) : 'more');

/**
 * Navegação com histórico do navegador: o botão "voltar" do Android
 * fecha a folha/nota aberta ou volta para a tela anterior.
 */
export function UIProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>('home');
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [breathingOpen, setBreathing] = useState(false);
  const overlays = useRef<Array<'sheet' | 'note' | 'breathing'>>([]);
  // Pilha própria de telas (o Next reescreve history.state, então não dependemos dele)
  const stack = useRef<View[]>(['home']);

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
      if (stack.current.length > 1) stack.current.pop();
      setView(stack.current[stack.current.length - 1] ?? 'home');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((v: View) => {
    setView((cur) => {
      if (cur === v) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return cur;
      }
      const isTab = TABS.includes(v as Tab);
      if (isTab && TABS.includes(cur as Tab)) {
        stack.current[stack.current.length - 1] = v;
      } else {
        stack.current.push(v);
        window.history.pushState({ v }, '');
      }
      window.scrollTo({ top: 0 });
      return v;
    });
  }, []);

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
    [view, sheet, noteId, breathingOpen, navigate, dismiss],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUI() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useUI fora do UIProvider');
  return c;
}
