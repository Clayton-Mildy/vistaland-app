import { AlertTriangle, Bell, Car, Cctv, Check, Mail, PaintRoller, Phone, Plus, ShoppingBag, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { diffDays, formatDate } from '../../../domain/clock';
import { useLang, useT } from '../../../i18n';
import { useDerived, useNotifications, useResident, useToday } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { LangToggle } from '../../../ui/LangToggle';
import { Progress } from '../../../ui/Progress';
import { StatusPill } from '../../../ui/StatusPill';
import { Announcements, IplStatus } from './StatusCards';

export default function RenterHome() {
  const t = useT();
  const [lang] = useLang();
  const nav = useNavigate();
  const ctx = useResident()!;
  const renter = ctx.renter!;
  const today = useToday();
  const unread = useNotifications(ctx.recipientKey).filter((n) => !n.read).length;
  const data = useDerived((d) => ({
    reg: d.registrations.find((r) => r.renterId === renter.id),
    order: d.cardOrders.filter((o) => o.unitId === ctx.unit.id).at(-1),
    permit: d.moveIns.find((m) => m.renterId === renter.id && m.status !== 'cancelled'),
    renovations: d.renovations.filter((r) => r.renterId === renter.id),
  }), [renter.id, ctx.unit.id]);
  const steps = [
    { key: 'account', done: true },
    { key: 'paid', done: data.reg ? data.reg.feePaid : true },
    { key: 'rules', done: !!renter.rulesSignedAt, route: '/app/rules' },
    { key: 'cards', done: data.order ? data.order.status === 'pickedUp' : !!renter.movedInAt, route: '/app/cards' },
    { key: 'moveIn', done: !!renter.movedInAt, route: '/app/move-in' },
  ];
  const done = steps.filter((s) => s.done).length;
  const leftDays = diffDays(today, renter.lease.end);
  const shortcuts = [
    { icon: Car, label: t('home.vehicles'), sub: t('renter.cardsSub'), route: '/app/cards' },
    { icon: Truck, label: t('feature.moveIn'), sub: data.permit ? formatDate(data.permit.date, lang, 'weekday') : t('renter.done'), route: '/app/move-in' },
    { icon: Cctv, label: t('feature.cctv'), sub: renter.movedInAt ? t('renter.cctvOn') : t('renter.cctvAfter'), route: '/app/cctv' },
    { icon: Phone, label: t('feature.numbers'), sub: t('renter.numbersSub'), route: '/app/emergency' },
    { icon: Mail, label: t('feature.feedback'), sub: t('renter.feedbackSub'), route: '/app/feedback' },
    { icon: ShoppingBag, label: t('feature.businesses'), sub: t('renter.bizSub'), route: '/app/businesses' },
  ];
  return (
    <div className="pb-4">
      <div className="bg-[#1F2937] px-5 pb-16 pt-5 text-white md:pt-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-white/65">{ctx.project.name}</span>
            <StatusPill tone="gold">{t('role.renter')}</StatusPill>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => nav('/app/notifications')} className="relative rounded-full p-1.5 hover:bg-white/10" aria-label={t('account.notifications')}>
              <Bell className="h-5 w-5" />
              {unread > 0 && <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-ink">{unread}</span>}
            </button>
            <button onClick={() => nav('/app/emergency')} className="flex items-center gap-1 rounded-full bg-brand px-2.5 py-1.5 text-xs font-bold">
              <AlertTriangle className="h-3.5 w-3.5" /> {t('renter.emergency')}
            </button>
          </div>
        </div>
        <h1 className="mt-3 text-2xl font-extrabold">{t('home.hello', { name: ctx.name.split(' ')[0] })}</h1>
        <p className="text-sm text-white/75">{t('renter.leaseLine', { unit: ctx.unit.code, start: formatDate(renter.lease.start, lang), end: formatDate(renter.lease.end, lang) })}</p>
        <p className="mt-1 text-xs text-white/55">{t('renter.ownedBy', { owner: ctx.ownerName })} · <LangToggle dark className="ml-1 align-middle" /></p>
      </div>
      <div className="-mt-11 space-y-3 px-4">
        {leftDays <= 30 && (
          <div className="flex items-start gap-2 rounded-2xl border border-[#F3D9A4] bg-[#FFF8E8] p-3 text-xs font-semibold text-[#8A5A00]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {t('renter.leaseEnding', { n: leftDays, date: formatDate(renter.lease.end, lang) })}
          </div>
        )}
        <Card className="p-0">
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-bold">{t('renter.prep')}</span>
              <span className="text-xs font-semibold text-ink/50">{t('home.prepareCount', { n: done, total: steps.length })}</span>
            </div>
            <Progress className="mt-2" value={(done / steps.length) * 100} />
          </div>
          <ul className="mt-2 divide-y divide-line">
            {steps.map((s) => (
              <li key={s.key}>
                <button disabled={!s.route || s.done} onClick={() => s.route && nav(s.route)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left disabled:cursor-default">
                  <span className={cx('flex h-6 w-6 items-center justify-center rounded-full border-2', s.done ? 'border-brand bg-brand text-white' : 'border-line')}>{s.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
                  <span className={cx('flex-1 text-sm', s.done ? 'text-ink/60' : 'font-semibold')}>{t(`renter.step.${s.key}`)}</span>
                  {!s.done && s.route && <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white">{t('home.doIt')}</span>}
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {renter.iplPayer === 'renter' ? (
          <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-card">
            <div>
              <p className="text-xs text-ink/50">{t('renter.iplToYou')}</p>
              <p className="text-sm font-semibold">{t('renter.iplAgreement')}</p>
            </div>
            <div className="w-28"><IplStatus /></div>
          </div>
        ) : (
          <Card className="py-3 text-xs text-ink/55">{t('renter.iplOwner')}</Card>
        )}

        <Card>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[15px] font-bold"><PaintRoller className="h-4 w-4 text-[#D2611B]" />{t('feature.renovation')}</span>
            <Button size="sm" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => nav('/app/renovation')}>{t('renter.request')}</Button>
          </div>
          <p className="mt-1 text-xs text-ink/50">{t('renter.renovationNote')}</p>
          {data.renovations.map((r) => (
            <button key={r.id} onClick={() => nav(`/app/renovation/${r.id}`)} className="mt-3 flex w-full items-center justify-between rounded-xl border border-line px-3 py-2.5 text-left">
              <span>
                <span className="block text-sm font-semibold">{r.id} · {r.title}</span>
                <span className="block text-[11px] text-ink/45">{t(`reno.step.${r.step}`)}</span>
              </span>
              <StatusPill tone={r.step === 'ownerApproval' ? 'warning' : r.step === 'rejected' ? 'danger' : 'info'}>{t(`reno.short.${r.step}`)}</StatusPill>
            </button>
          ))}
        </Card>

        <div className="grid grid-cols-2 gap-2.5">
          {shortcuts.map((s) => (
            <button key={s.label} onClick={() => nav(s.route)} className="rounded-2xl border border-line/80 bg-white p-3 text-left shadow-card">
              <s.icon className="h-5 w-5 text-brand" />
              <span className="mt-1.5 block text-sm font-bold">{s.label}</span>
              <span className="block truncate text-[11px] text-ink/50">{s.sub}</span>
            </button>
          ))}
        </div>
        <p className="px-1 text-[11px] leading-relaxed text-ink/45">{t('renter.ownerOnly')}</p>
        <Announcements />
      </div>
    </div>
  );
}
