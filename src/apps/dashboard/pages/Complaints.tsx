import { ArrowRight, Check, Layers, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BOARD_COLUMNS, CHECKLIST_BY_CATEGORY, isUnfinished } from '../../../domain/complaints';
import { formatDate } from '../../../domain/clock';
import { formatRp } from '../../../domain/money';
import { complaintKpis } from '../../../domain/report';
import type { ComplaintCategory, Renovation } from '../../../domain/types';
import { useLang, useT } from '../../../i18n';
import { createWorkGroup, estateDecideRenovation, estateVerifyFinding, requestInspection, returnDeposit } from '../../../store/actions';
import { useDashboardProject, useDerived, useRun } from '../../../store/hooks';
import { useStore } from '../../../store/store';
import { Button } from '../../../ui/Button';
import { Chip } from '../../../ui/Chip';
import { DataTable } from '../../../ui/DataTable';
import { Field, Input, Select } from '../../../ui/Field';
import { Kpi } from '../../../ui/Kpi';
import { Modal } from '../../../ui/Modal';
import { StatusPill, type PillTone } from '../../../ui/StatusPill';
import { Tabs } from '../../../ui/Tabs';
import { useToast } from '../../../ui/Toast';
import { Toggle } from '../../../ui/Toggle';
import { FindingCard, type BoardItem } from '../components/FindingCard';
import { FindingDrawer } from '../components/FindingDrawer';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { RenovationInspection } from '../components/RenovationInspection';
import { UnitLink } from '../components/UnitLink';

type Role = 'all' | 'estate' | 'contractor' | 'mandor';
type ColKey = (typeof BOARD_COLUMNS)[number]['key'];
const ROLE_COLUMNS: Record<Role, ColKey[]> = {
  all: BOARD_COLUMNS.map((c) => c.key),
  estate: ['estateVerify', 'estateFinal'],
  contractor: ['contractor'],
  mandor: ['mandor'],
};
const CATEGORIES = Object.keys(CHECKLIST_BY_CATEGORY) as ComplaintCategory[];
const DONE_LIMIT = 30;
const RENO_TONE: Partial<Record<Renovation['step'], PillTone>> = { estateReview: 'warning', ownerApproval: 'neutral', awaitingDeposit: 'gold', inProgress: 'info', inspection: 'violet', bastIssued: 'brand', bastSigned: 'brand', depositReturned: 'success', rejected: 'danger' };
const keyOf = (i: BoardItem) => `${i.c.id}:${i.f.id}`;

