import { beforeAll, describe, expect, test } from 'vitest';
import { buildSeed } from '../../data/seed';
import { analyzeComplaintPhoto, checkFix } from '../../domain/ai';
import { trackerIndex } from '../../domain/complaints';
import { resolveResident } from '../../domain/identity';
import type { AppData } from '../../domain/types';
import { vlesConfig } from '../../vles/client';
import { apply } from '../test/apply';
import { addFinding, assignMandor, createWorkGroup, estateFinalOk, estateVerifyFinding, residentConfirm, startWork, submitAfterPhoto, submitComplaint } from './complaints';
import { claimVoucher, postListing, replyFeedback, sendFeedback, submitLead } from './community';
import { setToday } from './demo';
import { addExpense } from './finance';
import { addFuelEntry, logMowing, rephotoMowingLog } from './gardener';
import { estateDecideRenovation, ownerDecideRenovation, payDeposit, requestInspection, requestRenovation, returnDeposit, signRenovationBast, submitInspection } from './renovations';
import { payRegistrationFee, reviewRegistration, submitRegistration } from './renters';

beforeAll(() => { vlesConfig.latencyMs = [0, 0]; });
const ai = (photoId: string, description = '') => analyzeComplaintPhoto({ photoId, description, room: 'kamar2' });
const joko = { kind: 'owner' as const, customerId: 2314 };

describe('J3 complaint with AI (Joko)', () => {
  test('photo → AI → estate → contractor → mandor → AI fix check → estate → resident', () => {
    let d = apply(buildSeed(), addFinding, { unitId: 'hp-C3-14', room: 'kamar2', photoIds: ['sample:DAMP'], description: 'Rembes di dinding dekat plafon', ai: ai('sample:DAMP'), manualReview: false });
    expect(() => apply(d, addFinding, { unitId: 'hp-C3-14', room: 'dapur', photoIds: ['sample:CLEAN'], description: 'dinding', ai: ai('sample:CLEAN'), manualReview: false })).toThrow('error.needsManualReview');
    d = apply(d, submitComplaint, { unitId: 'hp-C3-14' });
    const c = () => d.complaints.find((x) => x.unitId === 'hp-C3-14')!;
    const f = () => c().findings[0];
    expect(f()).toMatchObject({ stage: 'submitted', category: 'kebocoran' });
    expect(() => apply(d, addFinding, { unitId: 'hp-C3-14', room: 'dapur', photoIds: ['sample:TILE'], description: 'keramik', ai: ai('sample:TILE'), manualReview: false })).toThrow('error.alreadySubmitted');
    d = apply(d, estateVerifyFinding, { complaintId: c().id, findingId: f().id });
    d = apply(d, createWorkGroup, { projectId: 'hp', refs: [{ complaintId: c().id, findingId: f().id }], material: 'Cat anti bocor', estimateDays: 2 });
    const group = d.workGroups.at(-1)!;
    d = apply(d, assignMandor, { groupId: group.id, mandorId: 'st-mandor' });
    expect(f().stage).toBe('assigned');
    expect(f().checklist.length).toBeGreaterThan(0);
    expect(d.notifications.some((n) => n.to === 'staff:st-mandor')).toBe(true);
    d = apply(d, startWork, { complaintId: c().id, findingId: f().id });
    d = apply(d, submitAfterPhoto, { complaintId: c().id, findingId: f().id, photoId: 'sample:DAMP_NOTFIXED', check: checkFix({ beforePhotoId: 'sample:DAMP', afterPhotoId: 'sample:DAMP_NOTFIXED' }) });
    expect(f().stage).toBe('inProgress');
    expect(f().fixChecks.map((x) => x.verdict)).toEqual(['notFixed']);
    d = apply(d, submitAfterPhoto, { complaintId: c().id, findingId: f().id, photoId: 'sample:DAMP_FIXED', check: checkFix({ beforePhotoId: 'sample:DAMP', afterPhotoId: 'sample:DAMP_FIXED' }) });
    expect(f().stage).toBe('workDone');
    d = apply(d, estateFinalOk, { complaintId: c().id, findingId: f().id });
    expect(d.notifications.some((n) => n.to === 'owner:2314' && n.text.key === 'notif.complaint.confirm')).toBe(true);
    d = apply(d, residentConfirm, { complaintId: c().id, findingId: f().id });
    expect(trackerIndex(c())).toBe(7);
  });
  test('an invalid photo can be sent for manual review', () => {
    const d = apply(buildSeed(), addFinding, { unitId: 'hp-C3-14', room: 'dapur', photoIds: ['sample:CLEAN'], description: 'dinding', ai: ai('sample:CLEAN'), manualReview: true });
    expect(d.complaints.find((c) => c.unitId === 'hp-C3-14')!.findings[0].manualReview).toBe(true);
  });
});

