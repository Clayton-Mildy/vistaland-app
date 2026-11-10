import { Copy } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { formatDateTime } from '../../../domain/clock';
import { formatRp } from '../../../domain/money';
import type { RenovationStep } from '../../../domain/types';
import { useLang, useT } from '../../../i18n';
import { objectRenovation, payDeposit, requestInspection, setRefundAccount, signRenovationBast } from '../../../store/actions';
import { useData, useResident, useRun } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { EmptyState } from '../../../ui/EmptyState';
import { Input, Textarea } from '../../../ui/Field';
import { Sheet } from '../../../ui/Sheet';
import { Timeline } from '../../../ui/Timeline';
import { useToast } from '../../../ui/Toast';
import { ScreenBody } from '../ui/ScreenBody';
import { ScreenHeader } from '../ui/ScreenHeader';

export default function RenovationDetail() {
  const t = useT();
  const [lang] = useLang();
  const run = useRun();
  const toast = useToast();
  const { id } = useParams();
  const ctx = useResident();
  // Only this unit's renovations; a renter sees only the requests they made.
  const r = useData((d) => d.renovations.find((x) => x.id === id && x.unitId === ctx?.unit.id && (!ctx?.renter || x.renterId === ctx.renter.id)));
  const [account, setAccount] = useState(r?.refundAccount ?? '');
  const [objecting, setObjecting] = useState(false);
  const [objection, setObjection] = useState('');
  if (!r) return <div><ScreenHeader title={t('feature.renovation')} /><ScreenBody><Card><EmptyState title={t('error.notFound')} /></Card></ScreenBody></div>;
  const order: RenovationStep[] = [...(r.requestedBy === 'renter' ? ['submitted', 'ownerApproval'] : ['submitted']) as RenovationStep[], 'estateReview', 'awaitingDeposit', 'inProgress', 'inspection', 'bastIssued', 'depositReturned'];
  const pos = (s: RenovationStep) => (s === 'bastSigned' ? order.indexOf('bastIssued') + 0.5 : order.indexOf(s));
  const cur = pos(r.step);
  const at = (s: RenovationStep) => r.history.filter((h) => h.step === s).at(-1)?.at;
  const refund = r.deposit - (r.inspection?.deduction ?? 0);
  const act = (fn: () => { ok: boolean }, msg: string) => {
    if (fn().ok) toast.show(t(msg));
  };

  return (
    <div>
      <ScreenHeader title={r.id} eyebrow={t('feature.renovation')} figure={r.title} sub={r.description} />
      <ScreenBody>
        <Card>
          {r.step === 'rejected' ? (
            <p className="font-semibold text-[#B4192A]">{t('reno.step.rejected')}</p>
          ) : (
            <Timeline items={order.map((s) => ({ key: s, label: t(`reno.step.${s}`), meta: at(s) ? formatDateTime(at(s)!, lang) : undefined, state: pos(s) < cur ? 'done' : pos(s) === cur || (s === 'bastIssued' && r.step === 'bastSigned') ? (s === 'depositReturned' ? 'done' : 'current') : 'todo' }))} />
          )}
        </Card>

        {r.step === 'awaitingDeposit' && (
          <Card className="border-[#F3D9A4] bg-[#FFF8E8]">
            <p className="text-sm font-semibold text-[#8A5A00]">{t('reno.depositTitle')}</p>
            <p className="text-2xl font-semibold tabular">{formatRp(r.deposit)}</p>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-white p-3">
              <div>
                <p className="text-xs text-ink/50">Virtual Account · Bank BTN</p>
                <p className="text-lg font-semibold tracking-wider tabular">{r.va.replace(/(\d{4})(?=\d)/g, '$1 ')}</p>
              </div>
              <button onClick={() => { void navigator.clipboard?.writeText(r.va); toast.show(t('common.copied')); }} className="flex items-center gap-1 rounded-full border border-line px-3 py-1 text-xs font-medium text-brand-dark hover:border-ink/25"><Copy className="h-3.5 w-3.5" />{t('common.copy')}</button>
            </div>
            <p className="mt-2 text-xs text-[#8A5A00]">{t('reno.vaNote')}</p>
            <Button className="mt-3" block onClick={() => act(() => run(payDeposit, { id: r.id }), 'reno.depositPaid')}>{t('reno.simulateTransfer')}</Button>
          </Card>
        )}

        {['awaitingDeposit', 'inProgress', 'inspection', 'bastIssued'].includes(r.step) && (
          <Card>
            <p className="text-xs font-medium text-ink/70">{t('reno.refundAccount')}</p>
            <div className="mt-1.5 flex gap-2">
              <Input value={account} onChange={(e) => setAccount(e.target.value)} placeholder={t('reno.refundPlaceholder')} />
              <Button variant="secondary" onClick={() => act(() => run(setRefundAccount, { id: r.id, account }), 'reno.accountSaved')}>{t('common.save')}</Button>
            </div>
          </Card>
        )}

        {r.step === 'inProgress' && (
          <Card>
            <p className="text-sm text-ink/60">{t('reno.inProgressBody')}</p>
            <Button className="mt-3" block variant="secondary" onClick={() => act(() => run(requestInspection, { id: r.id }), 'reno.inspectionRequested')}>{t('reno.requestInspection')}</Button>
          </Card>
        )}
        {r.step === 'inspection' && <Card className="text-sm text-ink/60">{t('reno.inspectionBody')}</Card>}

        {r.inspection && (
          <Card>
            <p className="text-base font-semibold">{t('reno.result')}</p>
            <dl className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-ink/55">{t('reno.depositPaidLine')}</dt><dd className="font-semibold">{formatRp(r.deposit)}</dd></div>
              {r.inspection.deduction > 0 && (
                <div className="flex justify-between text-[#B4192A]"><dt>{t('reno.deduction')}<span className="block text-xs text-ink/45">{r.inspection.reason}</span></dt><dd className="font-semibold">− {formatRp(r.inspection.deduction)}</dd></div>
              )}
              <div className="flex justify-between border-t border-line pt-2"><dt className="font-semibold">{t('reno.refund')}</dt><dd className="text-lg font-semibold tabular">{formatRp(refund)}</dd></div>
            </dl>
            {r.step === 'bastIssued' && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => setObjecting(true)}>{t('reno.object')}</Button>
                <Button onClick={() => act(() => run(signRenovationBast, { id: r.id }), 'reno.bastSigned')}>{t('reno.signBast')}</Button>
              </div>
            )}
            {r.objection && <p className="mt-2 rounded-xl bg-paper p-2.5 text-xs text-ink/60"><span className="font-semibold">{t('reno.objectionSent')}</span> {r.objection}</p>}
            {r.step === 'bastSigned' && <p className="mt-2 text-sm text-ink/60">{t('reno.refunding', { account: r.refundAccount ?? '—' })}</p>}
            {r.step === 'depositReturned' && <p className="mt-2 text-sm font-semibold text-[#17703D]">{t('reno.returned', { amount: formatRp(refund) })}</p>}
          </Card>
        )}
      </ScreenBody>
      <Sheet open={objecting} onClose={() => setObjecting(false)} title={t('reno.object')} footer={<Button block onClick={() => { run(objectRenovation, { id: r.id, text: objection }); setObjecting(false); toast.show(t('reno.objectionSentToast')); }}>{t('common.submit')}</Button>}>
        <Textarea value={objection} onChange={(e) => setObjection(e.target.value)} placeholder={t('reno.objectionPlaceholder')} />
      </Sheet>
    </div>
  );
}
