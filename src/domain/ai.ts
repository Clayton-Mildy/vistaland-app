import { SAMPLE_PHOTOS } from '../data/samples';
import type { AiResult, ComplaintCategory, FixCheck, RoomId } from './types';

/** Stable 32-bit FNV-1a hash, so simulated results repeat for the same input. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Ordered so specific objects (tap, socket, door…) beat symptoms (leak, crack, paint):
// 'kran bocor' is plumbing, 'plafon bocor' is a roof problem.
export const CATEGORY_KEYWORDS: Record<Exclude<ComplaintCategory, 'lainnya'>, string[]> = {
  keramik: ['keramik', 'lantai', 'nat', 'ubin', 'tile', 'floor', 'grout'],
  pintuJendela: ['pintu', 'jendela', 'engsel', 'kunci', 'kusen', 'door', 'window', 'hinge', 'lock'],
  listrik: ['listrik', 'stop kontak', 'saklar', 'lampu', 'mcb', 'kabel', 'electric', 'socket', 'switch', 'light'],
  pipa: ['kran', 'keran', 'pipa', 'wastafel', 'closet', 'kloset', 'saluran', 'mampet', 'tap', 'pipe', 'sink', 'toilet', 'drain'],
  plafonAtap: ['plafon', 'atap', 'genteng', 'talang', 'ceiling', 'roof', 'gutter'],
  cat: ['cat', 'mengelupas', 'kusam', 'belang', 'paint', 'peel', 'finishing'],
  retak: ['retak', 'crack', 'pecah dinding', 'belah', 'struktur'],
  kebocoran: ['rembes', 'bocor', 'lembab', 'lembap', 'basah', 'jamur', 'leak', 'damp', 'wet', 'mould', 'mold', 'seep'],
};

export interface PhotoStats { brightness: number; variance: number }

export function analyzeComplaintPhoto(input: { photoId: string; stats?: PhotoStats; description: string; room: RoomId }): AiResult {
  const sample = input.photoId.startsWith('sample:') ? SAMPLE_PHOTOS[input.photoId.slice(7)] : undefined;
  if (sample?.preset && 'category' in sample.preset) return sample.preset;
  const h = hashString(`${input.photoId}|${input.description.trim().toLowerCase()}`);
  const confidence = 70 + (h % 26);
  const area = { x: 0.15 + ((h >> 3) % 30) / 100, y: 0.12 + ((h >> 7) % 30) / 100, w: 0.32, h: 0.3 };
  const stats = input.stats ?? { brightness: 128, variance: 800 };
  if (stats.brightness < 45) return { verdict: 'unclear', category: 'lainnya', confidence: 40 + (h % 20), noteKey: 'ai.note.tooDark' };
  if (stats.variance < 120) return { verdict: 'invalid', category: 'lainnya', confidence, noteKey: 'ai.note.noDamage' };
  const text = input.description.toLowerCase();
  const hit = (w: string) => new RegExp(`(^|[^a-z])${w}`).test(text);
  const found = (Object.entries(CATEGORY_KEYWORDS) as [ComplaintCategory, string[]][]).find(([, words]) => words.some(hit));
  if (found) return { verdict: 'valid', category: found[0], confidence, noteKey: `ai.note.${found[0]}`, area };
  if (text.trim().length < 10) return { verdict: 'unclear', category: 'lainnya', confidence: 45 + (h % 20), noteKey: 'ai.note.describeMore' };
  return { verdict: 'valid', category: 'lainnya', confidence: Math.min(confidence, 80), noteKey: 'ai.note.lainnya', area };
}

export function checkFix(input: { beforePhotoId: string; afterPhotoId: string; afterHash?: string; beforeHash?: string }): Omit<FixCheck, 'at' | 'photoId'> {
  const sample = input.afterPhotoId.startsWith('sample:') ? SAMPLE_PHOTOS[input.afterPhotoId.slice(7)] : undefined;
  if (sample?.preset && !('category' in sample.preset)) return sample.preset;
  if (input.afterPhotoId === input.beforePhotoId || (input.afterHash && input.afterHash === input.beforeHash)) {
    return { verdict: 'notFixed', confidence: 97, noteKey: 'ai.fix.samePhoto' };
  }
  const h = hashString(`${input.beforePhotoId}|${input.afterPhotoId}`);
  return { verdict: 'fixed', confidence: 82 + (h % 15), noteKey: 'ai.fix.fixed' };
}

/** Fix check for a finding: compares the after-photo with the resident's photo by content, not by id. */
export function fixCheckFor(finding: { photoIds: string[]; photoHash?: string }, after: { id: string; hash?: string }) {
  const before = finding.photoIds[0];
  return checkFix({ beforePhotoId: before, afterPhotoId: after.id, afterHash: after.hash, beforeHash: finding.photoHash ?? String(hashString(before)) });
}