test('J4 Siti cannot add findings after 100 days', () => {
  expect(() => apply(buildSeed(), addFinding, { unitId: 'hp-A2-03', room: 'dapur', photoIds: ['sample:TILE'], description: 'keramik retak', ai: ai('sample:TILE'), manualReview: false })).toThrow('error.windowClosed');
});

describe('J5 renter registration (Andi → A3/05)', () => {
  test('submit → pay → approve → renter logs in, IPL routes to the renter', async () => {
    let d = apply(buildSeed(), submitRegistration, {
      unitId: 'vh-A3-05', ownerCustomerId: 1107, type: 'renter',
      person: { name: 'Dimas Arya', no_ktp: '3275019901990010', no_hp: '081355550305', householdSize: 3 },
      lease: { start: '2026-11-15', end: '2027-11-14' }, vehicles: [{ type: 'mobil', plate: 'B 3050 DA' }], cards: 2,
      moveIn: { date: '2026-11-15', time: '08.00–12.00' }, iplPayer: 'renter',
    });
    const reg = d.registrations.at(-1)!;
    expect(reg).toMatchObject({ fee: 50000, feePaid: false, status: 'submitted' });
    d = apply(d, payRegistrationFee, { id: reg.id });
    d = apply(d, reviewRegistration, { id: reg.id, decision: 'approve' });
    const r = await resolveResident(d, '0813 5555 0305', '3275019901990010');
    expect(r.ok && r.identity.kind).toBe('renter');
    expect(d.units.find((u) => u.id === 'vh-A3-05')!.renterId).toBe(r.ok && r.identity.kind === 'renter' ? r.identity.renterId : '');
    expect(d.bills.find((b) => b.unitId === 'vh-A3-05' && b.kind === 'ipl' && b.month === '2026-12')!.payer).toBe('renter');
    expect(d.moveIns.some((m) => m.unitId === 'vh-A3-05' && m.who === 'renter')).toBe(true);
    expect(d.cardOrders.at(-1)).toMatchObject({ unitId: 'vh-A3-05', status: 'toMake', extraCards: 1 });
    expect(d.notifications.some((n) => n.to === 'owner:1107' && n.text.key === 'notif.registration.approved')).toBe(true);
  });
  test('needsFix keeps the registration out of the renter list', () => {
    const seed = buildSeed();
    const reg = seed.registrations.find((x) => x.status === 'submitted' && x.type === 'renter')!;
    const d = apply(seed, reviewRegistration, { id: reg.id, decision: 'needsFix', note: 'Unggah perjanjian sewa yang ditandatangani' });
    expect(d.registrations.find((x) => x.id === reg.id)).toMatchObject({ status: 'needsFix', reviewNote: 'Unggah perjanjian sewa yang ditandatangani' });
    expect(d.renters).toHaveLength(seed.renters.length);
  });
  test('estate can approve the seeded free registration (Lukas, A2/05) and he can log in', async () => {
    const seed = buildSeed();
    const reg = seed.registrations.find((x) => x.person.name === 'Lukas Wibowo')!;
    const d = apply(seed, reviewRegistration, { id: reg.id, decision: 'approve' });
    const r = await resolveResident(d, '0812-0000-1117', '3275012209910009');
    expect(r.ok && r.identity.kind).toBe('renter');
  });
});

test('Review Focus #4: after the lease ends the renter is out and IPL goes back to the owner', async () => {
  const d = apply(buildSeed(), setToday, { date: '2026-12-01' });
  expect(d.renters.find((r) => r.id === 'r-1')!.status).toBe('ended');
  expect(d.units.find((u) => u.id === 'vh-B2-04')!.renterId).toBeUndefined();
  expect(await resolveResident(d, '081298760204', '3275016607950004')).toEqual({ ok: false, reason: 'leaseEnded' });
  expect(d.bills.find((b) => b.unitId === 'vh-B2-04' && b.kind === 'ipl' && b.month === '2026-12')!.payer).toBe('owner');
});

test('renovation by a renter: owner approval → estate → deposit → inspection → BAST → refund', () => {
  let d = apply(buildSeed(), requestRenovation, { unitId: 'vh-B2-04', title: 'Kanopi', description: 'Kanopi carport', renterId: 'r-1' });
  const id = () => d.renovations.at(-1)!.id;
  const step = () => d.renovations.at(-1)!.step;
  expect(step()).toBe('ownerApproval');
  d = apply(d, ownerDecideRenovation, { id: id(), approve: true });
  expect(step()).toBe('estateReview');
  d = apply(d, estateDecideRenovation, { id: id(), approve: true });
  expect(step()).toBe('awaitingDeposit');
  d = apply(d, payDeposit, { id: id() });
  d = apply(d, requestInspection, { id: id() });
  d = apply(d, submitInspection, { id: id(), checklist: { 'inspect.drain': false }, result: 'deduct', deduction: 500000, reason: 'Saluran retak', photoIds: [] });
  expect(step()).toBe('bastIssued');
  d = apply(d, signRenovationBast, { id: id() });
  d = apply(d, returnDeposit, { id: id() });
  expect(step()).toBe('depositReturned');
  expect(d.notifications.some((n) => n.text.key === 'notif.renovation.depositReturned' && n.text.params?.amount === 'Rp4.500.000')).toBe(true);
});

