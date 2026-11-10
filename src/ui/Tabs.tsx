import { cx } from './cx';

export function Tabs<T extends string>({ value, onChange, items, className }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[]; className?: string }) {
  return (
    <div className={cx('flex gap-1 border-b border-line', className)}>
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={cx(
            '-mb-px flex-1 whitespace-nowrap border-b-2 px-2 pb-2.5 pt-1 text-sm font-semibold transition',
            value === it.value ? 'border-brand text-brand-dark' : 'border-transparent text-ink/50 hover:text-ink/75',
          )}
        >
          {it.label}
          {it.count !== undefined && <span className="ml-1 text-xs text-ink/40">({it.count})</span>}
        </button>
      ))}
    </div>
  );
}
