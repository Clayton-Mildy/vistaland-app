import { describe, expect, test } from 'vitest';
import { buildSeed } from './seed';

describe('seed', () => {
  const seed = buildSeed();
  test('demo date and unit counts', () => {
    expect(seed.today).toBe('2026-11-10');
    expect(seed.units.filter((u) => u.projectId === 'vh')).toHaveLength(162);
    expect(seed.units.filter((u) => u.projectId === 'hp')).toHaveLength(300);
  });
  test('every unit maps to a VLES unit with its project segment', () => {
    for (const u of seed.units) {
      const v = seed.vles.units.find((x) => x.id === u.vlesUnitId);
      const p = seed.projects.find((x) => x.id === u.projectId)!;
      expect(v, u.id).toBeDefined();
      expect(v!.sales_category).toBe(p.segment);
    }
  });
  test('persona units carry the right segment', () => {
    const seg = (id: string) => seed.vles.units.find((v) => v.id === seed.units.find((u) => u.id === id)!.vlesUnitId)!.sales_category;
    expect(seg('vh-B1-02')).toBe('komersil');
    expect(seg('hp-C3-14')).toBe('subsidi');
  });
  test('persona states match the spec', () => {
    const u = (id: string) => seed.units.find((x) => x.id === id)!;
    expect(u('vh-B1-02')).toMatchObject({ occupancy: 'handedOver', ownerCustomerId: 1102 });
    expect(u('vh-B1-02').handover.bastDate).toBe('2026-10-26');
    expect(u('vh-B1-02').appActivatedAt).toBeUndefined();
    expect(u('vh-A1-07')).toMatchObject({ occupancy: 'occupied', moveIn: { date: '2026-03-20', source: 'security' } });
    expect(u('hp-C3-14').handover.bastDate).toBe('2026-09-12');
    expect(u('hp-A2-03').handover.bastDate).toBe('2026-06-03');
    expect(u('vh-B2-04').renterId).toBe('r-1');
    expect(seed.renters.find((r) => r.id === 'r-1')!.lease).toEqual({ start: '2026-06-01', end: '2026-11-30' });
  });
  test('subsidized features are off where the spec says', () => {
    const hp = seed.projects.find((p) => p.id === 'hp')!;
    expect(hp.settings.features.renterRegistration).toBe(false);
    expect(hp.settings.features.panic).toBe(false);
    expect(hp.settings.ipl.freeMonths).toBe(3);
  });
  test('seed is deterministic', () => {
    expect(JSON.stringify(buildSeed())).toBe(JSON.stringify(seed));
  });
});
