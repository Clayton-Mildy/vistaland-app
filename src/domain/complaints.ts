import { addDays, diffDays } from './clock';
import type { Complaint, ComplaintCategory, Finding, FindingStage, ISODate, ISODateTime } from './types';

export function complaintWindow(bastDate: ISODate | undefined, windowDays: number, today: ISODate) {
  if (!bastDate) return { status: 'notStarted' as const, endsOn: undefined, daysLeft: windowDays, elapsedPct: 0 };
  const endsOn = addDays(bastDate, windowDays);
  const closed = today > endsOn;
  const elapsed = Math.min(100, Math.max(0, (diffDays(bastDate, today) / windowDays) * 100));
  return { status: closed ? ('closed' as const) : ('open' as const), endsOn, daysLeft: closed ? 0 : diffDays(today, endsOn), elapsedPct: Math.round(elapsed) };
}

/** The 7 steps residents see on the complaint tracker. */
export const TRACKER_STEPS = ['submitted', 'estateVerify', 'assigned', 'inProgress', 'aiCheck', 'estateFinal', 'done'] as const;

export const STAGE_STEP: Record<FindingStage, number> = {
  draft: 0, submitted: 1, verified: 2, assigned: 3, inProgress: 3, workDone: 5, awaitingResident: 6, done: 7, rejected: 7,
};

export const isUnfinished = (f: Finding) => !['draft', 'done', 'rejected'].includes(f.stage);

/** Overall tracker position = the least advanced (non-rejected) finding. */
export function trackerIndex(c: Complaint): number {
  const live = c.findings.filter((f) => f.stage !== 'rejected');
  if (!live.length) return 7;
  return Math.min(...live.map((f) => STAGE_STEP[f.stage]));
}

export const BOARD_COLUMNS: { key: 'estateVerify' | 'contractor' | 'mandor' | 'estateFinal' | 'residentConfirm' | 'done'; stages: FindingStage[] }[] = [
  { key: 'estateVerify', stages: ['submitted'] },
  { key: 'contractor', stages: ['verified'] },
  { key: 'mandor', stages: ['assigned', 'inProgress'] },
  { key: 'estateFinal', stages: ['workDone'] },
  { key: 'residentConfirm', stages: ['awaitingResident'] },
  { key: 'done', stages: ['done', 'rejected'] },
];

export function isOverSla(f: Finding, submittedAt: ISODateTime, slaDays: number, today: ISODate): boolean {
  if (['done', 'rejected', 'awaitingResident', 'draft'].includes(f.stage)) return false;
  return diffDays(submittedAt.slice(0, 10), today) > slaDays;
}

/** Work checklist the mandor ticks per category (i18n keys). */
export const CHECKLIST_BY_CATEGORY: Record<ComplaintCategory, string[]> = {
  kebocoran: ['checklist.kebocoran.1', 'checklist.kebocoran.2', 'checklist.kebocoran.3'],
  retak: ['checklist.retak.1', 'checklist.retak.2', 'checklist.retak.3'],
  cat: ['checklist.cat.1', 'checklist.cat.2', 'checklist.cat.3'],
  keramik: ['checklist.keramik.1', 'checklist.keramik.2', 'checklist.keramik.3'],
  pintuJendela: ['checklist.pintuJendela.1', 'checklist.pintuJendela.2'],
  listrik: ['checklist.listrik.1', 'checklist.listrik.2'],
  pipa: ['checklist.pipa.1', 'checklist.pipa.2', 'checklist.pipa.3'],
  plafonAtap: ['checklist.plafonAtap.1', 'checklist.plafonAtap.2', 'checklist.plafonAtap.3'],
  lainnya: ['checklist.lainnya.1', 'checklist.lainnya.2'],
};
