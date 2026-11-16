'use client';

import { FileText, Lock, Pin, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI } from '@/components/providers/UIProvider';
import { Avatar, Chip, Empty, IconButton, PageHeader, Section } from '@/components/ui/primitives';
import type { Note } from '@/lib/types';
import { timeAgo, uid } from '@/lib/utils';

export function newNote(me: string, parentId: string | null = null): Note {
  const now = new Date().toISOString();
  return { id: uid(), createdBy: me, parentId, title: '', icon: '📝', blocks: [{ id: uid(), type: 'p', text: '' }], isPrivate: false, pinned: false, createdAt: now, updatedAt: now };
}

export const notePreview = (n: Note) => n.blocks.find((b) => b.text.trim() && b.type !== 'divider')?.text ?? 'Página vazia';

function NoteRow({ n }: { n: Note }) {
  const { rows } = useAtlas();
  const { openNote } = useUI();
  const author = rows('profiles').find((p) => p.id === n.createdBy);
  const children = rows('notes').filter((c) => c.parentId === n.id).length;
  return (
    <button onClick={() => openNote(n.id)} className="flex w-full items-center gap-3 border-b px-4 py-3.5 text-left last:border-0 hairline">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black/[0.04] text-[20px] dark:bg-white/[0.06]">{n.icon ?? '📝'}</span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-[15px] font-semibold">
          {n.title || 'Sem título'}
          {n.isPrivate && <Lock size={12} className="shrink-0 muted" />}
        </p>
        <p className="truncate text-[13px] muted">{notePreview(n)}</p>
        <p className="mt-0.5 text-[11px] muted">
          {timeAgo(n.updatedAt)}
          {children > 0 && ` · ${children} subpágina${children > 1 ? 's' : ''}`}
        </p>
      </div>
      {author && <Avatar profile={author} size={22} />}
    </button>
  );
}

export function NotesScreen() {
  const { rows, me, save } = useAtlas();
  const { openNote } = useUI();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'mine' | 'private'>('all');
  if (!me) return null;

  const all = rows('notes')
    .filter((n) => (filter === 'mine' ? n.createdBy === me.id : filter === 'private' ? n.isPrivate : true))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const query = q.trim().toLowerCase();
  const results = query ? all.filter((n) => n.title.toLowerCase().includes(query) || n.blocks.some((b) => b.text.toLowerCase().includes(query))) : null;
  const pinned = all.filter((n) => n.pinned && !n.parentId);
  const pages = all.filter((n) => !n.pinned && !n.parentId);

  const create = () => {
    const n = newNote(me.id);
    save('notes', n);
    openNote(n.id);
  };

  return (
    <div>
      <PageHeader
        back
        title="Notas"
        subtitle={`${rows('notes').length} páginas`}
        actions={
          <IconButton label="Nova página" onClick={create}>
            <Plus size={20} />
          </IconButton>
        }
      />
      <div className="glass mb-4 flex items-center gap-2 px-4 !rounded-full">
        <Search size={16} className="muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar em todas as notas" className="flex-1 bg-transparent py-3 text-[15px] outline-none placeholder:text-black/35 dark:placeholder:text-white/30" />
      </div>
      <div className="mb-6 flex gap-2">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>Todas</Chip>
        <Chip active={filter === 'mine'} onClick={() => setFilter('mine')}>Minhas</Chip>
        <Chip active={filter === 'private'} onClick={() => setFilter('private')}>
          <Lock size={12} /> Privadas
        </Chip>
      </div>

      {results ? (
        <Section title={`${results.length} resultado(s)`}>
          {results.length ? <div className="glass overflow-hidden">{results.map((n) => <NoteRow key={n.id} n={n} />)}</div> : <Empty icon={<Search size={20} />} title="Nada encontrado" />}
        </Section>
      ) : (
        <>
          {pinned.length > 0 && (
            <Section title="Fixadas" action={<Pin size={13} className="muted" />}>
              <div className="glass overflow-hidden">{pinned.map((n) => <NoteRow key={n.id} n={n} />)}</div>
            </Section>
          )}
          <Section title="Páginas">
            {pages.length ? (
              <div className="glass overflow-hidden">{pages.map((n) => <NoteRow key={n.id} n={n} />)}</div>
            ) : (
              <Empty icon={<FileText size={20} />} title="Nenhuma página ainda" hint="Crie listas, planos, devocionais, ideias de date… tudo num só lugar." action={<Chip active onClick={create}><Plus size={14} /> Nova página</Chip>} />
            )}
          </Section>
          <p className="text-center text-[12px] muted">Dica: digite “/” numa linha vazia para escolher o tipo de bloco.</p>
        </>
      )}
    </div>
  );
}
