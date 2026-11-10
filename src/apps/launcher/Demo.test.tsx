// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, test } from 'vitest';
import { translate } from '../../i18n';
import { useStore } from '../../store/store';
import { ToastProvider } from '../../ui/Toast';
import { Demo } from './Demo';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
});

const render = async (path = '/demo') => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(<MemoryRouter initialEntries={[path]}><ToastProvider><Routes><Route path="/demo" element={<Demo />} /></Routes></ToastProvider></MemoryRouter>);
  });
  return { el, root };
};
const pane = (el: Element, title: string) => el.querySelector(`iframe[title=${title}]`)!.closest('[data-pane]') as HTMLElement;
const click = async (el: Element, label: string) => {
  const b = [...el.querySelectorAll('button')].find((x) => x.textContent === label)!;
  await act(async () => b.click());
};

test('the demo switches between side by side, phone only and dashboard only, keeping both screens loaded', async () => {
  const { el, root } = await render();
  expect(pane(el, 'phone').hidden).toBe(false);
  expect(pane(el, 'dashboard').hidden).toBe(false);

  await click(el, translate('id', 'demo.view.dashboard'));
  expect(pane(el, 'phone').hidden).toBe(true);
  expect(pane(el, 'dashboard').hidden).toBe(false);

  await click(el, translate('id', 'demo.view.phone'));
  expect(pane(el, 'phone').hidden).toBe(false);
  expect(pane(el, 'dashboard').hidden).toBe(true);

  // Both iframes stay in the page, so logins and scroll positions survive the switch.
  expect(el.querySelectorAll('iframe')).toHaveLength(2);
  root.unmount();
});

test('the chosen view comes from the link, so a reload keeps it', async () => {
  const { el, root } = await render('/demo?view=dashboard');
  expect(pane(el, 'phone').hidden).toBe(true);
  expect(pane(el, 'dashboard').hidden).toBe(false);
  root.unmount();
});
