import { formatDateTime } from '../../../domain/clock';
import { trackerIndex, TRACKER_STEPS } from '../../../domain/complaints';
import type { Finding } from '../../../domain/types';
import { useLang, useT } from '../../../i18n';
import { residentConfirm } from '../../../store/actions';
import { useData, useResident, useRun } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { EmptyState } from '../../../ui/EmptyState';
import { Moni } from '../../../ui/Moni';
import { Photo } from '../../../ui/Photo';
import { StatusPill } from '../../../ui/StatusPill';
import { Timeline } from '../../../ui/Timeline';
import { useToast } from '../../../ui/Toast';
import { BandSteps } from '../ui/BandSteps';
import { ScreenBody } from '../ui/ScreenBody';
import { ScreenHeader } from '../ui/ScreenHeader';

export default function ComplaintTracker() {
  const t = useT();
  const ctx = useResident()!;
  const complaint = useData((d) => d.complaints.find((c) => c.unitId === ctx.unit.id && c.submittedAt));
  if (!complaint) return <div><ScreenHeader title={t('complaint.track')} /><ScreenBody><Card><EmptyState title={t('tracker.none')} /></Card></ScreenBody></div>;
  const idx = trackerIndex(complaint);
  return (
    <div>
      <ScreenHeader
        title={t('tracker.title', { id: complaint.id })}
        eyebrow={t('tracker.overall')}
        figure={idx >= 7 ? t('complaint.allDone') : t(`complaint.step.${TRACKER_STEPS[Math.min(idx, 6)]}`)}
        sub={t('tracker.sub', { n: complaint.findings.length })}
      >
        <BandSteps className="mt-3" steps={TRACKER_STEPS.map((s) => t(`complaint.step.${s}`))} current={idx} />
      </ScreenHeader>
      <ScreenBody>
        {idx >= 7 && (
          <Card className="flex items-center gap-3 border-[#BDE5CB] bg-[#F2FBF5]">
            <Moni pose="thumbs" size={56} />
            <p className="text-sm font-semibold text-[#17703D]">{t('tracker.allDoneBody')}</p>
          </Card>
        )}
        {complaint.findings.map((f) => <FindingCard key={f.id} complaintId={complaint.id} f={f} />)}
      </ScreenBody>
    </div>
  );
}

function FindingCard({ complaintId, f }: { complaintId: string; f: Finding }) {
  const t = useT();
  const [lang] = useLang();
  const run = useRun();
  const toast = useToast();
  // The contractor's AI photo check is for the estate only. The resident just sees the after-photo
  // once the work has passed and is with the estate (or done).
  const afterPhoto = ['workDone', 'awaitingResident', 'done'].includes(f.stage) ? f.fixChecks.at(-1)?.photoId : undefined;
  const steps = ['submitted', 'verified', 'assigned', 'inProgress', 'workDone', 'awaitingResident', 'done'] as const;
  const at = (s: string) => f.history.find((h) => h.stage === s)?.at;
  const reached = (s: (typeof steps)[number]) => steps.indexOf(s) <= steps.indexOf(f.stage as (typeof steps)[number]);
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-semibold">{t(`room.${f.room}`)}</p>
          <p className="text-sm text-ink/60">{f.description}</p>
          <p className="mt-0.5 text-xs text-ink/45">{t(`category.${f.category}`)}</p>
        </div>
        <StatusPill tone={f.stage === 'done' ? 'success' : f.stage === 'rejected' ? 'danger' : f.stage === 'awaitingResident' ? 'warning' : 'info'}>{t(`stage.${f.stage}`)}</StatusPill>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-xs font-medium text-ink/45">{t('tracker.before')}</p>
          <Photo id={f.photoIds[0]} className="h-28 rounded-xl" />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-ink/45">{t('tracker.after')}</p>
          {afterPhoto ? <Photo id={afterPhoto} className="h-28 rounded-xl" /> : <div className="flex h-28 items-center justify-center rounded-xl border-2 border-dashed border-line px-3 text-center text-xs text-ink/40">{t('tracker.afterPending')}</div>}
        </div>
      </div>
      {f.estateNote && <p className="mt-2 rounded-xl bg-paper p-2.5 text-xs text-ink/65"><span className="font-semibold">{t('tracker.estateNote')}</span> {f.estateNote}</p>}
      {f.stage === 'rejected' ? null : (
        <Timeline
          className="mt-4"
          items={steps.map((s) => ({
            key: s,
            label: t(`tracker.stage.${s}`),
            meta: at(s) ? formatDateTime(at(s)!, lang) : undefined,
            state: f.stage === s ? (s === 'done' ? 'done' : 'current') : reached(s) ? 'done' : 'todo',
          }))}
        />
      )}
      {f.stage === 'awaitingResident' && (
        <Button className="mt-3" block onClick={() => { run(residentConfirm, { complaintId, findingId: f.id }); toast.show(t('tracker.confirmed')); }}>{t('tracker.confirm')}</Button>
      )}
    </Card>
  );
}
