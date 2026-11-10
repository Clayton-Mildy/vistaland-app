import { Siren } from 'lucide-react';
import { addDays, diffDays, formatDate, formatDateTime, formatTime } from '../../../domain/clock';
import type { PanicSignal } from '../../../domain/types';
import { useLang, useT } from '../../../i18n';
import { useDashboardProject, useDerived } from '../../../store/hooks';
import { DataTable } from '../../../ui/DataTable';
import { Kpi } from '../../../ui/Kpi';
import { StatusPill, type PillTone } from '../../../ui/StatusPill';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { UnitLink } from '../components/UnitLink';

const OUTCOME_TONE: Record<NonNullable<PanicSignal['outcome']>, PillTone> = { handled: 'success', falseAlarm: 'warning', cancelled: 'neutral' };
const minutesBetween = (a: string, b: string) => Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000));

export default function Security() {
  const t = useT();
  const [lang] = useLang();
  const project = useDashboardProject();
  const data = useDerived((d) => {
    const ids = new Set(d.units.filter((u) => u.projectId === project.id).map((u) => u.id));
    const panics = d.panics.filter((p) => ids.has(p.unitId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    // A rolling 30-day window, so the numbers never reset to zero on the 1st.
    const since = addDays(d.today, -30);
    const thisMonth = panics.filter((p) => p.createdAt.slice(0, 10) >= since);
    const responses = thisMonth.filter((p) => p.acceptedAt).map((p) => minutesBetween(p.createdAt, p.acceptedAt!));
    const falseByUnit = new Map<string, number>();
    for (const p of thisMonth) if (p.outcome === 'falseAlarm') falseByUnit.set(p.unitId, (falseByUnit.get(p.unitId) ?? 0) + 1);
    const moveIns = d.moveIns.filter((m) => ids.has(m.unitId) && m.status !== 'cancelled' && m.date >= d.today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    return {
      panics, today: d.today,
      active: panics.filter((p) => !p.resolvedAt),
      monthCount: thisMonth.length,
      avgResponse: responses.length ? Math.round((responses.reduce((a, b) => a + b, 0) / responses.length) * 10) / 10 : null,
      falseByUnit: [...falseByUnit.entries()].sort((a, b) => b[1] - a[1]),
      moveIns,
      staffName: new Map(d.staff.map((s) => [s.id, s.name])),
    };
  }, [project.id]);
  const typeLabel = (p: PanicSignal) => (p.type ? t(`emergency.type.${p.type}`) : t('sec.e.unknownType'));

  return (
    <div>
      <PageHeader title={t('dash.sec.title')} subtitle={t('dash.sec.sub')} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t('dash.sec.k.active')} value={data.active.length} sub={t('dash.sec.k.activeSub')} tone={data.active.length ? 'danger' : undefined} />
        <Kpi label={t('dash.sec.k.month')} value={data.monthCount} sub={t('dash.sec.k.monthSub')} />
        <Kpi label={t('dash.sec.k.response')} value={data.avgResponse === null ? '—' : t('dash.sec.k.responseValue', { n: data.avgResponse })} sub={t('dash.sec.k.responseSub')} />
        <Kpi label={t('dash.sec.k.moveIns')} value={data.moveIns.filter((m) => m.date === data.today).length} sub={t('dash.sec.k.moveInsSub', { n: data.moveIns.length })} />
      </div>

      {data.active.length > 0 && (
        <Panel className="mt-4 border-2 border-[#C81E2E]" title={<span className="flex items-center gap-2 text-[#B4192A]"><Siren className="h-4 w-4" />{t('dash.sec.activeTitle')}</span>}>
          <ul className="space-y-2">
            {data.active.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#FFF5F6] px-3 py-2.5">
                <span className="text-sm">
                  <UnitLink unitId={p.unitId} /> · {typeLabel(p)} {p.awayFromHome && <StatusPill tone="warning" className="ml-1">{t('sec.e.away')}</StatusPill>}
                  <span className="block text-xs text-ink/55">{formatDateTime(p.createdAt, lang)}</span>
                </span>
                <StatusPill tone={p.acceptedAt ? 'info' : 'danger'} dot>{p.acceptedAt ? t('dash.sec.onTheWay', { name: data.staffName.get(p.acceptedBy ?? '') ?? '' }) : t('dash.sec.waiting')}</StatusPill>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_320px]">
        <Panel title={t('dash.sec.history')} pad={false}>
          <DataTable
            rows={data.panics}
            rowKey={(p) => p.id}
            empty={t('dash.nothing')}
            maxHeight={460}
            columns={[
              { key: 'unit', header: t('common.unit'), render: (p) => <UnitLink unitId={p.unitId} /> },
              { key: 'type', header: t('dash.sec.col.type'), render: (p) => <span className="text-sm">{typeLabel(p)}</span> },
              { key: 'at', header: t('dash.sec.col.at'), render: (p) => <span className="text-xs">{formatDate(p.createdAt.slice(0, 10), lang, 'short')} · {formatTime(p.createdAt)}</span> },
              { key: 'by', header: t('dash.sec.col.by'), render: (p) => <span className="text-xs">{p.acceptedBy ? data.staffName.get(p.acceptedBy) ?? p.acceptedBy : '—'}</span> },
              { key: 'resp', header: t('dash.sec.col.response'), align: 'right', render: (p) => (p.acceptedAt ? <span className="tabular text-xs">{t('dash.sec.min', { n: minutesBetween(p.createdAt, p.acceptedAt) })}</span> : '—') },
              { key: 'out', header: t('dash.sec.col.outcome'), render: (p) => (p.resolvedAt ? <StatusPill tone={OUTCOME_TONE[p.outcome ?? 'cancelled']}>{t(`sec.e.outcome.${p.outcome ?? 'cancelled'}`)}</StatusPill> : <StatusPill tone="danger" dot>{t('dash.sec.open')}</StatusPill>) },
            ]}
          />
        </Panel>
        <Panel title={t('dash.sec.falseTitle')} right={t('dash.sec.last30')}>
          {data.falseByUnit.length ? (
            <ul className="space-y-1.5">
              {data.falseByUnit.map(([unitId, n]) => (
                <li key={unitId} className="flex items-center justify-between text-sm"><UnitLink unitId={unitId} /><StatusPill tone={n >= 3 ? 'danger' : 'warning'}>{t('dash.sec.nFalse', { n })}</StatusPill></li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink/50">{t('dash.sec.noFalse')}</p>
          )}
          <p className="mt-3 text-[11px] text-ink/45">{t('dash.sec.falseNote')}</p>
        </Panel>
      </div>

      <Panel className="mt-4" title={t('dash.sec.moveIns')} right={t('dash.summary.forSecurity')} pad={false}>
        <DataTable
          rows={data.moveIns}
          rowKey={(m) => m.id}
          empty={t('dash.sec.noMoveIns')}
          columns={[
            { key: 'date', header: t('common.date'), render: (m) => <span className="text-sm">{m.date === data.today ? <b>{t('common.today')}</b> : formatDate(m.date, lang, 'weekday')}<span className="block text-xs text-ink/50">{t('dash.sec.inDays', { n: diffDays(data.today, m.date) })}</span></span> },
            { key: 'time', header: t('common.time'), render: (m) => <span className="text-xs">{m.time}</span> },
            { key: 'unit', header: t('common.unit'), render: (m) => <UnitLink unitId={m.unitId} /> },
            { key: 'who', header: t('dash.sec.col.who'), render: (m) => <StatusPill tone={m.who === 'renter' ? 'gold' : 'neutral'}>{t(`role.${m.who}`)}</StatusPill> },
            { key: 'veh', header: t('dash.sec.col.vehicle'), render: (m) => <span className="text-xs">{t(`movein.v.${m.vehicle}`)}{m.plate ? ` · ${m.plate}` : ''}</span> },
            { key: 'st', header: t('common.status'), render: (m) => <StatusPill tone={m.status === 'entered' ? 'success' : 'info'}>{t(`dash.sec.mv.${m.status}`)}</StatusPill> },
          ]}
        />
      </Panel>
    </div>
  );
}
