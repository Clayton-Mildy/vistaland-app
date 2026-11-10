import { CheckCircle2, Truck } from 'lucide-react';
import { useState } from 'react';
import { MOVE_SLOTS } from '../../../data/content';
import { formatDate, formatTime } from '../../../domain/clock';
import type { MoveInPermit } from '../../../domain/types';
import { useLang, useT } from '../../../i18n';
import { requestMoveIn, selfReportMoveIn } from '../../../store/actions';
import { useData, useResident, useRun, useToday } from '../../../store/hooks';
import { AppBar } from '../../../ui/AppBar';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { Checkbox, Field, Input, Select } from '../../../ui/Field';
import { Sheet } from '../../../ui/Sheet';
import { StatusPill } from '../../../ui/StatusPill';
import { useToast } from '../../../ui/Toast';

const VEHICLES: MoveInPermit['vehicle'][] = ['pickup', 'trukEngkel', 'trukBesar'];

export default function MoveIn() {
  const t = useT();
  const [lang] = useLang();
  const run = useRun();
  const toast = useToast();
  const today = useToday();
  const ctx = useResident()!;
  const renterId = ctx.role === 'renter' ? ctx.renter!.id : undefined;
  const permit = useData((d) => d.moveIns.filter((m) => m.unitId === ctx.unit.id && m.status !== 'cancelled' && (renterId ? m.renterId === renterId : m.who === 'owner')).at(-1));
  const wifi = useData((d) => d.wifi.find((w) => w.unitId === ctx.unit.id));
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState<MoveInPermit['time']>(MOVE_SLOTS[0]);
  const [vehicle, setVehicle] = useState<MoveInPermit['vehicle']>('trukEngkel');
  const [plate, setPlate] = useState('');
  const [withWifi, setWithWifi] = useState(true);
  const [pkg, setPkg] = useState(ctx.settings.wifi.packages.find((p) => p.popular)?.id ?? ctx.settings.wifi.packages[0].id);
  const [selfOpen, setSelfOpen] = useState(false);
  const [selfDate, setSelfDate] = useState(today);
  const occupied = renterId ? !!ctx.renter?.movedInAt : ctx.unit.occupancy === 'occupied';
  const offerWifi = ctx.settings.features.wifi && !wifi && !renterId;

  const submit = () => {
    const r = run(requestMoveIn, { unitId: ctx.unit.id, date, time, vehicle, plate: plate.trim() || undefined, withWifi: offerWifi && withWifi, packageId: offerWifi && withWifi ? pkg : undefined, renterId });
    if (!r.ok) return toast.show(t(r.error), 'error');
    setEditing(false);
    toast.show(t('movein.submitted'));
  };

  return (
    <div>
      <AppBar title={t('movein.title')} />
      <div className="space-y-3 p-4">
        {occupied && (
          <Card className="flex items-center gap-3 border-[#BDE5CB] bg-[#F2FBF5]">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-[#17703D]" />
            <div>
              <p className="font-bold text-[#17703D]">{t('movein.occupied')}</p>
              <p className="text-sm text-ink/60">
                {t('movein.occupiedSince', { date: formatDate((renterId ? ctx.renter?.movedInAt : ctx.unit.moveIn?.date) ?? today, lang) })}
                {!renterId && ctx.unit.moveIn && ` · ${t(`movein.source.${ctx.unit.moveIn.source}`)}`}
              </p>
            </div>
          </Card>
        )}
        {!occupied && <p className="px-1 text-sm text-ink/60">{t('movein.intro')}</p>}

        {permit && !editing && (
          <Card>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-bold"><Truck className="h-5 w-5 text-brand" />{t('movein.permit')}</span>
              <StatusPill tone={permit.status === 'entered' ? 'success' : 'info'}>{permit.status === 'entered' ? t('movein.entered', { time: formatTime(permit.enteredAt ?? '') }) : t('movein.registered')}</StatusPill>
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-ink/50">{t('common.date')}</dt><dd className="font-semibold">{formatDate(permit.date, lang, 'weekday')} · {permit.time}</dd></div>
              <div className="flex justify-between"><dt className="text-ink/50">{t('movein.vehicle')}</dt><dd className="font-semibold">{t(`movein.v.${permit.vehicle}`)}{permit.plate ? ` · ${permit.plate}` : ''}</dd></div>
              {permit.withWifi && <div className="flex justify-between"><dt className="text-ink/50">WiFi</dt><dd className="font-semibold">{t('movein.wifiToo')}</dd></div>}
            </dl>
            {permit.status === 'approved' && (
              <>
                <p className="mt-3 rounded-xl bg-paper p-3 text-xs text-ink/55">{t('movein.securityNote')}</p>
                <Button className="mt-3" size="sm" variant="secondary" onClick={() => setEditing(true)}>{t('movein.change')}</Button>
              </>
            )}
          </Card>
        )}

        {!occupied && (!permit || editing) && (
          <Card className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('common.date')}><Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
              <Field label={t('common.time')}>
                <Select value={time} onChange={(e) => setTime(e.target.value as MoveInPermit['time'])}>{MOVE_SLOTS.map((s) => <option key={s}>{s}</option>)}</Select>
              </Field>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-ink/70">{t('movein.vehicle')}</p>
              <div className="flex flex-wrap gap-2">
                {VEHICLES.map((v) => (
                  <button key={v} onClick={() => setVehicle(v)} className={cx('rounded-xl border px-3 py-2 text-sm font-semibold', vehicle === v ? 'border-brand bg-brand-tint text-brand-dark' : 'border-line bg-white text-ink/70')}>{t(`movein.v.${v}`)}</button>
                ))}
              </div>
            </div>
            <Field label={t('movein.plate')} optional={t('common.optional')}><Input placeholder="B 1234 XYZ" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} /></Field>
            {offerWifi && (
              <div className="rounded-2xl bg-brand-tint/50 p-3">
                <Checkbox checked={withWifi} onChange={setWithWifi}>
                  <b>{t('movein.wifiTitle')}</b>
                  <span className="block text-xs text-ink/55">{ctx.settings.wifi.promoEnabled ? t('movein.wifiPromo', { n: ctx.settings.wifi.freeMonths }) : t('movein.wifiNoPromo')}</span>
                </Checkbox>
                {withWifi && (
                  <Select className="mt-2" value={pkg} onChange={(e) => setPkg(e.target.value)}>
                    {ctx.settings.wifi.packages.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.mbps} Mbps</option>)}
                  </Select>
                )}
              </div>
            )}
            <Button block size="lg" onClick={submit}>{t('movein.submit')}</Button>
          </Card>
        )}

        {!occupied && !renterId && (
          <Card>
            <p className="font-bold">{t('movein.selfTitle')}</p>
            <p className="mt-1 text-sm text-ink/55">{ctx.unit.selfReportedMoveIn ? t('movein.selfPending', { date: formatDate(ctx.unit.selfReportedMoveIn, lang) }) : t('movein.selfBody')}</p>
            {!ctx.unit.selfReportedMoveIn && <Button className="mt-3" variant="secondary" onClick={() => setSelfOpen(true)}>{t('movein.selfCta')}</Button>}
          </Card>
        )}
      </div>
      <Sheet open={selfOpen} onClose={() => setSelfOpen(false)} title={t('movein.selfTitle')}>
        <Field label={t('movein.selfSince')}><Input type="date" max={today} value={selfDate} onChange={(e) => setSelfDate(e.target.value)} /></Field>
        <Button className="mt-4" block onClick={() => { run(selfReportMoveIn, { unitId: ctx.unit.id, date: selfDate }); setSelfOpen(false); toast.show(t('movein.selfSent')); }}>{t('common.submit')}</Button>
      </Sheet>
    </div>
  );
}
