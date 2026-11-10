import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useT } from '../../i18n';
import { cx } from '../../ui/cx';
import { LangToggle } from '../../ui/LangToggle';
import { Segmented } from '../../ui/Segmented';
import { DemoToolbar } from './DemoToolbar';

type View = 'split' | 'phone' | 'dashboard';
const VIEWS: View[] = ['split', 'phone', 'dashboard'];

/** The phone's real size including its 10px bezel: a 390×844 screen. */
const PHONE_W = 410;
const PHONE_H = 864;

/** How much to scale the phone so it fills the area it is given (never more than 1.5×). */
function useFitScale(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!active || !el || typeof ResizeObserver === 'undefined') return;
    const fit = () => setScale(Math.max(0.5, Math.min(el.clientHeight / PHONE_H, el.clientWidth / PHONE_W, 1.5)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [active]);
  return { ref, scale };
}

/**
 * Phone (resident or staff) next to the live dashboard. Same origin, so both share the store.
 * The view switch shows both, or one of them on its own. Both screens stay loaded while hidden,
 * so switching never logs anyone out or loses their place.
 */
export function Demo() {
  const t = useT();
  const [left, setLeft] = useState<'resident' | 'staff'>('resident');
  const [params, setParams] = useSearchParams();
  const view: View = VIEWS.includes(params.get('view') as View) ? (params.get('view') as View) : 'split';
  const setView = (v: View) => setParams(v === 'split' ? {} : { view: v }, { replace: true });
  const phoneOnly = view === 'phone';
  const { ref: phoneArea, scale } = useFitScale(phoneOnly);

  return (
    <div className="flex h-screen flex-col bg-[#E9E4DA]">
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-white px-4 py-2.5">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-semibold text-ink/60 hover:text-ink">
          <ArrowLeft className="h-4 w-4" />
          VHome
        </Link>
        <span className="text-xs font-semibold text-ink/45">{t('demo.view')}</span>
        <Segmented size="sm" value={view} onChange={setView} items={VIEWS.map((v) => ({ value: v, label: t(`demo.view.${v}`) }))} />
        {view !== 'dashboard' && (
          <>
            <span className="text-xs font-semibold text-ink/45">{t('demo.left')}</span>
            <Segmented size="sm" value={left} onChange={setLeft} items={[{ value: 'resident', label: t('demo.resident') }, { value: 'staff', label: t('demo.staff') }]} />
          </>
        )}
        <DemoToolbar compact className="ml-auto" />
        <LangToggle />
      </header>
      <div className="flex min-h-0 flex-1 gap-4 p-4">
        <div
          data-pane="phone"
          hidden={view === 'dashboard'}
          ref={phoneArea}
          className={cx(view === 'dashboard' ? 'hidden' : 'flex', 'min-h-0 items-start justify-center', phoneOnly ? 'flex-1' : 'shrink-0')}
        >
          {/* The sizer takes the scaled size in the layout; the bezel inside is scaled to match. */}
          <div className="relative" style={phoneOnly ? { width: PHONE_W * scale, height: PHONE_H * scale } : undefined}>
            <div
              className={cx(
                'overflow-hidden rounded-[40px] border-[10px] border-[#1A1D24] bg-paper shadow-[0_30px_60px_-30px_rgba(17,24,39,0.5)]',
                phoneOnly ? 'absolute left-0 top-0 origin-top-left' : 'h-[min(844px,calc(100vh-90px))] w-[390px]',
              )}
              style={phoneOnly ? { width: PHONE_W, height: PHONE_H, transform: `scale(${scale})` } : undefined}
            >
              <iframe key={left} title="phone" src={left === 'resident' ? '/app' : '/staff'} className="h-full w-full" />
            </div>
          </div>
        </div>
        <div
          data-pane="dashboard"
          hidden={view === 'phone'}
          className={cx(view === 'phone' ? 'hidden' : 'block', 'min-w-0 flex-1 overflow-hidden rounded-2xl border border-line bg-white shadow-card')}
        >
          <iframe title="dashboard" src="/dashboard" className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
