import { Car, Info, Mail, MessageSquareWarning, PaintRoller, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../../domain/clock';
import { useLang, useT } from '../../../i18n';
import { useResident } from '../../../store/hooks';
import { Card } from '../../../ui/Card';
import { IconTile } from '../../../ui/IconTile';
import { LangToggle } from '../../../ui/LangToggle';
import { Section } from '../../../ui/Section';
import { Sheet } from '../../../ui/Sheet';
import { greetingKey, useComplaintWindowState } from '../hooks';
import { HomeBand } from '../ui/HomeBand';
import { HomeSearchSheet, HomeTopRow, OwnerHouseCard } from './HomeParts';
import { MENU, useMenuState } from './MenuGrid';
import { OnboardingCard } from './OnboardingCard';
import { Announcements, CardsStatus, IplStatus, WifiStatus } from './StatusCards';

export default function SubsidizedHome() {
  const t = useT();
  const [lang] = useLang();
  const nav = useNavigate();
  const ctx = useResident()!;
  const win = useComplaintWindowState();
  const state = useMenuState();
  const lockedOf = (key: string) => state(MENU.find((m) => m.key === key)!) === 'locked';
  const [info, setInfo] = useState(false);
  const [search, setSearch] = useState(false);
  return (
    <div>
      <HomeBand
        eyebrow={ctx.project.name}
        greeting={t(greetingKey(), { name: ctx.name.split(' ')[0] })}
        unitLine={t('home.unitRole', { unit: ctx.unit.code, type: ctx.type.name, role: t(`role.${ctx.role}`) })}
        right={<LangToggle dark />}
      >
        <HomeTopRow onSearch={() => setSearch(true)} />
      </HomeBand>

      <div className="relative -mt-10 space-y-3 px-4">
        <OwnerHouseCard />
        {ctx.unit.occupancy === 'occupied' ? (
          <Card className="grid grid-cols-2 divide-x divide-line p-0">
            <div className="p-3">
              <p className="text-xs text-ink/55">{t('home.occupiedSince')}</p>
              <p className="mt-1 text-sm font-semibold">{ctx.unit.moveIn ? formatDate(ctx.unit.moveIn.date, lang) : '—'}</p>
            </div>
            <div className="p-3">
              <p className="text-xs text-ink/55">{t('home.complaintWindow')}</p>
              <p className="mt-1 text-sm font-semibold text-brand-dark">{win.status === 'open' ? t('home.daysLeft', { n: win.daysLeft }) : t('home.windowClosed')}</p>
            </div>
          </Card>
        ) : (
          <OnboardingCard />
        )}
        <Card className="grid auto-cols-fr grid-flow-col divide-x divide-line p-0">
          <IplStatus />
          <WifiStatus />
          <CardsStatus />
        </Card>
      </div>

      <div className="px-4">
        <Section title={t('home.quick')}>
          <Card className="grid grid-cols-3 gap-x-2 gap-y-4 px-3 py-4">
            <IconTile icon={PaintRoller} label={t('feature.renovation')} locked={lockedOf('renovation')} onClick={() => nav('/app/renovation')} />
            <IconTile icon={MessageSquareWarning} label={t('feature.complaint')} locked={lockedOf('complaint')} badge={win.status === 'open' ? t('menu.daysBadge', { n: win.daysLeft }) : undefined} onClick={() => nav('/app/complaint')} />
            <IconTile icon={Car} label={t('home.vehicles')} onClick={() => nav('/app/cards')} />
            <IconTile icon={Mail} label={t('feature.feedback')} locked={lockedOf('feedback')} onClick={() => nav('/app/feedback')} />
            <IconTile icon={ShoppingBag} label={t('feature.businesses')} locked={lockedOf('businesses')} onClick={() => nav('/app/businesses')} />
            <IconTile icon={Info} label={t('home.estateInfo')} onClick={() => setInfo(true)} />
          </Card>
        </Section>
        <Announcements />
      </div>

      <Sheet open={info} onClose={() => setInfo(false)} title={t('home.estateInfo')}>
        <ul className="divide-y divide-line text-sm">
          <li className="py-3"><p className="font-semibold">{t('home.info.office')}</p><p className="text-ink/60">{t('home.info.officeHours')}</p></li>
          <li className="py-3"><p className="font-semibold">{t('home.info.security')}</p><p className="text-ink/60">{t('home.info.securityLine')}</p></li>
          <li className="py-3"><p className="font-semibold">{t('home.info.garbage')}</p><p className="text-ink/60">{t('home.info.garbageDays')}</p></li>
        </ul>
      </Sheet>
      <HomeSearchSheet open={search} onClose={() => setSearch(false)} />
    </div>
  );
}
