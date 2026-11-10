import { Check, Download, Fuel, Gauge, ImagePlus, RotateCcw, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { addMonths, formatDate, monthOf } from '../../../domain/clock';
import { fuelFlags, fuelReconciliation, machineEfficiency, zoneStats } from '../../../domain/finance';
import { formatRp } from '../../../domain/money';
import { monthlyReport } from '../../../domain/report';
import type { Expense, ExpenseCategory, MonthKey } from '../../../domain/types';
import { useLang, useT } from '../../../i18n';
import { addExpense, addFuelEntry, reviewMowingLog, updateSettings } from '../../../store/actions';
import { useDashboardProject, useDerived, useRun } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Chip } from '../../../ui/Chip';
import { cx } from '../../../ui/cx';
import { DataTable } from '../../../ui/DataTable';
import { Checkbox, Field, Input, Select } from '../../../ui/Field';
import { Kpi } from '../../../ui/Kpi';
import { Photo } from '../../../ui/Photo';
import { PhotoPicker } from '../../../ui/PhotoPicker';
import { StatusPill } from '../../../ui/StatusPill';
import { useToast } from '../../../ui/Toast';
import { IncomeCostChart } from '../components/IncomeCostChart';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { ADMIN_BY, downloadCsv } from '../util';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['satpam', 'tukangTaman', 'listrik', 'kolamRenang', 'angkutSampah', 'landscape', 'clubhouse', 'lainnya'];

/** Expense note shown in the current language; fuel purchases are generated in Indonesian with the litres in them. */
export function useExpenseNote() {
  const t = useT();
  return (e: Expense) => (e.source === 'fuel' ? t('dash.fin.fuelNote', { liters: e.note.match(/([\d.,]+) L/)?.[1] ?? '' }) : e.note);
}

export function usePeriods(n = 6) {
  const today = useDerived((d) => d.today);
  return Array.from({ length: n }, (_, i) => addMonths(monthOf(today), -i));
}

