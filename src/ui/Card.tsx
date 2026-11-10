import type { HTMLAttributes } from 'react';
import { cx } from './cx';
import { useFlavor } from './flavor';

export function Card({ className, interactive, ...rest }: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  const premium = useFlavor() === 'premium';
  return (
    <div
      {...rest}
      className={cx(
        premium ? 'rounded-2xl border border-line bg-white p-4 shadow-card' : 'rounded-2xl border border-line/80 bg-white p-4 shadow-card',
        interactive && 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0',
        className,
      )}
    />
  );
}
