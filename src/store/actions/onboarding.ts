import { addDays, nowISO } from '../../domain/clock';
import { RULES_VERSION, WIFI_SLOTS } from '../../data/content';
import type { AppData, HandoverChecklist, HandoverCall, ISODate, LegalDoc, MoveInPermit } from '../../domain/types';
import { ActionError } from '../errors';
import { nextId } from '../ids';
import { logActivity, notify, ownerKey, projectOf, unitOf } from '../notify';
import type { Action } from '../store';
import { requestWifi } from './billing';
import { resyncUnit } from './billingSync';
import { ON_DAY_CHANGE } from './demo';

const CHANNELS: Record<number, HandoverCall['channels']> = { 1: ['app', 'wa'], 2: ['app', 'wa'], 3: ['app', 'wa', 'letter'] };

export const markReadyForHandover: Action<{ unitId: string }> = (d, p) => {
  const unit = unitOf(d, p.unitId);
  if (unit.handover.bastDate || !unit.ownerCustomerId) throw new ActionError('error.generic');
  unit.occupancy = 'readyForHandover';
  unit.handover = { readySince: d.today, calls: [] };
};

export const sendHandoverCall: Action<{ unitId: string }> = (d, p) => {
  const unit = unitOf(d, p.unitId);
  const max = projectOf(d, unit.projectId).settings.handover.maxCalls;
  const n = unit.handover.calls.length + 1;
  if (n > max || unit.handover.bastDate) throw new ActionError('error.generic');
  unit.handover.calls.push({ n: n as 1 | 2 | 3, sentAt: d.today, channels: CHANNELS[n] ?? ['app', 'wa'] });
  notify(d, ownerKey(unit.ownerCustomerId), 'notif.handoverCall', { n, unit: unit.code }, '/app/handover');
};

export const markCallRead: Action<{ unitId: string }> = (d, p) => {
  const last = unitOf(d, p.unitId).handover.calls.at(-1);
  if (last && !last.readAt) last.readAt = d.today;
};

export const pickHandoverSlot: Action<{ unitId: string; date: ISODate; time: string }> = (d, p) => {
  const unit = unitOf(d, p.unitId);
  unit.handover.slot = { date: p.date, time: p.time };
  const last = unit.handover.calls.at(-1);
  if (last && !last.readAt) last.readAt = d.today;
  notify(d, `admin:${unit.projectId}`, 'notif.admin.slotPicked', { unit: unit.code, date: p.date, time: p.time }, '/dashboard/handover');
};

export const saveHandoverChecklist: Action<{ unitId: string; checklist: HandoverChecklist }> = (d, p) => {
  unitOf(d, p.unitId).handover.checklist = p.checklist;
};

export const sendHandoverReceipt: Action<{ unitId: string }> = (d, p) => {
  const unit = unitOf(d, p.unitId);
  if (!unit.handover.checklist) throw new ActionError('error.checklistFirst');
  unit.handover.receiptSentAt = d.today;
  notify(d, ownerKey(unit.ownerCustomerId), 'notif.receiptSent', { unit: unit.code }, '/app/handover');
};

function startBast(d: AppData, unitId: string, source: 'signed' | 'auto') {
  const unit = unitOf(d, unitId);
  unit.handover.bastDate = d.today;
  unit.handover.bastSource = source;
  if (unit.occupancy !== 'occupied') unit.occupancy = 'handedOver';
  resyncUnit(d, unit.id);
  notify(d, ownerKey(unit.ownerCustomerId), source === 'signed' ? 'notif.bastSigned' : 'notif.autoBast', { unit: unit.code }, '/app/handover');
  notify(d, `admin:${unit.projectId}`, 'notif.admin.bastSigned', { unit: unit.code }, '/dashboard/handover');
}

/** Resident signs the BAST with OTP; only after the estate has sent the key receipt. */
export const signBast: Action<{ unitId: string }> = (d, p) => {
  const unit = unitOf(d, p.unitId);
  if (unit.handover.bastDate) return;
  if (!unit.handover.receiptSentAt) throw new ActionError('error.receiptFirst');
  startBast(d, unit.id, 'signed');
};

export const issueAutoBast: Action<{ unitId: string }> = (d, p) => {
  if (unitOf(d, p.unitId).handover.bastDate) return;
  startBast(d, p.unitId, 'auto');
};

/** H+interval after the last call with no schedule → automatic BAST (if enabled). */
export function autoBastRule(d: AppData) {
  for (const unit of d.units) {
    const h = unit.handover;
    const s = projectOf(d, unit.projectId).settings.handover;
    const last = h.calls.at(-1);
    if (!s.autoBast || h.bastDate || h.slot || !last || h.calls.length < s.maxCalls) continue;
    if (d.today >= addDays(last.sentAt, s.intervalDays)) startBast(d, unit.id, 'auto');
  }
}
ON_DAY_CHANGE.push(autoBastRule);

export const signRules: Action<{ unitId: string; signaturePhotoId: string; renterId?: string }> = (d, p) => {
  const unit = unitOf(d, p.unitId);
  if (p.renterId) {
    const r = d.renters.find((x) => x.id === p.renterId);
    if (!r) throw new ActionError('error.notFound');
    r.rulesSignedAt = nowISO(d.today);
  } else {
    unit.rules = { signedAt: nowISO(d.today), signaturePhotoId: p.signaturePhotoId, version: RULES_VERSION };
  }
  notify(d, `admin:${unit.projectId}`, 'notif.admin.rulesSigned', { unit: unit.code });
};

