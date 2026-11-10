// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, test } from 'vitest';
import { startResidentSession } from '../../../store/actions';
import { useStore } from '../../../store/store';
import { ToastProvider } from '../../../ui/Toast';
import RenovationDetail from './RenovationDetail';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
});

const render = async (path: string) => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(<MemoryRouter initialEntries={[path]}><ToastProvider><Routes><Route path="/app/renovation/:id" element={<RenovationDetail />} /></Routes></ToastProvider></MemoryRouter>);
  });
  return { el, root };
};

test("a resident cannot open another unit's renovation by URL", async () => {
  useStore.getState().run(startResidentSession, { identity: { kind: 'renter', renterId: 'r-1' }, unitId: 'vh-B2-04' });
  const { el, root } = await render('/app/renovation/REN-0031');
  expect(el.textContent).not.toContain('Kanopi depan');
  root.unmount();
});

test('the owner still sees renovations of their own unit, including the renter’s request', async () => {
  useStore.getState().run(startResidentSession, { identity: { kind: 'owner', customerId: 1204 }, unitId: 'vh-B2-04' });
  const { el, root } = await render('/app/renovation/REN-0040');
  expect(el.textContent).toContain('Pasang teralis jendela');
  root.unmount();
});
