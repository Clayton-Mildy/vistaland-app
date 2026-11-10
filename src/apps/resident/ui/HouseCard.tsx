import type { ReactNode } from 'react';
import { cx } from '../../../ui/cx';
import { Photo } from '../../../ui/Photo';

/** The home screen's lead card: the resident's house photo with its occupancy, and the one thing to act on. */
export function HouseCard({ photoId, occupancy, label, amount, note, noteTone = 'muted', action, onClick, className }: {
  photoId: string; occupancy?: ReactNode; label: ReactNode; amount?: ReactNode; note?: ReactNode;
  noteTone?: 'muted' | 'danger' | 'success'; action?: ReactNode; onClick?: () => void; className?: string;
}) {
  return (
    <div className={cx('overflow-hidden rounded-2xl border border-line bg-white shadow-card', className)}>
      <button type="button" onClick={onClick} className="block w-full text-left" tabIndex={onClick ? 0 : -1}>
        <Photo id={photoId} className="h-[120px] w-full">
          {occupancy && <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-medium text-ink">{occupancy}</span>}
        </Photo>
      </button>
      <div className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink/55">{label}</p>
          {amount && <p className="text-base font-semibold tabular">{amount}</p>}
          {note && <p className={cx('text-xs', noteTone === 'danger' ? 'text-[#B4192A]' : noteTone === 'success' ? 'text-[#17703D]' : 'text-ink/55')}>{note}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}
