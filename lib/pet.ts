import type { HabitLog, HouseholdLog, PetVirtual } from './types';
import { HOUSE_TASKS } from './constants';

export type PetPose = 'alert' | 'playing' | 'sleeping' | 'happy';

/** Estado derivado do Atlas virtual: decai/recupera com o tempo e ganha XP com hábitos e tarefas reais. */
export function petStats(p: PetVirtual | undefined, habits: HabitLog[], house: HouseholdLog[], now = new Date()) {
  const habitXp = habits.reduce((s, h) => s + [h.devotional, h.workout, h.cleanDiet, h.reading].filter(Boolean).length * 5 + (h.waterMl >= 3000 ? 5 : 0), 0);
  const houseXp = house.reduce((s, h) => s + (HOUSE_TASKS.find((t) => t.value === h.task)?.points ?? 1) * 10, 0);
  const xp = habitXp + houseXp + (p?.bonusXp ?? 0);
  const level = Math.floor(Math.sqrt(xp / 60)) + 1;
  const base = 60 * (level - 1) ** 2;
  const next = 60 * level ** 2;
  const levelPct = ((xp - base) / (next - base)) * 100;

  const since = p?.updatedAt ? (now.getTime() - new Date(p.updatedAt).getTime()) / 3_600_000 : 0;
  const happiness = Math.max(5, Math.round((p?.happiness ?? 80) - since * 3));
  const energy = Math.min(100, Math.round((p?.energy ?? 80) + since * 4));
  const h = now.getHours();
  const night = h >= 23 || h < 6;
  const recent = p?.lastActionAt && now.getTime() - new Date(p.lastActionAt).getTime() < 90_000;

  let pose: PetPose = happiness >= 65 ? 'happy' : 'alert';
  if (night || energy < 20) pose = 'sleeping';
  if (recent && p?.lastAction === 'pet_cabo') pose = 'playing';
  else if (recent && p?.lastAction) pose = p.lastAction === 'pet_lambida' ? 'alert' : 'happy';

  const label = { alert: 'Forte & alerta', playing: 'Brincando', sleeping: 'Dormindo', happy: 'Feliz' }[pose];
  return { xp, level, levelPct, nextXp: next, happiness, energy, pose, label };
}
