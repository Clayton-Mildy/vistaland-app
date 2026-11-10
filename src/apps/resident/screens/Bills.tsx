import { CheckCircle2, Info, ShieldAlert, Wifi } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { addMonths, dayOfMonth, formatDate, monthOf } from '../../../domain/clock';
import { firstBilledMonth, freeUntilMonth, prepayPlan } from '../../../domain/ipl';
import { formatRp } from '../../../domain/money';
import type { BillStatus, MonthKey, Payment, PrepayPackage } from '../../../domain/types';
import { useLang, useT } from '../../../i18n';
import { payBills } from '../../../store/actions';
import { useData, useDerived, useResident, useRun, useToday } from '../../../store/hooks';
import { AppBar } from '../../../ui/AppBar';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { StatusPill, type PillTone } from '../../../ui/StatusPill';
import { Tabs } from '../../../ui/Tabs';
import { useUnitBills } from '../hooks';
import { PrepayGrid, prepayOptions } from '../PrepayGrid';
import { PaySheet } from './PaySheet';

const TONE: Record<BillStatus, PillTone> = { free: 'info', upcoming: 'neutral', due: 'warning', paid: 'success', overdue: 'danger' };
type PayIntent = { kind: 'ipl' | 'wifi'; months?: MonthKey[]; packageId?: string; amount: number; label: string };

export default function Bills() {
  const t = useT();
  const [params] = useSearchParams();
  const ctx = useResident()!;
  const [tab, setTab] = useState<'ipl' | 'wifi'>(params.get('tab') === 'wifi' ? 'wifi' : 'ipl');
  const [intent, setIntent] = useState<PayIntent | null>(null);
  const run = useRun();
  return (
    <div className="pb-6">
      <AppBar back={false} title={t('bills.title', { unit: ctx.unit.code })} subtitle={ctx.project.name} />
      {ctx.settings.features.wifi && (
        <div className="bg-white px-4">
          <Tabs value={tab} onChange={setTab} items={[{ value: 'ipl', label: 'IPL' }, { value: 'wifi', label: 'WiFi NAV1' }]} />
        </div>
      )}
      <div className="space-y-3 p-4">{tab === 'ipl' ? <IplTab onPay={setIntent} openPrepay={params.get('prepay') === '1'} /> : <WifiTab onPay={setIntent} />}</div>
      {intent && (
        <PaySheet
          open
          onClose={() => setIntent(null)}
          title={t('bills.payTitle')}
          amount={intent.amount}
          vaSeed={ctx.unit.code}
          summary={<p className="text-sm text-ink/60">{intent.label}</p>}
          onPay={(method) => {
            const r = run(payBills, { unitId: ctx.unit.id, kind: intent.kind, months: intent.months, packageId: intent.packageId, method });
            return r.ok ? null : r.error;
          }}
        />
      )}
    </div>
  );
}

function monthRange(months: MonthKey[], lang: 'id' | 'en') {
  if (!months.length) return '';
  const a = formatDate(months[0], lang, 'month');
  return months.length === 1 ? a : `${a} – ${formatDate(months[months.length - 1], lang, 'month')}`;
}

