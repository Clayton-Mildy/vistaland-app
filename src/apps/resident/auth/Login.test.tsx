// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { translate } from '../../../i18n';
import { useStore } from '../../../store/store';
import { ToastProvider } from '../../../ui/Toast';
import Login from './Login';

vi.mock('../../../domain/identity', () => ({ resolveResident: vi.fn(() => Promise.reject(new Error('VLES unreachable'))) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
});

test('when the purchase-record lookup fails, login shows an error instead of spinning forever', async () => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(<MemoryRouter><ToastProvider><Login /></ToastProvider></MemoryRouter>);
  });
  const [phone, ktp] = [...el.querySelectorAll('input')];
  const type = (input: HTMLInputElement, v: string) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, v);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  await act(async () => {
    type(phone, '0812 3456 0102');
    type(ktp, '3275014101900001');
  });
  await act(async () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await act(async () => { await Promise.resolve(); });
  expect(el.textContent).toContain(translate('id', 'login.error.service'));
  expect(el.querySelector('button[type=submit]')!.hasAttribute('disabled')).toBe(false);
  root.unmount();
});

test('demo accounts stay folded away until "Akun demo" is pressed, then fill the form in one tap', async () => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(<MemoryRouter><ToastProvider><Login /></ToastProvider></MemoryRouter>);
  });
  const rina = () => [...el.querySelectorAll('button')].find((b) => b.textContent?.startsWith('Rina'));
  expect(rina()).toBeUndefined();
  const toggle = [...el.querySelectorAll('button')].find((b) => b.textContent === translate('id', 'login.demoToggle'))!;
  await act(async () => toggle.click());
  await act(async () => rina()!.click());
  expect((el.querySelector('input') as HTMLInputElement).value).toBe('0812-3456-0102');
  root.unmount();
});
