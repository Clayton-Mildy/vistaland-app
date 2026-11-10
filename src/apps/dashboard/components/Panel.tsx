import type { ReactNode } from 'react';
import { cx } from '../../../ui/cx';

export function Panel({ title, right, children, className, pad = true }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={cx('min-w-0 rounded-2xl border border-line/80 bg-white shadow-card', className)}>
      {(title || right) && (
        <div className="flex items-center justify-between gap-2 border-b border-line/70 px-5 py-3.5">
          <h2 className="text-[15px] font-bold">{title}</h2>
          {right && <div className="text-xs text-ink/50">{right}</div>}
        </div>
      )}
      <div className={pad ? 'p-5' : ''}>{children}</div>
    </section>
  );
}