function IplTab({ onPay, openPrepay }: { onPay: (i: PayIntent) => void; openPrepay: boolean }) {
  const t = useT();
  const [lang] = useLang();
  const ctx = useResident()!;
  const today = useToday();
  const bills = useUnitBills('ipl');
  const allBills = useData((d) => d.bills);
  const s = ctx.settings;
  const rate = ctx.type.iplRate;
  const bast = ctx.unit.handover.bastDate;
  const [showAll, setShowAll] = useState(false);
  const [prepayOpen, setPrepayOpen] = useState(openPrepay || ctx.segment === 'komersil');
  const [pkgId, setPkgId] = useState<string | null>(null);
  const payments = useDerived((d) => d.payments.filter((p) => p.unitId === ctx.unit.id && p.kind === 'ipl').sort((a, b) => b.paidAt.localeCompare(a.paidAt)), [ctx.unit.id]);

  if (!bast) return <Card className="text-sm text-ink/60">{t('bills.noBast')}</Card>;
  const overdue = bills.filter((b) => b.status === 'overdue');
  const due = bills.filter((b) => b.status === 'due');
  const payable = [...overdue, ...due];
  const first = firstBilledMonth(bast, s.ipl);
  const lastFree = freeUntilMonth(bast, s.ipl);
  const current = monthOf(today);
  const paidThrough = bills.filter((b) => b.status === 'paid').at(-1)?.month;
  // Consequences are owner-facing: the estate applies and restores them by hand.
  const activeCns = ctx.role === 'owner' ? ctx.unit.consequences.filter((c) => !c.endedAt) : [];
  const isRenterPaid = (m: MonthKey) => ctx.role === 'owner' && bills.find((b) => b.month === m)?.payer === 'renter';

  const packages: PrepayPackage[] = s.features.prepay ? [{ id: 'ipl-1', months: 1, discountType: 'none', value: 0, active: true }, ...s.prepay.ipl.filter((p) => p.active)] : [];
  const { quotes } = prepayOptions(packages, rate);
  const selected = quotes.find((x) => x.p.id === pkgId);
  const prepayExpired = s.prepay.validUntil < today;
  const plan = selected ? (selected.p.id === 'ipl-1' ? prepayPlan(ctx.unit, ctx.type, s, ctx.renter, allBills, today, 1) : prepayPlan(ctx.unit, ctx.type, s, ctx.renter, allBills, today, selected.p.months)) : [];
  const visible = showAll ? bills : bills.filter((b) => b.month >= addMonths(current, -6));

  let hero: { title: string; body: string };
  if (overdue.length) hero = { title: t('bills.hero.overdue', { n: overdue.length }), body: t('bills.hero.overdueBody', { amount: formatRp(overdue.reduce((a, b) => a + b.amount, 0)) }) };
  else if (first > current) hero = { title: t('bills.hero.free', { month: formatDate(lastFree ?? first, lang, 'month') }), body: t('bills.hero.freeBody', { month: formatDate(first, lang, 'month'), due: formatDate(dayOfMonth(first, s.ipl.dueDay), lang), rate: formatRp(rate) }) };
  else if (due.length) hero = { title: t('bills.hero.due', { month: formatDate(due[0].month, lang, 'month') }), body: t('bills.hero.dueBody', { date: formatDate(dayOfMonth(due[0].month, s.ipl.dueDay), lang), amount: formatRp(due[0].amount) }) };
  else hero = { title: t('bills.hero.paid', { month: formatDate(paidThrough ?? current, lang, 'month') }), body: t('bills.hero.paidBody', { rate: formatRp(rate) }) };

  return (
    <>
      <div className={cx('rounded-2xl p-4 text-white', overdue.length ? 'bg-gradient-to-br from-[#B4192A] to-[#7F1220]' : 'bg-gradient-to-br from-brand to-brand-dark')}>
        <p className="text-xs font-semibold text-white/75">{t('bills.statusLabel')}</p>
        <p className="mt-0.5 text-2xl font-extrabold leading-tight">{hero.title}</p>
        <p className="mt-1 text-sm text-white/85">{hero.body}</p>
        <p className="mt-2 text-[11px] text-white/70">{t('bills.rateLine', { type: ctx.type.name, rate: formatRp(rate) })}</p>
        {payable.length > 0 && (
          <Button
            className="mt-3 !bg-white !bg-none !text-ink !shadow-none"
            block
            onClick={() => onPay({ kind: 'ipl', months: payable.map((b) => b.month), amount: payable.reduce((a, b) => a + b.amount, 0), label: t('bills.payMonths', { months: monthRange(payable.map((b) => b.month), lang) }) })}
          >
            {t('bills.payNow', { amount: formatRp(payable.reduce((a, b) => a + b.amount, 0)) })}
          </Button>
        )}
      </div>
      {overdue.length > 0 && <p className="flex items-start gap-2 px-1 text-xs text-ink/55"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />{t('bills.noFine')}</p>}
      {activeCns.length > 0 && (
        <div className="rounded-2xl border border-[#F3C5CA] bg-[#FFF5F6] p-3 text-sm text-[#7A1220]">
          <p className="flex items-center gap-1.5 font-bold"><ShieldAlert className="h-4 w-4" />{t('bills.cns.title')}</p>
          <ul className="mt-1 space-y-0.5">
            {activeCns.map((c) => <li key={c.id}>{t(`bills.cns.${c.type}`, { date: formatDate(c.startedAt, lang) })}</li>)}
          </ul>
          <p className="mt-1.5 text-xs text-[#7A1220]/75">{t('bills.cns.body')}</p>
        </div>
      )}

      <Card className="divide-y divide-line p-0">
        {visible.map((b) => (
          <div key={b.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-semibold">{formatDate(b.month, lang, 'month')}</p>
              <p className="text-[11px] text-ink/45">
                {b.free ? t('bills.row.free') : b.status === 'overdue' ? t('bills.row.late', { date: formatDate(dayOfMonth(b.month, s.ipl.dueDay), lang) }) : b.status === 'paid' ? formatRp(b.amount) : t('bills.row.due', { date: formatDate(dayOfMonth(b.month, s.ipl.dueDay), lang), amount: formatRp(b.amount) })}
                {isRenterPaid(b.month) && ` · ${t('bills.row.renter')}`}
              </p>
            </div>
            <StatusPill tone={TONE[b.status]}>{t(`status.${b.status}`)}</StatusPill>
          </div>
        ))}
        {bills.length > visible.length && (
          <button onClick={() => setShowAll(true)} className="w-full py-3 text-center text-xs font-bold text-brand-dark">{t('bills.showAll', { n: bills.length - visible.length })}</button>
        )}
      </Card>

      {packages.length > 1 && (
        <Card>
          <div className="flex items-center justify-between">
            <span className="font-bold">{t('bills.prepayTitle')}</span>
            {ctx.segment === 'subsidi' && !prepayOpen ? (
              <Button size="sm" variant="secondary" onClick={() => setPrepayOpen(true)}>{t('bills.prepayOptional')}</Button>
            ) : (
              <span className="text-[11px] text-ink/45">{t('bills.validUntil', { date: formatDate(s.prepay.validUntil, lang) })}</span>
            )}
          </div>
          {prepayOpen && (
            <>
              {prepayExpired ? (
                <p className="mt-2 text-sm text-ink/55">{t('bills.prepayExpired')}</p>
              ) : (
                <div className="mt-3"><PrepayGrid packages={packages} rate={rate} selectedId={pkgId} onSelect={setPkgId} /></div>
              )}
              {selected && plan.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between rounded-xl bg-brand-tint/50 px-3 py-2.5 text-sm">
                    <span>{t('bills.planLine', { n: selected.p.months, range: monthRange(plan, lang) })}</span>
                    <b className="tabular">{formatRp(selected.q.net)}</b>
                  </div>
                  {overdue.length > 0 && s.prepay.noArrearsOnly && selected.p.id !== 'ipl-1' && <p className="text-xs font-medium text-[#B4192A]">{t('error.prepayArrears')}</p>}
                  <Button
                    block
                    size="lg"
                    onClick={() =>
                      onPay(
                        selected.p.id === 'ipl-1'
                          ? { kind: 'ipl', months: plan, amount: selected.q.net, label: t('bills.payMonths', { months: monthRange(plan, lang) }) }
                          : { kind: 'ipl', packageId: selected.p.id, amount: selected.q.net, label: t('bills.planLine', { n: selected.p.months, range: monthRange(plan, lang) }) },
                      )
                    }
                  >
                    {t('bills.payVia', { amount: formatRp(selected.q.net) })}
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      )}
      <p className="px-1 text-xs text-ink/50">{t('bills.vaNote')}</p>
      <History payments={payments} />
    </>
  );
}

function History({ payments }: { payments: Payment[] }) {
  const t = useT();
  const [lang] = useLang();
  return (
    <Card>
      <p className="font-bold">{t('bills.history')}</p>
      {payments.length === 0 ? (
        <p className="mt-1 text-sm text-ink/50">{t('bills.noHistory')}</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {payments.slice(0, 8).map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-semibold">{monthRange(p.months ?? [], lang)}</p>
                <p className="text-[11px] text-ink/45">
                  {formatDate(p.paidAt.slice(0, 10), lang)} · {t(`method.${p.method}`)}{p.recordedBy === 'admin' ? ` · ${t('bills.byEstate')}` : ''}
                  {p.discount > 0 && ` · ${t('bills.discount', { amount: formatRp(p.discount) })}`}
                </p>
              </div>
              <span className="flex items-center gap-1 text-sm font-bold tabular"><CheckCircle2 className="h-4 w-4 text-[#17703D]" />{formatRp(p.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function WifiTab({ onPay }: { onPay: (i: PayIntent) => void }) {
  const t = useT();
  const [lang] = useLang();
  const nav = useNavigate();
  const ctx = useResident()!;
  const sub = useData((d) => d.wifi.find((w) => w.unitId === ctx.unit.id));
  const bills = useUnitBills('wifi');
  const payments = useDerived((d) => d.payments.filter((p) => p.unitId === ctx.unit.id && p.kind === 'wifi').sort((a, b) => b.paidAt.localeCompare(a.paidAt)), [ctx.unit.id]);
  const pkg = sub && ctx.settings.wifi.packages.find((p) => p.id === sub.packageId);
  if (!sub || !pkg) {
    return (
      <Card className="flex flex-col items-center py-8 text-center">
        <Wifi className="h-10 w-10 text-brand" />
        <p className="mt-2 font-bold">{t('bills.wifiNone')}</p>
        <p className="mt-1 text-sm text-ink/55">{ctx.settings.wifi.promoEnabled ? t('status.wifi.promo', { n: ctx.settings.wifi.freeMonths }) : t('wifi.noPromo')}</p>
        <Button className="mt-4" onClick={() => nav('/app/wifi')}>{t('status.wifi.choose')}</Button>
      </Card>
    );
  }
  const payable = bills.filter((b) => b.status === 'overdue' || b.status === 'due');
  const prepay = ctx.settings.prepay.wifi.filter((p) => p.active);
  return (
    <>
      <div className="rounded-2xl bg-gradient-to-br from-[#2463C9] to-[#173F87] p-4 text-white">
        <p className="text-xs font-semibold text-white/75">WiFi NAV1</p>
        <p className="text-2xl font-extrabold">{pkg.name} · {pkg.mbps} Mbps</p>
        <p className="mt-1 text-sm text-white/85">{sub.status !== 'installed' ? t('wifi.waiting') : sub.freeUntil ? t('bills.wifiFree', { month: formatDate(sub.freeUntil, lang, 'month'), price: formatRp(pkg.price) }) : t('bills.wifiPrice', { price: formatRp(pkg.price) })}</p>
        {payable.length > 0 && (
          <Button className="mt-3 !bg-white !bg-none !text-ink !shadow-none" block onClick={() => onPay({ kind: 'wifi', months: payable.map((b) => b.month), amount: payable.reduce((a, b) => a + b.amount, 0), label: t('bills.payMonths', { months: monthRange(payable.map((b) => b.month), lang) }) })}>
            {t('bills.payNow', { amount: formatRp(payable.reduce((a, b) => a + b.amount, 0)) })}
          </Button>
        )}
      </div>
      {bills.length > 0 && (
        <Card className="divide-y divide-line p-0">
          {bills.slice(-8).map((b) => (
            <div key={b.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-semibold">{formatDate(b.month, lang, 'month')}</span>
              <span className="flex items-center gap-2 text-xs text-ink/50">{!b.free && formatRp(b.amount)}<StatusPill tone={TONE[b.status]}>{t(`status.${b.status}`)}</StatusPill></span>
            </div>
          ))}
        </Card>
      )}
      {sub.status === 'installed' && prepay.length > 0 && (
        <Card>
          <p className="font-bold">{t('bills.wifiPrepay')}</p>
          <div className="mt-2">
            <PrepayGrid
              packages={prepay}
              rate={pkg.price}
              onSelect={(id) => {
                const { quotes: wq } = prepayOptions(prepay, pkg.price);
                const o = wq.find((x) => x.p.id === id)!;
                onPay({ kind: 'wifi', packageId: id, amount: o.q.net, label: t('bills.wifiPlan', { n: o.p.months }) });
              }}
            />
          </div>
        </Card>
      )}
      <History payments={payments} />
    </>
  );
}
