import { ChevronRight, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../../../i18n';
import { activateApp, switchUnit } from '../../../store/actions';
import { useResident } from '../../../store/hooks';
import { useStore } from '../../../store/store';
import { Moni } from '../../../ui/Moni';
import { SegmentTheme } from '../../../ui/SegmentTheme';
import { StatusPill } from '../../../ui/StatusPill';

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
    <SegmentTheme theme="komersil" className="h-full overflow-y-auto bg-white px-6 pt-8 md:pt-12">
      <Moni pose="point" size={70} />
      <h1 className="mt-3 text-2xl font-extrabold">{t('units.title', { name: ctx.name.split(' ')[0] })}</h1>
      <p className="mt-1 text-sm text-ink/55">{t('units.body')}</p>
      <div className="mt-5 space-y-2.5">
        {ctx.unitIds.map((id) => {
          const u = data.units.find((x) => x.id === id)!;
          const p = data.projects.find((x) => x.id === u.projectId)!;
          const type = data.unitTypes.find((x) => x.id === u.typeId)!;
          return (
            <button key={id} onClick={() => pick(id)} className="flex w-full items-center gap-3 rounded-2xl border border-line p-4 text-left hover:border-brand/50">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand-dark"><Home className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{u.code} · {type.name}</span>
                <span className="block text-xs text-ink/50">{p.name}</span>
              </span>
              <StatusPill tone={u.occupancy === 'occupied' ? 'success' : 'warning'}>{t(`occupancy.${u.occupancy}`)}</StatusPill>
              <ChevronRight className="h-4 w-4 text-ink/30" />
            </button>
          );
        })}
      </div>
    </SegmentTheme>
  );
}