export default function Complaints() {
  const t = useT();
  const [lang] = useLang();
  const run = useRun();
  const toast = useToast();
  const project = useDashboardProject();
  const [role, setRole] = useState<Role>('all');
  const [category, setCategory] = useState<ComplaintCategory | 'all'>('all');
  const [grouped, setGrouped] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [inspectId, setInspectId] = useState<string | null>(null);

  const data = useDerived((d) => {
    const units = d.units.filter((u) => u.projectId === project.id);
    const code = new Map(units.map((u) => [u.id, u.code]));
    const items: BoardItem[] = d.complaints
      .filter((c) => code.has(c.unitId) && c.submittedAt)
      .flatMap((c) => c.findings.filter((f) => f.stage !== 'draft').map((f) => ({ c, f, unitCode: code.get(c.unitId)!, unitId: c.unitId })));
    const s = d.projects.find((p) => p.id === project.id)!.settings;
    const cust = (id?: number) => d.vles.customers.find((x) => x.customer_id === id)?.name ?? '';
    const renos = d.renovations
      .filter((r) => code.has(r.unitId))
      .map((r) => ({ r, code: code.get(r.unitId)!, owner: cust(units.find((u) => u.id === r.unitId)?.ownerCustomerId), renter: d.renters.find((x) => x.id === r.renterId)?.name }))
      .sort((a, b) => (b.r.history.at(-1)?.at ?? '').localeCompare(a.r.history.at(-1)?.at ?? ''));
    return {
      items, s, today: d.today, renos,
      kpi: complaintKpis(d, project.id),
      mandors: d.staff.filter((x) => x.role === 'mandor' && x.projectIds.includes(project.id)),
      staffName: new Map(d.staff.map((x) => [x.id, x.name])),
    };
  }, [project.id]);

  const visible = data.items.filter((i) => category === 'all' || i.f.category === category);
  const catCounts = useMemo(() => {
    const m = new Map<ComplaintCategory, number>();
    for (const i of data.items) if (isUnfinished(i.f)) m.set(i.f.category, (m.get(i.f.category) ?? 0) + 1);
    return m;
  }, [data.items]);
  const columns = BOARD_COLUMNS.filter((c) => ROLE_COLUMNS[role].includes(c.key)).map((col) => {
    let list = visible.filter((i) => col.stages.includes(i.f.stage));
    if (col.key === 'done') list = list.sort((a, b) => (b.f.history.at(-1)?.at ?? '').localeCompare(a.f.history.at(-1)?.at ?? '')).slice(0, DONE_LIMIT);
    else list = list.sort((a, b) => (a.c.submittedAt ?? '').localeCompare(b.c.submittedAt ?? ''));
    return { ...col, list };
  });
  const open = data.items.find((i) => keyOf(i) === openKey) ?? null;
  const pickedItems = data.items.filter((i) => picked.includes(keyOf(i)) && i.f.stage === 'verified');
  const pickCategory = pickedItems[0]?.f.category;

  const quickVerify = (i: BoardItem) => {
    const r = run(estateVerifyFinding, { complaintId: i.c.id, findingId: i.f.id });
    toast.show(r.ok ? t('dash.cmp.verified') : t(r.error), r.ok ? undefined : 'error');
  };
  const togglePick = (i: BoardItem) => setPicked((xs) => (xs.includes(keyOf(i)) ? xs.filter((x) => x !== keyOf(i)) : [...xs, keyOf(i)]));

  const cardActions = (col: ColKey, i: BoardItem) => {
    if (col === 'estateVerify') return (
      <>
        <Button size="sm" variant="secondary" onClick={() => setOpenKey(keyOf(i))}>{t('dash.cmp.review')}</Button>
        {!i.f.manualReview && i.f.ai.verdict === 'valid' && <Button size="sm" icon={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => quickVerify(i)}>{t('dash.cmp.valid')}</Button>}
      </>
    );
    if (col === 'estateFinal') return <Button size="sm" icon={<Check className="h-3.5 w-3.5" />} onClick={() => setOpenKey(keyOf(i))}>{t('dash.cmp.checkAfter')}</Button>;
    if (col === 'mandor') {
      const doneItems = i.f.checklist.filter((x) => x.done).length;
      return <span className="text-[11px] text-ink/55">{data.staffName.get(i.f.mandorId ?? '') ?? '—'} · {t('dash.cmp.checklistN', { n: doneItems, total: i.f.checklist.length })}</span>;
    }
    if (col === 'residentConfirm') return <span className="text-[11px] text-ink/55">{t('dash.cmp.waitResident')}</span>;
    return null;
  };

  const renderCards = (col: ColKey, list: BoardItem[]) => {
    const card = (i: BoardItem) => (
      <FindingCard
        key={keyOf(i)}
        item={i}
        slaDays={data.s.complaints.slaDays[i.f.category]}
        today={data.today}
        onOpen={() => setOpenKey(keyOf(i))}
        selectable={col === 'contractor'}
        selected={picked.includes(keyOf(i))}
        onToggle={() => {
          if (pickCategory && pickCategory !== i.f.category && !picked.includes(keyOf(i))) return toast.show(t('dash.cmp.oneCategory', { category: t(`category.${pickCategory}`) }), 'error');
          togglePick(i);
        }}
        actions={cardActions(col, i)}
      />
    );
    if (!grouped) return list.map(card);
    const cats = CATEGORIES.filter((k) => list.some((i) => i.f.category === k));
    return cats.map((k) => (
      <div key={k} className="space-y-2">
        <p className="flex items-center justify-between px-0.5 pt-1 text-[11px] font-bold uppercase tracking-wide text-ink/50">{t(`category.${k}`)}<span>{list.filter((i) => i.f.category === k).length}</span></p>
        {list.filter((i) => i.f.category === k).map(card)}
      </div>
    ));
  };

  return (
    <div>
      <PageHeader title={t('dash.cmp.title')} subtitle={t('dash.cmp.sub', { days: data.s.complaints.windowDays })} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t('dash.cmp.k.active')} value={data.kpi.activeFindings} sub={t('dash.cmp.k.activeSub')} />
        <Kpi label={t('dash.cmp.k.avg')} value={data.kpi.avgDaysToDone === null ? '—' : t('dash.cmp.k.avgValue', { n: data.kpi.avgDaysToDone })} sub={t('dash.cmp.k.avgSub')} />
        <Kpi label={t('dash.cmp.k.aiFail')} value={data.kpi.failedFixChecksThisMonth} sub={t('dash.cmp.k.aiFailSub')} tone={data.kpi.failedFixChecksThisMonth ? 'warning' : undefined} />
        <Kpi label={t('dash.cmp.k.window')} value={data.kpi.windowEndingSoon.length} sub={t('dash.cmp.k.windowSub')} />
      </div>

      <Panel className="mt-4" pad={false}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 px-4 pt-2">
          <Tabs value={role} onChange={(v) => { setRole(v); setPicked([]); }} items={(['all', 'estate', 'contractor', 'mandor'] as const).map((r) => ({ value: r, label: t(`dash.cmp.role.${r}`) }))} />
          <span className="flex items-center gap-2 pb-2 text-xs font-semibold text-ink/60"><Layers className="h-3.5 w-3.5" />{t('dash.cmp.groupBy')}<Toggle checked={grouped} onChange={setGrouped} /></span>
        </div>
        <div className="flex flex-wrap gap-1.5 border-b border-line/70 px-4 py-2.5">
          <Chip active={category === 'all'} count={[...catCounts.values()].reduce((a, b) => a + b, 0)} onClick={() => setCategory('all')}>{t('common.all')}</Chip>
          {CATEGORIES.filter((k) => catCounts.get(k) || category === k).map((k) => <Chip key={k} active={category === k} count={catCounts.get(k) ?? 0} onClick={() => setCategory(category === k ? 'all' : k)}>{t(`category.${k}`)}</Chip>)}
        </div>
        <div className="flex gap-3 overflow-x-auto p-4">
          {columns.map((col) => (
            <section key={col.key} className="flex w-[272px] shrink-0 flex-col rounded-2xl bg-[#F6F5F3] p-2.5">
              <header className="mb-2 px-0.5">
                <p className="flex items-center justify-between text-sm font-bold">{t(`dash.cmp.col.${col.key}`)}<span className="rounded-full bg-white px-2 text-xs text-ink/60">{col.list.length}</span></p>
                <p className="text-[11px] text-ink/50">{t(`dash.cmp.colHint.${col.key}`)}</p>
                {col.key === 'contractor' && (
                  <Button size="sm" block className="mt-2" disabled={!pickedItems.length} icon={<Users className="h-3.5 w-3.5" />} onClick={() => setAssigning(true)}>
                    {t('dash.cmp.groupAssign', { n: pickedItems.length })}
                  </Button>
                )}
              </header>
              <div className="space-y-2">
                {col.list.length ? renderCards(col.key, col.list) : <p className="px-1 py-6 text-center text-xs text-ink/40">{t('dash.nothing')}</p>}
              </div>
            </section>
          ))}
        </div>
      </Panel>

      <Panel className="mt-4" title={t('dash.reno2.title')} right={t('dash.nRequests', { n: data.renos.length })} pad={false}>
        <DataTable
          rows={data.renos}
          rowKey={(x) => x.r.id}
          empty={t('dash.nothing')}
          columns={[
            { key: 'id', header: 'ID', render: (x) => <span className="text-xs font-semibold">{x.r.id}</span> },
            { key: 'unit', header: t('common.unit'), render: (x) => <UnitLink unitId={x.r.unitId} /> },
            { key: 'who', header: t('dash.reno2.requester'), render: (x) => (x.renter ? <span className="text-sm">{x.renter} <StatusPill tone="gold">{t('role.renter')}</StatusPill></span> : <span className="text-sm">{x.owner}</span>) },
            { key: 'job', header: t('dash.reno2.job'), render: (x) => <span className="text-sm">{x.r.title}{x.r.objection && <StatusPill tone="danger" className="ml-1">{t('dash.reno2.objection')}</StatusPill>}</span> },
            { key: 'dep', header: t('dash.reno2.depositCol'), render: (x) => depositCell(x.r) },
            { key: 'step', header: t('common.status'), render: (x) => <StatusPill tone={RENO_TONE[x.r.step] ?? 'neutral'}>{t(`reno.short.${x.r.step}`)}</StatusPill> },
            { key: 'act', header: '', render: (x) => renoActions(x.r) },
          ]}
        />
      </Panel>

      <FindingDrawer item={open} mandorName={open?.f.mandorId ? data.staffName.get(open.f.mandorId) : undefined} onClose={() => setOpenKey(null)} />
      {assigning && (
        <AssignModal
          items={pickedItems}
          mandors={data.mandors}
          onClose={() => setAssigning(false)}
          onDone={() => { setAssigning(false); setPicked([]); }}
          projectId={project.id}
        />
      )}
      <RenovationInspection
        reno={data.renos.find((x) => x.r.id === inspectId)?.r ?? null}
        unitCode={data.renos.find((x) => x.r.id === inspectId)?.code ?? ''}
        checklist={data.s.renovation.checklist}
        onClose={() => setInspectId(null)}
      />
    </div>
  );

  function depositCell(r: Renovation) {
    const refund = r.deposit - (r.inspection?.deduction ?? 0);
    const label =
      r.step === 'awaitingDeposit' ? t('dash.reno2.dep.va') :
      r.step === 'inProgress' || r.step === 'inspection' ? t('dash.reno2.dep.held') :
      r.step === 'bastIssued' || r.step === 'bastSigned' ? t('dash.reno2.dep.toReturn', { amount: formatRp(refund) }) :
      r.step === 'depositReturned' ? t('dash.reno2.dep.returned', { amount: formatRp(refund) }) : '—';
    return (
      <span className="text-xs">
        <b className="tabular">{formatRp(r.deposit)}</b>
        <span className="block text-ink/50">{label}</span>
      </span>
    );
  }

  function renoActions(r: Renovation) {
    const act = (fn: () => { ok: boolean; error?: string }, msg: string) => {
      const res = fn();
      toast.show(res.ok ? t(msg) : t(res.error ?? 'error.generic'), res.ok ? undefined : 'error');
    };
    const last = r.history.at(-1);
    switch (r.step) {
      case 'estateReview':
        return (
          <span className="flex gap-1.5">
            <Button size="sm" variant="secondary" className="whitespace-nowrap" onClick={() => act(() => run(estateDecideRenovation, { id: r.id, approve: false }), 'dash.reno.revision')}>{t('dash.reno.reject')}</Button>
            <Button size="sm" className="whitespace-nowrap" onClick={() => act(() => run(estateDecideRenovation, { id: r.id, approve: true }), 'dash.reno.approved')}>{t('reno.approve')}</Button>
          </span>
        );
      case 'inProgress':
        return <Button size="sm" variant="secondary" className="whitespace-nowrap" onClick={() => act(() => run(requestInspection, { id: r.id }), 'dash.reno2.inspectionSet')}>{t('dash.reno2.markInspection')}</Button>;
      case 'inspection':
        return <Button size="sm" className="whitespace-nowrap" onClick={() => setInspectId(r.id)}>{t('dash.reno2.inspect')}</Button>;
      case 'bastSigned':
        return (
          <span className="flex flex-col items-end gap-1">
            <Button size="sm" className="whitespace-nowrap" onClick={() => act(() => run(returnDeposit, { id: r.id }), 'dash.reno2.returned')}>{t('dash.reno2.returnDeposit')}</Button>
            {r.refundAccount && <span className="text-[10px] text-ink/50">{r.refundAccount}</span>}
          </span>
        );
      case 'ownerApproval':
        return <span className="text-[11px] text-ink/45">{t('dash.reno2.waitOwner')}</span>;
      case 'awaitingDeposit':
        return <span className="text-[11px] text-ink/45">{t('dash.reno2.waitDeposit')}</span>;
      case 'bastIssued':
        return <span className="text-[11px] text-ink/45">{t('dash.reno2.waitSign')}</span>;
      default:
        return last ? <span className="text-[11px] text-ink/45">{formatDate(last.at.slice(0, 10), lang, 'short')}</span> : null;
    }
  }
}

