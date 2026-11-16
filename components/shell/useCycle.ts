'use client';

import { useMemo } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { cycleInfo } from '@/lib/cycle';

/**
 * De quem é o ciclo exibido e o que o usuário atual pode ver/editar.
 * Prioridade: o meu ciclo (se eu acompanho) → o do meu par (se ele/ela compartilha).
 */
export function useCycle() {
  const { rows, me, partner } = useAtlas();
  const settings = rows('cycle_settings');
  const allDays = rows('cycle_days');

  return useMemo(() => {
    const mine = settings.find((s) => s.id === me?.id && s.tracking);
    const theirs = settings.find((s) => s.id === partner?.id && s.tracking);
    const ownerSettings = mine ?? theirs ?? null;
    const owner = mine ? me : theirs ? partner : null;
    const isOwner = !!mine;
    const hidden = !mine && !!theirs && !theirs.shareWithPartner;
    const days = owner && !hidden ? allDays.filter((d) => d.profileId === owner.id) : [];
    const info = cycleInfo(days, ownerSettings);
    return { owner, settings: ownerSettings, isOwner, hidden, days, info, active: !!ownerSettings && !hidden };
  }, [settings, allDays, me, partner]);
}
