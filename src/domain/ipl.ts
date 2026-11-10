import { addMonths, dayOfMonth, monthOf, monthStart } from './clock';
import type { AppData, Bill, BillStatus, ISODate, MonthKey, PrepayPackage, ProjectSettings, Renter, Unit, UnitType, WifiPackage, WifiSub } from './types';

/** First month that is charged. The BAST month itself is never charged. */
export function firstBilledMonth(bastDate: ISODate, s: ProjectSettings['ipl']): MonthKey {
  return addMonths(monthOf(bastDate), s.freeEnabled ? Math.max(1, s.freeMonths) : 1);
}

const maxMonth = (...ms: (MonthKey | undefined)[]) => ms.filter(Boolean).sort().at(-1)!;

function inLease(renter: Renter | undefined, m: MonthKey) {
  return !!renter && renter.iplPayer === 'renter' && m >= monthOf(renter.lease.start) && m <= monthOf(renter.lease.end);
}

/**
 * Rebuilds one unit's IPL bills. Months that have started (or are already
 * paid) keep their stored amount and free flag, so a settings or rate change
 * only reprices months that have not started yet. No fee is ever added.
 */
export function syncBills(unit: Unit, type: UnitType, settings: ProjectSettings, renter: Renter | undefined, bills: Bill[], today: ISODate, horizon?: MonthKey): Bill[] {
  const bast = unit.handover.bastDate;
  if (!bast) return [];
  const existing = new Map(bills.filter((b) => b.unitId === unit.id && b.kind === 'ipl').map((b) => [b.month, b]));
  const current = monthOf(today);
  const lastPaid = [...existing.values()].filter((b) => b.paymentId).map((b) => b.month).sort().at(-1);
  const end = maxMonth(addMonths(current, 1), horizon, lastPaid);
  const first = firstBilledMonth(bast, settings.ipl);
  const out: Bill[] = [];
  for (let m = monthOf(bast); m <= end; m = addMonths(m, 1)) {
    const prev = existing.get(m);
    if (prev && (m <= current || prev.paymentId)) {
      out.push(prev);
      continue;
    }
    const free = m < first;
    out.push({ id: `ipl-${unit.id}-${m}`, unitId: unit.id, kind: 'ipl', month: m, free, amount: free ? 0 : type.iplRate, payer: inLease(renter, m) ? 'renter' : 'owner', paymentId: prev?.paymentId });
  }
  return out;
}

/** WiFi bills start in the install month; promo months up to freeUntil are free. */
export function syncWifiBills(sub: WifiSub, pkg: WifiPackage, bills: Bill[], today: ISODate, horizon?: MonthKey): Bill[] {
  if (sub.status !== 'installed' || !sub.installedAt) return [];
  const existing = new Map(bills.filter((b) => b.unitId === sub.unitId && b.kind === 'wifi').map((b) => [b.month, b]));
  const current = monthOf(today);
  const lastPaid = [...existing.values()].filter((b) => b.paymentId).map((b) => b.month).sort().at(-1);
  const end = maxMonth(addMonths(current, 1), horizon, lastPaid);
  const out: Bill[] = [];
  for (let m = monthOf(sub.installedAt); m <= end; m = addMonths(m, 1)) {
    const prev = existing.get(m);
    if (prev && (m <= current || prev.paymentId)) {
      out.push(prev);
      continue;
    }
    const free = !!sub.freeUntil && m <= sub.freeUntil;
    out.push({ id: `wifi-${sub.unitId}-${m}`, unitId: sub.unitId, kind: 'wifi', month: m, free, amount: free ? 0 : pkg.price, payer: 'owner', paymentId: prev?.paymentId });
  }
  return out;
}

export function billStatus(bill: Bill, today: ISODate, dueDay: number): BillStatus {
  if (bill.free) return 'free';
  if (bill.paymentId) return 'paid';
  if (today < monthStart(bill.month)) return 'upcoming';
  if (today <= dayOfMonth(bill.month, dueDay)) return 'due';
  return 'overdue';
}

export const overdueBills = (bills: Bill[], today: ISODate, dueDay: number): Bill[] =>
  bills.filter((b) => billStatus(b, today, dueDay) === 'overdue').sort((a, b) => a.month.localeCompare(b.month));

export function prepayQuote(pkg: PrepayPackage, rate: number) {
  const gross = rate * pkg.months;
  const discount = pkg.discountType === 'percent' ? Math.round((gross * pkg.value) / 100) : pkg.discountType === 'freeMonths' ? pkg.value * rate : 0;
  return { months: pkg.months, gross, discount, net: gross - discount };
}

/** The next n months from `startFrom` that are billed and still unpaid. */
export const prepayMonths = (bills: Bill[], startFrom: MonthKey, n: number): MonthKey[] =>
  bills
    .filter((b) => b.month >= startFrom && !b.free && !b.paymentId)
    .map((b) => b.month)
    .sort()
    .slice(0, n);

/** Rebuilds every unit's IPL and WiFi bills and links payments to them. */
export function syncAllBills(d: AppData): void {
  const byUnit = new Map<string, Bill[]>();
  for (const b of d.bills) {
    const list = byUnit.get(b.unitId);
    if (list) list.push(b);
    else byUnit.set(b.unitId, [b]);
  }
  const paymentsByUnit = new Map<string, AppData['payments']>();
  for (const p of d.payments) {
    if (p.kind !== 'ipl' && p.kind !== 'wifi') continue;
    const list = paymentsByUnit.get(p.unitId);
    if (list) list.push(p);
    else paymentsByUnit.set(p.unitId, [p]);
  }
  const out: Bill[] = [];
  for (const unit of d.units) {
    if (!unit.handover.bastDate) continue;
    const project = d.projects.find((p) => p.id === unit.projectId)!;
    const type = d.unitTypes.find((t) => t.id === unit.typeId)!;
    const renter = d.renters.find((r) => r.unitId === unit.id && r.status === 'active');
    const existing = byUnit.get(unit.id) ?? [];
    const payments = paymentsByUnit.get(unit.id) ?? [];
    const horizon = (kind: 'ipl' | 'wifi') => payments.filter((p) => p.kind === kind).flatMap((p) => p.months ?? []).sort().at(-1);
    const ipl = syncBills(unit, type, project.settings, renter, existing, d.today, horizon('ipl'));
    const sub = d.wifi.find((w) => w.unitId === unit.id);
    const pkg = sub && project.settings.wifi.packages.find((p) => p.id === sub.packageId);
    const wifi = sub && pkg ? syncWifiBills(sub, pkg, existing, d.today, horizon('wifi')) : [];
    for (const bill of [...ipl, ...wifi]) {
      if (!bill.paymentId) {
        const pay = payments.find((p) => p.kind === bill.kind && p.months?.includes(bill.month));
        if (pay) bill.paymentId = pay.id;
      }
      out.push(bill);
    }
  }
  d.bills = out;
}
