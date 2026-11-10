import { formatDate, monthOf } from '../../../domain/clock';
import { billStatus } from '../../../domain/ipl';
import type { Bill, ISODate, MonthKey } from '../../../domain/types';
import { useLang, useT } from '../../../i18n';
import { StatusPill } from '../../../ui/StatusPill';

/** `freeUntil` is the unit's real last free month (bills are only generated a few months ahead). */
export function iplState(bills: Bill[], today: ISODate, dueDay: number, freeUntil?: MonthKey) {
  const ipl = bills.filter((b) => b.kind === 'ipl');
  if (!ipl.length) return { kind: 'none' as const, n: 0, amount: 0 };
  const overdue = ipl.filter((b) => billStatus(b, today, dueDay) === 'overdue');
  if (overdue.length) return { kind: 'overdue' as const, n: overdue.length, amount: overdue.reduce((a, b) => a + b.amount, 0), since: overdue[0].month };
  const cur = ipl.find((b) => b.month === monthOf(today));
  const lastFree = freeUntil ?? ipl.filter((b) => b.free).at(-1)?.month;
  if (cur?.free || (!cur && lastFree)) return { kind: 'free' as const, n: 0, amount: 0, until: lastFree };
  if (cur && !cur.paymentId) return { kind: 'due' as const, n: 0, amount: cur.amount };
  return { kind: 'paid' as const, n: 0, amount: 0 };
}

export function IplPill({ bills, today, dueDay, freeUntil }: { bills: Bill[]; today: ISODate; dueDay: number; freeUntil?: MonthKey }) {
  const t = useT();
  const [lang] = useLang();
  const s = iplState(bills, today, dueDay, freeUntil);
  if (s.kind === 'none') return <StatusPill>{t('dash.ipl.none')}</StatusPill>;
  if (s.kind === 'overdue') return <StatusPill tone="danger">{t('dash.ipl.overdue', { n: s.n })}</StatusPill>;
  if (s.kind === 'free') return <StatusPill tone="info">{t('dash.ipl.free', { month: s.until ? formatDate(s.until, lang, 'month') : '' })}</StatusPill>;
  if (s.kind === 'due') return <StatusPill tone="warning">{t('status.due')}</StatusPill>;
  return <StatusPill tone="success">{t('status.paid')}</StatusPill>;
}
