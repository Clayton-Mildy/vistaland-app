import { CreditCard, Minus, Plus, Sticker } from 'lucide-react';
import { useState } from 'react';
import { formatDate } from '../../../domain/clock';
import { formatRp } from '../../../domain/money';
import type { Vehicle } from '../../../domain/types';
import { useLang, useT } from '../../../i18n';
import { orderCards, payCardOrder } from '../../../store/actions';
import { useData, useResident, useRun } from '../../../store/hooks';
import { useStore } from '../../../store/store';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Field, Input } from '../../../ui/Field';
import { Segmented } from '../../../ui/Segmented';
import { StatusPill, type PillTone } from '../../../ui/StatusPill';
import { useToast } from '../../../ui/Toast';
import { ScreenBody } from '../ui/ScreenBody';
import { ScreenHeader } from '../ui/ScreenHeader';
import { PaySheet } from './PaySheet';

const STATUS_TONE: Record<string, PillTone> = { awaitingPayment: 'warning', toMake: 'info', ready: 'success', pickedUp: 'neutral' };

function Stepper({ value, onChange, max }: { value: number; onChange: (n: number) => void; max: number }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onChange(Math.max(0, value - 1))} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white hover:border-ink/25"><Minus className="h-4 w-4" /></button>
      <span className="w-6 text-center font-semibold tabular">{value}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white hover:border-ink/25"><Plus className="h-4 w-4" /></button>
    </div>
  );
}

