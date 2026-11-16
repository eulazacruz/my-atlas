'use client';

import { Bell, Crosshair, KeyRound, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useIsland } from '@/components/island/IslandProvider';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI } from '@/components/providers/UIProvider';
import { Button, Chip, Glass, Section } from '@/components/ui/primitives';
import { CONTEXT_STATUS, DEFAULT_VAULT_PIN, NEEDS, PET_ACTIONS } from '@/lib/constants';
import { haptic, isNative } from '@/lib/native';
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

export function IslandCalibration() {
  const { calib, setCalib, push } = useIsland();
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
