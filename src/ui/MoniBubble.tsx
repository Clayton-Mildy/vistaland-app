import type { ReactNode } from 'react';
import { cx } from './cx';
import { Moni, type MoniPose } from './Moni';

export function MoniBubble({ pose = 'waveSm', children, className, size = 56 }: { pose?: MoniPose; children: ReactNode; className?: string; size?: number }) {
  return (
    <div className={cx('flex items-end gap-2', className)}>
      <Moni pose={pose} size={size} className="shrink-0" />
      <div className="relative mb-3 rounded-2xl rounded-bl-md bg-brand-tint px-3.5 py-2.5 text-[13px] font-semibold leading-snug text-brand-dark">{children}</div>
    </div>
  );
}
