import { Bell, ChevronRight, Lock, Search, Siren } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../../domain/clock';
import { formatRp } from '../../../domain/money';
import { nextOnboardingStep, onboardingSteps } from '../../../domain/onboarding';
import { useLang, useT } from '../../../i18n';
import { useData, useNotifications, useResident } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Sheet } from '../../../ui/Sheet';
import { STEP_ROUTE } from '../auth/Welcome';
import { useIplSummary, useUnitBills } from '../hooks';
import { HouseCard } from '../ui/HouseCard';
import { houseFor } from '../ui/media';
import { MENU, useMenuState } from './MenuGrid';

/** Search pill, notifications and SOS: the top row of every home band. */
export function HomeTopRow({ onSearch }: { onSearch: () => void }) {
  const t = useT();
  const nav = useNavigate();
  const ctx = useResident()!;
  const unread = useNotifications(ctx.recipientKey).filter((n) => !n.read).length;
  return (
    <div className="flex items-center gap-2">
      <button onClick={onSearch} className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-white/[0.14] px-3.5 text-left text-sm text-white/75 transition hover:bg-white/20">
        <Search className="h-4 w-4 shrink-0" /> <span className="truncate">{t('home.search')}</span>
      </button>
      <button onClick={() => nav('/app/notifications')} className="relative rounded-full p-2 text-white/90 hover:bg-white/10" aria-label={t('account.notifications')}>
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 text-xs font-semibold leading-none text-ink">{unread}</span>}
      </button>
      <button onClick={() => nav('/app/emergency')} className="flex items-center gap-1 rounded-full border border-white/60 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/10">
        <Siren className="h-3.5 w-3.5" /> SOS
      </button>
    </div>
  );
}

/** The menu search sheet opened from the top row. Rendered outside the band so it keeps the page colors. */
export function HomeSearchSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const nav = useNavigate();
  const state = useMenuState();
  const [q, setQ] = useState('');
  const items = MENU.filter((m) => state(m) !== 'hidden' && t(m.labelKey).toLowerCase().includes(q.toLowerCase()));
  return (
    <Sheet open={open} onClose={onClose} title={t('home.searchTitle')}>
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('home.search')} className="h-11 w-full rounded-xl border border-line px-3.5 text-sm outline-none focus:border-brand" />
      <ul className="mt-2 divide-y divide-line">
        {items.map((m) => (
          <li key={m.key}>
            <button onClick={() => { onClose(); nav(m.route); }} className="flex w-full items-center gap-3 py-3 text-left text-sm font-medium">
              <m.icon className="h-5 w-5 text-brand-dark" strokeWidth={1.75} />
              <span className="flex-1">{t(m.labelKey)}</span>
              {state(m) === 'locked' && <Lock className="h-4 w-4 text-ink/30" />}
              <ChevronRight className="h-4 w-4 text-ink/25" />
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

/** The house card showing the unit's IPL state: overdue or due with Bayar, else free, paid or not started. */
export function IplHouseCard({ occupancy }: { occupancy: ReactNode }) {
  const t = useT();
  const [lang] = useLang();
  const nav = useNavigate();
  const ctx = useResident()!;
  const ipl = useIplSummary();
  // The amount Bayar charges on the bills screen: every overdue and due month.
  const payable = useUnitBills('ipl').filter((b) => b.status === 'overdue' || b.status === 'due').reduce((a, b) => a + b.amount, 0);
  const photo = houseFor(ctx.unit);
  const bills = () => nav('/app/bills');
  const pay = <Button size="sm" onClick={bills}>{t('home.pay')}</Button>;
  const view = <Button size="sm" variant="secondary" onClick={bills}>{t('common.view')}</Button>;
  const card = { photoId: photo, occupancy, label: t('home.iplLabel'), onClick: bills };
  if (ipl.kind === 'overdue') return <HouseCard {...card} amount={formatRp(payable)} note={t('status.ipl.overdue', { n: ipl.n })} noteTone="danger" action={pay} />;
  if (ipl.kind === 'due') return <HouseCard {...card} amount={formatRp(payable)} note={t('status.ipl.due')} action={pay} />;
  if (ipl.kind === 'free') return <HouseCard {...card} amount={t('status.ipl.free')} note={t('status.ipl.until', { month: formatDate(ipl.lastFree ?? ipl.firstBilled, lang, 'month') })} noteTone="success" action={view} />;
  if (ipl.kind === 'paid') return <HouseCard {...card} amount={t('status.paid')} note={ipl.paidThrough ? t('status.ipl.through', { month: formatDate(ipl.paidThrough, lang, 'month') }) : undefined} noteTone="success" action={view} />;
  return <HouseCard {...card} amount={t('status.ipl.notStarted')} action={view} />;
}

/** An owner's lead card: the next onboarding step while onboarding, else the IPL bill. */
export function OwnerHouseCard() {
  const t = useT();
  const nav = useNavigate();
  const ctx = useResident()!;
  const permit = useData((d) => d.moveIns.find((m) => m.unitId === ctx.unit.id && m.who === 'owner' && m.status !== 'cancelled'));
  const next = nextOnboardingStep(onboardingSteps(ctx.unit, { moveIn: permit }));
  const occupancy = ctx.activeRenter ? t('home.rented') : t(`occupancy.${ctx.unit.occupancy}`);
  if (next && next !== 'app' && next !== 'occupied') {
    return (
      <HouseCard photoId={houseFor(ctx.unit)} occupancy={occupancy} label={t('home.prepare')} amount={t(`onboarding.${next}`)} note={t(`onboarding.${next}.hint`)}
        action={<Button size="sm" onClick={() => nav(STEP_ROUTE[next])}>{t('home.doIt')}</Button>} />
    );
  }
  return <IplHouseCard occupancy={occupancy} />;
}
