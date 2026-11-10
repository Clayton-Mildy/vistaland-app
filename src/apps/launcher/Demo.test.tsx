// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { translate } from '../../i18n';
import { useStore } from '../../store/store';
import { ToastProvider } from '../../ui/Toast';
import { Demo } from './Demo';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const t = (key: string) => translate('id', key);

/** Pretend the screen is phone-sized (below 768px) or laptop-sized. */
const screen = (phone: boolean) =>
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: phone && q.includes('max-width'), media: q, addEventListener: () => undefined, removeEventListener: () => undefined }));

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
  screen(false);
});
afterEach(() => vi.unstubAllGlobals());

const render = async (path = '/demo') => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(<MemoryRouter initialEntries={[path]}><ToastProvider><Routes><Route path="/demo" element={<Demo />} /></Routes></ToastProvider></MemoryRouter>);
  });
  return { el, root };
};
const pane = (el: Element, title: string) => el.querySelector(`iframe[title=${title}]`)?.closest('[data-pane]') as HTMLElement | null;
const button = (el: Element, label: string) => [...el.querySelectorAll('button')].find((x) => x.textContent === label || x.getAttribute('aria-label') === label);
const click = async (el: Element, label: string) => {
  const b = button(el, label);
  if (!b) throw new Error(`no button ${label}`);
  await act(async () => b.click());
};

test('on a laptop the demo controls switch between side by side, app and dashboard, keeping both screens loaded', async () => {
  const { el, root } = await render();
  expect(pane(el, 'phone')!.hidden).toBe(false);
  expect(pane(el, 'dashboard')!.hidden).toBe(false);

  await click(el, t('demo.tweaksOpen'));
  await click(el, t('demo.view.dashboard'));
  expect(pane(el, 'phone')!.hidden).toBe(true);
  // The dashboard covers the whole screen, and the demo controls stay on top of it.
  expect(pane(el, 'dashboard')!.dataset.full).toBe('true');
  expect(el.querySelector('button[aria-expanded]')).toBeTruthy();
  expect(button(el, t('demo.reset'))).toBeTruthy();

  await click(el, t('demo.view.phone'));
  expect(pane(el, 'phone')!.hidden).toBe(false);
  expect(pane(el, 'dashboard')!.hidden).toBe(true);

  // Both iframes stay in the page, so logins and scroll positions survive the switch.
  expect(el.querySelectorAll('iframe')).toHaveLength(2);
  root.unmount();
});

test('the chosen view comes from the link, so a reload keeps it', async () => {
  const { el, root } = await render('/demo?view=dashboard');
  expect(pane(el, 'phone')!.hidden).toBe(true);
  expect(pane(el, 'dashboard')!.dataset.full).toBe('true');
  root.unmount();
});

test('on a phone the demo opens only the customer app, with the demo controls behind a button', async () => {
  screen(true);
  const { el, root } = await render('/demo?view=dashboard');
  const frames = [...el.querySelectorAll('iframe')];
  expect(frames).toHaveLength(1);
  expect(frames[0].getAttribute('src')).toBe('/app');
  expect(button(el, t('demo.reset'))).toBeFalsy();

  await click(el, t('demo.tweaksOpen'));
  expect(button(el, t('demo.reset'))).toBeTruthy();
  // No view switch or staff app on a phone: it is the customer app only.
  expect(button(el, t('demo.view.dashboard'))).toBeFalsy();
  expect(button(el, t('demo.staff'))).toBeFalsy();
  root.unmount();
});
