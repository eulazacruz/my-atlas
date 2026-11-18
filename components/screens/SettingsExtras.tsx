'use client';

import { Bell, CalendarDays, Crosshair, KeyRound, MapPin } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useIsland } from '@/components/island/IslandProvider';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI } from '@/components/providers/UIProvider';
import { Button, Chip, Glass, Section, Switch } from '@/components/ui/primitives';
import { getMyFeed, refreshCalendar, saveMyFeed, useExternalEvents } from '@/lib/calendar';
import { CONTEXT_STATUS, DEFAULT_VAULT_PIN, NEEDS, PET_ACTIONS } from '@/lib/constants';
import { AtlasNative, haptic, isNative } from '@/lib/native';
import { getSupabase } from '@/lib/supabase';
import { firstName } from '@/lib/utils';

/** Barra que dispara os eventos da Atlas Island como se viessem do seu par. */
export function IslandSimulator() {
  const { partner, sendNudge, finishSleep } = useAtlas();
  const { push } = useIsland();
  const p = partner && !partner.pending ? firstName(partner.displayName) : 'Seu amor';
  const av = { name: p, url: partner?.avatarUrl };
  const fire = (fn: () => void) => { haptic('medium'); fn(); };
  const items: { label: string; run: () => void }[] = [
    ...CONTEXT_STATUS.map((s) => ({ label: `${s.emoji} ${s.short}`, run: () => push({ kind: 'status', title: `${p} está ${s.short.toLowerCase()} ${s.emoji}`, subtitle: 'Status de contexto atualizado', avatar: av }) })),
    ...NEEDS.map((n) => ({ label: `${n.emoji} ${n.short}`, run: () => push({ kind: 'need', title: `${p}: ${n.label} ${n.emoji}`, subtitle: n.hint, avatar: av, actions: [{ label: 'Estou indo', primary: true, onClick: () => sendNudge('carinho') }, { label: 'Ok' }], duration: 9000 }) })),
    ...PET_ACTIONS.map((a) => ({ label: `${a.emoji} ${a.label}`, run: () => push({ kind: 'pet', title: `${p} ${a.notify} ${a.emoji}`, subtitle: 'Atlas virtual', avatar: av }) })),
    {
      label: '☀️ Acordar (sono)',
      run: () => {
        window.dispatchEvent(new Event('atlas:simulate-wake'));
        push({ kind: 'sleep', title: 'Bom dia! Você dormiu 7h 40min ☀️', subtitle: 'Confirmar registro do sono?', actions: [{ label: 'Confirmar', primary: true, onClick: () => finishSleep(true) }, { label: 'Descartar', onClick: () => finishSleep(false) }], duration: 12000 });
      },
    },
    { label: '☕ Cafeína alta', run: () => push({ kind: 'caffeine', title: '120 mg de cafeína às 22h ⚠️', subtitle: 'Pode atrapalhar seu sono hoje' }) },
    { label: '📍 Chegou em casa', run: () => push({ kind: 'location', title: `${p} chegou em casa 🏠`, subtitle: 'Localização em tempo real', avatar: av }) },
    { label: '🔑 Cofre', run: () => push({ kind: 'vault', title: 'Chave Pix copiada ✓', subtitle: 'Pronto para colar' }) },
  ];
  return (
    <Section title="Simulador de eventos da câmera">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {items.map((i) => (
          <Chip key={i.label} onClick={() => fire(i.run)}>{i.label}</Chip>
        ))}
      </div>
    </Section>
  );
}

function Slider({ label, value, min, max, step, onChange, fmt }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; fmt: (v: number) => string }) {
  return (
    <label className="block">
      <div className="mb-1 flex justify-between text-[13px]"><span>{label}</span><span className="tabular-nums muted">{fmt(value)}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-black dark:accent-white" />
    </label>
  );
}

