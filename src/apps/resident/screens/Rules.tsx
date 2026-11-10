import { ChevronDown, Download, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RULE_SECTIONS, RULES_VERSION } from '../../../data/content';
import { formatDateTime } from '../../../domain/clock';
import { useLang, useT } from '../../../i18n';
import { signRules } from '../../../store/actions';
import { useResident, useRun } from '../../../store/hooks';
import { savePhoto } from '../../../store/photos';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { Checkbox } from '../../../ui/Field';
import { Photo } from '../../../ui/Photo';
import { SignaturePad } from '../../../ui/SignaturePad';
import { useToast } from '../../../ui/Toast';
import { useLocalized } from '../hooks';
import { ScreenBody } from '../ui/ScreenBody';
import { ScreenHeader } from '../ui/ScreenHeader';

export default function Rules() {
  const t = useT();
  const [lang] = useLang();
  const L = useLocalized();
  const nav = useNavigate();
  const run = useRun();
  const toast = useToast();
  const ctx = useResident()!;
  const [open, setOpen] = useState<number | null>(0);
  const [agree, setAgree] = useState(false);
  const [sig, setSig] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signedAt = ctx.role === 'renter' ? ctx.renter?.rulesSignedAt : ctx.unit.rules?.signedAt;

  const sign = async () => {
    if (!sig) return;
    setBusy(true);
    const photo = await savePhoto(sig);
    run(signRules, { unitId: ctx.unit.id, signaturePhotoId: photo.id, renterId: ctx.role === 'renter' ? ctx.renter!.id : undefined });
    setBusy(false);
    toast.show(t('rules.signed'));
    nav('/app/home');
  };

  return (
    <div>
      <ScreenHeader
        title={t('rules.title')}
        sub={t('rules.version', { v: RULES_VERSION })}
        right={<button onClick={() => toast.show(t('rules.downloaded'))} className="flex shrink-0 items-center gap-1 rounded-full border border-white/50 px-3 py-1 text-xs font-medium text-white hover:bg-white/10"><Download className="h-3.5 w-3.5" />{t('rules.pdf')}</button>}
      />
      <ScreenBody>
        <Card className="divide-y divide-line p-0">
          {RULE_SECTIONS.map((s, i) => (
            <div key={i}>
              <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-tint text-xs font-semibold text-brand-dark tabular">{i + 1}</span>
                <span className="flex-1">{L(s.title)}</span>
                <ChevronDown className={cx('h-4 w-4 shrink-0 text-ink/40 transition', open === i && 'rotate-180')} />
              </button>
              {open === i && (
                <ul className="ml-[52px] mr-4 list-disc space-y-1.5 pb-4 pl-4 text-sm text-ink/65">
                  {s.points.map((p, j) => <li key={j}>{L(p)}</li>)}
                </ul>
              )}
            </div>
          ))}
        </Card>
        {signedAt ? (
          <Card className="border-[#BDE5CB] bg-[#F2FBF5]">
            <div className="flex items-center gap-2 font-semibold text-[#17703D]"><ShieldCheck className="h-5 w-5" />{t('rules.alreadySigned')}</div>
            <p className="mt-1 text-sm text-ink/60">{t('rules.signedOn', { date: formatDateTime(signedAt, lang) })}</p>
            {ctx.unit.rules && ctx.role === 'owner' && <Photo id={ctx.unit.rules.signaturePhotoId} className="mt-3 h-24 rounded-xl border border-line bg-white [&_img]:object-contain" />}
            <p className="mt-2 text-xs text-ink/45">{t('rules.copyEmailed')}</p>
          </Card>
        ) : (
          <Card className="space-y-4">
            <Checkbox checked={agree} onChange={setAgree}>{t(ctx.role === 'renter' ? 'rules.agreeRenter' : 'rules.agree', { unit: ctx.unit.code })}</Checkbox>
            <SignaturePad onChange={setSig} />
            <Button block size="lg" disabled={!agree || !sig} loading={busy} onClick={sign}>{t('rules.sign')}</Button>
          </Card>
        )}
      </ScreenBody>
    </div>
  );
}
