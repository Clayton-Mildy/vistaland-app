import { produce } from 'immer';
import { create } from 'zustand';
import { buildSeed } from '../data/seed';
import type { AppData } from '../domain/types';
import { broadcast, clearSession, load, loadSession, save, saveSessionChanges, subscribe } from './persist';

export type Action<P> = (d: AppData, p: P) => void;
export type RunResult = { ok: true } | { ok: false; error: string };

interface StoreState {
  data: AppData;
  storageOk: boolean;
  run<P>(a: Action<P>, p: P): RunResult;
  reset(): void;
}

/** Shared data with this tab's own login (from this tab's session storage, else logged out). */
function withTabSession(data: AppData): AppData {
  const own = loadSession();
  return { ...data, session: { resident: own.resident, staff: own.staff, dashboard: own.dashboard ?? data.session.dashboard } };
}

function initial(): { data: AppData; storageOk: boolean } {
  const persisted = load();
  if (persisted) return { data: withTabSession(persisted), storageOk: true };
  const seed = buildSeed();
  return { data: withTabSession(seed), storageOk: save(seed) };
}

const errorKey = (e: unknown) =>
  e && typeof e === 'object' && 'key' in e && typeof (e as { key: unknown }).key === 'string' ? (e as { key: string }).key : null;

export const useStore = create<StoreState>((set, get) => ({
  ...initial(),
  run(action, payload) {
    // Read-latest-then-write: another tab may have saved a newer state.
    const persisted = load();
    const current = get().data;
    // Another tab's data is taken, never its login.
    const latest = persisted && persisted.version > current.version ? { ...persisted, session: current.session } : current;
    let next: AppData;
    try {
      next = produce(latest, (d) => {
        action(d as AppData, payload);
        d.version = latest.version + 1;
      });
    } catch (e) {
      const key = errorKey(e);
      if (!key) console.error(e);
      if (latest !== current) set({ data: latest });
      return { ok: false, error: key ?? 'error.generic' };
    }
    saveSessionChanges(latest.session, next.session);
    const storageOk = save(next);
    set({ data: next, storageOk });
    broadcast(next.version);
    return { ok: true };
  },
  reset() {
    clearSession();
    const seed = buildSeed();
    seed.version = Math.max(get().data.version, load()?.version ?? 0) + 1;
    const storageOk = save(seed);
    set({ data: seed, storageOk });
    broadcast(seed.version);
  },
}));

if (typeof window !== 'undefined') {
  subscribe(() => {
    const persisted = load();
    const current = useStore.getState().data;
    if (persisted && persisted.version > current.version) useStore.setState({ data: { ...persisted, session: current.session } });
  });
}