export const requestMoveIn: Action<{ unitId: string; date: ISODate; time: MoveInPermit['time']; vehicle: MoveInPermit['vehicle']; plate?: string; withWifi: boolean; packageId?: string; renterId?: string }> = (d, p) => {
  const unit = unitOf(d, p.unitId);
  if (p.date < d.today) throw new ActionError('error.pastDate');
  const who = p.renterId ? 'renter' : 'owner';
  for (const m of d.moveIns) if (m.unitId === unit.id && m.who === who && m.status === 'approved') m.status = 'cancelled';
  d.moveIns.push({ id: nextId(d, 'MOV'), unitId: unit.id, who, renterId: p.renterId, date: p.date, time: p.time, vehicle: p.vehicle, plate: p.plate, withWifi: p.withWifi, status: 'approved' });
  notify(d, `security:${unit.projectId}`, 'notif.security.moveIn', { unit: unit.code, date: p.date, time: p.time }, '/staff/security/movein');
  notify(d, `admin:${unit.projectId}`, 'notif.admin.moveInRequested', { unit: unit.code, date: p.date }, '/dashboard/security');
  if (p.withWifi && p.packageId) requestWifi(d, { unitId: unit.id, packageId: p.packageId, date: p.date, time: WIFI_SLOTS[1] });
};

export const confirmMoveInAtGate: Action<{ permitId: string; staffId: string }> = (d, p) => {
  const permit = d.moveIns.find((m) => m.id === p.permitId);
  if (!permit || permit.status !== 'approved') throw new ActionError('error.generic');
  const unit = unitOf(d, permit.unitId);
  permit.status = 'entered';
  permit.enteredAt = nowISO(d.today);
  permit.enteredBy = p.staffId;
  let to = ownerKey(unit.ownerCustomerId);
  if (permit.who === 'renter' && permit.renterId) {
    const r = d.renters.find((x) => x.id === permit.renterId);
    if (r) r.movedInAt = d.today;
    to = `renter:${permit.renterId}`;
    if (!unit.moveIn) unit.moveIn = { date: d.today, source: 'security' };
  } else {
    unit.moveIn = { date: d.today, source: 'security' };
  }
  unit.occupancy = 'occupied';
  notify(d, to, 'notif.moveInConfirmed', { unit: unit.code }, '/app/home');
  notify(d, `admin:${unit.projectId}`, 'notif.admin.moveInConfirmed', { unit: unit.code }, `/dashboard/ipl/${unit.id}`);
};

export const selfReportMoveIn: Action<{ unitId: string; date: ISODate }> = (d, p) => {
  const unit = unitOf(d, p.unitId);
  unit.selfReportedMoveIn = p.date;
  notify(d, `admin:${unit.projectId}`, 'notif.admin.selfReported', { unit: unit.code, date: p.date }, '/dashboard/summary');
};

export const confirmSelfReportedMoveIn: Action<{ unitId: string }> = (d, p) => {
  const unit = unitOf(d, p.unitId);
  if (!unit.selfReportedMoveIn) throw new ActionError('error.generic');
  unit.moveIn = { date: unit.selfReportedMoveIn, source: 'app' };
  unit.occupancy = 'occupied';
  notify(d, ownerKey(unit.ownerCustomerId), 'notif.moveInConfirmed', { unit: unit.code }, '/app/home');
};

/** Commercial owners book when to collect their PBB (SPPT) at the marketing office. */
export const schedulePbbPickup: Action<{ unitId: string; date: ISODate }> = (d, p) => {
  const unit = unitOf(d, p.unitId);
  if (!unit.legal) throw new ActionError('error.featureDisabled');
  unit.legal.pbb.pickup = { date: p.date };
  notify(d, `admin:${unit.projectId}`, 'notif.admin.pbbPickup', { unit: unit.code, date: p.date }, `/dashboard/ipl/${unit.id}`);
};

const LEGAL_STEP: Record<LegalDoc['status'], string | null> = { process: null, atBank: 'atBank', ready: 'readyForPickup', withCustomer: 'pickedUp' };

/** Estate updates a legal document. A status change adds a dated step and tells the owner. */
export const updateLegalDoc: Action<{ unitId: string; doc: 'certificate' | 'pbg' | 'pbb'; status: LegalDoc['status']; number?: string; by: string }> = (d, p) => {
  const unit = unitOf(d, p.unitId);
  if (!unit.legal) throw new ActionError('error.featureDisabled');
  const doc = unit.legal[p.doc];
  if (p.number !== undefined) doc.number = p.number.trim() || undefined;
  if (doc.status === p.status) return;
  doc.status = p.status;
  const key = LEGAL_STEP[p.status];
  if (key) {
    const open = doc.steps.find((s) => s.key === key && !s.date);
    if (open) open.date = d.today;
    else doc.steps.push({ key, date: d.today });
  }
  logActivity(d, unit.projectId, p.by, 'activity.legalUpdated', { unit: unit.code });
  notify(d, ownerKey(unit.ownerCustomerId), 'notif.legalUpdated', { unit: unit.code }, '/app/legal');
};
