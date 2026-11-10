// @vitest-environment jsdom
import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test } from 'vitest';
import { ToastProvider, useToast } from './Toast';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let runs = 0;
function ShowsOnce() {
  const toast = useToast();
  useEffect(() => {
    // Capped so an unstable context value fails the assertion instead of looping forever.
    if (runs++ < 5) toast.show('hello', 'info');
  }, [toast]);
  return null;
}

test('a component that shows a toast in an effect shows it once (stable context value)', async () => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(
      <ToastProvider>
        <ShowsOnce />
      </ToastProvider>,
    );
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });
  expect(el.textContent?.match(/hello/g)?.length).toBe(1);
  root.unmount();
});
