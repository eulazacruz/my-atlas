'use client';
/* Módulos de cada pessoa: definidos no primeiro acesso (sexo, casal, fé, pet) e ajustáveis depois. */
import { useAtlas } from '@/components/providers/AtlasProvider';
import type { ModuleKey, Profile } from './types';

export type Modules = Record<ModuleKey, boolean> & { hasPartner: boolean; setupDone: boolean };

export function modulesOf(me?: Profile | null, partner?: Profile | null): Modules {
  const o = me?.modules ?? {};
  const coupleWanted = o.couple ?? (me?.coupleMode !== false);
  return {
    cycle: o.cycle ?? (me?.sex === 'f' || (coupleWanted && partner?.sex === 'f') || (me?.sex == null && partner?.sex == null)),
    faith: o.faith ?? (me?.christian !== false),
    couple: coupleWanted,
    pet: o.pet ?? (me?.hasPet !== false),
    finance: o.finance ?? true,
    lang: o.lang ?? true,
    nutrition: o.nutrition ?? true,
    hasPartner: !!partner && !partner.pending,
    setupDone: me?.setupDone !== false,
  };
}

export function useModules(): Modules {
  const { me, partner } = useAtlas();
  return modulesOf(me, partner);
}

/** Recursos que só fazem sentido em casal (com o par já conectado). */
export const COUPLE_TOOLS = new Set(['social', 'journey', 'wishlist', 'challenges', 'trilha']);
export const FAITH_TOOLS = new Set(['psalm', 'lectio', 'acts', 'examen', 'prayertimes', 'fruit', 'gifts', 'grace', 'narrated', 'churchday']);
export function toolAllowed(id: string, m: Modules) {
  if (COUPLE_TOOLS.has(id)) return m.couple && m.hasPartner;
  if (FAITH_TOOLS.has(id)) return m.faith;
  if (id === 'nutrition') return m.nutrition;
  if (id === 'idiomas') return m.lang;
  if (id === 'piggy') return m.finance;
  return true;
}
/** Seções da tela inicial permitidas. */
export function homeAllowed(id: string, m: Modules) {
  if (['social', 'care', 'couple'].includes(id)) return m.couple && m.hasPartner;
  if (id === 'status') return m.couple && m.hasPartner;
  if (id === 'faith') return m.faith;
  if (id === 'pet') return m.pet;
  if (id === 'lang') return m.lang;
  return true;
}
