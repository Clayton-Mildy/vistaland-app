// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { startResidentSession } from '../../../store/actions';
import { useStore } from '../../../store/store';
import { ToastProvider } from '../../../ui/Toast';
import Emergency from './Emergency';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  useStore.getState().reset();
  useStore.getState().run(startResidentSession, { identity: { kind: 'owner', customerId: 1107 }, unitId: 'vh-A1-07' });
});
afterEach(() => vi.useRealTimers());

test('pressing panic sends exactly one signal after the 5-second countdown', async () => {
  const before = useStore.getState().data.panics.length;
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(<MemoryRouter><ToastProvider><Emergency /></ToastProvider></MemoryRouter>);
  });
  const panicBtn = [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('PANIK'))!;
  await act(async () => panicBtn.click());
  for (let i = 0; i < 7; i++) {
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
  }
  expect(useStore.getState().data.panics.length - before).toBe(1);
  root.unmount();
});
