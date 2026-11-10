import { prepayQuote } from '../../domain/ipl';
import { formatRp } from '../../domain/money';
import type { PrepayPackage } from '../../domain/types';
import { useT } from '../../i18n';
import { cx } from '../../ui/cx';
import { StatusPill } from '../../ui/StatusPill';

export interface PrepayOption { p: PrepayPackage; q: ReturnType<typeof prepayQuote> }

/** Quotes every package at the given monthly rate and picks the one that saves the most. */
export function prepayOptions(packages: PrepayPackage[], rate: number) {
  const quotes: PrepayOption[] = packages.map((p) => ({ p, q: prepayQuote(p, rate) }));
  const best = quotes.reduce<PrepayOption | undefined>((a, b) => (b.q.discount > (a?.q.discount ?? 0) ? b : a), quotes[0]);
  return { quotes, best };
}

/** The pay-ahead package cards residents see. The estate dashboard previews the same cards. */
export function PrepayGrid({ packages, rate, selectedId, onSelect }: { packages: PrepayPackage[]; rate: number; selectedId?: string | null; onSelect?: (id: string) => void }) {
  const t = useT();
  const { quotes, best } = prepayOptions(packages, rate);
  return (
    <div className="grid grid-cols-2 gap-2">
      {quotes.map(({ p, q }) => (
        <button key={p.id} type="button" onClick={() => onSelect?.(p.id)} className={cx('relative rounded-2xl border p-3 text-left transition', selectedId === p.id ? 'border-brand bg-white ring-2 ring-brand/20' : 'border-line bg-white hover:border-ink/25')}>
          {best && best.p.id === p.id && q.discount > 0 && <StatusPill tone="gold" className="mb-1">{t('bills.best')}</StatusPill>}
          {p.discountType === 'percent' && p.value > 0 && best?.p.id !== p.id && <StatusPill tone="success" className="mb-1">{t('home.discountPct', { n: p.value })}</StatusPill>}
          {p.discountType === 'freeMonths' && p.value > 0 && best?.p.id !== p.id && <StatusPill tone="success" className="mb-1">{t('home.freeMonths', { n: p.value })}</StatusPill>}
          <span className="block text-sm font-medium text-ink/70">{t('bills.nMonths', { n: p.months })}</span>
          <span className="mt-0.5 block text-base font-semibold tabular text-ink">{formatRp(q.net)}</span>
          <span className="block text-xs tabular text-ink/50">≈ {formatRp(Math.round(q.net / p.months))}{t('common.perMonth')}</span>
          {q.discount > 0 && <span className="mt-1 block text-xs font-medium text-[#17703D]">{t('bills.save', { amount: formatRp(q.discount) })}</span>}
        </button>
      ))}
    </div>
  );
}
