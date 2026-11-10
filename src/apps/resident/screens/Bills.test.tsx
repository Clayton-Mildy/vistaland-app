// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test } from 'vitest';
import { applyConsequence, liftConsequence, startResidentSession } from '../../../store/actions';
import { useStore } from '../../../store/store';
import { ToastProvider } from '../../../ui/Toast';
import Bills from './Bills';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
  useStore.getState().run(startResidentSession, { identity: { kind: 'owner', customerId: 1107 }, unitId: 'vh-A1-07' });
});

const render = async () => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(<MemoryRouter><ToastProvider><Bills /></ToastProvider></MemoryRouter>);
  });
  return { el, root };
};

test('the owner sees an active consequence on the bills screen, and it disappears once restored', async () => {
  const { run } = useStore.getState();
  run(applyConsequence, { unitId: 'vh-A1-07', type: 'cardSuspended', by: 'Admin Estate' });
  const { el, root } = await render();
  expect(el.textContent).toContain('Kartu akses dinonaktifkan sejak 10 Nov 2026');
  const id = useStore.getState().data.units.find((u) => u.id === 'vh-A1-07')!.consequences[0].id;
  await act(async () => {
    run(liftConsequence, { unitId: 'vh-A1-07', consequenceId: id, by: 'Admin Estate' });
  });
  expect(el.textContent).not.toContain('Kartu akses dinonaktifkan');
  root.unmount();
});
