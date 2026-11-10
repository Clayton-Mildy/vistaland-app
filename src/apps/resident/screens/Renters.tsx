import { Plus, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../../domain/clock';
import { formatRp } from '../../../domain/money';
import { useLang, useT } from '../../../i18n';
import { payRegistrationFee } from '../../../store/actions';
import { useData, useResident, useRun } from '../../../store/hooks';
import { AppBar } from '../../../ui/AppBar';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { EmptyState } from '../../../ui/EmptyState';
import { StatusPill, type PillTone } from '../../../ui/StatusPill';
import { PaySheet } from './PaySheet';

const TONE: Record<string, PillTone> = { submitted: 'info', needsFix: 'warning', approved: 'success', rejected: 'danger' };

export default function Renters() {
  const t = useT();
  const [lang] = useLang();
  const nav = useNavigate();
  const run = useRun();
  const ctx = useResident()!;
  const units = useData((d) => d.units);
  const regs = useData((d) => d.registrations).filter((r) => ctx.unitIds.includes(r.unitId)).slice().reverse();
  const renters = useData((d) => d.renters).filter((r) => ctx.unitIds.includes(r.unitId) && r.status === 'active');
  const [payId, setPayId] = useState<string | null>(null);
  const payReg = regs.find((r) => r.id === payId);
  const code = (unitId: string) => units.find((u) => u.id === unitId)?.code ?? '';
  return (
    <div>
      <AppBar title={t('feature.renterRegistration')} right={<Button size="sm" variant="ghost" icon={<Plus className="h-4 w-4" />} onClick={() => nav('/app/renters/new')}>{t('renters.new')}</Button>} />
      <div className="space-y-3 p-4">
        <p className="px-1 text-sm text-ink/60">{t('renters.intro')}</p>
        {renters.map((r) => (
          <Card key={r.id} className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FBF0D0] text-[#7A5600]"><UserRound className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{r.name} <span className="text-xs font-normal text-ink/45">· {code(r.unitId)}</span></p>
              <p className="text-xs text-ink/55">{t('renters.lease', { start: formatDate(r.lease.start, lang), end: formatDate(r.lease.end, lang) })}</p>
              <p className="text-[11px] text-ink/45">{t(r.iplPayer === 'renter' ? 'renters.iplRenter' : 'renters.iplOwner')}</p>
            </div>
            <StatusPill tone="success">{t('renters.active')}</StatusPill>
          </Card>
        ))}
        {regs.length === 0 && renters.length === 0 && <EmptyState title={t('renters.emptyTitle')} body={t('renters.emptyBody')} action={<Button onClick={() => nav('/app/renters/new')}>{t('renters.new')}</Button>} />}
        {regs.length > 0 && <h3 className="px-1 pt-2 text-[15px] font-bold">{t('renters.registrations')}</h3>}
        {regs.map((r) => (
          <Card key={r.id}>
            <div className="flex items-center justify-between">
              <span className="font-bold">{r.person.name}</span>
              <StatusPill tone={TONE[r.status]}>{t(`renters.status.${r.status}`)}</StatusPill>
            </div>
            <p className="mt-0.5 text-xs text-ink/55">{t(`role.${r.type}`)} · {code(r.unitId)} · {r.type === 'renter' && r.lease ? t('renters.lease', { start: formatDate(r.lease.start, lang), end: formatDate(r.lease.end, lang) }) : r.ajbDate ? t('renters.ajb', { date: formatDate(r.ajbDate, lang) }) : ''}</p>
            {r.reviewNote && <p className="mt-2 rounded-xl bg-[#FFF8E8] p-2.5 text-xs text-[#8A5A00]"><b>{t('tracker.estateNote')}</b> {r.reviewNote}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              {!r.feePaid && r.fee > 0 && r.status !== 'rejected' && <Button size="sm" onClick={() => setPayId(r.id)}>{t('renters.pay', { amount: formatRp(r.fee) })}</Button>}
              {r.status === 'needsFix' && <Button size="sm" variant="secondary" onClick={() => nav(`/app/renters/new?fix=${r.id}`)}>{t('renters.fix')}</Button>}
              {r.status === 'submitted' && r.feePaid && <span className="text-xs text-ink/50">{t('renters.waiting')}</span>}
            </div>
          </Card>
        ))}
      </div>
      {payReg && (
        <PaySheet open onClose={() => setPayId(null)} title={t('renters.payTitle')} amount={payReg.fee} vaSeed={code(payReg.unitId)} onPay={() => { const r = run(payRegistrationFee, { id: payReg.id }); return r.ok ? null : r.error; }} />
      )}
    </div>
  );
}
