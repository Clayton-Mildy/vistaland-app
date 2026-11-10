import { BadgePercent, Bell, CreditCard, FileBarChart, KeyRound, LayoutDashboard, Megaphone, Menu, MessageSquare, Receipt, Settings, ShieldAlert, Users, Wallet, Wrench, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { formatDateTime } from '../../domain/clock';
import type { Project } from '../../domain/types';
import { tText, useLang, useT } from '../../i18n';
import { markNotificationsRead, setDashboardProject } from '../../store/actions';
import { useDashboardProject, useData, useDerived, useNotifications, useRun } from '../../store/hooks';
import { cx } from '../../ui/cx';
import { DevelopedBy } from '../../ui/Footer';
import { LangToggle } from '../../ui/LangToggle';
import { MONI_ICON } from '../../ui/Moni';
import { SegmentTheme } from '../../ui/SegmentTheme';
import { DemoToolbar } from '../launcher/DemoToolbar';

interface NavItem { to: string; icon: typeof Bell; key: string; show?: (p: Project) => boolean; badge?: 'complaints' | 'panics' | 'feedback' | 'registrations' }
const NAV: NavItem[] = [
  { to: 'summary', icon: LayoutDashboard, key: 'dash.nav.summary' },
  { to: 'handover', icon: KeyRound, key: 'dash.nav.handover' },
  { to: 'residents', icon: Users, key: 'dash.nav.residents', badge: 'registrations' },
  { to: 'leads', icon: Megaphone, key: 'dash.nav.leads', show: (p) => p.settings.features.houseListings || p.settings.features.projects },
  { to: 'report', icon: FileBarChart, key: 'dash.nav.report' },
  { to: 'ipl', icon: Receipt, key: 'dash.nav.ipl' },
  { to: 'prepay', icon: BadgePercent, key: 'dash.nav.prepay', show: (p) => p.settings.features.prepay },
  { to: 'complaints', icon: Wrench, key: 'dash.nav.complaints', badge: 'complaints' },
  { to: 'cards', icon: CreditCard, key: 'dash.nav.cards' },
  { to: 'finance', icon: Wallet, key: 'dash.nav.finance' },
  { to: 'security', icon: ShieldAlert, key: 'dash.nav.security', badge: 'panics' },
  { to: 'community', icon: MessageSquare, key: 'dash.nav.community', badge: 'feedback' },
  { to: 'settings', icon: Settings, key: 'dash.nav.settings' },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const t = useT();
  const run = useRun();
  const project = useDashboardProject();
  const projects = useData((d) => d.projects);
  const badges = useDerived((d) => {
    const units = new Set(d.units.filter((u) => u.projectId === project.id).map((u) => u.id));
    return {
      complaints: d.complaints.filter((c) => units.has(c.unitId) && c.submittedAt).reduce((a, c) => a + c.findings.filter((f) => f.stage === 'submitted' || f.stage === 'workDone').length, 0),
      panics: d.panics.filter((p) => units.has(p.unitId) && !p.resolvedAt).length,
      feedback: d.feedback.filter((f) => units.has(f.unitId) && f.status !== 'replied').length,
      registrations: d.registrations.filter((r) => units.has(r.unitId) && r.status === 'submitted').length,
    };
  }, [project.id]);
  return (
    <div className="flex h-full flex-col bg-ink text-white">
      <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
        <img src={MONI_ICON} alt="" className="h-9 w-9 rounded-xl" />
        <div>
          <p className="text-sm font-extrabold leading-tight">VHome</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">{t('dash.console')}</p>
        </div>
      </div>
      <div className="px-3">
        <label className="block rounded-xl bg-white/8 px-3 py-2">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-white/45">{t('dash.project')}</span>
          <select value={project.id} onChange={(e) => { run(setDashboardProject, { projectId: e.target.value }); onNavigate?.(); }} className="mt-0.5 w-full bg-transparent text-sm font-semibold text-white outline-none [&>option]:text-ink">
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <span className={cx('mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold', project.segment === 'komersil' ? 'bg-[#D7192B]/25 text-[#FFB3BA]' : 'bg-[#0F5F57]/40 text-[#9FE1CB]')}>{t(`segment.${project.segment}`)}</span>
        </label>
      </div>
      <nav className="no-scrollbar mt-3 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {NAV.filter((n) => !n.show || n.show(project)).map((n) => (
          <NavLink key={n.to} to={`/dashboard/${n.to}`} onClick={onNavigate} className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition', isActive ? 'bg-white/12 text-white' : 'text-white/65 hover:bg-white/6 hover:text-white')}>
            <n.icon className="h-[18px] w-[18px] shrink-0" />
            <span className="flex-1">{t(n.key)}</span>
            {n.badge && badges[n.badge] > 0 && <span className={cx('rounded-full px-1.5 text-[10px] font-bold', n.badge === 'panics' ? 'bg-[#DC2626] text-white' : 'bg-white/15')}>{badges[n.badge]}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function AdminBell() {
  const t = useT();
  const [lang] = useLang();
  const nav = useNavigate();
  const run = useRun();
  const project = useDashboardProject();
  const list = useNotifications(`admin:${project.id}`);
  const unread = list.filter((n) => !n.read).length;
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => { setOpen(!open); if (!open && unread) setTimeout(() => run(markNotificationsRead, { to: `admin:${project.id}` }), 1500); }} className="relative rounded-xl border border-line bg-white p-2 text-ink/70 hover:border-ink/30" aria-label={t('account.notifications')}>
        <Bell className="h-4 w-4" />
        {unread > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-40 w-[340px] overflow-hidden rounded-2xl border border-line bg-white shadow-lift">
          <p className="border-b border-line px-4 py-2.5 text-sm font-bold">{t('dash.notifications')}</p>
          <ul className="max-h-[380px] overflow-y-auto">
            {list.slice(0, 20).map((n) => (
              <li key={n.id}>
                <button onClick={() => { setOpen(false); if (n.link) nav(n.link); }} className={cx('w-full px-4 py-2.5 text-left text-sm hover:bg-paper', !n.read && 'bg-brand-tint/40')}>
                  <span className="block leading-snug">{tText(t, n.text)}</span>
                  <span className="text-[11px] text-ink/45">{formatDateTime(n.createdAt, lang)}</span>
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="px-4 py-6 text-center text-sm text-ink/45">{t('notifications.empty')}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

export function DashboardShell() {
  const t = useT();
  const project = useDashboardProject();
  const [drawer, setDrawer] = useState(false);
  const loc = useLocation();
  return (
    <SegmentTheme theme={project.segment} className="flex min-h-screen bg-[#F4F2EE]">
      <aside className="no-print sticky top-0 hidden h-screen w-[248px] shrink-0 lg:block"><Sidebar /></aside>
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-ink/40" onClick={() => setDrawer(false)} aria-label="close" />
          <div className="relative h-full w-[260px]"><Sidebar onNavigate={() => setDrawer(false)} /></div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex flex-wrap items-center gap-2 border-b border-line bg-white/90 px-4 py-2.5 backdrop-blur md:px-6">
          <button onClick={() => setDrawer(true)} className="rounded-lg p-1.5 lg:hidden" aria-label="menu">{drawer ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          <DemoToolbar compact />
          <div className="ml-auto flex items-center gap-2">
            <LangToggle />
            <AdminBell />
            <span className="hidden items-center gap-2 rounded-xl border border-line bg-white px-2.5 py-1.5 text-xs font-semibold sm:flex"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[10px] text-white">AE</span>{t('role.admin')}</span>
          </div>
        </header>
        <main key={loc.pathname} className="min-w-0 flex-1 px-4 py-6 md:px-8">
          <Outlet />
        </main>
        <DevelopedBy className="no-print pb-5" />
      </div>
    </SegmentTheme>
  );
}
