import { CreditCard, Minus, Plus, Sticker } from 'lucide-react';
import { useState } from 'react';
import { formatDate } from '../../../domain/clock';
import { formatRp } from '../../../domain/money';
import type { Vehicle } from '../../../domain/types';
import { useLang, useT } from '../../../i18n';
import { orderCards, payCardOrder } from '../../../store/actions';
import { useData, useResident, useRun } from '../../../store/hooks';
import { useStore } from '../../../store/store';
import { AppBar } from '../../../ui/AppBar';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Field, Input } from '../../../ui/Field';
import { Segmented } from '../../../ui/Segmented';
import { StatusPill, type PillTone } from '../../../ui/StatusPill';
import { useToast } from '../../../ui/Toast';
import { PaySheet } from './PaySheet';

const STATUS_TONE: Record<string, PillTone> = { awaitingPayment: 'warning', toMake: 'info', ready: 'success', pickedUp: 'neutral' };

function Stepper({ value, onChange, max }: { value: number; onChange: (n: number) => void; max: number }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onChange(Math.max(0, value - 1))} className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white"><Minus className="h-4 w-4" /></button>
      <span className="w-6 text-center font-bold tabular">{value}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))} className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white"><Plus className="h-4 w-4" /></button>
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
      <AppBar title={t('cards.title')} />
      <div className="space-y-3 p-4">
        {!freeUsed && (
          <Card className="border-brand/40 ring-2 ring-brand/10">
            <div className="flex items-center justify-between">
              <span className="font-bold">{t('cards.freeTitle')}</span>
              <StatusPill tone="brand">{t('status.free').toUpperCase()}</StatusPill>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 rounded-xl bg-brand-tint/60 p-2.5"><CreditCard className="h-5 w-5 text-[#6B4FD8]" /><span className="text-xs"><b>{t('cards.nCards', { n: c.freeCards })}</b><br />{t('cards.cardsUse')}</span></div>
              <div className="flex items-center gap-2 rounded-xl bg-brand-tint/60 p-2.5"><Sticker className="h-5 w-5 text-[#1F8A4C]" /><span className="text-xs"><b>{t('cards.nStickers', { n: c.freeStickers })}</b><br />{t('cards.stickersUse')}</span></div>
            </div>
            <p className="mt-3 text-xs font-semibold text-ink/60">{t('cards.vehicleFor')}</p>
            <Segmented className="mt-1.5 w-full" value={type} onChange={setType} items={[{ value: 'mobil', label: t('cards.car') }, { value: 'motor', label: t('cards.motor') }]} />
            <Field className="mt-3" label={t('movein.plate')}><Input placeholder="B 1234 XYZ" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} /></Field>
            <Button className="mt-3" block size="lg" onClick={claimFree}>{t('cards.claimFree')}</Button>
            <p className="mt-2 text-[11px] text-ink/45">{t('cards.freeNote')}</p>
          </Card>
        )}

        <Card>
          <p className="font-bold">{t('cards.moreTitle')}</p>
          <p className="text-xs text-ink/50">{t('cards.moreBody')}</p>
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <span><span className="block text-sm font-semibold">{t('cards.extraSticker')}</span><span className="text-xs text-ink/50">{formatRp(c.extraStickerPrice)}/{t('cards.perSticker')}</span></span>
              <Stepper value={stickers} onChange={setStickers} max={5} />
            </div>
            <div className="flex items-center justify-between">
              <span><span className="block text-sm font-semibold">{t('cards.extraCard')}</span><span className="text-xs text-ink/50">{t('cards.maxN', { n: c.maxExtraCards })} · {formatRp(c.extraCardPrice)}/{t('cards.perCard')}</span></span>
              <Stepper value={cards} onChange={setCards} max={c.maxExtraCards} />
            </div>
            {freeUsed && stickers > 0 && (
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <Segmented size="sm" value={type} onChange={setType} items={[{ value: 'mobil', label: t('cards.car') }, { value: 'motor', label: t('cards.motor') }]} />
                <Input placeholder={t('movein.plate')} value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} className="h-9" />
              </div>
            )}
            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="font-semibold">{t('common.total')}</span>
              <span className="text-lg font-extrabold tabular">{formatRp(total)}</span>
            </div>
            <Button block disabled={total === 0} onClick={orderPaid}>{t('cards.orderPay')}</Button>
          </div>
        </Card>

        {orders.length > 0 && (
          <div>
            <h3 className="mb-2 px-1 text-[15px] font-bold">{t('cards.orders')}</h3>
            <div className="space-y-2">
              {[...orders].reverse().map((o) => (
                <Card key={o.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{o.id}</span>
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
                  {o.status === 'ready' && <p className="mt-2 rounded-lg bg-[#E3F5E9] p-2 text-xs font-semibold text-[#17703D]">{t('cards.readyNote')}</p>}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
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
