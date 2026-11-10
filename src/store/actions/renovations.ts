import { nowISO } from '../../domain/clock';
import { formatRp } from '../../domain/money';
import type { AppData, Renovation, RenovationStep } from '../../domain/types';
import { ActionError } from '../errors';
import { nextId } from '../ids';
import { notify, ownerKey, projectOf, unitOf } from '../notify';
import type { Action } from '../store';

const reno = (d: AppData, id: string) => {
  const r = d.renovations.find((x) => x.id === id);
  if (!r) throw new ActionError('error.notFound');
  return r;
};
const step = (d: AppData, r: Renovation, s: RenovationStep) => {
  r.step = s;
  r.history.push({ step: s, at: nowISO(d.today) });
};
const requesterKey = (d: AppData, r: Renovation) => (r.renterId ? `renter:${r.renterId}` : ownerKey(unitOf(d, r.unitId).ownerCustomerId));
const expect = (r: Renovation, s: RenovationStep) => {
  if (r.step !== s) throw new ActionError('error.generic');
};

/** A renter's request goes to the owner first; an owner's goes straight to the estate. */
export const requestRenovation: Action<{ unitId: string; title: string; description: string; drawingPhotoId?: string; renterId?: string }> = (d, p) => {
  const unit = unitOf(d, p.unitId);
  const s = projectOf(d, unit.projectId).settings;
  const id = nextId(d, 'REN');
  const r: Renovation = { id, unitId: unit.id, requestedBy: p.renterId ? 'renter' : 'owner', renterId: p.renterId, title: p.title, description: p.description, drawingPhotoId: p.drawingPhotoId, step: 'submitted', history: [], deposit: s.renovation.deposit, va: `8808${unit.code.replace(/\D/g, '')}${id.slice(-2)}` };
  d.renovations.push(r);
  step(d, r, 'submitted');
  if (p.renterId) {
    step(d, r, 'ownerApproval');
    notify(d, ownerKey(unit.ownerCustomerId), 'notif.renovation.ownerApproval', { unit: unit.code, title: p.title }, '/app/renovation');
  } else {
    step(d, r, 'estateReview');
    notify(d, `admin:${unit.projectId}`, 'notif.admin.renovationRequested', { id, unit: unit.code }, '/dashboard/complaints');
  }
};

export const ownerDecideRenovation: Action<{ id: string; approve: boolean }> = (d, p) => {
  const r = reno(d, p.id);
  expect(r, 'ownerApproval');
  const unit = unitOf(d, r.unitId);
  step(d, r, p.approve ? 'estateReview' : 'rejected');
  notify(d, requesterKey(d, r), p.approve ? 'notif.renovation.ownerApproved' : 'notif.renovation.rejected', { title: r.title }, '/app/renovation');
  if (p.approve) notify(d, `admin:${unit.projectId}`, 'notif.admin.renovationRequested', { id: r.id, unit: unit.code }, '/dashboard/complaints');
};

export const estateDecideRenovation: Action<{ id: string; approve: boolean; note?: string }> = (d, p) => {
  const r = reno(d, p.id);
  expect(r, 'estateReview');
  step(d, r, p.approve ? 'awaitingDeposit' : 'rejected');
  notify(d, requesterKey(d, r), p.approve ? 'notif.renovation.approved' : 'notif.renovation.rejected', { title: r.title, amount: formatRp(r.deposit) }, `/app/renovation/${r.id}`);
};

export const payDeposit: Action<{ id: string }> = (d, p) => {
  const r = reno(d, p.id);
  expect(r, 'awaitingDeposit');
  d.payments.push({ id: nextId(d, 'PAY'), unitId: r.unitId, kind: 'deposit', amount: r.deposit, discount: 0, method: 'va', paidAt: nowISO(d.today), recordedBy: 'resident' });
  step(d, r, 'inProgress');
  notify(d, `admin:${unitOf(d, r.unitId).projectId}`, 'notif.admin.depositPaid', { id: r.id }, '/dashboard/complaints');
};

export const setRefundAccount: Action<{ id: string; account: string }> = (d, p) => {
  reno(d, p.id).refundAccount = p.account;
};

export const requestInspection: Action<{ id: string }> = (d, p) => {
  const r = reno(d, p.id);
  expect(r, 'inProgress');
  step(d, r, 'inspection');
};

export const submitInspection: Action<{ id: string; checklist: Record<string, boolean>; result: 'full' | 'deduct'; deduction: number; reason?: string; photoIds: string[] }> = (d, p) => {
  const r = reno(d, p.id);
  expect(r, 'inspection');
  const deduction = p.result === 'full' ? 0 : Math.min(r.deposit, Math.max(0, p.deduction));
  r.inspection = { checklist: p.checklist, result: p.result, deduction, reason: p.reason, photoIds: p.photoIds };
  step(d, r, 'bastIssued');
  notify(d, requesterKey(d, r), 'notif.renovation.bastIssued', { title: r.title }, `/app/renovation/${r.id}`);
};

export const signRenovationBast: Action<{ id: string }> = (d, p) => {
  const r = reno(d, p.id);
  expect(r, 'bastIssued');
  step(d, r, 'bastSigned');
  notify(d, `admin:${unitOf(d, r.unitId).projectId}`, 'notif.admin.renovationSigned', { id: r.id }, '/dashboard/complaints');
};

export const objectRenovation: Action<{ id: string; text: string }> = (d, p) => {
  const r = reno(d, p.id);
  r.objection = p.text;
  notify(d, `admin:${unitOf(d, r.unitId).projectId}`, 'notif.admin.renovationObjection', { id: r.id }, '/dashboard/complaints');
};

export const returnDeposit: Action<{ id: string }> = (d, p) => {
  const r = reno(d, p.id);
  expect(r, 'bastSigned');
  step(d, r, 'depositReturned');
  notify(d, requesterKey(d, r), 'notif.renovation.depositReturned', { amount: formatRp(r.deposit - (r.inspection?.deduction ?? 0)) }, `/app/renovation/${r.id}`);
};
