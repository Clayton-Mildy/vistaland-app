import { describe, expect, test } from 'vitest';
import { buildSeed } from '../../data/seed';
import { canUse } from '../../domain/access';
import { complaintWindow } from '../../domain/complaints';
import { billStatus, overdueBills, prepayQuote } from '../../domain/ipl';
import type { AppData, ResidentIdentity } from '../../domain/types';
import { apply } from '../test/apply';
import { setToday } from './demo';
import { applyConsequence, liftConsequence, payBills, recordPaymentAdmin, requestWifi, setWifiStatus } from './billing';
import { confirmMoveInAtGate, markReadyForHandover, pickHandoverSlot, requestMoveIn, saveHandoverChecklist, schedulePbbPickup, sendHandoverCall, updateLegalDoc, sendHandoverReceipt, signBast, signRules } from './onboarding';
import { acceptPanic, resolvePanic, triggerPanic } from './security';
import { activateApp } from './session';
import { setUnitTypeRate, updateSettings } from './settings';

const unit = (d: AppData, id: string) => d.units.find((u) => u.id === id)!;
const ctx = (d: AppData, unitId: string, identity: ResidentIdentity) => {
  const u = unit(d, unitId);
  return { project: d.projects.find((p) => p.id === u.projectId)!, unit: u, identity, complaint: d.complaints.find((c) => c.unitId === unitId), today: d.today };
};
const iplBills = (d: AppData, unitId: string) => d.bills.filter((b) => b.unitId === unitId && b.kind === 'ipl');

describe('J1 onboarding to unlock (Rina)', () => {
  test('rules → move-in permit → security confirms → menus unlock', () => {
    const rina: ResidentIdentity = { kind: 'owner', customerId: 1102 };
    let d = apply(buildSeed(), activateApp, { unitId: 'vh-B1-02' });
    d = apply(d, signRules, { unitId: 'vh-B1-02', signaturePhotoId: 'sample:SIGNATURE' });
    expect(canUse('vouchers', ctx(d, 'vh-B1-02', rina))).toEqual({ ok: false, reason: 'notOccupied' });
    d = apply(d, requestMoveIn, { unitId: 'vh-B1-02', date: d.today, time: '08.00–12.00', vehicle: 'trukEngkel', plate: 'B 1234 RW', withWifi: false });
    const permit = d.moveIns.find((m) => m.unitId === 'vh-B1-02')!;
    expect(d.notifications.some((n) => n.to === 'security:vh')).toBe(true);
    d = apply(d, confirmMoveInAtGate, { permitId: permit.id, staffId: 'st-sec' });
    expect(unit(d, 'vh-B1-02').moveIn).toEqual({ date: '2026-11-10', source: 'security' });
    expect(unit(d, 'vh-B1-02').occupancy).toBe('occupied');
    expect(canUse('vouchers', ctx(d, 'vh-B1-02', rina))).toEqual({ ok: true });
    expect(d.notifications.some((n) => n.to === 'owner:1102' && n.text.key === 'notif.moveInConfirmed')).toBe(true);
  });
});

describe('J2 handover', () => {
  test('ready → call → slot → checklist + receipt → BAST starts the 100-day window', () => {
    const seed = buildSeed();
    const u = seed.units.find((x) => x.projectId === 'vh' && x.occupancy === 'notReady' && x.ownerCustomerId)!;
    let d = apply(seed, markReadyForHandover, { unitId: u.id });
    d = apply(d, sendHandoverCall, { unitId: u.id });
    expect(unit(d, u.id).handover.calls).toHaveLength(1);
    d = apply(d, pickHandoverSlot, { unitId: u.id, date: '2026-11-12', time: '09.00–10.00' });
    expect(() => apply(d, signBast, { unitId: u.id })).toThrow();
    d = apply(d, saveHandoverChecklist, { unitId: u.id, checklist: { frontKeys: 3, backKeys: 2, roomKeys: 3, accessCards: 1, stickers: 1, handbook: 1, meterElectric: '20 kWh', meterWater: '0001', gift: false } });
    d = apply(d, sendHandoverReceipt, { unitId: u.id });
    d = apply(d, signBast, { unitId: u.id });
    const after = unit(d, u.id);
    expect(after.handover.bastDate).toBe('2026-11-10');
    expect(after.occupancy).toBe('handedOver');
    expect(complaintWindow(after.handover.bastDate, 100, d.today).daysLeft).toBe(100);
    expect(iplBills(d, u.id).length).toBeGreaterThan(0);
  });
  test('auto-BAST after the last call goes unanswered', () => {
    let d = apply(buildSeed(), setToday, { date: '2026-11-10' });
    expect(unit(d, 'vh-C1-03').handover.bastSource).toBe('auto');
    expect(unit(d, 'vh-C2-10').handover.bastDate).toBeUndefined();
    d = apply(d, setToday, { date: '2026-11-16' });
    expect(unit(d, 'vh-C2-10').handover.bastSource).toBe('auto');
  });
});

