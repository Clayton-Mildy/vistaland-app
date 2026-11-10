import { complaintWindow, isUnfinished } from './complaints';
import { isOccupiedFor } from './onboarding';
import type { Complaint, FeatureKey, ISODate, Project, Renter, ResidentFeature, ResidentIdentity, Unit } from './types';

export type AccessReason = 'segment' | 'disabled' | 'role' | 'notOccupied' | 'noBast' | 'windowClosed' | 'renterIplOwner';
export type AccessResult = { ok: true } | { ok: false; reason: AccessReason };
export interface AccessCtx { project: Project; unit: Unit; identity: ResidentIdentity; renter?: Renter; complaint?: Complaint; today: ISODate }

const COMMERCIAL_ONLY: ResidentFeature[] = ['renterRegistration', 'houseListings', 'panic', 'cctv', 'legal', 'projects', 'handbook'];
const RENTER_BLOCKED: ResidentFeature[] = ['complaint', 'handover', 'legal', 'renterRegistration', 'houseListings'];
const NEEDS_OCCUPIED: ResidentFeature[] = ['vouchers', 'marketplace', 'businesses', 'feedback', 'panic', 'cctv', 'legal'];
const NEEDS_BAST: ResidentFeature[] = ['complaint', 'rules', 'moveIn', 'renovation'];
const FLAGS: FeatureKey[] = ['renterRegistration', 'houseListings', 'panic', 'cctv', 'legal', 'projects', 'handbook', 'vouchers', 'marketplace', 'businesses', 'feedback', 'wifi', 'prepay'];

const no = (reason: AccessReason): AccessResult => ({ ok: false, reason });

/** Segment → feature flag → role → occupancy → feature-specific rules. */
export function canUse(f: ResidentFeature, ctx: AccessCtx): AccessResult {
  const { project, unit, identity, renter, complaint, today } = ctx;
  if (project.segment === 'subsidi' && COMMERCIAL_ONLY.includes(f)) return no('segment');
  if ((FLAGS as string[]).includes(f) && !project.settings.features[f as FeatureKey]) return no('disabled');
  const isRenter = identity.kind === 'renter';
  if (isRenter && RENTER_BLOCKED.includes(f)) return no('role');
  if (NEEDS_OCCUPIED.includes(f) && !isOccupiedFor(identity, unit, renter)) return no('notOccupied');
  if (!isRenter && NEEDS_BAST.includes(f) && !unit.handover.bastDate) return no('noBast');
  if (f === 'bills' && isRenter && renter?.iplPayer === 'owner') return no('renterIplOwner');
  if (f === 'complaint') {
    const w = complaintWindow(unit.handover.bastDate, project.settings.complaints.windowDays, today);
    const tracking = !!complaint?.submittedAt && complaint.findings.some(isUnfinished);
    if (w.status === 'closed' && !tracking) return no('windowClosed');
  }
  return { ok: true };
}
