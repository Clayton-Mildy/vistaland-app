import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from './cx';

export interface TimelineItem { key: string; label: ReactNode; meta?: ReactNode; state: 'done' | 'current' | 'todo' | 'failed'; children?: ReactNode }

export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cx('relative', className)}>
      {items.map((it, i) => (
        <li key={it.key} className="relative flex gap-3 pb-4 last:pb-0">
          {i < items.length - 1 && <span className={cx('absolute left-[9px] top-5 h-[calc(100%-12px)] w-0.5', it.state === 'done' ? 'bg-brand' : 'bg-line')} />}
          <span
            className={cx(
              'relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
              it.state === 'done' && 'border-brand bg-brand text-white',
              it.state === 'current' && 'border-gold bg-white ring-4 ring-gold/20',
              it.state === 'todo' && 'border-[#D5D9E0] bg-white',
              it.state === 'failed' && 'border-[#C81E2E] bg-[#C81E2E] text-white',
            )}
          >
            {it.state === 'done' && <Check className="h-3 w-3" strokeWidth={3} />}
            {it.state === 'failed' && <span className="text-[10px] font-bold">!</span>}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className={cx('text-sm', it.state === 'todo' ? 'text-ink/40' : 'font-semibold text-ink')}>{it.label}</span>
              {it.meta && <span className="shrink-0 text-[11px] text-ink/45">{it.meta}</span>}
            </div>
            {it.children}
          </div>
        </li>
      ))}
    </ol>
  );
}
