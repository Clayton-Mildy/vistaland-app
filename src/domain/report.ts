import { addMonths, diffDays, monthOf } from './clock';
import { BOARD_COLUMNS, complaintWindow, isOverSla, isUnfinished } from './complaints';
import { budgetVsActual, fuelReconciliation } from './finance';
import { billStatus, firstBilledMonth, freeUntilMonth } from './ipl';
import type { AppData, Bill, Consequence, I18nText, MonthKey, Unit } from './types';

export type FollowTag = 'app' | 'rules' | 'ipl' | 'handover' | 'overdue' | 'sla' | 'lease';
export interface FollowItem { tag: FollowTag; text: I18nText; link: string; weight: number }

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function billsByUnit(d: AppData, projectId: string) {
  const ids = new Set(d.units.filter((u) => u.projectId === projectId).map((u) => u.id));
  const map = new Map<string, Bill[]>();
  for (const b of d.bills) {
    if (b.kind !== 'ipl' || !ids.has(b.unitId)) continue;
    const list = map.get(b.unitId);
    if (list) list.push(b);
    else map.set(b.unitId, [b]);
  }
  return map;
}

/** Things the estate team should chase, most urgent first. */
export function needsFollowUp(d: AppData, projectId: string): FollowItem[] {
  const project = d.projects.find((p) => p.id === projectId)!;
  const s = project.settings;
  const units = d.units.filter((u) => u.projectId === projectId);
  const items: FollowItem[] = [];
  const bills = billsByUnit(d, projectId);
  const current = monthOf(d.today);

  for (const u of units) {
    const bast = u.handover.bastDate;
    if (bast && !u.appActivatedAt && diffDays(bast, d.today) >= 7) {
      items.push({ tag: 'app', text: { key: 'follow.app', params: { unit: u.code, days: diffDays(bast, d.today) } }, link: `/dashboard/ipl/${u.id}`, weight: 60 });
    }
    if (u.occupancy === 'occupied' && !u.rules) {
      items.push({ tag: 'rules', text: { key: 'follow.rules', params: { unit: u.code } }, link: `/dashboard/ipl/${u.id}`, weight: 50 });
    }
    if (bast && s.ipl.freeEnabled && firstBilledMonth(bast, s.ipl) === addMonths(current, 1)) {
      items.push({ tag: 'ipl', text: { key: 'follow.iplFreeEnding', params: { unit: u.code } }, link: `/dashboard/ipl/${u.id}`, weight: 30 });
    }
    const overdue = (bills.get(u.id) ?? []).filter((b) => billStatus(b, d.today, s.ipl.dueDay) === 'overdue').length;
    if (overdue >= s.overdue.flagMonths) {
      items.push({ tag: 'overdue', text: { key: 'follow.overdue', params: { unit: u.code, n: overdue } }, link: `/dashboard/ipl/${u.id}`, weight: 70 + overdue });
    }
  }
  const unscheduled = units.filter((u) => u.occupancy === 'readyForHandover' && !u.handover.slot).length;
  if (unscheduled) items.push({ tag: 'handover', text: { key: 'follow.handover', params: { n: unscheduled } }, link: '/dashboard/handover', weight: 40 });

  for (const c of d.complaints.filter((x) => units.some((u) => u.id === x.unitId) && x.submittedAt)) {
    const unit = units.find((u) => u.id === c.unitId)!;
    for (const f of c.findings) {
      if (isOverSla(f, c.submittedAt!, s.complaints.slaDays[f.category], d.today)) {
        items.push({ tag: 'sla', text: { key: 'follow.sla', params: { id: c.id, unit: unit.code, days: diffDays(c.submittedAt!.slice(0, 10), d.today) } }, link: '/dashboard/complaints', weight: 65 });
        break;
      }
    }
  }
  for (const r of d.renters.filter((x) => x.status === 'active')) {
    const unit = units.find((u) => u.id === r.unitId);
    if (!unit) continue;
    const left = diffDays(d.today, r.lease.end);
    if (left >= 0 && left <= 30) items.push({ tag: 'lease', text: { key: 'follow.lease', params: { unit: unit.code, days: left } }, link: '/dashboard/residents', weight: 45 });
  }
  return items.sort((a, b) => b.weight - a.weight);
}

