import { ArrowLeft, Ban, FileWarning, Phone, Trash2, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { dayOfMonth, diffDays, formatDate, formatDateTime } from '../../../domain/clock';
import { billStatus, firstBilledMonth } from '../../../domain/ipl';
import { formatRp } from '../../../domain/money';
import { unitBillingRows } from '../../../domain/report';
import type { Bill, Consequence, LegalDoc, MonthKey, Payment, Unit } from '../../../domain/types';
import { useLang, useT } from '../../../i18n';
import { applyConsequence, liftConsequence, recordPaymentAdmin, updateLegalDoc } from '../../../store/actions';
import { useDashboardProject, useDerived, useRun } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { cx } from '../../../ui/cx';
import { Checkbox, Field, Input, Select, Textarea } from '../../../ui/Field';
import { PhotoPicker } from '../../../ui/PhotoPicker';
import { StatusPill } from '../../../ui/StatusPill';
import { Timeline } from '../../../ui/Timeline';
import { useToast } from '../../../ui/Toast';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { CELL } from './IplList';
import { ADMIN_BY, maskPhone } from '../util';

const CNS_TYPES: Consequence['type'][] = ['cardSuspended', 'garbageStopped', 'warningLetter'];
const CNS_ICON = { cardSuspended: Ban, garbageStopped: Trash2, warningLetter: FileWarning };
const METHODS: Payment['method'][] = ['cash', 'transfer', 'qris', 'va'];
const LEGAL_DOCS = ['certificate', 'pbg', 'pbb'] as const;
const LEGAL_STATUS: LegalDoc['status'][] = ['process', 'atBank', 'ready', 'withCustomer'];

export default function UnitDetail() {
  const t = useT();
  const [lang] = useLang();
  const { unitId = '' } = useParams();
  const project = useDashboardProject();
  const data = useDerived((d) => {
    const unit = d.units.find((u) => u.id === unitId);
    if (!unit) return null;
    const p = d.projects.find((x) => x.id === unit.projectId)!;
    const row = unitBillingRows(d, unit.projectId).find((r) => r.unit.id === unitId)!;
    return {
      row,
      project: p,
      today: d.today,
      renter: d.renters.find((r) => r.id === unit.renterId),
      payments: d.payments.filter((x) => x.unitId === unitId && x.kind === 'ipl').sort((a, b) => b.paidAt.localeCompare(a.paidAt)),
      activity: d.activity.filter((a) => a.projectId === unit.projectId && a.text.params?.unit === unit.code).slice().reverse(),
    };
  }, [unitId]);

  if (!data) {
    return (
      <div>
        <PageHeader title={t('dash.unit.notFound')} />
        <Link to="/dashboard/ipl" className="text-sm font-bold text-brand">← {t('dash.unit.back')}</Link>
      </div>
    );
  }
  const { row, today } = data;
  const u = row.unit;
  const s = data.project.settings;
  const bast = u.handover.bastDate;
  const first = bast ? firstBilledMonth(bast, s.ipl) : undefined;
  const otherProject = u.projectId !== project.id;

  return (
    <div>
      <Link to="/dashboard/ipl" className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-ink/50 hover:text-brand"><ArrowLeft className="h-3.5 w-3.5" />{t('dash.unit.back')}</Link>
      <PageHeader
        kicker={data.project.name}
        title={t('dash.unit.title', { unit: u.code })}
        subtitle={t('dash.unit.sub', { type: row.typeName, rate: formatRp(row.rate) })}
        actions={row.needsAction ? <StatusPill tone="danger" dot>{t('dash.ipl.flag')}</StatusPill> : undefined}
      />
      {otherProject && <p className="mb-3 rounded-xl bg-[#FFF8E8] px-4 py-2 text-xs font-semibold text-[#8A5A00]">{t('dash.unit.otherProject', { project: data.project.name })}</p>}

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-4">
          <Panel>
            <div className="grid gap-4 sm:grid-cols-4">
              <Info label={t('dash.ipl.col.owner')} value={row.ownerName || '—'} />
              <Info label={t('dash.unit.phone')} value={row.ownerPhone ? <a href={`tel:${row.ownerPhone}`} className="inline-flex items-center gap-1 font-mono text-sm hover:text-brand"><Phone className="h-3.5 w-3.5" />{maskPhone(row.ownerPhone)}</a> : '—'} />
              <Info label={t('dash.unit.rate')} value={`${formatRp(row.rate)}${t('common.perMonth')}`} />
              <Info label={t('dash.unit.totalOverdue')} value={<span className={row.overdueAmount ? 'text-[#B4192A]' : ''}>{row.overdueAmount ? `${formatRp(row.overdueAmount)} · ${t('dash.unit.nMonths', { n: row.overdueMonths })}` : t('dash.unit.noArrears')}</span>} />
            </div>
            {data.renter && (
              <p className="mt-3 rounded-xl bg-[#FBF5E6] px-3 py-2 text-xs text-[#6B4E00]">
                {t('dash.unit.renterLine', { name: data.renter.name, start: formatDate(data.renter.lease.start, lang), end: formatDate(data.renter.lease.end, lang), payer: t(data.renter.iplPayer === 'renter' ? 'role.renter' : 'role.owner') })}
              </p>
            )}
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title={t('dash.unit.timeline')}>
              <Timeline
                items={[
                  { key: 'bast', label: t('dash.unit.tl.bast'), meta: bast ? formatDate(bast, lang) : '—', state: bast ? 'done' : 'todo' },
                  { key: 'move', label: t('dash.unit.tl.moveIn'), meta: u.moveIn ? formatDate(u.moveIn.date, lang) : '—', state: u.moveIn ? 'done' : 'todo' },
                  { key: 'free', label: s.ipl.freeEnabled ? t('dash.unit.tl.freeEnds') : t('dash.unit.tl.noFree'), meta: row.freeUntil ? formatDate(row.freeUntil, lang, 'month') : '—', state: row.freeUntil ? (first && first <= today.slice(0, 7) ? 'done' : 'current') : bast ? 'done' : 'todo' },
                  { key: 'bill', label: t('dash.unit.tl.billing'), meta: first ? formatDate(first, lang, 'month') : '—', state: first ? (first <= today.slice(0, 7) ? 'done' : 'todo') : 'todo' },
                ]}
              />
            </Panel>
            <Panel title={t('dash.unit.grid')} right={t('dash.unit.gridHint')}>
              {row.bills.length ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(68px,1fr))] gap-1.5">
                  {row.bills.map((b) => {
                    const st = billStatus(b, today, s.ipl.dueDay);
                    return (
                      <div key={b.id} className={cx('rounded-lg px-1 py-1.5 text-center', CELL[st].cls)} title={t(`status.${st}`)}>
                        <p className="text-[10px] font-semibold opacity-80">{formatDate(b.month, lang, 'month')}</p>
                        <p className="text-[11px] font-bold">{t(`status.${st}`)}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-ink/50">{t('dash.unit.noBills')}</p>
              )}
            </Panel>
          </div>

          <Panel title={t('dash.unit.history')} pad={false}>
            {data.payments.length ? (
              <ul className="divide-y divide-line/70">
                {data.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-sm">
                    <span className="min-w-0">
                      <b>{formatRp(p.amount)}</b>
                      {p.discount > 0 && <span className="ml-1.5 text-xs font-semibold text-[#17703D]">{t('dash.unit.discount', { amount: formatRp(p.discount) })}</span>}
                      <span className="block text-xs text-ink/50">{(p.months ?? []).map((m) => formatDate(m, lang, 'month')).join(', ')}</span>
                    </span>
                    <span className="text-right text-xs text-ink/55">
                      {formatDateTime(p.paidAt, lang)} · {t(`method.${p.method}`)}
                      <span className="block">{t(p.recordedBy === 'admin' ? 'dash.unit.byAdmin' : 'dash.unit.byApp')}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-ink/50">{t('dash.unit.noPayments')}</p>
            )}
          </Panel>

          {u.legal && s.features.legal && <LegalEditor unitId={u.id} legal={u.legal} />}
        </div>

        <div className="min-w-0 space-y-4">
          <RecordPayment unitId={u.id} today={today} dueDay={s.ipl.dueDay} bills={row.bills} />
          <Consequences unitId={u.id} active={row.activeConsequences} needsAction={row.needsAction} flagMonths={s.overdue.flagMonths} paidUp={row.overdueMonths === 0} />
          <Panel title={t('dash.unit.activity')} pad={false}>
            {data.activity.length ? (
              <ul className="max-h-72 divide-y divide-line/70 overflow-y-auto">
                {data.activity.map((a) => (
                  <li key={a.id} className="px-5 py-2.5 text-xs">
                    <p className="text-ink/80">{t(a.text.key, a.text.params)}</p>
                    <p className="text-ink/45">{formatDateTime(a.at, lang)} · {a.by}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-ink/50">{t('dash.unit.noActivity')}</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">{label}</p>
      <div className="mt-0.5 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function RecordPayment({ unitId, today, dueDay, bills }: { unitId: string; today: string; dueDay: number; bills: Bill[] }) {
  const t = useT();
  const [lang] = useLang();
  const run = useRun();
  const toast = useToast();
  const open = bills.filter((b) => !b.free && !b.paymentId);
  // Everything already due, plus the next three months for residents paying ahead in cash.
  const isUpcoming = (b: Bill) => billStatus(b, today, dueDay) === 'upcoming';
  const listed = [...open.filter((b) => !isUpcoming(b)), ...open.filter(isUpcoming).slice(0, 3)];
  const [picked, setPicked] = useState<MonthKey[]>([]);
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState<Payment['method']>('cash');
  const [proof, setProof] = useState<string | undefined>();
  const chosen = listed.filter((b) => picked.includes(b.month));
  const total = chosen.reduce((a, b) => a + b.amount, 0);
  const toggle = (m: MonthKey) => setPicked((xs) => (xs.includes(m) ? xs.filter((x) => x !== m) : [...xs, m]));
  const save = () => {
    const r = run(recordPaymentAdmin, { unitId, months: picked, method, date, by: ADMIN_BY });
    if (!r.ok) return toast.show(t(r.error), 'error');
    toast.show(t('dash.unit.recorded', { amount: formatRp(total) }), 'success');
    setPicked([]);
    setProof(undefined);
  };
  return (
    <Panel title={t('dash.unit.record')}>
      {listed.length === 0 ? (
        <p className="text-sm text-ink/50">{t('dash.unit.nothingOpen')}</p>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            {listed.map((b) => {
              const late = diffDays(dayOfMonth(b.month, dueDay), today);
              return (
                <Checkbox key={b.month} checked={picked.includes(b.month)} onChange={() => toggle(b.month)} className="rounded-xl border border-line px-3 py-2">
                  <span className="flex w-full items-center justify-between gap-2 text-sm">
                    <span>
                      <b>{formatDate(b.month, lang, 'month')}</b>
                      {late > 0 && <span className="ml-2 text-[11px] font-semibold text-[#B4192A]">{t('dash.unit.late', { n: late })}</span>}
                    </span>
                    <span className="tabular">{formatRp(b.amount)}</span>
                  </span>
                </Checkbox>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('dash.unit.payDate')}><Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label={t('dash.unit.method')}>
              <Select value={method} onChange={(e) => setMethod(e.target.value as Payment['method'])}>
                {METHODS.map((m) => <option key={m} value={m}>{t(`method.${m}`)}</option>)}
              </Select>
            </Field>
          </div>
          <Field label={t('dash.unit.proof')} optional={t('common.optional')}>
            <PhotoPicker onPicked={(p) => setProof(p.id)} selectedId={proof} />
          </Field>
          <div className="flex items-center justify-between rounded-xl bg-brand-tint/50 px-3 py-2.5">
            <span className="text-sm">{t('dash.unit.amount')}</span>
            <b className="tabular text-lg">{formatRp(total)}</b>
          </div>
          <p className="text-[11px] text-ink/50">{t('dash.unit.noFine')}</p>
          <Button block disabled={!picked.length} onClick={save}>{t('dash.unit.recordBtn')}</Button>
        </div>
      )}
    </Panel>
  );
}

function Consequences({ unitId, active, needsAction, flagMonths, paidUp }: { unitId: string; active: Consequence[]; needsAction: boolean; flagMonths: number; paidUp: boolean }) {
  const t = useT();
  const [lang] = useLang();
  const run = useRun();
  const toast = useToast();
  const [note, setNote] = useState('');
  const apply = (type: Consequence['type']) => {
    const r = run(applyConsequence, { unitId, type, note: note.trim() || undefined, by: ADMIN_BY });
    if (!r.ok) return toast.show(t(r.error), 'error');
    toast.show(t(`dash.cns.applied.${type}`));
    setNote('');
  };
  const lift = (c: Consequence) => {
    const r = run(liftConsequence, { unitId, consequenceId: c.id, by: ADMIN_BY });
    if (r.ok) toast.show(t('dash.cns.lifted'));
  };
  return (
    <Panel title={t('dash.cns.title')}>
      <p className="text-xs text-ink/55">{needsAction ? t('dash.cns.flagged', { n: flagMonths }) : t('dash.cns.notFlagged', { n: flagMonths })}</p>
      {active.length > 0 && paidUp && <p className="mt-2 rounded-lg bg-[#E8F6EC] px-3 py-2 text-xs font-semibold text-[#17703D]">{t('dash.cns.paidUp')}</p>}
      {active.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {active.map((c) => {
            const Icon = CNS_ICON[c.type];
            return (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-[#F3C5CA] bg-[#FFF5F6] px-3 py-2">
                <span className="min-w-0 text-sm">
                  <span className="flex items-center gap-1.5 font-semibold text-[#9E1424]"><Icon className="h-4 w-4" />{t(`dash.cns.short.${c.type}`)}</span>
                  <span className="block text-[11px] text-ink/50">{t('dash.cns.since', { date: formatDate(c.startedAt, lang), by: c.by })}{c.note ? ` · ${c.note}` : ''}</span>
                </span>
                <Button size="sm" variant="secondary" icon={<Undo2 className="h-3.5 w-3.5" />} onClick={() => lift(c)}>{t('dash.cns.restore')}</Button>
              </li>
            );
          })}
        </ul>
      )}
      <Field className="mt-3" label={t('dash.cns.note')} optional={t('common.optional')}>
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('dash.cns.notePh')} />
      </Field>
      <div className="mt-2 grid gap-1.5">
        {CNS_TYPES.map((type) => {
          const Icon = CNS_ICON[type];
          const on = active.some((c) => c.type === type);
          return (
            <Button key={type} variant={type === 'warningLetter' ? 'secondary' : 'danger'} size="sm" disabled={on} icon={<Icon className="h-3.5 w-3.5" />} onClick={() => apply(type)}>
              {t(`dash.cns.do.${type}`)}
            </Button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-ink/45">{t('dash.cns.manualNote')}</p>
    </Panel>
  );
}

function LegalEditor({ unitId, legal }: { unitId: string; legal: NonNullable<Unit['legal']> }) {
  const t = useT();
  const run = useRun();
  const toast = useToast();
  const [draft, setDraft] = useState(() => Object.fromEntries(LEGAL_DOCS.map((k) => [k, { status: legal[k].status, number: legal[k].number ?? '' }])) as Record<(typeof LEGAL_DOCS)[number], { status: LegalDoc['status']; number: string }>);
  const save = (k: (typeof LEGAL_DOCS)[number]) => {
    const r = run(updateLegalDoc, { unitId, doc: k, status: draft[k].status, number: draft[k].number, by: ADMIN_BY });
    if (!r.ok) return toast.show(t(r.error), 'error');
    toast.show(t('dash.legal.saved', { doc: t(`legal.${k}.short`) }));
  };
  return (
    <Panel title={t('dash.legal.title')} right={`${legal.scheme}${legal.bank ? ` · ${legal.bank}` : ''}`}>
      <div className="space-y-2.5">
        {LEGAL_DOCS.map((k) => {
          const dirty = draft[k].status !== legal[k].status || draft[k].number !== (legal[k].number ?? '');
          return (
            <div key={k} className="grid items-end gap-2 rounded-xl border border-line p-3 sm:grid-cols-[120px_1fr_1fr_auto]">
              <p className="text-sm font-bold">{t(`legal.${k}.short`)}</p>
              <Field label={t('common.status')}>
                <Select value={draft[k].status} onChange={(e) => setDraft({ ...draft, [k]: { ...draft[k], status: e.target.value as LegalDoc['status'] } })}>
                  {LEGAL_STATUS.map((st) => <option key={st} value={st}>{t(`legal.status.${st}`)}</option>)}
                </Select>
              </Field>
              <Field label={t('dash.legal.number')}>
                <Input value={draft[k].number} placeholder={t('legal.numberPending')} onChange={(e) => setDraft({ ...draft, [k]: { ...draft[k], number: e.target.value } })} />
              </Field>
              <Button size="sm" disabled={!dirty} onClick={() => save(k)}>{t('common.save')}</Button>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-ink/45">{t('dash.legal.note')}</p>
    </Panel>
  );
}
