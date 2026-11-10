import { CircleAlert, CircleCheck, Eye, Printer } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate, monthOf } from '../../../domain/clock';
import { formatRp } from '../../../domain/money';
import { monthlyReport, reportHealth, unitBillingRows, type Health } from '../../../domain/report';
import type { MonthKey } from '../../../domain/types';
import { useLang, useT } from '../../../i18n';
import { useDashboardProject, useDerived } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { cx } from '../../../ui/cx';
import { Select } from '../../../ui/Field';
import { StatusPill, type PillTone } from '../../../ui/StatusPill';
import { IncomeCostChart } from '../components/IncomeCostChart';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { UnitLink } from '../components/UnitLink';
import { useExpenseNote, usePeriods } from './Finance';

const HEALTH_TONE: Record<Health, PillTone> = { good: 'success', watch: 'warning', attention: 'danger' };
const HEALTH_ICON = { good: CircleCheck, watch: Eye, attention: CircleAlert };

export default function Report() {
  const t = useT();
  const [lang] = useLang();
  const project = useDashboardProject();
  const periods = usePeriods();
  const [month, setMonth] = useState<MonthKey>(periods[0]);
  const noteOf = useExpenseNote();
  const data = useDerived((d) => {
    const r = monthlyReport(d, project.id, month);
    const s = d.projects.find((p) => p.id === project.id)!.settings;
    return {
      r,
      health: reportHealth(r, s.fuel.tolerancePct),
      overdue: unitBillingRows(d, project.id).filter((x) => x.overdueMonths > 0).sort((a, b) => b.overdueAmount - a.overdueAmount).slice(0, 10),
      biggest: d.expenses.filter((e) => e.projectId === project.id && monthOf(e.date) === month).sort((a, b) => b.amount - a.amount).slice(0, 5),
      today: d.today,
    };
  }, [project.id, month]);
  const { r } = data;
  const n1 = (x: number) => x.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', { maximumFractionDigits: 1 });
  const occPct = r.funnel.handover ? Math.round((r.funnel.occupied / r.funnel.handover) * 100) : 0;
  const bullets = [
    t('dash.rep.b.occupancy', { occupied: r.funnel.occupied, handover: r.funnel.handover, pct: occPct }),
    t('dash.rep.b.collection', { rate: r.ipl.collectionRate, paid: r.ipl.paidThisMonth, mustPay: r.ipl.mustPay, overdue: r.ipl.overdueUnits, amount: formatRp(r.ipl.totalOverdue) }),
    t(r.finance.net >= 0 ? 'dash.rep.b.surplus' : 'dash.rep.b.deficit', { amount: formatRp(Math.abs(r.finance.net)), income: formatRp(r.finance.income), cost: formatRp(r.finance.cost), units: r.finance.breakEvenUnits }),
    t('dash.rep.b.complaints', { active: r.complaints.active, days: r.complaints.avgDaysToDone, sla: r.complaints.overSla }),
    ...(r.fuel ? [t(r.fuel.withinTolerance ? 'dash.rep.b.fuelOk' : 'dash.rep.b.fuelBad', { liters: n1(r.fuel.unexplained), pct: n1(r.fuel.unexplainedPct) })] : []),
  ];
  const maxCol = Math.max(1, ...r.complaints.byColumn.map((c) => c.n));
  const funnel = (['akad', 'handover', 'app', 'rules', 'occupied'] as const).map((k) => ({ k, n: r.funnel[k] }));

  return (
    <div className="report">
      <PageHeader
        title={t('dash.rep.title', { month: formatDate(month, lang, 'month') })}
        subtitle={t('dash.rep.sub', { project: project.name, today: formatDate(data.today, lang) })}
        actions={
          <span className="no-print flex gap-2">
            <Select value={month} onChange={(e) => setMonth(e.target.value as MonthKey)} className="!w-auto !py-2 text-sm" aria-label={t('dash.fin.period')}>
              {periods.map((m) => <option key={m} value={m}>{formatDate(m, lang, 'month')}</option>)}
            </Select>
            <Button icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>{t('dash.rep.pdf')}</Button>
          </span>
        }
      />

      <Panel title={t('dash.rep.summary')} className="print-avoid">
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">{bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
      </Panel>

      <div className="print-avoid mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {data.health.map((h) => {
          const Icon = HEALTH_ICON[h.status];
          return (
            <div key={h.key} className="rounded-2xl border border-line/80 bg-white p-4 shadow-card">
              <p className="text-xs font-semibold text-ink/55">{t(`dash.rep.h.${h.key}`)}</p>
              <p className="mt-1 text-xl font-extrabold tabular">{h.key === 'finance' ? `${h.value < 0 ? '−' : ''}${formatRp(Math.abs(h.value))}` : h.key === 'complaints' ? h.value : `${n1(h.value)}%`}</p>
              <StatusPill tone={HEALTH_TONE[h.status]} className="mt-1.5"><Icon className="mr-0.5 inline h-3 w-3" />{t(`dash.rep.status.${h.status}`)}</StatusPill>
              <p className="mt-1.5 text-[11px] leading-snug text-ink/45">{t(`dash.rep.hint.${h.key}`)}</p>
            </div>
          );
        })}
      </div>

      <Panel className="print-avoid mt-4" title={t('dash.rep.priority')} right={t('dash.summary.followCount', { n: r.followUp.length })}>
        {r.followUp.length ? (
          <ol className="list-decimal space-y-1.5 pl-5 text-sm">
            {r.followUp.slice(0, 8).map((f, i) => <li key={i}><StatusPill className="mr-1.5">{t(`dash.tag.${f.tag}`)}</StatusPill>{t(f.text.key, f.text.params)} <Link to={f.link} className="no-print text-xs font-semibold text-brand hover:underline">{t('common.open')}</Link></li>)}
          </ol>
        ) : <p className="text-sm text-ink/50">{t('dash.nothing')}</p>}
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel className="print-avoid" title={`1 · ${t('dash.rep.s.occupancy')}`}>
          <div className="space-y-2">
            {funnel.map((f) => (
              <div key={f.k} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 text-ink/60">{t(`dash.funnel.${f.k}`)}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#EFEDE9]"><span className="block h-full rounded-full bg-brand" style={{ width: `${r.funnel.akad ? (f.n / r.funnel.akad) * 100 : 0}%` }} /></span>
                <b className="w-10 text-right tabular">{f.n}</b>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink/55">{t('dash.rep.compliance', { signed: r.compliance.rulesSigned, occupied: r.compliance.occupied })}</p>
        </Panel>

        <Panel className="print-avoid" title={`2 · ${t('dash.rep.s.ipl')}`} pad={false}>
          <div className="grid grid-cols-3 gap-2 px-5 pt-4 text-center text-sm">
            <Stat label={t('dash.ipl.k.collection')} value={`${r.ipl.collectionRate}%`} />
            <Stat label={t('dash.ipl.k.overdue')} value={String(r.ipl.overdueUnits)} />
            <Stat label={t('dash.rep.totalOverdue')} value={formatRp(r.ipl.totalOverdue)} />
          </div>
          <table className="mt-3 w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wide text-ink/45"><th className="px-5 py-1.5">{t('common.unit')}</th><th>{t('dash.ipl.col.owner')}</th><th className="text-right">{t('dash.ipl.col.overdueMonths')}</th><th className="px-5 text-right">{t('dash.ipl.col.overdue')}</th></tr></thead>
            <tbody>
              {data.overdue.map((x) => (
                <tr key={x.unit.id} className="border-t border-line/70">
                  <td className="px-5 py-1.5"><UnitLink unitId={x.unit.id} /></td>
                  <td className="truncate text-xs">{x.ownerName}</td>
                  <td className="text-right tabular">{x.overdueMonths}{x.needsAction ? ' ⚑' : ''}</td>
                  <td className="px-5 text-right tabular">{formatRp(x.overdueAmount)}</td>
                </tr>
              ))}
              {!data.overdue.length && <tr><td colSpan={4} className="px-5 py-3 text-ink/50">{t('dash.unit.noArrears')}</td></tr>}
            </tbody>
          </table>
          <p className="px-5 py-2 text-[11px] text-ink/45">{t('dash.rep.noFine')}</p>
        </Panel>

        <Panel className="print-avoid" title={`3 · ${t('dash.rep.s.finance')}`}>
          <IncomeCostChart height={200} data={r.finance.recap.map((x) => ({ month: x.month, income: x.iplIncome + x.otherIncome, cost: x.cost }))} />
          <p className="mt-3 text-sm font-bold">{t('dash.rep.biggest')}</p>
          <ul className="mt-1 space-y-1 text-sm">
            {data.biggest.map((e) => <li key={e.id} className="flex justify-between gap-2"><span className="truncate">{t(`dash.fin.cat.${e.category}`)} · <span className="text-ink/55">{noteOf(e)}</span></span><b className="tabular">{formatRp(e.amount)}</b></li>)}
            {!data.biggest.length && <li className="text-ink/50">{t('dash.nothing')}</li>}
          </ul>
          {r.finance.budget.some((b) => b.diff > 0) && (
            <p className="mt-2 text-xs text-[#9E1424]">{t('dash.rep.overBudget', { list: r.finance.budget.filter((b) => b.diff > 0).map((b) => t(`dash.fin.cat.${b.category}`)).join(', ') })}</p>
          )}
        </Panel>

        <Panel className="print-avoid" title={`4 · ${t('dash.rep.s.ops')}`}>
          <p className="text-sm font-bold">{t('dash.rep.complaintStages')}</p>
          <div className="mt-1.5 space-y-1.5">
            {r.complaints.byColumn.map((c) => (
              <div key={c.key} className="flex items-center gap-3 text-xs">
                <span className="w-32 shrink-0 text-ink/60">{t(`dash.cmp.col.${c.key}`)}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#EFEDE9]"><span className="block h-full rounded-full bg-brand" style={{ width: `${(c.n / maxCol) * 100}%` }} /></span>
                <b className="w-6 text-right tabular">{c.n}</b>
              </div>
            ))}
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <Dd label={t('dash.rep.o.renovations')} value={String(r.renovations)} />
            <Dd label={t('dash.rep.o.feedback')} value={t('dash.rep.o.feedbackValue', { replied: r.feedback.replied, total: r.feedback.total })} />
            <Dd label={t('dash.rep.o.mowing')} value={t('dash.rep.o.mowingValue', { done: r.mowing.done, scheduled: r.mowing.scheduled })} />
            <Dd label={t('dash.rep.o.fuel')} value={r.fuel ? `${n1(r.fuel.unexplained)} L · ${n1(r.fuel.unexplainedPct)}%` : '—'} />
            <Dd label={t('dash.rep.o.community')} value={t('dash.rep.o.communityValue', { biz: r.community.businesses, listings: r.community.listings, vouchers: r.community.vouchers })} />
            <Dd label={t('dash.rep.o.cards')} value={t('dash.rep.o.cardsValue', { revenue: formatRp(r.cards.revenue), toMake: r.cards.toMake, ready: r.cards.ready })} />
          </dl>
        </Panel>
      </div>

      <Panel className="print-avoid mt-4" title={t('dash.rep.howTitle')}>
        <dl className="grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
          {(['collection', 'overdue', 'breakEven', 'sla', 'fuel', 'health'] as const).map((k) => (
            <div key={k}><dt className="font-semibold">{t(`dash.rep.g.${k}`)}</dt><dd className="text-ink/60">{t(`dash.rep.g.${k}.body`)}</dd></div>
          ))}
        </dl>
      </Panel>

      <div className="print-avoid mt-6 grid grid-cols-2 gap-8 rounded-2xl border border-line/80 bg-white p-6 text-sm">
        {(['prepared', 'acknowledged'] as const).map((k) => (
          <div key={k}>
            <p className="text-ink/55">{t(`dash.rep.sig.${k}`)}</p>
            <div className="mt-14 border-t border-ink/30 pt-1.5 font-semibold">{t(`dash.rep.sig.${k}Role`)}</div>
            <p className="text-xs text-ink/45">{t('dash.rep.sig.date')}</p>
          </div>
        ))}
      </div>
      <p className={cx('mt-3 text-center text-[11px] text-ink/40')}>{t('dash.rep.footer', { project: project.name, today: formatDate(data.today, lang) })}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#F7F6F3] px-2 py-2"><p className="text-[11px] text-ink/50">{label}</p><p className="text-base font-extrabold tabular">{value}</p></div>;
}
function Dd({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[11px] text-ink/50">{label}</dt><dd className="font-semibold">{value}</dd></div>;
}
