// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test } from 'vitest';
import { pickHandoverSlot, sendHandoverCall, setToday, startResidentSession } from '../../../store/actions';
import { useStore } from '../../../store/store';
import { ToastProvider } from '../../../ui/Toast';
import Handover from './Handover';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
});

test('opening the handover screen marks the latest call as read for the estate', async () => {
  const { run } = useStore.getState();
  run(setToday, { date: '2026-11-17' });
  run(sendHandoverCall, { unitId: 'vh-C3-04' });
  const owner = useStore.getState().data.units.find((u) => u.id === 'vh-C3-04')!.ownerCustomerId!;
  run(startResidentSession, { identity: { kind: 'owner', customerId: owner }, unitId: 'vh-C3-04' });
  const call = () => useStore.getState().data.units.find((u) => u.id === 'vh-C3-04')!.handover.calls.at(-1)!;
  expect(call().n).toBe(2);
  expect(call().readAt).toBeUndefined();
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(<MemoryRouter><ToastProvider><Handover /></ToastProvider></MemoryRouter>);
  });
  expect(call().readAt).toBe('2026-11-17');
  root.unmount();
});

test('once a slot is booked, the "pick a slot within 7 days" call card goes away', async () => {
  const { run } = useStore.getState();
  run(pickHandoverSlot, { unitId: 'vh-C3-04', date: '2026-11-12', time: '09.00–10.00' });
  const owner = useStore.getState().data.units.find((u) => u.id === 'vh-C3-04')!.ownerCustomerId!;
  run(startResidentSession, { identity: { kind: 'owner', customerId: owner }, unitId: 'vh-C3-04' });
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(<MemoryRouter><ToastProvider><Handover /></ToastProvider></MemoryRouter>);
  });
  expect(el.textContent).not.toContain('Rumah Anda siap diserahterimakan');
  root.unmount();
});
