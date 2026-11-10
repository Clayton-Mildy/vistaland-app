import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold' | 'soft' | 'dark';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-gradient-to-br from-brand to-brand-dark text-white shadow-[0_6px_16px_-6px_rgb(var(--brand)/0.55)] hover:brightness-110',
  secondary: 'bg-white text-brand-dark border border-brand/40 hover:bg-brand-tint',
  ghost: 'text-brand-dark hover:bg-brand-tint',
  danger: 'bg-[#C81E2E] text-white hover:brightness-110',
  gold: 'bg-gold text-[#5B3D00] hover:brightness-105',
  soft: 'bg-brand-tint text-brand-dark hover:brightness-95',
  dark: 'bg-ink text-white hover:bg-black',
};
const SIZES = { sm: 'h-8 px-3 text-xs rounded-lg gap-1.5', md: 'h-11 px-4 text-sm rounded-xl gap-2', lg: 'h-12 px-5 text-[15px] rounded-2xl gap-2' };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: keyof typeof SIZES;
  block?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', block, loading, icon, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex select-none items-center justify-center font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}
