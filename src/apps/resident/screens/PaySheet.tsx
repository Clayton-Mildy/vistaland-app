import { Check, Copy, Landmark, QrCode } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { Payment } from '../../../domain/types';
import { formatRp } from '../../../domain/money';
import { useT } from '../../../i18n';
import { Button } from '../../../ui/Button';
import { Moni } from '../../../ui/Moni';
import { cx } from '../../../ui/cx';
import { Sheet } from '../../../ui/Sheet';
import { useToast } from '../../../ui/Toast';

/** Simulated VA / QRIS payment. `onPay` runs the store action and returns an error key or null. */
export function PaySheet({ open, onClose, title, amount, vaSeed, summary, onPay }: { open: boolean; onClose: () => void; title: ReactNode; amount: number; vaSeed: string; summary?: ReactNode; onPay: (method: Payment['method']) => string | null }) {
  const t = useT();
  const toast = useToast();
  const [method, setMethod] = useState<'va' | 'qris'>('va');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const va = `8808 ${vaSeed.replace(/\D/g, '').padEnd(4, '0').slice(0, 4)} ${String(amount).slice(0, 4).padStart(4, '0')}`;
  const close = () => {
    setDone(false);
    setError(null);
    onClose();
  };
  const pay = () => {
    const err = onPay(method);
    if (err) return setError(t(err));
    setDone(true);
  };
  return (
    <Sheet open={open} onClose={close} title={done ? undefined : title}>
      {done ? (
        <div className="flex flex-col items-center py-4 text-center">
          <Moni pose="thumbs" size={88} />
          <h3 className="mt-3 text-xl font-semibold">{t('pay.success')}</h3>
          <p className="mt-1 text-sm text-ink/55">{t('pay.successBody', { amount: formatRp(amount) })}</p>
          <Button className="mt-5" block onClick={close}>{t('common.done')}</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {summary}
          <div className="flex items-baseline justify-between rounded-2xl bg-paper px-4 py-3">
            <span className="text-sm text-ink/60">{t('common.total')}</span>
            <span className="text-xl font-semibold tabular">{formatRp(amount)}</span>
          </div>
          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line" role="radiogroup">
            {([['va', Landmark], ['qris', QrCode]] as const).map(([m, Icon]) => (
              <button key={m} type="button" role="radio" aria-checked={method === m} onClick={() => setMethod(m)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-tint text-brand-dark"><Icon className="h-[18px] w-[18px]" strokeWidth={1.75} /></span>
                <span className="flex-1 text-sm font-medium">{t(`method.${m}`)}</span>
                <span className={cx('flex h-5 w-5 items-center justify-center rounded-full border-2', method === m ? 'border-brand-dark bg-brand-dark text-white' : 'border-line')}>{method === m && <Check className="h-3 w-3" strokeWidth={3} />}</span>
              </button>
            ))}
          </div>
          {method === 'va' ? (
            <div className="rounded-2xl border border-line p-4">
              <p className="text-xs text-ink/50">{t('pay.vaLabel')}</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-lg font-semibold tracking-wider tabular">{va}</span>
                <button onClick={() => { void navigator.clipboard?.writeText(va.replace(/\s/g, '')); toast.show(t('common.copied')); }} className="flex items-center gap-1 rounded-full border border-line px-3 py-1 text-xs font-medium text-brand-dark hover:border-ink/25">
                  <Copy className="h-3.5 w-3.5" /> {t('common.copy')}
                </button>
              </div>
              <p className="mt-2 text-xs text-ink/45">{t('pay.vaNote')}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center rounded-2xl border border-line p-4">
              <div className="flex h-36 w-36 items-center justify-center rounded-xl bg-[repeating-conic-gradient(#111827_0_25%,#fff_0_50%)] bg-[length:18px_18px] p-3">
                <span className="rounded-lg bg-white p-2"><QrCode className="h-8 w-8" /></span>
              </div>
              <p className="mt-2 text-xs text-ink/45">{t('pay.qrisNote')}</p>
            </div>
          )}
          {error && <p className="rounded-xl bg-[#FDE8EA] px-3 py-2 text-sm text-[#B4192A]">{error}</p>}
          <Button block size="lg" onClick={pay}>{t('pay.simulate')}</Button>
        </div>
      )}
    </Sheet>
  );
}
