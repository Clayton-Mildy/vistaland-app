import { cx } from '../../../ui/cx';

/**
 * Segmented progress bar for the title band: done segments white, the current one gold.
 * `current` is the index of the step in progress; `steps.length` means all done.
 * Labels show under the bar when there are few enough to fit.
 */
export function BandSteps({ steps, current, labels = steps.length <= 4, className }: { steps: string[]; current: number; labels?: boolean; className?: string }) {
  return (
    <div className={className}>
      <div className="flex gap-1" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={current}>
        {steps.map((s, i) => (
          <span key={s} className={cx('h-1 flex-1 rounded-full', i < current ? 'bg-white' : i === current ? 'bg-gold' : 'bg-white/20')} />
        ))}
      </div>
      {labels && (
        <div className="mt-1.5 flex gap-1">
          {steps.map((s, i) => (
            <span key={s} className={cx('flex-1 truncate text-xs', i === current ? 'font-medium text-white' : 'text-white/60')}>{s}</span>
          ))}
        </div>
      )}
    </div>
  );
}
