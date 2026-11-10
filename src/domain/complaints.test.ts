import { describe, expect, test } from 'vitest';
import { buildSeed } from '../data/seed';
import { BOARD_COLUMNS, complaintWindow, isOverSla, STAGE_STEP, TRACKER_STEPS, trackerIndex } from './complaints';

describe('complaintWindow', () => {
  test('open window counts days left from BAST', () => {
    expect(complaintWindow('2026-09-12', 100, '2026-11-10')).toMatchObject({ status: 'open', endsOn: '2026-12-21', daysLeft: 41 });
  });
  test('closes after the window', () => {
    expect(complaintWindow('2026-06-03', 100, '2026-11-10')).toMatchObject({ status: 'closed', daysLeft: 0 });
  });
  test('not started without BAST', () => {
    expect(complaintWindow(undefined, 100, '2026-11-10').status).toBe('notStarted');
  });
  test('the last day is still open', () => {
    expect(complaintWindow('2026-09-12', 100, '2026-12-21')).toMatchObject({ status: 'open', daysLeft: 0 });
  });
});

describe('stages', () => {
  const seed = buildSeed();
  test('tracker has 7 steps', () => expect(TRACKER_STEPS).toHaveLength(7));
  test('tracker index is the least advanced finding', () => {
    const kmp145 = seed.complaints.find((c) => c.id === 'KMP-0145')!;
    expect(trackerIndex(kmp145)).toBe(3);
    expect(STAGE_STEP.done).toBe(7);
  });
  test('board columns cover every non-draft stage once', () => {
    const stages = BOARD_COLUMNS.flatMap((c) => c.stages);
    expect(new Set(stages).size).toBe(stages.length);
    expect(stages.sort()).toEqual(['assigned', 'awaitingResident', 'done', 'inProgress', 'rejected', 'submitted', 'verified', 'workDone']);
  });
  test('SLA', () => {
    const f = seed.complaints.find((c) => c.id === 'KMP-0145')!.findings[0];
    expect(isOverSla(f, '2026-05-20T19:00:00', 7, '2026-11-10')).toBe(true);
    expect(isOverSla(f, '2026-11-08T19:00:00', 7, '2026-11-10')).toBe(false);
  });
});
