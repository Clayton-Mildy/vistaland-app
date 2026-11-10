import { addDays, diffDays, monthOf } from './clock';
import type { Expense, ExpenseCategory, FuelEntry, ISODate, Machine, MonthKey, MowingLog, ProjectSettings, Zone } from './types';

const r1 = (x: number) => Math.round(x * 10) / 10;
const inMonth = (iso: string, m: MonthKey) => iso.slice(0, 7) === m;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export interface FuelWeek { label: string; from: number; to: number; opening: number; bought: number; expectedUse: number; expectedBalance: number; measured?: number; diff?: number }

/**
 * Jerrycan reconciliation for one month: opening balance (last physical check
 * before the month) + fuel bought − fuel the cut area should have used − the
 * measured closing balance = fuel nobody can account for.
 */
export function fuelReconciliation(entries: FuelEntry[], logs: MowingLog[], s: ProjectSettings['fuel'], month: MonthKey) {
  const checks = entries.filter((e) => e.kind === 'check').sort((a, b) => a.at.localeCompare(b.at));
  const opening = checks.filter((c) => c.at.slice(0, 7) < month).at(-1)?.liters ?? 0;
  const monthEntries = entries.filter((e) => inMonth(e.at, month));
  const monthLogs = logs.filter((l) => inMonth(l.date, month));
  const bought = r1(sum(monthEntries.filter((e) => e.kind === 'buy').map((e) => e.liters)));
  const area = sum(monthLogs.map((l) => l.area));
  const expectedUse = r1((area / 1000) * s.litersPer1000m2);
  const monthChecks = checks.filter((c) => inMonth(c.at, month));
  const closingMeasured = monthChecks.at(-1)?.liters ?? r1(opening + bought - expectedUse);
  const unexplained = r1(opening + bought - expectedUse - closingMeasured);
  const unexplainedPct = expectedUse > 0 ? r1((unexplained / expectedUse) * 100) : 0;

  const ranges: [number, number][] = [[1, 7], [8, 14], [15, 21], [22, 31]];
  let carry = opening;
  const weeks: FuelWeek[] = ranges.map(([from, to]) => {
    const day = (iso: string) => Number(iso.slice(8, 10));
    const inRange = (iso: string) => inMonth(iso, month) && day(iso) >= from && day(iso) <= to;
    const w_bought = r1(sum(monthEntries.filter((e) => e.kind === 'buy' && inRange(e.at)).map((e) => e.liters)));
    const w_use = r1((sum(monthLogs.filter((l) => inRange(l.date)).map((l) => l.area)) / 1000) * s.litersPer1000m2);
    const expectedBalance = r1(carry + w_bought - w_use);
    const measured = monthChecks.filter((c) => inRange(c.at)).at(-1)?.liters;
    const week: FuelWeek = { label: `${from}–${to}`, from, to, opening: carry, bought: w_bought, expectedUse: w_use, expectedBalance, measured, diff: measured === undefined ? undefined : r1(measured - expectedBalance) };
    carry = measured ?? expectedBalance;
    return week;
  });
  return { opening, bought, area, expectedUse, closingMeasured, unexplained, unexplainedPct, withinTolerance: unexplainedPct <= s.tolerancePct, weeks };
}

export function machineEfficiency(machines: Machine[], entries: FuelEntry[], logs: MowingLog[], s: ProjectSettings['fuel'], month: MonthKey) {
  return machines.map((m) => {
    const liters = r1(sum(entries.filter((e) => e.kind === 'refill' && e.machineId === m.id && inMonth(e.at, month)).map((e) => e.liters)));
    const area = sum(logs.filter((l) => l.machineId === m.id && inMonth(l.date, month)).map((l) => l.area));
    const per1000 = area ? Math.round((liters / (area / 1000)) * 100) / 100 : 0;
    const overPct = area ? Math.round(((per1000 - s.litersPer1000m2) / s.litersPer1000m2) * 100) : 0;
    return { machine: m, liters, area, per1000, overPct, wasteful: overPct > 20 };
  });
}

export function zoneStats(zones: Zone[], logs: MowingLog[], s: ProjectSettings['fuel'], month: MonthKey, today: ISODate) {
  return zones.map((z) => {
    const zl = logs.filter((l) => l.zoneId === z.id && inMonth(l.date, month));
    const cycleDays = Math.round(30 / z.perMonth);
    const due = z.lastCut ? addDays(z.lastCut, cycleDays) : today;
    return { zone: z, cuts: zl.length, liters: r1(((zl.length * z.area) / 1000) * s.litersPer1000m2), daysLate: Math.max(0, diffDays(due, today)), due };
  });
}

/** Things worth a second look: fuel with no mowing, late zones, implausibly fast logs, thirsty machines. */
export function fuelFlags(entries: FuelEntry[], logs: MowingLog[], zones: Zone[], machines: Machine[], s: ProjectSettings['fuel'], month: MonthKey, today: ISODate) {
  const flags: { kind: 'fuelNoWork' | 'lateZone' | 'tooFast' | 'wasteful'; params: Record<string, string | number> }[] = [];
  for (const e of entries.filter((x) => x.kind === 'refill' && inMonth(x.at, month))) {
    const d = e.at.slice(0, 10);
    const worked = logs.some((l) => l.machineId === e.machineId && l.date >= d && diffDays(d, l.date) <= 3);
    if (!worked) flags.push({ kind: 'fuelNoWork', params: { date: d, liters: e.liters, machine: machines.find((m) => m.id === e.machineId)?.name ?? '' } });
  }
  for (const z of zoneStats(zones, logs, s, month, today)) if (z.daysLate > 0) flags.push({ kind: 'lateZone', params: { zone: z.zone.name, days: z.daysLate } });
  for (const l of logs.filter((x) => inMonth(x.date, month))) {
    const [sh, sm] = l.start.split(/[.:]/).map(Number);
    const [eh, em] = l.end.split(/[.:]/).map(Number);
    const minutes = eh * 60 + em - (sh * 60 + sm);
    if (minutes > 0 && l.area / minutes > 120) flags.push({ kind: 'tooFast', params: { date: l.date, zone: zones.find((z) => z.id === l.zoneId)?.name ?? '', minutes, area: l.area } });
  }
  for (const m of machineEfficiency(machines, entries, logs, s, month)) if (m.wasteful) flags.push({ kind: 'wasteful', params: { machine: m.machine.name, pct: m.overPct } });
  return flags;
}

export function budgetVsActual(expenses: Expense[], budget: Record<ExpenseCategory, number>, month: MonthKey) {
  return (Object.keys(budget) as ExpenseCategory[]).map((category) => {
    const actual = sum(expenses.filter((e) => e.category === category && monthOf(e.date) === month).map((e) => e.amount));
    return { category, budget: budget[category], actual, diff: actual - budget[category] };
  });
}
