import { monthOf } from '../../domain/clock';
import { complaintWindow } from '../../domain/complaints';
import { billStatus, firstBilledMonth, freeUntilMonth } from '../../domain/ipl';
import type { Bill, BillStatus } from '../../domain/types';
import type { L } from '../../data/content';
import { useLang } from '../../i18n';
import { useDerived, useResident } from '../../store/hooks';

export const useLocalized = () => {
  const [lang] = useLang();
  return (l: L) => l[lang];
};

/** The unit's bills of one kind. A renter only gets the IPL months billed to them, never the owner's. */
export function useUnitBills(kind: 'ipl' | 'wifi'): (Bill & { status: BillStatus })[] {
  const ctx = useResident();
  const unitId = ctx?.unit.id;
  const dueDay = ctx?.settings.ipl.dueDay ?? 10;
  const renterOnly = kind === 'ipl' && ctx?.role === 'renter';
  return useDerived(
    (d) =>
      d.bills
        .filter((b) => b.unitId === unitId && b.kind === kind && (!renterOnly || b.payer === 'renter'))
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((b) => ({ ...b, status: billStatus(b, d.today, dueDay) })),
    [unitId, kind, dueDay, renterOnly],
  );
}

/** One-line IPL state for cards on the home screens. */
export function useIplSummary() {
  const ctx = useResident();
  const bills = useUnitBills('ipl');
  const today = useDerived((d) => d.today);
  if (!ctx?.unit.handover.bastDate) return { kind: 'none' as const };
  const overdue = bills.filter((b) => b.status === 'overdue');
  if (overdue.length) return { kind: 'overdue' as const, n: overdue.length, amount: overdue.reduce((a, b) => a + b.amount, 0) };
  const first = firstBilledMonth(ctx.unit.handover.bastDate, ctx.settings.ipl);
  if (first > monthOf(today)) return { kind: 'free' as const, firstBilled: first, lastFree: freeUntilMonth(ctx.unit.handover.bastDate, ctx.settings.ipl) };
  const due = bills.find((b) => b.status === 'due');
  if (due) return { kind: 'due' as const, month: due.month, amount: due.amount };
  const paidThrough = bills.filter((b) => b.status === 'paid').at(-1)?.month;
  return { kind: 'paid' as const, paidThrough };
}

export function useComplaintWindowState() {
  const ctx = useResident();
  const today = useDerived((d) => d.today);
  return complaintWindow(ctx?.unit.handover.bastDate, ctx?.settings.complaints.windowDays ?? 100, today);
}

export function greetingKey(): string {
  const h = new Date().getHours();
  return h < 11 ? 'greet.morning' : h < 15 ? 'greet.noon' : h < 18 ? 'greet.afternoon' : 'greet.evening';
}
