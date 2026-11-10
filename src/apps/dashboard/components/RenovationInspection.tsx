import { useEffect, useState } from 'react';
import { formatRp } from '../../../domain/money';
import type { Renovation } from '../../../domain/types';
import { useT } from '../../../i18n';
import { submitInspection } from '../../../store/actions';
import { useRun } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Checkbox, Field, Input, Textarea } from '../../../ui/Field';
import { Modal } from '../../../ui/Modal';
import { Photo } from '../../../ui/Photo';
import { PhotoPicker } from '../../../ui/PhotoPicker';
import { Segmented } from '../../../ui/Segmented';
import { useToast } from '../../../ui/Toast';

/** Estate inspection after renovation work: checklist, then return the deposit in full or deduct for damage. */
export function RenovationInspection({ reno, checklist, unitCode, onClose }: { reno: Renovation | null; checklist: string[]; unitCode: string; onClose: () => void }) {
  const t = useT();
  const run = useRun();
  const toast = useToast();
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<'full' | 'deduct'>('full');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  useEffect(() => {
    setChecks(Object.fromEntries(checklist.map((k) => [k, false])));
    setResult('full');
    setAmount('');
    setReason('');
    setPhotos([]);
  }, [reno?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!reno) return null;
  const deduction = Math.min(reno.deposit, Math.max(0, Number(amount.replace(/\D/g, '')) || 0));
  const allChecked = checklist.every((k) => checks[k]);
  const canSubmit = result === 'full' ? allChecked : deduction > 0 && reason.trim().length > 0;
  const submit = () => {
    const r = run(submitInspection, { id: reno.id, checklist: checks, result, deduction: result === 'full' ? 0 : deduction, reason: result === 'deduct' ? reason.trim() : undefined, photoIds: photos });
    if (!r.ok) return toast.show(t(r.error), 'error');
    toast.show(t('dash.reno2.inspected'));
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={t('dash.reno2.inspectTitle', { id: reno.id, unit: unitCode })} wide
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button disabled={!canSubmit} onClick={submit}>{t('dash.reno2.issueBast')}</Button></div>}>
      <div className="space-y-4">
        <p className="text-sm text-ink/60">{reno.title} · {t('dash.reno2.deposit', { amount: formatRp(reno.deposit) })}</p>
        <div className="space-y-1.5">
          {checklist.map((k) => <Checkbox key={k} checked={!!checks[k]} onChange={(v) => setChecks({ ...checks, [k]: v })} className="rounded-xl border border-line px-3 py-2">{t(k)}</Checkbox>)}
        </div>
        <Segmented value={result} onChange={setResult} items={[{ value: 'full', label: t('dash.reno2.full') }, { value: 'deduct', label: t('dash.reno2.deduct') }]} />
        {result === 'full' ? (
          <p className="rounded-xl bg-[#E8F6EC] px-3 py-2 text-sm text-[#17703D]">{allChecked ? t('dash.reno2.fullBody', { amount: formatRp(reno.deposit) }) : t('dash.reno2.checkAll')}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('dash.reno2.amount')} hint={t('dash.reno2.refund', { amount: formatRp(reno.deposit - deduction) })}>
              <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500000" />
            </Field>
            <Field label={t('dash.reno2.reason')}>
              <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('dash.reno2.reasonPh')} />
            </Field>
            <Field label={t('dash.reno2.photos')} optional={t('common.optional')} className="sm:col-span-2">
              <div className="flex flex-wrap items-center gap-2">
                {photos.map((id) => <Photo key={id} id={id} className="h-14 w-14 rounded-lg" />)}
                <PhotoPicker onPicked={(p) => setPhotos((xs) => [...xs, p.id])} />
              </div>
            </Field>
          </div>
        )}
      </div>
    </Modal>
  );
}
