import { CheckCircle2, KeyRound, Minus, Plus, Trash2, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MOVE_SLOTS } from '../../../data/content';
import { formatRp } from '../../../domain/money';
import type { RenterRegistration, Vehicle } from '../../../domain/types';
import { useT } from '../../../i18n';
import { payRegistrationFee, resubmitRegistration, submitRegistration } from '../../../store/actions';
import { useData, useResident, useRun, useToday } from '../../../store/hooks';
import { useStore } from '../../../store/store';
import { AppBar } from '../../../ui/AppBar';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { Field, Input, Select } from '../../../ui/Field';
import { Moni } from '../../../ui/Moni';
import { Photo } from '../../../ui/Photo';
import { PhotoPicker } from '../../../ui/PhotoPicker';
import { Segmented } from '../../../ui/Segmented';
import { Stepper } from '../../../ui/Stepper';
import { useToast } from '../../../ui/Toast';
import { PaySheet } from './PaySheet';

const STEPS = ['type', 'identity', 'vehicles', 'moveIn', 'pay'] as const;

export default function RenterRegistrationWizard() {
  const t = useT();
  const nav = useNavigate();
  const run = useRun();
  const toast = useToast();
  const today = useToday();
  const ctx = useResident()!;
  const [params] = useSearchParams();
  // A fix link only opens this owner's own registration that the estate sent back.
  const fixing = useData((d) => d.registrations.find((r) => r.id === params.get('fix') && r.status === 'needsFix' && r.ownerCustomerId === ctx.owner?.customer_id && ctx.unitIds.includes(r.unitId)));
  const units = useData((d) => d.units).filter((u) => ctx.unitIds.includes(u.id));
  const cardsCfg = ctx.settings.cards;
  const [step, setStep] = useState(fixing ? 1 : 0);
  const [unitId, setUnitId] = useState(fixing?.unitId ?? (units.find((u) => !u.renterId && u.id !== ctx.unit.id && u.occupancy !== 'occupied')?.id ?? ctx.unit.id));
  const [type, setType] = useState<RenterRegistration['type']>(fixing?.type ?? 'renter');
  const [name, setName] = useState(fixing?.person.name ?? '');
  const [ktp, setKtp] = useState(fixing?.person.no_ktp ?? '');
  const [phone, setPhone] = useState(fixing?.person.no_hp ?? '');
  const [household, setHousehold] = useState(fixing?.person.householdSize ?? 2);
  const [start, setStart] = useState(fixing?.lease?.start ?? today);
  const [end, setEnd] = useState(fixing?.lease?.end ?? '');
  const [ajb, setAjb] = useState(fixing?.ajbDate ?? today);
  const [doc, setDoc] = useState<string | undefined>(fixing?.leaseDocPhotoId);
  const [vehicles, setVehicles] = useState<Vehicle[]>(fixing?.vehicles ?? []);
  const [vType, setVType] = useState<Vehicle['type']>('mobil');
  const [plate, setPlate] = useState('');
  const [cards, setCards] = useState(fixing?.cards ?? 1);
  const [moveDate, setMoveDate] = useState(fixing?.moveIn.date ?? today);
  const [moveTime, setMoveTime] = useState(fixing?.moveIn.time ?? MOVE_SLOTS[0]);
  const [payer, setPayer] = useState<'owner' | 'renter'>(fixing?.iplPayer ?? 'renter');
  const [error, setError] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<{ id: string; fee: number } | null>(null);
  const [done, setDone] = useState(false);

  const extraStickers = Math.max(0, vehicles.length - cardsCfg.freeStickers);
  const extraCards = Math.max(0, cards - cardsCfg.freeCards);
  const fee = extraStickers * cardsCfg.extraStickerPrice + extraCards * cardsCfg.extraCardPrice;
  const code = useMemo(() => units.find((u) => u.id === unitId)?.code ?? '', [units, unitId]);

  const validate = (): string | null => {
    if (step === 1) {
      if (name.trim().length < 3) return t('wizard.err.name');
      if (ktp.replace(/\D/g, '').length !== 16) return t('wizard.err.ktp');
      if (phone.replace(/\D/g, '').length < 9) return t('wizard.err.phone');
      if (type === 'renter' && (!end || end <= start)) return t('wizard.err.lease');
      if (!doc) return t(type === 'renter' ? 'wizard.err.leaseDoc' : 'wizard.err.ajbDoc');
    }
    if (step === 3 && moveDate < today) return t('error.pastDate');
    return null;
  };
  const next = () => {
    const err = validate();
    setError(err);
    if (!err) setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const submit = () => {
    const payload = { unitId, ownerCustomerId: ctx.owner!.customer_id, type, person: { name: name.trim(), no_ktp: ktp.replace(/\D/g, ''), no_hp: phone.trim(), householdSize: household }, lease: type === 'renter' ? { start, end } : undefined, ajbDate: type === 'newOwner' ? ajb : undefined, leaseDocPhotoId: doc, vehicles, cards, moveIn: { date: moveDate, time: moveTime }, iplPayer: type === 'renter' ? payer : ('owner' as const) };
    const r = fixing ? run(resubmitRegistration, { id: fixing.id, ownerCustomerId: ctx.owner!.customer_id, patch: payload }) : run(submitRegistration, payload);
    if (!r.ok) return setError(t(r.error));
    const reg = fixing ?? useStore.getState().data.registrations.at(-1)!;
    const fresh = useStore.getState().data.registrations.find((x) => x.id === reg.id)!;
    if (!fresh.feePaid && fresh.fee > 0) setPayFor({ id: fresh.id, fee: fresh.fee });
    else setDone(true);
  };

  if (done) {
    return (
      <div>
        <AppBar title={t('wizard.title')} />
        <div className="flex flex-col items-center px-8 pt-8 text-center">
          <Moni pose="thumbs" size={110} />
          <h2 className="mt-3 text-xl font-bold">{t('wizard.doneTitle')}</h2>
          <p className="mt-1 text-sm text-ink/60">{t('wizard.doneBody', { name })}</p>
          <Card className="mt-5 w-full text-left text-sm">
            <p className="font-bold">{t('wizard.next')}</p>
            <ul className="mt-2 space-y-1.5 text-ink/65">
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-brand" />{t('wizard.next1')}</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-brand" />{t(type === 'renter' ? 'wizard.next2' : 'wizard.next2owner')}</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-brand" />{t('wizard.next3')}</li>
            </ul>
          </Card>
          <Button className="mt-5" block onClick={() => nav('/app/renters', { replace: true })}>{t('common.done')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AppBar title={t('wizard.title')} onBack={() => (step > (fixing ? 1 : 0) ? setStep(step - 1) : nav(-1))} />
      <div className="bg-white px-4 pb-3">
        <Stepper steps={STEPS.map((s) => t(`wizard.step.${s}`))} current={step} />
      </div>
      <div className="space-y-3 p-4">
        {step === 0 && (
          <>
            {units.length > 1 && (
              <Field label={t('wizard.unit')}>
                <Select value={unitId} onChange={(e) => setUnitId(e.target.value)}>{units.map((u) => <option key={u.id} value={u.id} disabled={!!u.renterId}>{u.code}{u.renterId ? ` · ${t('home.rented')}` : ''}</option>)}</Select>
              </Field>
            )}
            <p className="px-1 text-sm text-ink/60">{t('wizard.intro', { unit: code })}</p>
            {(['renter', 'newOwner'] as const).map((k) => (
              <button key={k} onClick={() => setType(k)} className={cx('flex w-full items-start gap-3 rounded-2xl border bg-white p-4 text-left', type === k ? 'border-brand ring-2 ring-brand/15' : 'border-line')}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">{k === 'renter' ? <UserPlus className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}</span>
                <span><span className="block font-bold">{t(`wizard.type.${k}`)}</span><span className="block text-xs text-ink/55">{t(`wizard.type.${k}.body`)}</span></span>
              </button>
            ))}
          </>
        )}
        {step === 1 && (
          <Card className="space-y-3">
            <Field label={t('wizard.name')}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('wizard.namePh')} /></Field>
            <Field label={t('login.ktp')}><Input inputMode="numeric" maxLength={16} value={ktp} onChange={(e) => setKtp(e.target.value.replace(/\D/g, ''))} placeholder="3275xxxxxxxxxxxx" /></Field>
            <Field label={t('login.phone')} hint={t('wizard.phoneHint')}><Input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812 xxxx xxxx" /></Field>
            <Field label={t('wizard.household')}><Input type="number" min={1} max={12} value={household} onChange={(e) => setHousehold(Number(e.target.value))} /></Field>
            {type === 'renter' ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('wizard.leaseStart')}><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
                <Field label={t('wizard.leaseEnd')}><Input type="date" min={start} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
              </div>
            ) : (
              <Field label={t('wizard.ajb')}><Input type="date" value={ajb} onChange={(e) => setAjb(e.target.value)} /></Field>
            )}
            <div>
              <p className="mb-1.5 text-xs font-semibold text-ink/70">{t(type === 'renter' ? 'wizard.leaseDoc' : 'wizard.ajbDoc')}</p>
              {doc ? <div className="flex items-center gap-3"><Photo id={doc} className="h-20 w-28 rounded-xl" /><button onClick={() => setDoc(undefined)} className="text-xs font-bold text-brand-dark">{t('capture.retake')}</button></div> : <PhotoPicker samples={['LEASE']} onPicked={(p) => setDoc(p.id)} />}
            </div>
          </Card>
        )}
        {step === 2 && (
          <Card className="space-y-3">
            <p className="text-sm text-ink/60">{t('wizard.vehiclesIntro')}</p>
            {vehicles.map((v, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-paper px-3 py-2 text-sm">
                <span>{t(v.type === 'mobil' ? 'cards.car' : 'cards.motor')} · <b>{v.plate}</b></span>
                <button onClick={() => setVehicles(vehicles.filter((_, j) => j !== i))} className="text-ink/40" aria-label={t('common.delete')}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <div className="grid grid-cols-[auto_1fr_auto] gap-2">
              <Segmented size="sm" value={vType} onChange={setVType} items={[{ value: 'mobil', label: t('cards.car') }, { value: 'motor', label: t('cards.motor') }]} />
              <Input className="h-9" placeholder="B 1234 XYZ" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} />
              <Button size="sm" variant="secondary" onClick={() => { if (plate.trim()) { setVehicles([...vehicles, { type: vType, plate: plate.trim() }]); setPlate(''); } }}>{t('common.add')}</Button>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-3">
              <span><span className="block text-sm font-semibold">{t('wizard.cards')}</span><span className="text-xs text-ink/50">{t('wizard.cardsHint', { n: cardsCfg.freeCards })}</span></span>
              <div className="flex items-center gap-2">
                <button onClick={() => setCards(Math.max(1, cards - 1))} className="flex h-9 w-9 items-center justify-center rounded-xl border border-line"><Minus className="h-4 w-4" /></button>
                <span className="w-5 text-center font-bold">{cards}</span>
                <button onClick={() => setCards(Math.min(cardsCfg.freeCards + cardsCfg.maxExtraCards, cards + 1))} className="flex h-9 w-9 items-center justify-center rounded-xl border border-line"><Plus className="h-4 w-4" /></button>
              </div>
            </div>
          </Card>
        )}
        {step === 3 && (
          <Card className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('wizard.moveDate')}><Input type="date" min={today} value={moveDate} onChange={(e) => setMoveDate(e.target.value)} /></Field>
              <Field label={t('common.time')}><Select value={moveTime} onChange={(e) => setMoveTime(e.target.value)}>{MOVE_SLOTS.map((s) => <option key={s}>{s}</option>)}</Select></Field>
            </div>
            {type === 'renter' && (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-ink/70">{t('wizard.iplPayer')}</p>
                <Segmented className="w-full" value={payer} onChange={setPayer} items={[{ value: 'renter', label: t('role.renter') }, { value: 'owner', label: t('role.owner') }]} />
                <p className="mt-1.5 text-xs text-ink/50">{t('wizard.iplPayerHint')}</p>
              </div>
            )}
          </Card>
        )}
        {step === 4 && (
          <Card className="space-y-2 text-sm">
            <p className="font-bold">{t('wizard.summary')}</p>
            <div className="flex justify-between"><span className="text-ink/55">{t(`role.${type}`)}</span><b>{name}</b></div>
            <div className="flex justify-between"><span className="text-ink/55">{t('common.unit')}</span><b>{code}</b></div>
            <div className="flex justify-between"><span className="text-ink/55">{t('wizard.freeItems')}</span><span>{t('cards.contents', { cards: Math.min(cards, cardsCfg.freeCards), stickers: Math.min(vehicles.length, cardsCfg.freeStickers) })}</span></div>
            {extraStickers > 0 && <div className="flex justify-between"><span className="text-ink/55">{t('cards.extraSticker')} × {extraStickers}</span><span>{formatRp(extraStickers * cardsCfg.extraStickerPrice)}</span></div>}
            {extraCards > 0 && <div className="flex justify-between"><span className="text-ink/55">{t('cards.extraCard')} × {extraCards}</span><span>{formatRp(extraCards * cardsCfg.extraCardPrice)}</span></div>}
            <div className="flex justify-between border-t border-line pt-2 text-base"><b>{t('common.total')}</b><b>{formatRp(fee)}</b></div>
            <p className="pt-1 text-xs text-ink/50">{t('wizard.approvalNote')}</p>
          </Card>
        )}
        {error && <p className="rounded-xl bg-[#FDE8EA] px-3 py-2.5 text-sm text-[#B4192A]">{error}</p>}
        {step < 4 ? <Button block size="lg" onClick={next}>{t('common.next')}</Button> : <Button block size="lg" onClick={submit}>{fee > 0 ? t('wizard.submitPay', { amount: formatRp(fee) }) : t('wizard.submit')}</Button>}
      </div>
      {payFor && (
        <PaySheet open onClose={() => { setPayFor(null); setDone(true); }} title={t('renters.payTitle')} amount={payFor.fee} vaSeed={code} onPay={() => { const r = run(payRegistrationFee, { id: payFor.id }); if (r.ok) toast.show(t('wizard.paid')); return r.ok ? null : r.error; }} />
      )}
    </div>
  );
}
