import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cx } from './cx';

const base = 'w-full rounded-xl border bg-white px-3.5 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-brand focus:ring-4 focus:ring-brand/10';

export function Field({ label, hint, error, children, className, optional }: { label?: ReactNode; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string; optional?: string }) {
  return (
    <label className={cx('block', className)}>
      {label && (
        <span className="mb-1.5 block text-xs font-semibold text-ink/70">
          {label} {optional && <span className="font-normal text-ink/40">({optional})</span>}
        </span>
      )}
      {children}
      {error ? <span className="mt-1 block text-xs font-medium text-[#C81E2E]">{error}</span> : hint ? <span className="mt-1 block text-xs text-ink/45">{hint}</span> : null}
    </label>
  );
}
export function Input({ className, invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...rest} className={cx(base, 'h-11', invalid ? 'border-[#C81E2E]' : 'border-line', className)} />;
}
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cx(base, 'h-11 border-line pr-8', className)}>
      {children}
    </select>
  );
}
export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cx(base, 'min-h-[96px] border-line py-2.5', className)} />;
}
export function Checkbox({ checked, onChange, children, className }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; className?: string }) {
  return (
    <label className={cx('flex cursor-pointer items-start gap-3 text-sm', className)}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--brand))]" />
      <span className="leading-snug">{children}</span>
    </label>
  );
}