describe('J6 IPL marking (Andi)', () => {
  test('pay overdue months with no fee; consequences are manual and logged', () => {
    let d = buildSeed();
    expect(overdueBills(iplBills(d, 'vh-A1-07'), d.today, 10).map((b) => b.month)).toEqual(['2026-09', '2026-10']);
    d = apply(d, payBills, { unitId: 'vh-A1-07', kind: 'ipl', months: ['2026-09', '2026-10'], method: 'va' });
    expect(overdueBills(iplBills(d, 'vh-A1-07'), d.today, 10)).toEqual([]);
    const pay = d.payments.at(-1)!;
    expect(pay).toMatchObject({ amount: 700000, discount: 0, months: ['2026-09', '2026-10'] });
    d = apply(d, applyConsequence, { unitId: 'vh-A1-07', type: 'cardSuspended', note: 'Tunggak 2 bulan', by: 'Admin Estate' });
    const c = unit(d, 'vh-A1-07').consequences[0];
    d = apply(d, liftConsequence, { unitId: 'vh-A1-07', consequenceId: c.id, by: 'Admin Estate' });
    expect(unit(d, 'vh-A1-07').consequences[0].endedAt).toBe('2026-11-10');
    expect(d.activity.filter((a) => a.projectId === 'vh').map((a) => a.text.key)).toEqual(['activity.consequenceApplied.cardSuspended', 'activity.consequenceLifted.cardSuspended']);
    expect(d.notifications.filter((n) => n.to === 'owner:1107' && n.text.key.startsWith('notif.consequence')).length).toBe(2);
  });
});

describe('J7 settings ripple', () => {
  test('WiFi promo off and a new IPL rate only change future months', () => {
    let d = apply(buildSeed(), updateSettings, { projectId: 'vh', patch: { wifi: { promoEnabled: false } } });
    expect(d.projects.find((p) => p.id === 'vh')!.settings.wifi.freeMonths).toBe(3);
    d = apply(d, requestWifi, { unitId: 'vh-B1-02', packageId: 'wifi-basic', date: '2026-11-12', time: '09.00–12.00' });
    d = apply(d, setWifiStatus, { unitId: 'vh-B1-02', status: 'installed' });
    expect(d.wifi.find((w) => w.unitId === 'vh-B1-02')!.freeUntil).toBeUndefined();
    expect(d.bills.find((b) => b.unitId === 'vh-B1-02' && b.kind === 'wifi' && b.month === '2026-11')).toMatchObject({ free: false, amount: 199000 });
    d = apply(d, setUnitTypeRate, { typeId: 'vh-45', rate: 400000 });
    expect(iplBills(d, 'vh-A1-07').find((b) => b.month === '2026-12')!.amount).toBe(400000);
    expect(iplBills(d, 'vh-A1-07').find((b) => b.month === '2026-11')!.amount).toBe(350000);
    expect(d.activity.map((a) => [a.text.key, a.text.params])).toEqual([
      ['activity.settingsChanged.wifi', {}],
      ['activity.rateChanged', { type: 'Tipe 45/90', rate: 'Rp400.000' }],
    ]);
  });
  test('subsidized projects cannot switch on renter registration or house listings', () => {
    const d = apply(buildSeed(), updateSettings, { projectId: 'hp', patch: { features: { renterRegistration: true, houseListings: true, panic: true } } });
    const f = d.projects.find((p) => p.id === 'hp')!.settings.features;
    expect(f.renterRegistration).toBe(false);
    expect(f.houseListings).toBe(false);
    expect(f.panic).toBe(true);
  });
});

describe('pay-ahead', () => {
  test('Joko buys 12 months at the package price', () => {
    const d = apply(buildSeed(), payBills, { unitId: 'hp-C3-14', kind: 'ipl', packageId: 'ipl-12', method: 'va' });
    const pay = d.payments.at(-1)!;
    const hp = d.projects.find((p) => p.id === 'hp')!;
    const pkg = hp.settings.prepay.ipl.find((p) => p.id === 'ipl-12')!;
    expect(pay.amount).toBe(prepayQuote(pkg, 150000).net);
    expect(pay.amount).toBe(1620000);
    expect(pay.months).toHaveLength(12);
    expect(pay.months![0]).toBe('2026-12');
    expect(iplBills(d, 'hp-C3-14').filter((b) => b.paymentId === pay.id)).toHaveLength(12);
  });
  test('arrears block pay-ahead packages', () => {
    expect(() => apply(buildSeed(), payBills, { unitId: 'vh-A1-07', kind: 'ipl', packageId: 'ipl-12', method: 'va' })).toThrow('error.prepayArrears');
  });
});

