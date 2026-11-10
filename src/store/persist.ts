import type { AppData } from '../domain/types';

export const STORAGE_KEY = 'vhome.data.v1';
export const CHANNEL = 'vhome-sync';

export function load(): AppData | null {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as AppData;
    return Array.isArray(d?.units) && typeof d.version === 'number' ? d : null;
  } catch {
    return null;
  }
}

/** Returns false when storage is unavailable (private mode, quota). */
export function save(d: AppData): boolean {
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}

let channel: BroadcastChannel | null | undefined;
function getChannel() {
  if (channel === undefined) channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;
  return channel;
}
export function broadcast(version: number) {
  try {
    getChannel()?.postMessage({ type: 'update', version });
  } catch {
    /* ignore */
  }
}
/** Calls back whenever another tab saved a newer state. */
export function subscribe(cb: () => void): () => void {
  const ch = getChannel();
  const onMsg = () => cb();
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  ch?.addEventListener('message', onMsg);
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    ch?.removeEventListener('message', onMsg);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}
