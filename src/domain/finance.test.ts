import { expect, test } from 'vitest';
import { buildSeed } from '../data/seed';
import { budgetVsActual, fuelReconciliation } from './finance';

const d = buildSeed();
const vh = d.projects.find((p) => p.id === 'vh')!;

test('October fuel reconciliation matches the wireframe numbers', () => {
  const r = fuelReconciliation(d.fuel.filter((f) => f.projectId === 'vh'), d.mowingLogs, vh.settings.fuel, '2026-10');
  expect(r.opening).toBe(2);
  expect(r.bought).toBe(40);
  expect(r.area).toBe(20200);
  expect(r.expectedUse).toBeCloseTo(36.4, 1);
  expect(r.closingMeasured).toBe(2.6);
  expect(r.unexplained).toBeCloseTo(3.0, 1);
  expect(r.unexplainedPct).toBeCloseTo(8.2, 1);
  expect(r.withinTolerance).toBe(true);
  expect(r.weeks).toHaveLength(4);
});
test('October budget vs actual adds up to Rp18.900.000', () => {
  const rows = budgetVsActual(d.expenses.filter((e) => e.projectId === 'vh'), vh.settings.budget, '2026-10');
  expect(rows.reduce((s, r) => s + r.actual, 0)).toBe(18900000);
  expect(rows.find((r) => r.category === 'listrik')!.diff).toBe(200000);
  expect(rows.find((r) => r.category === 'tukangTaman')!.actual).toBe(3000000);
});