describe('community', () => {
  test('J9 house listing → public lead → owner notified', () => {
    let d = apply(buildSeed(), postListing, { unitId: 'vh-A3-05', kind: 'rumahDisewakan', title: 'Rumah A3/05 disewakan', price: 40000000, priceUnit: 'year', description: 'Tipe 36', photoIds: [] });
    const listing = d.listings.at(-1)!;
    const before = d.leads.length;
    d = apply(d, submitLead, { listingId: listing.id, name: 'Calon Penyewa', whatsapp: '081211112222', domicile: 'Cikarang', plan: 'bulanIni', interest: 'sewa' });
    expect(d.leads.length).toBe(before + 1);
    expect(d.notifications.some((n) => n.to === 'owner:1107' && n.text.key === 'notif.newLead')).toBe(true);
  });
  test('subsidized units cannot post house listings', () => {
    expect(() => apply(buildSeed(), postListing, { unitId: 'hp-C3-14', kind: 'rumahDijual', title: 'Dijual', price: 1, priceUnit: 'once', description: '', photoIds: [] })).toThrow('error.featureDisabled');
  });
  test('J11 suggestion reply', () => {
    let d = apply(buildSeed(), sendFeedback, { unitId: 'hp-C3-14', from: joko, topic: 'saran', text: 'Tambah lampu taman' });
    const fb = d.feedback.at(-1)!;
    d = apply(d, replyFeedback, { id: fb.id, reply: 'Akan dipasang minggu depan' });
    expect(d.feedback.find((x) => x.id === fb.id)!.status).toBe('replied');
    expect(d.notifications.some((n) => n.to === 'owner:2314' && n.text.key === 'notif.feedbackReplied')).toBe(true);
  });
  test('voucher claim reduces stock and issues a code', () => {
    const seed = buildSeed();
    const d = apply(seed, claimVoucher, { voucherId: 'VC-hp-1', holder: 'owner:2314' });
    expect(d.vouchers.find((v) => v.id === 'VC-hp-1')!.stock).toBe(seed.vouchers.find((v) => v.id === 'VC-hp-1')!.stock - 1);
    expect(d.voucherClaims.at(-1)!.code).toMatch(/^HP-KOPI10-\d{4}$/);
    expect(() => apply(d, claimVoucher, { voucherId: 'VC-hp-1', holder: 'owner:2314' })).toThrow('error.alreadyClaimed');
  });
});

describe('J10 gardener → finance', () => {
  test('fuel purchase becomes an expense; mowing updates the zone', () => {
    let d: AppData = apply(buildSeed(), addFuelEntry, { projectId: 'vh', gardenerId: 'st-garden', kind: 'buy', liters: 5, amount: 50000, receiptPhotoId: 'sample:RECEIPT', source: 'kasKecil' });
    expect(d.expenses.at(-1)).toMatchObject({ category: 'tukangTaman', amount: 50000, source: 'fuel' });
    d = apply(d, logMowing, { zoneId: 'zone-3', gardenerId: 'st-garden', machineId: 'mesin-1', date: d.today, start: '07.30', end: '08.40', area: 2500, beforePhotoId: 'sample:LAWN_BEFORE', afterPhotoId: 'sample:LAWN_AFTER', fuelUsed: 4.5 });
    expect(d.zones.find((z) => z.id === 'zone-3')!.lastCut).toBe('2026-11-10');
    expect(d.mowingLogs.at(-1)!.status).toBe('pending');
    d = apply(d, addExpense, { projectId: 'vh', category: 'listrik', date: d.today, amount: 200000, note: 'Token', recurring: false });
    expect(d.expenses.at(-1)!.source).toBe('manual');
  });
});

test('gardener re-photo puts a rejected log back in the review queue', () => {
  const seed = buildSeed();
  const log = seed.mowingLogs.find((l) => l.status === 'rephoto')!;
  const d = apply(seed, rephotoMowingLog, { id: log.id, afterPhotoId: 'sample:LAWN_AFTER' });
  expect(d.mowingLogs.find((l) => l.id === log.id)).toMatchObject({ status: 'pending', afterPhotoId: 'sample:LAWN_AFTER' });
  expect(d.notifications.some((n) => n.to === 'admin:vh' && n.text.key === 'notif.admin.mowingLogged')).toBe(true);
});
