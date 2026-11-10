import { ChevronRight, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../../../i18n';
import { useDerived } from '../../../store/hooks';
import { Card } from '../../../ui/Card';
import { EmptyState } from '../../../ui/EmptyState';
import { StatusPill } from '../../../ui/StatusPill';
import { useStaff } from '../hooks';
import { StaffHeader } from '../StaffShell';

export function useMandorFindings(staffId: string) {
  return useDerived((d) => {
    const rows = d.complaints.flatMap((c) => {
      const unit = d.units.find((u) => u.id === c.unitId)!;
      return c.findings.filter((f) => f.mandorId === staffId).map((f) => ({ c, f, unit, group: d.workGroups.find((g) => g.id === f.groupId) }));
    });
    return rows;
  }, [staffId]);
}

export default function Tasks() {
  const t = useT();
  const nav = useNavigate();
  const staff = useStaff()!;
  const rows = useMandorFindings(staff.id);
  const active = rows.filter((r) => r.f.stage === 'assigned' || r.f.stage === 'inProgress');
  const failed = active.filter((r) => r.f.fixChecks.at(-1)?.verdict && r.f.fixChecks.at(-1)!.verdict !== 'fixed');
  const groups = new Map<string, typeof active>();
  for (const r of active) {
    const k = r.group?.id ?? 'other';
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  return (
    <div>
      <StaffHeader kicker={`${t('role.mandor')} · ${staff.company}`} title={t('mandor.hello', { name: staff.name.split(' ').at(-1)! })}>
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-white/12 p-3 text-center">
          <div><p className="text-xl font-extrabold">{active.length}</p><p className="text-[10px] text-white/75">{t('mandor.active')}</p></div>
          <div><p className="text-xl font-extrabold">{failed.length}</p><p className="text-[10px] text-white/75">{t('mandor.failed')}</p></div>
          <div><p className="text-xl font-extrabold">{rows.filter((r) => ['workDone', 'awaitingResident', 'done'].includes(r.f.stage)).length}</p><p className="text-[10px] text-white/75">{t('mandor.done')}</p></div>
        </div>
      </StaffHeader>
      <div className="space-y-3 p-4">
        {active.length === 0 && <EmptyState pose="thumbs" title={t('mandor.emptyTitle')} body={t('mandor.emptyBody')} />}
        {[...groups.entries()].map(([gid, list]) => {
          const g = list[0].group;
          return (
            <Card key={gid} className="p-0">
              <div className="border-b border-line px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold">{g ? t(`category.${g.category}`) : t('mandor.other')}</p>
                  {g && <span className="text-xs text-ink/45">{g.id}</span>}
                </div>
                {g && <p className="text-xs text-ink/55">{g.material} · {t('mandor.estimate', { n: g.estimateDays })}</p>}
              </div>
              {list.map(({ c, f, unit }) => {
                const last = f.fixChecks.at(-1);
                return (
                  <button key={f.id} onClick={() => nav(`/staff/mandor/tasks/${f.groupId ?? 'other'}/${c.id}/${f.id}`)} className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{unit.code} · {t(`room.${f.room}`)}</p>
                      <p className="truncate text-xs text-ink/55">{f.description}</p>
                      {last && last.verdict !== 'fixed' && <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-[#B4192A]"><XCircle className="h-3 w-3" />{t('mandor.aiFailed')}</p>}
                    </div>
                    <StatusPill tone={f.stage === 'assigned' ? 'warning' : 'info'}>{t(`stage.${f.stage}`)}</StatusPill>
                    <ChevronRight className="h-4 w-4 text-ink/30" />
                  </button>
                );
              })}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
