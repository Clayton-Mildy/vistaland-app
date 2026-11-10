import { CheckCircle2, ChevronRight, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate, formatTime } from '../../../domain/clock';
import { useLang, useT } from '../../../i18n';
import { confirmMoveInAtGate } from '../../../store/actions';
import { useDerived, useRun, useToday } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { StatusPill } from '../../../ui/StatusPill';
import { useToast } from '../../../ui/Toast';
import { useStaff } from '../hooks';
import { StaffHeader } from '../StaffShell';

export default function MoveInsToday() {
  const t = useT();
  const [lang] = useLang();
  const nav = useNavigate();
  const run = useRun();
  const toast = useToast();
  const today = useToday();
  const staff = useStaff()!;
  const [q, setQ] = useState('');
  const data = useDerived((d) => {
    const unitById = new Map(d.units.map((u) => [u.id, u]));
    const rows = d.moveIns
      .filter((m) => m.status !== 'cancelled' && staff.projectIds.includes(unitById.get(m.unitId)?.projectId ?? ''))
      .map((m) => {
        const u = unitById.get(m.unitId)!;
        const renter = m.renterId ? d.renters.find((r) => r.id === m.renterId) : undefined;
        const owner = d.vles.customers.find((c) => c.customer_id === u.ownerCustomerId);
        return { m, u, project: d.projects.find((p) => p.id === u.projectId)!, who: renter?.name ?? owner?.name ?? '', renter: !!renter, household: renter?.householdSize };
      });
    const panic = d.panics.filter((p) => !p.resolvedAt && staff.projectIds.includes(unitById.get(p.unitId)?.projectId ?? '')).at(-1);
    return { rows, panic, panicUnit: panic ? unitById.get(panic.unitId) : undefined };
  }, [staff.id]);
  const match = (r: (typeof data.rows)[number]) => !q || `${r.u.code} ${r.m.plate ?? ''}`.toLowerCase().includes(q.toLowerCase().trim());
  const todays = data.rows.filter((r) => r.m.date === today && match(r)).sort((a, b) => a.m.time.localeCompare(b.m.time));
  const upcoming = data.rows.filter((r) => r.m.date > today && r.m.status === 'approved' && match(r)).sort((a, b) => a.m.date.localeCompare(b.m.date)).slice(0, 5);
  const confirm = (id: string, code: string) => {
    run(confirmMoveInAtGate, { permitId: id, staffId: staff.id });
    toast.show(t('sec.entered', { unit: code }));
  };
  return (
    <div>
      <StaffHeader kicker={t('sec.post')} title={t('sec.title')} sub={formatDate(today, lang, 'weekday') + ' ' + today.slice(0, 4)} />
      <div className="space-y-3 p-4">
        {data.panic && (
          <button onClick={() => nav('/staff/security/emergency')} className="flex w-full items-center justify-between rounded-2xl bg-[#DC2626] px-4 py-3 text-left text-white">
            <span className="flex items-center gap-2 text-sm font-bold"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />{t('sec.panicBanner', { unit: data.panicUnit?.code ?? '', type: data.panic.type ? t(`emergency.type.${data.panic.type}`) : '' })}</span>
            <span className="flex items-center text-xs font-bold">{t('common.open')}<ChevronRight className="h-4 w-4" /></span>
          </button>
        )}
        <div className="flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-3">
          <Search className="h-4 w-4 text-ink/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('sec.search')} className="flex-1 bg-transparent text-sm outline-none" />
        </div>
        {todays.map(({ m, u, project, who, renter, household }) => (
          <Card key={m.id}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xl font-extrabold">{u.code}</p>
                <p className="text-[11px] font-semibold text-ink/45">{project.name}</p>
              </div>
              <span className="text-sm font-bold">{m.time}</span>
            </div>
            <p className="mt-1 text-sm text-ink/70">{who}{renter && <StatusPill tone="gold" className="ml-1.5">{t('role.renter')}</StatusPill>}{household ? ` · ${t('sec.people', { n: household })}` : ''}</p>
            <p className="text-sm text-ink/70">{t(`movein.v.${m.vehicle}`)}{m.plate ? ` · ${t('sec.plate')} ${m.plate}` : ''}{m.withWifi ? ` · ${t('sec.wifi')}` : ''}</p>
            {m.status === 'entered' ? (
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-[#E3F5E9] px-3 py-2.5 text-sm font-bold text-[#17703D]"><CheckCircle2 className="h-4 w-4" />{t('sec.enteredAt', { time: formatTime(m.enteredAt ?? '') })}</p>
            ) : (
              <Button className="mt-3 !bg-gradient-to-br !from-[#D7192B] !to-[#B01222]" block size="lg" onClick={() => confirm(m.id, u.code)}>{t('sec.confirm')}</Button>
            )}
          </Card>
        ))}
        {todays.length === 0 && <Card className="text-center text-sm text-ink/55">{t('sec.none')}</Card>}
        {upcoming.length > 0 && (
          <Card className="p-0">
            <p className="px-4 pb-1 pt-3 text-sm font-bold">{t('sec.upcoming')}</p>
            {upcoming.map(({ m, u, who }) => (
              <div key={m.id} className="flex items-center justify-between border-t border-line px-4 py-2.5 text-sm">
                <span><b>{u.code}</b> · {who}</span>
                <span className="text-xs text-ink/50">{formatDate(m.date, lang, 'weekday')} · {m.time}</span>
              </div>
            ))}
          </Card>
        )}
        <div className="rounded-2xl border-2 border-dashed border-line p-4 text-sm">
          <p className="font-bold">{t('sec.notListed')}</p>
          <p className="text-ink/55">{t('sec.notListedBody')}</p>
        </div>
      </div>
    </div>
  );
}
