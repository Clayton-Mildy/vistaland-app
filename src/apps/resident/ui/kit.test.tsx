// @vitest-environment jsdom
import { Home } from 'lucide-react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, test } from 'vitest';
import { startResidentSession } from '../../../store/actions';
import { useStore } from '../../../store/store';
import { TONES } from '../../../ui/theme';
import { IconTile } from '../../../ui/IconTile';
import { ResidentShell } from '../ResidentShell';
import { ScreenHeader } from './ScreenHeader';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// jsdom has no scrolling; the shell scrolls to top on route change.
Element.prototype.scrollTo ??= () => undefined;

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
});

const render = async (node: React.ReactNode) => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => root.render(node));
  return { el, root };
};

test('ScreenHeader shows title, eyebrow and figure on the deep brand band, and its back button goes back', async () => {
  const { el, root } = await render(
    <MemoryRouter initialEntries={['/first', '/second']} initialIndex={1}>
      <Routes>
        <Route path="/first" element={<p>first page</p>} />
        <Route path="/second" element={<ScreenHeader title="Tagihan" eyebrow="IPL · A1/07" figure="Rp700.000" sub="tanpa denda" />} />
      </Routes>
    </MemoryRouter>,
  );
  const band = el.querySelector('.bg-brand-dark')!;
  expect(band).toBeTruthy();
  expect(band.textContent).toContain('Tagihan');
  expect(band.textContent).toContain('IPL · A1/07');
  expect(band.textContent).toContain('Rp700.000');
  await act(async () => (el.querySelector('button[aria-label]') as HTMLButtonElement).click());
  expect(el.textContent).toContain('first page');
  root.unmount();
});

test('IconTile uses one brand tint, never the rainbow tones', async () => {
  const { el, root } = await render(<IconTile icon={Home} label="Serah terima" />);
  const html = el.innerHTML;
  for (const tone of Object.values(TONES)) expect(html).not.toContain(tone);
  expect(html).toContain('bg-brand-tint');
  root.unmount();
});

test('"Developed by Vistaland" sits at the end of the page, not inside the bottom menu', async () => {
  useStore.getState().run(startResidentSession, { identity: { kind: 'owner', customerId: 1107 }, unitId: 'vh-A1-07' });
  const { el, root } = await render(
    <MemoryRouter initialEntries={['/app/home']}>
      <Routes>
        <Route path="/app" element={<ResidentShell />}>
          <Route path="home" element={<p>home</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  expect(el.querySelector('main#resident-scroll')!.textContent).toContain('Developed by');
  expect(el.querySelector('nav')!.textContent).not.toContain('Developed by');
  root.unmount();
});
