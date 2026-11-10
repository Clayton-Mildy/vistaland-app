import type { LucideIcon } from 'lucide-react';
import { hashString } from '../../../domain/ai';
import type { Listing } from '../../../domain/types';
import { isHouse, KIND_META } from '../listingMeta';

/** A stable house photo for a unit: every unit of one house type shows the same photo. */
export const houseFor = (unit: { id: string; typeId: string }): string => `house:${(hashString(unit.typeId) % 5) + 1}`;

/** What to show for a listing: its own photo, else the house photo for homes, else a category icon. */
export function listingThumb(listing: Listing, unit?: { id: string; typeId: string }): { photoId: string } | { icon: LucideIcon } {
  if (listing.photoIds[0]) return { photoId: listing.photoIds[0] };
  if (isHouse(listing.kind) && unit) return { photoId: houseFor(unit) };
  return { icon: KIND_META[listing.kind].icon };
}
