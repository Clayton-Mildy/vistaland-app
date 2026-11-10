import { describe, expect, test } from 'vitest';
import { buildSeed } from '../data/seed';
import { billStatus, firstBilledMonth, freeUntilMonth, overdueBills, prepayMonths, prepayQuote, syncAllBills, syncBills } from './ipl';
import type { Bill, ProjectSettings, Renter, Unit, UnitType } from './types';

const seed = buildSeed();
const base = seed.projects.find((p) => p.id === 'vh')!.settings;
const settings = (patch: Partial<ProjectSettings['ipl']> = {}): ProjectSettings => ({ ...base, ipl: { ...base.ipl, ...patch } });
const type: UnitType = { ...seed.unitTypes.find((t) => t.id === 'vh-45')!, iplRate: 350000 };
const unit: Unit = { id: 'u1', vlesUnitId: 1, code: 'X1/01', projectId: 'vh', typeId: 'vh-45', handover: { calls: [], bastDate: '2026-03-05' }, occupancy: 'occupied', consequences: [] };
const TODAY = '2026-11-10';
const byMonth = (bills: Bill[]) => Object.fromEntries(bills.map((b) => [b.month, b]));
const status = (bills: Bill[], m: string, today = TODAY) => billStatus(byMonth(bills)[m], today, 10);

describe('syncBills', () => {
  test('6 free months from the BAST month, then monthly bills', () => {
    const bills = syncBills(unit, type, settings(), undefined, [], TODAY);
    for (const m of ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08']) {
      expect(byMonth(bills)[m]).toMatchObject({ free: true, amount: 0 });
    }
    expect(byMonth(bills)['2026-09']).toMatchObject({ free: false, amount: 350000 });
    expect(status(bills, '2026-09')).toBe('overdue');
    expect(status(bills, '2026-10')).toBe('overdue');
    expect(status(bills, '2026-11')).toBe('due');
    expect(status(bills, '2026-12')).toBe('upcoming');
    expect(bills.map((b) => b.month).at(-1)).toBe('2026-12');
  });
  test('freeUntilMonth is the month before the first bill, even beyond generated bills', () => {
    expect(freeUntilMonth('2026-10-26', { freeEnabled: true, freeMonths: 6, dueDay: 10 })).toBe('2027-03');
    expect(freeUntilMonth('2026-10-26', { freeEnabled: false, freeMonths: 6, dueDay: 10 })).toBeUndefined();
  });
  test('free IPL off starts billing the month after BAST', () => {
    expect(firstBilledMonth('2026-03-05', { freeEnabled: false, freeMonths: 6, dueDay: 10 })).toBe('2026-04');
    const bills = syncBills(unit, type, settings({ freeEnabled: false }), undefined, [], TODAY);
    expect(byMonth(bills)['2026-04']).toMatchObject({ free: false, amount: 350000 });
  });
  test('a rate change only affects months that have not started', () => {
    const first = syncBills(unit, type, settings(), undefined, [], TODAY);
    const again = syncBills(unit, { ...type, iplRate: 400000 }, settings(), undefined, first, TODAY);
    expect(byMonth(again)['2026-09'].amount).toBe(350000);
    expect(byMonth(again)['2026-11'].amount).toBe(350000);
    expect(byMonth(again)['2026-12'].amount).toBe(400000);
  });
  test('raising free months mid-cycle keeps started months as they were', () => {
    const first = syncBills(unit, type, settings(), undefined, [], TODAY);
    const again = syncBills(unit, type, settings({ freeMonths: 10 }), undefined, first, TODAY);
    expect(byMonth(again)['2026-09']).toMatchObject({ free: false, amount: 350000 });
    expect(byMonth(again)['2026-11']).toMatchObject({ free: false, amount: 350000 });
    expect(byMonth(again)['2026-12']).toMatchObject({ free: true, amount: 0 });
  });
  test('months inside a renter-paid lease are billed to the renter (Review Focus #4)', () => {
    const renter: Renter = { id: 'r', unitId: 'u1', ownerCustomerId: 1, name: 'R', no_ktp: '1', no_hp: '1', householdSize: 1, lease: { start: '2026-06-01', end: '2026-11-30' }, iplPayer: 'renter', status: 'active' };
    const bills = syncBills(unit, type, settings(), renter, [], TODAY);
    expect(byMonth(bills)['2026-11'].payer).toBe('renter');
    expect(byMonth(bills)['2026-12'].payer).toBe('owner');
  });
  test('a horizon extends bills into the future for pay-ahead', () => {
    const bills = syncBills(unit, type, settings(), undefined, [], TODAY, '2027-10');
    expect(bills.at(-1)!.month).toBe('2027-10');
  });
  test('no bill ever exceeds the house-type rate (no late fee)', () => {
    const bills = syncBills(unit, type, settings(), undefined, [], '2027-06-30');
    expect(Math.max(...bills.map((b) => b.amount))).toBeLessThanOrEqual(350000);
  });
  test('paid bills report paid and are not overdue', () => {
    const bills = syncBills(unit, type, settings(), undefined, [], TODAY).map((b) => (b.month === '2026-09' ? { ...b, paymentId: 'P1' } : b));
    expect(status(bills, '2026-09')).toBe('paid');
    expect(overdueBills(bills, TODAY, 10).map((b) => b.month)).toEqual(['2026-10']);
  });
});

