import { CheckCircle2, Info, ShieldAlert, Wifi } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { addMonths, dayOfMonth, formatDate, monthOf } from '../../../domain/clock';
import { firstBilledMonth, freeUntilMonth, prepayPlan } from '../../../domain/ipl';
import { formatRp } from '../../../domain/money';
import type { BillStatus, MonthKey, Payment, PrepayPackage } from '../../../domain/types';
import { useLang, useT } from '../../../i18n';
import { payBills } from '../../../store/actions';
import { useData, useDerived, useResident, useRun, useToday } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { StatusPill, type PillTone } from '../../../ui/StatusPill';
import { useUnitBills } from '../hooks';
import { ScreenBody } from '../ui/ScreenBody';
import { ScreenHeader } from '../ui/ScreenHeader';
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
  const switcher = ctx.settings.features.wifi ? <TabSwitch value={tab} onChange={setTab} /> : undefined;
  return (
    <div>
      {tab === 'ipl' ? <IplTab onPay={setIntent} openPrepay={params.get('prepay') === '1'} switcher={switcher} /> : <WifiTab onPay={setIntent} switcher={switcher} />}
      {intent && (
        <PaySheet
          open
          onClose={() => setIntent(null)}
          title={t('bills.payTitle')}
          amount={intent.amount}
          vaSeed={ctx.unit.code}
          summary={<p className="text-sm text-ink/60">{intent.label}</p>}
          onPay={(method) => {
            const r = run(payBills, { unitId: ctx.unit.id, kind: intent.kind, months: intent.months, packageId: intent.packageId, method, payer: ctx.role === 'renter' ? 'renter' : 'owner' });
            return r.ok ? null : r.error;
          }}
        />
      )}
    </div>
  );
}

/** IPL / WiFi switch that sits in the title band. */
function TabSwitch({ value, onChange }: { value: 'ipl' | 'wifi'; onChange: (v: 'ipl' | 'wifi') => void }) {
  return (
    <div className="flex shrink-0 rounded-full bg-white/[0.14] p-0.5" role="tablist">
      {(['ipl', 'wifi'] as const).map((v) => (
        <button key={v} role="tab" aria-selected={value === v} onClick={() => onChange(v)} className={cx('rounded-full px-3 py-1 text-xs font-medium transition', value === v ? 'bg-white text-ink' : 'text-white/80 hover:text-white')}>
          {v === 'ipl' ? 'IPL' : 'WiFi'}
        </button>
      ))}
    </div>
  );
}

function monthRange(months: MonthKey[], lang: 'id' | 'en') {
  if (!months.length) return '';
  const a = formatDate(months[0], lang, 'month');
  return months.length === 1 ? a : `${a} – ${formatDate(months[months.length - 1], lang, 'month')}`;
}

