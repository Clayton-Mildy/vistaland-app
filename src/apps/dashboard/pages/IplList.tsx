import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addMonths, formatDate, monthOf } from '../../../domain/clock';
import { billStatus } from '../../../domain/ipl';
import { formatRp, formatRpShort } from '../../../domain/money';
import { iplSnapshot, unitBillingRows, type UnitBillingRow } from '../../../domain/report';
import type { BillStatus, MonthKey } from '../../../domain/types';
import { useLang, useT } from '../../../i18n';
import { useDashboardProject, useDerived } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Chip } from '../../../ui/Chip';
import { cx } from '../../../ui/cx';
import { DataTable } from '../../../ui/DataTable';
import { Input, Select } from '../../../ui/Field';
import { Kpi } from '../../../ui/Kpi';
import { Segmented } from '../../../ui/Segmented';
import { StatusPill } from '../../../ui/StatusPill';
import { IplPill, iplState } from '../components/IplPill';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { UnitLink } from '../components/UnitLink';
import { blockOf, downloadCsv } from '../util';

type Filter = 'all' | 'free' | 'due' | 'paid' | 'overdue' | 'action' | 'none';
const FILTERS: Filter[] = ['all', 'overdue', 'action', 'due', 'paid', 'free', 'none'];
const PAGE = 50;

export const CELL: Record<BillStatus | 'none', { cls: string; letter: string }> = {
  free: { cls: 'bg-[#E3EEFD] text-[#1E4F9A]', letter: 'free' },
  paid: { cls: 'bg-[#DDF3E4] text-[#17703D]', letter: 'paid' },
  overdue: { cls: 'bg-[#FBE0E2] text-[#B4192A] font-extrabold', letter: 'overdue' },
  due: { cls: 'bg-[#FFF1D6] text-[#9A5B00]', letter: 'due' },
  upcoming: { cls: 'bg-[#F4F4F5] text-ink/30', letter: 'none' },
  none: { cls: 'bg-[#F4F4F5] text-ink/30', letter: 'none' },
};

