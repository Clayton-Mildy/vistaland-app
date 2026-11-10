import { cx } from './cx';

export function Progress({ value, className, tone = 'brand' }: { value: number; className?: string; tone?: 'brand' | 'warning' | 'success' | 'danger' }) {
  const color = { brand: 'bg-brand', warning: 'bg-[#F59E0B]', success: 'bg-[#1F8A4C]', danger: 'bg-[#C81E2E]' }[tone];
  return (
    <div className={cx('h-1.5 w-full overflow-hidden rounded-full bg-[#ECE8E1]', className)}>
      <div className={cx('h-full rounded-full transition-all', color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
