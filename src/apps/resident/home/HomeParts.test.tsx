// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test } from 'vitest';
import type { ResidentIdentity } from '../../../domain/types';
import { startResidentSession } from '../../../store/actions';
import { useStore } from '../../../store/store';
import { HomeTopRow } from './HomeParts';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
});

const sos = async (identity: ResidentIdentity, unitId: string) => {
  useStore.getState().run(startResidentSession, { identity, unitId });
  const el = document.createElement('div');
  const root = createRoot(el);
  await act(async () => root.render(<MemoryRouter><HomeTopRow onSearch={() => undefined} /></MemoryRouter>));
  const found = [...el.querySelectorAll('button')].some((b) => b.textContent?.includes('SOS'));
  root.unmount();
  return found;
};

test('the SOS button only shows where the panic screen opens (never a dead end on subsidized projects)', async () => {
  expect(await sos({ kind: 'owner', customerId: 1107 }, 'vh-A1-07')).toBe(true); // commercial, moved in
  expect(await sos({ kind: 'owner', customerId: 1102 }, 'vh-B1-02')).toBe(true); // commercial, not moved in yet: the route allows it
  expect(await sos({ kind: 'owner', customerId: 2314 }, 'hp-C3-14')).toBe(false); // Harmoni Park has no panic feature
});