export default function IplList() {
  const t = useT();
  const [lang] = useLang();
  const project = useDashboardProject();
  const [view, setView] = useState<'list' | 'matrix'>('list');
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [block, setBlock] = useState('all');
  const [page, setPage] = useState(0);
  const data = useDerived((d) => {
    const s = d.projects.find((p) => p.id === project.id)!.settings;
    const rows = unitBillingRows(d, project.id).map((r) => ({ ...r, state: iplState(r.bills, d.today, s.ipl.dueDay) }));
    const current = monthOf(d.today);
    const months: MonthKey[] = Array.from({ length: 12 }, (_, i) => addMonths(current, i - 10));
    return { rows, snap: iplSnapshot(d, project.id), today: d.today, dueDay: s.ipl.dueDay, flagMonths: s.overdue.flagMonths, months };
  }, [project.id]);
  type Row = (typeof data.rows)[number];
  const classify = (r: Row): Filter => (!r.unit.handover.bastDate || r.state.kind === 'none' ? 'none' : r.state.kind);
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: data.rows.length, free: 0, due: 0, paid: 0, overdue: 0, action: 0, none: 0 };
    for (const r of data.rows) {
      c[classify(r)]++;
      if (r.needsAction) c.action++;
    }
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.rows]);
  const blocks = useMemo(() => [...new Set(data.rows.map((r) => blockOf(r.unit.code)))].sort(), [data.rows]);
  const needle = q.trim().toLowerCase();
  const rows = data.rows.filter((r) => {
    if (block !== 'all' && blockOf(r.unit.code) !== block) return false;
    if (filter === 'action' ? !r.needsAction : filter !== 'all' && classify(r) !== filter) return false;
    return !needle || r.unit.code.toLowerCase().includes(needle) || r.ownerName.toLowerCase().includes(needle) || (r.renterName ?? '').toLowerCase().includes(needle);
  });
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const safePage = Math.min(page, pages - 1);
  const pageRows = rows.slice(safePage * PAGE, safePage * PAGE + PAGE);
  const reset = (fn: () => void) => { fn(); setPage(0); };
  const s = data.snap;

  const exportCsv = () =>
    downloadCsv(`ipl-${project.id}-${monthOf(data.today)}.csv`, [
      [t('common.unit'), t('dash.ipl.col.owner'), t('role.renter'), 'BAST', t('dash.ipl.col.freeUntil'), t('common.status'), t('dash.ipl.col.overdueMonths'), t('dash.ipl.col.overdue'), t('dash.ipl.col.action')],
      ...rows.map((r) => [r.unit.code, r.ownerName, r.renterName ?? '', r.unit.handover.bastDate ?? '', r.freeUntil ?? '', t(`dash.ipl.f.${classify(r)}`), r.overdueMonths, r.overdueAmount, r.needsAction ? t('dash.ipl.flag') : '']),
    ]);

  return (
    <div>
      <PageHeader
        title={t('dash.ipl.title')}
        subtitle={t('dash.ipl.sub', { day: data.dueDay })}
        actions={<Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={exportCsv}>{t('common.export')}</Button>}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={t('dash.ipl.k.handedOver')} value={s.handedOver} sub={t('dash.ipl.k.handedOverSub')} />
        <Kpi label={t('dash.ipl.k.free')} value={s.free} sub={t('dash.ipl.k.freeSub')} onClick={() => reset(() => setFilter('free'))} active={filter === 'free'} />
        <Kpi label={t('dash.ipl.k.mustPay')} value={s.mustPay} sub={t('dash.ipl.k.mustPaySub', { n: s.paidThisMonth })} />
        <Kpi label={t('dash.ipl.k.collection')} value={`${s.collectionRate}%`} sub={formatDate(monthOf(data.today), lang, 'month')} tone={s.collectionRate >= 80 ? 'success' : 'warning'} />
        <Kpi label={t('dash.ipl.k.overdue')} value={s.overdueUnits} sub={formatRp(s.totalOverdue)} tone="danger" onClick={() => reset(() => setFilter('overdue'))} active={filter === 'overdue'} />
        <Kpi label={t('dash.ipl.k.notHandedOver')} value={s.notHandedOver} sub={t('dash.ipl.k.notHandedOverSub')} />
      </div>

      <Panel className="mt-4" pad={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line/70 px-4 py-3">
          <Segmented size="sm" value={view} onChange={setView} items={[{ value: 'list', label: t('dash.ipl.view.list') }, { value: 'matrix', label: t('dash.ipl.view.matrix') }]} />
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
            <Input value={q} onChange={(e) => reset(() => setQ(e.target.value))} placeholder={t('dash.ipl.search')} className="!py-2 pl-9 text-sm" />
          </div>
          <Select value={block} onChange={(e) => reset(() => setBlock(e.target.value))} className="!w-auto !py-2 text-sm" aria-label={t('dash.ipl.block')}>
            <option value="all">{t('dash.ipl.allBlocks')}</option>
            {blocks.map((b) => <option key={b} value={b}>{t('dash.ipl.blockN', { b })}</option>)}
          </Select>
        </div>
        <div className="flex flex-wrap gap-1.5 border-b border-line/70 px-4 py-2.5">
          {FILTERS.map((f) => <Chip key={f} active={filter === f} count={counts[f]} onClick={() => reset(() => setFilter(f))}>{t(`dash.ipl.f.${f}`)}</Chip>)}
        </div>
        {view === 'list' ? (
          <DataTable
            rows={pageRows}
            rowKey={(r) => r.unit.id}
            empty={t('dash.nothing')}
            rowClassName={(r) => (r.needsAction ? 'bg-[#FFF7F7]' : '')}
            columns={[
              { key: 'unit', header: t('common.unit'), render: (r) => <UnitLink unitId={r.unit.id} /> },
              { key: 'owner', header: t('dash.ipl.col.owner'), render: (r) => <OwnerCell r={r} /> },
              { key: 'bast', header: 'BAST', render: (r) => <span className="text-xs">{r.unit.handover.bastDate ? formatDate(r.unit.handover.bastDate, lang, 'short') : '—'}</span> },
              { key: 'move', header: t('dash.ipl.col.moveIn'), render: (r) => <span className="text-xs">{r.unit.moveIn ? formatDate(r.unit.moveIn.date, lang, 'short') : '—'}</span> },
              { key: 'free', header: t('dash.ipl.col.freeUntil'), render: (r) => <span className="text-xs">{r.freeUntil ? formatDate(r.freeUntil, lang, 'month') : '—'}</span> },
              { key: 'ipl', header: 'IPL', render: (r) => (r.unit.handover.bastDate ? <IplPill bills={r.bills} today={data.today} dueDay={data.dueDay} /> : <StatusPill>{t('dash.ipl.notHandedOver')}</StatusPill>) },
              { key: 'od', header: t('dash.ipl.col.overdue'), align: 'right', render: (r) => (r.overdueAmount ? <b className="tabular text-[#B4192A]">{formatRp(r.overdueAmount)}</b> : <span className="text-ink/30">—</span>) },
              { key: 'flag', header: t('dash.ipl.col.action'), render: (r) => (r.needsAction ? <StatusPill tone="danger" dot>{t('dash.ipl.flag')}</StatusPill> : null) },
              { key: 'cns', header: t('dash.ipl.col.consequences'), render: (r) => <ConsequencePills r={r} /> },
              { key: 'go', header: '', render: (r) => <Link to={`/dashboard/ipl/${r.unit.id}`} className="text-xs font-bold text-brand hover:underline">{t('common.detail')}</Link> },
            ]}
          />
        ) : (
          <Matrix rows={pageRows} months={data.months} today={data.today} dueDay={data.dueDay} />
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 px-4 py-2.5 text-xs text-ink/55">
          <span>{t('dash.ipl.ruleNote', { n: data.flagMonths })}</span>
          <span className="flex items-center gap-2">
            {t('dash.showing', { n: pageRows.length, total: rows.length })}
            <button aria-label={t('dash.ipl.prev')} disabled={safePage === 0} onClick={() => setPage(safePage - 1)} className="rounded-md border border-line p-1 disabled:opacity-30"><ChevronLeft className="h-3.5 w-3.5" /></button>
            <span className="tabular">{safePage + 1}/{pages}</span>
            <button aria-label={t('dash.ipl.next')} disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)} className="rounded-md border border-line p-1 disabled:opacity-30"><ChevronRight className="h-3.5 w-3.5" /></button>
          </span>
        </div>
      </Panel>
    </div>
  );
}

