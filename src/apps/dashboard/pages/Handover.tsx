import { Camera, Plus, Send } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, formatDate, monthOf } from '../../../domain/clock';
import type { HandoverChecklist, Unit } from '../../../domain/types';
import { useLang, useT } from '../../../i18n';
import { issueAutoBast, markReadyForHandover, saveHandoverChecklist, sendHandoverCall, sendHandoverReceipt } from '../../../store/actions';
import { useDashboardProject, useDerived, useRun } from '../../../store/hooks';
import { useStore } from '../../../store/store';
import { Button } from '../../../ui/Button';
import { cx } from '../../../ui/cx';
import { DataTable } from '../../../ui/DataTable';
import { Checkbox, Input } from '../../../ui/Field';
import { Kpi } from '../../../ui/Kpi';
import { Modal } from '../../../ui/Modal';
import { StatusPill, type PillTone } from '../../../ui/StatusPill';
import { useToast } from '../../../ui/Toast';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';

type Status = 'waiting' | 'inProgress' | 'scheduled' | 'lastCall' | 'auto' | 'done';
const TONE: Record<Status, PillTone> = { waiting: 'info', inProgress: 'warning', scheduled: 'success', lastCall: 'danger', auto: 'danger', done: 'neutral' };
const EMPTY: HandoverChecklist = { frontKeys: 3, backKeys: 2, roomKeys: 3, accessCards: 1, stickers: 1, handbook: 1, meterElectric: '', meterWater: '', gift: false };

