import type { PhaseKey } from './constants';
import type { CycleDay, CycleSettings } from './types';
import { addDays, daysBetween, parseYmd, ymd } from './utils';

const isBleeding = (d?: CycleDay) => !!d && (d.flow === 'light' || d.flow === 'medium' || d.flow === 'heavy');

export interface CycleInfo {
  starts: string[];
  periodLengths: number[];
  cycleLengths: number[];
  avgCycle: number;
  avgPeriod: number;
  lastStart: string | null;
  cycleDay: number | null;
  nextPeriod: Date | null;
  ovulation: Date | null;
  fertileStart: Date | null;
  fertileEnd: Date | null;
  daysToNext: number | null;
  daysLate: number;
  phase: PhaseKey | null;
  inPeriod: boolean;
}

/** Calcula histórico e previsões a partir dos dias registrados. */
export function cycleInfo(days: CycleDay[], settings?: CycleSettings | null): CycleInfo {
  const byDay = new Map(days.map((d) => [d.day, d]));
  const bleeding = days.filter(isBleeding).map((d) => d.day).sort();
  const starts: string[] = [];
  const periodLengths: number[] = [];
  for (const day of bleeding) {
    const prev = ymd(addDays(parseYmd(day), -1));
    const prev2 = ymd(addDays(parseYmd(day), -2));
    if (!isBleeding(byDay.get(prev)) && !isBleeding(byDay.get(prev2))) {
      starts.push(day);
      let len = 1;
      while (isBleeding(byDay.get(ymd(addDays(parseYmd(day), len))))) len++;
      periodLengths.push(len);
    }
  }
  const cycleLengths: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const n = daysBetween(parseYmd(starts[i - 1]), parseYmd(starts[i]));
    if (n >= 18 && n <= 60) cycleLengths.push(n);
  }
  const avg = (arr: number[], fb: number) => (arr.length ? Math.round(arr.slice(-6).reduce((a, b) => a + b, 0) / Math.min(arr.length, 6)) : fb);
  const avgCycle = avg(cycleLengths, settings?.cycleLength ?? 28);
  const avgPeriod = avg(periodLengths, settings?.periodLength ?? 5);

  const lastStart = starts.at(-1) ?? null;
  const today = new Date();
  if (!lastStart) {
    return { starts, periodLengths, cycleLengths, avgCycle, avgPeriod, lastStart, cycleDay: null, nextPeriod: null, ovulation: null, fertileStart: null, fertileEnd: null, daysToNext: null, daysLate: 0, phase: null, inPeriod: false };
  }
  const cycleDay = daysBetween(parseYmd(lastStart), today) + 1;
  const nextPeriod = addDays(parseYmd(lastStart), avgCycle);
  const daysToNext = daysBetween(today, nextPeriod);
  const daysLate = daysToNext < 0 ? -daysToNext : 0;
  const ovulation = addDays(nextPeriod, -14);
  const fertileStart = addDays(ovulation, -5);
  const fertileEnd = addDays(ovulation, 1);
  const inPeriod = isBleeding(byDay.get(ymd(today))) || cycleDay <= (periodLengths.at(-1) ?? avgPeriod);

  let phase: PhaseKey;
  if (inPeriod) phase = 'menstrual';
  else if (ymd(today) === ymd(ovulation)) phase = 'ovulacao';
  else if (today >= fertileStart && today <= fertileEnd) phase = 'fertil';
  else if (today < fertileStart) phase = 'folicular';
  else phase = 'lutea';

  return { starts, periodLengths, cycleLengths, avgCycle, avgPeriod, lastStart, cycleDay, nextPeriod, ovulation, fertileStart, fertileEnd, daysToNext, daysLate, phase, inPeriod };
}

export type DayKind = 'period' | 'predicted' | 'fertile' | 'ovulation' | null;

/** Classifica um dia do calendário (registros reais + 3 ciclos previstos). */
export function dayKind(dateStr: string, days: CycleDay[], info: CycleInfo): DayKind {
  const rec = days.find((d) => d.day === dateStr);
  if (isBleeding(rec)) return 'period';
  if (!info.nextPeriod) return null;
  const date = parseYmd(dateStr);
  const today = new Date();
  for (let k = 0; k < 4; k++) {
    const start = addDays(info.nextPeriod, info.avgCycle * k);
    const ov = addDays(start, -14);
    if (k === 0 && info.daysLate > 0) continue;
    if (date >= start && daysBetween(start, date) < info.avgPeriod && daysBetween(today, date) >= 0) return 'predicted';
    if (ymd(date) === ymd(ov)) return 'ovulation';
    if (date >= addDays(ov, -5) && date <= addDays(ov, 1)) return 'fertile';
  }
  return null;
}