function OwnerCell({ r }: { r: UnitBillingRow }) {
  const t = useT();
  return (
    <div className="min-w-0">
      <p className="truncate text-sm">{r.ownerName || '—'}</p>
      {r.renterName && <p className="truncate text-[11px] text-ink/50"><StatusPill tone="gold" className="mr-1 !px-1.5 !py-0 !text-[10px]">{t('role.renter')}</StatusPill>{r.renterName}</p>}
    </div>
  );
}

export function ConsequencePills({ r }: { r: Pick<UnitBillingRow, 'activeConsequences'> }) {
  const t = useT();
  if (!r.activeConsequences.length) return <span className="text-ink/30">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {r.activeConsequences.map((c) => <StatusPill key={c.id} tone={c.type === 'warningLetter' ? 'warning' : 'danger'}>{t(`dash.cns.short.${c.type}`)}</StatusPill>)}
    </span>
  );
}

function Matrix({ rows, months, today, dueDay }: { rows: UnitBillingRow[]; months: MonthKey[]; today: string; dueDay: number }) {
  const t = useT();
  const [lang] = useLang();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-xs">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-ink/45">
            <th className="sticky left-0 bg-white px-4 py-2 text-left">{t('common.unit')}</th>
            {months.map((m) => <th key={m} className={cx('px-1 py-2 text-center font-semibold', m === monthOf(today) && 'text-brand')}>{formatDate(m, lang, 'month').replace(/ (\d{2})(\d{2})$/, ' $2')}</th>)}
            <th className="px-3 py-2 text-right">{t('dash.ipl.col.overdue')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.unit.id} className="border-t border-line/60">
              <td className="sticky left-0 bg-white px-4 py-1.5"><UnitLink unitId={r.unit.id} /></td>
              {months.map((m) => {
                const b = r.bills.find((x) => x.month === m);
                const st = b ? billStatus(b, today, dueDay) : 'none';
                const c = CELL[st];
                return (
                  <td key={m} className="px-0.5 py-1">
                    <span title={`${r.unit.code} · ${formatDate(m, lang, 'month')} · ${t(st === 'none' ? 'dash.ipl.cell.noneLong' : `status.${st}`)}`} className={cx('mx-auto flex h-6 w-7 items-center justify-center rounded-md text-[11px] font-bold', c.cls)}>
                      {t(`dash.ipl.cell.${c.letter}`)}
                    </span>
                  </td>
                );
              })}
              <td className="px-3 py-1.5 text-right tabular">{r.overdueAmount ? <b className="text-[#B4192A]">{formatRpShort(r.overdueAmount)}</b> : <span className="text-ink/30">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-3 border-t border-line/70 px-4 py-2 text-[11px] text-ink/55">
        {(['free', 'paid', 'due', 'overdue', 'none'] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5"><span className={cx('flex h-5 w-6 items-center justify-center rounded text-[10px] font-bold', CELL[k].cls)}>{t(`dash.ipl.cell.${CELL[k].letter}`)}</span>{t(`dash.ipl.legend.${k}`)}</span>
        ))}
      </div>
    </div>
  );
}
