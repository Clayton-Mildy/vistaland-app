import { useCallback, useMemo } from 'react';
import { canUse, type AccessResult } from '../domain/access';
import type { AppData, Customer, Project, ProjectSettings, Renter, ResidentFeature, ResidentIdentity, Segment, Unit, UnitType } from '../domain/types';
import { useStore } from './store';

/** Select a value that already exists in the store (or a primitive). */
export const useData = <T,>(sel: (d: AppData) => T): T => useStore((s) => sel(s.data));
/** Compute a derived value from the whole store, memoised on the data snapshot. */
export function useDerived<T>(fn: (d: AppData) => T, deps: unknown[] = []): T {
  const data = useStore((s) => s.data);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => fn(data), [data, ...deps]);
}
export const useRun = () => useStore((s) => s.run);
export const useToday = () => useStore((s) => s.data.today);
export const useStorageOk = () => useStore((s) => s.storageOk);

export interface ResidentCtx {
  identity: ResidentIdentity;
  name: string;
  phone: string;
  role: 'owner' | 'renter';
  unit: Unit;
  project: Project;
  type: UnitType;
  settings: ProjectSettings;
  segment: Segment;
  renter?: Renter;
  activeRenter?: Renter;
  owner?: Customer;
  ownerName: string;
  unitIds: string[];
  recipientKey: string;
}

export function residentContext(d: AppData): ResidentCtx | null {
  const s = d.session.resident;
  if (!s) return null;
  const unit = d.units.find((u) => u.id === s.unitId);
  if (!unit) return null;
  const project = d.projects.find((p) => p.id === unit.projectId)!;
  const type = d.unitTypes.find((t) => t.id === unit.typeId)!;
  const owner = d.vles.customers.find((c) => c.customer_id === unit.ownerCustomerId);
  const activeRenter = unit.renterId ? d.renters.find((r) => r.id === unit.renterId && r.status === 'active') : undefined;
  const base = { unit, project, type, settings: project.settings, segment: project.segment, owner, ownerName: owner?.name ?? '', activeRenter };
  if (s.identity.kind === 'owner') {
    const id = s.identity.customerId;
    if (unit.ownerCustomerId !== id || !owner) return null;
    const unitIds = d.units.filter((u) => u.ownerCustomerId === id).map((u) => u.id);
    return { ...base, identity: s.identity, name: owner.name, phone: owner.no_hp, role: 'owner', unitIds, recipientKey: `owner:${id}` };
  }
  const rid = s.identity.renterId;
  const renter = d.renters.find((r) => r.id === rid);
  if (!renter || renter.status !== 'active' || renter.unitId !== unit.id) return null;
  return { ...base, identity: s.identity, name: renter.name, phone: renter.no_hp, role: 'renter', renter, unitIds: [unit.id], recipientKey: `renter:${rid}` };
}

export function useResident(): ResidentCtx | null {
  const data = useStore((s) => s.data);
  return useMemo(() => residentContext(data), [data]);
}

export function useAccess(): (f: ResidentFeature) => AccessResult {
  const data = useStore((s) => s.data);
  const ctx = useResident();
  return useCallback(
    (f: ResidentFeature) => {
      if (!ctx) return { ok: false, reason: 'role' };
      const complaint = data.complaints.find((c) => c.unitId === ctx.unit.id);
      return canUse(f, { project: ctx.project, unit: ctx.unit, identity: ctx.identity, renter: ctx.renter, complaint, today: data.today });
    },
    [ctx, data],
  );
}

export function useDashboardProject(): Project {
  return useStore((s) => s.data.projects.find((p) => p.id === s.data.session.dashboard.projectId) ?? s.data.projects[0]);
}

export function useNotifications(to: string | undefined) {
  const list = useStore((s) => s.data.notifications);
  return useMemo(() => (to ? list.filter((n) => n.to === to).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : []), [list, to]);
}
