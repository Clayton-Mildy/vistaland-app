import { BookOpen, Cctv, CreditCard, FileCheck2, FileSignature, KeyRound, Mail, MessageSquareWarning, PaintRoller, Phone, Receipt, ShoppingBag, Siren, Store, Ticket, Truck, Users, Wifi, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ResidentFeature } from '../../../domain/types';
import { useT } from '../../../i18n';
import { useAccess } from '../../../store/hooks';
import { IconTile } from '../../../ui/IconTile';
import { useComplaintWindowState } from '../hooks';

type Group = 'home' | 'security' | 'community';
export interface MenuItem { group: Group; feature: ResidentFeature; key: string; icon: LucideIcon; labelKey: string; route: string }

export const MENU: MenuItem[] = [
  { group: 'home', feature: 'handover', key: 'handover', icon: KeyRound, labelKey: 'feature.handover', route: '/app/handover' },
  { group: 'home', feature: 'rules', key: 'rules', icon: FileSignature, labelKey: 'feature.rules', route: '/app/rules' },
  { group: 'home', feature: 'moveIn', key: 'moveIn', icon: Truck, labelKey: 'feature.moveIn', route: '/app/move-in' },
  { group: 'home', feature: 'cards', key: 'cards', icon: CreditCard, labelKey: 'feature.cards', route: '/app/cards' },
  { group: 'home', feature: 'wifi', key: 'wifi', icon: Wifi, labelKey: 'feature.wifi', route: '/app/wifi' },
  { group: 'home', feature: 'bills', key: 'bills', icon: Receipt, labelKey: 'feature.bills', route: '/app/bills' },
  { group: 'home', feature: 'complaint', key: 'complaint', icon: MessageSquareWarning, labelKey: 'feature.complaint', route: '/app/complaint' },
  { group: 'home', feature: 'renovation', key: 'renovation', icon: PaintRoller, labelKey: 'feature.renovation', route: '/app/renovation' },
  { group: 'home', feature: 'legal', key: 'legal', icon: FileCheck2, labelKey: 'feature.legal', route: '/app/legal' },
  { group: 'home', feature: 'renterRegistration', key: 'renters', icon: Users, labelKey: 'feature.renterRegistration', route: '/app/renters' },
  { group: 'security', feature: 'panic', key: 'panic', icon: Siren, labelKey: 'feature.panic', route: '/app/emergency' },
  { group: 'security', feature: 'cctv', key: 'cctv', icon: Cctv, labelKey: 'feature.cctv', route: '/app/cctv' },
  { group: 'security', feature: 'panic', key: 'numbers', icon: Phone, labelKey: 'feature.numbers', route: '/app/emergency' },
  { group: 'security', feature: 'feedback', key: 'feedback', icon: Mail, labelKey: 'feature.feedback', route: '/app/feedback' },
  { group: 'security', feature: 'handbook', key: 'handbook', icon: BookOpen, labelKey: 'feature.handbook', route: '/app/handbook' },
  { group: 'community', feature: 'vouchers', key: 'vouchers', icon: Ticket, labelKey: 'feature.vouchers', route: '/app/vouchers' },
  { group: 'community', feature: 'marketplace', key: 'marketplace', icon: Store, labelKey: 'feature.marketplace', route: '/app/market' },
  { group: 'community', feature: 'businesses', key: 'businesses', icon: ShoppingBag, labelKey: 'feature.businesses', route: '/app/businesses' },
];

/** Hidden when the segment/flag/role rules it out; locked (greyed) when only occupancy or BAST is missing. */
export function useMenuState() {
  const access = useAccess();
  return (item: MenuItem) => {
    const a = access(item.feature);
    if (a.ok) return 'open' as const;
    if (item.key === 'numbers' && a.reason === 'notOccupied') return 'open' as const;
    if (a.reason === 'notOccupied' || a.reason === 'noBast') return 'locked' as const;
    if (a.reason === 'windowClosed') return 'open' as const;
    return 'hidden' as const;
  };
}

export function MenuGrid({ groups = ['home', 'security', 'community'] }: { groups?: Group[] }) {
  const t = useT();
  const nav = useNavigate();
  const state = useMenuState();
  const win = useComplaintWindowState();
  return (
    <div className="space-y-5">
      {groups.map((g) => {
        const items = MENU.filter((m) => m.group === g && state(m) !== 'hidden');
        if (!items.length) return null;
        return (
          <div key={g}>
            <h3 className="mb-3 px-1 text-[13px] font-bold text-ink/70">{t(`menu.group.${g}`)}</h3>
            <div className="grid grid-cols-5 gap-x-1 gap-y-4">
              {items.map((m) => (
                <IconTile
                  key={m.key}
                  icon={m.icon}
                  label={t(m.labelKey)}
                  locked={state(m) === 'locked'}
                  badge={m.key === 'complaint' && win.status === 'open' ? t('menu.daysBadge', { n: win.daysLeft }) : undefined}
                  onClick={() => nav(m.route)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
