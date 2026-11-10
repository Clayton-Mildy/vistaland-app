// @vitest-environment jsdom
import { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test } from 'vitest';
import { useStore } from '../../../store/store';
import { ToastProvider } from '../../../ui/Toast';
import Otp from './Otp';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
});

test('the demo SMS toast shows once, even under StrictMode', async () => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  const state = { identity: { kind: 'owner', customerId: 1102 }, unitIds: ['vh-B1-02'], phone: '081234560102' };
  await act(async () => {
    root.render(<StrictMode><MemoryRouter initialEntries={[{ pathname: '/app/otp', state }]}><ToastProvider><Otp /></ToastProvider></MemoryRouter></StrictMode>);
  });
  const sms = (document.body.textContent?.match(/SMS dari VHome/g) ?? []).length;
  expect(sms).toBe(1);
  root.unmount();
});
