import { CAFFEINE_HALF_LIFE_H } from './constants';
import type { CaffeineLog, SleepLog } from './types';

/** mg de cafeína ativos num instante (decaimento exponencial, meia-vida ~5h). */
export function caffeineAt(logs: CaffeineLog[], t: Date) {
  return logs.reduce((s, l) => {
    const dt = (t.getTime() - new Date(l.takenAt).getTime()) / 3_600_000;
    return dt < 0 ? s : s + l.mg * Math.pow(0.5, dt / CAFFEINE_HALF_LIFE_H);
  }, 0);
}

/** Curva de agora até as 24h (pontos a cada 30 min). */
export function caffeineCurve(logs: CaffeineLog[], from = new Date()) {
  const start = new Date(from);
  start.setMinutes(start.getMinutes() < 30 ? 0 : 30, 0, 0);
  const end = new Date(from);
  end.setHours(24, 0, 0, 0);
  const pts: { t: string; mg: number }[] = [];
  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 30 * 60_000)) {
    pts.push({ t: `${String(d.getHours() % 24).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, mg: Math.round(caffeineAt(logs, d)) });
  }
  return pts;
}

export const fmtDuration = (min: number) => `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, '0')}m`;

export function lastNight(logs: SleepLog[], profileId: string) {
  return logs.filter((l) => l.profileId === profileId && l.wokeAt).sort((a, b) => b.sleptAt.localeCompare(a.sleptAt))[0];
}
export function activeSleep(logs: SleepLog[], profileId: string) {
  return logs.find((l) => l.profileId === profileId && !l.wokeAt);
}
