import type { ReactNode } from 'react';
import { cx } from './cx';
import { useFlavor } from './flavor';

export function Section({ title, action, children, className }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  const premium = useFlavor() === 'premium';
  return (
    <section className={cx('mt-5', className)}>
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className={premium ? 'text-base font-semibold' : 'text-[15px] font-bold'}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