export default function Finance() {
  const t = useT();
  const [lang] = useLang();
  const project = useDashboardProject();
  const periods = usePeriods();
  const [month, setMonth] = useState<MonthKey>(periods[0]);
  const noteOf = useExpenseNote();
  const data = useDerived((d) => {
    const r = monthlyReport(d, project.id, month);
    const expenses = d.expenses.filter((e) => e.projectId === project.id).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    return { r, expenses, hasGarden: d.zones.some((z) => z.projectId === project.id) };
  }, [project.id, month]);
  const f = data.r.finance;
  const exportCsv = () =>
    downloadCsv(`biaya-${project.id}-${month}.csv`, [
      [t('common.date'), t('dash.fin.category'), t('dash.fin.amount'), t('common.notes'), t('dash.fin.recurring')],
      ...data.expenses.filter((e) => monthOf(e.date) === month).map((e) => [e.date, t(`dash.fin.cat.${e.category}`), e.amount, noteOf(e), e.recurring ? t('common.yes') : '']),
    ]);

  return (
    <div>
      <PageHeader
        title={t('dash.fin.title')}
        subtitle={t('dash.fin.sub')}
        actions={
          <>
            <Select value={month} onChange={(e) => setMonth(e.target.value as MonthKey)} className="!w-auto !py-2 text-sm" aria-label={t('dash.fin.period')}>
              {periods.map((m) => <option key={m} value={m}>{formatDate(m, lang, 'month')}</option>)}
            </Select>
            <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={exportCsv}>{t('common.export')}</Button>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t('dash.fin.k.income')} value={formatRp(f.income)} sub={t('dash.fin.k.incomeSub')} />
        <Kpi label={t('dash.fin.k.cost')} value={formatRp(f.cost)} sub={t('dash.fin.k.costSub')} />
        <Kpi label={f.net >= 0 ? t('dash.fin.k.surplus') : t('dash.fin.k.deficit')} value={formatRp(Math.abs(f.net))} sub={formatDate(month, lang, 'month')} tone={f.net >= 0 ? 'success' : 'danger'} />
        <Kpi label={t('dash.fin.k.breakEven')} value={t('dash.fin.k.units', { n: f.breakEvenUnits })} sub={t('dash.fin.k.breakEvenSub', { paid: data.r.finance.recap.at(-1)!.unitsPaid })} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <ExpenseForm />
        <Panel title={t('dash.fin.budget')} right={formatDate(month, lang, 'month')}>
          <BudgetTable rows={f.budget} />
        </Panel>
      </div>

      <Panel className="mt-4" title={t('dash.fin.sixMonths')}>
        <IncomeCostChart data={f.recap.map((x) => ({ month: x.month, income: x.iplIncome + x.otherIncome, cost: x.cost }))} />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wide text-ink/45">
              <th className="py-2">{t('dash.fin.month')}</th><th className="text-right">{t('dash.fin.unitsPaid')}</th><th className="text-right">IPL</th><th className="text-right">{t('dash.fin.other')}</th><th className="text-right">{t('dash.fin.cost')}</th><th className="text-right">{t('dash.fin.net')}</th>
            </tr></thead>
            <tbody>
              {f.recap.map((x) => (
                <tr key={x.month} className={cx('border-t border-line/70', x.month === month && 'bg-brand-tint/40 font-semibold')}>
                  <td className="py-2">{formatDate(x.month, lang, 'month')}</td>
                  <td className="text-right tabular">{x.unitsPaid}</td>
                  <td className="text-right tabular">{formatRp(x.iplIncome)}</td>
                  <td className="text-right tabular">{formatRp(x.otherIncome)}</td>
                  <td className="text-right tabular">{formatRp(x.cost)}</td>
                  <td className={cx('text-right tabular', x.net < 0 ? 'text-[#B4192A]' : 'text-[#17703D]')}>{x.net < 0 ? '−' : ''}{formatRp(Math.abs(x.net))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {data.hasGarden && <FuelSection month={month} />}

      <Panel className="mt-4" title={t('dash.fin.latest')} right={t('dash.fin.latestHint')} pad={false}>
        <DataTable
          rows={data.expenses.slice(0, 25)}
          rowKey={(e) => e.id}
          empty={t('dash.nothing')}
          columns={[
            { key: 'date', header: t('common.date'), render: (e) => <span className="text-xs">{formatDate(e.date, lang, 'short')}</span> },
            { key: 'cat', header: t('dash.fin.category'), render: (e) => <span className="text-sm">{t(`dash.fin.cat.${e.category}`)}</span> },
            { key: 'note', header: t('common.notes'), render: (e) => <span className="text-xs text-ink/70">{noteOf(e)}{e.recurring && <StatusPill className="ml-1.5">{t('dash.fin.recurring')}</StatusPill>}{e.source === 'fuel' && <StatusPill tone="info" className="ml-1.5">{t('dash.fin.fromGardener')}</StatusPill>}</span> },
            { key: 'rcpt', header: t('dash.fin.receipt'), render: (e) => (e.receiptPhotoId ? <Photo id={e.receiptPhotoId} className="h-8 w-8 rounded-md" /> : <span className="text-ink/30">—</span>) },
            { key: 'amt', header: t('dash.fin.amount'), align: 'right', render: (e) => <b className="tabular">{formatRp(e.amount)}</b> },
          ]}
        />
      </Panel>
    </div>
  );
}

function ExpenseForm() {
  const t = useT();
  const run = useRun();
  const toast = useToast();
  const project = useDashboardProject();
  const today = useDerived((d) => d.today);
  const [category, setCategory] = useState<ExpenseCategory>('listrik');
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [receipt, setReceipt] = useState<string | undefined>();
  const [recurring, setRecurring] = useState(false);
  const value = Number(amount.replace(/\D/g, '')) || 0;
  const save = () => {
    const r = run(addExpense, { projectId: project.id, category, date, amount: value, note: note.trim(), receiptPhotoId: receipt, recurring });
    if (!r.ok) return toast.show(t(r.error), 'error');
    toast.show(t('dash.fin.saved', { amount: formatRp(value) }), 'success');
    setAmount(''); setNote(''); setReceipt(undefined); setRecurring(false);
  };
  return (
    <Panel title={t('dash.fin.add')}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {EXPENSE_CATEGORIES.map((c) => <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{t(`dash.fin.cat.${c}`)}</Chip>)}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('common.date')}><Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label={t('dash.fin.amount')}><Input inputMode="numeric" value={amount ? formatRp(value).replace('Rp', '') : ''} onChange={(e) => setAmount(e.target.value)} placeholder="2.200.000" /></Field>
        </div>
        <Field label={t('common.notes')} optional={t('common.optional')}><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('dash.fin.notePh')} /></Field>
        <Field label={t('dash.fin.receipt')} optional={t('common.optional')}>
          <div className="flex items-center gap-2">
            {receipt ? <Photo id={receipt} className="h-14 w-14 rounded-lg" /> : <ImagePlus className="h-5 w-5 text-ink/30" />}
            <PhotoPicker onPicked={(p) => setReceipt(p.id)} selectedId={receipt} />
          </div>
        </Field>
        <Checkbox checked={recurring} onChange={setRecurring}>{t('dash.fin.recurringLabel')}</Checkbox>
        <Button block disabled={!value} onClick={save}>{t('dash.fin.addBtn')}</Button>
      </div>
    </Panel>
  );
}

function BudgetTable({ rows }: { rows: { category: ExpenseCategory; budget: number; actual: number; diff: number }[] }) {
  const t = useT();
  const shown = rows.filter((r) => r.budget > 0 || r.actual > 0);
  return (
    <div className="space-y-2.5">
      {shown.map((r) => {
        const pct = r.budget ? Math.round((r.actual / r.budget) * 100) : 100;
        const over = r.actual > r.budget;
        return (
          <div key={r.category}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-semibold">{t(`dash.fin.cat.${r.category}`)}</span>
              <span className="tabular text-xs text-ink/60">{formatRp(r.actual)} / {formatRp(r.budget)}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#EFEDE9]">
                <div className={cx('h-full rounded-full', over ? 'bg-[#C81E2E]' : 'bg-brand')} style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
              <span className={cx('w-24 text-right text-[11px] font-semibold', over ? 'text-[#B4192A]' : 'text-ink/50')}>
                {over ? <span className="inline-flex items-center gap-0.5"><TriangleAlert className="h-3 w-3" />{t('dash.fin.over', { amount: formatRp(r.diff) })}</span> : `${pct}%`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FuelSection({ month }: { month: MonthKey }) {
  const t = useT();
  const [lang] = useLang();
  const run = useRun();
  const toast = useToast();
  const project = useDashboardProject();
  const data = useDerived((d) => {
    const s = d.projects.find((p) => p.id === project.id)!.settings.fuel;
    const zones = d.zones.filter((z) => z.projectId === project.id);
    const machines = d.machines.filter((m) => m.projectId === project.id);
    const logs = d.mowingLogs.filter((l) => zones.some((z) => z.id === l.zoneId));
    const fuel = d.fuel.filter((x) => x.projectId === project.id);
    return {
      s, zones, machines, today: d.today,
      rec: fuelReconciliation(fuel, logs, s, month),
      machinesEff: machineEfficiency(machines, fuel, logs, s, month),
      zoneRows: zoneStats(zones, logs, s, month, d.today),
      flags: fuelFlags(fuel, logs, zones, machines, s, month, d.today),
      queue: logs.filter((l) => l.status !== 'approved').sort((a, b) => b.date.localeCompare(a.date)),
      zoneName: new Map(zones.map((z) => [z.id, z.name])),
      staffName: new Map(d.staff.map((x) => [x.id, x.name])),
      gardenerId: d.staff.find((x) => x.role === 'gardener' && x.projectIds.includes(project.id))?.id ?? 'estate',
    };
  }, [project.id, month]);
  const [std, setStd] = useState(String(data.s.litersPer1000m2));
  const [tol, setTol] = useState(String(data.s.tolerancePct));
  const [check, setCheck] = useState('');
  useEffect(() => { setStd(String(data.s.litersPer1000m2)); setTol(String(data.s.tolerancePct)); }, [data.s]);
  const rec = data.rec;
  /** Litres and ratios in the reader's number format (12,1 in Indonesian, 12.1 in English). */
  const n1 = (x: number) => x.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', { maximumFractionDigits: 2 });
  const dirty = Number(std) !== data.s.litersPer1000m2 || Number(tol) !== data.s.tolerancePct;
  const saveStd = () => {
    const r = run(updateSettings, { projectId: project.id, patch: { fuel: { litersPer1000m2: Number(std), tolerancePct: Number(tol) } }, by: ADMIN_BY });
    toast.show(r.ok ? t('dash.fin.fuel.stdSaved') : t(r.error), r.ok ? undefined : 'error');
  };
  const saveCheck = () => {
    const liters = Number(check.replace(',', '.'));
    const r = run(addFuelEntry, { projectId: project.id, gardenerId: data.gardenerId, kind: 'check', liters });
    if (!r.ok) return toast.show(t(r.error), 'error');
    toast.show(t('dash.fin.fuel.checkSaved', { n: liters }));
    setCheck('');
  };
  const review = (id: string, decision: 'approved' | 'rephoto') => {
    const r = run(reviewMowingLog, { id, decision, note: decision === 'rephoto' ? t('dash.fin.fuel.rephotoNote') : undefined });
    toast.show(r.ok ? t(decision === 'approved' ? 'dash.fin.fuel.approved' : 'dash.fin.fuel.rephotoSent') : t(r.error), r.ok ? undefined : 'error');
  };

  return (
    <section className="mt-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold"><Fuel className="h-5 w-5 text-brand" />{t('dash.fin.fuel.title')}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t('dash.fin.fuel.k.bought')} value={`${n1(rec.bought)} L`} sub={t('dash.fin.fuel.k.boughtSub')} />
        <Kpi label={t('dash.fin.fuel.k.area')} value={`${rec.area.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US')} m²`} sub={t('dash.fin.fuel.k.areaSub')} />
        <Kpi label={t('dash.fin.fuel.k.expected')} value={`${n1(rec.expectedUse)} L`} sub={t('dash.fin.fuel.k.expectedSub', { n: n1(data.s.litersPer1000m2) })} />
        <Kpi label={t('dash.fin.fuel.k.unexplained')} value={`${n1(rec.unexplained)} L`} sub={t('dash.fin.fuel.k.unexplainedSub', { pct: n1(rec.unexplainedPct) })} tone={rec.withinTolerance ? 'success' : 'danger'} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Panel title={t('dash.fin.fuel.recon')}>
          <dl className="space-y-1.5 text-sm">
            <Row label={t('dash.fin.fuel.opening')} value={`${n1(rec.opening)} L`} />
            <Row label={t('dash.fin.fuel.bought')} value={`+ ${n1(rec.bought)} L`} />
            <Row label={t('dash.fin.fuel.expectedUse')} value={`− ${n1(rec.expectedUse)} L`} />
            <Row label={t('dash.fin.fuel.measured')} value={`− ${n1(rec.closingMeasured)} L`} />
            <div className={cx('flex justify-between border-t border-line pt-1.5 font-bold', rec.withinTolerance ? 'text-[#17703D]' : 'text-[#B4192A]')}>
              <dt>{t('dash.fin.fuel.unexplained')}</dt><dd className="tabular">{n1(rec.unexplained)} L · {n1(rec.unexplainedPct)}%</dd>
            </div>
          </dl>
          <p className={cx('mt-2 rounded-lg px-3 py-2 text-xs font-semibold', rec.withinTolerance ? 'bg-[#E8F6EC] text-[#17703D]' : 'bg-[#FFF5F6] text-[#9E1424]')}>
            {rec.withinTolerance ? t('dash.fin.fuel.ok', { tol: data.s.tolerancePct }) : t('dash.fin.fuel.bad', { tol: data.s.tolerancePct })}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Field label={t('dash.fin.fuel.std')}><Input type="number" step="0.1" min="0.1" value={std} onChange={(e) => setStd(e.target.value)} /></Field>
            <Field label={t('dash.fin.fuel.tol')}><Input type="number" step="1" min="0" value={tol} onChange={(e) => setTol(e.target.value)} /></Field>
          </div>
          <Button size="sm" variant="secondary" className="mt-2" disabled={!dirty || !(Number(std) > 0)} icon={<Gauge className="h-3.5 w-3.5" />} onClick={saveStd}>{t('dash.fin.fuel.saveStd')}</Button>
          <div className="mt-4 border-t border-line pt-3">
            <p className="text-sm font-bold">{t('dash.fin.fuel.checkTitle')}</p>
            <p className="text-xs text-ink/50">{t('dash.fin.fuel.checkHint')}</p>
            <div className="mt-2 flex gap-2">
              <Input inputMode="decimal" value={check} onChange={(e) => setCheck(e.target.value)} placeholder="4,5" className="flex-1" />
              <Button disabled={!(Number(check.replace(',', '.')) > 0)} onClick={saveCheck}>{t('dash.fin.fuel.saveCheck')}</Button>
            </div>
          </div>
        </Panel>
        <div className="min-w-0 space-y-4">
          <Panel title={t('dash.fin.fuel.weekly')} pad={false}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wide text-ink/45">
                  <th className="px-5 py-2">{t('dash.fin.fuel.week')}</th><th className="text-right">{t('dash.fin.fuel.opening')}</th><th className="text-right">{t('dash.fin.fuel.bought')}</th><th className="text-right">{t('dash.fin.fuel.expectedUse')}</th><th className="text-right">{t('dash.fin.fuel.expectedBal')}</th><th className="text-right">{t('dash.fin.fuel.measuredCol')}</th><th className="px-5 text-right">{t('dash.fin.fuel.diff')}</th>
                </tr></thead>
                <tbody>
                  {rec.weeks.map((w) => (
                    <tr key={w.label} className="border-t border-line/70">
                      <td className="px-5 py-2">{t('dash.fin.fuel.weekLabel', { range: w.label })}</td>
                      <td className="text-right tabular">{n1(w.opening)}</td>
                      <td className="text-right tabular">{w.bought ? n1(w.bought) : '—'}</td>
                      <td className="text-right tabular">{w.expectedUse ? n1(w.expectedUse) : '—'}</td>
                      <td className="text-right tabular">{n1(w.expectedBalance)}</td>
                      <td className="text-right tabular">{w.measured === undefined ? '—' : n1(w.measured)}</td>
                      <td className={cx('px-5 text-right tabular', w.diff !== undefined && w.diff < 0 && 'font-semibold text-[#B4192A]')}>{w.diff === undefined ? '—' : `${w.diff > 0 ? '+' : ''}${n1(w.diff)}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          {data.flags.length > 0 && (
            <Panel title={<span className="flex items-center gap-2"><TriangleAlert className="h-4 w-4 text-[#B4192A]" />{t('dash.fin.fuel.flags')}</span>}>
              <ul className="space-y-1.5 text-sm">
                {data.flags.map((fl, i) => <li key={i} className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C81E2E]" />{t(`dash.fin.flag.${fl.kind}`, { ...fl.params, date: typeof fl.params.date === 'string' ? formatDate(fl.params.date, lang, 'short') : '' })}</li>)}
              </ul>
            </Panel>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title={t('dash.fin.fuel.machines')} pad={false}>
          <DataTable
            rows={data.machinesEff}
            rowKey={(m) => m.machine.id}
            columns={[
              { key: 'n', header: t('dash.fin.fuel.machine'), render: (m) => <span className="text-sm"><b>{m.machine.name}</b><span className="block text-[11px] text-ink/50">{t('dash.fin.fuel.hours', { n: m.machine.hours })} · {t(`dash.fin.fuel.status.${m.machine.status}`)}</span></span> },
              { key: 'l', header: t('dash.fin.fuel.refill'), align: 'right', render: (m) => <span className="tabular">{n1(m.liters)} L</span> },
              { key: 'a', header: t('dash.fin.fuel.areaCol'), align: 'right', render: (m) => <span className="tabular">{m.area.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US')} m²</span> },
              { key: 'p', header: t('dash.fin.fuel.per1000'), align: 'right', render: (m) => <span className={cx('tabular', m.wasteful && 'font-bold text-[#B4192A]')}>{m.per1000 ? n1(m.per1000) : '—'}{m.wasteful ? ` (+${m.overPct}%)` : ''}</span> },
            ]}
          />
        </Panel>
        <Panel title={t('dash.fin.fuel.zones')} pad={false}>
          <DataTable
            rows={data.zoneRows}
            rowKey={(z) => z.zone.id}
            columns={[
              { key: 'n', header: t('dash.fin.fuel.zone'), render: (z) => <span className="text-sm"><b>{z.zone.name}</b><span className="block text-[11px] text-ink/50">{z.zone.area.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US')} m² · {t('dash.fin.fuel.perMonth', { n: z.zone.perMonth })}</span></span> },
              { key: 'c', header: t('dash.fin.fuel.cuts'), align: 'right', render: (z) => <span className="tabular">{z.cuts}/{z.zone.perMonth}</span> },
              { key: 'l', header: t('dash.fin.fuel.litersCol'), align: 'right', render: (z) => <span className="tabular">{n1(z.liters)} L</span> },
              { key: 'd', header: t('dash.fin.fuel.next'), render: (z) => (z.daysLate ? <StatusPill tone="danger">{t('dash.fin.fuel.late', { n: z.daysLate })}</StatusPill> : <span className="text-xs">{formatDate(z.due, lang, 'short')}</span>) },
            ]}
          />
        </Panel>
      </div>

      <Panel className="mt-4" title={t('dash.fin.fuel.queue')} right={t('dash.nRequests', { n: data.queue.length })} pad={false}>
        {data.queue.length ? (
          <ul className="divide-y divide-line/70">
            {data.queue.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Photo id={l.beforePhotoId} className="h-12 w-12 rounded-lg" />
                <Photo id={l.afterPhotoId} className="h-12 w-12 rounded-lg" />
                <span className="min-w-0 flex-1 text-sm">
                  <b>{data.zoneName.get(l.zoneId)}</b> · {l.area.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US')} m²
                  <span className="block text-xs text-ink/50">{formatDate(l.date, lang, 'short')} · {l.start}–{l.end} · {data.staffName.get(l.gardenerId) ?? ''}</span>
                </span>
                {l.status === 'rephoto' ? (
                  <StatusPill tone="warning">{t('dash.fin.fuel.waitRephoto')}</StatusPill>
                ) : (
                  <span className="flex gap-1.5">
                    <Button size="sm" variant="secondary" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => review(l.id, 'rephoto')}>{t('dash.fin.fuel.rephoto')}</Button>
                    <Button size="sm" icon={<Check className="h-3.5 w-3.5" />} onClick={() => review(l.id, 'approved')}>{t('dash.fin.fuel.approve')}</Button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-4 text-sm text-ink/50">{t('dash.fin.fuel.queueEmpty')}</p>
        )}
      </Panel>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><dt className="text-ink/60">{label}</dt><dd className="tabular font-semibold">{value}</dd></div>;
}
