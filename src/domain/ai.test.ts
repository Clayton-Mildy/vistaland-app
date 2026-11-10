import { describe, expect, test } from 'vitest';
import { SAMPLE_PHOTOS } from '../data/samples';
import { analyzeComplaintPhoto, checkFix, fixCheckFor } from './ai';

describe('analyzeComplaintPhoto', () => {
  test('sample photos return their preset', () => {
    expect(analyzeComplaintPhoto({ photoId: 'sample:DAMP', description: '', room: 'kamar2' })).toMatchObject({ verdict: 'valid', category: 'kebocoran', confidence: 92 });
    expect(analyzeComplaintPhoto({ photoId: 'sample:CLEAN', description: 'dinding', room: 'kamar2' })).toMatchObject({ verdict: 'invalid', noteKey: 'ai.note.noDamage' });
    expect(analyzeComplaintPhoto({ photoId: 'sample:DARK', description: '', room: 'dapur' }).verdict).toBe('unclear');
  });
  test('uploads: a dark photo is unclear', () => {
    expect(analyzeComplaintPhoto({ photoId: 'idb:1', stats: { brightness: 30, variance: 900 }, description: 'retak', room: 'dapur' })).toMatchObject({ verdict: 'unclear', noteKey: 'ai.note.tooDark' });
  });
  test('uploads: a flat photo shows no damage', () => {
    expect(analyzeComplaintPhoto({ photoId: 'idb:2', stats: { brightness: 140, variance: 60 }, description: 'retak', room: 'dapur' }).verdict).toBe('invalid');
  });
  test('uploads: category comes from the description, in Indonesian or English', () => {
    expect(analyzeComplaintPhoto({ photoId: 'idb:3', stats: { brightness: 140, variance: 900 }, description: 'kran wastafel bocor terus', room: 'kamarMandi' })).toMatchObject({ verdict: 'valid', category: 'pipa' });
    expect(analyzeComplaintPhoto({ photoId: 'idb:4', stats: { brightness: 140, variance: 900 }, description: 'the wall has a long crack', room: 'kamar2' }).category).toBe('retak');
  });
  test('uploads: too little description is unclear', () => {
    expect(analyzeComplaintPhoto({ photoId: 'idb:5', stats: { brightness: 140, variance: 900 }, description: 'ini', room: 'kamar2' })).toMatchObject({ verdict: 'unclear', noteKey: 'ai.note.describeMore' });
  });
  test('same input gives the same result', () => {
    const input = { photoId: 'idb:6', stats: { brightness: 120, variance: 700 }, description: 'keramik lantai pecah', room: 'dapur' as const };
    expect(analyzeComplaintPhoto(input)).toEqual(analyzeComplaintPhoto(input));
  });
});

describe('checkFix', () => {
  test('sample after-photos', () => {
    expect(checkFix({ beforePhotoId: 'sample:DAMP', afterPhotoId: 'sample:DAMP_NOTFIXED' }).verdict).toBe('notFixed');
    expect(checkFix({ beforePhotoId: 'sample:DAMP', afterPhotoId: 'sample:DAMP_FIXED' }).verdict).toBe('fixed');
    expect(checkFix({ beforePhotoId: 'sample:DAMP', afterPhotoId: 'sample:WRONG' }).verdict).toBe('wrongArea');
  });
  test('the same photo as before fails', () => {
    expect(checkFix({ beforePhotoId: 'idb:a', afterPhotoId: 'idb:b', beforeHash: 'x1', afterHash: 'x1' })).toMatchObject({ verdict: 'notFixed', noteKey: 'ai.fix.samePhoto' });
  });
  test('a different upload passes with a stable confidence', () => {
    const r = checkFix({ beforePhotoId: 'idb:a', afterPhotoId: 'idb:c', beforeHash: 'x1', afterHash: 'x2' });
    expect(r.verdict).toBe('fixed');
    expect(r).toEqual(checkFix({ beforePhotoId: 'idb:a', afterPhotoId: 'idb:c', beforeHash: 'x1', afterHash: 'x2' }));
  });
  test('every after sample points at a before sample or is WRONG', () => {
    for (const [id, s] of Object.entries(SAMPLE_PHOTOS)) if (s.kind === 'after' && id !== 'WRONG') expect(SAMPLE_PHOTOS[s.base!], id).toBeDefined();
  });
});

test('an uploaded after-photo that is the resident\'s own photo fails as "same photo"', () => {
  const finding = { photoIds: ['idb:resident-photo'], photoHash: '9f3a1c' };
  expect(fixCheckFor(finding, { id: 'idb:mandor-upload', hash: '9f3a1c' })).toMatchObject({ verdict: 'notFixed', noteKey: 'ai.fix.samePhoto' });
  expect(fixCheckFor(finding, { id: 'idb:mandor-upload', hash: '77b2e0' }).verdict).toBe('fixed');
});
