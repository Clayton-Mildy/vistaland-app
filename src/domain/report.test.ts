import { expect, test } from 'vitest';
import { buildSeed } from '../data/seed';
import { monthlyRecap, monthlyReport, needsFollowUp, occupancyFunnel } from './report';

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
