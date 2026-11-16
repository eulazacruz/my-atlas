'use client';

import { ChevronRight, Heart, PawPrint, Settings, ShoppingBag, Sparkles, Target, Wallet } from 'lucide-react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI, type SubView } from '@/components/providers/UIProvider';
import { Glass, PageHeader, Section } from '@/components/ui/primitives';
import { money, ymd } from '@/lib/utils';

export function MoreScreen() {
  const { rows, couple } = useAtlas();
  const { navigate } = useUI();
  const month = ymd().slice(0, 7);
  const balance = rows('transactions').filter((t) => t.occurredOn.startsWith(month)).reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
  const tiles: { id: SubView; title: string; hint: string; icon: typeof Heart }[] = [
    { id: 'couple', title: 'Nós dois', hint: 'Humor, datas, metas e oração', icon: Heart },
    { id: 'finance', title: 'Finanças', hint: `Saldo do mês ${money(balance)}`, icon: Wallet },
    { id: 'shopping', title: 'Compras', hint: `${rows('shopping_items').filter((i) => !i.checked).length} itens na lista`, icon: ShoppingBag },
    { id: 'pet', title: 'Atlas', hint: 'Banho, passeio, ração e vacinas', icon: PawPrint },
  ];
  return (
    <div>
      <PageHeader title="Mais" subtitle={couple?.name ?? 'Nós dois'} />
      <Section title="Áreas">
        <div className="grid grid-cols-2 gap-3">
          {tiles.map(({ id, title, hint, icon: Icon }) => (
            <Glass key={id} className="p-4" onClick={() => navigate(id)}>
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-black text-white dark:bg-white dark:text-black">
                <Icon size={20} />
              </span>
              <p className="mt-4 text-[16px] font-semibold">{title}</p>
              <p className="mt-0.5 text-[12px] leading-snug muted">{hint}</p>
            </Glass>
          ))}
        </div>
      </Section>
      <Section title="Atalhos">
        <div className="glass overflow-hidden">
          {[
            { label: 'Metas do casal', icon: Target, to: 'couple' as SubView },
            { label: 'Pedidos de oração', icon: Sparkles, to: 'couple' as SubView },
            { label: 'Ajustes', icon: Settings, to: 'settings' as SubView },
          ].map(({ label, icon: Icon, to }) => (
            <button key={label} onClick={() => navigate(to)} className="flex w-full items-center gap-3 border-b px-4 py-3.5 text-left last:border-0 hairline">
              <Icon size={18} />
              <span className="flex-1 text-[15px]">{label}</span>
              <ChevronRight size={18} className="muted" />
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}
