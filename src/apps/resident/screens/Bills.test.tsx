// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test } from 'vitest';
import { applyConsequence, liftConsequence, startResidentSession } from '../../../store/actions';
import { useStore } from '../../../store/store';
import { ToastProvider } from '../../../ui/Toast';
import Bills from './Bills';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
  useStore.getState().run(startResidentSession, { identity: { kind: 'owner', customerId: 1107 }, unitId: 'vh-A1-07' });
});

const render = async () => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(<MemoryRouter><ToastProvider><Bills /></ToastProvider></MemoryRouter>);
  });
  return { el, root };
};

test('the owner sees an active consequence on the bills screen, and it disappears once restored', async () => {
  const { run } = useStore.getState();
  run(applyConsequence, { unitId: 'vh-A1-07', type: 'cardSuspended', by: 'Admin Estate' });
  const { el, root } = await render();
  expect(el.textContent).toContain('Kartu akses dinonaktifkan sejak 10 Nov 2026');
  const id = useStore.getState().data.units.find((u) => u.id === 'vh-A1-07')!.consequences[0].id;
  await act(async () => {
    run(liftConsequence, { unitId: 'vh-A1-07', consequenceId: id, by: 'Admin Estate' });
  });
  expect(el.textContent).not.toContain('Kartu akses dinonaktifkan');
  root.unmount();
});

test('a renter only sees, and is only asked to pay, the months billed to them', async () => {
  const { run } = useStore.getState();
  // Sari's lease now starts in August, so July is the owner's month, and it is unpaid.
  run((d) => {
    d.renters.find((r) => r.id === 'r-1')!.lease.start = '2026-08-01';
    d.payments = d.payments.filter((x) => !(x.unitId === 'vh-B2-04' && x.months?.includes('2026-07')));
    const jul = d.bills.find((b) => b.unitId === 'vh-B2-04' && b.kind === 'ipl' && b.month === '2026-07')!;
    jul.payer = 'owner';
    jul.paymentId = undefined;
  }, {});
  run(startResidentSession, { identity: { kind: 'renter', renterId: 'r-1' }, unitId: 'vh-B2-04' });
  const { el, root } = await render();
  expect(el.textContent).not.toContain('Jul 2026');
  expect(el.textContent).not.toContain('tertunggak');
  root.unmount();
});
