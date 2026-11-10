import { Clock, Sparkles } from 'lucide-react';
import { diffDays } from '../../../domain/clock';
import { isOverSla } from '../../../domain/complaints';
import type { Complaint, Finding, ISODate } from '../../../domain/types';
import { useT } from '../../../i18n';
import { cx } from '../../../ui/cx';
import { Photo } from '../../../ui/Photo';
import { StatusPill } from '../../../ui/StatusPill';

export interface BoardItem { c: Complaint; f: Finding; unitCode: string; unitId: string }

/** One finding on the estate board: unit, room, category, AI confidence, SLA and the latest AI fix check. */
export function FindingCard({ item, slaDays, today, onOpen, selectable, selected, onToggle, actions }: {
  item: BoardItem; slaDays: number; today: ISODate; onOpen: () => void;
  selectable?: boolean; selected?: boolean; onToggle?: () => void; actions?: React.ReactNode;
}) {
  const t = useT();
  const { c, f } = item;
  const days = c.submittedAt ? diffDays(c.submittedAt.slice(0, 10), today) : 0;
  const late = c.submittedAt ? isOverSla(f, c.submittedAt, slaDays, today) : false;
  const lastFix = f.fixChecks.at(-1);
  const corrected = f.category !== f.ai.category;
  return (
    <div className={cx('rounded-xl border bg-white p-2.5 shadow-card transition', selected ? 'border-brand ring-2 ring-brand/20' : 'border-line/80')}>
      <div className="flex gap-2.5">
        {selectable && (
          <input type="checkbox" checked={!!selected} onChange={onToggle} aria-label={t('dash.cmp.select', { unit: item.unitCode })} className="mt-1 h-4 w-4 shrink-0 accent-[rgb(var(--brand))]" />
        )}
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 gap-2.5 text-left">
          <Photo id={f.photoIds[0]} className="h-14 w-14 shrink-0 rounded-lg" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-1">
              <b className="text-sm">{item.unitCode}</b>
              <span className="text-[10px] text-ink/40">{c.id}</span>
            </span>
            <span className="block truncate text-xs text-ink/60">{t(`room.${f.room}`)} · {f.description || '—'}</span>
            <span className="mt-1 flex flex-wrap items-center gap-1">
              <StatusPill tone={corrected ? 'violet' : 'info'}>{t(`category.${f.category}`)}{corrected ? ` · ${t('dash.cmp.corrected')}` : ''}</StatusPill>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-ink/50"><Sparkles className="h-3 w-3" />{f.manualReview ? t('dash.cmp.manual') : `${f.ai.confidence}%`}</span>
            </span>
          </span>
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {!['done', 'rejected'].includes(f.stage) && (
          <StatusPill tone={late ? 'danger' : 'neutral'}><Clock className="mr-0.5 inline h-3 w-3" />{late ? t('dash.cmp.overSla', { n: days }) : t('dash.cmp.days', { n: days })}</StatusPill>
        )}
        {f.stage === 'rejected' && <StatusPill tone="danger">{t('stage.rejected')}</StatusPill>}
        {lastFix && (lastFix.verdict === 'fixed'
          ? <StatusPill tone="success">{t('dash.cmp.aiPass', { n: lastFix.confidence })}</StatusPill>
          : <StatusPill tone="danger">{t('dash.cmp.aiFail')}</StatusPill>)}
      </div>
      {actions && <div className="mt-2 flex flex-wrap gap-1.5">{actions}</div>}
    </div>
  );
}
