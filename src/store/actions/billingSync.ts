import { syncBills, syncWifiBills } from '../../domain/ipl';
import type { AppData, MonthKey } from '../../domain/types';
import { unitOf } from '../notify';

/** Rebuilds one unit's IPL + WiFi bills (optionally out to a horizon) and links its payments. */
export function resyncUnit(d: AppData, unitId: string, horizon?: { ipl?: MonthKey; wifi?: MonthKey }) {
  const unit = unitOf(d, unitId);
  const project = d.projects.find((p) => p.id === unit.projectId)!;
  const type = d.unitTypes.find((t) => t.id === unit.typeId)!;
  const renter = d.renters.find((r) => r.unitId === unitId && r.status === 'active');
  const mine = d.bills.filter((b) => b.unitId === unitId);
  const payments = d.payments.filter((p) => p.unitId === unitId);
  const paidMax = (kind: 'ipl' | 'wifi') => payments.filter((p) => p.kind === kind).flatMap((p) => p.months ?? []).sort().at(-1);
  const pick = (a?: MonthKey, b?: MonthKey) => [a, b].filter(Boolean).sort().at(-1);
  const ipl = syncBills(unit, type, project.settings, renter, mine, d.today, pick(horizon?.ipl, paidMax('ipl')));
  const sub = d.wifi.find((w) => w.unitId === unitId);
  const pkg = sub && project.settings.wifi.packages.find((p) => p.id === sub.packageId);
  const wifi = sub && pkg ? syncWifiBills(sub, pkg, mine, d.today, pick(horizon?.wifi, paidMax('wifi'))) : [];
  for (const b of [...ipl, ...wifi]) {
    if (!b.paymentId) b.paymentId = payments.find((p) => p.kind === b.kind && p.months?.includes(b.month))?.id;
  }
  d.bills = [...d.bills.filter((b) => b.unitId !== unitId), ...ipl, ...wifi];
}
