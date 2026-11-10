import type { Consequence, ProjectSettings } from './types';

export const CONSEQUENCE_TYPES: Consequence['type'][] = ['cardSuspended', 'garbageStopped', 'warningLetter'];

/** Consequence types the estate may apply. Data saved before this setting existed offers all of them. */
export const offeredConsequences = (s: ProjectSettings): Consequence['type'][] => s.overdue.offered ?? CONSEQUENCE_TYPES;
