import { beforeAll, describe, expect, test } from 'vitest';
import { buildSeed } from '../data/seed';
import { searchCustomers, vlesConfig } from '../vles/client';
import { resolveResident } from './identity';

beforeAll(() => { vlesConfig.latencyMs = [0, 0]; });

describe('resolveResident (phone + KTP)', () => {
  const seed = buildSeed();
  test('messy formats still find Rina (Review Focus #2)', async () => {
    const r = await resolveResident(seed, '+62 812 3456 0102', '3275 0141 0190 0001');
    expect(r).toEqual({ ok: true, identity: { kind: 'owner', customerId: 1102 }, unitIds: ['vh-B1-02'] });
  });
  test('right phone with wrong KTP is not found', async () => {
    expect(await resolveResident(seed, '081234560102', '3275014101900009')).toEqual({ ok: false, reason: 'notFound' });
  });
  test('Andi owns two units', async () => {
    const r = await resolveResident(seed, '6281234560107', '3275011203850002');
    expect(r.ok && r.unitIds).toEqual(['vh-A1-07', 'vh-A3-05']);
  });
  test('Sari logs in as a renter', async () => {
    const r = await resolveResident(seed, '081298760204', '3275016607950004');
    expect(r).toEqual({ ok: true, identity: { kind: 'renter', renterId: 'r-1' }, unitIds: ['vh-B2-04'] });
  });
  test('searchCustomers rejects an empty query with 422', async () => {
    await expect(searchCustomers(seed, {})).rejects.toMatchObject({ status: 422 });
  });
  test('searchCustomers returns only ids and numbers', async () => {
    const res = await searchCustomers(seed, { no_hp: '081234560102' });
    expect(res.meta).toEqual({ count: 1, limit: 20, has_more: false });
    expect(Object.keys(res.data[0]).sort()).toEqual(['customer_id', 'no_hp', 'no_ktp', 'no_npwp']);
  });
});
