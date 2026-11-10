import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { cx } from './cx';

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="close" className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className={cx('relative flex max-h-[90vh] w-full animate-pop flex-col rounded-2xl bg-white shadow-lift', wide ? 'max-w-3xl' : 'max-w-lg')}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="text-base font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-ink/50 hover:bg-paper" aria-label="close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
