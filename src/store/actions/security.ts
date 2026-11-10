import { nowISO } from '../../domain/clock';
import type { PanicSignal, ResidentIdentity } from '../../domain/types';
import { ActionError } from '../errors';
import { nextId } from '../ids';
import { notify, unitOf } from '../notify';
import type { Action } from '../store';

const residentKey = (from: ResidentIdentity) => (from.kind === 'owner' ? `owner:${from.customerId}` : `renter:${from.renterId}`);
const signal = (d: Parameters<Action<unknown>>[0], id: string) => {
  const s = d.panics.find((x) => x.id === id);
  if (!s) throw new ActionError('error.notFound');
  return s;
};

export const triggerPanic: Action<{ unitId: string; from: ResidentIdentity; type: PanicSignal['type']; awayFromHome: boolean }> = (d, p) => {
  const unit = unitOf(d, p.unitId);
  d.panics.push({ id: nextId(d, 'PNC'), unitId: unit.id, from: p.from, type: p.type, awayFromHome: p.awayFromHome, createdAt: nowISO(d.today) });
  notify(d, `security:${unit.projectId}`, 'notif.panic', { unit: unit.code }, '/staff/security/emergency');
  notify(d, `admin:${unit.projectId}`, 'notif.panic', { unit: unit.code }, '/dashboard/security');
};
export const setPanicType: Action<{ id: string; type: PanicSignal['type'] }> = (d, p) => {
  signal(d, p.id).type = p.type;
};
export const cancelPanic: Action<{ id: string }> = (d, p) => {
  const s = signal(d, p.id);
  s.outcome = 'cancelled';
  s.resolvedAt = nowISO(d.today);
};
export const acceptPanic: Action<{ id: string; staffId: string }> = (d, p) => {
  const s = signal(d, p.id);
  s.acceptedAt = nowISO(d.today);
  s.acceptedBy = p.staffId;
  notify(d, residentKey(s.from), 'notif.panicAccepted', {}, '/app/emergency');
};
export const resolvePanic: Action<{ id: string; outcome: 'handled' | 'falseAlarm' }> = (d, p) => {
  const s = signal(d, p.id);
  s.outcome = p.outcome;
  s.resolvedAt = nowISO(d.today);
};
