import type { AppData, Session } from '../domain/types';

export const STORAGE_KEY = 'vhome.data.v1';
export const CHANNEL = 'vhome-sync';
/** Logins live per browser tab, so two tabs can be two different people. */
export const SESSION_KEY = 'vhome.session.v1';

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

const SESSION_PARTS = ['resident', 'staff', 'dashboard'] as const;

export function loadSession(): Partial<Session> {
  try {
    const raw = globalThis.sessionStorage?.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Partial<Session>) : {};
  } catch {
    return {};
  }
}

/**
 * Writes only the parts of the login this frame changed. The demo view runs the phone and the
 * dashboard as two frames in one tab, sharing this storage, so neither may overwrite the other's part.
 */
export function saveSessionChanges(prev: Session, next: Session) {
  try {
    const changed = SESSION_PARTS.filter((k) => JSON.stringify(prev[k]) !== JSON.stringify(next[k]));
    if (!changed.length) return;
    const stored = loadSession() as Record<string, unknown>;
    for (const k of changed) {
      if (next[k] === undefined) delete stored[k];
      else stored[k] = next[k];
    }
    globalThis.sessionStorage.setItem(SESSION_KEY, JSON.stringify(stored));
  } catch {
    /* storage unavailable: the login stays in memory */
  }
}

export function clearSession() {
  try {
    globalThis.sessionStorage?.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