/** Ilha fora do app: o cartão em volta da câmera quando chega notificação com o app fechado. */
export function IslandOutside() {
  const { calib, push } = useIsland();
  const { state, me } = useAtlas();
  const [st, setSt] = useState<{ permission: boolean; enabled: boolean } | null>(null);
  const refresh = useCallback(() => { if (isNative()) AtlasNative.islandOverlayState().then(setSt).catch(() => setSt(null)); }, []);
  useEffect(() => {
    refresh();
    const on = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, [refresh]);
  const set = async (enabled: boolean) => {
    if (enabled && st && !st.permission) { await AtlasNative.openOverlaySettings(); return; }
    await AtlasNative.setIslandOverlay({ enabled, ...calib });
    const sb = getSupabase();
    if (sb && me && state) await sb.from('push_tokens').update({ island: enabled }).eq('profile_id', me.id);
    refresh();
    if (enabled) push({ kind: 'success', title: 'Ilha fora do app ativada ✨', subtitle: 'Feche o app e peça um cutucão para testar', duration: 3500 });
  };
  if (!isNative()) return null;
  return (
    <Section title="Ilha fora do app">
      <Glass className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <p className="flex-1 text-[13.5px] leading-snug">Quando chegar uma notificação com o app fechado, ela aparece num cartão que nasce em volta da câmera.</p>
          <Switch checked={!!st?.enabled && !!st?.permission} onChange={set} label="Ilha fora do app" />
        </div>
        {st && !st.permission && <p className="text-[12.5px] muted">Precisa da permissão “Sobrepor a outros apps”. Ao ativar, o app abre essa tela: ligue para o My Atlas e volte. No Xiaomi, libere também “Mostrar janelas pop-up em segundo plano” e “Início automático”.</p>}
        {st?.enabled && st.permission && <Button className="w-full" onClick={() => AtlasNative.testIsland({ title: 'Seu amor te mandou um carinho 🤍', body: 'Assim que fica a ilha fora do app' })}>Testar agora</Button>}
      </Glass>
    </Section>
  );
}

export function IslandCalibration() {
  const { calib, setCalib, push } = useIsland();
  useEffect(() => { if (isNative()) AtlasNative.islandOverlayState().then((st) => AtlasNative.setIslandOverlay({ enabled: st.enabled, ...calib })).catch(() => {}); }, [calib]);
  const preview = () => push({ kind: 'success', title: 'Posição da ilha', subtitle: 'Ajuste até ficar ao redor da câmera', duration: 3000 });
  return (
    <Section title="Posição da ilha na câmera">
      <Glass className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <Crosshair size={18} />
          <p className="flex-1 text-[13px] muted">{isNative() ? 'O app detecta o furo da câmera automaticamente. Use os ajustes finos se precisar.' : 'No APK a posição é automática. Aqui você pode ajustar manualmente.'}</p>
        </div>
        <Slider label="Horizontal" value={calib.dx} min={-60} max={60} step={1} onChange={(dx) => setCalib({ ...calib, dx })} fmt={(v) => `${v > 0 ? '+' : ''}${v}px`} />
        <Slider label="Vertical" value={calib.dy} min={-30} max={30} step={1} onChange={(dy) => setCalib({ ...calib, dy })} fmt={(v) => `${v > 0 ? '+' : ''}${v}px`} />
        <Slider label="Tamanho" value={calib.scale} min={0.7} max={1.4} step={0.02} onChange={(scale) => setCalib({ ...calib, scale })} fmt={(v) => `${Math.round(v * 100)}%`} />
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => setCalib({ dx: 0, dy: 0, scale: 1 })}>Restaurar</Button>
          <Button variant="primary" className="flex-1" onClick={preview}>Pré-visualizar</Button>
        </div>
      </Glass>
    </Section>
  );
}

export function PrivacyAndPermissions() {
  const { openSheet, navigate } = useUI();
  const { push } = useIsland();
  const [pin, setPin] = useState('');
  const [hasCustom, setHasCustom] = useState(false);
  useEffect(() => {
    try { setHasCustom(!!localStorage.getItem('my-atlas:vault-pin')); } catch { /* noop */ }
  }, []);
  const savePin = () => {
    if (!/^\d{4}$/.test(pin)) return;
    try { localStorage.setItem('my-atlas:vault-pin', pin); } catch { /* noop */ }
    setHasCustom(true);
    setPin('');
    push({ kind: 'vault', title: 'PIN do cofre alterado 🔒' });
  };
  return (
    <Section title="Permissões & privacidade">
      <div className="glass overflow-hidden">
        <button onClick={() => openSheet('permissions')} className="flex w-full items-center gap-3 border-b px-4 py-3.5 text-left hairline">
          <Bell size={18} /><span className="flex-1 text-[15px]">Notificações e localização</span>
        </button>
        <button onClick={() => navigate('location')} className="flex w-full items-center gap-3 border-b px-4 py-3.5 text-left hairline">
          <MapPin size={18} /><span className="flex-1 text-[15px]">Mapa em tempo real</span>
        </button>
        <div className="flex items-center gap-3 px-4 py-3">
          <KeyRound size={18} />
          <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder={hasCustom ? 'Novo PIN do cofre' : `PIN do cofre (atual ${DEFAULT_VAULT_PIN})`} className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
          <Button className="h-9 px-4 text-[13px]" disabled={pin.length !== 4} onClick={savePin}>Salvar</Button>
        </div>
      </div>
    </Section>
  );
}

