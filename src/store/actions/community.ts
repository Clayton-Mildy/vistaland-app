import { nowISO } from '../../domain/clock';
import type { Announcement, Business, Feedback, Lead, Listing, ResidentIdentity } from '../../domain/types';
import { ActionError } from '../errors';
import { nextId } from '../ids';
import { notify, ownerKey, projectOf, unitOf } from '../notify';
import type { Action } from '../store';

const identityKey = (from: ResidentIdentity) => (from.kind === 'owner' ? `owner:${from.customerId}` : `renter:${from.renterId}`);

export const sendFeedback: Action<{ unitId: string; from: ResidentIdentity; topic: Feedback['topic']; text: string; photoId?: string }> = (d, p) => {
  if (!p.text.trim()) throw new ActionError('common.required');
  const unit = unitOf(d, p.unitId);
  d.feedback.push({ id: nextId(d, 'FB'), unitId: unit.id, from: p.from, topic: p.topic, text: p.text.trim(), photoId: p.photoId, status: 'sent', createdAt: nowISO(d.today) });
  notify(d, `admin:${unit.projectId}`, 'notif.admin.feedback', { unit: unit.code }, '/dashboard/community');
};
export const markFeedbackRead: Action<{ id: string }> = (d, p) => {
  const f = d.feedback.find((x) => x.id === p.id);
  if (f && f.status === 'sent') f.status = 'read';
};
export const replyFeedback: Action<{ id: string; reply: string }> = (d, p) => {
  const f = d.feedback.find((x) => x.id === p.id);
  if (!f || !p.reply.trim()) throw new ActionError('error.generic');
  f.reply = p.reply.trim();
  f.status = 'replied';
  f.repliedAt = nowISO(d.today);
  notify(d, identityKey(f.from), 'notif.feedbackReplied', {}, '/app/feedback');
};

export const publishAnnouncement: Action<Omit<Announcement, 'id' | 'createdAt'>> = (d, p) => {
  d.announcements.push({ ...p, id: nextId(d, 'ANN'), createdAt: nowISO(d.today) });
  const recipients = new Set<string>();
  for (const u of d.units) {
    if (u.projectId !== p.projectId || !u.ownerCustomerId || !u.appActivatedAt) continue;
    recipients.add(ownerKey(u.ownerCustomerId));
    if (u.renterId) recipients.add(`renter:${u.renterId}`);
  }
  for (const to of recipients) notify(d, to, 'notif.announcement', { title: p.title }, '/app/home');
};

export const registerBusiness: Action<Omit<Business, 'id' | 'status' | 'hasVoucher' | 'open'>> = (d, p) => {
  d.businesses.push({ ...p, id: nextId(d, 'BIZ'), status: 'pending', open: true, hasVoucher: false });
  notify(d, `admin:${p.projectId}`, 'notif.admin.business', { name: p.name }, '/dashboard/community');
};
export const verifyBusiness: Action<{ id: string }> = (d, p) => {
  const b = d.businesses.find((x) => x.id === p.id);
  if (!b) throw new ActionError('error.notFound');
  b.status = 'verified';
  if (b.ownerUnitId) notify(d, ownerKey(unitOf(d, b.ownerUnitId).ownerCustomerId), 'notif.businessVerified', { name: b.name }, '/app/businesses');
};

const HOUSE_KINDS: Listing['kind'][] = ['rumahDisewakan', 'rumahDijual'];
export const postListing: Action<Omit<Listing, 'id' | 'projectId' | 'createdAt' | 'replies' | 'reported'>> = (d, p) => {
  const unit = unitOf(d, p.unitId);
  const project = projectOf(d, unit.projectId);
  if (HOUSE_KINDS.includes(p.kind) && (project.segment === 'subsidi' || !project.settings.features.houseListings)) throw new ActionError('error.featureDisabled');
  if (!p.title.trim()) throw new ActionError('common.required');
  d.listings.push({ ...p, id: nextId(d, 'LST'), projectId: project.id, createdAt: nowISO(d.today), replies: 0, reported: false });
};
export const reportListing: Action<{ id: string }> = (d, p) => {
  const l = d.listings.find((x) => x.id === p.id);
  if (!l) throw new ActionError('error.notFound');
  l.reported = true;
  notify(d, `admin:${l.projectId}`, 'notif.admin.listingReported', { title: l.title }, '/dashboard/community');
};

/** Lead from a public listing form or from "Ask marketing" in the app. */
export const submitLead: Action<{ listingId?: string; projectName?: string; projectId?: string; name: string; whatsapp: string; domicile: string; plan: Lead['plan']; interest: Lead['interest'] }> = (d, p) => {
  if (!p.name.trim() || p.whatsapp.replace(/\D/g, '').length < 9) throw new ActionError('error.leadInvalid');
  const listing = p.listingId ? d.listings.find((l) => l.id === p.listingId) : undefined;
  const projectId = listing?.projectId ?? p.projectId;
  if (!projectId) throw new ActionError('error.generic');
  const now = nowISO(d.today);
  const unit = listing ? unitOf(d, listing.unitId) : undefined;
  d.leads.push({
    id: nextId(d, 'LEAD'), projectId, name: p.name.trim(), whatsapp: p.whatsapp, interest: p.interest,
    source: listing ? { kind: 'listing', listingId: listing.id } : { kind: 'project', projectName: p.projectName ?? '' },
    domicile: p.domicile, plan: p.plan, status: 'baru', pic: unit ? `Pemilik ${unit.code}` : 'Mkt. Rani', consentAt: now, createdAt: now,
  });
  if (listing && unit) {
    listing.replies++;
    notify(d, ownerKey(unit.ownerCustomerId), 'notif.newLead', { name: p.name.trim(), title: listing.title }, '/app/market');
  }
  notify(d, `admin:${projectId}`, 'notif.admin.newLead', { name: p.name.trim() }, '/dashboard/leads');
};
export const updateLeadStatus: Action<{ id: string; status: Lead['status'] }> = (d, p) => {
  const l = d.leads.find((x) => x.id === p.id);
  if (l) l.status = p.status;
};

export const claimVoucher: Action<{ voucherId: string; holder: string }> = (d, p) => {
  const v = d.vouchers.find((x) => x.id === p.voucherId);
  if (!v) throw new ActionError('error.notFound');
  if (d.voucherClaims.some((c) => c.voucherId === v.id && c.holder === p.holder)) throw new ActionError('error.alreadyClaimed');
  if (v.stock <= 0 || v.validUntil < d.today) throw new ActionError('error.outOfStock');
  v.stock--;
  const id = nextId(d, 'CLM');
  const serial = 1000 + ((Number(id.slice(4)) * 7919) % 9000);
  d.voucherClaims.push({ id, voucherId: v.id, holder: p.holder, code: `${v.code}-${serial}`, claimedAt: nowISO(d.today) });
};
export const redeemVoucherCode: Action<{ code: string; holder: string; projectId: string }> = (d, p) => {
  const v = d.vouchers.find((x) => x.projectId === p.projectId && x.code.toLowerCase() === p.code.trim().toLowerCase());
  if (!v) throw new ActionError('error.voucherCode');
  claimVoucher(d, { voucherId: v.id, holder: p.holder });
};
