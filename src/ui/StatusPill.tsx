import type { ReactNode } from 'react';
import { cx } from './cx';

export type PillTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'violet';
const TONE: Record<PillTone, string> = {
  neutral: 'bg-[#EEF0F3] text-[#4B5563]',
  brand: 'bg-brand-tint text-brand-dark',
  success: 'bg-[#E3F5E9] text-[#17703D]',
  warning: 'bg-[#FFF1D6] text-[#9A5B00]',
  danger: 'bg-[#FDE8EA] text-[#B4192A]',
  info: 'bg-[#E3EEFD] text-[#1F56B3]',
  gold: 'bg-[#FBF0D0] text-[#7A5600]',
  violet: 'bg-[#EEE9FD] text-[#5B3FC4]',
};

export function StatusPill({ tone = 'neutral', children, className, dot }: { tone?: PillTone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold leading-5', TONE[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
