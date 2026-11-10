import { CalendarCheck, FileText, KeyRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handoverSlots } from '../../../data/content';
import { formatDate } from '../../../domain/clock';
import { useLang, useT } from '../../../i18n';
import { markCallRead, pickHandoverSlot, signBast } from '../../../store/actions';
import { useResident, useRun, useToday } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { Input } from '../../../ui/Field';
import { Moni } from '../../../ui/Moni';
import { Sheet } from '../../../ui/Sheet';
import { StatusPill } from '../../../ui/StatusPill';
import { useToast } from '../../../ui/Toast';
import { useComplaintWindowState } from '../hooks';
import { BandSteps } from '../ui/BandSteps';
import { ScreenBody } from '../ui/ScreenBody';
import { ScreenHeader } from '../ui/ScreenHeader';

export default function Handover() {
  const t = useT();
  const [lang] = useLang();
  const nav = useNavigate();
  const run = useRun();
  const toast = useToast();
  const today = useToday();
  const ctx = useResident()!;
  const h = ctx.unit.handover;
  const win = useComplaintWindowState();
  const [slot, setSlot] = useState<{ date: string; time: string } | null>(null);
  const [changing, setChanging] = useState(false);
  const [bastOpen, setBastOpen] = useState(false);
  const [otp] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  const [otpIn, setOtpIn] = useState('');
  const step = h.bastDate ? 4 : h.receiptSentAt ? 2 : h.slot ? 1 : 0;
  const lastCall = h.calls.at(-1);
  const slots = handoverSlots(today);
  // Opening this screen is the read receipt the estate sees on its call table.
  const unreadCall = !!lastCall && !lastCall.readAt && !h.bastDate;
  useEffect(() => {
    if (unreadCall) run(markCallRead, { unitId: ctx.unit.id });
  }, [unreadCall, ctx.unit.id, run]);

  const confirmSlot = () => {
    if (!slot) return;
    run(pickHandoverSlot, { unitId: ctx.unit.id, ...slot });
    setChanging(false);
    toast.show(t('handover.slotSaved'));
  };
  const sign = () => {
    if (otpIn !== otp) return toast.show(t('otp.wrong'), 'error');
    const r = run(signBast, { unitId: ctx.unit.id });
    if (!r.ok) return toast.show(t(r.error), 'error');
    setBastOpen(false);
    toast.show(t('handover.bastDone'));
  };

  return (
    <div>
      <ScreenHeader title={t('feature.handover')} eyebrow={t('handover.kicker')} figure={t('handover.unit', { unit: ctx.unit.code, type: ctx.type.name })}>
        <BandSteps className="mt-4" steps={[t('handover.s.schedule'), t('handover.s.inspect'), t('handover.s.bast'), t('handover.s.keys')]} current={step} />
      </ScreenHeader>

      <ScreenBody>
        {ctx.unit.occupancy === 'notReady' && (
          <Card className="flex flex-col items-center py-8 text-center">
            <Moni pose="point" size={72} />
            <p className="mt-3 text-base font-semibold">{t('handover.notReady')}</p>
            <p className="mt-1 text-sm text-ink/55">{t('handover.notReadyBody')}</p>
          </Card>
        )}

        {lastCall && !h.bastDate && (!h.slot || changing) && (
          <Card>
            <div className="flex items-center justify-between gap-3">
              <StatusPill tone="info">{t('handover.call', { n: lastCall.n, max: ctx.settings.handover.maxCalls })}</StatusPill>
              <span className="text-xs text-ink/45">{t('handover.sent', { date: formatDate(lastCall.sentAt, lang, 'short') })}</span>
            </div>
            <h3 className="mt-3 text-base font-semibold">{t('handover.ready')}</h3>
            <p className="mt-1 text-sm text-ink/60">{t('handover.readyBody')}</p>
            <div className="mt-3 flex gap-1">
              {Array.from({ length: ctx.settings.handover.maxCalls }, (_, i) => (
                <span key={i} className={cx('h-1 flex-1 rounded-full', i < h.calls.length ? 'bg-brand-dark' : 'bg-line')} />
              ))}
            </div>
            <p className="mt-3 rounded-xl bg-paper p-3 text-xs text-ink/55">{t('handover.rule', { days: ctx.settings.handover.intervalDays, max: ctx.settings.handover.maxCalls })}</p>
          </Card>
        )}

        {lastCall && !h.bastDate && (!h.slot || changing) && (
          <>
            <h3 className="px-1 pt-2 text-base font-semibold">{t('handover.pick')}</h3>
            <div className="space-y-2" role="radiogroup">
              {slots.map((s) => {
                const on = slot?.date === s.date && slot.time === s.time;
                return (
                  <button key={s.date + s.time} role="radio" aria-checked={on} onClick={() => setSlot(s)} className={cx('flex w-full items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 text-left shadow-card transition', on ? 'border-brand ring-2 ring-brand/20' : 'border-line hover:border-ink/25')}>
                    <span className={cx('h-5 w-5 shrink-0 rounded-full border-2', on ? 'border-[6px] border-brand-dark' : 'border-line')} />
                    <span className="flex-1 text-sm"><span className="font-semibold">{formatDate(s.date, lang, 'weekday')}</span> · {s.time}</span>
                    <span className="text-xs text-ink/45">{t('handover.slotsLeft', { n: s.left })}</span>
                  </button>
                );
              })}
            </div>
            <p className="px-1 text-xs text-ink/50">{t('handover.bring')}</p>
            <Button block size="lg" disabled={!slot} onClick={confirmSlot}>{t('handover.confirm')}</Button>
          </>
        )}

        {h.slot && !h.receiptSentAt && !changing && (
          <Card>
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand-dark"><CalendarCheck className="h-5 w-5" strokeWidth={1.75} /></span>
              <div className="flex-1">
                <p className="text-xs text-ink/55">{t('handover.yourSlot')}</p>
                <p className="text-base font-semibold">{formatDate(h.slot.date, lang, 'weekday')} · {h.slot.time}</p>
                <p className="mt-1 text-sm text-ink/55">{t('handover.inspectBody')}</p>
              </div>
            </div>
            <Button className="mt-3" variant="secondary" size="sm" onClick={() => setChanging(true)}>{t('handover.change')}</Button>
          </Card>
        )}

        {h.receiptSentAt && !h.bastDate && (
          <Card>
            <div className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-brand-dark" strokeWidth={1.75} /><h3 className="text-base font-semibold">{t('handover.receiptTitle')}</h3></div>
            <p className="mt-1 text-sm text-ink/55">{t('handover.receiptBody')}</p>
            {h.checklist && <Checklist />}
            <Button className="mt-4" block size="lg" icon={<FileText className="h-4 w-4" />} onClick={() => setBastOpen(true)}>{t('handover.signBast')}</Button>
          </Card>
        )}

        {h.bastDate && (
          <>
            <Card className="flex items-center gap-3 border-[#BDE5CB] bg-[#F2FBF5]">
              <Moni pose="thumbs" size={56} />
              <div>
                <p className="font-semibold text-[#17703D]">{h.bastSource === 'auto' ? t('handover.autoDone') : t('handover.done')}</p>
                <p className="text-sm text-ink/60">{t('handover.doneOn', { date: formatDate(h.bastDate, lang) })}</p>
              </div>
            </Card>
            {h.bastSource === 'auto' && <Card className="text-sm text-ink/60">{t('handover.autoBody')}</Card>}
            {h.checklist && <Card><h3 className="mb-1 text-base font-semibold">{t('handover.items')}</h3><Checklist /></Card>}
            <Card className="flex items-center justify-between">
              <div>
                <p className="text-xs text-ink/55">{t('home.complaintWindow')}</p>
                <p className="font-semibold">{win.status === 'open' ? t('home.daysLeft', { n: win.daysLeft }) : t('home.windowClosed')}</p>
              </div>
              <Button size="sm" variant="soft" onClick={() => nav('/app/complaint')}>{t('handover.toComplaint')}</Button>
            </Card>
            <Button block variant="secondary" icon={<FileText className="h-4 w-4" />} onClick={() => setBastOpen(true)}>{t('handover.viewBast')}</Button>
          </>
        )}
      </ScreenBody>

      <Sheet open={bastOpen} onClose={() => setBastOpen(false)} title={t('handover.bastTitle')}>
        <div className="rounded-2xl border border-line bg-paper p-4 text-sm">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-ink/50">{t('handover.bastDoc')}</p>
          <dl className="mt-3 space-y-1.5">
            <div className="flex justify-between"><dt className="text-ink/50">{t('common.unit')}</dt><dd className="font-semibold">{ctx.unit.code} · {ctx.type.name}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/50">{t('welcome.owner')}</dt><dd className="font-semibold">{ctx.name}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/50">{t('handover.inspectDate')}</dt><dd className="font-semibold">{h.slot ? formatDate(h.slot.date, lang) : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/50">{t('handover.freeIpl')}</dt><dd className="font-semibold">{ctx.settings.ipl.freeEnabled ? t('common.months', { n: ctx.settings.ipl.freeMonths }) : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/50">{t('handover.window')}</dt><dd className="font-semibold">{t('common.days', { n: ctx.settings.complaints.windowDays })}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-ink/55">{t('handover.bastClause')}</p>
        </div>
        {!h.bastDate && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-ink/60">{t('handover.otpBody')}</p>
            <p className="rounded-xl bg-paper p-2.5 text-xs text-ink/55">{t('otp.demo')} <span className="text-sm font-semibold tracking-widest tabular text-ink/75">{otp}</span></p>
            <Input inputMode="numeric" maxLength={6} value={otpIn} onChange={(e) => setOtpIn(e.target.value.replace(/\D/g, ''))} className="text-center text-xl tracking-[0.4em] tabular" placeholder="••••••" />
            <Button block size="lg" disabled={otpIn.length !== 6} onClick={sign}>{t('handover.signNow')}</Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function Checklist() {
  const t = useT();
  const c = useResident()!.unit.handover.checklist!;
  const rows: [string, string | number][] = [
    ['handover.item.frontKeys', c.frontKeys], ['handover.item.backKeys', c.backKeys], ['handover.item.roomKeys', c.roomKeys],
    ['handover.item.cards', c.accessCards], ['handover.item.stickers', c.stickers], ['handover.item.handbook', c.handbook],
    ['handover.item.electric', c.meterElectric], ['handover.item.water', c.meterWater],
  ];
  return (
    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between border-b border-line/70 py-1"><dt className="text-ink/50">{t(k)}</dt><dd className="font-medium tabular">{v}</dd></div>
      ))}
    </dl>
  );
}
