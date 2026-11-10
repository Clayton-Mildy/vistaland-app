import { diffDays } from '../../domain/clock';
import { formatRp } from '../../domain/money';
import type { Listing } from '../../domain/types';
import type { TFn } from '../../i18n';
import type { PillTone } from '../../ui/StatusPill';
import type { Tone } from '../../ui/theme';
import { HandHelping, Home, Info, Search, Tag, type LucideIcon } from 'lucide-react';

export const KIND_META: Record<Listing['kind'], { pill: PillTone; tone: Tone; icon: LucideIcon }> = {
  rumahDisewakan: { pill: 'brand', tone: 'red', icon: Home },
  rumahDijual: { pill: 'brand', tone: 'red', icon: Home },
  dijual: { pill: 'success', tone: 'green', icon: Tag },
  dicari: { pill: 'info', tone: 'blue', icon: Search },
  jasa: { pill: 'gold', tone: 'yellow', icon: HandHelping },
  info: { pill: 'neutral', tone: 'grey', icon: Info },
};
export const isHouse = (k: Listing['kind']) => k === 'rumahDisewakan' || k === 'rumahDijual';
export const priceText = (l: Pick<Listing, 'price' | 'priceUnit'>, t: TFn) =>
  l.price === undefined ? '' : `${formatRp(l.price)}${l.priceUnit === 'year' ? t('market.perYear') : l.priceUnit === 'month' ? t('common.perMonth') : ''}`;
export const ago = (iso: string, today: string, t: TFn) => {
  const n = diffDays(iso.slice(0, 10), today);
  return n <= 0 ? t('market.today') : n === 1 ? t('market.yesterday') : t('market.daysAgo', { n });
};
