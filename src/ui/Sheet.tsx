import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { cx } from './cx';

/** Bottom sheet. Inside the phone frame, `fixed` is scoped to the frame (it has a transform). */
export function Sheet({ open, onClose, title, children, footer, className }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; className?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button aria-label="close" className="absolute inset-0 bg-ink/45 backdrop-blur-[1px]" onClick={onClose} />
      <div className={cx('relative flex max-h-[88%] w-full max-w-[480px] animate-rise flex-col rounded-t-3xl bg-white shadow-lift', className)}>
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line" />
        {title && (
          <div className="flex items-center justify-between px-5 pb-2 pt-3">
            <h3 className="text-base font-bold">{title}</h3>
            <button onClick={onClose} className="rounded-full p-1.5 text-ink/50 hover:bg-paper" aria-label="close">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
