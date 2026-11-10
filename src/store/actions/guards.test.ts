import { describe, expect, test } from 'vitest';
import { buildSeed } from '../../data/seed';
import type { AppData, FindingStage } from '../../domain/types';
import { apply } from '../test/apply';
import { assignMandor, createWorkGroup, estateRejectFinding, estateVerifyFinding, submitAfterPhoto } from './complaints';
import { acceptPanic, cancelPanic, resolvePanic, triggerPanic } from './security';

const findingAt = (d: AppData, stage: FindingStage) => d.complaints.flatMap((c) => c.findings.filter((f) => f.stage === stage).map((f) => ({ complaintId: c.id, findingId: f.id, f })))[0];

describe('steps repeated from a stale second tab are refused', () => {
  test('a panic is accepted once and resolved once', () => {
    let d = apply(buildSeed(), triggerPanic, { unitId: 'vh-A1-07', from: { kind: 'owner', customerId: 1107 }, type: null, awayFromHome: false });
    const id = d.panics.at(-1)!.id;
    d = apply(d, acceptPanic, { id, staffId: 'st-sec' });
    expect(() => apply(d, acceptPanic, { id, staffId: 'st-sec' })).toThrow('error.alreadyHandled');
    d = apply(d, resolvePanic, { id, outcome: 'handled' });
    expect(() => apply(d, resolvePanic, { id, outcome: 'falseAlarm' })).toThrow('error.alreadyHandled');
    expect(() => apply(d, cancelPanic, { id })).toThrow('error.alreadyHandled');
  });
  test('estate verifies or rejects only findings still waiting for verification', () => {
    const d = buildSeed();
    const v = findingAt(d, 'verified');
    expect(() => apply(d, estateVerifyFinding, { complaintId: v.complaintId, findingId: v.findingId })).toThrow('error.alreadyHandled');
    expect(() => apply(d, estateRejectFinding, { complaintId: v.complaintId, findingId: v.findingId, note: 'x' })).toThrow('error.alreadyHandled');
  });
  test('a group is created and assigned in one step, and an assigned group is not reassigned', () => {
    const seed = buildSeed();
    const v = findingAt(seed, 'verified');
    const d = apply(seed, createWorkGroup, { projectId: 'vh', refs: [{ complaintId: v.complaintId, findingId: v.findingId }], material: 'Kran', estimateDays: 1, mandorId: 'st-mandor' });
    const g = d.workGroups.at(-1)!;
    expect(g.mandorId).toBe('st-mandor');
    expect(findingAt(d, 'assigned')).toBeTruthy();
    expect(d.complaints.find((c) => c.id === v.complaintId)!.findings.find((f) => f.id === v.findingId)!.stage).toBe('assigned');
    expect(() => apply(d, assignMandor, { groupId: g.id, mandorId: 'st-mandor' })).toThrow('error.alreadyHandled');
  });
  test('an after-photo is only accepted while the work is open', () => {
    const d = buildSeed();
    const done = findingAt(d, 'done');
    expect(() => apply(d, submitAfterPhoto, { complaintId: done.complaintId, findingId: done.findingId, photoId: 'sample:DAMP_FIXED', check: { verdict: 'fixed', confidence: 90, noteKey: 'ai.fix.fixed' } })).toThrow('error.alreadyHandled');
  });
});
