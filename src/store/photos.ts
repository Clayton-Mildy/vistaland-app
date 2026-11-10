import { clear as idbClear, createStore, get as idbGet, set as idbSet, type UseStore } from 'idb-keyval';
import { useEffect, useState } from 'react';
import house1 from '../assets/houses/house-1.jpg';
import house2 from '../assets/houses/house-2.jpg';
import house3 from '../assets/houses/house-3.jpg';
import house4 from '../assets/houses/house-4.jpg';
import house5 from '../assets/houses/house-5.jpg';
import { SAMPLE_PHOTOS } from '../data/samples';
import { hashString, type PhotoStats } from '../domain/ai';

export const HOUSE_PHOTOS = [house1, house2, house3, house4, house5];
export interface SavedPhoto { id: string; hash: string; stats?: PhotoStats }

const memory = new Map<string, string>();
let idb: UseStore | null | undefined;
function store(): UseStore | null {
  if (idb === undefined) {
    try {
      idb = typeof indexedDB !== 'undefined' ? createStore('vhome-photos', 'photos') : null;
    } catch {
      idb = null;
    }
  }
  return idb;
}

const readAsDataURL = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });

/** Downscales to ≤ maxSide px JPEG and measures brightness/variance for the AI check. */
function downscale(src: string, maxSide: number): Promise<{ url: string; stats: PhotoStats }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const probe = document.createElement('canvas');
      probe.width = 48;
      probe.height = 48;
      const pctx = probe.getContext('2d')!;
      pctx.drawImage(canvas, 0, 0, 48, 48);
      const px = pctx.getImageData(0, 0, 48, 48).data;
      const lum: number[] = [];
      for (let i = 0; i < px.length; i += 4) lum.push(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
      const mean = lum.reduce((a, b) => a + b, 0) / lum.length;
      const variance = lum.reduce((a, b) => a + (b - mean) ** 2, 0) / lum.length;
      resolve({ url: canvas.toDataURL('image/jpeg', 0.8), stats: { brightness: Math.round(mean), variance: Math.round(variance) } });
    };
    img.onerror = () => resolve({ url: src, stats: { brightness: 128, variance: 800 } });
    img.src = src;
  });
}

export async function savePhoto(input: File | Blob | string): Promise<SavedPhoto> {
  const src = typeof input === 'string' ? input : await readAsDataURL(input);
  const { url, stats } = await downscale(src, 1000);
  const id = `idb:${crypto.randomUUID()}`;
  memory.set(id, url);
  const s = store();
  if (s) {
    try {
      await idbSet(id, url, s);
    } catch {
      /* storage unavailable: keep the photo in memory for this tab */
    }
  }
  return { id, hash: String(hashString(url)), stats };
}

/** Resolves sample:, house: and idb: ids without touching storage. */
export function staticPhotoUrl(id: string): string | undefined {
  if (id.startsWith('sample:')) {
    const s = SAMPLE_PHOTOS[id.slice(7)];
    return s ? `/samples/${s.file}` : undefined;
  }
  if (id.startsWith('house:')) return HOUSE_PHOTOS[(Number(id.slice(6)) - 1) % HOUSE_PHOTOS.length];
  return memory.get(id);
}

export function usePhotoUrl(id?: string): string | undefined {
  const [url, setUrl] = useState<string | undefined>(() => (id ? staticPhotoUrl(id) : undefined));
  useEffect(() => {
    if (!id) return setUrl(undefined);
    const known = staticPhotoUrl(id);
    if (known) return setUrl(known);
    let alive = true;
    const s = store();
    if (s) {
      idbGet<string>(id, s)
        .then((v) => {
          if (v) memory.set(id, v);
          if (alive) setUrl(v);
        })
        .catch(() => alive && setUrl(undefined));
    }
    return () => {
      alive = false;
    };
  }, [id]);
  return url;
}

export async function clearPhotos() {
  memory.clear();
  const s = store();
  if (s) await idbClear(s).catch(() => undefined);
}
