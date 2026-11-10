import { ArrowRight, Building2, HardHat, LayoutDashboard, MonitorSmartphone, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RESIDENT_PERSONAS, STAFF_PERSONAS } from '../../data/personas';
import { useT } from '../../i18n';
import { Card } from '../../ui/Card';
import { DevelopedBy } from '../../ui/Footer';
import { LangToggle } from '../../ui/LangToggle';
import { MONI_ICON, Moni } from '../../ui/Moni';
import { SegmentTheme } from '../../ui/SegmentTheme';
import { StatusPill } from '../../ui/StatusPill';
import { DemoToolbar } from './DemoToolbar';

export function Launcher() {
  const t = useT();
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,#FFFFFF,#F1ECE3_55%,#E9E2D6)]">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={MONI_ICON} alt="" className="h-9 w-9 rounded-xl" />
            <span className="text-lg font-extrabold tracking-tight">VHome</span>
          </div>
          <LangToggle />
        </header>
        <section className="mt-8 grid items-end gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B01222]">{t('launcher.kicker')}</p>
            <h1 className="mt-2 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight md:text-[40px]">{t('launcher.title')}</h1>
            <p className="mt-3 max-w-xl text-[15px] text-ink/60">{t('launcher.body')}</p>
          </div>
          <Moni pose="wave" size={150} className="hidden md:block" />
        </section>
        <Card className="mt-6 flex flex-wrap items-center justify-between gap-3 py-3">
          <DemoToolbar />
          <Link to="/demo" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#B01222]">
            <MonitorSmartphone className="h-4 w-4" />
            {t('launcher.sideBySide')}
          </Link>
        </Card>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <Card className="lg:row-span-2">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FDE8EA] text-[#B01222]"><Smartphone className="h-5 w-5" /></span>
              <h2 className="text-lg font-bold">{t('launcher.resident')}</h2>
            </div>
            <p className="mt-1.5 text-sm text-ink/55">{t('launcher.residentBody')}</p>
            <div className="mt-4 space-y-2.5">
              {RESIDENT_PERSONAS.map((p) => (
                <SegmentTheme key={p.key} theme={p.projectId === 'vh' ? 'komersil' : 'subsidi'}>
                  <Link to={`/app/login?persona=${p.key}`} className="group flex items-start gap-3 rounded-2xl border border-line bg-white p-3 transition hover:border-brand/50 hover:shadow-card">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-sm font-bold text-brand-dark">{p.name[0]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold">{p.name}</span>
                        <StatusPill tone="brand">{t(p.projectId === 'vh' ? 'segment.komersil' : 'segment.subsidi')}</StatusPill>
                        {p.role === 'renter' && <StatusPill tone="gold">{t('role.renter')}</StatusPill>}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink/55">{t(p.scenarioKey)}</span>
                      <span className="mt-1 block font-mono text-[11px] text-ink/45">{p.unit} · {p.phone} · {p.ktp}</span>
                    </span>
                    <ArrowRight className="mt-3 h-4 w-4 shrink-0 text-ink/25 transition group-hover:text-brand" />
                  </Link>
                </SegmentTheme>
              ))}
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFEBDD] text-[#C2410C]"><HardHat className="h-5 w-5" /></span>
              <h2 className="text-lg font-bold">{t('launcher.staff')}</h2>
            </div>
            <p className="mt-1.5 text-sm text-ink/55">{t('launcher.staffBody')}</p>
            <div className="mt-4 space-y-2">
              {STAFF_PERSONAS.map((s) => (
                <Link key={s.id} to={`/staff?staff=${s.id}`} className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-3 transition hover:border-ink/30">
                  <span className="min-w-0 flex-1">
                    <span className="font-bold">{s.name}</span> <span className="text-xs text-ink/45">· {t(s.roleKey)}</span>
                    <span className="block text-xs text-ink/55">{t(s.scenarioKey)}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-ink/25 group-hover:text-ink" />
                </Link>
              ))}
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E9EBF0] text-ink"><LayoutDashboard className="h-5 w-5" /></span>
              <h2 className="text-lg font-bold">{t('launcher.dashboard')}</h2>
            </div>
            <p className="mt-1.5 text-sm text-ink/55">{t('launcher.dashboardBody')}</p>
            <Link to="/dashboard" className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-white hover:bg-black">
              <Building2 className="h-4 w-4" />
              {t('launcher.openDashboard')}
            </Link>
            <p className="mt-4 rounded-xl bg-paper p-3 text-xs text-ink/55">{t('launcher.tip')}</p>
          </Card>
        </div>
        <DevelopedBy className="mt-10" />
      </div>
    </div>
  );
}
