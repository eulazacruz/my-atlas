'use client';

import { ArrowDown, ArrowUp, Bell, Eye, EyeOff, MapPin, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useIsland } from '@/components/island/IslandProvider';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI } from '@/components/providers/UIProvider';
import { Button, Chip, Field, Sheet } from '@/components/ui/primitives';
import { HOME_SECTIONS, VAULT_CATEGORIES } from '@/lib/constants';
import { useHomeLayout } from '@/lib/homeLayout';
import { ensureLocationPermission, ensureNotificationPermission, isNative, permissionState, registerPush } from '@/lib/native';
import { savePushToken } from '@/lib/db';
import { getSupabase } from '@/lib/supabase';
import type { VaultItem } from '@/lib/types';
import { cn, uid } from '@/lib/utils';

const LABEL: Record<string, string> = { granted: 'Permitido', denied: 'Negado', prompt: 'Não pedido', 'prompt-with-rationale': 'Não pedido', default: 'Não pedido' };

/* ───────── Permissões (1º acesso) ───────── */
function PermissionsSheet() {
  const { sheet, closeSheet } = useUI();
  const { me, rows, save, mode, state } = useAtlas();
  const island = useIsland();
  const open = sheet?.kind === 'permissions';
  const [st, setSt] = useState({ notif: '…', geo: '…' });
  const refresh = () => permissionState().then(setSt);
  useEffect(() => { if (open) refresh(); }, [open]);
  if (!me) return null;
  const mine = rows('locations').find((l) => l.id === me.id);
  const askNotif = async () => {
    const ok = await ensureNotificationPermission();
    if (ok && mode === 'supabase' && state) {
      const sb = getSupabase();
      await registerPush((t) => { if (sb) savePushToken(sb, state.couple.id, state.meId, t).catch(console.warn); });
    }
    island.push({ kind: ok ? 'success' : 'sync', title: ok ? 'Notificações ativadas 🔔' : 'Notificações bloqueadas', subtitle: ok ? 'Você vai receber os avisos do casal' : 'Libere nas configurações do Android' });
    refresh();
  };
  const askGeo = async () => {
    const ok = await ensureLocationPermission(true);
    if (ok) save('locations', { id: me.id, sharing: true, lat: mine?.lat ?? null, lng: mine?.lng ?? null, accuracy: mine?.accuracy ?? null, speed: mine?.speed ?? null, battery: mine?.battery ?? null, updatedAt: new Date().toISOString() });
    island.push({ kind: ok ? 'location' : 'sync', title: ok ? 'Localização compartilhada 📍' : 'Localização bloqueada', subtitle: ok ? 'Só o seu par vê onde você está' : 'Libere nas configurações do Android' });
    refresh();
  };
  const Row = ({ icon: Icon, title, hint, state, onClick }: { icon: typeof Bell; title: string; hint: string; state: string; onClick: () => void }) => (
    <div className="glass-thin flex items-center gap-3 p-3.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-black text-white dark:bg-white dark:text-black"><Icon size={18} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold">{title}</p>
        <p className="text-[12px] muted">{hint}</p>
      </div>
      {state === 'granted' ? <span className="text-[12px] font-semibold text-emerald-500">Ativo</span> : <Button variant="primary" className="h-9 px-4 text-[13px]" onClick={onClick}>Permitir</Button>}
    </div>
  );
  return (
    <Sheet open={open} onClose={closeSheet} title="Deixe o Atlas te avisar" footer={<Button className="w-full" onClick={closeSheet}>Pronto</Button>}>
      <div className="space-y-3 pt-1">
        <p className="text-[14px] muted">Para a ilha avisar quando {`seu par`} mudar de status, pedir algo ou interagir com o Atlas — mesmo com o app fechado.</p>
        <Row icon={Bell} title="Notificações" hint={`Avisos do casal, lembretes e agenda · ${LABEL[st.notif] ?? st.notif}`} state={st.notif} onClick={askNotif} />
        <Row icon={MapPin} title="Localização" hint={`Mapa em tempo real só para vocês dois · ${LABEL[st.geo] ?? st.geo}`} state={st.geo} onClick={askGeo} />
        {isNative() && <p className="text-[11px] muted">Para atualizar o mapa com o app fechado, escolha “Permitir o tempo todo” quando o Android perguntar. Uma notificação discreta fica fixa enquanto compartilha.</p>}
      </div>
    </Sheet>
  );
}