export default function Handover() {
  const t = useT();
  const [lang] = useLang();
  const run = useRun();
  const toast = useToast();
  const project = useDashboardProject();
  const s = project.settings.handover;
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [formUnit, setFormUnit] = useState<string | null>(null);
  const [form, setForm] = useState<HandoverChecklist>(EMPTY);
  const [adding, setAdding] = useState(false);
  const [bastUnit, setBastUnit] = useState<string | null>(null);
  const data = useDerived((d) => {
    const owner = (u: Unit) => d.vles.customers.find((c) => c.customer_id === u.ownerCustomerId)?.name ?? '';
    const rows = d.units
      .filter((u) => u.projectId === project.id && (u.occupancy === 'readyForHandover' || (u.handover.bastDate && u.handover.bastDate >= addDays(d.today, -45) && u.handover.calls.length)))
      .map((u) => {
        const h = u.handover;
        const last = h.calls.at(-1);
        const deadline = last ? addDays(last.sentAt, s.intervalDays) : undefined;
        let status: Status = 'waiting';
        if (h.bastDate) status = h.bastSource === 'auto' ? 'auto' : 'done';
        else if (h.slot && h.slot.date <= d.today) status = 'inProgress';
        else if (h.slot) status = 'scheduled';
        else if (h.calls.length >= s.maxCalls) status = 'lastCall';
        return { u, owner: owner(u), status, deadline, last };
      })
      .sort((a, b) => ['inProgress', 'lastCall', 'waiting', 'scheduled', 'auto', 'done'].indexOf(a.status) - ['inProgress', 'lastCall', 'waiting', 'scheduled', 'auto', 'done'].indexOf(b.status));
    const notReady = d.units.filter((u) => u.projectId === project.id && u.occupancy === 'notReady' && u.ownerCustomerId).slice(0, 12).map((u) => ({ u, owner: owner(u) }));
    return { rows, notReady, today: d.today, month: monthOf(d.today) };
  }, [project.id, s.intervalDays, s.maxCalls]);
  const count = (st: Status[]) => data.rows.filter((r) => st.includes(r.status)).length;
  const rows = filter === 'all' ? data.rows : data.rows.filter((r) => r.status === filter);
  const formRow = data.rows.find((r) => r.u.id === formUnit);
  const bastRow = data.rows.find((r) => r.u.id === bastUnit);

  const callCell = (u: Unit, n: number) => {
    const c = u.handover.calls.find((x) => x.n === n);
    if (!c) return <span className="text-ink/30">—</span>;
    const read = !!c.readAt;
    return (
      <span className={cx('text-xs font-semibold', read ? 'text-[#1F56B3]' : n === u.handover.calls.length && !u.handover.slot ? 'text-ink/60' : 'text-[#B4192A]')}>
        {formatDate(c.sentAt, lang, 'short')} · {read ? t('dash.ho.read') : c.channels.includes('letter') ? t('dash.ho.letter') : t('dash.ho.unread')}
      </span>
    );
  };
  const action = (r: (typeof data.rows)[number]) => {
    const h = r.u.handover;
    if (h.bastDate) return <Button size="sm" variant="secondary" onClick={() => setBastUnit(r.u.id)}>{t('dash.ho.viewBast')}</Button>;
    if (h.slot && !h.receiptSentAt) return <Button size="sm" onClick={() => { setFormUnit(r.u.id); setForm(h.checklist ?? EMPTY); }}>{t('dash.ho.openForm')}</Button>;
    if (h.receiptSentAt) return <span className="text-xs text-ink/50">{t('dash.ho.waitSign')}</span>;
    if (h.calls.length >= s.maxCalls) return r.deadline && r.deadline <= data.today ? <Button size="sm" onClick={() => { run(issueAutoBast, { unitId: r.u.id }); toast.show(t('dash.ho.autoIssued', { unit: r.u.code })); }}>{t('dash.ho.issueBast')}</Button> : <a href="tel:0" className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold">{t('common.call')}</a>;
    const canSend = !r.last || (r.deadline && r.deadline <= data.today);
    return <Button size="sm" variant="secondary" disabled={!canSend} onClick={() => { run(sendHandoverCall, { unitId: r.u.id }); toast.show(t('dash.ho.callSent', { unit: r.u.code })); }}>{t('dash.ho.sendCall', { n: r.u.handover.calls.length + 1 })}</Button>;
  };
  const submitForm = () => {
    if (!formRow) return;
    run(saveHandoverChecklist, { unitId: formRow.u.id, checklist: form });
    const r = run(sendHandoverReceipt, { unitId: formRow.u.id });
    if (!r.ok) return toast.show(t(r.error), 'error');
    toast.show(t('dash.ho.receiptSent', { unit: formRow.u.code }));
    setFormUnit(null);
  };
  const markReady = (unitId: string) => {
    run(markReadyForHandover, { unitId });
    run(sendHandoverCall, { unitId });
    const code = useStore.getState().data.units.find((u) => u.id === unitId)?.code;
    toast.show(t('dash.ho.readySent', { unit: code ?? '' }));
    setAdding(false);
  };
  const field = (k: keyof HandoverChecklist, label: string, numeric = true) => (
    <label className="flex items-center justify-between gap-3 border-b border-line/70 py-2 text-sm">
      <span className="text-ink/65">{label}</span>
      <Input className="h-9 w-28 text-right" inputMode={numeric ? 'numeric' : 'text'} value={String(form[k])} onChange={(e) => setForm({ ...form, [k]: numeric ? Number(e.target.value.replace(/\D/g, '')) : e.target.value })} />
    </label>
  );
  return (
    <div>
      <PageHeader kicker={t('dash.ho.kicker')} title={t('dash.ho.title')} subtitle={t('dash.ho.sub', { n: s.maxCalls, d: s.intervalDays })} actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>{t('dash.ho.addReady')}</Button>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label={t('dash.ho.k.all')} value={data.rows.filter((r) => !r.u.handover.bastDate).length} sub={t('dash.ho.k.allSub')} active={filter === 'all'} onClick={() => setFilter('all')} />
        <Kpi label={t('dash.ho.k.waiting')} value={count(['waiting', 'scheduled', 'inProgress'])} sub={t('dash.ho.k.waitingSub')} active={filter === 'waiting'} onClick={() => setFilter('waiting')} />
        <Kpi label={t('dash.ho.k.last')} value={count(['lastCall'])} sub={t('dash.ho.k.lastSub')} tone="warning" active={filter === 'lastCall'} onClick={() => setFilter('lastCall')} />
        <Kpi label={t('dash.ho.k.auto')} value={count(['auto'])} sub={t('dash.ho.k.autoSub')} tone="danger" active={filter === 'auto'} onClick={() => setFilter('auto')} />
        <Kpi label={t('dash.ho.k.done')} value={data.rows.filter((r) => r.u.handover.bastDate?.startsWith(data.month) && r.u.handover.bastSource === 'signed').length} sub={t('dash.ho.k.doneSub')} active={filter === 'done'} onClick={() => setFilter('done')} />
      </div>
      <Panel className="mt-4" pad={false}>
        <DataTable
          rows={rows}
          rowKey={(r) => r.u.id}
          rowClassName={(r) => (r.u.id === formUnit ? 'bg-brand-tint/40' : undefined)}
          columns={[
            { key: 'unit', header: t('common.unit'), render: (r) => <div><Link to={`/dashboard/ipl/${r.u.id}`} className="font-bold hover:text-brand">{r.u.code}</Link><p className="text-xs text-ink/50">{r.owner}</p></div> },
            { key: 'ready', header: t('dash.ho.readySince'), render: (r) => (r.u.handover.readySince ? formatDate(r.u.handover.readySince, lang, 'short') : '—') },
            { key: 'c1', header: t('dash.ho.call', { n: 1 }), render: (r) => callCell(r.u, 1) },
            { key: 'c2', header: t('dash.ho.call', { n: 2 }), render: (r) => callCell(r.u, 2) },
            { key: 'c3', header: t('dash.ho.call', { n: 3 }), render: (r) => callCell(r.u, 3) },
            { key: 'status', header: t('common.status'), render: (r) => <StatusPill tone={TONE[r.status]}>{t(`dash.ho.s.${r.status}`)}</StatusPill> },
            { key: 'when', header: t('dash.ho.when'), render: (r) => <span className={cx('text-sm font-semibold', r.status === 'lastCall' || r.status === 'auto' ? 'text-[#B4192A]' : r.status === 'scheduled' || r.status === 'inProgress' ? 'text-[#17703D]' : '')}>{r.u.handover.bastDate ? t('dash.ho.bastOn', { date: formatDate(r.u.handover.bastDate, lang, 'short') }) : r.u.handover.slot ? `${formatDate(r.u.handover.slot.date, lang, 'weekday')} ${r.u.handover.slot.time.slice(0, 5)}` : r.status === 'lastCall' && r.deadline ? t('dash.ho.autoOn', { date: formatDate(r.deadline, lang, 'short') }) : r.deadline ? t('dash.ho.deadline', { date: formatDate(r.deadline, lang, 'short') }) : '—'}</span> },
            { key: 'act', header: '', align: 'right', render: action },
          ]}
        />
      </Panel>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px]">
        {formRow ? (
          <Panel className="border-2 border-brand" title={t('dash.ho.formTitle', { unit: formRow.u.code, owner: formRow.owner })} right={t('dash.ho.tablet')}>
            <div className="grid gap-2 sm:grid-cols-4">
              {['inspect', 'bast', 'receipt', 'done'].map((k, i) => (
                <div key={k} className={cx('rounded-xl border p-3 text-xs', i === 0 ? 'border-[#BDE5CB] bg-[#F2FBF5]' : i === 2 ? 'border-[#F3D9A4] bg-[#FFF8E8]' : 'border-line bg-paper')}>
                  <p className="font-bold">{i + 1} · {t(`dash.ho.step.${k}`)}</p>
                  <p className="text-ink/55">{t(`dash.ho.step.${k}.body`)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-x-6 sm:grid-cols-2">
              {field('frontKeys', t('handover.item.frontKeys'))}
              {field('backKeys', t('handover.item.backKeys'))}
              {field('roomKeys', t('handover.item.roomKeys'))}
              {field('accessCards', t('handover.item.cards'))}
              {field('stickers', t('handover.item.stickers'))}
              {field('handbook', t('handover.item.handbook'))}
              {field('meterElectric', t('handover.item.electric'), false)}
              {field('meterWater', t('handover.item.water'), false)}
            </div>
            <Checkbox className="mt-3" checked={form.gift} onChange={(v) => setForm({ ...form, gift: v })}>{t('dash.ho.gift')}</Checkbox>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button icon={<Send className="h-4 w-4" />} onClick={submitForm}>{t('dash.ho.sendReceipt')}</Button>
              <Button variant="secondary" icon={<Camera className="h-4 w-4" />} onClick={() => toast.show(t('dash.ho.photoSaved'))}>{t('dash.ho.photo')}</Button>
              <Button variant="ghost" onClick={() => setFormUnit(null)}>{t('common.close')}</Button>
            </div>
          </Panel>
        ) : (
          <Panel title={t('dash.ho.howTitle')}><p className="text-sm text-ink/60">{t('dash.ho.howBody')}</p></Panel>
        )}
        <Panel title={t('dash.ho.rulesTitle')}>
          <ol className="list-decimal space-y-2 pl-4 text-sm text-ink/70">
            <li>{t('dash.ho.rule1')}</li>
            <li>{t('dash.ho.rule2', { d: s.intervalDays })}</li>
            <li>{t('dash.ho.rule3', { d: s.intervalDays * 2 })}</li>
            <li>{s.autoBast ? t('dash.ho.rule4', { d: s.intervalDays * 3 }) : t('dash.ho.rule4off')}</li>
          </ol>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-[#FFF8E8] p-2.5"><p className="text-[11px] text-ink/50">{t('dash.ho.interval')}</p><b>{t('common.days', { n: s.intervalDays })}</b></div>
            <div className="rounded-xl bg-[#FFF8E8] p-2.5"><p className="text-[11px] text-ink/50">{t('dash.ho.maxCalls')}</p><b>{s.maxCalls}×</b></div>
          </div>
          <Link to="/dashboard/settings" className="mt-3 inline-block text-xs font-bold text-brand">{t('dash.editSettings')}</Link>
        </Panel>
      </div>
      <Modal open={adding} onClose={() => setAdding(false)} title={t('dash.ho.addReady')}>
        <p className="mb-3 text-sm text-ink/60">{t('dash.ho.addBody')}</p>
        <ul className="divide-y divide-line">
          {data.notReady.map(({ u, owner }) => (
            <li key={u.id} className="flex items-center justify-between py-2.5 text-sm">
              <span><b>{u.code}</b> · {owner}</span>
              <Button size="sm" onClick={() => markReady(u.id)}>{t('dash.ho.markReady')}</Button>
            </li>
          ))}
        </ul>
      </Modal>
      <Modal open={!!bastRow} onClose={() => setBastUnit(null)} title={t('handover.bastTitle')}>
        {bastRow && (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink/55">{t('common.unit')}</dt><dd className="font-semibold">{bastRow.u.code}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/55">{t('welcome.owner')}</dt><dd className="font-semibold">{bastRow.owner}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/55">{t('dash.ho.bastDate')}</dt><dd className="font-semibold">{formatDate(bastRow.u.handover.bastDate!, lang)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/55">{t('dash.ho.bastSource')}</dt><dd className="font-semibold">{t(`dash.ho.src.${bastRow.u.handover.bastSource}`)}</dd></div>
          </dl>
        )}
      </Modal>
    </div>
  );
}
