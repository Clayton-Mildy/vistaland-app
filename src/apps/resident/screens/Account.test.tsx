// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test } from 'vitest';
import { startResidentSession } from '../../../store/actions';
import { useStore } from '../../../store/store';
import { ToastProvider } from '../../../ui/Toast';
import Account from './Account';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
  useStore.getState().run(startResidentSession, { identity: { kind: 'owner', customerId: 1107 }, unitId: 'vh-A1-07' });
});

test('the account screen shows the product version, with no prototype label', async () => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(<MemoryRouter><ToastProvider><Account /></ToastProvider></MemoryRouter>);
  });
  expect(el.textContent).toContain('VHome · versi 1.0');
  expect(el.textContent?.toLowerCase()).not.toContain('prototype');
  root.unmount();
});
