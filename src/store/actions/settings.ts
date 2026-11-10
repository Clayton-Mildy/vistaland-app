import { formatRp } from '../../domain/money';
import type { ProjectSettings } from '../../domain/types';
import { ActionError } from '../errors';
import { logActivity } from '../notify';
import type { Action } from '../store';
import { resyncUnit } from './billingSync';

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends unknown[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K] };

function merge<T>(target: T, patch: DeepPartial<T>) {
  for (const [k, v] of Object.entries(patch) as [keyof T, unknown][]) {
    if (v && typeof v === 'object' && !Array.isArray(v)) merge(target[k] as object, v as DeepPartial<object>);
    else if (v !== undefined) target[k] = v as T[keyof T];
  }
}

const between = (v: number, min: number, max = Infinity) => Number.isFinite(v) && v >= min && v <= max;

/** Values outside these ranges would break billing or screens (e.g. due day 0 makes every bill overdue). */
function validSettings(s: ProjectSettings): boolean {
  const pkgOk = (k: { months: number; discountType: string; value: number }) =>
    k.discountType === 'percent' ? between(k.value, 0, 50) : k.discountType === 'freeMonths' ? between(k.value, 0, k.months - 1) : true;
  return (
    between(s.ipl.freeMonths, 0, 24) && between(s.ipl.dueDay, 1, 28) &&
    between(s.wifi.freeMonths, 0, 12) && s.wifi.packages.every((w) => w.name.trim() !== '' && between(w.mbps, 1) && between(w.price, 1)) &&
    [s.cards.freeCards, s.cards.freeStickers, s.cards.maxExtraCards].every((n) => between(n, 0, 10)) &&
    between(s.cards.extraCardPrice, 0) && between(s.cards.extraStickerPrice, 0) &&
    between(s.complaints.windowDays, 1, 730) && Object.values(s.complaints.slaDays).every((n) => between(n, 1, 90)) &&
    between(s.handover.intervalDays, 1, 30) && between(s.handover.maxCalls, 1, 3) &&
    between(s.renovation.deposit, 0) &&
    between(s.overdue.flagMonths, 1, 12) &&
    between(s.fuel.litersPer1000m2, 0.01) && between(s.fuel.tolerancePct, 0, 100) &&
    [...s.prepay.ipl, ...s.prepay.wifi].every(pkgOk)
  );
}

export const updateSettings: Action<{ projectId: string; patch: DeepPartial<ProjectSettings>; by?: string }> = (d, p) => {
  const project = d.projects.find((x) => x.id === p.projectId)!;
  merge(project.settings, p.patch);
  if (!validSettings(project.settings)) throw new ActionError('error.outOfRange');
  if (project.segment === 'subsidi') {
    // Subsidized homes must be owner-occupied: no renting out, no house listings.
    project.settings.features.renterRegistration = false;
    project.settings.features.houseListings = false;
  }
  for (const section of Object.keys(p.patch)) logActivity(d, project.id, p.by ?? 'Admin Estate', `activity.settingsChanged.${section}`, {});
  if (p.patch.ipl || p.patch.wifi) for (const u of d.units.filter((x) => x.projectId === project.id && x.handover.bastDate)) resyncUnit(d, u.id);
};

export const setUnitTypeRate: Action<{ typeId: string; rate: number; by?: string }> = (d, p) => {
  if (!between(p.rate, 1)) throw new ActionError('error.outOfRange');
  const type = d.unitTypes.find((t) => t.id === p.typeId)!;
  type.iplRate = p.rate;
  logActivity(d, type.projectId, p.by ?? 'Admin Estate', 'activity.rateChanged', { type: type.name, rate: formatRp(p.rate) });
  for (const u of d.units.filter((x) => x.typeId === type.id && x.handover.bastDate)) resyncUnit(d, u.id);
};