describe('pay-ahead', () => {
  test('quotes by discount type', () => {
    expect(prepayQuote({ id: 'a', months: 12, discountType: 'percent', value: 10, active: true }, 350000)).toEqual({ months: 12, gross: 4200000, discount: 420000, net: 3780000 });
    expect(prepayQuote({ id: 'b', months: 6, discountType: 'percent', value: 5, active: true }, 350000).net).toBe(1995000);
    expect(prepayQuote({ id: 'c', months: 24, discountType: 'freeMonths', value: 3, active: true }, 350000).discount).toBe(1050000);
    expect(prepayQuote({ id: 'd', months: 3, discountType: 'none', value: 0, active: true }, 350000).net).toBe(1050000);
  });
  test('prepayMonths picks the next unpaid billed months', () => {
    const bills = syncBills(unit, type, settings(), undefined, [], TODAY, '2027-12');
    expect(prepayMonths(bills, '2026-11', 3)).toEqual(['2026-11', '2026-12', '2027-01']);
  });
});

describe('syncAllBills on the seed', () => {
  test('links seeded payments and leaves Andi with Sep and Oct overdue', () => {
    const d = buildSeed();
    syncAllBills(d);
    const andi = d.bills.filter((b) => b.unitId === 'vh-A1-07' && b.kind === 'ipl');
    expect(overdueBills(andi, d.today, 10).map((b) => b.month)).toEqual(['2026-09', '2026-10']);
    const budi = d.bills.filter((b) => b.unitId === 'vh-B2-04' && b.kind === 'ipl');
    expect(budi.find((b) => b.month === '2026-08')!.paymentId).toBeDefined();
    expect(budi.find((b) => b.month === '2026-08')!.payer).toBe('renter');
    const prepaid = d.payments.find((p) => p.packageId === 'ipl-12')!;
    const future = d.bills.find((b) => b.unitId === prepaid.unitId && b.month === '2027-10');
    expect(future?.paymentId).toBe(prepaid.id);
  });
  test('WiFi bills are free until freeUntil and then billed at the package price', () => {
    const d = buildSeed();
    syncAllBills(d);
    const w = d.bills.filter((b) => b.unitId === 'vh-A1-07' && b.kind === 'wifi');
    expect(w.find((b) => b.month === '2026-05')).toMatchObject({ free: true });
    expect(w.find((b) => b.month === '2026-06')).toMatchObject({ free: false, amount: 279000 });
  });
});
