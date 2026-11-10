import { FLOORPLANS } from '../../data/floorplans';
import type { RoomId } from '../../domain/types';
import { useT } from '../../i18n';
import { cx } from '../../ui/cx';

/** Tap-able floor plan of the unit type. `counts` highlights rooms with findings. */
export function FloorPlan({ typeId, counts = {}, onPick, selected }: { typeId: string; counts?: Partial<Record<RoomId, number>>; onPick?: (room: RoomId) => void; selected?: RoomId }) {
  const t = useT();
  const plan = FLOORPLANS[typeId] ?? [];
  return (
    <div className="relative aspect-[4/3.4] w-full rounded-2xl border-2 border-ink/70 bg-white p-1">
      <div className="relative h-full w-full">
        {plan.map((r) => {
          const n = counts[r.room] ?? 0;
          return (
            <button
              key={r.room}
              type="button"
              disabled={!onPick}
              onClick={() => onPick?.(r.room)}
              style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` }}
              className={cx(
                'absolute flex flex-col items-center justify-center border border-ink/25 p-1 text-center transition',
                n ? 'bg-brand-tint text-brand-dark' : 'bg-paper text-ink/60',
                selected === r.room && 'z-10 ring-2 ring-brand',
                onPick && 'hover:bg-brand-tint/70',
              )}
            >
              <span className="text-xs font-medium leading-tight">{t(`room.${r.room}`)}</span>
              {n > 0 && <span className="mt-0.5 rounded-full bg-brand-dark px-1.5 text-xs font-medium leading-snug text-white tabular">{n}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
