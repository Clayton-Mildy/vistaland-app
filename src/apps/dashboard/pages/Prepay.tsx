import { Minus, Plus, Smartphone } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate, formatDateTime } from '../../../domain/clock';
import { prepayQuote } from '../../../domain/ipl';
import { formatRp } from '../../../domain/money';
import type { PrepayPackage } from '../../../domain/types';
import { useLang, useT } from '../../../i18n';
import { updateSettings } from '../../../store/actions';
import { useDashboardProject, useDerived, useRun } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { cx } from '../../../ui/cx';
import { DataTable } from '../../../ui/DataTable';
import { Checkbox, Field, Input, Select } from '../../../ui/Field';
import { Kpi } from '../../../ui/Kpi';
import { Segmented } from '../../../ui/Segmented';
import { Tabs } from '../../../ui/Tabs';
import { Toggle } from '../../../ui/Toggle';
import { useToast } from '../../../ui/Toast';
import { PrepayGrid } from '../../resident/PrepayGrid';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { UnitLink } from '../components/UnitLink';
import { ADMIN_BY } from '../util';

type Kind = 'ipl' | 'wifi';
const ONE_MONTH: PrepayPackage = { id: 'ipl-1', months: 1, discountType: 'none', value: 0, active: true };

/** Largest sensible value per discount type: up to 50% off, or all but one month free. */
const maxValue = (p: PrepayPackage) => (p.discountType === 'percent' ? 50 : p.discountType === 'freeMonths' ? p.months - 1 : 0);

