import { Home, Receipt, Store, Ticket, UserRound } from 'lucide-react';
import { useEffect } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useT } from '../../i18n';
import { useResident } from '../../store/hooks';
import { cx } from '../../ui/cx';
import { DevelopedBy } from '../../ui/Footer';
import { SegmentTheme } from '../../ui/SegmentTheme';

const TABS = [
  { to: '/app/home', icon: Home, key: 'nav.home' },
  { to: '/app/bills', icon: Receipt, key: 'nav.bills' },
  { to: '/app/market', icon: Store, key: 'nav.market' },
  { to: '/app/vouchers', icon: Ticket, key: 'nav.vouchers' },
  { to: '/app/account', icon: UserRound, key: 'nav.account' },
];

/** Signed-in resident layout: segment colours, scrolling body, bottom nav on the main tabs. */
export function ResidentShell() {
  const t = useT();
  const ctx = useResident();
  const loc = useLocation();
  useEffect(() => {
    document.querySelector('#resident-scroll')?.scrollTo({ top: 0 });
  }, [loc.pathname]);
  if (!ctx) return <Navigate to="/app/login" replace />;
  const showNav = TABS.some((tab) => tab.to === loc.pathname);
  return (
    <SegmentTheme theme={ctx.segment} className="flex h-full flex-col">
      <main id="resident-scroll" className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <Outlet />
        <DevelopedBy className="pb-6 pt-4" />
      </main>
      {showNav && (
        <nav className="border-t border-line bg-white pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5">
          <div className="flex">
            {TABS.map(({ to, icon: Icon, key }) => (
              <NavLink key={to} to={to} className={({ isActive }) => cx('flex flex-1 flex-col items-center gap-0.5 py-1 text-xs font-medium', isActive ? 'text-brand' : 'text-ink/45')}>
                <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
                {t(key)}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </SegmentTheme>
  );
}
