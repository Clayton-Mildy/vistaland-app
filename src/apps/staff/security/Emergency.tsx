import { MapPin, Phone, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { diffDays, formatDateTime, formatTime } from '../../../domain/clock';
import { useLang, useT } from '../../../i18n';
import { acceptPanic, resolvePanic } from '../../../store/actions';
import { useDerived, useRun } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { StatusPill } from '../../../ui/StatusPill';
import { useToast } from '../../../ui/Toast';
import { useStaff } from '../hooks';
import { StaffHeader } from '../StaffShell';

const minutes = (a: string, b?: string) => (b ? Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 60000)) : 0);

export default function Emergency() {
  const t = useT();
  const [lang] = useLang();
  const run = useRun();
  const toast = useToast();
  const staff = useStaff()!;
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const data = useDerived((d) => {
    const unitById = new Map(d.units.map((u) => [u.id, u]));
    const mine = d.panics.filter((p) => staff.projectIds.includes(unitById.get(p.unitId)?.projectId ?? ''));
    const describe = (p: (typeof mine)[number]) => {
      const u = unitById.get(p.unitId)!;
      const from = p.from;
      const person = from.kind === 'owner' ? d.vles.customers.find((c) => c.customer_id === from.customerId) : undefined;
      const renter = from.kind === 'renter' ? d.renters.find((r) => r.id === from.renterId) : undefined;
      const name = person?.name ?? renter?.name;
      const phone = person?.no_hp ?? renter?.no_hp;
      return { p, u, name: name ?? '', phone: phone ?? '', project: d.projects.find((x) => x.id === u.projectId)!.name };
    };
    return { active: mine.filter((p) => !p.resolvedAt).map(describe), history: mine.filter((p) => p.resolvedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8).map(describe), today: d.today };
  }, [staff.id]);
  const active = data.active.at(-1);
  const secondsSince = (iso: string) => (diffDays(iso.slice(0, 10), data.today) === 0 ? Math.max(0, Math.floor((Date.now() - new Date(`${new Date().toISOString().slice(0, 10)}T${iso.slice(11)}`).getTime()) / 1000)) : 999);
  return (
    <div>
      <StaffHeader danger={!!active} kicker={active ? t('sec.e.activeKicker') : t('sec.post')} title={active ? t('sec.e.activeTitle', { n: data.active.length }) : t('sec.e.calm')} sub={active ? active.project : t('sec.e.calmSub')} />
      <div className="space-y-3 p-4">
        {active && (
          <Card className="border-2 border-[#DC2626]">
            <div className="flex items-start justify-between">
              <p className="text-3xl font-extrabold">{active.u.code}</p>
              <StatusPill tone="danger">{active.p.type ? t(`emergency.type.${active.p.type}`) : t('sec.e.unknownType')} · {formatTime(active.p.createdAt)}</StatusPill>
            </div>
            <p className="mt-1 text-sm text-ink/70">{active.name}{active.p.awayFromHome ? ` · ${t('sec.e.away')}` : ` · ${t('sec.e.atHome')}`}</p>
            <div className="relative mt-3 h-32 rounded-xl bg-[#EEF1F5] p-2">
              {['A', 'B', 'C'].map((b, i) => (
                <span key={b} className={cx('absolute top-3 flex h-9 w-[28%] items-center justify-center rounded-lg text-xs font-semibold', active.u.code.startsWith(b) ? 'bg-[#FDE2E2] text-[#B91C1C] ring-2 ring-[#DC2626]' : 'bg-white text-ink/50')} style={{ left: `${4 + i * 33}%` }}>{t('sec.e.block', { b })}</span>
              ))}
              <span className="absolute left-[4%] right-[4%] top-[60px] h-2 rounded bg-[#D5DAE1]" />
              <span className="absolute bottom-3 left-3 flex items-center gap-1 text-[11px] font-bold"><span className="h-3 w-3 rounded-full bg-ink" />{t('sec.e.post')}</span>
              <MapPin className="absolute h-6 w-6 fill-[#DC2626] text-white" style={{ left: `${10 + 'ABC'.indexOf(active.u.code[0]) * 33 + 8}%`, top: 4 }} />
            </div>
            {!active.p.acceptedAt ? (
              <>
                <Button className="mt-3 !bg-[#DC2626] !bg-none" block size="lg" onClick={() => { run(acceptPanic, { id: active.p.id, staffId: staff.id }); toast.show(t('sec.e.acceptedToast')); }}>{t('sec.e.accept')}</Button>
                <p className="mt-2 text-xs text-[#B91C1C]">{secondsSince(active.p.createdAt) < 60 ? t('sec.e.escalateIn', { n: 60 - secondsSince(active.p.createdAt) }) : t('sec.e.escalated')}</p>
              </>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="flex items-center gap-2 rounded-xl bg-[#E3F5E9] px-3 py-2.5 text-sm font-bold text-[#17703D]"><ShieldCheck className="h-4 w-4" />{t('sec.e.onTheWay', { time: formatTime(active.p.acceptedAt) })}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={() => { run(resolvePanic, { id: active.p.id, outcome: 'falseAlarm' }); toast.show(t('sec.e.closed')); }}>{t('sec.e.falseAlarm')}</Button>
                  <Button variant="dark" onClick={() => { run(resolvePanic, { id: active.p.id, outcome: 'handled' }); toast.show(t('sec.e.closed')); }}>{t('sec.e.handled')}</Button>
                </div>
              </div>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <a href={`tel:${active.phone.replace(/\D/g, '')}`} className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-ink/20 text-sm font-semibold"><Phone className="h-4 w-4" />{t('sec.e.callResident')}</a>
              <a href="tel:112" className="flex h-11 items-center justify-center rounded-xl border border-[#DC2626]/40 text-sm font-semibold text-[#B91C1C]">{t('sec.e.call112')}</a>
            </div>
            <div className="mt-3 flex h-20 items-end rounded-xl bg-[#1d2430] p-2 text-[11px] font-semibold text-white/80"><span className="mr-1 h-2 w-2 animate-pulse rounded-full bg-[#ef4444]" />{t('sec.e.cctv', { block: active.u.code[0] })}</div>
          </Card>
        )}
        <Card className="p-0">
          <p className="px-4 pb-1 pt-4 font-bold">{t('sec.e.history')}</p>
          {data.history.map(({ p, u }) => (
            <div key={p.id} className="flex items-center justify-between border-t border-line px-4 py-2.5">
              <div>
                <p className="text-sm font-bold">{u.code} <span className="font-normal text-ink/60">· {p.type ? t(`emergency.type.${p.type}`) : t('sec.e.unknownType')}</span></p>
                <p className="text-[11px] text-ink/45">{formatDateTime(p.createdAt, lang)}{p.acceptedAt ? ` · ${t('sec.e.response', { n: minutes(p.createdAt, p.acceptedAt) })}` : ''}</p>
              </div>
              <StatusPill tone={p.outcome === 'handled' ? 'success' : p.outcome === 'falseAlarm' ? 'warning' : 'neutral'}>{t(`sec.e.outcome.${p.outcome ?? 'cancelled'}`)}</StatusPill>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
