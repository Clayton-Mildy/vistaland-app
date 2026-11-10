// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test } from 'vitest';
import { reviewRegistration, startResidentSession } from '../../../store/actions';
import { useStore } from '../../../store/store';
import { ToastProvider } from '../../../ui/Toast';
import RenterRegistrationWizard from './RenterRegistrationWizard';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
});

test("an owner cannot open another owner's registration through the fix link", async () => {
  const { run } = useStore.getState();
  const hendra = useStore.getState().data.registrations.find((r) => r.person.name === 'Hendra Kusuma')!;
  run(reviewRegistration, { id: hendra.id, decision: 'needsFix', note: 'Unggah AJB' });
  run(startResidentSession, { identity: { kind: 'owner', customerId: 1107 }, unitId: 'vh-A1-07' });
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(<MemoryRouter initialEntries={[`/app/renters/new?fix=${hendra.id}`]}><ToastProvider><RenterRegistrationWizard /></ToastProvider></MemoryRouter>);
  });
  const values = [...el.querySelectorAll('input')].map((i) => i.value).join(' ');
  expect(el.textContent + values).not.toContain('Hendra');
  root.unmount();
});
