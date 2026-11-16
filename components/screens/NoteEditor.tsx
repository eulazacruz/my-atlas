'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckSquare, ChevronLeft, FilePlus2, Heading1, List, Lock, Minus, Pin, Plus, Trash2, Type, Unlock } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI } from '@/components/providers/UIProvider';
import { CheckCircle } from '@/components/ui/primitives';
import { BLOCK_TYPES, NOTE_ICONS } from '@/lib/constants';
import type { Block, BlockType, Note } from '@/lib/types';
import { cn, firstName, timeAgo, uid } from '@/lib/utils';
import { newNote, notePreview } from './NotesScreen';

const STYLE: Record<BlockType, string> = {
  p: 'text-[16px] leading-[1.6]',
  h1: 'text-[26px] font-bold leading-tight tracking-[-0.02em] pt-3',
  h2: 'text-[21px] font-bold leading-tight tracking-[-0.015em] pt-2',
  h3: 'text-[17px] font-semibold leading-snug pt-1',
  todo: 'text-[16px] leading-[1.5]',
  bullet: 'text-[16px] leading-[1.6]',
  number: 'text-[16px] leading-[1.6]',
  quote: 'text-[16px] leading-[1.6] italic',
  callout: 'text-[15px] leading-[1.55]',
  divider: '',
};
const PLACEHOLDER: Partial<Record<BlockType, string>> = {
  p: 'Escreva ou digite “/” para comandos',
  h1: 'Título 1',
  h2: 'Título 2',
  h3: 'Título 3',
  todo: 'Tarefa',
  bullet: 'Item',
  number: 'Item',
  quote: 'Citação',
  callout: 'Destaque',
};
const CONTINUES: BlockType[] = ['todo', 'bullet', 'number'];

function AutoText({
  value, onChange, onKeyDown, className, placeholder, inputRef, onFocus,
}: {
  value: string; onChange: (v: string) => void; onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void; className?: string; placeholder?: string;
  inputRef?: (el: HTMLTextAreaElement | null) => void; onFocus?: () => void;
}) {
  const local = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const el = local.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={(el) => {
        local.current = el;
        inputRef?.(el);
      }}
      rows={1}
      value={value}
      placeholder={placeholder}
      onFocus={onFocus}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      className={cn('block w-full overflow-hidden bg-transparent outline-none placeholder:text-black/25 dark:placeholder:text-white/20', className)}
    />
  );
}

