import { Check, Search } from 'lucide-react';
import { useState } from 'react';
import { diffDays, formatDate } from '../../../domain/clock';
import { formatRp } from '../../../domain/money';
import { useLang, useT } from '../../../i18n';
import { reviewRegistration } from '../../../store/actions';
import { useDashboardProject, useDerived, useRun } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Chip } from '../../../ui/Chip';
import { cx } from '../../../ui/cx';
import { DataTable } from '../../../ui/DataTable';
import { Textarea } from '../../../ui/Field';
import { Kpi } from '../../../ui/Kpi';
import { Modal } from '../../../ui/Modal';
import { Photo } from '../../../ui/Photo';
import { StatusPill, type PillTone } from '../../../ui/StatusPill';
import { Tabs } from '../../../ui/Tabs';
import { useToast } from '../../../ui/Toast';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { UnitLink } from '../components/UnitLink';
import { maskPhone } from '../util';

const REG_TONE: Record<string, PillTone> = { submitted: 'warning', needsFix: 'info', approved: 'success', rejected: 'danger' };

export default function Residents() {
  const t = useT();
  const [lang] = useLang();
  const run = useRun();
  const toast = useToast();
  const project = useDashboardProject();
  const rentersOn = project.settings.features.renterRegistration;
  const [tab, setTab] = useState<'all' | 'verify' | 'lease'>('all');
  const [q, setQ] = useState('');
  const [role, setRole] = useState<'all' | 'owner' | 'renter'>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [fixNote, setFixNote] = useState<string | null>(null);
  const data = useDerived((d) => {
    const units = d.units.filter((u) => u.projectId === project.id);
    const unitIds = new Set(units.map((u) => u.id));
    const cust = (id?: number) => d.vles.customers.find((c) => c.customer_id === id);
    const people = [
      ...units.filter((u) => u.ownerCustomerId && u.handover.bastDate).map((u) => ({ key: `o-${u.id}`, unitId: u.id, code: u.code, name: cust(u.ownerCustomerId)?.name ?? '', phone: cust(u.ownerCustomerId)?.no_hp ?? '', role: 'owner' as const, ownerName: '', status: u.occupancy, since: u.moveIn?.date ?? u.handover.bastDate })),
      ...d.renters.filter((r) => r.status === 'active' && unitIds.has(r.unitId)).map((r) => ({ key: `r-${r.id}`, unitId: r.unitId, code: units.find((u) => u.id === r.unitId)!.code, name: r.name, phone: r.no_hp, role: 'renter' as const, ownerName: cust(r.ownerCustomerId)?.name ?? '', status: r.movedInAt ? 'occupied' : 'handedOver', since: r.lease.start })),
    ].sort((a, b) => a.code.localeCompare(b.code));
    const regs = d.registrations.filter((r) => unitIds.has(r.unitId)).map((r) => ({ r, ownerName: cust(r.ownerCustomerId)?.name ?? '', code: units.find((u) => u.id === r.unitId)!.code })).sort((a, b) => (a.r.status === 'submitted' ? -1 : 1) - (b.r.status === 'submitted' ? -1 : 1) || b.r.createdAt.localeCompare(a.r.createdAt));
    const leases = d.renters.filter((r) => r.status === 'active' && unitIds.has(r.unitId)).map((r) => ({ r, left: diffDays(d.today, r.lease.end), ownerName: cust(r.ownerCustomerId)?.name ?? '' })).filter((x) => x.left <= 30).sort((a, b) => a.left - b.left);
    const renterRenos = d.renovations.filter((x) => unitIds.has(x.unitId) && x.requestedBy === 'renter');
    return { people, regs, leases, renterRenos, activeRenters: d.renters.filter((r) => r.status === 'active' && unitIds.has(r.unitId)).length };
  }, [project.id]);
  const people = data.people.filter((p) => (role === 'all' || p.role === role) && `${p.code} ${p.name}`.toLowerCase().includes(q.toLowerCase()));
  const sel = data.regs.find((x) => x.r.id === selected) ?? data.regs.find((x) => x.r.status === 'submitted');
  const decide = (decision: 'approve' | 'needsFix' | 'reject', note?: string) => {
    if (!sel) return;
    const r = run(reviewRegistration, { id: sel.r.id, decision, note });
    if (!r.ok) return toast.show(t(r.error), 'error');
    toast.show(t(`dash.res.decided.${decision}`, { name: sel.r.person.name }));
    setFixNote(null);
  };
  const tabs = [{ value: 'all' as const, label: t('dash.res.tab.all'), count: data.people.length }, ...(rentersOn ? [{ value: 'verify' as const, label: t('dash.res.tab.verify'), count: data.regs.filter((x) => x.r.status === 'submitted').length }, { value: 'lease' as const, label: t('dash.res.tab.lease'), count: data.leases.length }] : [])];
  return (
    <div>
      <PageHeader title={t('dash.res.title')} subtitle={rentersOn ? t('dash.res.sub') : t('dash.res.subNoRenters')} />
      {rentersOn && (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label={t('dash.res.k.all')} value={data.regs.length} sub={t('dash.res.k.allSub')} onClick={() => setTab('verify')} />
          <Kpi label={t('dash.res.k.todo')} value={data.regs.filter((x) => x.r.status === 'submitted').length} sub={t('dash.res.k.todoSub')} tone="warning" onClick={() => setTab('verify')} />
          <Kpi label={t('dash.res.k.active')} value={data.activeRenters} sub={t('dash.res.k.activeSub')} />
          <Kpi label={t('dash.res.k.lease')} value={data.leases.length} sub={t('dash.res.k.leaseSub')} onClick={() => setTab('lease')} />
        </div>
      )}
      <Tabs className="mb-4" value={tab} onChange={setTab} items={tabs} />

      {tab === 'all' && (
        <Panel pad={false}>
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <div className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-line px-3"><Search className="h-4 w-4 text-ink/40" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('dash.res.search')} className="flex-1 bg-transparent text-sm outline-none" /></div>
            {(rentersOn ? (['all', 'owner', 'renter'] as const) : (['all', 'owner'] as const)).map((r) => <Chip key={r} active={role === r} onClick={() => setRole(r)}>{r === 'all' ? t('common.all') : t(`role.${r}`)}</Chip>)}
          </div>
          <DataTable
            rows={people.slice(0, 60)}
            rowKey={(p) => p.key}
            maxHeight={560}
            columns={[
              { key: 'unit', header: t('common.unit'), render: (p) => <UnitLink unitId={p.unitId} /> },
              { key: 'name', header: t('dash.res.name'), render: (p) => <span className="font-semibold">{p.name}</span> },
              { key: 'role', header: t('dash.res.role'), render: (p) => (p.role === 'renter' ? <StatusPill tone="gold">{t('dash.renterOf', { name: p.ownerName })}</StatusPill> : <StatusPill tone="brand">{t('role.owner')}</StatusPill>) },
              { key: 'phone', header: t('login.phone'), render: (p) => <span className="font-mono text-xs">{maskPhone(p.phone)}</span> },
              { key: 'status', header: t('common.status'), render: (p) => <StatusPill tone={p.status === 'occupied' ? 'success' : 'warning'}>{t(`occupancy.${p.status}`)}</StatusPill> },
              { key: 'since', header: t('dash.res.since'), render: (p) => (p.since ? formatDate(p.since, lang) : '—') },
            ]}
          />
          {people.length > 60 && <p className="border-t border-line px-4 py-2 text-xs text-ink/45">{t('dash.showing', { n: 60, total: people.length })}</p>}
        </Panel>
      )}

      {tab === 'verify' && (
        <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
          <Panel pad={false}>
            <DataTable
              rows={data.regs}
              rowKey={(x) => x.r.id}
              onRowClick={(x) => setSelected(x.r.id)}
              rowClassName={(x) => (sel?.r.id === x.r.id ? 'bg-brand-tint/40' : undefined)}
              columns={[
                { key: 'unit', header: t('common.unit'), render: (x) => <div><b>{x.code}</b><p className="text-xs text-ink/50">{t('dash.res.ownerLine', { name: x.ownerName })}</p></div> },
                { key: 'type', header: t('dash.res.type'), render: (x) => <StatusPill tone={x.r.type === 'renter' ? 'gold' : 'info'}>{t(x.r.type === 'renter' ? 'dash.res.rent' : 'dash.res.sale')}</StatusPill> },
                { key: 'who', header: t('dash.res.newOccupant'), render: (x) => <div><p className="font-semibold">{x.r.person.name}</p><p className="font-mono text-xs text-ink/50">{maskPhone(x.r.person.no_hp)}</p></div> },
                { key: 'period', header: t('dash.res.period'), render: (x) => (x.r.lease ? `${formatDate(x.r.lease.start, lang, 'short')} – ${formatDate(x.r.lease.end, lang)}` : x.r.ajbDate ? t('renters.ajb', { date: formatDate(x.r.ajbDate, lang) }) : '—') },
                { key: 'fee', header: t('dash.res.fee'), render: (x) => (x.r.fee === 0 ? t('status.free') : x.r.feePaid ? `${formatRp(x.r.fee)} · ${t('status.paid')}` : <span className="text-[#9A5B00]">{t('dash.res.unpaid')}</span>) },
                { key: 'status', header: t('common.status'), render: (x) => <StatusPill tone={REG_TONE[x.r.status]}>{t(`renters.status.${x.r.status}`)}</StatusPill> },
              ]}
            />
          </Panel>
          {sel && (
            <Panel className="border-2 border-brand" title={`${sel.code} · ${t(sel.r.type === 'renter' ? 'role.renter' : 'role.newOwner')}`} right={<StatusPill tone={REG_TONE[sel.r.status]}>{t(`renters.status.${sel.r.status}`)}</StatusPill>}>
              <p className="font-bold">{sel.r.person.name} <span className="font-mono text-sm font-normal text-ink/55">· {maskPhone(sel.r.person.no_hp)}</span></p>
              <p className="text-sm text-ink/55">{sel.r.lease ? `${formatDate(sel.r.lease.start, lang)} – ${formatDate(sel.r.lease.end, lang)} · ` : ''}{t('dash.res.people', { n: sel.r.person.householdSize })} · {t('dash.res.registeredBy', { name: sel.ownerName })}</p>
              <dl className="mt-3 divide-y divide-line text-sm">
                <div className="flex justify-between py-2"><dt className="text-ink/60">KTP</dt><dd className="flex items-center gap-1 font-semibold text-[#17703D]"><Check className="h-4 w-4" />{t('dash.res.ktpOk')}</dd></div>
                <div className="flex items-center justify-between py-2"><dt className="text-ink/60">{t(sel.r.type === 'renter' ? 'wizard.leaseDoc' : 'wizard.ajbDoc')}</dt><dd>{sel.r.leaseDocPhotoId ? <Photo id={sel.r.leaseDocPhotoId} className="h-10 w-14 rounded-md" /> : '—'}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-ink/60">{t('dash.res.vehicles')}</dt><dd className="font-semibold">{sel.r.vehicles.map((v) => v.plate).join(', ') || '—'}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-ink/60">{t('dash.res.cardsLine', { cards: sel.r.cards ?? 1, stickers: sel.r.vehicles.length })}</dt><dd className={cx('font-semibold', sel.r.feePaid || sel.r.fee === 0 ? 'text-[#17703D]' : 'text-[#9A5B00]')}>{sel.r.fee === 0 ? t('status.free') : sel.r.feePaid ? `${t('status.paid')} ${formatRp(sel.r.fee)}` : t('dash.res.unpaid')}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-ink/60">{t('dash.res.rules')}</dt><dd className="font-semibold text-[#B4192A]">{t('dash.res.rulesAfter')}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-ink/60">{t('dash.res.movePlan')}</dt><dd className="font-semibold">{formatDate(sel.r.moveIn.date, lang)} · {sel.r.moveIn.time}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-ink/60">{t('dash.res.iplPayer')}</dt><dd className="font-semibold">{t(`role.${sel.r.iplPayer}`)}</dd></div>
              </dl>
              {sel.r.reviewNote && <p className="mt-2 rounded-xl bg-paper p-2.5 text-xs"><b>{t('tracker.estateNote')}</b> {sel.r.reviewNote}</p>}
              <p className="mt-3 rounded-xl bg-paper p-3 text-xs text-ink/65"><b>{t('dash.res.onApprove')}</b> {t(sel.r.type === 'renter' ? 'dash.res.onApproveRenter' : 'dash.res.onApproveOwner')}</p>
              {(sel.r.status === 'submitted' || sel.r.status === 'needsFix') && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Button className="col-span-3" onClick={() => decide('approve')} disabled={!sel.r.feePaid && sel.r.fee > 0}>{t('dash.res.approve')}</Button>
                  <Button className="col-span-2" variant="secondary" onClick={() => setFixNote('')}>{t('dash.res.needsFix')}</Button>
                  <Button variant="ghost" onClick={() => decide('reject')}>{t('dash.res.reject')}</Button>
                </div>
              )}
              {!sel.r.feePaid && sel.r.fee > 0 && sel.r.status === 'submitted' && <p className="mt-2 text-xs text-[#9A5B00]">{t('error.feeUnpaid')}</p>}
            </Panel>
          )}
        </div>
      )}

      {tab === 'lease' && (
        <Panel pad={false}>
          <DataTable
            rows={data.leases}
            rowKey={(x) => x.r.id}
            empty={t('dash.nothing')}
            columns={[
              { key: 'unit', header: t('common.unit'), render: (x) => <UnitLink unitId={x.r.unitId} /> },
              { key: 'renter', header: t('role.renter'), render: (x) => x.r.name },
              { key: 'owner', header: t('role.owner'), render: (x) => x.ownerName },
              { key: 'end', header: t('wizard.leaseEnd'), render: (x) => formatDate(x.r.lease.end, lang) },
              { key: 'left', header: t('dash.res.left'), render: (x) => <StatusPill tone={x.left <= 7 ? 'danger' : 'warning'}>{t('common.days', { n: x.left })}</StatusPill> },
              { key: 'act', header: '', align: 'right', render: () => <Button size="sm" variant="secondary" onClick={() => toast.show(t('dash.res.reminded'))}>{t('dash.res.remind')}</Button> },
            ]}
          />
        </Panel>
      )}

      {rentersOn && data.renterRenos.length > 0 && (
        <Panel className="mt-4" title={t('dash.res.renterRenos')}>
          {data.renterRenos.map((r) => (
            <div key={r.id} className="flex items-center justify-between border-b border-line py-2.5 text-sm first:pt-0 last:border-0">
              <span><b>{r.id}</b> · <UnitLink unitId={r.unitId} /> · {r.title}<span className="block text-xs text-ink/50">{t('dash.res.renoNote')}</span></span>
              <StatusPill tone={r.step === 'ownerApproval' ? 'warning' : 'info'}>{t(`reno.step.${r.step}`)}</StatusPill>
            </div>
          ))}
        </Panel>
      )}
      <Modal open={fixNote !== null} onClose={() => setFixNote(null)} title={t('dash.res.needsFix')} footer={<Button onClick={() => decide('needsFix', fixNote || t('dash.res.defaultFix'))}>{t('common.submit')}</Button>}>
        <Textarea value={fixNote ?? ''} onChange={(e) => setFixNote(e.target.value)} placeholder={t('dash.res.defaultFix')} />
      </Modal>
    </div>
  );
}