export default function Cards() {
  const t = useT();
  const [lang] = useLang();
  const run = useRun();
  const toast = useToast();
  const ctx = useResident()!;
  const c = ctx.settings.cards;
  const orders = useData((d) => d.cardOrders).filter((o) => o.unitId === ctx.unit.id);
  const freeUsed = orders.some((o) => o.freeCards + o.freeStickers > 0);
  const [type, setType] = useState<Vehicle['type']>('mobil');
  const [plate, setPlate] = useState('');
  const [stickers, setStickers] = useState(0);
  const [cards, setCards] = useState(0);
  const [payId, setPayId] = useState<string | null>(null);
  const total = stickers * c.extraStickerPrice + cards * c.extraCardPrice;
  const payOrder = orders.find((o) => o.id === payId);

  const claimFree = () => {
    if (!plate.trim()) return toast.show(t('cards.plateRequired'), 'error');
    run(orderCards, { unitId: ctx.unit.id, extraCards: 0, extraStickers: 0, vehicles: [{ type, plate: plate.trim() }] });
    setPlate('');
    toast.show(t('cards.claimed'));
  };
  const orderPaid = () => {
    run(orderCards, { unitId: ctx.unit.id, extraCards: cards, extraStickers: stickers, vehicles: plate.trim() ? [{ type, plate: plate.trim() }] : [] });
    setStickers(0);
    setCards(0);
    setPlate('');
    const created = useStore.getState().data.cardOrders.at(-1);
    if (created?.status === 'awaitingPayment') setPayId(created.id);
  };

  return (
    <div>
      <ScreenHeader title={t('cards.title')} eyebrow={`Unit ${ctx.unit.code}`} />
      <ScreenBody>
        {!freeUsed && (
          <Card>
            <div className="flex items-center justify-between gap-3">
              <span className="text-base font-semibold">{t('cards.freeTitle')}</span>
              <StatusPill tone="gold">{t('status.free')}</StatusPill>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2.5 rounded-xl bg-paper p-2.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand-dark"><CreditCard className="h-[18px] w-[18px]" strokeWidth={1.75} /></span><span className="text-xs leading-snug"><span className="block font-semibold">{t('cards.nCards', { n: c.freeCards })}</span>{t('cards.cardsUse')}</span></div>
              <div className="flex items-center gap-2.5 rounded-xl bg-paper p-2.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand-dark"><Sticker className="h-[18px] w-[18px]" strokeWidth={1.75} /></span><span className="text-xs leading-snug"><span className="block font-semibold">{t('cards.nStickers', { n: c.freeStickers })}</span>{t('cards.stickersUse')}</span></div>
            </div>
            <p className="mt-4 text-xs font-medium text-ink/60">{t('cards.vehicleFor')}</p>
            <Segmented className="mt-1.5 w-full" value={type} onChange={setType} items={[{ value: 'mobil', label: t('cards.car') }, { value: 'motor', label: t('cards.motor') }]} />
            <Field className="mt-3" label={t('movein.plate')}><Input placeholder="B 1234 XYZ" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} /></Field>
            <Button className="mt-3" block size="lg" onClick={claimFree}>{t('cards.claimFree')}</Button>
            <p className="mt-2 text-xs text-ink/45">{t('cards.freeNote')}</p>
          </Card>
        )}

        <Card>
          <p className="text-base font-semibold">{t('cards.moreTitle')}</p>
          <p className="text-xs text-ink/50">{t('cards.moreBody')}</p>
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <span><span className="block text-sm font-medium">{t('cards.extraSticker')}</span><span className="text-xs text-ink/50">{formatRp(c.extraStickerPrice)}/{t('cards.perSticker')}</span></span>
              <Stepper value={stickers} onChange={setStickers} max={5} />
            </div>
            <div className="flex items-center justify-between">
              <span><span className="block text-sm font-medium">{t('cards.extraCard')}</span><span className="text-xs text-ink/50">{t('cards.maxN', { n: c.maxExtraCards })} · {formatRp(c.extraCardPrice)}/{t('cards.perCard')}</span></span>
              <Stepper value={cards} onChange={setCards} max={c.maxExtraCards} />
            </div>
            {freeUsed && stickers > 0 && (
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <Segmented size="sm" value={type} onChange={setType} items={[{ value: 'mobil', label: t('cards.car') }, { value: 'motor', label: t('cards.motor') }]} />
                <Input placeholder={t('movein.plate')} value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} className="h-9" />
              </div>
            )}
            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="text-sm text-ink/60">{t('common.total')}</span>
              <span className="text-lg font-semibold tabular">{formatRp(total)}</span>
            </div>
            <Button block disabled={total === 0} onClick={orderPaid}>{t('cards.orderPay')}</Button>
          </div>
        </Card>

        {orders.length > 0 && (
          <div>
            <h3 className="mb-2 px-1 pt-2 text-base font-semibold">{t('cards.orders')}</h3>
            <div className="space-y-2">
              {[...orders].reverse().map((o) => (
                <Card key={o.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{o.id}</span>
                    <StatusPill tone={STATUS_TONE[o.status]}>{t(`cards.status.${o.status}`)}</StatusPill>
                  </div>
                  <p className="mt-1 text-xs text-ink/55">
                    {t('cards.contents', { cards: o.freeCards + o.extraCards, stickers: o.freeStickers + o.extraStickers })}
                    {o.vehicles.map((v) => ` · ${t(v.type === 'mobil' ? 'cards.car' : 'cards.motor')} ${v.plate}`).join('')}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-ink/45">{formatDate(o.createdAt.slice(0, 10), lang)} · {o.total ? formatRp(o.total) : t('status.free')}</span>
                    {o.status === 'awaitingPayment' && <Button size="sm" onClick={() => setPayId(o.id)}>{t('cards.pay')}</Button>}
                  </div>
                  {o.status === 'ready' && <p className="mt-2 rounded-xl bg-[#E3F5E9] p-2.5 text-xs font-medium text-[#17703D]">{t('cards.readyNote')}</p>}
                </Card>
              ))}
            </div>
          </div>
        )}
      </ScreenBody>
      {payOrder && (
        <PaySheet
          open
          onClose={() => setPayId(null)}
          title={t('cards.payTitle')}
          amount={payOrder.total}
          vaSeed={ctx.unit.code}
          onPay={(method) => {
            const r = run(payCardOrder, { orderId: payOrder.id, method });
            return r.ok ? null : r.error;
          }}
        />
      )}
    </div>
  );
}
