import { ArrowLeft, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../i18n';
import { cx } from '../../ui/cx';
import { LangToggle } from '../../ui/LangToggle';
import { Segmented } from '../../ui/Segmented';
import { DemoToolbar } from './DemoToolbar';

export type DemoView = 'split' | 'phone' | 'dashboard';
export const DEMO_VIEWS: DemoView[] = ['split', 'phone', 'dashboard'];
export type PhoneApp = 'resident' | 'staff';

/**
 * A floating "Demo" button that opens the demo controls. It sits above whatever is on screen
 * (a full-screen dashboard or app included), so the controls are always one tap away.
 * On a phone only the date, reset and language controls are offered: the demo is the customer app.
 */
export function DemoTweaks({ phone, view, onView, app, onApp }: { phone: boolean; view: DemoView; onView: (v: DemoView) => void; app: PhoneApp; onApp: (a: PhoneApp) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {/* Clicking anywhere outside the panel closes it (iframes don't pass clicks up, so this covers them). */}
      {open && <button type="button" aria-label={t('common.close')} className="fixed inset-0 z-[90] cursor-default bg-ink/10" onClick={() => setOpen(false)} />}
      <div className={cx('fixed right-3 z-[100] flex flex-col items-end gap-2', phone ? 'bottom-[calc(env(safe-area-inset-bottom)+84px)]' : 'bottom-5 right-5')}>
        {open && (
          <div role="dialog" aria-label={t('demo.tweaks')} className="w-[340px] max-w-[calc(100vw-24px)] space-y-3.5 rounded-2xl border border-line bg-white p-4 shadow-[0_20px_50px_-20px_rgba(17,24,39,0.45)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">{t('demo.tweaks')}</p>
              <LangToggle />
            </div>
            {!phone && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">{t('demo.view')}</p>
                <Segmented size="sm" className="w-full" value={view} onChange={onView} items={DEMO_VIEWS.map((v) => ({ value: v, label: t(`demo.view.${v}`) }))} />
              </div>
            )}
            {!phone && view !== 'dashboard' && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">{t('demo.phoneApp')}</p>
                <Segmented size="sm" className="w-full" value={app} onChange={onApp} items={[{ value: 'resident', label: t('demo.resident') }, { value: 'staff', label: t('demo.staff') }]} />
              </div>
            )}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">{t('demo.today')}</p>
              <DemoToolbar />
            </div>
            <Link to="/" className="inline-flex items-center gap-1 text-xs font-semibold text-ink/55 hover:text-ink">
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('demo.back')}
            </Link>
          </div>
        )}
        <button
          type="button"
          aria-label={open ? t('common.close') : t('demo.tweaksOpen')}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2.5 text-xs font-bold text-white shadow-[0_10px_25px_-10px_rgba(17,24,39,0.7)] ring-2 ring-white/70 transition hover:bg-black"
        >
          {open ? <X className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4 text-gold" />}
          Demo
        </button>
      </div>
    </>
  );
}