function AssignModal({ items, mandors, projectId, onClose, onDone }: { items: BoardItem[]; mandors: { id: string; name: string; company?: string }[]; projectId: string; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const run = useRun();
  const toast = useToast();
  const [material, setMaterial] = useState('');
  const [days, setDays] = useState('2');
  const [mandorId, setMandorId] = useState(mandors[0]?.id ?? '');
  const category = items[0]?.f.category;
  const submit = () => {
    const g = run(createWorkGroup, { projectId, refs: items.map((i) => ({ complaintId: i.c.id, findingId: i.f.id })), material: material.trim(), estimateDays: Math.max(1, Number(days) || 1), mandorId });
    if (!g.ok) return toast.show(t(g.error), 'error');
    const groupId = useStore.getState().data.workGroups.at(-1)!.id;
    toast.show(t('dash.cmp.assigned', { id: groupId, n: items.length }));
    onDone();
  };
  return (
    <Modal open onClose={onClose} title={t('dash.cmp.assignTitle', { n: items.length, category: category ? t(`category.${category}`) : '' })}
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button disabled={!material.trim() || !mandorId} onClick={submit}>{t('dash.cmp.assignBtn')}</Button></div>}>
      <div className="space-y-3">
        <p className="text-xs text-ink/55">{items.map((i) => `${i.unitCode} (${t(`room.${i.f.room}`)})`).join(' · ')}</p>
        <Field label={t('dash.cmp.material')}><Input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder={t('dash.cmp.materialPh')} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('dash.cmp.estimate')}><Input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} /></Field>
          <Field label={t('dash.cmp.mandor')}>
            <Select value={mandorId} onChange={(e) => setMandorId(e.target.value)}>
              {mandors.map((m) => <option key={m.id} value={m.id}>{m.name}{m.company ? ` · ${m.company}` : ''}</option>)}
            </Select>
          </Field>
        </div>
        <p className="text-[11px] text-ink/45">{t('dash.cmp.assignNote')}</p>
      </div>
    </Modal>
  );
}
