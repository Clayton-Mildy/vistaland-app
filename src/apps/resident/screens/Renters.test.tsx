// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test } from 'vitest';
import { startResidentSession } from '../../../store/actions';
import { useStore } from '../../../store/store';
import { UiFlavor } from '../../../ui/flavor';
import { ToastProvider } from '../../../ui/Toast';
import Renters from './Renters';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
});

test('with registrations but no active renter, the first thing over the title band is a card, not bare text', async () => {
  const owner = useStore.getState().data.units.find((u) => u.id === 'vh-A2-05')!.ownerCustomerId!;
  useStore.getState().run(startResidentSession, { identity: { kind: 'owner', customerId: owner }, unitId: 'vh-A2-05' });
  const el = document.createElement('div');
  const root = createRoot(el);
  await act(async () => root.render(<MemoryRouter><ToastProvider><UiFlavor value="premium"><Renters /></UiFlavor></ToastProvider></MemoryRouter>));
  expect(el.textContent).toContain('Lukas Wibowo');
  const first = el.querySelector('header + div')!.firstElementChild!;
  expect(first.className).toContain('bg-white');
  root.unmount();
});
