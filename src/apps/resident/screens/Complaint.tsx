import { ChevronRight, Phone, ShieldAlert, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../../domain/clock';
import { trackerIndex, TRACKER_STEPS } from '../../../domain/complaints';
import type { RoomId } from '../../../domain/types';
import { useLang, useT } from '../../../i18n';
import { removeFinding, submitComplaint } from '../../../store/actions';
import { useData, useResident, useRun } from '../../../store/hooks';
import { AppBar } from '../../../ui/AppBar';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Moni } from '../../../ui/Moni';
import { Photo } from '../../../ui/Photo';
import { Progress } from '../../../ui/Progress';
import { Sheet } from '../../../ui/Sheet';
import { StatusPill } from '../../../ui/StatusPill';
import { Stepper } from '../../../ui/Stepper';
import { useToast } from '../../../ui/Toast';
import { FloorPlan } from '../FloorPlan';
import { useComplaintWindowState } from '../hooks';

export default function Complaint() {
  const t = useT();
  const [lang] = useLang();
  const nav = useNavigate();
  const run = useRun();
  const toast = useToast();
  const ctx = useResident()!;
  const win = useComplaintWindowState();
  const complaint = useData((d) => d.complaints.find((c) => c.unitId === ctx.unit.id));
  const [confirm, setConfirm] = useState(false);
  const bast = ctx.unit.handover.bastDate!;
  const days = ctx.settings.complaints.windowDays;
  const drafts = complaint && !complaint.submittedAt ? complaint.findings : [];
  const counts = drafts.reduce<Partial<Record<RoomId, number>>>((acc, f) => ({ ...acc, [f.room]: (acc[f.room] ?? 0) + 1 }), {});

  const windowCard = (
    <Card>
      <div className="flex items-baseline justify-between">
        <span className="font-semibold">{t('complaint.window')}</span>
        <span className={win.status === 'open' ? 'text-xl font-extrabold text-[#D2611B]' : 'text-sm font-bold text-ink/50'}>{win.status === 'open' ? t('home.daysLeft', { n: win.daysLeft }) : t('home.windowClosed')}</span>
      </div>
      <Progress className="mt-2" tone={win.status === 'open' ? 'warning' : 'danger'} value={win.elapsedPct} />
      <p className="mt-2 text-xs text-ink/50">{t('complaint.windowNote', { n: days, date: formatDate(bast, lang) })}</p>
    </Card>
  );

  if (win.status === 'closed' && !complaint?.submittedAt) {
    return (
      <div>
        <AppBar title={t('feature.complaint')} />
        <div className="flex flex-col items-center px-8 pt-10 text-center">
          <Moni pose="crossed" size={120} />
          <h2 className="mt-4 text-xl font-bold">{t('complaint.closedTitle')}</h2>
          <p className="mt-2 text-sm text-ink/60">{t('complaint.closedBody', { n: days, date: formatDate(bast, lang), end: formatDate(win.endsOn!, lang) })}</p>
          <a href="tel:02188901200" className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white"><Phone className="h-4 w-4" />{t('complaint.contactEstate')}</a>
          <p className="mt-4 text-xs text-ink/45">{t('complaint.closedHint')}</p>
        </div>
      </div>
    );
  }

  if (complaint?.submittedAt) {
    const idx = trackerIndex(complaint);
    return (
      <div>
        <AppBar title={t('feature.complaint')} />
        <div className="space-y-3 p-4">
          {windowCard}
          <div className="rounded-2xl bg-gradient-to-br from-brand to-brand-dark p-4 text-white">
            <p className="text-xs text-white/75">{t('complaint.summaryLine', { id: complaint.id, n: complaint.findings.length, date: formatDate(complaint.submittedAt.slice(0, 10), lang) })}</p>
            <p className="mt-1 text-xl font-extrabold">{idx >= 7 ? t('complaint.allDone') : t(`complaint.step.${TRACKER_STEPS[Math.min(idx, 6)]}`)}</p>
            <div className="mt-3 [&_.bg-brand]:!bg-white [&_span]:!text-white/80">
              <Stepper compact steps={TRACKER_STEPS.map((s) => t(`complaint.step.${s}`))} current={idx} />
            </div>
          </div>
          <Card className="divide-y divide-line p-0">
            {complaint.findings.map((f) => (
              <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                <Photo id={f.photoIds[0]} className="h-12 w-12 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{t(`room.${f.room}`)} · {f.description}</p>
                  <p className="text-[11px] text-ink/45">{t(`category.${f.category}`)}</p>
                </div>
                <StatusPill tone={f.stage === 'done' ? 'success' : f.stage === 'rejected' ? 'danger' : f.stage === 'awaitingResident' ? 'warning' : 'info'}>{t(`stage.${f.stage}`)}</StatusPill>
              </div>
            ))}
          </Card>
          <Button block size="lg" onClick={() => nav('/app/complaint/track')}>{t('complaint.track')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AppBar title={t('feature.complaint')} />
      <div className="space-y-3 p-4">
        {windowCard}
        <div className="flex items-start gap-3 rounded-2xl border border-brand/20 bg-brand-tint/50 p-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
          <p className="text-xs text-brand-dark">{t('complaint.aiIntro')}</p>
        </div>
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <span className="font-bold">{t('complaint.tapRoom')}</span>
            <span className="text-xs text-ink/45">{ctx.type.name}</span>
          </div>
          <FloorPlan typeId={ctx.type.id} counts={counts} onPick={(room) => nav(`/app/complaint/new/${room}`)} />
        </Card>
        {drafts.length > 0 && (
          <>
            <h3 className="px-1 pt-1 text-[15px] font-bold">{t('complaint.yourFindings', { n: drafts.length })}</h3>
            <Card className="divide-y divide-line p-0">
              {drafts.map((f) => (
                <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                  <Photo id={f.photoIds[0]} className="h-14 w-14 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm"><b>{t(`room.${f.room}`)}</b> · {f.description || t('complaint.noDesc')}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <StatusPill tone="brand">{t(`category.${f.category}`)}</StatusPill>
                      {f.manualReview ? <StatusPill tone="warning"><ShieldAlert className="h-3 w-3" />{t('complaint.manual')}</StatusPill> : <StatusPill tone="success">AI {f.ai.confidence}%</StatusPill>}
                    </div>
                  </div>
                  <button onClick={() => run(removeFinding, { unitId: ctx.unit.id, findingId: f.id })} className="rounded-full p-2 text-ink/35 hover:bg-paper hover:text-[#B4192A]" aria-label={t('common.delete')}><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </Card>
            <Button block size="lg" onClick={() => setConfirm(true)}>{t('complaint.send', { n: drafts.length })}</Button>
          </>
        )}
        <button onClick={() => nav('/app/handover')} className="flex w-full items-center justify-between px-1 text-xs font-semibold text-ink/50">{t('complaint.bastLink')}<ChevronRight className="h-4 w-4" /></button>
      </div>
      <Sheet open={confirm} onClose={() => setConfirm(false)} title={t('complaint.confirmTitle')}>
        <p className="text-sm text-ink/60">{t('complaint.confirmBody', { n: drafts.length })}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setConfirm(false)}>{t('complaint.addMore')}</Button>
          <Button onClick={() => { const r = run(submitComplaint, { unitId: ctx.unit.id }); setConfirm(false); if (!r.ok) return toast.show(t(r.error), 'error'); toast.show(t('complaint.sent')); nav('/app/complaint/track'); }}>{t('complaint.sendNow')}</Button>
        </div>
      </Sheet>
    </div>
  );
}
