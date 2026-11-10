import { useState } from 'react';
import { formatDate } from '../../../domain/clock';
import type { Voucher } from '../../../domain/types';
import { useLang, useT } from '../../../i18n';
import { claimVoucher, redeemVoucherCode } from '../../../store/actions';
import { useData, useResident, useRun } from '../../../store/hooks';
import { useStore } from '../../../store/store';
import { Button } from '../../../ui/Button';
import { cx } from '../../../ui/cx';
import { EmptyState } from '../../../ui/EmptyState';
import { Moni } from '../../../ui/Moni';
import { Segmented } from '../../../ui/Segmented';
import { Sheet } from '../../../ui/Sheet';
import { useToast } from '../../../ui/Toast';

const TONE: Record<Voucher['tone'], string> = { orange: 'bg-[#FFE2CC] text-[#B5530F]', blue: 'bg-[#DCE8FD] text-[#1F56B3]', yellow: 'bg-[#FFF0B8] text-[#8A5A00]', grey: 'bg-[#E9ECF1] text-[#4B5563]' };

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
    <div className="pb-6">
      <div className="bg-gradient-to-br from-brand to-brand-dark px-4 pb-4 pt-5 text-white md:pt-10">
        <h1 className="text-xl font-extrabold">{t('voucher.title')}</h1>
        <p className="text-xs text-white/80">{t('voucher.subtitle', { project: ctx.project.name })}</p>
        <div className="mt-3 flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t('voucher.codePh', { code: vouchers[0]?.code ?? '' })} className="h-11 flex-1 rounded-xl px-3 text-sm text-ink outline-none" />
          <Button variant="gold" disabled={!code.trim()} onClick={redeem}>{t('voucher.use')}</Button>
        </div>
        <Segmented className="mt-3 w-full !bg-white/15 [&_button]:!text-white [&_.bg-white]:!text-ink" value={tab} onChange={setTab} items={[{ value: 'available', label: t('voucher.available') }, { value: 'mine', label: t('voucher.mine', { n: claims.length }) }]} />
      </div>
      <div className="space-y-2.5 p-4">
        {tab === 'available' &&
          vouchers.map((v) => (
            <div key={v.id} className="flex overflow-hidden rounded-2xl border border-line bg-white shadow-card">
              <div className={cx('flex w-24 shrink-0 flex-col items-center justify-center border-r-2 border-dashed border-white px-2 text-center', TONE[v.tone])}>
                <span className="text-xl font-extrabold leading-tight">{v.valueLabel}</span>
              </div>
              <div className="min-w-0 flex-1 p-3">
                <p className="text-[11px] text-ink/50">{v.partner} · {t(`voucher.cat.${v.category}`)}</p>
                <p className="text-sm font-bold leading-snug">{v.title}</p>
                <p className="text-xs text-ink/55">{v.description}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-ink/45">{t('voucher.until', { date: formatDate(v.validUntil, lang) })} · {t('voucher.left', { n: v.stock })}</span>
                  {claimed(v.id) ? <span className="text-xs font-bold text-[#17703D]">{t('voucher.claimed')}</span> : <Button size="sm" disabled={v.stock <= 0} onClick={() => { const r = run(claimVoucher, { voucherId: v.id, holder: ctx.recipientKey }); if (!r.ok) return toast.show(t(r.error), 'error'); showLatest(); }}>{t('voucher.claim')}</Button>}
                </div>
              </div>
            </div>
          ))}
        {tab === 'mine' &&
          (claims.length === 0 ? <EmptyState pose="cool" title={t('voucher.noneTitle')} body={t('voucher.noneBody')} /> : claims.map((c) => {
            const v = vouchers.find((x) => x.id === c.voucherId);
            return (
              <button key={c.id} onClick={() => setShown(c.id)} className="flex w-full items-center justify-between rounded-2xl border border-line bg-white p-4 text-left shadow-card">
                <span><span className="block text-sm font-bold">{v?.title}</span><span className="block text-xs text-ink/50">{v?.partner}</span></span>
                <span className="rounded-lg bg-paper px-2.5 py-1 font-mono text-xs font-bold">{c.code}</span>
              </button>
            );
          }))}
        <p className="pt-1 text-center text-xs text-ink/45">{t('voucher.footer')}</p>
      </div>
      <Sheet open={!!shownClaim} onClose={() => setShown(null)}>
        {shownClaim && (
          <div className="flex flex-col items-center py-2 text-center">
            <Moni pose="cool" size={96} />
            <p className="mt-2 text-lg font-bold">{shownVoucher?.title}</p>
            <p className="text-sm text-ink/55">{shownVoucher?.partner}</p>
            <p className="mt-4 rounded-2xl border-2 border-dashed border-brand/50 bg-brand-tint/40 px-6 py-3 font-mono text-2xl font-extrabold tracking-wider text-brand-dark">{shownClaim.code}</p>
            <p className="mt-3 text-xs text-ink/50">{t('voucher.show')}</p>
            <Button className="mt-4" block onClick={() => setShown(null)}>{t('common.done')}</Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
