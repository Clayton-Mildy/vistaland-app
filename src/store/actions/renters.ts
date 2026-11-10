import { nowISO } from '../../domain/clock';
import type { AppData, RenterRegistration } from '../../domain/types';
import { ActionError } from '../errors';
import { nextId } from '../ids';
import { notify, ownerKey, projectOf, unitOf } from '../notify';
import type { Action } from '../store';
import { resyncUnit } from './billingSync';
import { ON_DAY_CHANGE } from './demo';

type NewRegistration = Omit<RenterRegistration, 'id' | 'status' | 'createdAt' | 'feePaid' | 'fee'>;

function registrationFee(d: AppData, unitId: string, vehicles: number, cards: number) {
  const c = projectOf(d, unitOf(d, unitId).projectId).settings.cards;
  const extraStickers = Math.max(0, vehicles - c.freeStickers);
  const extraCards = Math.max(0, cards - c.freeCards);
  return { extraStickers, extraCards, fee: extraStickers * c.extraStickerPrice + extraCards * c.extraCardPrice, free: c };
}

export const submitRegistration: Action<NewRegistration> = (d, p) => {
  const unit = unitOf(d, p.unitId);
  const project = projectOf(d, unit.projectId);
  if (project.segment === 'subsidi' || !project.settings.features.renterRegistration) throw new ActionError('error.featureDisabled');
  if (unit.ownerCustomerId !== p.ownerCustomerId) throw new ActionError('error.notFound');
  if (p.type === 'renter' && unit.renterId) throw new ActionError('error.unitHasRenter');
  const { fee } = registrationFee(d, unit.id, p.vehicles.length, p.cards ?? 1);
  d.registrations.push({ ...p, id: nextId(d, 'REG'), status: 'submitted', createdAt: nowISO(d.today), fee, feePaid: fee === 0 });
  notify(d, `admin:${unit.projectId}`, 'notif.admin.registration', { unit: unit.code, name: p.person.name }, '/dashboard/residents');
};

export const payRegistrationFee: Action<{ id: string }> = (d, p) => {
  const r = d.registrations.find((x) => x.id === p.id);
  if (!r || r.feePaid) throw new ActionError('error.generic');
  d.payments.push({ id: nextId(d, 'PAY'), unitId: r.unitId, kind: 'registration', amount: r.fee, discount: 0, method: 'va', paidAt: nowISO(d.today), recordedBy: 'resident' });
  r.feePaid = true;
};

/** The owner corrects a registration the estate sent back. Owner, unit and type stay as submitted. */
export const resubmitRegistration: Action<{ id: string; ownerCustomerId: number; patch: Partial<NewRegistration> }> = (d, p) => {
  const r = d.registrations.find((x) => x.id === p.id);
  if (!r || r.ownerCustomerId !== p.ownerCustomerId) throw new ActionError('error.notFound');
  if (r.status !== 'needsFix') throw new ActionError('error.generic');
  const { ownerCustomerId: _o, unitId: _u, type: _t, ...patch } = p.patch;
  Object.assign(r, patch, { status: 'submitted', reviewNote: undefined });
  notify(d, `admin:${unitOf(d, r.unitId).projectId}`, 'notif.admin.registration', { unit: unitOf(d, r.unitId).code, name: r.person.name }, '/dashboard/residents');
};

