import { Lock, type LucideIcon } from 'lucide-react';
import { cx } from './cx';
import { TONES, type Tone } from './theme';

export function IconTile({ icon: Icon, tone, label, locked, badge, onClick }: { icon: LucideIcon; tone: Tone; label: string; locked?: boolean; badge?: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group flex flex-col items-center gap-1.5 text-center">
      <span className={cx('relative flex h-[52px] w-[52px] items-center justify-center rounded-[18px] transition group-active:scale-95', locked ? TONES.grey + ' opacity-60' : TONES[tone])}>
        <Icon className="h-6 w-6" strokeWidth={2} />
        {locked && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#5B6472] text-white">
            <Lock className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
        )}
        {badge && !locked && <span className="absolute -right-2 -top-1.5 rounded-full border-2 border-white bg-brand px-1.5 text-[9px] font-bold leading-4 text-white">{badge}</span>}
      </span>
      <span className={cx('line-clamp-2 text-[11px] font-semibold leading-tight', locked ? 'text-ink/40' : 'text-ink/80')}>{label}</span>
    </button>
  );
}
