import { Download } from 'lucide-react';
import { useState } from 'react';
import { formatDate, monthOf } from '../../../domain/clock';
import type { Lead } from '../../../domain/types';
import { useLang, useT } from '../../../i18n';
import { updateLeadStatus } from '../../../store/actions';
import { useDashboardProject, useDerived, useRun } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Chip } from '../../../ui/Chip';
import { DataTable } from '../../../ui/DataTable';
import { Kpi } from '../../../ui/Kpi';
import { StatusPill } from '../../../ui/StatusPill';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { downloadCsv, maskPhone } from '../util';

const STATUSES: Lead['status'][] = ['baru', 'dihubungi', 'survei', 'deal', 'batal'];

export default function Leads() {
  const t = useT();
  const [lang] = useLang();
  const run = useRun();
  const project = useDashboardProject();
  const [filter, setFilter] = useState<'all' | 'beli' | 'sewa' | 'baru'>('all');
  const data = useDerived((d) => {
    const leads = d.leads.filter((l) => l.projectId === project.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const describe = (l: Lead) => {
      if (l.source.kind === 'project') return { source: t('dash.leads.fromProject', { name: l.source.projectName }), pic: l.pic };
      const listing = d.listings.find((x) => x.id === (l.source as { listingId: string }).listingId);
      const unit = d.units.find((u) => u.id === listing?.unitId)?.code ?? '';
      return { source: t('dash.leads.fromListing', { unit, kind: listing ? t(`market.kind.${listing.kind}`).toLowerCase() : '' }), pic: t('dash.leads.picOwner', { unit }) };
    };
    return { leads: leads.map((l) => ({ l, ...describe(l) })), month: monthOf(d.today), prevMonth: monthOf(d.today).replace(/-(\d\d)$/, (_, m) => `-${String(Number(m) - 1).padStart(2, '0')}`) };
  }, [project.id, t]);
  const rows = data.leads.filter(({ l }) => (filter === 'all' ? true : filter === 'baru' ? l.status === 'baru' : l.interest === filter));
  const thisMonth = data.leads.filter(({ l }) => l.createdAt.startsWith(data.month));
  const exportCsv = () => downloadCsv(`leads-${project.id}.csv`, [[t('common.date'), t('dash.res.name'), 'WhatsApp', t('dash.leads.interest'), t('dash.leads.source'), t('public.domicile'), t('common.status'), 'PIC'], ...data.leads.map(({ l, source, pic }) => [l.createdAt.slice(0, 10), l.name, l.whatsapp, t(`dash.leads.i.${l.interest}`), source, l.domicile, t(`dash.leads.s.${l.status}`), pic])]);
  return (
    <div>
      <PageHeader title={t('dash.leads.title')} subtitle={t('dash.leads.sub', { project: project.name })} actions={<Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={exportCsv}>{t('common.export')}</Button>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t('dash.leads.k.month')} value={thisMonth.length} sub={t('dash.leads.k.total', { n: data.leads.length })} />
        <Kpi label={t('dash.leads.k.listing')} value={data.leads.filter(({ l }) => l.source.kind === 'listing').length} sub={t('dash.leads.k.listingSub', { n: data.leads.length ? Math.round((data.leads.filter(({ l }) => l.source.kind === 'listing').length / data.leads.length) * 100) : 0 })} />
        <Kpi label={t('dash.leads.k.survey')} value={data.leads.filter(({ l }) => l.status === 'survei').length} sub={t('dash.leads.k.surveySub')} />
        <Kpi label={t('dash.leads.k.deal')} value={data.leads.filter(({ l }) => l.status === 'deal').length} sub={t('dash.leads.k.dealSub')} tone="success" />
      </div>
      <Panel className="mt-4" title={t('dash.leads.howTitle')}>
        <div className="grid gap-2 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl bg-brand-tint/50 p-3 text-xs">
              <p className="font-bold text-ink">{i} · {t(`dash.leads.how${i}`)}</p>
              <p className="text-ink/60">{t(`dash.leads.how${i}.body`)}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="mt-4" title={t('dash.leads.list')} right={<div className="flex gap-1.5">{(['all', 'beli', 'sewa', 'baru'] as const).map((f) => <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{t(`dash.leads.f.${f}`)}</Chip>)}</div>} pad={false}>
        <DataTable
          rows={rows}
          rowKey={({ l }) => l.id}
          columns={[
            { key: 'date', header: t('common.date'), render: ({ l }) => formatDate(l.createdAt.slice(0, 10), lang, 'short') },
            { key: 'name', header: t('dash.res.name'), render: ({ l }) => <b>{l.name}</b> },
            { key: 'wa', header: 'WhatsApp', render: ({ l }) => <span className="font-mono text-xs">{maskPhone(l.whatsapp)}</span> },
            { key: 'interest', header: t('dash.leads.interest'), render: ({ l }) => <StatusPill tone={l.interest === 'sewa' ? 'brand' : 'info'}>{t(`dash.leads.i.${l.interest}`)}</StatusPill> },
            { key: 'source', header: t('dash.leads.source'), render: ({ source }) => <span className="text-xs">{source}</span> },
            { key: 'dom', header: t('public.domicile'), render: ({ l }) => l.domicile },
            {
              key: 'status',
              header: t('common.status'),
              render: ({ l }) => (
                <select value={l.status} onChange={(e) => run(updateLeadStatus, { id: l.id, status: e.target.value as Lead['status'] })} className="rounded-lg border border-line bg-white px-2 py-1 text-xs font-semibold">
                  {STATUSES.map((s) => <option key={s} value={s}>{t(`dash.leads.s.${s}`)}</option>)}
                </select>
              ),
            },
            { key: 'pic', header: 'PIC', render: ({ pic }) => <span className="text-xs text-ink/60">{pic}</span> },
          ]}
        />
        <p className="border-t border-line px-4 py-2.5 text-xs text-ink/45">{t('dash.leads.consent')}</p>
      </Panel>
    </div>
  );
}