/* ───────── Google Agenda (iCal secreto) ───────── */
export function GoogleCalendarSettings() {
  const { me, state, mode } = useAtlas();
  const { push } = useIsland();
  const [url, setUrl] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);
  const ext = useExternalEvents(mode !== 'demo');
  useEffect(() => {
    if (!me || mode === 'demo') return;
    getMyFeed(me.id).then((u) => { setUrl(u); setSaved(u); });
  }, [me, mode]);
  if (!me || !state) return null;
  const mine = ext.feeds.find((f) => f.owner === me.id);
  const save = async () => {
    if (url && !/^(https|webcal):\/\/.+/i.test(url.trim())) {
      push({ kind: 'agenda', title: 'Endereço inválido', subtitle: 'Cole o "Endereço secreto no formato iCal"', duration: 3500 });
      return;
    }
    if (/\/public\/basic\.ics/i.test(url)) {
      push({ kind: 'agenda', title: 'Esse é o endereço público', subtitle: 'Use o "Endereço secreto no formato iCal" (tem "private-" no link)', duration: 6000 });
      setHelp(true);
      return;
    }
    setBusy(true);
    try {
      await saveMyFeed(me.id, state.couple.id, url);
      setSaved(url.trim());
      push({ kind: 'agenda', title: url ? 'Google Agenda conectada 📅' : 'Google Agenda desconectada', subtitle: url ? 'Seus compromissos aparecem na Agenda do casal' : undefined, duration: 3500 });
    } catch (e) {
      push({ kind: 'agenda', title: 'Não deu para salvar', subtitle: String((e as Error).message ?? e), duration: 4000 });
    }
    setBusy(false);
  };
  return (
    <Section title="Google Agenda">
      <Glass className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl text-white" style={{ background: '#4285F4' }}><CalendarDays size={18} /></span>
          <div className="flex-1">
            <p className="text-[15px] font-medium">Sua agenda do Google</p>
            <p className="text-[12px] muted">
              {mode === 'demo' ? 'Disponível com a conta conectada.' : saved ? (mine?.ok ? `${mine.count ?? 0} compromissos sincronizados` : mine?.error ? (/404|403/.test(mine.error) ? 'Link não aceito pelo Google: use o endereço secreto' : `Erro: ${mine.error}`) : 'Conectada') : 'Não conectada'}
            </p>
          </div>
          {saved && <button onClick={() => refreshCalendar(true)} className="text-[12px] font-semibold muted">{ext.loading ? '…' : 'Atualizar'}</button>}
        </div>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Endereço secreto no formato iCal" className="input font-mono text-[12px]" disabled={mode === 'demo'} />
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => setHelp((h) => !h)}>{help ? 'Fechar ajuda' : 'Como pegar?'}</Button>
          <Button variant="primary" className="flex-1" disabled={busy || mode === 'demo' || url.trim() === saved} onClick={save}>{busy ? 'Salvando…' : 'Salvar'}</Button>
        </div>
        {help && (
          <ol className="list-decimal space-y-1.5 pl-5 text-[13px] leading-snug muted">
            <li>No computador, abra <b>calendar.google.com</b> (no celular, use “Versão para computador” no Chrome).</li>
            <li>Na lista “Minhas agendas”, passe o mouse na sua agenda → ⋮ → <b>Configurações e compartilhamento</b>.</li>
            <li>Role até <b>Integrar agenda</b> e copie o <b>Endereço secreto no formato iCal</b> (o último da seção, termina com <b>private-…/basic.ics</b>). O “Endereço público” não funciona.</li>
            <li>Cole aqui e salve. O endereço fica guardado só no servidor; seu amor vê os compromissos, nunca o link.</li>
          </ol>
        )}
      </Glass>
    </Section>
  );
}

/* ───────── Localização com o app fechado ───────── */
export const BG_LOC_KEY = 'my-atlas:bg-location';
export function LocationBackgroundSetting() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try { setOn(localStorage.getItem(BG_LOC_KEY) === '1'); } catch { /* noop */ }
  }, []);
  const toggle = (v: boolean) => {
    setOn(v);
    try { localStorage.setItem(BG_LOC_KEY, v ? '1' : '0'); } catch { /* noop */ }
    window.dispatchEvent(new Event('atlas:bg-location'));
  };
  if (!isNative()) return null;
  return (
    <Glass className="flex items-center gap-3 p-4">
      <MapPin size={18} />
      <div className="flex-1">
        <p className="text-[15px] font-medium">Atualizar com o app fechado</p>
        <p className="text-[12px] muted">{on ? 'Ligado: o Android mostra um aviso fixo enquanto atualiza.' : 'Desligado: sem aviso fixo. A posição atualiza sempre que você abre o app.'}</p>
      </div>
      <Switch checked={on} onChange={toggle} label="Localização em segundo plano" />
    </Glass>
  );
}
