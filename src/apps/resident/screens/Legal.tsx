import { Download, FileCheck2 } from 'lucide-react';
import { useState } from 'react';
import { addDays, formatDate, weekday } from '../../../domain/clock';
import type { LegalDoc } from '../../../domain/types';
import { useLang, useT } from '../../../i18n';
import { schedulePbbPickup } from '../../../store/actions';
import { useResident, useRun, useToday } from '../../../store/hooks';
import { AppBar } from '../../../ui/AppBar';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { EmptyState } from '../../../ui/EmptyState';
import { StatusPill, type PillTone } from '../../../ui/StatusPill';
import { Timeline } from '../../../ui/Timeline';
import { useToast } from '../../../ui/Toast';

const TONE: Record<LegalDoc['status'], PillTone> = { process: 'warning', atBank: 'info', ready: 'gold', withCustomer: 'success' };

export default function Legal() {
  const t = useT();
  const [lang] = useLang();
  const run = useRun();
  const toast = useToast();
  const today = useToday();
  const ctx = useResident()!;
  const legal = ctx.unit.legal;
  const [pick, setPick] = useState<string | null>(null);
  if (!legal) return <div><AppBar title={t('feature.legal')} /><EmptyState title={t('legal.none')} /></div>;
  const days: string[] = [];
  for (let d = addDays(today, 1); days.length < 3; d = addDays(d, 1)) if (weekday(d) !== 0) days.push(d);
  const docs: { key: 'certificate' | 'pbg' | 'pbb'; doc: LegalDoc }[] = [{ key: 'certificate', doc: legal.certificate }, { key: 'pbg', doc: legal.pbg }, { key: 'pbb', doc: legal.pbb }];
  return (
    <div>
      <AppBar title={t('feature.legal')} subtitle={`${ctx.unit.code} · ${legal.scheme}${legal.bank ? ` · ${legal.bank}` : ''}`} />
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-3 gap-2">
          {docs.map(({ key, doc }) => (
            <div key={key} className="rounded-2xl border border-line bg-white p-2.5">
              <p className="text-[11px] text-ink/50">{t(`legal.${key}.short`)}</p>
              <StatusPill tone={TONE[doc.status]} className="mt-1">{t(`legal.status.${doc.status}`)}</StatusPill>
            </div>
          ))}
        </div>
        {docs.map(({ key, doc }) => (
          <Card key={key}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="flex items-center gap-2 font-bold"><FileCheck2 className="h-4 w-4 text-brand" />{t(`legal.${key}.title`)}</p>
                <p className="text-xs text-ink/50">{doc.number ?? t('legal.numberPending')}</p>
              </div>
              <StatusPill tone={TONE[doc.status]}>{t(`legal.status.${doc.status}`)}</StatusPill>
            </div>
            <Timeline className="mt-3" items={doc.steps.map((s, i) => ({ key: `${s.key}${i}`, label: t(`legal.step.${s.key}`, { bank: legal.bank ?? '' }), meta: s.date ? formatDate(s.date, lang) : undefined, state: s.date ? 'done' : 'current' }))} />
            <p className="mt-2 rounded-xl bg-paper p-2.5 text-xs text-ink/55">{t(`legal.note.${key}.${doc.status}`, { bank: legal.bank ?? '' })}</p>
            {key === 'pbb' && doc.status === 'ready' && (
              legal.pbb.pickup ? (
                <p className="mt-3 rounded-xl bg-[#E3F5E9] p-3 text-sm font-semibold text-[#17703D]">{t('legal.pickupBooked', { date: formatDate(legal.pbb.pickup.date, lang, 'weekday') })}</p>
              ) : (
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-semibold text-ink/70">{t('legal.pickupPick')}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {days.map((d) => <button key={d} onClick={() => setPick(d)} className={cx('rounded-xl border py-2 text-sm font-semibold', pick === d ? 'border-brand bg-brand-tint text-brand-dark' : 'border-line')}>{formatDate(d, lang, 'weekday')}</button>)}
                  </div>
                  <Button className="mt-2" block disabled={!pick} onClick={() => { run(schedulePbbPickup, { unitId: ctx.unit.id, date: pick! }); toast.show(t('legal.pickupSaved')); }}>{t('legal.pickupCta')}</Button>
                </div>
              )
            )}
            <button onClick={() => toast.show(t('legal.downloaded'))} className="mt-3 flex items-center gap-1.5 text-sm font-bold text-brand-dark"><Download className="h-4 w-4" />{t(`legal.download.${key}`)}</button>
          </Card>
        ))}
        <p className="px-1 text-xs text-ink/50">{t('legal.footer')}</p>
      </div>
    </div>
  );
}
