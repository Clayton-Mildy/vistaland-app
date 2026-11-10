// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test } from 'vitest';
import { Button } from './Button';
import { Card } from './Card';
import { UiFlavor } from './flavor';
import { DevelopedBy } from './Footer';
import { Section } from './Section';
import { StatusPill } from './StatusPill';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const render = async (node: React.ReactNode) => {
  const el = document.createElement('div');
  const root = createRoot(el);
  await act(async () => root.render(node));
  return el;
};
const parts = (
  <>
    <Button>Bayar</Button>
    <Card>isi</Card>
    <StatusPill>Lunas</StatusPill>
    <Section title="Judul">isi</Section>
    <DevelopedBy />
  </>
);

test('without a flavor the shared components look exactly as before (dashboard and staff app)', async () => {
  const el = await render(parts);
  expect(el.querySelector('button')!.className).toContain('bg-gradient-to-br from-brand to-brand-dark');
  expect(el.querySelector('button')!.className).toContain('rounded-xl');
  expect(el.querySelector('div')!.className).toBe('rounded-2xl border border-line/80 bg-white p-4 shadow-card');
  expect(el.querySelector('span')!.className).toContain('text-[11px] font-semibold');
  expect(el.querySelector('h2')!.className).toBe('text-[15px] font-bold');
  expect(el.querySelector('p')!.className).toBe('text-center text-[10px] text-ink/40');
});

test('under the premium flavor they take the customer-app look', async () => {
  const el = await render(<UiFlavor value="premium">{parts}</UiFlavor>);
  const btn = el.querySelector('button')!.className;
  expect(btn).toContain('rounded-full');
  expect(btn).toContain('bg-brand-dark');
  expect(btn).not.toContain('bg-gradient-to-br');
  expect(el.querySelector('span')!.className).toContain('text-xs');
  expect(el.querySelector('h2')!.className).toContain('text-base font-semibold');
  expect(el.querySelector('p')!.className).toContain('text-xs');
});
