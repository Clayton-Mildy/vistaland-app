import type { AiResult, FixCheck } from '../domain/types';

type FixPreset = Omit<FixCheck, 'at' | 'photoId'>;
export interface SamplePhoto { file: string; kind: 'before' | 'after' | 'doc'; base?: string; preset?: AiResult | FixPreset }

const area = { x: 0.28, y: 0.18, w: 0.4, h: 0.34 };
const before = (file: string, preset: AiResult): SamplePhoto => ({ file, kind: 'before', preset });
const fixed = (base: string, confidence: number): SamplePhoto => ({ file: `${base.toLowerCase()}-fixed.svg`, kind: 'after', base, preset: { verdict: 'fixed', confidence, noteKey: 'ai.fix.fixed' } });
const notFixed = (base: string): SamplePhoto => ({ file: `${base.toLowerCase()}-notfixed.svg`, kind: 'after', base, preset: { verdict: 'notFixed', confidence: 86, noteKey: 'ai.fix.stillVisible' } });

/** Bundled demo photos with fixed AI outcomes. Photo ids are `sample:<KEY>`. */
export const SAMPLE_PHOTOS: Record<string, SamplePhoto> = {
  DAMP: before('damp.svg', { verdict: 'valid', category: 'kebocoran', confidence: 92, noteKey: 'ai.note.kebocoran', area }),
  TILE: before('tile.svg', { verdict: 'valid', category: 'keramik', confidence: 89, noteKey: 'ai.note.keramik', area: { x: 0.35, y: 0.45, w: 0.32, h: 0.3 } }),
  PAINT: before('paint.svg', { verdict: 'valid', category: 'cat', confidence: 94, noteKey: 'ai.note.cat', area: { x: 0.2, y: 0.3, w: 0.45, h: 0.35 } }),
  CRACK: before('crack.svg', { verdict: 'valid', category: 'retak', confidence: 87, noteKey: 'ai.note.retak', area: { x: 0.38, y: 0.12, w: 0.24, h: 0.6 } }),
  TAP: before('tap.svg', { verdict: 'valid', category: 'pipa', confidence: 90, noteKey: 'ai.note.pipa', area: { x: 0.36, y: 0.2, w: 0.3, h: 0.4 } }),
  CLEAN: before('clean.svg', { verdict: 'invalid', category: 'lainnya', confidence: 88, noteKey: 'ai.note.noDamage' }),
  DARK: before('dark.svg', { verdict: 'unclear', category: 'lainnya', confidence: 51, noteKey: 'ai.note.tooDark' }),
  DAMP_FIXED: fixed('DAMP', 93), DAMP_NOTFIXED: notFixed('DAMP'),
  TILE_FIXED: fixed('TILE', 91), TILE_NOTFIXED: notFixed('TILE'),
  PAINT_FIXED: fixed('PAINT', 95), PAINT_NOTFIXED: notFixed('PAINT'),
  CRACK_FIXED: fixed('CRACK', 91), CRACK_NOTFIXED: notFixed('CRACK'),
  TAP_FIXED: fixed('TAP', 93), TAP_NOTFIXED: notFixed('TAP'),
  WRONG: { file: 'wrong.svg', kind: 'after', preset: { verdict: 'wrongArea', confidence: 84, noteKey: 'ai.fix.wrongArea' } },
  SIGNATURE: { file: 'signature.svg', kind: 'doc' },
  LEASE: { file: 'lease.svg', kind: 'doc' },
  SELFIE: { file: 'selfie.svg', kind: 'doc' },
  RECEIPT: { file: 'receipt.svg', kind: 'doc' },
  LAWN_BEFORE: { file: 'lawn-before.svg', kind: 'doc' },
  LAWN_AFTER: { file: 'lawn-after.svg', kind: 'doc' },
};
export const BEFORE_SAMPLES = ['DAMP', 'TILE', 'PAINT', 'CRACK', 'TAP', 'CLEAN', 'DARK'];
export const afterSamplesFor = (beforePhotoId: string): string[] => {
  const base = beforePhotoId.startsWith('sample:') ? beforePhotoId.slice(7) : 'DAMP';
  const b = SAMPLE_PHOTOS[`${base}_FIXED`] ? base : 'DAMP';
  return [`${b}_FIXED`, `${b}_NOTFIXED`, 'WRONG'];
};
