import { expect, test } from 'vitest';
import { buildSeed } from '../data/seed';
import { monthlyRecap, monthlyReport, needsFollowUp, occupancyFunnel, unitBillingRows } from './report';

const d = buildSeed();

test('follow-up list flags Rina (app not activated) and Andi (2 months overdue)', () => {
  const items = needsFollowUp(d, 'vh');
  expect(items.some((i) => i.tag === 'app' && i.text.params?.unit === 'B1/02')).toBe(true);
  expect(items.some((i) => i.tag === 'overdue' && i.text.params?.unit === 'A1/07')).toBe(true);
  expect(items.some((i) => i.tag === 'lease' && i.text.params?.unit === 'B2/04')).toBe(true);
});
test('funnel narrows from akad to occupied', () => {
  const f = occupancyFunnel(d, 'vh');
  expect(f.akad).toBeGreaterThanOrEqual(f.handover);
  expect(f.handover).toBeGreaterThanOrEqual(f.occupied);
});
test('monthly recap and report run on live data', () => {
  const recap = monthlyRecap(d, 'vh', ['2026-09', '2026-10']);
  expect(recap).toHaveLength(2);
  expect(recap[1].cost).toBe(18900000);
  const rep = monthlyReport(d, 'vh', '2026-10');
  expect(rep.ipl.collectionRate).toBeGreaterThan(0);
  expect(rep.complaints.active).toBeGreaterThan(0);
});

test('billing rows flag a unit once its arrears reach the project threshold', () => {
  const a107 = unitBillingRows(d, 'vh').find((r) => r.unit.id === 'vh-A1-07')!;
  expect(a107).toMatchObject({ overdueMonths: 2, needsAction: true, ownerName: 'Andi Pratama' });
  expect(a107.overdueAmount).toBeGreaterThan(0);
  const stricter = structuredClone(d);
  stricter.projects.find((p) => p.id === 'vh')!.settings.overdue.flagMonths = 3;
  expect(unitBillingRows(stricter, 'vh').find((r) => r.unit.id === 'vh-A1-07')!.needsAction).toBe(false);
});

test('billing rows list only consequences that are still active, and name the renter', () => {
  const withCns = structuredClone(d);
  withCns.units.find((u) => u.id === 'vh-A1-07')!.consequences = [
    { id: 'CNS-1', type: 'warningLetter', startedAt: '2026-10-01', endedAt: '2026-10-05', by: 'Admin' },
    { id: 'CNS-2', type: 'cardSuspended', startedAt: '2026-11-09', by: 'Admin' },
  ];
  const rows = unitBillingRows(withCns, 'vh');
  expect(rows.find((r) => r.unit.id === 'vh-A1-07')!.activeConsequences.map((c) => c.id)).toEqual(['CNS-2']);
  expect(rows.find((r) => r.unit.id === 'vh-B2-04')!.renterName).toBe('Sari Lestari');
  expect(rows.every((r) => r.unit.projectId === 'vh')).toBe(true);
});
