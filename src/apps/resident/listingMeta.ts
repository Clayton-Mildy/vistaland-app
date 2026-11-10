import { diffDays } from '../../domain/clock';
import { formatRp } from '../../domain/money';
import type { Listing } from '../../domain/types';
import type { TFn } from '../../i18n';
import type { PillTone } from '../../ui/StatusPill';
import type { Tone } from '../../ui/theme';

export const KIND_META: Record<Listing['kind'], { pill: PillTone; tone: Tone }> = {
  rumahDisewakan: { pill: 'brand', tone: 'red' },
  rumahDijual: { pill: 'brand', tone: 'red' },
  dijual: { pill: 'success', tone: 'green' },
  dicari: { pill: 'info', tone: 'blue' },
  jasa: { pill: 'gold', tone: 'yellow' },
  info: { pill: 'neutral', tone: 'grey' },
};
export const isHouse = (k: Listing['kind']) => k === 'rumahDisewakan' || k === 'rumahDijual';
export const priceText = (l: Pick<Listing, 'price' | 'priceUnit'>, t: TFn) =>
  l.price === undefined ? '' : `${formatRp(l.price)}${l.priceUnit === 'year' ? t('market.perYear') : l.priceUnit === 'month' ? t('common.perMonth') : ''}`;
export const ago = (iso: string, today: string, t: TFn) => {
  const n = diffDays(iso.slice(0, 10), today);
  return n <= 0 ? t('market.today') : n === 1 ? t('market.yesterday') : t('market.daysAgo', { n });
};