export function occupancyFunnel(d: AppData, projectId: string) {
  const units = d.units.filter((u) => u.projectId === projectId);
  return {
    akad: units.filter((u) => u.ownerCustomerId).length,
    handover: units.filter((u) => u.handover.bastDate).length,
    app: units.filter((u) => u.appActivatedAt).length,
    rules: units.filter((u) => u.rules).length,
    occupied: units.filter((u) => u.occupancy === 'occupied').length,
  };
}

/** Cash-basis monthly recap: IPL and other income received vs costs recorded. */
export function monthlyRecap(d: AppData, projectId: string, months: MonthKey[]) {
  const unitIds = new Set(d.units.filter((u) => u.projectId === projectId).map((u) => u.id));
  return months.map((month) => {
    const pays = d.payments.filter((p) => unitIds.has(p.unitId) && p.paidAt.slice(0, 7) === month);
    const ipl = pays.filter((p) => p.kind === 'ipl');
    const other = pays.filter((p) => p.kind === 'cards' || p.kind === 'registration');
    const cost = sum(d.expenses.filter((e) => e.projectId === projectId && monthOf(e.date) === month).map((e) => e.amount));
    const iplIncome = sum(ipl.map((p) => p.amount));
    const otherIncome = sum(other.map((p) => p.amount));
    return { month, unitsPaid: new Set(ipl.map((p) => p.unitId)).size, iplIncome, otherIncome, cost, net: iplIncome + otherIncome - cost };
  });
}

export function iplSnapshot(d: AppData, projectId: string) {
  const project = d.projects.find((p) => p.id === projectId)!;
  const dueDay = project.settings.ipl.dueDay;
  const units = d.units.filter((u) => u.projectId === projectId);
  const bills = billsByUnit(d, projectId);
  const current = monthOf(d.today);
  let handedOver = 0, free = 0, mustPay = 0, paidThisMonth = 0, overdueUnits = 0, totalOverdue = 0;
  for (const u of units) {
    if (!u.handover.bastDate) continue;
    handedOver++;
    const ub = bills.get(u.id) ?? [];
    const cur = ub.find((b) => b.month === current);
    if (!cur || cur.free) free++;
    else {
      mustPay++;
      if (cur.paymentId) paidThisMonth++;
    }
    const od = ub.filter((b) => billStatus(b, d.today, dueDay) === 'overdue');
    if (od.length) {
      overdueUnits++;
      totalOverdue += sum(od.map((b) => b.amount));
    }
  }
  return { handedOver, notHandedOver: units.length - handedOver, free, mustPay, paidThisMonth, overdueUnits, totalOverdue, collectionRate: mustPay ? Math.round((paidThisMonth / mustPay) * 100) : 0 };
}

