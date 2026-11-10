import { Download, FileWarning, History, PackageCheck, Send } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate, monthOf } from '../../../domain/clock';
import { formatRp } from '../../../domain/money';
import { offeredConsequences } from '../../../domain/consequences';
import { unitBillingRows } from '../../../domain/report';
import type { CardOrder, Consequence } from '../../../domain/types';
import { useLang, useT } from '../../../i18n';
import { applyConsequence, setCardOrderStatus } from '../../../store/actions';
import { useDashboardProject, useDerived, useRun } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Chip } from '../../../ui/Chip';
import { DataTable } from '../../../ui/DataTable';
import { Select } from '../../../ui/Field';
import { Kpi } from '../../../ui/Kpi';
import { Sheet } from '../../../ui/Sheet';
import { StatusPill, type PillTone } from '../../../ui/StatusPill';
import { useToast } from '../../../ui/Toast';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { UnitLink } from '../components/UnitLink';
import { ADMIN_BY, downloadCsv } from '../util';
import { ConsequencePills } from './IplList';

const ORDER_TONE: Record<CardOrder['status'], PillTone> = { awaitingPayment: 'warning', toMake: 'info', ready: 'brand', pickedUp: 'success' };
type OdFilter = 'flagged' | 'withCns' | 'all';

