import { useState } from 'react';
import { formatDate } from '../../../domain/clock';
import { useLang, useT } from '../../../i18n';
import { claimVoucher, redeemVoucherCode } from '../../../store/actions';
import { useData, useResident, useRun } from '../../../store/hooks';
import { useStore } from '../../../store/store';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { EmptyState } from '../../../ui/EmptyState';
import { Moni } from '../../../ui/Moni';
import { Sheet } from '../../../ui/Sheet';
import { useToast } from '../../../ui/Toast';
import { ScreenBody } from '../ui/ScreenBody';
import { ScreenHeader } from '../ui/ScreenHeader';

const initials = (name: string) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export default function Vouchers() {
  const t = useT();
  const [lang] = useLang();
  const run = useRun();
  const toast = useToast();
  const ctx = useResident()!;
  const vouchers = useData((d) => d.vouchers).filter((v) => v.projectId === ctx.project.id);
  const claims = useData((d) => d.voucherClaims).filter((c) => c.holder === ctx.recipientKey);
  const [tab, setTab] = useState<'available' | 'mine'>('available');
  const [code, setCode] = useState('');
  const [shown, setShown] = useState<string | null>(null);
  const claimed = (id: string) => claims.some((c) => c.voucherId === id);
  const showLatest = () => setShown(useStore.getState().data.voucherClaims.at(-1)!.id);
  const redeem = () => {
    const r = run(redeemVoucherCode, { code, holder: ctx.recipientKey, projectId: ctx.project.id });
    if (!r.ok) return toast.show(t(r.error), 'error');
    setCode('');
    showLatest();
  };
  const shownClaim = claims.find((c) => c.id === shown);
  const shownVoucher = vouchers.find((v) => v.id === shownClaim?.voucherId);
  return (
    <div>
      <ScreenHeader back={false} title={t('voucher.title')} sub={t('voucher.subtitle', { project: ctx.project.name })}>
        <div className="mt-3 flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t('voucher.codePh', { code: vouchers[0]?.code ?? '' })} className="h-11 min-w-0 flex-1 rounded-full bg-white px-4 text-sm text-ink outline-none placeholder:text-ink/40" />
          <Button variant="gold" disabled={!code.trim()} onClick={redeem}>{t('voucher.use')}</Button>
        </div>
        <div className="mt-3 flex rounded-full bg-white/[0.14] p-0.5" role="tablist">
          {(['available', 'mine'] as const).map((v) => (
            <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)} className={cx('flex-1 rounded-full py-1.5 text-xs font-medium transition', tab === v ? 'bg-white text-ink' : 'text-white/80 hover:text-white')}>
              {v === 'available' ? t('voucher.available') : t('voucher.mine', { n: claims.length })}
            </button>
          ))}
        </div>
      </ScreenHeader>
      <ScreenBody>
        {tab === 'available' &&
          vouchers.map((v) => (
            <Card key={v.id} className="flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-tint text-sm font-semibold text-brand-dark">{initials(v.partner)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-ink/50">{v.partner} · {t(`voucher.cat.${v.category}`)}</p>
                <p className="text-base font-semibold text-brand-dark">{v.valueLabel}</p>
                <p className="text-sm font-medium leading-snug">{v.title}</p>
                <p className="text-xs text-ink/55">{v.description}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-ink/45">{t('voucher.until', { date: formatDate(v.validUntil, lang) })} · {t('voucher.left', { n: v.stock })}</span>
                  {claimed(v.id) ? <span className="shrink-0 text-xs font-medium text-[#17703D]">{t('voucher.claimed')}</span> : <Button size="sm" disabled={v.stock <= 0} onClick={() => { const r = run(claimVoucher, { voucherId: v.id, holder: ctx.recipientKey }); if (!r.ok) return toast.show(t(r.error), 'error'); showLatest(); }}>{t('voucher.claim')}</Button>}
                </div>
              </div>
            </Card>
          ))}
        {tab === 'mine' &&
          (claims.length === 0 ? <Card><EmptyState pose="cool" title={t('voucher.noneTitle')} body={t('voucher.noneBody')} /></Card> : (
            <Card className="divide-y divide-line p-0">
              {claims.map((c) => {
                const v = vouchers.find((x) => x.id === c.voucherId);
                return (
                  <button key={c.id} onClick={() => setShown(c.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-tint text-xs font-semibold text-brand-dark">{initials(v?.partner ?? '')}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{v?.title}</span><span className="block text-xs text-ink/50">{v?.partner}</span></span>
                    <span className="shrink-0 rounded-lg bg-paper px-2.5 py-1 text-xs font-semibold tracking-wider tabular">{c.code}</span>
                  </button>
                );
              })}
            </Card>
          ))}
        <p className="pt-1 text-center text-xs text-ink/45">{t('voucher.footer')}</p>
      </ScreenBody>
      <Sheet open={!!shownClaim} onClose={() => setShown(null)}>
        {shownClaim && (
          <div className="flex flex-col items-center py-2 text-center">
            <Moni pose="cool" size={80} />
            <p className="mt-2 text-xl font-semibold">{shownVoucher?.title}</p>
            <p className="text-sm text-ink/55">{shownVoucher?.partner}</p>
            <p className="mt-4 rounded-2xl border-2 border-dashed border-brand/40 bg-paper px-6 py-3 text-2xl font-semibold tracking-[0.15em] tabular text-brand-dark">{shownClaim.code}</p>
            <p className="mt-3 text-xs text-ink/50">{t('voucher.show')}</p>
            <Button className="mt-4" block onClick={() => setShown(null)}>{t('common.done')}</Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
