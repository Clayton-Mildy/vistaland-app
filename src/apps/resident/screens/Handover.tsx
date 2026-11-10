import { CalendarCheck, FileText, KeyRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handoverSlots } from '../../../data/content';
import { formatDate } from '../../../domain/clock';
import { useLang, useT } from '../../../i18n';
import { pickHandoverSlot, signBast } from '../../../store/actions';
import { useResident, useRun, useToday } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { Input } from '../../../ui/Field';
import { Moni } from '../../../ui/Moni';
import { Sheet } from '../../../ui/Sheet';
import { StatusPill } from '../../../ui/StatusPill';
import { Stepper } from '../../../ui/Stepper';
import { useToast } from '../../../ui/Toast';
import { useComplaintWindowState } from '../hooks';
import { AppBar } from '../../../ui/AppBar';

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
      <AppBar title={t('feature.handover')} subtitle={`${ctx.unit.code} · ${ctx.type.name}`} />
      <div className="bg-gradient-to-br from-brand to-brand-dark px-5 pb-5 pt-4 text-white">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">{t('handover.kicker')}</p>
        <h2 className="text-xl font-extrabold">{t('handover.unit', { unit: ctx.unit.code, type: ctx.type.name })}</h2>
        <div className="mt-3 [&_span]:!text-white/80 [&_.bg-brand]:!bg-white [&_.bg-gold]:!bg-gold">
          <Stepper steps={[t('handover.s.schedule'), t('handover.s.inspect'), t('handover.s.bast'), t('handover.s.keys')]} current={step} />
        </div>
      </div>

      <div className="space-y-3 p-4">
        {ctx.unit.occupancy === 'notReady' && (
          <Card className="flex flex-col items-center py-8 text-center">
            <Moni pose="point" size={80} />
            <p className="mt-3 font-bold">{t('handover.notReady')}</p>
            <p className="mt-1 text-sm text-ink/55">{t('handover.notReadyBody')}</p>
          </Card>
        )}

        {lastCall && !h.bastDate && (
          <Card>
            <div className="flex items-center justify-between">
              <StatusPill tone="info">{t('handover.call', { n: lastCall.n, max: ctx.settings.handover.maxCalls })}</StatusPill>
              <span className="text-xs text-ink/45">{t('handover.sent', { date: formatDate(lastCall.sentAt, lang, 'short') })}</span>
            </div>
            <h3 className="mt-2 text-[17px] font-bold">{t('handover.ready')}</h3>
            <p className="mt-1 text-sm text-ink/60">{t('handover.readyBody')}</p>
            <div className="mt-3 flex gap-1">
              {Array.from({ length: ctx.settings.handover.maxCalls }, (_, i) => (
                <span key={i} className={cx('h-1.5 flex-1 rounded-full', i < h.calls.length ? 'bg-brand' : 'bg-line')} />
              ))}
            </div>
            <p className="mt-3 rounded-xl bg-paper p-3 text-xs text-ink/55">{t('handover.rule', { days: ctx.settings.handover.intervalDays, max: ctx.settings.handover.maxCalls })}</p>
          </Card>
        )}

        {lastCall && !h.bastDate && (!h.slot || changing) && (
          <>
            <h3 className="px-1 pt-1 text-[15px] font-bold">{t('handover.pick')}</h3>
            <div className="space-y-2">
              {slots.map((s) => (
                <button key={s.date + s.time} onClick={() => setSlot(s)} className={cx('flex w-full items-center justify-between rounded-2xl border bg-white px-4 py-3.5 text-left', slot?.date === s.date && slot.time === s.time ? 'border-brand bg-brand-tint/50 ring-2 ring-brand/15' : 'border-line')}>
                  <span className="text-sm"><b>{formatDate(s.date, lang, 'weekday')}</b> · {s.time}</span>
                  <span className="text-xs text-ink/45">{t('handover.slotsLeft', { n: s.left })}</span>
                </button>
              ))}
            </div>
            <p className="px-1 text-xs text-ink/50">{t('handover.bring')}</p>
            <Button block size="lg" disabled={!slot} onClick={confirmSlot}>{t('handover.confirm')}</Button>
          </>
        )}

        {h.slot && !h.receiptSentAt && !changing && (
          <Card>
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand"><CalendarCheck className="h-5 w-5" /></span>
              <div className="flex-1">
                <p className="text-xs text-ink/50">{t('handover.yourSlot')}</p>
                <p className="text-[17px] font-bold">{formatDate(h.slot.date, lang, 'weekday')} · {h.slot.time}</p>
                <p className="mt-1 text-sm text-ink/55">{t('handover.inspectBody')}</p>
              </div>
            </div>
            <Button className="mt-3" variant="secondary" size="sm" onClick={() => setChanging(true)}>{t('handover.change')}</Button>
          </Card>
        )}

        {h.receiptSentAt && !h.bastDate && (
          <Card>
            <div className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-brand" /><h3 className="font-bold">{t('handover.receiptTitle')}</h3></div>
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
                <p className="font-bold text-[#17703D]">{h.bastSource === 'auto' ? t('handover.autoDone') : t('handover.done')}</p>
                <p className="text-sm text-ink/60">{t('handover.doneOn', { date: formatDate(h.bastDate, lang) })}</p>
              </div>
            </Card>
            {h.bastSource === 'auto' && <Card className="text-sm text-ink/60">{t('handover.autoBody')}</Card>}
            {h.checklist && <Card><h3 className="mb-1 font-bold">{t('handover.items')}</h3><Checklist /></Card>}
            <Card className="flex items-center justify-between">
              <div>
                <p className="text-xs text-ink/50">{t('home.complaintWindow')}</p>
                <p className="font-bold">{win.status === 'open' ? t('home.daysLeft', { n: win.daysLeft }) : t('home.windowClosed')}</p>
              </div>
              <Button size="sm" variant="soft" onClick={() => nav('/app/complaint')}>{t('handover.toComplaint')}</Button>
            </Card>
            <Button block variant="secondary" icon={<FileText className="h-4 w-4" />} onClick={() => setBastOpen(true)}>{t('handover.viewBast')}</Button>
          </>
        )}
      </div>

      <Sheet open={bastOpen} onClose={() => setBastOpen(false)} title={t('handover.bastTitle')}>
        <div className="rounded-2xl border border-line bg-paper p-4 text-sm">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-ink/50">{t('handover.bastDoc')}</p>
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
            <p className="rounded-xl bg-[#FBF0D0] p-2.5 text-xs text-[#7A5600]">{t('otp.demo')} <b className="font-mono text-sm tracking-widest">{otp}</b></p>
            <Input inputMode="numeric" maxLength={6} value={otpIn} onChange={(e) => setOtpIn(e.target.value.replace(/\D/g, ''))} className="text-center font-mono text-xl tracking-[0.4em]" placeholder="••••••" />
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
        <div key={k} className="flex justify-between border-b border-line/70 py-1"><dt className="text-ink/50">{t(k)}</dt><dd className="font-semibold">{v}</dd></div>
      ))}
    </dl>
  );
}
