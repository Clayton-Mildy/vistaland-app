import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../../../i18n';
import { activateApp, switchUnit } from '../../../store/actions';
import { useResident } from '../../../store/hooks';
import { useStore } from '../../../store/store';
import { cx } from '../../../ui/cx';
import { Photo } from '../../../ui/Photo';
import { SegmentTheme } from '../../../ui/SegmentTheme';
import { StatusPill } from '../../../ui/StatusPill';
import { houseFor } from '../ui/media';
import { ScreenBody } from '../ui/ScreenBody';
import { ScreenHeader } from '../ui/ScreenHeader';

export default function UnitPicker() {
  const t = useT();
  const nav = useNavigate();
  const ctx = useResident();
  const data = useStore((s) => s.data);
  if (!ctx) return null;
  const pick = (unitId: string) => {
    const firstTime = ctx.role === 'owner' && !data.units.find((u) => u.id === unitId)?.appActivatedAt;
    const { run } = useStore.getState();
    run(switchUnit, { unitId });
    if (ctx.role === 'owner') run(activateApp, { unitId });
    nav(firstTime ? '/app/welcome' : '/app/home', { replace: true });
  };
  return (
    <SegmentTheme theme={ctx.segment} className="no-scrollbar h-full overflow-y-auto bg-paper">
      <ScreenHeader back={false} title={t('units.title', { name: ctx.name.split(' ')[0] })} sub={t('units.body')} />
      <ScreenBody>
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          {ctx.unitIds.map((id, i) => {
            const u = data.units.find((x) => x.id === id)!;
            const p = data.projects.find((x) => x.id === u.projectId)!;
            const type = data.unitTypes.find((x) => x.id === u.typeId)!;
            return (
              <button key={id} onClick={() => pick(id)} className={cx('flex w-full items-center gap-3 p-4 text-left transition hover:bg-paper/60', i > 0 && 'border-t border-line')}>
                <Photo id={houseFor(u)} className="h-14 w-14 shrink-0 rounded-xl" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{u.code} · {type.name}</span>
                  <span className="block truncate text-xs text-ink/55">{p.name}</span>
                </span>
                <StatusPill tone={u.occupancy === 'occupied' ? 'success' : 'warning'}>{t(`occupancy.${u.occupancy}`)}</StatusPill>
                <ChevronRight className="h-4 w-4 text-ink/30" />
              </button>
            );
          })}
        </div>
      </ScreenBody>
    </SegmentTheme>
  );
}