function IplTab({ onPay, openPrepay, switcher }: { onPay: (i: PayIntent) => void; openPrepay: boolean; switcher?: ReactNode }) {
  const t = useT();
  const [lang] = useLang();
  const ctx = useResident()!;
  const today = useToday();
  const bills = useUnitBills('ipl');
  const payerFilter = ctx.role === 'renter' ? ('renter' as const) : undefined;
  const allBills = useData((d) => d.bills);
  const s = ctx.settings;
  const rate = ctx.type.iplRate;
  const bast = ctx.unit.handover.bastDate;
  const [showAll, setShowAll] = useState(false);
  const [prepayOpen, setPrepayOpen] = useState(openPrepay || ctx.segment === 'komersil');
  const [pkgId, setPkgId] = useState<string | null>(null);
  const payments = useDerived((d) => d.payments.filter((p) => p.unitId === ctx.unit.id && p.kind === 'ipl').sort((a, b) => b.paidAt.localeCompare(a.paidAt)), [ctx.unit.id]);

  const header = (figure?: ReactNode, sub?: ReactNode) => <ScreenHeader back={false} title={t('nav.bills')} right={switcher} eyebrow={`IPL · ${ctx.unit.code}`} figure={figure} sub={sub} />;
  if (!bast) return <>{header(undefined, ctx.project.name)}<ScreenBody><Card className="text-sm text-ink/60">{t('bills.noBast')}</Card></ScreenBody></>;
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

  const planFor = (n: number) => prepayPlan(ctx.unit, ctx.type, s, ctx.renter, allBills, today, n, payerFilter);
  // Only offer packages that can be filled with billed months (a renter's lease may end sooner).
  const packages: PrepayPackage[] = s.features.prepay ? [{ id: 'ipl-1', months: 1, discountType: 'none' as const, value: 0, active: true }, ...s.prepay.ipl.filter((p) => p.active)].filter((p) => planFor(p.months).length >= p.months) : [];
  const { quotes } = prepayOptions(packages, rate);
  const selected = quotes.find((x) => x.p.id === pkgId);
  const prepayExpired = s.prepay.validUntil < today;
  const plan = selected ? planFor(selected.p.months) : [];
  const visible = showAll ? bills : bills.filter((b) => b.month >= addMonths(current, -6));

  const payableTotal = payable.reduce((a, b) => a + b.amount, 0);
  // The band's key figure: the amount to pay, else the free or paid-through month.
  let head: { figure: string; sub: string };
  if (overdue.length) head = { figure: formatRp(payableTotal), sub: t('bills.head.overdue', { n: overdue.length }) };
  else if (first > current) head = { figure: t('bills.hero.free', { month: formatDate(lastFree ?? first, lang, 'month') }), sub: t('bills.hero.freeBody', { month: formatDate(first, lang, 'month'), due: formatDate(dayOfMonth(first, s.ipl.dueDay), lang), rate: formatRp(rate) }) };
  else if (due.length) head = { figure: formatRp(payableTotal), sub: t('bills.head.due', { date: formatDate(dayOfMonth(due[0].month, s.ipl.dueDay), lang) }) };
  else head = { figure: t('bills.hero.paid', { month: formatDate(paidThrough ?? current, lang, 'month') }), sub: t('bills.hero.paidBody', { rate: formatRp(rate) }) };

  return (
    <>
      {header(head.figure, head.sub)}
      <ScreenBody>
      <Card>
        {payable.length > 0 ? (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-ink/60">{t('bills.payMonths', { months: monthRange(payable.map((b) => b.month), lang) })}</span>
              <span className="text-base font-semibold tabular">{formatRp(payableTotal)}</span>
            </div>
            <Button className="mt-3" block onClick={() => onPay({ kind: 'ipl', months: payable.map((b) => b.month), amount: payableTotal, label: t('bills.payMonths', { months: monthRange(payable.map((b) => b.month), lang) }) })}>
              {t('bills.payNow', { amount: formatRp(payableTotal) })}
            </Button>
            {overdue.length > 0 && <p className="mt-3 flex items-start gap-2 text-xs text-ink/55"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />{t('bills.noFine')}</p>}
          </>
        ) : (
          <p className="text-sm text-ink/60">{t('bills.rateLine', { type: ctx.type.name, rate: formatRp(rate) })}</p>
        )}
      </Card>
      {activeCns.length > 0 && (
        <div className="rounded-2xl border border-[#F3C5CA] bg-[#FFF5F6] p-4 text-sm text-[#7A1220]">
          <p className="flex items-center gap-1.5 font-semibold"><ShieldAlert className="h-4 w-4" />{t('bills.cns.title')}</p>
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
              <p className="text-sm font-medium">{formatDate(b.month, lang, 'month')}</p>
              <p className="text-xs text-ink/45">
                {b.free ? t('bills.row.free') : b.status === 'overdue' ? t('bills.row.late', { date: formatDate(dayOfMonth(b.month, s.ipl.dueDay), lang) }) : b.status === 'paid' ? formatRp(b.amount) : t('bills.row.due', { date: formatDate(dayOfMonth(b.month, s.ipl.dueDay), lang), amount: formatRp(b.amount) })}
                {isRenterPaid(b.month) && ` · ${t('bills.row.renter')}`}
              </p>
            </div>
            <StatusPill tone={TONE[b.status]}>{t(`status.${b.status}`)}</StatusPill>
          </div>
        ))}
        {bills.length > visible.length && (
          <button onClick={() => setShowAll(true)} className="w-full py-3 text-center text-xs font-medium text-brand">{t('bills.showAll', { n: bills.length - visible.length })}</button>
        )}
      </Card>

      {packages.length > 1 && (
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold">{t('bills.prepayTitle')}</span>
            {ctx.segment === 'subsidi' && !prepayOpen ? (
              <Button size="sm" variant="secondary" onClick={() => setPrepayOpen(true)}>{t('bills.prepayOptional')}</Button>
            ) : (
              <span className="shrink-0 text-xs text-ink/45">{t('bills.validUntil', { date: formatDate(s.prepay.validUntil, lang) })}</span>
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
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-paper px-3 py-2.5 text-sm">
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
      </ScreenBody>
    </>
  );
}

function History({ payments }: { payments: Payment[] }) {
  const t = useT();
  const [lang] = useLang();
  return (
    <Card>
      <p className="text-base font-semibold">{t('bills.history')}</p>
      {payments.length === 0 ? (
        <p className="mt-1 text-sm text-ink/50">{t('bills.noHistory')}</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {payments.slice(0, 8).map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium">{monthRange(p.months ?? [], lang)}</p>
                <p className="text-xs text-ink/45">
                  {formatDate(p.paidAt.slice(0, 10), lang)} · {t(`method.${p.method}`)}{p.recordedBy === 'admin' ? ` · ${t('bills.byEstate')}` : ''}
                  {p.discount > 0 && ` · ${t('bills.discount', { amount: formatRp(p.discount) })}`}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-sm font-semibold tabular"><CheckCircle2 className="h-4 w-4 text-[#17703D]" />{formatRp(p.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function WifiTab({ onPay, switcher }: { onPay: (i: PayIntent) => void; switcher?: ReactNode }) {
  const t = useT();
  const [lang] = useLang();
  const nav = useNavigate();
  const ctx = useResident()!;
  const sub = useData((d) => d.wifi.find((w) => w.unitId === ctx.unit.id));
  const bills = useUnitBills('wifi');
  const payments = useDerived((d) => d.payments.filter((p) => p.unitId === ctx.unit.id && p.kind === 'wifi').sort((a, b) => b.paidAt.localeCompare(a.paidAt)), [ctx.unit.id]);
  const pkg = sub && ctx.settings.wifi.packages.find((p) => p.id === sub.packageId);
  const header = (figure: ReactNode, sub?: ReactNode) => <ScreenHeader back={false} title={t('nav.bills')} right={switcher} eyebrow={`WiFi NAV1 · ${ctx.unit.code}`} figure={figure} sub={sub} />;
  if (!sub || !pkg) {
    return (
      <>
        {header(t('bills.wifiNone'))}
        <ScreenBody>
          <Card className="flex flex-col items-center py-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint text-brand-dark"><Wifi className="h-6 w-6" strokeWidth={1.75} /></span>
            <p className="mt-3 text-base font-semibold">{t('bills.wifiNone')}</p>
            <p className="mt-1 text-sm text-ink/55">{ctx.settings.wifi.promoEnabled ? t('status.wifi.promo', { n: ctx.settings.wifi.freeMonths }) : t('wifi.noPromo')}</p>
            <Button className="mt-4" onClick={() => nav('/app/wifi')}>{t('status.wifi.choose')}</Button>
          </Card>
        </ScreenBody>
      </>
    );
  }
  const payable = bills.filter((b) => b.status === 'overdue' || b.status === 'due');
  const payableTotal = payable.reduce((a, b) => a + b.amount, 0);
  const prepay = ctx.settings.prepay.wifi.filter((p) => p.active);
  return (
    <>
      {header(`${pkg.name} · ${pkg.mbps} Mbps`, sub.status !== 'installed' ? t(`status.wifi.${sub.status}`) : sub.freeUntil ? t('bills.wifiFree', { month: formatDate(sub.freeUntil, lang, 'month'), price: formatRp(pkg.price) }) : t('bills.wifiPrice', { price: formatRp(pkg.price) }))}
      <ScreenBody>
      <Card>
        {payable.length > 0 ? (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-ink/60">{t('bills.payWifiMonths', { months: monthRange(payable.map((b) => b.month), lang) })}</span>
              <span className="text-base font-semibold tabular">{formatRp(payableTotal)}</span>
            </div>
            <Button className="mt-3" block onClick={() => onPay({ kind: 'wifi', months: payable.map((b) => b.month), amount: payableTotal, label: t('bills.payWifiMonths', { months: monthRange(payable.map((b) => b.month), lang) }) })}>
              {t('bills.payNow', { amount: formatRp(payableTotal) })}
            </Button>
          </>
        ) : (
          <p className="text-sm text-ink/60">{sub.status !== 'installed' ? t('wifi.waiting') : t('wifi.billsNote')}</p>
        )}
      </Card>
      {bills.length > 0 && (
        <Card className="divide-y divide-line p-0">
          {bills.slice(-8).map((b) => (
            <div key={b.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium">{formatDate(b.month, lang, 'month')}</span>
              <span className="flex items-center gap-2 text-xs text-ink/50">{!b.free && formatRp(b.amount)}<StatusPill tone={TONE[b.status]}>{t(`status.${b.status}`)}</StatusPill></span>
            </div>
          ))}
        </Card>
      )}
      {sub.status === 'installed' && prepay.length > 0 && (
        <Card>
          <p className="text-base font-semibold">{t('bills.wifiPrepay')}</p>
          <div className="mt-3">
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
      </ScreenBody>
    </>
  );
}
