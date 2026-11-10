import { expect, test } from 'vitest';
import { buildSeed } from '../data/seed';
import { addDays } from './clock';
import { complaintKpis, monthlyRecap, monthlyReport, needsFollowUp, occupancyFunnel, unitBillingRows } from './report';
import type { Finding, FindingStage } from './types';

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

const finding = (id: string, stage: FindingStage, extra: Partial<Finding> = {}): Finding => ({
  id, room: 'dapur', photoIds: [], description: '', ai: { verdict: 'valid', category: 'pipa', confidence: 90, noteKey: 'ai.note.pipa' }, manualReview: false,
  category: 'pipa', checklist: [], fixChecks: [], stage, history: [], ...extra,
});

test('complaint KPIs count live findings, average days to done and failed AI fix checks this month', () => {
  const x = structuredClone(d);
  const unitId = 'vh-C1-12';
  x.complaints = [{
    id: 'K1', unitId, createdAt: '2026-10-01T09:00:00', submittedAt: '2026-10-01T09:00:00',
    findings: [
      finding('a', 'done', { history: [{ stage: 'done', at: '2026-10-11T10:00:00', by: 'resident' }], fixChecks: [{ verdict: 'notFixed', confidence: 80, noteKey: 'ai.fix.stillVisible', at: '2026-11-03T10:00:00', photoId: 'p' }, { verdict: 'fixed', confidence: 92, noteKey: 'ai.fix.fixed', at: '2026-11-04T10:00:00', photoId: 'p' }] }),
      finding('b', 'done', { history: [{ stage: 'done', at: '2026-10-21T10:00:00', by: 'resident' }], fixChecks: [{ verdict: 'wrongArea', confidence: 70, noteKey: 'ai.fix.wrongArea', at: '2026-10-15T10:00:00', photoId: 'p' }] }),
      finding('c', 'inProgress'),
      finding('d', 'rejected'),
    ],
  }, { id: 'K2', unitId: 'hp-C3-14', createdAt: '2026-11-01T09:00:00', submittedAt: '2026-11-01T09:00:00', findings: [finding('e', 'submitted')] }];
  const k = complaintKpis(x, 'vh');
  expect(k.activeFindings).toBe(1);
  expect(k.avgDaysToDone).toBe(15);
  expect(k.failedFixChecksThisMonth).toBe(1);
});

test('complaint KPIs list units whose window closes within 7 days and that never complained', () => {
  const x = structuredClone(d);
  const windowDays = x.projects.find((p) => p.id === 'vh')!.settings.complaints.windowDays;
  const quiet = x.units.find((u) => u.projectId === 'vh' && u.handover.bastDate && !x.complaints.some((c) => c.unitId === u.id))!;
  quiet.handover.bastDate = addDays(x.today, -(windowDays - 3));
  const complained = x.units.find((u) => u.id === 'vh-C1-12')!;
  complained.handover.bastDate = addDays(x.today, -(windowDays - 2));
  const later = x.units.find((u) => u.projectId === 'vh' && u.handover.bastDate && u.id !== quiet.id && !x.complaints.some((c) => c.unitId === u.id))!;
  later.handover.bastDate = addDays(x.today, -(windowDays - 20));
  const ids = complaintKpis(x, 'vh').windowEndingSoon;
  expect(ids).toContain(quiet.id);
  expect(ids).not.toContain('vh-C1-12');
  expect(ids).not.toContain(later.id);
});
