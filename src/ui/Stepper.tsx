import { cx } from './cx';

/** Horizontal step bar: `current` is the active index; indexes below it are done. */
export function Stepper({ steps, current, className, compact }: { steps: string[]; current: number; className?: string; compact?: boolean }) {
  return (
    <div className={className}>
      <div className="flex gap-1">
        {steps.map((s, i) => (
          <div key={s} className={cx('h-1.5 flex-1 rounded-full', i < current ? 'bg-brand' : i === current ? 'bg-gold' : 'bg-[#ECE8E1]')} />
        ))}
      </div>
      {!compact && (
        <div className="mt-1.5 flex gap-1">
          {steps.map((s, i) => (
            <span key={s} className={cx('flex-1 truncate text-[10px] font-semibold', i === current ? 'text-ink' : i < current ? 'text-brand-dark' : 'text-ink/40')}>
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
