import { cx } from './cx';

export function Segmented<T extends string>({ value, onChange, items, className, size = 'md' }: { value: T; onChange: (v: T) => void; items: { value: T; label: string }[]; className?: string; size?: 'sm' | 'md' }) {
  return (
    <div className={cx('inline-flex rounded-xl bg-[#EEF0F3] p-1', className)}>
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={cx(
            'flex-1 whitespace-nowrap rounded-lg font-semibold transition',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
            value === it.value ? 'bg-white text-ink shadow-sm' : 'text-ink/55 hover:text-ink',
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