export function monthlyReport(d: AppData, projectId: string, month: MonthKey) {
  const project = d.projects.find((p) => p.id === projectId)!;
  const unitIds = new Set(d.units.filter((u) => u.projectId === projectId).map((u) => u.id));
  const recap = monthlyRecap(d, projectId, Array.from({ length: 6 }, (_, i) => addMonths(month, i - 5)));
  const thisMonth = recap.at(-1)!;
  const avgRate = sum(d.unitTypes.filter((t) => t.projectId === projectId).map((t) => t.iplRate)) / Math.max(1, d.unitTypes.filter((t) => t.projectId === projectId).length);
  const complaints = d.complaints.filter((c) => unitIds.has(c.unitId) && c.submittedAt);
  const findings = complaints.flatMap((c) => c.findings.map((f) => ({ f, c })));
  const doneDurations = findings
    .filter(({ f }) => f.stage === 'done')
    .map(({ f, c }) => diffDays(c.submittedAt!.slice(0, 10), (f.history.at(-1)?.at ?? c.submittedAt!).slice(0, 10)));
  const zones = d.zones.filter((z) => z.projectId === projectId);
  const logs = d.mowingLogs.filter((l) => zones.some((z) => z.id === l.zoneId));
  return {
    month,
    funnel: occupancyFunnel(d, projectId),
    ipl: iplSnapshot(d, projectId),
    finance: {
      recap,
      income: thisMonth.iplIncome + thisMonth.otherIncome,
      cost: thisMonth.cost,
      net: thisMonth.net,
      breakEvenUnits: Math.ceil(thisMonth.cost / Math.max(1, avgRate)),
      budget: budgetVsActual(d.expenses.filter((e) => e.projectId === projectId), project.settings.budget, month),
    },
    complaints: {
      active: findings.filter(({ f }) => isUnfinished(f)).length,
      avgDaysToDone: doneDurations.length ? Math.round(sum(doneDurations) / doneDurations.length) : 0,
      overSla: findings.filter(({ f, c }) => isOverSla(f, c.submittedAt!, project.settings.complaints.slaDays[f.category], d.today)).length,
      byColumn: BOARD_COLUMNS.map((col) => ({ key: col.key, n: findings.filter(({ f }) => col.stages.includes(f.stage)).length })),
    },
    renovations: d.renovations.filter((r) => unitIds.has(r.unitId) && !['depositReturned', 'rejected'].includes(r.step)).length,
    feedback: { total: d.feedback.filter((f) => unitIds.has(f.unitId)).length, replied: d.feedback.filter((f) => unitIds.has(f.unitId) && f.status === 'replied').length },
    mowing: { done: logs.filter((l) => l.date.slice(0, 7) === month).length, scheduled: sum(zones.map((z) => z.perMonth)) },
    fuel: zones.length ? fuelReconciliation(d.fuel.filter((f) => f.projectId === projectId), logs, project.settings.fuel, month) : null,
    community: {
      businesses: d.businesses.filter((b) => b.projectId === projectId && b.status === 'verified').length,
      listings: d.listings.filter((l) => l.projectId === projectId).length,
      reported: d.listings.filter((l) => l.projectId === projectId && l.reported).length,
      vouchers: d.vouchers.filter((v) => v.projectId === projectId && v.validUntil >= d.today).length,
    },
    cards: {
      revenue: sum(d.cardOrders.filter((o) => unitIds.has(o.unitId) && o.createdAt.slice(0, 7) === month && o.status !== 'awaitingPayment').map((o) => o.total)),
      ready: d.cardOrders.filter((o) => unitIds.has(o.unitId) && o.status === 'ready').length,
      toMake: d.cardOrders.filter((o) => unitIds.has(o.unitId) && o.status === 'toMake').length,
    },
    compliance: { rulesSigned: d.units.filter((u) => unitIds.has(u.id) && u.occupancy === 'occupied' && u.rules).length, occupied: d.units.filter((u) => unitIds.has(u.id) && u.occupancy === 'occupied').length },
    followUp: needsFollowUp(d, projectId),
  };
}

export interface UnitBillingRow {
  unit: Unit; ownerName: string; ownerPhone: string; renterName?: string; typeName: string; rate: number;
  bills: Bill[]; overdueMonths: number; overdueAmount: number; oldestOverdue?: MonthKey; freeUntil?: MonthKey;
  /** Arrears reached the project's flag threshold. Consequences are still applied by hand. */
  needsAction: boolean;
  activeConsequences: Consequence[];
}

/** One row per unit of the project, sorted by unit code, for the IPL list and the arrears table. */
export function unitBillingRows(d: AppData, projectId: string): UnitBillingRow[] {
  const s = d.projects.find((p) => p.id === projectId)!.settings;
  const bills = billsByUnit(d, projectId);
  return d.units
    .filter((u) => u.projectId === projectId)
    .map((unit) => {
      const owner = d.vles.customers.find((c) => c.customer_id === unit.ownerCustomerId);
      const type = d.unitTypes.find((t) => t.id === unit.typeId)!;
      const ub = (bills.get(unit.id) ?? []).slice().sort((a, b) => a.month.localeCompare(b.month));
      const overdue = ub.filter((b) => billStatus(b, d.today, s.ipl.dueDay) === 'overdue');
      return {
        unit,
        ownerName: owner?.name ?? '',
        ownerPhone: owner?.no_hp ?? '',
        renterName: d.renters.find((r) => r.id === unit.renterId)?.name,
        typeName: type.name,
        rate: type.iplRate,
        bills: ub,
        overdueMonths: overdue.length,
        overdueAmount: sum(overdue.map((b) => b.amount)),
        oldestOverdue: overdue[0]?.month,
        freeUntil: unit.handover.bastDate ? freeUntilMonth(unit.handover.bastDate, s.ipl) : undefined,
        needsAction: overdue.length > 0 && overdue.length >= s.overdue.flagMonths,
        activeConsequences: unit.consequences.filter((c) => !c.endedAt),
      };
    })
    .sort((a, b) => a.unit.code.localeCompare(b.unit.code));
}

