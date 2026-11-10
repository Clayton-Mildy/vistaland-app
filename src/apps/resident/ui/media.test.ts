import { expect, test } from 'vitest';
import type { Listing } from '../../../domain/types';
import { houseFor, listingThumb } from './media';

const listing = (kind: Listing['kind'], photoIds: string[] = []): Listing => ({ id: 'L1', projectId: 'vh', unitId: 'vh-A1-07', kind, title: 'Judul', description: '', photoIds, createdAt: '2026-11-01T09:00:00', replies: 0, reported: false });

test('houseFor gives every unit of one house type the same house photo', () => {
  const a = houseFor({ id: 'vh-A1-07', typeId: 'vh-45' });
  expect(houseFor({ id: 'vh-B2-04', typeId: 'vh-45' })).toBe(a);
  for (const typeId of ['vh-36', 'vh-45', 'vh-60', 'hp-30', 'hp-36']) expect(houseFor({ id: 'x', typeId })).toMatch(/^house:[1-5]$/);
});

test('a listing shows its own photo, else the house photo for homes, else a category icon (never a letter)', () => {
  const unit = { id: 'vh-A1-07', typeId: 'vh-45' };
  expect(listingThumb(listing('dijual', ['idb:abc']), unit)).toEqual({ photoId: 'idb:abc' });
  expect(listingThumb(listing('rumahDisewakan'), unit)).toEqual({ photoId: houseFor(unit) });
  expect(listingThumb(listing('rumahDijual'), unit)).toEqual({ photoId: houseFor(unit) });
  const jasa = listingThumb(listing('jasa'), unit);
  expect('icon' in jasa && jasa.icon).toBeTruthy();
});
