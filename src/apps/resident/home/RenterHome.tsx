import { AlertTriangle, Car, Cctv, Check, ChevronRight, Mail, PaintRoller, Phone, Plus, ShoppingBag, Truck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { diffDays, formatDate } from '../../../domain/clock';
import { useLang, useT } from '../../../i18n';
import { useDerived, useResident, useToday } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { IconTile } from '../../../ui/IconTile';
import { LangToggle } from '../../../ui/LangToggle';
import { Progress } from '../../../ui/Progress';
import { Section } from '../../../ui/Section';
import { StatusPill } from '../../../ui/StatusPill';
import { greetingKey } from '../hooks';
import { HomeBand } from '../ui/HomeBand';
import { HouseCard } from '../ui/HouseCard';
import { houseFor } from '../ui/media';
import { HomeSearchSheet, HomeTopRow, IplHouseCard } from './HomeParts';
import { Announcements, IplStatus } from './StatusCards';

export default function RenterHome() {
  const t = useT();
  const [lang] = useLang();
  const nav = useNavigate();
  const ctx = useResident()!;
  const renter = ctx.renter!;
  const today = useToday();
  const [search, setSearch] = useState(false);
  const data = useDerived((d) => ({
    reg: d.registrations.find((r) => r.renterId === renter.id),
    order: d.cardOrders.filter((o) => o.unitId === ctx.unit.id).at(-1),
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
  const next = steps.find((s) => !s.done);
  const leftDays = diffDays(today, renter.lease.end);
  const role = t('role.renter');
  const shortcuts = [
    { icon: Car, label: t('home.vehicles'), route: '/app/cards' },
    { icon: Truck, label: t('feature.moveIn'), route: '/app/move-in' },
    { icon: Cctv, label: t('feature.cctv'), route: '/app/cctv' },
    { icon: Phone, label: t('feature.numbers'), route: '/app/emergency' },
    { icon: Mail, label: t('feature.feedback'), route: '/app/feedback' },
    { icon: ShoppingBag, label: t('feature.businesses'), route: '/app/businesses' },
  ];

  const lead = next ? (
    <HouseCard photoId={houseFor(ctx.unit)} occupancy={role} label={t('renter.prep')} amount={t(`renter.step.${next.key}`)} note={t('home.prepareCount', { n: done, total: steps.length })}
      action={next.route ? <Button size="sm" onClick={() => nav(next.route!)}>{t('home.doIt')}</Button> : undefined} />
  ) : renter.iplPayer === 'renter' ? (
    <IplHouseCard occupancy={role} />
  ) : (
    <HouseCard photoId={houseFor(ctx.unit)} occupancy={role} label={t('renter.leaseLabel')} amount={formatDate(renter.lease.end, lang)} note={t('home.daysLeft', { n: leftDays })} noteTone={leftDays <= 30 ? 'danger' : 'muted'} />
  );

  return (
    <div>
      <HomeBand
        eyebrow={ctx.project.name}
        greeting={t(greetingKey(), { name: ctx.name.split(' ')[0] })}
        unitLine={t('renter.leaseLine', { unit: ctx.unit.code, start: formatDate(renter.lease.start, lang), end: formatDate(renter.lease.end, lang) })}
        note={t('renter.ownedBy', { owner: ctx.ownerName })}
        right={<LangToggle dark />}
      >
        <HomeTopRow onSearch={() => setSearch(true)} />
      </HomeBand>

      <div className="relative -mt-10 space-y-3 px-4">
        {lead}
        {leftDays <= 30 && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-[#F3D9A4] bg-[#FFF8E8] p-3 text-xs font-medium text-[#8A5A00]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {t('renter.leaseEnding', { n: leftDays, date: formatDate(renter.lease.end, lang) })}
          </div>
        )}
        {next && (
          <Card className="border-l-[3px] border-l-gold p-0">
            <div className="px-4 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold">{t('renter.prep')}</span>
                <span className="text-xs font-medium tabular text-ink/55">{t('home.prepareCount', { n: done, total: steps.length })}</span>
              </div>
              <Progress className="mt-2" value={(done / steps.length) * 100} />
            </div>
            <ul className="mt-2 divide-y divide-line">
              {steps.map((s) => (
                <li key={s.key}>
                  <button disabled={!s.route || s.done} onClick={() => s.route && nav(s.route)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left disabled:cursor-default">
                    <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2', s.done ? 'border-brand-dark bg-brand-dark text-white' : s.key === next.key ? 'border-gold' : 'border-line')}>{s.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
                    <span className={cx('flex-1 text-sm', s.done ? 'text-ink/60' : 'font-semibold')}>{t(`renter.step.${s.key}`)}</span>
                    {!s.done && s.route && <ChevronRight className={cx('h-4 w-4', s.key === next.key ? 'text-brand' : 'text-ink/25')} />}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {renter.iplPayer === 'renter' ? (
          next && (
            <Card className="flex items-center gap-3 p-0 pl-4">
              <div className="min-w-0 flex-1 py-3">
                <p className="text-xs text-ink/55">{t('renter.iplToYou')}</p>
                <p className="text-sm font-semibold">{t('renter.iplAgreement')}</p>
              </div>
              <div className="w-32 shrink-0 border-l border-line"><IplStatus /></div>
            </Card>
          )
        ) : (
          <Card className="py-3 text-xs text-ink/55">{t('renter.iplOwner')}</Card>
        )}

        <Card>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-base font-semibold"><PaintRoller className="h-4 w-4 text-brand-dark" strokeWidth={1.75} />{t('feature.renovation')}</span>
            <Button size="sm" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => nav('/app/renovation')}>{t('renter.request')}</Button>
          </div>
          <p className="mt-1 text-xs text-ink/55">{t('renter.renovationNote')}</p>
          {data.renovations.map((r) => (
            <button key={r.id} onClick={() => nav(`/app/renovation/${r.id}`)} className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 text-left">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{r.id} · {r.title}</span>
                <span className="block text-xs text-ink/45">{t(`reno.step.${r.step}`)}</span>
              </span>
              <StatusPill tone={r.step === 'ownerApproval' ? 'warning' : r.step === 'rejected' ? 'danger' : 'info'}>{t(`reno.short.${r.step}`)}</StatusPill>
            </button>
          ))}
        </Card>
      </div>

      <div className="px-4">
        <Section title={t('home.quick')}>
          <Card className="grid grid-cols-3 gap-x-2 gap-y-4 px-3 py-4">
            {shortcuts.map((s) => <IconTile key={s.label} icon={s.icon} label={s.label} locked={s.route === '/app/cctv' && !renter.movedInAt} onClick={() => nav(s.route)} />)}
          </Card>
        </Section>
        <p className="mt-3 px-1 text-xs leading-relaxed text-ink/45">{t('renter.ownerOnly')}</p>
        <Announcements />
      </div>
      <HomeSearchSheet open={search} onClose={() => setSearch(false)} />
    </div>
  );
}
