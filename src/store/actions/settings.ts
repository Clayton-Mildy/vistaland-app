import { formatRp } from '../../domain/money';
import type { ProjectSettings } from '../../domain/types';
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

export const updateSettings: Action<{ projectId: string; patch: DeepPartial<ProjectSettings>; by?: string }> = (d, p) => {
  const project = d.projects.find((x) => x.id === p.projectId)!;
  merge(project.settings, p.patch);
  if (project.segment === 'subsidi') {
    // Subsidized homes must be owner-occupied: no renting out, no house listings.
    project.settings.features.renterRegistration = false;
    project.settings.features.houseListings = false;
  }
  for (const section of Object.keys(p.patch)) logActivity(d, project.id, p.by ?? 'Admin Estate', `activity.settingsChanged.${section}`, {});
  if (p.patch.ipl || p.patch.wifi) for (const u of d.units.filter((x) => x.projectId === project.id && x.handover.bastDate)) resyncUnit(d, u.id);
};

export const setUnitTypeRate: Action<{ typeId: string; rate: number; by?: string }> = (d, p) => {
  const type = d.unitTypes.find((t) => t.id === p.typeId)!;
  type.iplRate = p.rate;
  logActivity(d, type.projectId, p.by ?? 'Admin Estate', 'activity.rateChanged', { type: type.name, rate: formatRp(p.rate) });
  for (const u of d.units.filter((x) => x.typeId === type.id && x.handover.bastDate)) resyncUnit(d, u.id);
};
