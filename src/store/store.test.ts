// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { activateApp } from './actions/session';
import { setToday } from './actions/demo';
import { nextId } from './ids';
import { load, save } from './persist';
import { useStore } from './store';
import { billStatus } from '../domain/ipl';
import { buildSeed } from '../data/seed';

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  useStore.getState().reset();
});

describe('store.run', () => {
  test('applies an action, persists it and notifies the estate admin', () => {
    const res = useStore.getState().run(activateApp, { unitId: 'vh-B1-02' });
    expect(res).toEqual({ ok: true });
    const d = useStore.getState().data;
    expect(d.units.find((u) => u.id === 'vh-B1-02')!.appActivatedAt).toBe('2026-11-10');
    expect(d.notifications.some((n) => n.to === 'admin:vh' && n.text.key === 'notif.admin.appActivated')).toBe(true);
    expect(load()!.version).toBe(d.version);
  });
  test('builds on the newest state another tab saved (Review Focus #3)', () => {
    const before = useStore.getState().data;
    save({ ...before, version: before.version + 1, seq: { ...before.seq, KMP: 999 } });
    useStore.getState().run(activateApp, { unitId: 'vh-B1-02' });
    const d = useStore.getState().data;
    expect(d.seq.KMP).toBe(999);
    expect(d.units.find((u) => u.id === 'vh-B1-02')!.appActivatedAt).toBe('2026-11-10');
  });
  test('keeps working in memory when storage throws (Review Focus #5)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    const res = useStore.getState().run(activateApp, { unitId: 'vh-B1-02' });
    expect(res.ok).toBe(true);
    expect(useStore.getState().data.units.find((u) => u.id === 'vh-B1-02')!.appActivatedAt).toBe('2026-11-10');
    expect(useStore.getState().storageOk).toBe(false);
  });
  test('ActionError keys come back as errors and leave state unchanged', () => {
    const before = useStore.getState().data;
    const res = useStore.getState().run(() => {
      throw new (class extends Error { key = 'error.windowClosed'; })();
    }, {});
    expect(res).toEqual({ ok: false, error: 'error.windowClosed' });
    expect(useStore.getState().data).toBe(before);
  });
});

describe('demo clock', () => {
  test('moving the date re-evaluates bills', () => {
    useStore.getState().run(setToday, { date: '2026-12-11' });
    const d = useStore.getState().data;
    const nov = d.bills.find((b) => b.unitId === 'vh-A1-07' && b.kind === 'ipl' && b.month === '2026-11')!;
    expect(billStatus(nov, d.today, 10)).toBe('overdue');
  });
});

test('nextId continues after the seeded ids', () => {
  const d = structuredClone(buildSeed());
  expect(nextId(d, 'KMP')).toBe('KMP-0148');
  expect(nextId(d, 'KMP')).toBe('KMP-0149');
});