export function NoteEditor() {
  const { noteId, closeNote, openNote } = useUI();
  const { rows, me, save, remove, nameOf } = useAtlas();
  const stored = rows('notes').find((n) => n.id === noteId) ?? null;
  const [draft, setDraft] = useState<Note | null>(null);
  const [menuFor, setMenuFor] = useState<{ id: string; insert?: boolean } | null>(null);
  const [iconOpen, setIconOpen] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const refs = useRef(new Map<string, HTMLTextAreaElement>());
  const pendingFocus = useRef<{ id: string; pos: 'start' | 'end' } | null>(null);
  const dirty = useRef(false);

  // carrega/rascunho
  useEffect(() => {
    if (!noteId) {
      setDraft(null);
      return;
    }
    if (stored && (!draft || draft.id !== stored.id)) setDraft(structuredClone(stored));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, stored?.id]);

  // salva com debounce
  useEffect(() => {
    if (!draft || !dirty.current) return;
    const t = window.setTimeout(() => {
      save('notes', { ...draft, updatedAt: new Date().toISOString() });
      dirty.current = false;
    }, 600);
    return () => window.clearTimeout(t);
  }, [draft, save]);

  useEffect(() => {
    const p = pendingFocus.current;
    if (!p) return;
    const el = refs.current.get(p.id);
    if (el) {
      el.focus();
      const pos = p.pos === 'end' ? el.value.length : 0;
      el.setSelectionRange(pos, pos);
      pendingFocus.current = null;
    }
  });

  const update = useCallback((fn: (n: Note) => Note) => {
    dirty.current = true;
    setDraft((d) => (d ? fn(d) : d));
  }, []);
  const setBlocks = (fn: (b: Block[]) => Block[]) => update((n) => ({ ...n, blocks: fn(n.blocks) }));
  const patchBlock = (id: string, p: Partial<Block>) => setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...p } : b)));

  const close = () => {
    if (draft) {
      const empty = !draft.title.trim() && draft.blocks.every((b) => !b.text.trim()) && !rows('notes').some((n) => n.parentId === draft.id);
      if (empty) remove('notes', draft.id);
      else if (dirty.current) save('notes', { ...draft, updatedAt: new Date().toISOString() });
    }
    dirty.current = false;
    closeNote();
  };

  if (!noteId || !draft || !me) return <AnimatePresence />;

  const canPrivacy = draft.createdBy === me.id;
  const children = rows('notes').filter((n) => n.parentId === draft.id);
  const parent = draft.parentId ? rows('notes').find((n) => n.id === draft.parentId) : null;

  const onChangeText = (b: Block, v: string) => {
    if (v === '/') {
      patchBlock(b.id, { text: '' });
      setMenuFor({ id: b.id });
      return;
    }
    const m = v.match(/^(#{1,3}|\[\]|-|\*|1\.|>|!|---)\s/);
    if (m && b.type === 'p') {
      const map: Record<string, BlockType> = { '#': 'h1', '##': 'h2', '###': 'h3', '[]': 'todo', '-': 'bullet', '*': 'bullet', '1.': 'number', '>': 'quote', '!': 'callout', '---': 'divider' };
      const type = map[m[1]];
      patchBlock(b.id, { type, text: type === 'divider' ? '' : v.slice(m[0].length) });
      if (type === 'divider') {
        const nb = { id: uid(), type: 'p' as BlockType, text: '' };
        setBlocks((bs) => {
          const i = bs.findIndex((x) => x.id === b.id);
          return [...bs.slice(0, i + 1), nb, ...bs.slice(i + 1)];
        });
        pendingFocus.current = { id: nb.id, pos: 'start' };
      }
      return;
    }
    patchBlock(b.id, { text: v });
  };

  const onKey = (b: Block, e: KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (CONTINUES.includes(b.type) && !b.text) {
        patchBlock(b.id, { type: 'p' });
        return;
      }
      const before = el.value.slice(0, el.selectionStart);
      const after = el.value.slice(el.selectionEnd);
      const nb: Block = { id: uid(), type: CONTINUES.includes(b.type) ? b.type : 'p', text: after, checked: false };
      setBlocks((bs) => {
        const i = bs.findIndex((x) => x.id === b.id);
        const cur = { ...bs[i], text: before };
        return [...bs.slice(0, i), cur, nb, ...bs.slice(i + 1)];
      });
      pendingFocus.current = { id: nb.id, pos: 'start' };
    }
    if (e.key === 'Backspace' && el.selectionStart === 0 && el.selectionEnd === 0) {
      if (b.type !== 'p') {
        e.preventDefault();
        patchBlock(b.id, { type: 'p' });
        return;
      }
      const i = draft.blocks.findIndex((x) => x.id === b.id);
      if (i <= 0) return;
      e.preventDefault();
      const prev = draft.blocks[i - 1];
      if (prev.type === 'divider') {
        setBlocks((bs) => bs.filter((x) => x.id !== prev.id));
        return;
      }
      pendingFocus.current = { id: prev.id, pos: 'end' };
      setBlocks((bs) => bs.filter((x) => x.id !== b.id).map((x) => (x.id === prev.id ? { ...x, text: x.text + b.text } : x)));
      if (b.text) {
        // posiciona o cursor na junção
        const joinAt = prev.text.length;
        window.requestAnimationFrame(() => refs.current.get(prev.id)?.setSelectionRange(joinAt, joinAt));
      }
    }
  };

  const chooseType = (type: BlockType | 'delete') => {
    if (!menuFor) return;
    const { id, insert } = menuFor;
    setMenuFor(null);
    if (type === 'delete') {
      setBlocks((bs) => (bs.length > 1 ? bs.filter((b) => b.id !== id) : [{ id: uid(), type: 'p', text: '' }]));
      return;
    }
    if (insert) {
      const nb: Block = { id: uid(), type, text: '', checked: false };
      const after = type === 'divider' ? [{ id: uid(), type: 'p' as BlockType, text: '' }] : [];
      setBlocks((bs) => {
        const i = bs.findIndex((x) => x.id === id);
        return [...bs.slice(0, i + 1), nb, ...after, ...bs.slice(i + 1)];
      });
      pendingFocus.current = { id: type === 'divider' ? after[0].id : nb.id, pos: 'end' };
      return;
    }
    patchBlock(id, { type, ...(type === 'divider' ? { text: '' } : {}) });
    if (type !== 'divider') pendingFocus.current = { id, pos: 'end' };
  };

  const quickType = (type: BlockType) => {
    const id = focused ?? draft.blocks.at(-1)?.id;
    if (!id) return;
    const blk = draft.blocks.find((b) => b.id === id);
    if (blk && blk.type === type) patchBlock(id, { type: 'p' });
    else patchBlock(id, { type });
    pendingFocus.current = { id, pos: 'end' };
  };

  let num = 0;

  return (
    <AnimatePresence>
      <motion.div
        key="editor"
        className="fixed inset-0 z-[35] flex flex-col bg-[var(--bg)]"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 40 }}
      >
        <div className="ambient" />
        {/* barra superior */}
        <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-[calc(3.2rem+var(--sat,env(safe-area-inset-top)))]">
          <button onClick={close} className="flex min-w-0 items-center gap-0.5 text-[15px] font-medium muted">
            <ChevronLeft size={22} className="shrink-0" /> <span className="truncate">{parent ? `${parent.icon ?? ''} ${parent.title || 'Sem título'}` : 'Notas'}</span>
          </button>
          <div className="flex shrink-0 items-center gap-1">
            <button aria-label="Fixar" onClick={() => update((n) => ({ ...n, pinned: !n.pinned }))} className={cn('grid h-9 w-9 place-items-center rounded-full', draft.pinned ? 'bg-black text-white dark:bg-white dark:text-black' : 'muted')}>
              <Pin size={16} />
            </button>
            {canPrivacy && (
              <button aria-label="Privada" onClick={() => update((n) => ({ ...n, isPrivate: !n.isPrivate }))} className={cn('grid h-9 w-9 place-items-center rounded-full', draft.isPrivate ? 'bg-black text-white dark:bg-white dark:text-black' : 'muted')}>
                {draft.isPrivate ? <Lock size={16} /> : <Unlock size={16} />}
              </button>
            )}
            <button
              aria-label="Excluir página"
              onClick={() => {
                if (window.confirm('Excluir esta página (e as subpáginas)?')) {
                  remove('notes', draft.id);
                  dirty.current = false;
                  closeNote();
                }
              }}
              className="grid h-9 w-9 place-items-center rounded-full muted"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-40">
          <div className="mx-auto max-w-2xl">
            <button onClick={() => setIconOpen((v) => !v)} className="mt-2 text-[44px] leading-none">
              {draft.icon ?? '📝'}
            </button>
            {iconOpen && (
              <div className="glass mt-2 grid grid-cols-8 gap-1 p-2">
                {NOTE_ICONS.map((ic) => (
                  <button key={ic} onClick={() => { update((n) => ({ ...n, icon: ic })); setIconOpen(false); }} className="rounded-xl py-1.5 text-[22px] active:bg-black/5 dark:active:bg-white/10">
                    {ic}
                  </button>
                ))}
              </div>
            )}
            <AutoText
              value={draft.title}
              onChange={(v) => update((n) => ({ ...n, title: v.replace(/\n/g, '') }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const first = draft.blocks[0];
                  if (first) pendingFocus.current = { id: first.id, pos: 'start' };
                  setDraft((d) => (d ? { ...d } : d));
                }
              }}
              placeholder="Sem título"
              className="mt-3 text-[32px] font-bold leading-tight tracking-[-0.03em]"
            />
            <p className="mb-5 mt-1 text-[12px] muted">
              {nameOf(draft.createdBy) === firstName(me.displayName) ? 'Você' : nameOf(draft.createdBy)} · editado {timeAgo(draft.updatedAt)}
              {draft.isPrivate ? ' · privada' : ' · compartilhada'}
            </p>

            <div className="space-y-1">
              {draft.blocks.map((b) => {
                num = b.type === 'number' ? num + 1 : 0;
                if (b.type === 'divider')
                  return (
                    <button key={b.id} onClick={() => setMenuFor({ id: b.id })} className="block w-full py-3">
                      <hr className="hairline" />
                    </button>
                  );
                const input = (
                  <AutoText
                    value={b.text}
                    onChange={(v) => onChangeText(b, v)}
                    onKeyDown={(e) => onKey(b, e)}
                    onFocus={() => setFocused(b.id)}
                    placeholder={focused === b.id || draft.blocks.length === 1 ? PLACEHOLDER[b.type] : ''}
                    inputRef={(el) => {
                      if (el) refs.current.set(b.id, el);
                      else refs.current.delete(b.id);
                    }}
                    className={cn(STYLE[b.type], b.type === 'todo' && b.checked && 'line-through opacity-45')}
                  />
                );
                if (b.type === 'todo')
                  return (
                    <div key={b.id} className="flex items-start gap-2.5">
                      <span className="pt-[3px]">
                        <CheckCircle size={20} checked={!!b.checked} onClick={() => patchBlock(b.id, { checked: !b.checked })} />
                      </span>
                      {input}
                    </div>
                  );
                if (b.type === 'bullet' || b.type === 'number')
                  return (
                    <div key={b.id} className="flex items-start gap-2.5">
                      <span className="w-5 shrink-0 pt-[1px] text-right text-[16px] leading-[1.6] tabular-nums muted">{b.type === 'bullet' ? '•' : `${num}.`}</span>
                      {input}
                    </div>
                  );
                if (b.type === 'quote')
                  return (
                    <div key={b.id} className="border-l-[3px] border-black pl-3.5 dark:border-white">
                      {input}
                    </div>
                  );
                if (b.type === 'callout')
                  return (
                    <div key={b.id} className="glass-thin flex items-start gap-2.5 p-3.5">
                      <span className="text-[18px] leading-[1.4]">💡</span>
                      {input}
                    </div>
                  );
                return <div key={b.id}>{input}</div>;
              })}
            </div>

            <button
              onClick={() => {
                const nb: Block = { id: uid(), type: 'p', text: '' };
                setBlocks((bs) => [...bs, nb]);
                pendingFocus.current = { id: nb.id, pos: 'start' };
              }}
              className="mt-2 flex h-12 w-full items-center text-[14px] muted"
            >
              <Plus size={16} className="mr-1.5" /> Toque para adicionar um bloco
            </button>

            {/* subpáginas */}
            <div className="mt-8">
              <p className="label mb-2">Subpáginas</p>
              <div className="glass overflow-hidden">
                {children.map((c) => (
                  <button key={c.id} onClick={() => { close(); window.setTimeout(() => openNote(c.id), 260); }} className="flex w-full items-center gap-3 border-b px-4 py-3 text-left hairline">
                    <span className="text-[18px]">{c.icon ?? '📝'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium">{c.title || 'Sem título'}</p>
                      <p className="truncate text-[12px] muted">{notePreview(c)}</p>
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => {
                    const sub = newNote(me.id, draft.id);
                    save('notes', sub);
                    close();
                    window.setTimeout(() => openNote(sub.id), 260);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-[14px] font-medium muted"
                >
                  <FilePlus2 size={16} /> Nova subpágina
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* barra de formatação */}
        <div className="fixed inset-x-0 bottom-0 z-[36] flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="glass flex items-center gap-1 !rounded-full p-1.5">
            <ToolBtn label="Tipo de bloco" onClick={() => focused && setMenuFor({ id: focused })}><Type size={18} /></ToolBtn>
            <ToolBtn label="Título" onClick={() => quickType('h1')}><Heading1 size={18} /></ToolBtn>
            <ToolBtn label="Lista de tarefas" onClick={() => quickType('todo')}><CheckSquare size={18} /></ToolBtn>
            <ToolBtn label="Lista" onClick={() => quickType('bullet')}><List size={18} /></ToolBtn>
            <ToolBtn label="Divisor" onClick={() => insertDivider()}><Minus size={18} /></ToolBtn>
            <ToolBtn label="Novo bloco" onClick={() => setMenuFor({ id: focused ?? draft.blocks.at(-1)!.id, insert: true })}><Plus size={18} /></ToolBtn>
          </div>
        </div>

        {/* menu de blocos */}
        <AnimatePresence>
          {menuFor && (
            <>
              <motion.div className="fixed inset-0 z-[37] bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuFor(null)} />
              <motion.div
                className="fixed inset-x-0 bottom-0 z-[38] mx-auto max-h-[70dvh] max-w-lg overflow-y-auto rounded-t-[28px] bg-white/90 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-3xl dark:bg-[#141414]/90"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 420, damping: 40 }}
              >
                <p className="label px-2 pb-2 pt-1">{menuFor.insert ? 'Inserir bloco' : 'Transformar em'}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {BLOCK_TYPES.map((t) => (
                    <button key={t.type} onClick={() => chooseType(t.type)} className="glass-thin px-3 py-2.5 text-left">
                      <p className="text-[14px] font-semibold">{t.label}</p>
                      <p className="text-[11px] muted">
                        {t.hint}
                        {t.md ? ` · ${t.md}` : ''}
                      </p>
                    </button>
                  ))}
                </div>
                {!menuFor.insert && (
                  <button onClick={() => chooseType('delete')} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[14px] font-semibold text-red-500">
                    <Trash2 size={15} /> Excluir bloco
                  </button>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );

  function insertDivider() {
    const id = focused ?? draft!.blocks.at(-1)!.id;
    const nb: Block = { id: uid(), type: 'divider', text: '' };
    const after: Block = { id: uid(), type: 'p', text: '' };
    setBlocks((bs) => {
      const i = bs.findIndex((x) => x.id === id);
      return [...bs.slice(0, i + 1), nb, after, ...bs.slice(i + 1)];
    });
    pendingFocus.current = { id: after.id, pos: 'start' };
  }
}

function ToolBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button aria-label={label} title={label} onMouseDown={(e) => e.preventDefault()} onClick={onClick} className="grid h-10 w-10 place-items-center rounded-full active:bg-black/10 dark:active:bg-white/15">
      {children}
    </button>
  );
}
