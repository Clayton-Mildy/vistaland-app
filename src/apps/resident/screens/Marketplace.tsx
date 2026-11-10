import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Listing } from '../../../domain/types';
import { useT } from '../../../i18n';
import { useAccess, useData, useResident, useToday } from '../../../store/hooks';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { EmptyState } from '../../../ui/EmptyState';
import { Photo } from '../../../ui/Photo';
import { StatusPill } from '../../../ui/StatusPill';
import { ago, isHouse, KIND_META, priceText } from '../listingMeta';
import { listingThumb } from '../ui/media';
import { ScreenBody } from '../ui/ScreenBody';
import { ScreenHeader } from '../ui/ScreenHeader';

type Tab = 'all' | 'house' | 'dijual' | 'dicari' | 'jasa';

export default function Marketplace() {
  const t = useT();
  const nav = useNavigate();
  const today = useToday();
  const ctx = useResident()!;
  const houses = useAccess()('houseListings').ok;
  const units = useData((d) => d.units);
  const listings = useData((d) => d.listings).filter((l) => l.projectId === ctx.project.id).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [tab, setTab] = useState<Tab>('all');
  const match = (l: Listing) => tab === 'all' || (tab === 'house' ? isHouse(l.kind) : l.kind === tab);
  const items: { value: Tab; label: string }[] = [{ value: 'all', label: t('common.all') }, ...(houses ? [{ value: 'house' as Tab, label: t('market.tab.house') }] : []), { value: 'dijual', label: t('market.tab.dijual') }, { value: 'dicari', label: t('market.tab.dicari') }, { value: 'jasa', label: t('market.tab.jasa') }];
  const list = listings.filter(match);
  return (
    <div>
      <ScreenHeader
        back={false}
        title={t('market.title')}
        sub={t('market.subtitle', { project: ctx.project.name })}
        right={<button onClick={() => nav('/app/market/new')} className="flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-white/90"><Plus className="h-3.5 w-3.5" />{t('market.post')}</button>}
      >
        <div className="no-scrollbar -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4" role="tablist">
          {items.map((it) => (
            <button key={it.value} role="tab" aria-selected={tab === it.value} onClick={() => setTab(it.value)} className={cx('shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition', tab === it.value ? 'bg-white text-ink' : 'bg-white/[0.14] text-white/85 hover:bg-white/20')}>{it.label}</button>
          ))}
        </div>
      </ScreenHeader>
      <ScreenBody>
        {list.length === 0 && <Card><EmptyState title={t('market.empty')} /></Card>}
        {list.map((l) => {
          const unit = units.find((u) => u.id === l.unitId);
          const thumb = listingThumb(l, unit);
          return (
            <Card key={l.id} interactive className="flex gap-3 p-3" onClick={() => nav(`/app/market/${l.id}`)}>
              {'photoId' in thumb ? <Photo id={thumb.photoId} className="h-20 w-20 shrink-0 rounded-xl" /> : (
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-paper text-brand-dark"><thumb.icon className="h-7 w-7" strokeWidth={1.5} /></span>
              )}
              <div className="min-w-0 flex-1 py-0.5">
                <StatusPill tone={KIND_META[l.kind].pill}>{t(`market.kind.${l.kind}`)}</StatusPill>
                <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug">{l.title}</p>
                {l.price !== undefined && <p className="text-sm font-semibold tabular text-brand-dark">{priceText(l, t)}</p>}
                <p className="mt-0.5 text-xs text-ink/45">{t('market.meta', { unit: unit?.code ?? '', ago: ago(l.createdAt, today, t), n: l.replies })}</p>
              </div>
            </Card>
          );
        })}
        <p className="px-4 pt-2 text-center text-xs text-ink/45">{t('market.footer')}</p>
      </ScreenBody>
    </div>
  );
}
