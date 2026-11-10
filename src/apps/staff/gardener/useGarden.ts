import { addDays, diffDays } from '../../../domain/clock';
import { useDerived } from '../../../store/hooks';

/** Gardener data for the staff member's first project, plus a jerrycan balance estimate. */
export function useGarden(gardenerId: string, projectId: string) {
  return useDerived((d) => {
    const zones = d.zones.filter((z) => z.projectId === projectId);
    const fuel = d.fuel.filter((f) => f.projectId === projectId).sort((a, b) => a.at.localeCompare(b.at));
    const lastCheck = fuel.filter((f) => f.kind === 'check').at(-1);
    const after = fuel.filter((f) => !lastCheck || f.at > lastCheck.at);
    const jerrycan = Math.round(((lastCheck?.liters ?? 0) + after.filter((f) => f.kind === 'buy').reduce((a, f) => a + f.liters, 0) - after.filter((f) => f.kind === 'refill').reduce((a, f) => a + f.liters, 0)) * 10) / 10;
    const logs = d.mowingLogs.filter((l) => l.gardenerId === gardenerId).sort((a, b) => b.date.localeCompare(a.date));
    const zoneState = zones.map((z) => {
      const due = z.lastCut ? addDays(z.lastCut, Math.round(30 / z.perMonth)) : d.today;
      return { zone: z, due, late: Math.max(0, diffDays(due, d.today)), doneToday: z.lastCut === d.today };
    }).sort((a, b) => (a.doneToday ? 1 : 0) - (b.doneToday ? 1 : 0) || a.due.localeCompare(b.due));
    return {
      today: d.today, zones, zoneState, fuel, logs, jerrycan,
      machines: d.machines.filter((m) => m.projectId === projectId),
      checkedIn: d.attendance.find((a) => a.gardenerId === gardenerId && a.date === d.today),
      attendance: d.attendance.filter((a) => a.gardenerId === gardenerId),
    };
  }, [gardenerId, projectId]);
}
export const estMinutes = (area: number) => Math.round(area / 32);
export const estLiters = (area: number, per1000: number) => Math.round((area / 1000) * per1000 * 10) / 10;
