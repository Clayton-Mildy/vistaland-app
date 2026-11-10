import { Copy, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Listing } from '../../../domain/types';
import { useT } from '../../../i18n';
import { postListing } from '../../../store/actions';
import { useAccess, useData, useResident, useRun } from '../../../store/hooks';
import { HOUSE_PHOTOS } from '../../../store/photos';
import { useStore } from '../../../store/store';
import { AppBar } from '../../../ui/AppBar';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Chip } from '../../../ui/Chip';
import { cx } from '../../../ui/cx';
import { Field, Input, Select, Textarea } from '../../../ui/Field';
import { Moni } from '../../../ui/Moni';
import { Photo } from '../../../ui/Photo';
import { PhotoPicker } from '../../../ui/PhotoPicker';
import { useToast } from '../../../ui/Toast';
import { isHouse } from '../listingMeta';

export default function ListingPost() {
  const t = useT();
  const nav = useNavigate();
  const run = useRun();
  const toast = useToast();
  const ctx = useResident()!;
  const houses = useAccess()('houseListings').ok;
  const kinds: Listing['kind'][] = [...(houses ? (['rumahDisewakan', 'rumahDijual'] as const) : []), 'dijual', 'dicari', 'jasa', 'info'];
  const [kind, setKind] = useState<Listing['kind']>(kinds[0]);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState<NonNullable<Listing['priceUnit']>>('once');
  const [desc, setDesc] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [posted, setPosted] = useState<string | null>(null);
  // A house listing can be for any of the owner's units (often an empty one being rented out).
  const myUnits = useData((d) => d.units).filter((u) => ctx.unitIds.includes(u.id));
  const [listUnit, setListUnit] = useState(myUnits.find((u) => u.occupancy !== 'occupied')?.id ?? ctx.unit.id);
  const types = useData((d) => d.unitTypes);
  const typeName = (unitId: string) => types.find((x) => x.id === myUnits.find((u) => u.id === unitId)?.typeId)?.name ?? ctx.type.name;
  const targetUnit = myUnits.find((u) => u.id === (isHouse(kind) ? listUnit : ctx.unit.id)) ?? ctx.unit;
  const pick = (k: Listing['kind']) => {
    setKind(k);
    setUnit(k === 'rumahDisewakan' ? 'year' : k === 'jasa' ? 'month' : 'once');
    if (isHouse(k)) setTitle(t(k === 'rumahDisewakan' ? 'post.houseRentTitle' : 'post.houseSellTitle', { unit: targetUnit.code, type: typeName(targetUnit.id) }));
  };
  const submit = () => {
    const r = run(postListing, { unitId: isHouse(kind) ? listUnit : ctx.unit.id, kind, title: title.trim(), price: price ? Number(price.replace(/\D/g, '')) : undefined, priceUnit: price ? unit : undefined, description: desc.trim(), photoIds: photo ? [photo] : [] });
    if (!r.ok) return toast.show(t(r.error), 'error');
    const id = useStore.getState().data.listings.at(-1)!.id;
    if (isHouse(kind)) setPosted(id);
    else nav(`/app/market/${id}`, { replace: true });
  };
  if (posted) {
    const url = `${location.origin}/listing/${posted}`;
    return (
      <div>
        <AppBar title={t('post.title')} />
        <div className="flex flex-col items-center p-6 text-center">
          <Moni pose="thumbs" size={100} />
          <h2 className="mt-3 text-xl font-bold">{t('post.liveTitle')}</h2>
          <p className="mt-1 text-sm text-ink/60">{t('post.liveBody')}</p>
          <Card className="mt-4 w-full text-left">
            <p className="text-xs text-ink/50">{t('post.publicLink')}</p>
            <p className="mt-1 break-all font-mono text-sm font-semibold">{url}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" icon={<Copy className="h-4 w-4" />} onClick={() => { void navigator.clipboard?.writeText(url); toast.show(t('common.copied')); }}>{t('common.copy')}</Button>
              <a href={url} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white"><ExternalLink className="h-4 w-4" />{t('common.open')}</a>
            </div>
          </Card>
          <Button className="mt-4" variant="ghost" onClick={() => nav(`/app/market/${posted}`, { replace: true })}>{t('post.viewListing')}</Button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <AppBar title={t('post.title')} />
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap gap-2">{kinds.map((k) => <Chip key={k} active={kind === k} onClick={() => pick(k)}>{t(`market.kind.${k}`)}</Chip>)}</div>
        {isHouse(kind) && <p className="rounded-xl bg-brand-tint/50 p-3 text-xs text-brand-dark">{t('post.houseNote')}</p>}
        {isHouse(kind) && myUnits.length > 1 && (
          <Field label={t('post.whichUnit')}>
            <Select value={listUnit} onChange={(e) => { setListUnit(e.target.value); const u = myUnits.find((x) => x.id === e.target.value); if (u) setTitle(t(kind === 'rumahDisewakan' ? 'post.houseRentTitle' : 'post.houseSellTitle', { unit: u.code, type: typeName(u.id) })); }}>
              {myUnits.map((u) => <option key={u.id} value={u.id}>{u.code} · {t(`occupancy.${u.occupancy}`)}</option>)}
            </Select>
          </Field>
        )}
        <Card className="space-y-3">
          <Field label={t('post.fTitle')}><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('post.titlePh')} /></Field>
          {kind !== 'info' && (
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Field label={t('post.price')} optional={kind === 'dicari' ? t('common.optional') : undefined}><Input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))} placeholder="Rp" /></Field>
              <Field label="&nbsp;"><Select value={unit} onChange={(e) => setUnit(e.target.value as NonNullable<Listing['priceUnit']>)}><option value="once">{t('post.once')}</option><option value="month">{t('post.month')}</option><option value="year">{t('post.year')}</option></Select></Field>
            </div>
          )}
          <Field label={t('post.desc')}><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-ink/70">{t('post.photo')}</p>
            {photo ? <Photo id={photo} className="h-36 rounded-xl" /> : isHouse(kind) ? (
              <div className="grid grid-cols-5 gap-1.5">
                {HOUSE_PHOTOS.map((src, i) => <button key={src} onClick={() => setPhoto(`house:${i + 1}`)} className={cx('overflow-hidden rounded-lg ring-2', photo === `house:${i + 1}` ? 'ring-brand' : 'ring-transparent')}><img src={src} alt="" className="h-12 w-full object-cover" /></button>)}
              </div>
            ) : <PhotoPicker onPicked={(p) => setPhoto(p.id)} />}
          </div>
        </Card>
        <Button block size="lg" disabled={!title.trim()} onClick={submit}>{t('post.submit')}</Button>
      </div>
    </div>
  );
}
