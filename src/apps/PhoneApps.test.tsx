// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, test } from 'vitest';
import { translate as t } from '../i18n';
import { useStore } from '../store/store';
import { ToastProvider } from '../ui/Toast';
import ResidentApp from './resident/routes';
import StaffApp from './staff/routes';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
});

const render = async (path: string, app: React.ReactNode, base: string) => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(<MemoryRouter initialEntries={[path]}><ToastProvider><Routes><Route path={`${base}/*`} element={app} /></Routes></ToastProvider></MemoryRouter>);
  });
  return { el, root };
};

test.each([
  ['/app/login', <ResidentApp key="r" />, '/app'],
  ['/staff', <StaffApp key="s" />, '/staff'],
])('%s has the demo bar beside the phone and shows the storage notice inside it', async (path, app, base) => {
  useStore.setState({ storageOk: false });
  const { el, root } = await render(path, app, base);
  expect(el.textContent).toContain(t('id', 'demo.reset'));
  const notices = (el.textContent!.match(new RegExp(t('id', 'common.storageOff'), 'g')) ?? []).length;
  expect(notices).toBeGreaterThanOrEqual(2); // in the side bar and inside the phone screen
  root.unmount();
});
