import type { HTMLAttributes } from 'react';
import { cx } from './cx';
import { useFlavor } from './flavor';

export function Card({ className, interactive, ...rest }: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  const premium = useFlavor() === 'premium';
  // Tailwind's p-4 beats a later p-0 / p-3, so a premium card drops its default padding when given its own.
  const ownPadding = /(^|\s)p-/.test(className ?? '');
  return (
    <div
      {...rest}
      className={cx(
        premium ? cx('rounded-2xl border border-line bg-white shadow-card', !ownPadding && 'p-4') : 'rounded-2xl border border-line/80 bg-white p-4 shadow-card',
        interactive && 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0',
        className,
      )}
    />
  );
}