/** Estate decision. Approving a renter creates their login, card order, move-in permit and IPL routing. */
export const reviewRegistration: Action<{ id: string; decision: 'approve' | 'needsFix' | 'reject'; note?: string }> = (d, p) => {
  const r = d.registrations.find((x) => x.id === p.id);
  if (!r || r.status === 'approved' || r.status === 'rejected') throw new ActionError('error.generic');
  const unit = unitOf(d, r.unitId);
  const owner = ownerKey(r.ownerCustomerId);
  if (p.decision !== 'approve') {
    r.status = p.decision === 'needsFix' ? 'needsFix' : 'rejected';
    r.reviewNote = p.note;
    notify(d, owner, `notif.registration.${r.status}`, { name: r.person.name }, '/app/renters');
    return;
  }
  if (!r.feePaid) throw new ActionError('error.feeUnpaid');
  // Another tab may have approved a renter for this unit in the meantime.
  if (r.type === 'renter' && (unit.renterId || d.renters.some((x) => x.unitId === unit.id && x.status === 'active'))) throw new ActionError('error.unitHasRenter');
  r.status = 'approved';
  if (r.type === 'renter') {
    const renterId = nextId(d, 'r');
    d.renters.push({ id: renterId, unitId: unit.id, ownerCustomerId: r.ownerCustomerId, name: r.person.name, no_ktp: r.person.no_ktp, no_hp: r.person.no_hp, householdSize: r.person.householdSize, lease: r.lease!, iplPayer: r.iplPayer, status: 'active' });
    unit.renterId = renterId;
    r.renterId = renterId;
    const time = r.moveIn.time === '13.00–17.00' ? '13.00–17.00' : '08.00–12.00';
    d.moveIns.push({ id: nextId(d, 'MOV'), unitId: unit.id, who: 'renter', renterId, date: r.moveIn.date, time, vehicle: 'pickup', plate: r.vehicles[0]?.plate, withWifi: false, status: 'approved' });
    const { extraCards, extraStickers, free } = registrationFee(d, unit.id, r.vehicles.length, r.cards ?? 1);
    d.cardOrders.push({ id: nextId(d, 'ORD'), unitId: unit.id, freeCards: Math.min(free.freeCards, r.cards ?? 1), freeStickers: Math.min(free.freeStickers, r.vehicles.length), extraCards, extraStickers, vehicles: r.vehicles, total: r.fee, status: 'toMake', createdAt: nowISO(d.today) });
    resyncUnit(d, unit.id);
    notify(d, `security:${unit.projectId}`, 'notif.security.moveIn', { unit: unit.code, date: r.moveIn.date, time }, '/staff/security/movein');
    notify(d, `renter:${renterId}`, 'notif.renter.welcome', { unit: unit.code }, '/app/home');
  } else {
    const id = Math.max(...d.vles.customers.map((c) => c.customer_id)) + 1;
    d.vles.customers.push({ customer_id: id, name: r.person.name, no_ktp: r.person.no_ktp, no_hp: r.person.no_hp, no_npwp: null, email: '' });
    const vu = d.vles.units.find((x) => x.id === unit.vlesUnitId)!;
    const old = d.vles.transactions.find((t) => t.id === vu.active_transaction_id);
    if (old) old.status = 'cancelled';
    const txId = Math.max(...d.vles.transactions.map((t) => t.id)) + 1;
    d.vles.transactions.push({ id: txId, customer_id: id, unit_id: vu.id, status: 'active', akad_date: r.ajbDate ?? d.today, payment_scheme: 'cash' });
    vu.active_transaction_id = txId;
    unit.ownerCustomerId = id;
    unit.appActivatedAt = undefined;
    unit.rules = undefined;
  }
  notify(d, owner, 'notif.registration.approved', { name: r.person.name }, '/app/renters');
};

/** Leases past their end date close automatically; IPL routing returns to the owner. */
export function endExpiredLeases(d: AppData) {
  for (const r of d.renters) {
    if (r.status !== 'active' || r.lease.end >= d.today) continue;
    r.status = 'ended';
    const unit = d.units.find((u) => u.id === r.unitId);
    if (!unit) continue;
    if (unit.renterId === r.id) delete unit.renterId;
    resyncUnit(d, unit.id);
    notify(d, ownerKey(unit.ownerCustomerId), 'notif.leaseEnded', { unit: unit.code, name: r.name }, '/app/renters');
  }
}
ON_DAY_CHANGE.push(endExpiredLeases);
