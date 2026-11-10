import type { ReactNode } from 'react';
import { cx } from './cx';

export function Section({ title, action, children, className }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('mt-5', className)}>
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-[15px] font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