/* ───────── Item do cofre ───────── */
function VaultItemSheet() {
  const { sheet, closeSheet } = useUI();
  const { me, save, remove, rows } = useAtlas();
  const open = sheet?.kind === 'vaultItem';
  const item: VaultItem | undefined = sheet?.payload?.item;
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState(VAULT_CATEGORIES[0]);
  useEffect(() => {
    if (!open) return;
    setLabel(item?.label ?? '');
    setValue(item?.value ?? '');
    setCategory(item?.category ?? VAULT_CATEGORIES[0]);
  }, [open, item]);
  if (!me) return null;
  return (
    <Sheet
      open={open}
      onClose={closeSheet}
      title={item ? 'Editar item' : 'Novo item no cofre'}
      footer={
        <div className="flex gap-2">
          {item && <Button variant="danger" className="w-12 shrink-0 px-0" onClick={() => { remove('vault_items', item.id); closeSheet(); }}><Trash2 size={16} /></Button>}
          <Button variant="primary" className="flex-1" disabled={!label.trim() || !value.trim()} onClick={() => {
            save('vault_items', { id: item?.id ?? uid(), createdBy: item?.createdBy ?? me.id, label: label.trim(), value: value.trim(), category, sort: item?.sort ?? rows('vault_items').length, createdAt: item?.createdAt ?? new Date().toISOString() });
            closeSheet();
          }}>Salvar</Button>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        <Field label="Nome"><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Chave Pix da Vitória" className="input" /></Field>
        <Field label="Valor"><input value={value} onChange={(e) => setValue(e.target.value)} placeholder="O que será copiado" className="input font-mono" /></Field>
        <Field label="Categoria"><div className="flex flex-wrap gap-2">{VAULT_CATEGORIES.map((c) => <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</Chip>)}</div></Field>
      </div>
    </Sheet>
  );
}

/* ───────── Editar tela inicial ───────── */
function EditHomeSheet() {
  const { sheet, closeSheet } = useUI();
  const { layout, update, reset } = useHomeLayout();
  const open = sheet?.kind === 'editHome';
  const move = (i: number, d: number) => {
    const o = [...layout.order];
    const j = i + d;
    if (j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j], o[i]];
    update({ ...layout, order: o });
  };
  const toggle = (id: (typeof layout.order)[number]) => update({ ...layout, hidden: layout.hidden.includes(id) ? layout.hidden.filter((x) => x !== id) : [...layout.hidden, id] });
  return (
    <Sheet open={open} onClose={closeSheet} title="Editar tela" footer={<div className="flex gap-2"><Button className="flex-1" onClick={reset}>Restaurar</Button><Button variant="primary" className="flex-1" onClick={closeSheet}>Pronto</Button></div>}>
      <div className="space-y-2 pt-1">
        {layout.order.map((id, i) => {
          const s = HOME_SECTIONS.find((x) => x.id === id)!;
          const hidden = layout.hidden.includes(id);
          return (
            <div key={id} className={cn('glass-thin flex items-center gap-2 p-2.5 pl-4', hidden && 'opacity-45')}>
              <span className="flex-1 text-[15px] font-medium">{s.label}</span>
              <button aria-label="Subir" onClick={() => move(i, -1)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"><ArrowUp size={16} /></button>
              <button aria-label="Descer" onClick={() => move(i, 1)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"><ArrowDown size={16} /></button>
              <button aria-label={hidden ? 'Mostrar' : 'Ocultar'} onClick={() => toggle(id)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10">{hidden ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

export function NewSheets() {
  return (
    <>
      <PermissionsSheet />
      <VaultItemSheet />
      <EditHomeSheet />
    </>
  );
}
