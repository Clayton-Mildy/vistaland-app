import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Listing } from '../../../domain/types';
import { useT } from '../../../i18n';
import { useAccess, useData, useResident, useToday } from '../../../store/hooks';
import { AppBar } from '../../../ui/AppBar';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { EmptyState } from '../../../ui/EmptyState';
import { StatusPill } from '../../../ui/StatusPill';
import { Tabs } from '../../../ui/Tabs';
import { TONES } from '../../../ui/theme';
import { ago, isHouse, KIND_META, priceText } from '../listingMeta';

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
      <AppBar back={false} title={t('market.title')} subtitle={t('market.subtitle', { project: ctx.project.name })} right={<Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => nav('/app/market/new')}>{t('market.post')}</Button>} />
      <div className="bg-white px-4"><Tabs value={tab} onChange={setTab} items={items} /></div>
      <div className="space-y-2.5 p-4">
        {list.length === 0 && <EmptyState title={t('market.empty')} />}
        {list.map((l) => (
          <Card key={l.id} interactive className="flex gap-3" onClick={() => nav(`/app/market/${l.id}`)}>
            <span className={cx('flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-extrabold', TONES[KIND_META[l.kind].tone])}>{l.title[0]}</span>
            <div className="min-w-0 flex-1">
              <StatusPill tone={KIND_META[l.kind].pill}>{t(`market.kind.${l.kind}`)}</StatusPill>
              <p className="mt-0.5 line-clamp-2 text-sm font-bold leading-snug">{l.title}</p>
              {l.price !== undefined && <p className="text-sm font-extrabold text-brand">{priceText(l, t)}</p>}
              <p className="text-[11px] text-ink/45">{t('market.meta', { unit: units.find((u) => u.id === l.unitId)?.code ?? '', ago: ago(l.createdAt, today, t), n: l.replies })}</p>
            </div>
          </Card>
        ))}
        <p className="px-4 pt-2 text-center text-xs text-ink/45">{t('market.footer')}</p>
      </div>
    </div>
  );
}
