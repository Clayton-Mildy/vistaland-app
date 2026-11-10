import type { ResidentIdentity, Session } from '../../domain/types';
import { ActionError } from '../errors';
import { notify, unitOf } from '../notify';
import type { Action } from '../store';

export const startResidentSession: Action<{ identity: ResidentIdentity; unitId: string }> = (d, p) => {
  d.session.resident = { identity: p.identity, unitId: p.unitId };
};

export const switchUnit: Action<{ unitId: string }> = (d, p) => {
  const s = d.session.resident;
  if (!s) throw new ActionError('error.generic');
  const unit = unitOf(d, p.unitId);
  const owns = s.identity.kind === 'owner' ? unit.ownerCustomerId === s.identity.customerId : unit.renterId === s.identity.renterId;
  if (!owns) throw new ActionError('error.notFound');
  s.unitId = p.unitId;
};

export const endResidentSession: Action<object> = (d) => {
  delete d.session.resident;
};

/** First login on a unit: records app activation and tells the estate. */
export const activateApp: Action<{ unitId: string }> = (d, p) => {
  const unit = unitOf(d, p.unitId);
  if (unit.appActivatedAt) return;
  unit.appActivatedAt = d.today;
  notify(d, `admin:${unit.projectId}`, 'notif.admin.appActivated', { unit: unit.code }, `/dashboard/ipl/${unit.id}`);
};

export const startStaffSession: Action<{ staffId: string }> = (d, p) => {
  d.session.staff = { staffId: p.staffId };
};
export const endStaffSession: Action<object> = (d) => {
  delete d.session.staff;
};
export const setDashboardProject: Action<{ projectId: string }> = (d, p) => {
  d.session.dashboard.projectId = p.projectId;
};
export const setRoleView: Action<{ roleView: Session['dashboard']['roleView'] }> = (d, p) => {
  d.session.dashboard.roleView = p.roleView;
};
export const markNotificationsRead: Action<{ to: string }> = (d, p) => {
  for (const n of d.notifications) if (n.to === p.to) n.read = true;
};
