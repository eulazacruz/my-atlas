'use client';

import { motion } from 'framer-motion';
import { BarChart3, BookOpen, Brain, Heart, MapPin, MessagesSquare, NotebookPen, PawPrint, Rocket, Settings, ShoppingBag, Sofa, Wallet } from 'lucide-react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI, type SubView } from '@/components/providers/UIProvider';
import { IconButton, PageHeader, Section } from '@/components/ui/primitives';
import { TOOL_META } from '@/lib/tools';
import { toolAllowed, useModules } from '@/lib/modules';
import { ToolRow } from '@/components/v6/kit';
import { money, ymd } from '@/lib/utils';

type Item = { view?: SubView; tool?: string; title: string; icon?: typeof Heart; emoji?: string; badge?: string; need?: 'duo' | 'faith' | 'pet' | 'finance' };

function Grid({ items: all }: { items: Item[] }) {
  const { navigate } = useUI();
  const mods = useModules();
  const items = all.filter((it) => (it.tool ? toolAllowed(it.tool, mods) : true) && (it.need === 'duo' ? mods.couple && mods.hasPartner : it.need === 'faith' ? mods.faith : it.need === 'pet' ? mods.pet : it.need === 'finance' ? mods.finance : true));
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {items.map((it, i) => {
        const Icon = it.icon;
        const emoji = it.emoji ?? (it.tool ? TOOL_META[it.tool]?.emoji : undefined);
        return (
          <motion.button
            key={it.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.025, 0.25), type: 'spring', stiffness: 500, damping: 34 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => (it.tool ? navigate('tool', it.tool) : it.view && navigate(it.view))}
            className="glass flex flex-col items-start gap-2 !rounded-[22px] p-3 text-left"
          >
            <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-black/[0.05] text-[20px] dark:bg-white/[0.07]">{Icon ? <Icon size={19} /> : emoji}</span>
            <span className="text-[13px] font-semibold leading-tight">{it.title}</span>
            {it.badge && <span className="-mt-1.5 text-[11px] leading-tight muted">{it.badge}</span>}
          </motion.button>
        );
      })}
    </div>
  );
}

export function MoreScreen() {
  const { rows, couple } = useAtlas();
  const { navigate } = useUI();
  const month = ymd().slice(0, 7);
  const balance = rows('transactions').filter((t) => t.occurredOn.startsWith(month)).reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
  const shop = rows('shopping_items').filter((i) => !i.checked).length;
  const petName = rows('pets')[0]?.name || 'Pet';
  const mods = useModules();
  return (
    <div>
      <PageHeader title="Mais" subtitle={couple?.name ?? 'Nós dois'} actions={<IconButton label="Ajustes" onClick={() => navigate('settings')}><Settings size={18} /></IconButton>} />
      <Section><ToolRow id="idiomas" sub="Inglês e espanhol · lição do dia" /></Section>
      {mods.couple && !mods.hasPartner && (
        <Section><button onClick={() => navigate('settings')} className="glass flex w-full items-center gap-3 p-4 text-left"><span className="text-[28px]">💌</span><span className="flex-1"><span className="block text-[15px] font-semibold">Convide seu amor</span><span className="text-[12.5px] muted">Libera instantes, timeline, jogos e a Jornada a Dois</span></span></button></Section>
      )}
      <Section title={mods.couple && mods.hasPartner ? 'Nós dois' : 'Para você'}>
        <Grid items={[
          { tool: 'social', title: 'Cantinho' },
          { view: 'couple', title: 'Nós dois', icon: Heart, need: 'duo' },
          { tool: 'journey', title: 'Jornada a Dois' },
          { view: 'checkin', title: 'Check-in', icon: MessagesSquare, need: 'duo' },
          { tool: 'games', title: 'Jogos' },
          { tool: 'challenges', title: 'Desafios' },
          { tool: 'wishlist', title: 'Desejos' },
          { tool: 'trilha', title: 'Nossa trilha' },
          { view: 'weekly', title: 'Semana', icon: BarChart3 },
        ]} />
      </Section>
      <Section title="Organizar">
        <Grid items={[
          { view: 'focus', title: 'Produtividade', icon: Rocket },
          { view: 'notes', title: 'Notas', icon: NotebookPen },
          { view: 'finance', title: 'Finanças', icon: Wallet, badge: money(balance), need: 'finance' },
          { tool: 'piggy', title: 'Cofrinhos' },
          { view: 'shopping', title: 'Compras', icon: ShoppingBag, badge: shop ? `${shop} itens` : undefined },
          { view: 'life', title: 'Casa & lazer', icon: Sofa },
        ]} />
      </Section>
      <Section title="Cuidar">
        <Grid items={[
          { view: 'mind', title: 'Mente', icon: Brain },
          { view: 'location', title: 'Localização', icon: MapPin, need: 'duo' },
          { tool: 'nutrition', title: 'Alimentação' },
          { tool: 'alarm', title: 'Despertador' },
          { view: 'pet', title: petName, icon: PawPrint, need: 'pet' },
          { view: 'bible', title: 'Bíblia', icon: BookOpen, need: 'faith' },
        ]} />
      </Section>
    </div>
  );
}
