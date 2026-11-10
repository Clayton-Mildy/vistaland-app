import { nowISO } from '../../domain/clock';
import { CHECKLIST_BY_CATEGORY, complaintWindow } from '../../domain/complaints';
import type { AiResult, AppData, Complaint, ComplaintCategory, FixCheck, FindingStage, RoomId } from '../../domain/types';
import { ActionError } from '../errors';
import { nextId } from '../ids';
import { notify, ownerKey, projectOf, unitOf } from '../notify';
import type { Action } from '../store';

const find = (d: AppData, complaintId: string, findingId: string) => {
  const c = d.complaints.find((x) => x.id === complaintId);
  const f = c?.findings.find((x) => x.id === findingId);
  if (!c || !f) throw new ActionError('error.notFound');
  return { c, f };
};
const move = (d: AppData, c: Complaint, findingId: string, stage: FindingStage, by: string) => {
  const f = c.findings.find((x) => x.id === findingId)!;
  f.stage = stage;
  f.history.push({ stage, at: nowISO(d.today), by });
};
const residentOf = (d: AppData, unitId: string) => ownerKey(unitOf(d, unitId).ownerCustomerId);

/** Resident adds a finding to the draft complaint (one submission per window). */
export const addFinding: Action<{ unitId: string; room: RoomId; photoIds: string[]; description: string; ai: AiResult; manualReview: boolean }> = (d, p) => {
  const unit = unitOf(d, p.unitId);
  const s = projectOf(d, unit.projectId).settings;
  if (complaintWindow(unit.handover.bastDate, s.complaints.windowDays, d.today).status !== 'open') throw new ActionError('error.windowClosed');
  let c = d.complaints.find((x) => x.unitId === unit.id);
  if (c?.submittedAt) throw new ActionError('error.alreadySubmitted');
  if (p.ai.verdict !== 'valid' && !p.manualReview) throw new ActionError('error.needsManualReview');
  if (!c) {
    c = { id: nextId(d, 'KMP'), unitId: unit.id, createdAt: nowISO(d.today), findings: [] };
    d.complaints.push(c);
  }
  c.findings.push({
    id: `f-${c.id.slice(4)}-${(d.seq.F = (d.seq.F ?? 0) + 1)}`, room: p.room, photoIds: p.photoIds, description: p.description, ai: p.ai,
    manualReview: p.manualReview, category: p.ai.category, checklist: [], fixChecks: [], stage: 'draft', history: [{ stage: 'draft', at: nowISO(d.today), by: 'resident' }],
  });
};

export const removeFinding: Action<{ unitId: string; findingId: string }> = (d, p) => {
  const c = d.complaints.find((x) => x.unitId === p.unitId);
  if (!c || c.submittedAt) throw new ActionError('error.alreadySubmitted');
  c.findings = c.findings.filter((f) => f.id !== p.findingId);
};

export const submitComplaint: Action<{ unitId: string }> = (d, p) => {
  const c = d.complaints.find((x) => x.unitId === p.unitId);
  if (!c || c.submittedAt || !c.findings.length) throw new ActionError('error.generic');
  c.submittedAt = nowISO(d.today);
  for (const f of c.findings) move(d, c, f.id, 'submitted', 'resident');
  const unit = unitOf(d, p.unitId);
  notify(d, `admin:${unit.projectId}`, 'notif.admin.complaintSubmitted', { id: c.id, unit: unit.code, n: c.findings.length }, '/dashboard/complaints');
};

export const estateVerifyFinding: Action<{ complaintId: string; findingId: string; category?: ComplaintCategory; note?: string }> = (d, p) => {
  const { c, f } = find(d, p.complaintId, p.findingId);
  if (p.category) f.category = p.category;
  if (p.note) f.estateNote = p.note;
  move(d, c, f.id, 'verified', 'estate');
  notify(d, residentOf(d, c.unitId), 'notif.complaint.verified', { id: c.id }, '/app/complaint/track');
};

