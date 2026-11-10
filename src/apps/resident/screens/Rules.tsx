import { ChevronDown, Download, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RULE_SECTIONS, RULES_VERSION } from '../../../data/content';
import { formatDateTime } from '../../../domain/clock';
import { useLang, useT } from '../../../i18n';
import { signRules } from '../../../store/actions';
import { useResident, useRun } from '../../../store/hooks';
import { savePhoto } from '../../../store/photos';
import { AppBar } from '../../../ui/AppBar';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { Checkbox } from '../../../ui/Field';
import { Photo } from '../../../ui/Photo';
import { SignaturePad } from '../../../ui/SignaturePad';
import { useToast } from '../../../ui/Toast';
import { useLocalized } from '../hooks';

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
      <AppBar title={t('rules.title')} />
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between px-1 text-xs text-ink/50">
          <span>{t('rules.version', { v: RULES_VERSION })}</span>
          <button onClick={() => toast.show(t('rules.downloaded'))} className="flex items-center gap-1 font-bold text-brand-dark"><Download className="h-3.5 w-3.5" />{t('rules.pdf')}</button>
        </div>
        <Card className="divide-y divide-line p-0">
          {RULE_SECTIONS.map((s, i) => (
            <div key={i}>
              <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-semibold">
                {i + 1}. {L(s.title)}
                <ChevronDown className={cx('h-4 w-4 text-ink/40 transition', open === i && 'rotate-180')} />
              </button>
              {open === i && (
                <ul className="list-disc space-y-1.5 px-8 pb-4 text-sm text-ink/65">
                  {s.points.map((p, j) => <li key={j}>{L(p)}</li>)}
                </ul>
              )}
            </div>
          ))}
        </Card>
        {signedAt ? (
          <Card className="border-[#BDE5CB] bg-[#F2FBF5]">
            <div className="flex items-center gap-2 font-bold text-[#17703D]"><ShieldCheck className="h-5 w-5" />{t('rules.alreadySigned')}</div>
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
      </div>
    </div>
  );
}
