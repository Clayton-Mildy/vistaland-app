import { freeUntilMonth } from '../../../domain/ipl';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../../domain/clock';
import { isOverSla, isUnfinished } from '../../../domain/complaints';
import { needsFollowUp, occupancyFunnel } from '../../../domain/report';
import type { Bill } from '../../../domain/types';
import { tText, useLang, useT } from '../../../i18n';
import { confirmSelfReportedMoveIn, estateDecideRenovation } from '../../../store/actions';
import { useDashboardProject, useDerived, useRun } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { DataTable } from '../../../ui/DataTable';
import { StatusPill, type PillTone } from '../../../ui/StatusPill';
import { useToast } from '../../../ui/Toast';
import { IplPill } from '../components/IplPill';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { UnitLink } from '../components/UnitLink';

const TAG_TONE: Record<string, PillTone> = { app: 'warning', rules: 'warning', ipl: 'info', handover: 'neutral', overdue: 'danger', sla: 'danger', lease: 'gold' };

export default function Summary() {
  const t = useT();
  const [lang] = useLang();
  const nav = useNavigate();
  const run = useRun();
  const toast = useToast();
  const project = useDashboardProject();
  const data = useDerived((d) => {
    const units = d.units.filter((u) => u.projectId === project.id);
    const unitIds = new Set(units.map((u) => u.id));
    const billsBy = new Map<string, Bill[]>();
    for (const b of d.bills) if (unitIds.has(b.unitId)) billsBy.set(b.unitId, [...(billsBy.get(b.unitId) ?? []), b]);
    const permits = d.moveIns.filter((m) => unitIds.has(m.unitId) && m.status !== 'cancelled');
    const activity = (u: (typeof units)[number]) => [u.handover.bastDate, u.moveIn?.date, u.appActivatedAt, permits.find((p) => p.unitId === u.id)?.date].filter(Boolean).sort().at(-1) ?? '';
    const rows = units.filter((u) => u.handover.bastDate).sort((a, b) => activity(b).localeCompare(activity(a))).slice(0, 12).map((u) => ({
      u, owner: d.vles.customers.find((c) => c.customer_id === u.ownerCustomerId)?.name ?? '', renter: u.renterId ? d.renters.find((r) => r.id === u.renterId) : undefined,
      permit: permits.find((p) => p.unitId === u.id && p.status === 'approved'), bills: billsBy.get(u.id) ?? [],
    }));
    const complaints = d.complaints.filter((c) => unitIds.has(c.unitId) && c.submittedAt);
    const openFindings = complaints.flatMap((c) => c.findings.filter(isUnfinished).map((f) => ({ c, f })));
    return {
      funnel: occupancyFunnel(d, project.id), follow: needsFollowUp(d, project.id), rows, today: d.today,
      selfReported: units.filter((u) => u.selfReportedMoveIn && u.occupancy !== 'occupied'),
      renovations: d.renovations.filter((r) => unitIds.has(r.unitId) && r.step === 'estateReview'),
      openComplaints: complaints.filter((c) => c.findings.some(isUnfinished)).slice(0, 4),
      openCount: openFindings.length,
      overSla: openFindings.filter(({ c, f }) => isOverSla(f, c.submittedAt!, project.settings.complaints.slaDays[f.category], d.today)).length,
      moveIns: permits.filter((p) => p.status === 'approved' && p.date >= d.today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5),
    };
  }, [project.id]);
  const funnel: [string, number][] = [['dash.funnel.akad', data.funnel.akad], ['dash.funnel.handover', data.funnel.handover], ['dash.funnel.app', data.funnel.app], ['dash.funnel.rules', data.funnel.rules], ['dash.funnel.occupied', data.funnel.occupied]];
  const max = Math.max(1, data.funnel.akad);
  return (
    <div>
      <PageHeader title={t('dash.summary.title')} subtitle={t('dash.summary.sub')} actions={<Button onClick={() => nav('/dashboard/report')}>{t('dash.summary.report')}</Button>} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title={t('dash.summary.funnel')}>
          <div className="space-y-3">
            {funnel.map(([k, v], i) => (
              <div key={k} className="grid grid-cols-[130px_1fr_48px] items-center gap-3 text-sm">
                <span className="text-ink/70">{t(k)}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-[#EEF0F3]"><div className={i === 0 ? 'h-full rounded-full bg-[#9AA6B8]' : 'h-full rounded-full bg-gradient-to-r from-brand to-brand-dark'} style={{ width: `${(v / max) * 100}%` }} /></div>
                <b className="text-right tabular">{v}</b>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title={t('dash.summary.follow')} right={t('dash.summary.followCount', { n: data.follow.length + data.selfReported.length })}>
          <ul className="-my-1 max-h-[230px] divide-y divide-line overflow-y-auto">
            {data.selfReported.map((u) => (
              <li key={u.id} className="flex items-center gap-3 py-2.5 text-sm">
                <StatusPill tone="info">{t('dash.tag.selfReported')}</StatusPill>
                <span className="flex-1">{t('dash.follow.selfReported', { unit: u.code, date: formatDate(u.selfReportedMoveIn!, lang) })}</span>
                <Button size="sm" variant="secondary" onClick={() => { run(confirmSelfReportedMoveIn, { unitId: u.id }); toast.show(t('dash.confirmed')); }}>{t('common.confirm')}</Button>
              </li>
            ))}
            {data.follow.slice(0, 8).map((f, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
                <StatusPill tone={TAG_TONE[f.tag]}>{t(`dash.tag.${f.tag}`)}</StatusPill>
                <button onClick={() => nav(f.link)} className="flex-1 text-left hover:text-brand">{tText(t, f.text)}</button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel className="mt-4" title={t('dash.summary.occupancy')} right={t('dash.summary.occupancyHint')} pad={false}>
        <DataTable
          rows={data.rows}
          rowKey={(r) => r.u.id}
          onRowClick={(r) => nav(`/dashboard/ipl/${r.u.id}`)}
          columns={[
            { key: 'unit', header: t('common.unit'), render: (r) => <div><UnitLink unitId={r.u.id} /><p className="text-xs text-ink/50">{r.owner}</p>{r.renter && <StatusPill tone="gold" className="mt-0.5">{t('dash.renterOf', { name: r.renter.name })}</StatusPill>}</div> },
            { key: 'bast', header: t('dash.col.handover'), render: (r) => formatDate(r.u.handover.bastDate!, lang) },
            { key: 'app', header: t('dash.col.app'), render: (r) => (r.u.appActivatedAt ? t('dash.yes.app') : <span className="font-semibold text-[#B4192A]">{t('dash.no')}</span>) },
            { key: 'rules', header: t('dash.col.rules'), render: (r) => (r.u.rules ? t('dash.yes.rules') : <span className="font-semibold text-[#B4192A]">{t('dash.no')}</span>) },
            { key: 'movein', header: t('dash.col.moveIn'), render: (r) => (r.u.moveIn ? formatDate(r.u.moveIn.date, lang) : r.permit ? t('dash.scheduled', { date: formatDate(r.permit.date, lang, 'short') }) : '—') },
            { key: 'source', header: t('dash.col.source'), render: (r) => <span className="text-xs text-ink/60">{r.u.moveIn ? t(`movein.source.${r.u.moveIn.source}`) : r.permit ? t('dash.source.permit') : '—'}</span> },
            { key: 'ipl', header: 'IPL', render: (r) => <IplPill bills={r.bills} today={data.today} dueDay={project.settings.ipl.dueDay} freeUntil={r.u.handover.bastDate ? freeUntilMonth(r.u.handover.bastDate, project.settings.ipl) : undefined} /> },
          ]}
        />
      </Panel>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title={t('dash.summary.renovations')} right={t('dash.nRequests', { n: data.renovations.length })}>
          {data.renovations.length === 0 && <p className="text-sm text-ink/45">{t('dash.nothing')}</p>}
          {data.renovations.map((r) => (
            <div key={r.id} className="border-b border-line pb-3 last:border-0 last:pb-0 [&+div]:pt-3">
              <p className="text-sm"><b>{r.id}</b> · <UnitLink unitId={r.unitId} /></p>
              <p className="text-xs text-ink/55">{r.title} · {formatDate(r.history[0].at.slice(0, 10), lang, 'short')}{r.requestedBy === 'renter' ? ` · ${t('role.renter')}` : ''}</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => { run(estateDecideRenovation, { id: r.id, approve: false }); toast.show(t('dash.reno.revision')); }}>{t('dash.reno.reject')}</Button>
                <Button size="sm" onClick={() => { run(estateDecideRenovation, { id: r.id, approve: true }); toast.show(t('dash.reno.approved')); }}>{t('reno.approve')}</Button>
              </div>
            </div>
          ))}
        </Panel>
        <Panel title={t('dash.summary.complaints')} right={t('dash.summary.complaintsMeta', { n: data.openCount, sla: data.overSla })}>
          {data.openComplaints.map((c) => {
            const worst = c.findings.find(isUnfinished)!;
            return (
              <button key={c.id} onClick={() => nav('/dashboard/complaints')} className="flex w-full items-center justify-between gap-2 border-b border-line py-2.5 text-left first:pt-0 last:border-0">
                <span className="min-w-0"><span className="block text-sm"><b>{c.id}</b> · <UnitLink unitId={c.unitId} /></span><span className="block truncate text-xs text-ink/55">{t(`category.${worst.category}`)} · {worst.description}</span></span>
                <StatusPill tone={isOverSla(worst, c.submittedAt!, project.settings.complaints.slaDays[worst.category], data.today) ? 'danger' : 'info'}>{t(`stage.${worst.stage}`)}</StatusPill>
              </button>
            );
          })}
          <button onClick={() => nav('/dashboard/complaints')} className="mt-2 flex items-center gap-1 text-xs font-bold text-brand">{t('common.seeAll')}<ArrowRight className="h-3 w-3" /></button>
        </Panel>
        <Panel title={t('dash.summary.moveIns')} right={t('dash.summary.forSecurity')}>
          {data.moveIns.length === 0 && <p className="text-sm text-ink/45">{t('dash.nothing')}</p>}
          {data.moveIns.map((m) => (
            <div key={m.id} className="flex items-center justify-between border-b border-line py-2.5 first:pt-0 last:border-0">
              <span className="text-sm"><UnitLink unitId={m.unitId} /> · {formatDate(m.date, lang, 'weekday')}<span className="block text-xs text-ink/50">{m.time} · {t(`movein.v.${m.vehicle}`)}{m.who === 'renter' ? ` · ${t('role.renter')}` : ''}</span></span>
              <StatusPill tone="success">{t('dash.approved')}</StatusPill>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}
