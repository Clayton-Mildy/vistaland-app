import { describe, expect, test } from 'vitest';
import { buildSeed } from '../data/seed';
import { canUse } from './access';
import type { AppData, ResidentFeature, ResidentIdentity } from './types';

const ctx = (d: AppData, unitId: string, identity: ResidentIdentity) => {
  const unit = d.units.find((u) => u.id === unitId)!;
  return {
    project: d.projects.find((p) => p.id === unit.projectId)!,
    unit,
    identity,
    renter: identity.kind === 'renter' ? d.renters.find((r) => r.id === identity.renterId) : undefined,
    complaint: d.complaints.find((c) => c.unitId === unitId),
    today: d.today,
  };
};
const owner = (customerId: number): ResidentIdentity => ({ kind: 'owner', customerId });
const check = (d: AppData, unitId: string, who: ResidentIdentity, f: ResidentFeature) => canUse(f, ctx(d, unitId, who));

describe('canUse', () => {
  const d = buildSeed();
  test('Siti: window closed, nothing submitted → blocked', () => {
    expect(check(d, 'hp-A2-03', owner(2203), 'complaint')).toEqual({ ok: false, reason: 'windowClosed' });
  });
  test('Andi: window closed but a repair is still open → can still track (Review Focus #1)', () => {
    expect(check(d, 'vh-A1-07', owner(1107), 'complaint')).toEqual({ ok: true });
  });
  test('Rina (handed over, not moved in)', () => {
    expect(check(d, 'vh-B1-02', owner(1102), 'vouchers')).toEqual({ ok: false, reason: 'notOccupied' });
    expect(check(d, 'vh-B1-02', owner(1102), 'complaint')).toEqual({ ok: true });
    expect(check(d, 'vh-B1-02', owner(1102), 'renterRegistration')).toEqual({ ok: true });
    expect(check(d, 'vh-B1-02', owner(1102), 'moveIn')).toEqual({ ok: true });
  });
  test('Joko (subsidized) never gets commercial-only features, even if the flag is forced on', () => {
    const forced = buildSeed();
    forced.projects.find((p) => p.id === 'hp')!.settings.features.renterRegistration = true;
    expect(check(forced, 'hp-C3-14', owner(2314), 'renterRegistration')).toEqual({ ok: false, reason: 'segment' });
    expect(check(d, 'hp-C3-14', owner(2314), 'panic')).toEqual({ ok: false, reason: 'segment' });
    expect(check(d, 'hp-C3-14', owner(2314), 'vouchers')).toEqual({ ok: true });
  });
  test('a disabled feature flag hides the feature', () => {
    const off = buildSeed();
    off.projects.find((p) => p.id === 'vh')!.settings.features.cctv = false;
    expect(check(off, 'vh-A1-07', owner(1107), 'cctv')).toEqual({ ok: false, reason: 'disabled' });
  });
  test('Sari (renter) gets the limited set', () => {
    const sari: ResidentIdentity = { kind: 'renter', renterId: 'r-1' };
    expect(check(d, 'vh-B2-04', sari, 'complaint')).toEqual({ ok: false, reason: 'role' });
    expect(check(d, 'vh-B2-04', sari, 'bills')).toEqual({ ok: true });
    expect(check(d, 'vh-B2-04', sari, 'cctv')).toEqual({ ok: true });
    expect(check(d, 'vh-B2-04', sari, 'renterRegistration')).toEqual({ ok: false, reason: 'role' });
  });
  test('renter whose owner pays IPL cannot open bills', () => {
    const bagus: ResidentIdentity = { kind: 'renter', renterId: 'r-2' };
    expect(check(d, 'vh-A1-09', bagus, 'bills')).toEqual({ ok: false, reason: 'renterIplOwner' });
  });
  test('complaint needs a BAST', () => {
    const u = d.units.find((x) => x.occupancy === 'readyForHandover' && x.ownerCustomerId)!;
    expect(check(d, u.id, owner(u.ownerCustomerId!), 'complaint')).toEqual({ ok: false, reason: 'noBast' });
  });
});
