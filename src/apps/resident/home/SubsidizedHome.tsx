import { Bell, Car, Info, Mail, MessageSquareWarning, PaintRoller, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../../domain/clock';
import { useLang, useT } from '../../../i18n';
import { useNotifications, useResident } from '../../../store/hooks';
import { Card } from '../../../ui/Card';
import { IconTile } from '../../../ui/IconTile';
import { LangToggle } from '../../../ui/LangToggle';
import { Sheet } from '../../../ui/Sheet';
import { useComplaintWindowState } from '../hooks';
import { useMenuState, MENU } from './MenuGrid';
import { OnboardingCard } from './OnboardingCard';
import { Announcements, CardsStatus, IplStatus, WifiStatus } from './StatusCards';

export default function SubsidizedHome() {
  const t = useT();
  const [lang] = useLang();
  const nav = useNavigate();
  const ctx = useResident()!;
  const unread = useNotifications(ctx.recipientKey).filter((n) => !n.read).length;
  const win = useComplaintWindowState();
  const state = useMenuState();
  const lockedOf = (key: string) => state(MENU.find((m) => m.key === key)!) === 'locked';
  const [info, setInfo] = useState(false);
  return (
    <div className="pb-4">
      <div className="bg-gradient-to-b from-brand to-brand-dark px-5 pb-16 pt-5 text-white md:pt-10">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">{ctx.project.name}</span>
          <div className="flex items-center gap-2">
            <LangToggle dark />
            <button onClick={() => nav('/app/notifications')} className="relative rounded-full p-1.5 hover:bg-white/10" aria-label={t('account.notifications')}>
              <Bell className="h-5 w-5" />
              {unread > 0 && <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-ink">{unread}</span>}
            </button>
          </div>
        </div>
        <h1 className="mt-2 text-2xl font-extrabold">{t('home.hello', { name: ctx.name.split(' ')[0] })}</h1>
        <p className="text-sm text-white/80">{t('home.unitType', { unit: ctx.unit.code, type: ctx.type.name })}</p>
      </div>
      <div className="-mt-11 space-y-3 px-4">
        {ctx.unit.occupancy === 'occupied' ? (
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-xs text-ink/50">{t('home.occupiedSince')}</p>
              <p className="text-[15px] font-bold">{ctx.unit.moveIn ? formatDate(ctx.unit.moveIn.date, lang) : '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-ink/50">{t('home.complaintWindow')}</p>
              <p className="text-[15px] font-bold text-brand">{win.status === 'open' ? t('home.daysLeft', { n: win.daysLeft }) : t('home.windowClosed')}</p>
            </div>
          </Card>
        ) : (
          <OnboardingCard />
        )}
        <div className="grid grid-cols-3 gap-2">
          <IplStatus />
          <WifiStatus />
          <CardsStatus />
        </div>
        <Card>
          <h3 className="mb-3 px-1 text-[13px] font-bold text-ink/70">{t('home.quick')}</h3>
          <div className="grid grid-cols-3 gap-y-4">
            <IconTile icon={PaintRoller} tone="orange" label={t('feature.renovation')} locked={lockedOf('renovation')} onClick={() => nav('/app/renovation')} />
            <IconTile icon={MessageSquareWarning} tone="red" label={t('feature.complaint')} locked={lockedOf('complaint')} badge={win.status === 'open' ? t('menu.daysBadge', { n: win.daysLeft }) : undefined} onClick={() => nav('/app/complaint')} />
            <IconTile icon={Car} tone="violet" label={t('home.vehicles')} onClick={() => nav('/app/cards')} />
            <IconTile icon={Mail} tone="violet" label={t('feature.feedback')} locked={lockedOf('feedback')} onClick={() => nav('/app/feedback')} />
            <IconTile icon={ShoppingBag} tone="aqua" label={t('feature.businesses')} locked={lockedOf('businesses')} onClick={() => nav('/app/businesses')} />
            <IconTile icon={Info} tone="blue" label={t('home.estateInfo')} onClick={() => setInfo(true)} />
          </div>
        </Card>
        <Announcements />
      </div>
      <Sheet open={info} onClose={() => setInfo(false)} title={t('home.estateInfo')}>
        <ul className="space-y-3 text-sm">
          <li className="rounded-xl bg-paper p-3"><b>{t('home.info.office')}</b><br />{t('home.info.officeHours')}</li>
          <li className="rounded-xl bg-paper p-3"><b>{t('home.info.security')}</b><br />0812-1000-2001 · 24 jam</li>
          <li className="rounded-xl bg-paper p-3"><b>{t('home.info.garbage')}</b><br />{t('home.info.garbageDays')}</li>
        </ul>
      </Sheet>
    </div>
  );
}
