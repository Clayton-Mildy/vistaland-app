import { AlertTriangle, CheckCircle2, Lock, Phone, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { EMERGENCY_NUMBERS } from '../../../data/content';
import type { PanicSignal } from '../../../domain/types';
import { useT } from '../../../i18n';
import { cancelPanic, setPanicType, triggerPanic } from '../../../store/actions';
import { useAccess, useData, useResident, useRun } from '../../../store/hooks';
import { useStore } from '../../../store/store';
import { AppBar } from '../../../ui/AppBar';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Chip } from '../../../ui/Chip';
import { cx } from '../../../ui/cx';
import { Checkbox } from '../../../ui/Field';
import { useLocalized } from '../hooks';

const TYPES: NonNullable<PanicSignal['type']>[] = ['medis', 'kebakaran', 'pencurian', 'lainnya'];

export default function Emergency() {
  const t = useT();
  const L = useLocalized();
  const run = useRun();
  const ctx = useResident()!;
  const canPanic = useAccess()('panic').ok;
  const [countdown, setCountdown] = useState<number | null>(null);
  const [type, setType] = useState<PanicSignal['type']>(null);
  const [away, setAway] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);
  const timer = useRef<number>();
  const ongoing = useData((d) => d.panics.filter((p) => p.unitId === ctx.unit.id && !p.resolvedAt).at(-1));
  const sent = useData((d) => d.panics.find((p) => p.id === sentId));
  const signal = sent ?? ongoing;
  const staff = useData((d) => d.staff);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      run(triggerPanic, { unitId: ctx.unit.id, from: ctx.identity, type, awayFromHome: away });
      setSentId(useStore.getState().data.panics.at(-1)!.id);
      setCountdown(null);
      return;
    }
    timer.current = window.setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => window.clearTimeout(timer.current);
  }, [countdown, run, ctx, type, away]);

  const pickType = (k: NonNullable<PanicSignal['type']>) => {
    setType(k);
    if (sentId) run(setPanicType, { id: sentId, type: k });
  };
  const active = signal && !signal.resolvedAt;

  return (
    <div>
      <AppBar title={t('emergency.title')} subtitle={t('common.unit') + ' ' + ctx.unit.code} />
      <div className="space-y-3 p-4">
        <Card className="flex flex-col items-center py-6 text-center">
          {!canPanic ? (
            <>
              <span className="flex h-36 w-36 items-center justify-center rounded-full bg-paper text-ink/30"><Lock className="h-10 w-10" /></span>
              <p className="mt-3 text-sm font-semibold text-ink/60">{t('emergency.locked')}</p>
            </>
          ) : countdown !== null ? (
            <>
              <span className="flex h-44 w-44 animate-pulse items-center justify-center rounded-full bg-[#B4192A] text-6xl font-extrabold text-white ring-[16px] ring-[#FDE8EA]">{countdown}</span>
              <p className="mt-4 text-sm text-ink/60">{t('emergency.counting')}</p>
              <Button className="mt-3" variant="secondary" onClick={() => setCountdown(null)}>{t('emergency.cancel')}</Button>
            </>
          ) : active ? (
            <>
              <span className={cx('flex h-36 w-36 items-center justify-center rounded-full text-white ring-[14px]', signal.acceptedAt ? 'bg-[#17703D] ring-[#E3F5E9]' : 'animate-pulse bg-[#B4192A] ring-[#FDE8EA]')}>
                {signal.acceptedAt ? <ShieldCheck className="h-14 w-14" /> : <AlertTriangle className="h-14 w-14" />}
              </span>
              <p className="mt-4 text-lg font-bold">{signal.acceptedAt ? t('emergency.accepted', { name: staff.find((s) => s.id === signal.acceptedBy)?.name ?? 'Security' }) : t('emergency.waiting')}</p>
              <p className="mt-1 text-sm text-ink/55">{signal.acceptedAt ? t('emergency.acceptedBody') : t('emergency.waitingBody')}</p>
              {!signal.acceptedAt && <Button className="mt-3" variant="secondary" onClick={() => { run(cancelPanic, { id: signal.id }); setSentId(null); }}>{t('emergency.falseAlarm')}</Button>}
            </>
          ) : (
            <>
              {signal?.resolvedAt && <p className="mb-3 flex items-center gap-1.5 rounded-full bg-[#E3F5E9] px-3 py-1 text-xs font-bold text-[#17703D]"><CheckCircle2 className="h-4 w-4" />{t('emergency.resolved')}</p>}
              <button onClick={() => setCountdown(5)} className="flex h-44 w-44 flex-col items-center justify-center rounded-full bg-gradient-to-b from-[#E0303F] to-[#9E1220] text-white shadow-[0_18px_40px_-12px_rgba(180,25,42,0.7)] ring-[16px] ring-[#FDE8EA] transition active:scale-95">
                <AlertTriangle className="h-12 w-12" />
                <span className="mt-1 text-2xl font-extrabold tracking-wider">{t('emergency.panic')}</span>
                <span className="text-xs text-white/80">{t('emergency.pressOnce')}</span>
              </button>
              <p className="mt-5 max-w-[280px] text-sm text-ink/55">{t('emergency.info')}</p>
            </>
          )}
        </Card>
        {canPanic && (
          <>
            <p className="px-1 text-xs font-semibold text-ink/55">{t('emergency.typeLabel')}</p>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((k) => <Chip key={k} active={type === k} onClick={() => pickType(k)}>{t(`emergency.type.${k}`)}</Chip>)}
            </div>
            <Card className="py-3"><Checkbox checked={away} onChange={setAway}>{t('emergency.away')}<span className="block text-xs text-ink/45">{t('emergency.awayHint', { unit: ctx.unit.code })}</span></Checkbox></Card>
          </>
        )}
        <Card className="p-0">
          <p className="px-4 pb-1 pt-4 font-bold">{t('emergency.numbers')}</p>
          <ul className="divide-y divide-line">
            {EMERGENCY_NUMBERS.map((n) => (
              <li key={n.number} className="flex items-center justify-between px-4 py-3">
                <span><span className="block text-sm font-semibold">{L(n.label)}</span><span className="block text-[11px] text-ink/45">{L(n.sub)}</span></span>
                <a href={`tel:${n.number.replace(/\D/g, '')}`} className={cx('flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold', n.primary ? 'bg-brand text-white' : 'border border-brand/30 bg-brand-tint/40 text-brand-dark')}>
                  <Phone className="h-4 w-4" />{n.number}
                </a>
              </li>
            ))}
          </ul>
        </Card>
        <p className="px-1 text-xs text-ink/50">{t('emergency.footer')}</p>
      </div>
    </div>
  );
}
