import type { ReactNode } from 'react';
import { cx } from './cx';

export function Chip({ active, onClick, children, className, count }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition',
        active ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink/75 hover:border-brand/40',
        className,
      )}
    >
      {children}
      {count !== undefined && <span className={cx('rounded-full px-1.5 text-[10px]', active ? 'bg-white/25' : 'bg-paper')}>{count}</span>}
    </button>
  );
}
