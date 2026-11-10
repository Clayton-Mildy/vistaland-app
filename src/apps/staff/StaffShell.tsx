import { AlertTriangle, ClipboardList, Fuel, History, Home, LogOut, Sprout, Truck, Wrench } from 'lucide-react';
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useT } from '../../i18n';
import { endStaffSession } from '../../store/actions';
import { useData, useRun } from '../../store/hooks';
import { cx } from '../../ui/cx';
import { DevelopedBy } from '../../ui/Footer';
import { LangToggle } from '../../ui/LangToggle';
import { SegmentTheme } from '../../ui/SegmentTheme';
import { useStaff } from './hooks';

const NAV = {
  security: [
    { to: '/staff/security/movein', icon: Truck, key: 'staff.nav.movein' },
    { to: '/staff/security/emergency', icon: AlertTriangle, key: 'staff.nav.emergency' },
  ],
  mandor: [
    { to: '/staff/mandor/tasks', icon: ClipboardList, key: 'staff.nav.tasks' },
    { to: '/staff/mandor/history', icon: History, key: 'staff.nav.history' },
  ],
  gardener: [
    { to: '/staff/garden/today', icon: Home, key: 'staff.nav.today' },
    { to: '/staff/garden/mow', icon: Sprout, key: 'staff.nav.mow' },
    { to: '/staff/garden/fuel', icon: Fuel, key: 'staff.nav.fuel' },
    { to: '/staff/garden/history', icon: History, key: 'staff.nav.history' },
  ],
} as const;

export function StaffShell() {
  const t = useT();
  const staff = useStaff();
  const nav = useNavigate();
  const run = useRun();
  const activePanics = useData((d) => d.panics.filter((p) => !p.resolvedAt && staff?.projectIds.some((pid) => d.units.find((u) => u.id === p.unitId)?.projectId === pid)).length);
  if (!staff) return <Navigate to="/staff" replace />;
  const theme = staff.role;
  return (
    <SegmentTheme theme={theme} className="flex h-full flex-col">
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto"><Outlet /></main>
      <nav className="border-t border-line bg-white pb-1.5 pt-1.5">
        <div className="flex">
          {NAV[staff.role].map(({ to, icon: Icon, key }) => (
            <NavLink key={to} to={to} className={({ isActive }) => cx('relative flex flex-1 flex-col items-center gap-0.5 py-1 text-[10.5px] font-semibold', isActive ? 'text-brand' : 'text-ink/45')}>
              <Icon className="h-[22px] w-[22px]" />
              {t(key)}
              {key === 'staff.nav.emergency' && activePanics > 0 && <span className="absolute right-[calc(50%-20px)] top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#DC2626] px-1 text-[9px] font-bold text-white">{activePanics}</span>}
            </NavLink>
          ))}
          <button onClick={() => { run(endStaffSession, {}); nav('/staff'); }} className="flex flex-1 flex-col items-center gap-0.5 py-1 text-[10.5px] font-semibold text-ink/45"><LogOut className="h-[22px] w-[22px]" />{t('staff.logout')}</button>
        </div>
        <DevelopedBy className="pt-0.5" />
      </nav>
    </SegmentTheme>
  );
}

/** Coloured header used on every staff screen. */
export function StaffHeader({ kicker, title, sub, right, children, danger }: { kicker: string; title: string; sub?: string; right?: React.ReactNode; children?: React.ReactNode; danger?: boolean }) {
  return (
    <div className={cx('px-5 pb-5 pt-5 text-white md:pt-10', danger ? 'bg-gradient-to-br from-[#DC2626] to-[#991B1B]' : 'bg-gradient-to-br from-brand to-brand-dark')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">{kicker}</p>
          <h1 className="text-xl font-extrabold leading-tight">{title}</h1>
          {sub && <p className="text-sm text-white/75">{sub}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">{right}<LangToggle dark /></div>
      </div>
      {children}
    </div>
  );
}
export const roleIcon = { security: Truck, mandor: Wrench, gardener: Sprout };
