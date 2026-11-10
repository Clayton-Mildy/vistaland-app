import type { ISODate, MoveInPermit, Renter, ResidentIdentity, Unit } from './types';

export type OnboardingKey = 'handover' | 'app' | 'rules' | 'moveIn' | 'occupied';
export interface OnboardingStep { key: OnboardingKey; done: boolean; date?: ISODate }

export function onboardingSteps(unit: Unit, ctx: { moveIn?: MoveInPermit }): OnboardingStep[] {
  const permit = ctx.moveIn && ctx.moveIn.status !== 'cancelled' ? ctx.moveIn : undefined;
  return [
    { key: 'handover', done: !!unit.handover.bastDate, date: unit.handover.bastDate },
    { key: 'app', done: !!unit.appActivatedAt, date: unit.appActivatedAt },
    { key: 'rules', done: !!unit.rules, date: unit.rules?.signedAt.slice(0, 10) },
    { key: 'moveIn', done: !!permit || !!unit.moveIn || !!unit.selfReportedMoveIn, date: permit?.date ?? unit.moveIn?.date ?? unit.selfReportedMoveIn },
    { key: 'occupied', done: unit.occupancy === 'occupied', date: unit.moveIn?.date },
  ];
}

export const nextOnboardingStep = (steps: OnboardingStep[]): OnboardingKey | null => steps.find((s) => !s.done)?.key ?? null;

export function isOccupiedFor(identity: ResidentIdentity, unit: Unit, renter?: Renter): boolean {
  if (identity.kind === 'renter') return !!renter?.movedInAt;
  return unit.occupancy === 'occupied';
}