export const estateRejectFinding: Action<{ complaintId: string; findingId: string; note: string }> = (d, p) => {
  const { c, f } = find(d, p.complaintId, p.findingId);
  f.estateNote = p.note;
  move(d, c, f.id, 'rejected', 'estate');
  notify(d, residentOf(d, c.unitId), 'notif.complaint.rejected', { id: c.id }, '/app/complaint/track');
};

/** Contractor groups similar verified findings across units into one work order. */
export const createWorkGroup: Action<{ projectId: string; refs: { complaintId: string; findingId: string }[]; material: string; estimateDays: number }> = (d, p) => {
  if (!p.refs.length) throw new ActionError('error.generic');
  const first = find(d, p.refs[0].complaintId, p.refs[0].findingId).f;
  const id = nextId(d, 'GRP');
  d.workGroups.push({ id, projectId: p.projectId, category: first.category, refs: p.refs, material: p.material, estimateDays: p.estimateDays, createdAt: nowISO(d.today) });
  for (const r of p.refs) find(d, r.complaintId, r.findingId).f.groupId = id;
};

export const assignMandor: Action<{ groupId: string; mandorId: string }> = (d, p) => {
  const g = d.workGroups.find((x) => x.id === p.groupId);
  if (!g) throw new ActionError('error.notFound');
  g.mandorId = p.mandorId;
  for (const r of g.refs) {
    const { c, f } = find(d, r.complaintId, r.findingId);
    f.mandorId = p.mandorId;
    f.checklist = CHECKLIST_BY_CATEGORY[f.category].map((label) => ({ label, done: false }));
    move(d, c, f.id, 'assigned', 'contractor');
    notify(d, residentOf(d, c.unitId), 'notif.complaint.assigned', { id: c.id }, '/app/complaint/track');
  }
  notify(d, `staff:${p.mandorId}`, 'notif.mandor.assigned', { n: g.refs.length }, '/staff/mandor/tasks');
};

export const startWork: Action<{ complaintId: string; findingId: string }> = (d, p) => {
  const { c, f } = find(d, p.complaintId, p.findingId);
  if (f.stage === 'assigned') move(d, c, f.id, 'inProgress', 'mandor');
};

export const toggleChecklistItem: Action<{ complaintId: string; findingId: string; index: number }> = (d, p) => {
  const item = find(d, p.complaintId, p.findingId).f.checklist[p.index];
  if (item) item.done = !item.done;
};

/** Mandor's after-photo with the AI fix check: pass → estate final check, fail → back to the mandor. */
export const submitAfterPhoto: Action<{ complaintId: string; findingId: string; photoId: string; check: Omit<FixCheck, 'at' | 'photoId'> }> = (d, p) => {
  const { c, f } = find(d, p.complaintId, p.findingId);
  if (f.stage === 'assigned') move(d, c, f.id, 'inProgress', 'mandor');
  f.fixChecks.push({ ...p.check, at: nowISO(d.today), photoId: p.photoId });
  const unit = unitOf(d, c.unitId);
  if (p.check.verdict === 'fixed') {
    move(d, c, f.id, 'workDone', 'ai');
    notify(d, `admin:${unit.projectId}`, 'notif.admin.aiPassed', { id: c.id, unit: unit.code }, '/dashboard/complaints');
    notify(d, residentOf(d, c.unitId), 'notif.complaint.workDone', { id: c.id }, '/app/complaint/track');
  } else if (f.mandorId) {
    notify(d, `staff:${f.mandorId}`, 'notif.mandor.aiFailed', { unit: unit.code }, '/staff/mandor/tasks');
  }
};

export const estateFinalOk: Action<{ complaintId: string; findingId: string }> = (d, p) => {
  const { c, f } = find(d, p.complaintId, p.findingId);
  if (f.stage !== 'workDone') throw new ActionError('error.generic');
  move(d, c, f.id, 'awaitingResident', 'estate');
  notify(d, residentOf(d, c.unitId), 'notif.complaint.confirm', { id: c.id }, '/app/complaint/track');
};

export const residentConfirm: Action<{ complaintId: string; findingId: string }> = (d, p) => {
  const { c, f } = find(d, p.complaintId, p.findingId);
  if (f.stage !== 'awaitingResident') throw new ActionError('error.generic');
  move(d, c, f.id, 'done', 'resident');
};
