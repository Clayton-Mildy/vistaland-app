import { useT } from '../../../i18n';
import { Card } from '../../../ui/Card';
import { EmptyState } from '../../../ui/EmptyState';
import { Photo } from '../../../ui/Photo';
import { StatusPill } from '../../../ui/StatusPill';
import { useStaff } from '../hooks';
import { StaffHeader } from '../StaffShell';
import { useMandorFindings } from './Tasks';

export default function History() {
  const t = useT();
  const staff = useStaff()!;
  const rows = useMandorFindings(staff.id).filter((r) => ['workDone', 'awaitingResident', 'done'].includes(r.f.stage));
  return (
    <div>
      <StaffHeader kicker={`${t('role.mandor')} · ${staff.company}`} title={t('mandor.historyTitle')} sub={t('mandor.historySub', { n: rows.length })} />
      <div className="space-y-2.5 p-4">
        {rows.length === 0 && <EmptyState title={t('mandor.historyEmpty')} />}
        {rows.map(({ c, f, unit }) => (
          <Card key={f.id} className="flex items-center gap-3">
            <Photo id={f.fixChecks.at(-1)?.photoId ?? f.photoIds[0]} className="h-14 w-14 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{unit.code} · {t(`room.${f.room}`)}</p>
              <p className="text-xs text-ink/50">{c.id} · {t(`category.${f.category}`)}</p>
            </div>
            <StatusPill tone={f.stage === 'done' ? 'success' : 'info'}>{t(`stage.${f.stage}`)}</StatusPill>
          </Card>
        ))}
      </div>
    </div>
  );
}
