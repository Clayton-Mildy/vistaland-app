import { expect, test } from 'vitest';
import { buildSeed } from '../data/seed';
import { isOccupiedFor, nextOnboardingStep, onboardingSteps } from './onboarding';

const d = buildSeed();
const unit = (id: string) => d.units.find((u) => u.id === id)!;

test('Rina has finished handover only', () => {
  const steps = onboardingSteps(unit('vh-B1-02'), {});
  expect(steps.map((s) => [s.key, s.done])).toEqual([['handover', true], ['app', false], ['rules', false], ['moveIn', false], ['occupied', false]]);
  expect(nextOnboardingStep(steps)).toBe('app');
});
test('an approved move-in permit ticks the move-in step', () => {
  const permit = d.moveIns.find((m) => m.unitId === 'vh-C2-04')!;
  const steps = onboardingSteps(unit('vh-C2-04'), { moveIn: permit });
  expect(steps.find((s) => s.key === 'moveIn')).toMatchObject({ done: true, date: permit.date });
  expect(steps.find((s) => s.key === 'occupied')!.done).toBe(false);
});
test('occupancy for owners and renters', () => {
  expect(isOccupiedFor({ kind: 'owner', customerId: 1107 }, unit('vh-A1-07'))).toBe(true);
  expect(isOccupiedFor({ kind: 'owner', customerId: 1102 }, unit('vh-B1-02'))).toBe(false);
  const sari = d.renters.find((r) => r.id === 'r-1')!;
  expect(isOccupiedFor({ kind: 'renter', renterId: 'r-1' }, unit('vh-B2-04'), sari)).toBe(true);
});
