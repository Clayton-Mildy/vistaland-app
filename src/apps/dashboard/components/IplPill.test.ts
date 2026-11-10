import { expect, test } from 'vitest';
import type { Bill } from '../../../domain/types';
import { iplState } from './IplPill';

const free = (month: string): Bill => ({ id: month, unitId: 'u', kind: 'ipl', month, amount: 0, free: true, payer: 'owner' });

test('the free badge shows the real last free month, not the last bill generated so far', () => {
  const bills = ['2026-10', '2026-11', '2026-12'].map(free);
  expect(iplState(bills, '2026-11-10', 10, '2027-03')).toMatchObject({ kind: 'free', until: '2027-03' });
});
