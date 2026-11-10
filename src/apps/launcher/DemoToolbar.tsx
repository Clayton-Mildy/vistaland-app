import { AlertTriangle, CalendarClock, RotateCcw } from 'lucide-react';
import { addDays, addMonthsToDate, formatDate } from '../../domain/clock';
import { useLang, useT } from '../../i18n';
import { setToday } from '../../store/actions';
import { useRun, useStorageOk, useToday } from '../../store/hooks';
import { clearPhotos } from '../../store/photos';
import { useStore } from '../../store/store';
import { cx } from '../../ui/cx';
import { useToast } from '../../ui/Toast';

export function DemoToolbar({ compact, className }: { compact?: boolean; className?: string }) {
  const t = useT();
  const [lang] = useLang();
  const today = useToday();
  const run = useRun();
  const ok = useStorageOk();
  const toast = useToast();
  const go = (date: string) => run(setToday, { date });
  const reset = () => {
    if (!window.confirm(t('demo.resetConfirm'))) return;
    void clearPhotos();
    useStore.getState().reset();
    toast.show(t('demo.resetDone'));
  };
  const btn = 'rounded-lg border border-line bg-white px-2 py-1 text-xs font-semibold text-ink/75 hover:border-ink/30';
  return (
    <div className={cx('flex flex-wrap items-center gap-2', className)}>
      <div className="flex items-center gap-2 rounded-lg bg-ink px-2.5 py-1 text-xs font-semibold text-white">
        <CalendarClock className="h-3.5 w-3.5 text-gold" />
        {!compact && <span className="text-white/60">{t('demo.today')}</span>}
        <span>{formatDate(today, lang, 'long')}</span>
      </div>
      <button className={btn} onClick={() => go(addDays(today, 1))}>{t('demo.plusDay')}</button>
      <button className={btn} onClick={() => go(addDays(today, 7))}>{t('demo.plusWeek')}</button>
      <button className={btn} onClick={() => go(addMonthsToDate(today, 1))}>{t('demo.plusMonth')}</button>
      <button className={btn} onClick={() => go(addDays(today, 100))}>{t('demo.plus100')}</button>
      <button className={cx(btn, 'inline-flex items-center gap-1 text-[#B4192A]')} onClick={reset}>
        <RotateCcw className="h-3 w-3" />
        {t('demo.reset')}
      </button>
      {!ok && (
        <span className="inline-flex items-center gap-1 rounded-lg bg-[#FFF1D6] px-2 py-1 text-xs font-semibold text-[#9A5B00]">
          <AlertTriangle className="h-3.5 w-3.5" />
          {t('common.storageOff')}
        </span>
      )}
    </div>
  );
}