export default function CardsOverdue() {
  const t = useT();
  const [lang] = useLang();
  const run = useRun();
  const toast = useToast();
  const project = useDashboardProject();
  const [odFilter, setOdFilter] = useState<OdFilter>('flagged');
  const [historyOpen, setHistoryOpen] = useState(false);
  const data = useDerived((d) => {
    const units = d.units.filter((u) => u.projectId === project.id);
    const ids = new Set(units.map((u) => u.id));
    const orders = d.cardOrders.filter((o) => ids.has(o.unitId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const rows = unitBillingRows(d, project.id);
    const history = units
      .flatMap((u) => u.consequences.map((c) => ({ c, code: u.code, unitId: u.id })))
      .sort((a, b) => (b.c.endedAt ?? b.c.startedAt).localeCompare(a.c.endedAt ?? a.c.startedAt));
    const s = d.projects.find((p) => p.id === project.id)!.settings;
    return { orders, rows, history, month: monthOf(d.today), flagMonths: s.overdue.flagMonths, offered: offeredConsequences(s) };
  }, [project.id]);

  const k = {
    awaiting: data.orders.filter((o) => o.status === 'awaitingPayment').length,
    toMake: data.orders.filter((o) => o.status === 'toMake').length,
    ready: data.orders.filter((o) => o.status === 'ready').length,
    picked: data.orders.filter((o) => o.status === 'pickedUp' && o.createdAt.startsWith(data.month)).length,
  };
  const overdue = data.rows.filter((r) => r.overdueMonths > 0);
  // Units with an active consequence stay listed after they pay, until estate restores them.
  const odBase = odFilter === 'withCns' ? data.rows.filter((r) => r.activeConsequences.length > 0) : odFilter === 'flagged' ? overdue.filter((r) => r.needsAction) : overdue;
  const odRows = odBase.slice().sort((a, b) => b.overdueMonths - a.overdueMonths || a.unit.code.localeCompare(b.unit.code));
  const odCounts: Record<OdFilter, number> = { flagged: overdue.filter((r) => r.needsAction).length, withCns: data.rows.filter((r) => r.activeConsequences.length > 0).length, all: overdue.length };

  const setStatus = (o: CardOrder, status: 'ready' | 'pickedUp') => {
    const r = run(setCardOrderStatus, { orderId: o.id, status });
    if (r.ok) toast.show(t(status === 'ready' ? 'dash.cards.readySent' : 'dash.cards.pickedDone'));
  };
  const act = (unitId: string, type: Consequence['type']) => {
    const r = run(applyConsequence, { unitId, type, by: ADMIN_BY });
    if (!r.ok) return toast.show(t(r.error), 'error');
    toast.show(t(`dash.cns.applied.${type}`));
  };
  const garbageCsv = () => {
    const list = data.rows.filter((r) => r.activeConsequences.some((c) => c.type === 'garbageStopped'));
    downloadCsv(`stop-angkut-sampah-${project.id}.csv`, [
      [t('common.unit'), t('dash.ipl.col.owner'), t('dash.cards.col.since')],
      ...list.map((r) => [r.unit.code, r.ownerName, r.activeConsequences.find((c) => c.type === 'garbageStopped')!.startedAt]),
    ]);
  };

  return (
    <div>
      <PageHeader title={t('dash.cards.title')} subtitle={t('dash.cards.sub')} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t('dash.cards.k.awaiting')} value={k.awaiting} sub={t('dash.cards.k.awaitingSub')} tone={k.awaiting ? 'warning' : undefined} />
        <Kpi label={t('dash.cards.k.toMake')} value={k.toMake} sub={t('dash.cards.k.toMakeSub')} />
        <Kpi label={t('dash.cards.k.ready')} value={k.ready} sub={t('dash.cards.k.readySub')} />
        <Kpi label={t('dash.cards.k.picked')} value={k.picked} sub={t('dash.cards.k.pickedSub')} tone="success" />
      </div>

      <Panel className="mt-4" title={t('dash.cards.orders')} pad={false}>
        <DataTable
          rows={data.orders}
          rowKey={(o) => o.id}
          empty={t('dash.nothing')}
          maxHeight={420}
          columns={[
            { key: 'date', header: t('common.date'), render: (o) => <span className="text-xs">{formatDate(o.createdAt.slice(0, 10), lang, 'short')}</span> },
            { key: 'unit', header: t('common.unit'), render: (o) => <UnitLink unitId={o.unitId} /> },
            {
              key: 'what',
              header: t('dash.cards.col.contents'),
              render: (o) => (
                <span className="text-xs">
                  {t('dash.cards.contents', { cards: o.freeCards + o.extraCards, stickers: o.freeStickers + o.extraStickers })}
                  {o.freeCards + o.freeStickers > 0 && <span className="ml-1 text-[#17703D]">· {t('dash.cards.freeIncluded')}</span>}
                </span>
              ),
            },
            { key: 'plates', header: t('dash.cards.col.plates'), render: (o) => <span className="font-mono text-xs">{o.vehicles.map((v) => v.plate).join(', ') || '—'}</span> },
            { key: 'total', header: t('common.total'), align: 'right', render: (o) => (o.total ? <span className="tabular">{formatRp(o.total)}</span> : <span className="text-xs text-[#17703D]">{t('status.free')}</span>) },
            { key: 'status', header: t('common.status'), render: (o) => <StatusPill tone={ORDER_TONE[o.status]}>{t(`cards.status.${o.status}`)}</StatusPill> },
            {
              key: 'act',
              header: '',
              render: (o) =>
                o.status === 'toMake' ? (
                  <Button size="sm" className="whitespace-nowrap" icon={<Send className="h-3.5 w-3.5" />} onClick={() => setStatus(o, 'ready')}>{t('dash.cards.markReady')}</Button>
                ) : o.status === 'ready' ? (
                  <Button size="sm" variant="secondary" className="whitespace-nowrap" icon={<PackageCheck className="h-3.5 w-3.5" />} onClick={() => setStatus(o, 'pickedUp')}>{t('dash.cards.handOver')}</Button>
                ) : o.status === 'awaitingPayment' ? (
                  <span className="text-[11px] text-ink/45">{t('dash.cards.waitPay')}</span>
                ) : null,
            },
          ]}
        />
      </Panel>

      <Panel
        className="mt-4"
        title={t('dash.cards.overdueTitle')}
        right={
          <span className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="ghost" icon={<History className="h-3.5 w-3.5" />} onClick={() => setHistoryOpen(true)}>{t('dash.cards.history')}</Button>
            <Button size="sm" variant="secondary" icon={<Download className="h-3.5 w-3.5" />} onClick={garbageCsv}>{t('dash.cards.garbageList')}</Button>
          </span>
        }
        pad={false}
      >
        <div className="border-b border-line/70 px-5 py-3">
          <p className="text-sm font-semibold">{t('dash.cards.rule', { n: data.flagMonths })}</p>
          <p className="text-xs text-ink/50">{t('dash.cards.ruleSub')} <Link to="/dashboard/settings" className="font-semibold text-brand hover:underline">{t('dash.editSettings')}</Link></p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {(['flagged', 'withCns', 'all'] as const).map((f) => <Chip key={f} active={odFilter === f} count={odCounts[f]} onClick={() => setOdFilter(f)}>{t(`dash.cards.f.${f}`)}</Chip>)}
          </div>
        </div>
        <DataTable
          rows={odRows}
          rowKey={(r) => r.unit.id}
          empty={t('dash.nothing')}
          columns={[
            { key: 'unit', header: t('common.unit'), render: (r) => <UnitLink unitId={r.unit.id} /> },
            { key: 'owner', header: t('dash.ipl.col.owner'), render: (r) => <span className="text-sm">{r.ownerName}</span> },
            { key: 'n', header: t('dash.ipl.col.overdueMonths'), render: (r) => (r.overdueMonths ? <StatusPill tone={r.needsAction ? 'danger' : 'warning'}>{t('dash.ipl.overdue', { n: r.overdueMonths })}</StatusPill> : '—') },
            { key: 'since', header: t('dash.cards.col.since'), render: (r) => <span className="text-xs">{r.oldestOverdue ? formatDate(r.oldestOverdue, lang, 'month') : '—'}</span> },
            { key: 'amt', header: t('dash.ipl.col.overdue'), align: 'right', render: (r) => (r.overdueAmount ? <b className="tabular text-[#B4192A]">{formatRp(r.overdueAmount)}</b> : '—') },
            { key: 'cns', header: t('dash.ipl.col.consequences'), render: (r) => <ConsequencePills r={r} /> },
            {
              key: 'act',
              header: '',
              render: (r) => (
                <span className="flex items-center justify-end gap-1.5">
                  {data.offered.includes('warningLetter') && !r.activeConsequences.some((c) => c.type === 'warningLetter') && (
                    <Button size="sm" variant="secondary" className="whitespace-nowrap" icon={<FileWarning className="h-3.5 w-3.5" />} onClick={() => act(r.unit.id, 'warningLetter')}>{t('dash.cards.sendWarning')}</Button>
                  )}
                  <Select
                    aria-label={t('dash.cards.moreActions')}
                    value=""
                    onChange={(e) => e.target.value && act(r.unit.id, e.target.value as Consequence['type'])}
                    className="!w-auto !py-1.5 text-xs"
                  >
                    <option value="">{t('dash.cards.moreActions')}</option>
                    {(['cardSuspended', 'garbageStopped'] as const).filter((type) => data.offered.includes(type) && !r.activeConsequences.some((c) => c.type === type)).map((type) => (
                      <option key={type} value={type}>{t(`dash.cns.do.${type}`)}</option>
                    ))}
                  </Select>
                  <Link to={`/dashboard/ipl/${r.unit.id}`} className="text-xs font-bold text-brand hover:underline">{t('common.detail')}</Link>
                </span>
              ),
            },
          ]}
        />
      </Panel>

      <Sheet open={historyOpen} onClose={() => setHistoryOpen(false)} title={t('dash.cards.history')}>
        {data.history.length ? (
          <ul className="divide-y divide-line">
            {data.history.map(({ c, code, unitId }) => (
              <li key={c.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <Link to={`/dashboard/ipl/${unitId}`} onClick={() => setHistoryOpen(false)} className="font-bold hover:text-brand">{code}</Link> · {t(`dash.cns.short.${c.type}`)}
                  <span className="block text-xs text-ink/50">{t('dash.cns.since', { date: formatDate(c.startedAt, lang), by: c.by })}{c.note ? ` · ${c.note}` : ''}</span>
                </span>
                <StatusPill tone={c.endedAt ? 'success' : 'danger'}>{c.endedAt ? t('dash.cards.liftedOn', { date: formatDate(c.endedAt, lang, 'short') }) : t('dash.cards.activeNow')}</StatusPill>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-4 text-sm text-ink/50">{t('dash.cards.noHistory')}</p>
        )}
        <p className="mt-3 text-[11px] text-ink/45">{t('dash.cards.historyNote')}</p>
      </Sheet>
    </div>
  );
}
