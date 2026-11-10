import { Lock, type LucideIcon } from 'lucide-react';
import { cx } from './cx';

/** A menu tile in the customer app: every icon in the same soft brand tint (no rainbow colors). */
export function IconTile({ icon: Icon, label, locked, badge, onClick }: { icon: LucideIcon; label: string; locked?: boolean; badge?: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group flex flex-col items-center gap-1.5 text-center">
      <span className={cx('relative flex h-11 w-11 items-center justify-center rounded-xl transition group-active:scale-95', locked ? 'bg-[#EEF0F3] text-ink/35' : 'bg-brand-tint text-brand-dark')}>
        <Icon className="h-5 w-5" strokeWidth={1.75} />
        {locked && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-ink/50 text-white">
            <Lock className="h-2 w-2" strokeWidth={3} />
          </span>
        )}
        {badge && !locked && <span className="absolute -right-2 -top-1.5 rounded-full border-2 border-white bg-brand px-1.5 text-xs font-semibold leading-4 text-white">{badge}</span>}
      </span>
      <span className={cx('line-clamp-2 text-xs font-medium leading-tight', locked ? 'text-ink/40' : 'text-ink/80')}>{label}</span>
    </button>
  );
}
