import type { ReactNode } from 'react';
import { cx } from './cx';

export function Kpi({ label, value, sub, tone, active, onClick }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: 'danger' | 'warning' | 'success'; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cx('min-w-0 rounded-2xl border bg-white px-4 py-3 text-left shadow-card transition disabled:cursor-default', active ? 'border-brand ring-2 ring-brand/15' : 'border-line/80', onClick && 'hover:border-brand/40')}
    >
      <div className="truncate text-xs font-medium text-ink/55">{label}</div>
      <div className={cx('mt-1 truncate text-2xl font-bold tabular', tone === 'danger' && 'text-[#B4192A]', tone === 'warning' && 'text-[#9A5B00]', tone === 'success' && 'text-[#17703D]')}>{value}</div>
      {sub && <div className="mt-0.5 truncate text-[11px] text-ink/45">{sub}</div>}
    </button>
  );
}
