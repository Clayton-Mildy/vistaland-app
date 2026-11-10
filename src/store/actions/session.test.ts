import { expect, test } from 'vitest';
import { buildSeed } from '../../data/seed';
import { apply } from '../test/apply';
import { endResidentSession, startResidentSession, switchUnit, setDashboardProject, markNotificationsRead } from './session';

test('resident session start, switch and end', () => {
  let d = apply(buildSeed(), startResidentSession, { identity: { kind: 'owner', customerId: 1107 }, unitId: 'vh-A1-07' });
  expect(d.session.resident).toEqual({ identity: { kind: 'owner', customerId: 1107 }, unitId: 'vh-A1-07' });
  d = apply(d, switchUnit, { unitId: 'vh-A3-05' });
  expect(d.session.resident!.unitId).toBe('vh-A3-05');
  d = apply(d, endResidentSession, {});
  expect(d.session.resident).toBeUndefined();
});
test('switchUnit refuses a unit the resident does not own', () => {
  const d = apply(buildSeed(), startResidentSession, { identity: { kind: 'owner', customerId: 1107 }, unitId: 'vh-A1-07' });
  expect(() => apply(d, switchUnit, { unitId: 'vh-B1-02' })).toThrow();
});
test('dashboard project and notifications', () => {
  let d = apply(buildSeed(), setDashboardProject, { projectId: 'hp' });
  expect(d.session.dashboard.projectId).toBe('hp');
  d = apply(d, markNotificationsRead, { to: 'owner:1107' });
  expect(d.notifications.filter((n) => n.to === 'owner:1107').every((n) => n.read)).toBe(true);
});