export default function Prepay() {
  const t = useT();
  const [lang] = useLang();
  const run = useRun();
  const toast = useToast();
  const project = useDashboardProject();
  const [kind, setKind] = useState<Kind>('ipl');
  const data = useDerived((d) => {
    const p = d.projects.find((x) => x.id === project.id)!;
    const unitIds = new Set(d.units.filter((u) => u.projectId === project.id).map((u) => u.id));
    const buyers = d.payments
      .filter((x) => unitIds.has(x.unitId) && (x.kind === 'ipl' || x.kind === 'wifi') && (x.packageId || x.discount > 0 || (x.months?.length ?? 0) >= 3))
      .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
    return { settings: p.settings, types: d.unitTypes.filter((ty) => ty.projectId === project.id), buyers, today: d.today };
  }, [project.id]);
  const s = data.settings;
  const saved = s.prepay[kind];
  const [draft, setDraft] = useState<PrepayPackage[]>(saved);
  const [validUntil, setValidUntil] = useState(s.prepay.validUntil);
  const [noArrearsOnly, setNoArrearsOnly] = useState(s.prepay.noArrearsOnly);
  const [refId, setRefId] = useState('');
  // Start from the saved values whenever the tab, the project or the saved settings change.
  useEffect(() => {
    setDraft(s.prepay[kind]);
    setValidUntil(s.prepay.validUntil);
    setNoArrearsOnly(s.prepay.noArrearsOnly);
  }, [kind, s.prepay]);
  const refs = kind === 'ipl' ? data.types.map((ty) => ({ id: ty.id, label: `${ty.name} · ${formatRp(ty.iplRate)}`, rate: ty.iplRate })) : s.wifi.packages.map((w) => ({ id: w.id, label: `${w.name} ${w.mbps} Mbps · ${formatRp(w.price)}`, rate: w.price }));
  const ref = refs.find((r) => r.id === refId) ?? refs[0];
  const rate = ref?.rate ?? 0;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved) || validUntil !== s.prepay.validUntil || noArrearsOnly !== s.prepay.noArrearsOnly;
  const buyers = data.buyers.filter((b) => b.kind === kind);
  const kpi = useMemo(() => ({
    count: buyers.length,
    revenue: buyers.reduce((a, b) => a + b.amount, 0),
    saved: buyers.reduce((a, b) => a + b.discount, 0),
    avgMonths: buyers.length ? Math.round((buyers.reduce((a, b) => a + (b.months?.length ?? 0), 0) / buyers.length) * 10) / 10 : 0,
  }), [buyers]);

  const edit = (id: string, patch: Partial<PrepayPackage>) =>
    setDraft((xs) => xs.map((p) => {
      if (p.id !== id) return p;
      const next = { ...p, ...patch };
      if (patch.discountType) next.value = patch.discountType === 'none' ? 0 : Math.min(Math.max(next.value, 1), maxValue(next));
      return next;
    }));
  const save = () => {
    const r = run(updateSettings, { projectId: project.id, patch: { prepay: { [kind]: draft, validUntil, noArrearsOnly } }, by: ADMIN_BY });
    if (!r.ok) return toast.show(t(r.error), 'error');
    toast.show(t('dash.prepay.saved'), 'success');
  };
  const previewPackages = kind === 'ipl' ? [ONE_MONTH, ...draft.filter((p) => p.active)] : draft.filter((p) => p.active);
  const expired = validUntil < data.today;

  return (
    <div>
      <PageHeader title={t('dash.prepay.title')} subtitle={t('dash.prepay.sub')} />
      {!s.features.prepay && (
        <p className="mb-4 rounded-xl bg-[#FFF8E8] px-4 py-2.5 text-sm font-semibold text-[#8A5A00]">
          {t('dash.prepay.featureOff')} <Link to="/dashboard/settings" className="underline">{t('dash.editSettings')}</Link>
        </p>
      )}
      <Tabs value={kind} onChange={setKind} items={[{ value: 'ipl', label: t('dash.prepay.tab.ipl') }, ...(s.features.wifi ? [{ value: 'wifi' as const, label: t('dash.prepay.tab.wifi') }] : [])]} className="mb-4" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t('dash.prepay.k.buyers')} value={kpi.count} sub={t('dash.prepay.k.buyersSub')} />
        <Kpi label={t('dash.prepay.k.revenue')} value={formatRp(kpi.revenue)} sub={t('dash.prepay.k.revenueSub')} tone="success" />
        <Kpi label={t('dash.prepay.k.saved')} value={formatRp(kpi.saved)} sub={t('dash.prepay.k.savedSub')} />
        <Kpi label={t('dash.prepay.k.avg')} value={t('dash.prepay.k.avgValue', { n: kpi.avgMonths })} sub={t('dash.prepay.k.avgSub')} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_340px]">
        <Panel title={t('dash.prepay.packages')} right={dirty ? <span className="font-semibold text-[#9A5B00]">{t('dash.prepay.unsaved')}</span> : t('dash.prepay.live')}>
          <Field label={t('dash.prepay.reference')} hint={t('dash.prepay.referenceHint')} className="mb-3 max-w-md">
            <Select value={ref?.id ?? ''} onChange={(e) => setRefId(e.target.value)}>
              {refs.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </Select>
          </Field>
          <div className="space-y-2">
            {draft.map((p) => {
              const q = prepayQuote(p, rate);
              const max = maxValue(p);
              return (
                <div key={p.id} className={cx('grid items-center gap-3 rounded-xl border p-3 md:grid-cols-[90px_minmax(0,1fr)_120px_150px_56px]', p.active ? 'border-line bg-white' : 'border-dashed border-line bg-[#FAFAFA] opacity-70')}>
                  <p className="text-sm font-bold">{t('bills.nMonths', { n: p.months })}</p>
                  <Segmented size="sm" value={p.discountType} onChange={(v) => edit(p.id, { discountType: v })} items={[{ value: 'none', label: t('dash.prepay.type.none') }, { value: 'percent', label: t('dash.prepay.type.percent') }, { value: 'freeMonths', label: t('dash.prepay.type.freeMonths') }]} />
                  <div className={cx('flex items-center justify-between rounded-lg border border-line px-1 py-0.5', p.discountType === 'none' && 'invisible')}>
                    <button type="button" aria-label={t('dash.prepay.less')} disabled={p.value <= 1} onClick={() => edit(p.id, { value: p.value - 1 })} className="rounded-md p-1 hover:bg-brand-tint disabled:opacity-30"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="text-sm font-bold tabular">{p.discountType === 'percent' ? `${p.value}%` : t('dash.prepay.nFree', { n: p.value })}</span>
                    <button type="button" aria-label={t('dash.prepay.more')} disabled={p.value >= max} onClick={() => edit(p.id, { value: p.value + 1 })} className="rounded-md p-1 hover:bg-brand-tint disabled:opacity-30"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold tabular">{formatRp(q.net)}</p>
                    <p className="text-[11px] text-ink/50">{q.discount > 0 ? t('bills.save', { amount: formatRp(q.discount) }) : t('dash.prepay.noSaving')}</p>
                  </div>
                  <Toggle checked={p.active} onChange={(v) => edit(p.id, { active: v })} label={t('dash.prepay.active')} />
                </div>
              );
            })}
          </div>
          <div className="mt-4 grid gap-3 border-t border-line/70 pt-4 md:grid-cols-[200px_1fr_auto] md:items-end">
            <Field label={t('dash.prepay.validUntil')} error={expired ? t('dash.prepay.expired') : null}>
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </Field>
            <Checkbox checked={noArrearsOnly} onChange={setNoArrearsOnly}>{t('dash.prepay.noArrearsOnly')}</Checkbox>
            <div className="flex gap-2">
              {dirty && <Button variant="ghost" onClick={() => { setDraft(saved); setValidUntil(s.prepay.validUntil); setNoArrearsOnly(s.prepay.noArrearsOnly); }}>{t('common.cancel')}</Button>}
              <Button disabled={!dirty} onClick={save}>{t('dash.prepay.save')}</Button>
            </div>
          </div>
        </Panel>

        <Panel title={<span className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-brand" />{t('dash.prepay.preview')}</span>} right={t('dash.prepay.previewHint')}>
          <div className="mx-auto w-full max-w-[300px] rounded-[28px] border-[6px] border-ink bg-[#F6F6F7] p-3 shadow-card">
            <div className="rounded-2xl bg-white p-3 shadow-card">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-bold">{t(kind === 'ipl' ? 'bills.prepayTitle' : 'bills.wifiPrepay')}</span>
                <span className="text-[10px] text-ink/45">{t('bills.validUntil', { date: formatDate(validUntil, lang) })}</span>
              </div>
              {expired || !previewPackages.length ? (
                <p className="py-4 text-center text-xs text-ink/50">{t(expired ? 'bills.prepayExpired' : 'dash.prepay.nonePreview')}</p>
              ) : (
                <PrepayGrid packages={previewPackages} rate={rate} />
              )}
            </div>
            <p className="mt-2 text-center text-[10px] text-ink/45">{t('dash.prepay.previewRate', { rate: formatRp(rate) })}</p>
          </div>
        </Panel>
      </div>

      <Panel className="mt-4" title={t('dash.prepay.buyers')} right={t('dash.nRequests', { n: buyers.length })} pad={false}>
        <DataTable
          rows={buyers}
          rowKey={(b) => b.id}
          empty={t('dash.prepay.noBuyers')}
          columns={[
            { key: 'date', header: t('common.date'), render: (b) => <span className="text-xs">{formatDateTime(b.paidAt, lang)}</span> },
            { key: 'unit', header: t('common.unit'), render: (b) => <UnitLink unitId={b.unitId} /> },
            { key: 'months', header: t('dash.prepay.col.months'), render: (b) => t('bills.nMonths', { n: b.months?.length ?? 0 }) },
            { key: 'amount', header: t('dash.prepay.col.paid'), align: 'right', render: (b) => <b className="tabular">{formatRp(b.amount)}</b> },
            { key: 'disc', header: t('dash.prepay.col.discount'), align: 'right', render: (b) => (b.discount ? <span className="tabular text-[#17703D]">{formatRp(b.discount)}</span> : '—') },
            { key: 'method', header: t('dash.unit.method'), render: (b) => <span className="text-xs">{t(`method.${b.method}`)}</span> },
          ]}
        />
      </Panel>
    </div>
  );
}
