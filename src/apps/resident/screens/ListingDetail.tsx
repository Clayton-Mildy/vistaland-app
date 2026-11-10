import { Flag, MessageCircle, Users } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useT } from '../../../i18n';
import { reportListing } from '../../../store/actions';
import { useData, useResident, useRun, useToday } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { EmptyState } from '../../../ui/EmptyState';
import { Photo } from '../../../ui/Photo';
import { StatusPill } from '../../../ui/StatusPill';
import { useToast } from '../../../ui/Toast';
import { ago, isHouse, KIND_META, priceText } from '../listingMeta';
import { listingThumb } from '../ui/media';
import { ScreenBody } from '../ui/ScreenBody';
import { ScreenHeader } from '../ui/ScreenHeader';

export default function ListingDetail() {
  const t = useT();
  const run = useRun();
  const toast = useToast();
  const today = useToday();
  const ctx = useResident()!;
  const { id } = useParams();
  const l = useData((d) => d.listings.find((x) => x.id === id));
  const unit = useData((d) => d.units.find((u) => u.id === l?.unitId));
  const owner = useData((d) => d.vles.customers.find((c) => c.customer_id === unit?.ownerCustomerId));
  const leads = useData((d) => d.leads).filter((x) => x.source.kind === 'listing' && x.source.listingId === id);
  if (!l) return <div><ScreenHeader title={t('market.title')} /><ScreenBody><Card><EmptyState title={t('error.notFound')} /></Card></ScreenBody></div>;
  const mine = l.unitId === ctx.unit.id;
  const thumb = listingThumb(l, unit);
  return (
    <div>
      <ScreenHeader title={t(`market.kind.${l.kind}`)} eyebrow={ctx.project.name} />
      <ScreenBody>
        <Card className="overflow-hidden p-0">
          {'photoId' in thumb ? <Photo id={thumb.photoId} className="h-56 w-full" /> : (
            <div className="flex h-40 items-center justify-center bg-paper text-brand-dark"><thumb.icon className="h-12 w-12" strokeWidth={1.25} /></div>
          )}
          <div className="p-4">
            <StatusPill tone={KIND_META[l.kind].pill}>{t(`market.kind.${l.kind}`)}</StatusPill>
            <h2 className="mt-1.5 text-xl font-semibold leading-snug">{l.title}</h2>
            {l.price !== undefined && <p className="mt-0.5 text-xl font-semibold tabular text-brand-dark">{priceText(l, t)}</p>}
            <p className="mt-1 text-xs text-ink/45">{t('market.meta', { unit: unit?.code ?? '', ago: ago(l.createdAt, today, t), n: l.replies })}</p>
            {l.description && <p className="mt-3 whitespace-pre-line text-sm text-ink/75">{l.description}</p>}
          </div>
        </Card>
        {mine && isHouse(l.kind) && (
          <Card>
            <p className="flex items-center gap-2 text-base font-semibold"><Users className="h-4 w-4 text-brand-dark" strokeWidth={1.75} />{t('detail.leads', { n: leads.length })}</p>
            <p className="mt-1 break-all text-xs text-ink/55">{`${location.origin}/listing/${l.id}`}</p>
            {leads.slice(-3).reverse().map((x) => <p key={x.id} className="mt-2 rounded-xl bg-paper px-3 py-2 text-xs"><span className="font-semibold">{x.name}</span> · {x.domicile} · {t(`lead.plan.${x.plan}`)}</p>)}
          </Card>
        )}
        {!mine && owner && <a href={`https://wa.me/${owner.no_hp.replace(/\D/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(l.title)}`} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#1FA855] text-sm font-medium text-white hover:bg-[#1A9049]"><MessageCircle className="h-4 w-4" />{t('detail.contact')}</a>}
        {!mine && (l.reported ? <p className="text-center text-xs text-ink/45">{t('detail.reported')}</p> : <Button block variant="ghost" icon={<Flag className="h-4 w-4" />} onClick={() => { run(reportListing, { id: l.id }); toast.show(t('detail.reportedToast')); }}>{t('detail.report')}</Button>)}
      </ScreenBody>
    </div>
  );
}
