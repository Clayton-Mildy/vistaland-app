import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cx } from '../../ui/cx';
import { DEMO_VIEWS, DemoTweaks, type DemoView, type PhoneApp } from './DemoTweaks';

/** The phone's real size including its 10px bezel: a 390×844 screen. */
const PHONE_W = 410;
const PHONE_H = 864;
const PHONE_QUERY = '(max-width: 767px)';

/** True on phone-sized screens, where the demo shows only the customer app. */
function useIsPhone() {
  const query = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches;
  const [phone, setPhone] = useState(query);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(PHONE_QUERY);
    const onChange = () => setPhone(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return phone;
}

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
 * The demo. On a laptop: the phone (resident or staff) next to the live dashboard, or either one
 * full screen. On a phone: the customer app only. The demo controls sit behind a floating button
 * in every view. Hidden screens stay loaded, so switching never logs anyone out or loses their place.
 */
export function Demo() {
  const phone = useIsPhone();
  const [app, setApp] = useState<PhoneApp>('resident');
  const [params, setParams] = useSearchParams();
  const asked = params.get('view') as DemoView;
  const view: DemoView = DEMO_VIEWS.includes(asked) ? asked : 'split';
  const setView = (v: DemoView) => setParams(v === 'split' ? {} : { view: v }, { replace: true });
  const appOnly = view === 'phone';
  const { ref: phoneArea, scale } = useFitScale(appOnly && !phone);

  if (phone) {
    return (
      <div className="relative h-[100dvh] bg-paper">
        <div data-pane="phone" className="h-full">
          <iframe title="phone" src="/app" className="h-full w-full" />
        </div>
        <DemoTweaks phone view="phone" onView={setView} app="resident" onApp={setApp} />
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#E9E4DA]">
      <div className={cx('flex h-full min-h-0 gap-4', view !== 'dashboard' && 'p-4')}>
        <div
          data-pane="phone"
          hidden={view === 'dashboard'}
          ref={phoneArea}
          className={cx(view === 'dashboard' ? 'hidden' : 'flex', 'min-h-0 items-start justify-center', appOnly ? 'flex-1' : 'shrink-0')}
        >
          {/* The sizer takes the scaled size in the layout; the bezel inside is scaled to match. */}
          <div className="relative" style={appOnly ? { width: PHONE_W * scale, height: PHONE_H * scale } : undefined}>
            <div
              className={cx(
                'overflow-hidden rounded-[40px] border-[10px] border-[#1A1D24] bg-paper shadow-[0_30px_60px_-30px_rgba(17,24,39,0.5)]',
                appOnly ? 'absolute left-0 top-0 origin-top-left' : 'h-[min(844px,calc(100dvh-32px))] w-[390px]',
              )}
              style={appOnly ? { width: PHONE_W, height: PHONE_H, transform: `scale(${scale})` } : undefined}
            >
              <iframe key={app} title="phone" src={app === 'resident' ? '/app' : '/staff'} className="h-full w-full" />
            </div>
          </div>
        </div>
        <div
          data-pane="dashboard"
          data-full={view === 'dashboard' ? 'true' : undefined}
          hidden={view === 'phone'}
          className={cx(
            view === 'phone' ? 'hidden' : 'block',
            'min-w-0 flex-1 overflow-hidden bg-white',
            view === 'split' && 'rounded-2xl border border-line shadow-card',
          )}
        >
          <iframe title="dashboard" src="/dashboard" className="h-full w-full" />
        </div>
      </div>
      <DemoTweaks phone={false} view={view} onView={setView} app={app} onApp={setApp} />
    </div>
  );
}
