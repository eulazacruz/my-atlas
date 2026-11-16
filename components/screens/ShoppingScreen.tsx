'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { Avatar, CheckCircle, Chip, Empty, PageHeader, Section } from '@/components/ui/primitives';
import { SHOP_CATEGORIES } from '@/lib/constants';
import { cn, firstName, uid } from '@/lib/utils';

export function ShoppingScreen() {
  const { rows, me, save, patch, remove, nameOf } = useAtlas();
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [cat, setCat] = useState('Mercado');
  if (!me) return null;

  const items = rows('shopping_items');
  const pending = items.filter((i) => !i.checked);
  const bought = items.filter((i) => i.checked).sort((a, b) => (b.checkedAt ?? '').localeCompare(a.checkedAt ?? ''));
  const groups = SHOP_CATEGORIES.map((c) => ({ c, list: pending.filter((i) => i.category === c) })).filter((g) => g.list.length);

  const add = () => {
    if (!name.trim()) return;
    save('shopping_items', { id: uid(), createdBy: me.id, name: name.trim(), qty: qty.trim() || null, category: cat, checked: false, createdAt: new Date().toISOString() });
    setName('');
    setQty('');
  };

  return (
    <div>
      <PageHeader title="Compras" subtitle={`${pending.length} itens pendentes`} back />
      <div className="glass mb-3 p-2">
        <div className="flex items-center gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Adicionar item…" className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[15px] outline-none placeholder:text-black/35 dark:placeholder:text-white/30" />
          <input value={qty} onChange={(e) => setQty(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Qtd" className="w-16 rounded-xl bg-black/5 px-2 py-2 text-center text-[14px] outline-none dark:bg-white/[0.07]" />
          <button onClick={add} disabled={!name.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black text-white disabled:opacity-30 dark:bg-white dark:text-black">
            <Plus size={18} />
          </button>
        </div>
      </div>
      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4">
        {SHOP_CATEGORIES.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {c}
          </Chip>
        ))}
      </div>

      {groups.length === 0 && <Empty icon={<ShoppingBag size={20} />} title="Lista vazia" hint="Adicione o que falta em casa. Seu par vê na hora." />}
      {groups.map((g) => (
        <Section key={g.c} title={`${g.c} · ${g.list.length}`}>
          <div className="glass overflow-hidden">
            <AnimatePresence initial={false}>
              {g.list.map((i) => (
                <motion.div key={i.id} layout exit={{ opacity: 0, height: 0 }} className="flex items-center gap-3 border-b px-4 py-3 last:border-0 hairline">
                  <CheckCircle checked={false} onClick={() => patch('shopping_items', i.id, { checked: true, checkedBy: me.id, checkedAt: new Date().toISOString() })} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px]">{i.name}</p>
                    <p className="text-[11px] muted">por {i.createdBy === me.id ? 'você' : nameOf(i.createdBy)}</p>
                  </div>
                  {i.qty && <span className="rounded-full bg-black/5 px-2.5 py-1 text-[12px] font-medium dark:bg-white/[0.08]">{i.qty}</span>}
                  <button aria-label="Remover" onClick={() => remove('shopping_items', i.id)} className="muted">
                    <X size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Section>
      ))}

      {bought.length > 0 && (
        <Section
          title={`Comprados · ${bought.length}`}
          action={
            <button onClick={() => bought.forEach((i) => remove('shopping_items', i.id))} className="flex items-center gap-1 text-[13px] font-medium muted">
              <Trash2 size={13} /> Limpar
            </button>
          }
        >
          <div className="glass overflow-hidden">
            {bought.map((i) => {
              const who = rows('profiles').find((p) => p.id === i.checkedBy);
              return (
                <div key={i.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0 hairline">
                  <CheckCircle checked onClick={() => patch('shopping_items', i.id, { checked: false, checkedBy: null, checkedAt: null })} />
                  <p className={cn('flex-1 truncate text-[15px] line-through muted')}>{i.name}</p>
                  {who && (
                    <span className="flex items-center gap-1.5 text-[11px] muted">
                      {who.id === me.id ? 'você' : firstName(who.displayName)} <Avatar profile={who} size={20} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}
