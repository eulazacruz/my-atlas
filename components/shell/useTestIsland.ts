'use client';

import { useRef } from 'react';
import { useIsland } from '@/components/island/IslandProvider';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI } from '@/components/providers/UIProvider';
import { firstName, money } from '@/lib/utils';

/** Simula, em sequência, os diferentes alertas da Atlas Island. */
export function useTestIsland() {
  const { partner, addWater, sendNudge } = useAtlas();
  const { push, setBreathingStartedAt } = useIsland();
  const { setBreathingOpen, navigate } = useUI();
  const step = useRef(0);

  return () => {
    const p = partner && !partner.pending ? firstName(partner.displayName) : 'Esposa';
    const samples = [
      () => push({ kind: 'mood', title: `${p} está radiante ☀️`, subtitle: 'Bateria mental em 92%', avatar: { name: p, url: partner?.avatarUrl }, actions: [{ label: 'Enviar carinho', primary: true, onClick: () => sendNudge('carinho') }, { label: 'Ok' }] }),
      () => push({ kind: 'expense', title: `Nova despesa: ${money(45)}`, subtitle: `${p} · Padaria · Nossa`, avatar: { name: p }, actions: [{ label: 'Ver carteira', primary: true, onClick: () => navigate('finance') }] }),
      () => push({ kind: 'water', title: 'Hora de beber 500ml de água 💧', subtitle: 'Bora manter o ritmo.', actions: [{ label: '+500ml', primary: true, onClick: () => addWater(500) }, { label: 'Depois' }], duration: 8000 }),
      () => {
        setBreathingStartedAt(Date.now());
        push({ kind: 'breathing', title: 'Timer de respiração ativo', subtitle: 'Box breathing 4·4·4·4', actions: [{ label: 'Abrir guia', primary: true, onClick: () => setBreathingOpen(true) }, { label: 'Parar', onClick: () => setBreathingStartedAt(null) }], duration: 7000 });
      },
      () => push({ kind: 'nudge', title: `${p} te mandou um carinho 🤍`, subtitle: 'Pensando em você agora.', avatar: { name: p }, actions: [{ label: 'Retribuir', primary: true, onClick: () => sendNudge('carinho') }, { label: 'Fechar' }] }),
      () => push({ kind: 'cycle', title: 'Menstruação prevista em 2 dias', subtitle: 'Hora de deixar o kit pronto e caprichar no carinho.' }),
      () => push({ kind: 'agenda', title: 'Jantar a dois em 1 hora', subtitle: '20:00 · Recife Antigo' }),
      () => push({ kind: 'pet', title: `${p} mandou uma lambida do Atlas 🐾`, subtitle: 'Atlas virtual · +6 XP', avatar: { name: p } }),
      () => push({ kind: 'status', title: `${p} está saindo do trabalho 🚀`, subtitle: 'Status de contexto', avatar: { name: p } }),
      () => push({ kind: 'need', title: `${p}: preciso de colo 🫂`, subtitle: 'Um abraço agora', avatar: { name: p }, actions: [{ label: 'Estou indo', primary: true, onClick: () => sendNudge('carinho') }, { label: 'Ok' }] }),
      () => push({ kind: 'sleep', title: 'Bom dia! Você dormiu 7h 32min ☀️', subtitle: 'Confirmar registro?', actions: [{ label: 'Confirmar', primary: true }, { label: 'Descartar' }] }),
    ];
    samples[step.current % samples.length]();
    step.current += 1;
  };
}