describe('J8 panic', () => {
  test('resident signal → security accepts → resolved', () => {
    let d = apply(buildSeed(), triggerPanic, { unitId: 'vh-A1-07', from: { kind: 'owner', customerId: 1107 }, type: 'medis', awayFromHome: false });
    const sig = d.panics.at(-1)!;
    expect(d.notifications.some((n) => n.to === 'security:vh' && n.text.key === 'notif.panic')).toBe(true);
    d = apply(d, acceptPanic, { id: sig.id, staffId: 'st-sec' });
    d = apply(d, resolvePanic, { id: sig.id, outcome: 'handled' });
    const done = d.panics.find((p) => p.id === sig.id)!;
    expect(done.acceptedAt).toBeDefined();
    expect(done.outcome).toBe('handled');
  });
});

test('billStatus stays consistent after the clock moves', () => {
  const d = apply(buildSeed(), setToday, { date: '2026-12-11' });
  const dec = iplBills(d, 'vh-A1-07').find((b) => b.month === '2026-12')!;
  expect(billStatus(dec, d.today, 10)).toBe('overdue');
});

test('PBB pickup booking is stored on the unit and the estate is told', () => {
  const d = apply(buildSeed(), schedulePbbPickup, { unitId: 'vh-B1-02', date: '2026-11-12' });
  expect(unit(d, 'vh-B1-02').legal!.pbb.pickup).toEqual({ date: '2026-11-12' });
  expect(d.notifications.some((n) => n.to === 'admin:vh' && n.text.key === 'notif.admin.pbbPickup')).toBe(true);
  expect(() => apply(buildSeed(), schedulePbbPickup, { unitId: 'hp-C3-14', date: '2026-11-12' })).toThrow();
});

describe('legal documents (estate editor)', () => {
  test('marking the certificate ready adds a dated step, keeps the number and tells the owner', () => {
    const d = apply(buildSeed(), updateLegalDoc, { unitId: 'vh-B1-02', doc: 'certificate', status: 'ready', by: 'Admin Estate' });
    const cert = d.units.find((u) => u.id === 'vh-B1-02')!.legal!.certificate;
    expect(cert).toMatchObject({ status: 'ready', number: 'SHGB 04.21.10.02.1.0412' });
    expect(cert.steps.at(-1)).toEqual({ key: 'readyForPickup', date: '2026-11-10' });
    expect(d.notifications.some((n) => n.to === 'owner:1102' && n.text.key === 'notif.legalUpdated' && n.link === '/app/legal')).toBe(true);
  });
  test('saving the same status only updates the number', () => {
    const before = buildSeed();
    const d = apply(before, updateLegalDoc, { unitId: 'vh-B1-02', doc: 'pbg', status: 'atBank', number: 'PBG-NEW-1', by: 'Admin Estate' });
    const pbg = d.units.find((u) => u.id === 'vh-B1-02')!.legal!.pbg;
    expect(pbg.number).toBe('PBG-NEW-1');
    expect(pbg.steps).toHaveLength(before.units.find((u) => u.id === 'vh-B1-02')!.legal!.pbg.steps.length);
  });
  test('units without legal records (subsidized) are refused', () => {
    expect(() => apply(buildSeed(), updateLegalDoc, { unitId: 'hp-C3-14', doc: 'pbb', status: 'ready', by: 'Admin Estate' })).toThrow('error.featureDisabled');
  });
});

test('estate records a cash payment for overdue months: exact bill amounts, no fine, logged and receipted', () => {
  const seed = buildSeed();
  const s = seed.projects.find((p) => p.id === 'vh')!.settings;
  const od = overdueBills(seed.bills.filter((b) => b.unitId === 'vh-A1-07' && b.kind === 'ipl'), seed.today, s.ipl.dueDay);
  const d = apply(seed, recordPaymentAdmin, { unitId: 'vh-A1-07', months: od.map((b) => b.month), method: 'cash', date: '2026-11-09', by: 'Admin Estate' });
  expect(d.payments.at(-1)).toMatchObject({ recordedBy: 'admin', method: 'cash', amount: od.reduce((a, b) => a + b.amount, 0), discount: 0, paidAt: '2026-11-09T12:00:00' });
  expect(overdueBills(d.bills.filter((b) => b.unitId === 'vh-A1-07' && b.kind === 'ipl'), d.today, s.ipl.dueDay)).toHaveLength(0);
  expect(d.activity.at(-1)).toMatchObject({ projectId: 'vh', by: 'Admin Estate', text: { key: 'activity.paymentRecorded' } });
  expect(d.notifications.some((n) => n.to === 'owner:1107' && n.text.key === 'notif.paymentRecorded')).toBe(true);
});

test('estate only offers the consequence types switched on in settings', () => {
  let d = apply(buildSeed(), updateSettings, { projectId: 'vh', patch: { overdue: { offered: ['warningLetter'] } } });
  expect(() => apply(d, applyConsequence, { unitId: 'vh-A1-07', type: 'cardSuspended', by: 'Admin Estate' })).toThrow('error.featureDisabled');
  d = apply(d, applyConsequence, { unitId: 'vh-A1-07', type: 'warningLetter', by: 'Admin Estate' });
  expect(unit(d, 'vh-A1-07').consequences.map((c) => c.type)).toEqual(['warningLetter']);
});
