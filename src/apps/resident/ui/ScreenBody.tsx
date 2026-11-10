import type { ReactNode } from 'react';
import { cx } from '../../../ui/cx';

/** Content under a ScreenHeader: the first card overlaps the band by 32px. */
export function ScreenBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('relative -mt-8 space-y-3 px-4 pb-4', className)}>{children}</div>;
}
