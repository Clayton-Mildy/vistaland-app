import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../../../i18n';

/**
 * Title band for inner screens (from the client's PDF): deep brand color, back button, title,
 * and optionally an eyebrow (gold), a key figure and a sub line. The first card below overlaps it.
 */
export function ScreenHeader({ title, back = true, onBack, right, eyebrow, figure, sub, children }: {
  title: ReactNode; back?: boolean; onBack?: () => void; right?: ReactNode;
  eyebrow?: ReactNode; figure?: ReactNode; sub?: ReactNode; children?: ReactNode;
}) {
  const nav = useNavigate();
  const t = useT();
  const hasDetail = eyebrow || figure || sub || children;
  return (
    <header className="bg-brand-dark px-4 pb-12 pt-4 text-white md:pt-9">
      <div className="flex min-h-[36px] items-center gap-2">
        {back && (
          <button type="button" aria-label={t('common.back')} onClick={onBack ?? (() => nav(-1))} className="-ml-1.5 rounded-full p-1.5 text-white/90 transition hover:bg-white/10">
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold">{title}</h1>
        {right}
      </div>
      {hasDetail && (
        <div className="mt-4">
          {eyebrow && <p className="truncate text-xs font-medium uppercase tracking-[0.12em] text-gold">{eyebrow}</p>}
          {figure && <p className="mt-0.5 text-2xl font-semibold leading-tight tabular">{figure}</p>}
          {sub && <p className="mt-0.5 text-sm text-white/75">{sub}</p>}
          {children}
        </div>
      )}
    </header>
  );
}
