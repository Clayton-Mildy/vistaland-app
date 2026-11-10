import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { cx } from './cx';

export function AppBar({ title, subtitle, right, back = true, onBack, className }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode; back?: boolean; onBack?: () => void; className?: string }) {
  const nav = useNavigate();
  return (
    <header className={cx('sticky top-0 z-20 flex items-center gap-2 border-b border-line/80 bg-white/95 px-3 pb-3 pt-4 backdrop-blur md:pt-9', className)}>
      {back && (
        <button onClick={onBack ?? (() => nav(-1))} className="rounded-full p-1.5 text-ink/70 hover:bg-paper" aria-label="back">
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      <div className={cx('min-w-0 flex-1', !back && 'pl-2')}>
        <h1 className="truncate text-[17px] font-bold leading-tight">{title}</h1>
        {subtitle && <p className="truncate text-xs text-ink/50">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
