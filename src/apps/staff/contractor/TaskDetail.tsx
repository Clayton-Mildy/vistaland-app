import { CheckCircle2, ChevronLeft, RotateCcw, Sparkles, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { afterSamplesFor } from '../../../data/samples';
import { fixCheckFor } from '../../../domain/ai';
import { formatDateTime } from '../../../domain/clock';
import { useLang, useT } from '../../../i18n';
import { startWork, submitAfterPhoto, toggleChecklistItem } from '../../../store/actions';
import { useData, useRun } from '../../../store/hooks';
import { AiScanning } from '../../../ui/AiScanning';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { Checkbox } from '../../../ui/Field';
import { Photo } from '../../../ui/Photo';
import { PhotoPicker, type PickedPhoto } from '../../../ui/PhotoPicker';
import { StatusPill } from '../../../ui/StatusPill';

export default function TaskDetail() {
  const t = useT();
  const [lang] = useLang();
  const nav = useNavigate();
  const run = useRun();
  const { complaintId, findingId } = useParams();
  const c = useData((d) => d.complaints.find((x) => x.id === complaintId));
  const unit = useData((d) => d.units.find((u) => u.id === c?.unitId));
  const f = c?.findings.find((x) => x.id === findingId);
  const [scanning, setScanning] = useState<PickedPhoto | null>(null);
  const [picking, setPicking] = useState(false);
  if (!c || !f || !unit) return null;
  const last = f.fixChecks.at(-1);
  const editable = f.stage === 'assigned' || f.stage === 'inProgress';
  const before = f.photoIds[0];
  const upload = (p: PickedPhoto) => {
    setPicking(false);
    setScanning(p);
    setTimeout(() => {
      const check = fixCheckFor(f, p);
      run(submitAfterPhoto, { complaintId: c.id, findingId: f.id, photoId: p.id, check });
      setScanning(null);
    }, 1800);
  };
  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center gap-2 bg-white px-3 pb-3 pt-4 md:pt-9">
        <button onClick={() => nav('/staff/mandor/tasks')} className="rounded-full p-1.5 hover:bg-paper" aria-label="back"><ChevronLeft className="h-6 w-6" /></button>
        <div>
          <p className="text-[17px] font-bold">{unit.code} · {t(`room.${f.room}`)}</p>
          <p className="text-xs text-ink/50">{c.id} · {t(`category.${f.category}`)}</p>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{t('mandor.residentNote')}</span>
            <StatusPill tone={f.stage === 'assigned' ? 'warning' : f.stage === 'inProgress' ? 'info' : 'success'}>{t(`stage.${f.stage}`)}</StatusPill>
          </div>
          <p className="mt-1 text-sm text-ink/70">“{f.description}”</p>
          <Photo id={before} className="mt-3 h-44 rounded-xl" />
          <p className="mt-2 flex items-center gap-1 text-xs text-ink/50"><Sparkles className="h-3.5 w-3.5 text-brand" />{t('mandor.aiCategory', { cat: t(`category.${f.ai.category}`), n: f.ai.confidence })}</p>
          {f.estateNote && <p className="mt-2 rounded-xl bg-paper p-2.5 text-xs"><b>{t('tracker.estateNote')}</b> {f.estateNote}</p>}
        </Card>
        {f.stage === 'assigned' && <Button block size="lg" onClick={() => run(startWork, { complaintId: c.id, findingId: f.id })}>{t('mandor.start')}</Button>}
        {f.checklist.length > 0 && (
          <Card className="space-y-2.5">
            <p className="font-bold">{t('mandor.checklist')}</p>
            {f.checklist.map((item, i) => (
              <Checkbox key={item.label} checked={item.done} onChange={() => editable && run(toggleChecklistItem, { complaintId: c.id, findingId: f.id, index: i })}>{t(item.label)}</Checkbox>
            ))}
          </Card>
        )}
        {last && (
          <Card className={cx(last.verdict === 'fixed' ? 'border-[#BDE5CB] bg-[#F2FBF5]' : 'border-[#F5C2C7] bg-[#FFF5F5]')}>
            <div className="flex items-center gap-2 font-bold">
              {last.verdict === 'fixed' ? <CheckCircle2 className="h-5 w-5 text-[#17703D]" /> : <XCircle className="h-5 w-5 text-[#B4192A]" />}
              <span className={last.verdict === 'fixed' ? 'text-[#17703D]' : 'text-[#B4192A]'}>{t(`mandor.verdict.${last.verdict}`, { n: last.confidence })}</span>
            </div>
            <p className="mt-1 text-sm text-ink/65">{t(last.noteKey)}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div><p className="mb-1 text-[11px] font-semibold text-ink/45">{t('tracker.before')}</p><Photo id={before} className="h-24 rounded-lg" /></div>
              <div><p className="mb-1 text-[11px] font-semibold text-ink/45">{t('tracker.after')}</p><Photo id={last.photoId} className="h-24 rounded-lg" /></div>
            </div>
            <p className="mt-2 text-[11px] text-ink/45">{formatDateTime(last.at, lang)}</p>
            {last.verdict === 'fixed' && <p className="mt-2 text-sm font-semibold text-[#17703D]">{t('mandor.waitEstate')}</p>}
          </Card>
        )}
        {scanning && <AiScanning photoId={scanning.id} label={t('mandor.scanning')} />}
        {editable && f.stage === 'inProgress' && !scanning && (
          picking ? (
            <Card>
              <p className="mb-2 font-bold">{t('mandor.afterTitle')}</p>
              <p className="mb-3 text-xs text-ink/55">{t('mandor.afterHint')}</p>
              <PhotoPicker samples={afterSamplesFor(before)} onPicked={upload} />
            </Card>
          ) : (
            <Button block size="lg" icon={last && last.verdict !== 'fixed' ? <RotateCcw className="h-4 w-4" /> : undefined} onClick={() => setPicking(true)}>{last && last.verdict !== 'fixed' ? t('mandor.retake') : t('mandor.uploadAfter')}</Button>
          )
        )}
        {f.fixChecks.length > 1 && (
          <Card className="p-0">
            <p className="px-4 pb-1 pt-3 text-sm font-bold">{t('mandor.attempts')}</p>
            {f.fixChecks.map((x, i) => (
              <div key={i} className="flex items-center justify-between border-t border-line px-4 py-2 text-xs">
                <span>{formatDateTime(x.at, lang)}</span>
                <StatusPill tone={x.verdict === 'fixed' ? 'success' : 'danger'}>{t(`mandor.short.${x.verdict}`)}</StatusPill>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
