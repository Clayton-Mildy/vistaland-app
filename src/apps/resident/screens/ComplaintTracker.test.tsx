// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test } from 'vitest';
import { analyzeComplaintPhoto } from '../../../domain/ai';
import { addFinding, createWorkGroup, estateVerifyFinding, startResidentSession, submitAfterPhoto, submitComplaint } from '../../../store/actions';
import { useStore } from '../../../store/store';
import { translate } from '../../../i18n';
import { ToastProvider } from '../../../ui/Toast';
import ComplaintTracker from './ComplaintTracker';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
});

const render = async () => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(<MemoryRouter><ToastProvider><ComplaintTracker /></ToastProvider></MemoryRouter>);
  });
  return { el, root };
};

/** Matches any mention of the contractor's AI photo check on the resident side. */
const AI = /\bAI\b/;
/** Page text with a space between text nodes, so words from separate elements don't run together. */
const words = (el: Element) => {
  const out: string[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) out.push(walker.currentNode.textContent ?? '');
  return out.join(' ');
};

test("the resident never sees the AI check of the contractor's after-photo", async () => {
  const { run } = useStore.getState();
  run(addFinding, { unitId: 'hp-C3-14', room: 'kamar2', photoIds: ['sample:DAMP'], description: 'Rembes', ai: analyzeComplaintPhoto({ photoId: 'sample:DAMP', description: '', room: 'kamar2' }), manualReview: false });
  run(submitComplaint, { unitId: 'hp-C3-14' });
  const c = () => useStore.getState().data.complaints.find((x) => x.unitId === 'hp-C3-14')!;
  const ref = { complaintId: c().id, findingId: c().findings[0].id };
  run(estateVerifyFinding, ref);
  run(createWorkGroup, { projectId: 'hp', refs: [ref], material: 'Cat anti bocor', estimateDays: 2, mandorId: 'st-mandor' });
  run(startResidentSession, { identity: { kind: 'owner', customerId: 2314 }, unitId: 'hp-C3-14' });

  // A failed after-photo: the resident sees neither the verdict nor the rejected photo.
  run(submitAfterPhoto, { ...ref, photoId: 'sample:DAMP_NOTFIXED', check: { verdict: 'notFixed', confidence: 86, noteKey: 'ai.fix.stillVisible' } });
  let r = await render();
  expect(words(r.el)).not.toMatch(AI);
  expect(r.el.textContent).not.toContain('86%');
  expect(r.el.querySelectorAll('img[src*="damp-notfixed"], img[src*="DAMP_NOTFIXED"]').length).toBe(0);
  r.root.unmount();

  // A passed after-photo: the photo appears, still with no AI verdict or AI wording.
  run(submitAfterPhoto, { ...ref, photoId: 'sample:DAMP_FIXED', check: { verdict: 'fixed', confidence: 93, noteKey: 'ai.fix.fixed' } });
  r = await render();
  expect(words(r.el)).not.toMatch(AI);
  expect(r.el.textContent).not.toContain('93%');
  r.root.unmount();
});

test('the "work finished" notification to the resident does not mention the AI check', () => {
  const { run } = useStore.getState();
  run(addFinding, { unitId: 'hp-C3-14', room: 'kamar2', photoIds: ['sample:DAMP'], description: 'Rembes', ai: analyzeComplaintPhoto({ photoId: 'sample:DAMP', description: '', room: 'kamar2' }), manualReview: false });
  run(submitComplaint, { unitId: 'hp-C3-14' });
  const c = useStore.getState().data.complaints.find((x) => x.unitId === 'hp-C3-14')!;
  const ref = { complaintId: c.id, findingId: c.findings[0].id };
  run(estateVerifyFinding, ref);
  run(createWorkGroup, { projectId: 'hp', refs: [ref], material: 'Cat', estimateDays: 1, mandorId: 'st-mandor' });
  run(submitAfterPhoto, { ...ref, photoId: 'sample:DAMP_FIXED', check: { verdict: 'fixed', confidence: 93, noteKey: 'ai.fix.fixed' } });
  const n = useStore.getState().data.notifications.find((x) => x.to === 'owner:2314' && x.text.key === 'notif.complaint.workDone')!;
  for (const lang of ['id', 'en'] as const) expect(translate(lang, n.text.key, n.text.params)).not.toMatch(AI);
});