/** Header numbers for the estate complaint board. */
export function complaintKpis(d: AppData, projectId: string) {
  const s = d.projects.find((p) => p.id === projectId)!.settings;
  const units = d.units.filter((u) => u.projectId === projectId);
  const ids = new Set(units.map((u) => u.id));
  const submitted = d.complaints.filter((c) => ids.has(c.unitId) && c.submittedAt);
  const findings = submitted.flatMap((c) => c.findings.map((f) => ({ c, f })));
  const month = monthOf(d.today);
  const doneDays = findings
    .map(({ c, f }) => ({ c, at: f.stage === 'done' ? f.history.find((h) => h.stage === 'done')?.at : undefined }))
    .filter((x): x is { c: typeof x.c; at: string } => !!x.at)
    .map(({ c, at }) => diffDays(c.submittedAt!.slice(0, 10), at.slice(0, 10)));
  const complained = new Set(submitted.map((c) => c.unitId));
  return {
    activeFindings: findings.filter(({ f }) => isUnfinished(f)).length,
    avgDaysToDone: doneDays.length ? Math.round((sum(doneDays) / doneDays.length) * 10) / 10 : null,
    failedFixChecksThisMonth: sum(findings.map(({ f }) => f.fixChecks.filter((x) => x.verdict !== 'fixed' && x.at.startsWith(month)).length)),
    windowEndingSoon: units
      .filter((u) => {
        if (complained.has(u.id)) return false;
        const w = complaintWindow(u.handover.bastDate, s.complaints.windowDays, d.today);
        return w.status === 'open' && w.daysLeft <= 7;
      })
      .map((u) => u.id),
  };
}

export type Health = 'good' | 'watch' | 'attention';
export interface HealthTile { key: 'occupancy' | 'collection' | 'finance' | 'complaints' | 'fuel' | 'compliance'; status: Health; value: number }

const band = (pct: number, good: number, watch: number): Health => (pct >= good ? 'good' : pct >= watch ? 'watch' : 'attention');

/** Six traffic-light tiles for the monthly report. `value` is the number the tile shows (a percentage or a count). */
export function reportHealth(r: ReturnType<typeof monthlyReport>, tolerancePct: number): HealthTile[] {
  const occupancy = r.funnel.handover ? Math.round((r.funnel.occupied / r.funnel.handover) * 100) : 0;
  const compliance = r.compliance.occupied ? Math.round((r.compliance.rulesSigned / r.compliance.occupied) * 100) : 100;
  const deficitPct = r.finance.cost ? (-r.finance.net / r.finance.cost) * 100 : 0;
  return [
    { key: 'occupancy', value: occupancy, status: r.funnel.handover ? band(occupancy, 80, 60) : 'good' },
    { key: 'collection', value: r.ipl.collectionRate, status: r.ipl.mustPay ? band(r.ipl.collectionRate, 85, 70) : 'good' },
    { key: 'finance', value: r.finance.net, status: r.finance.net >= 0 ? 'good' : deficitPct <= 10 ? 'watch' : 'attention' },
    { key: 'complaints', value: r.complaints.overSla, status: r.complaints.overSla === 0 ? 'good' : r.complaints.overSla <= 2 ? 'watch' : 'attention' },
    { key: 'fuel', value: r.fuel?.unexplainedPct ?? 0, status: !r.fuel || r.fuel.withinTolerance ? 'good' : r.fuel.unexplainedPct <= tolerancePct * 2 ? 'watch' : 'attention' },
    { key: 'compliance', value: compliance, status: band(compliance, 90, 75) },
  ];
}
