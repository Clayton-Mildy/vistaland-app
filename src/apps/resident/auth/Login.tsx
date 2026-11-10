import { ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RESIDENT_PERSONAS } from '../../../data/personas';
import { resolveResident } from '../../../domain/identity';
import { useT } from '../../../i18n';
import { useStore } from '../../../store/store';
import { Button } from '../../../ui/Button';
import { Field, Input } from '../../../ui/Field';
import { DevelopedBy } from '../../../ui/Footer';
import { LangToggle } from '../../../ui/LangToggle';
import { MoniBubble } from '../../../ui/MoniBubble';
import { SegmentTheme } from '../../../ui/SegmentTheme';

export default function Login() {
  const t = useT();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [phone, setPhone] = useState('');
  const [ktp, setKtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const p = RESIDENT_PERSONAS.find((x) => x.key === params.get('persona'));
    if (p) {
      setPhone(p.phone);
      setKtp(p.ktp);
    }
  }, [params]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (phone.replace(/\D/g, '').length < 9) return setError(t('login.error.phone'));
    if (ktp.replace(/[\s.\-]/g, '').length < 6) return setError(t('login.error.ktp'));
    setBusy(true);
    let r: Awaited<ReturnType<typeof resolveResident>>;
    try {
      r = await resolveResident(useStore.getState().data, phone, ktp);
    } catch {
      // The purchase-record service (VLES) didn't answer: let the resident try again.
      return setError(t('login.error.service'));
    } finally {
      setBusy(false);
    }
    if (!r.ok) return setError(t(`login.error.${r.reason}`));
    nav('/app/otp', { state: { identity: r.identity, unitIds: r.unitIds, phone } });
  };

  return (
    <SegmentTheme theme="komersil" className="no-scrollbar h-full overflow-y-auto bg-white">
      <div className="flex min-h-full flex-col px-6 pb-6 pt-8 md:pt-12">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-brand">VHome · Vistaland</span>
          <LangToggle />
        </div>
        <h1 className="mt-3 text-[26px] font-extrabold leading-tight">{t('login.title')}</h1>
        <MoniBubble className="mt-4" pose="waveSm">{t('login.moni')}</MoniBubble>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <Field label={t('login.phone')}>
            <Input inputMode="tel" autoComplete="tel" placeholder="0812 3456 7890" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label={t('login.ktp')} hint={t('login.ktpHint')}>
            <Input inputMode="numeric" placeholder="3275 xxxx xxxx xxxx" value={ktp} onChange={(e) => setKtp(e.target.value)} />
          </Field>
          {error && <p className="rounded-xl bg-[#FDE8EA] px-3 py-2.5 text-sm font-medium text-[#B4192A]">{error}</p>}
          <Button block size="lg" loading={busy} type="submit">{t('login.submit')}</Button>
        </form>
        <p className="mt-3 flex items-start gap-2 text-xs text-ink/50">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#17703D]" />
          {t('login.privacy')}
        </p>
        <div className="mt-6 rounded-2xl bg-paper p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink/45">{t('login.demo')}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {RESIDENT_PERSONAS.map((p) => (
              <button key={p.key} type="button" onClick={() => { setPhone(p.phone); setKtp(p.ktp); setError(null); }} className="rounded-full border border-line bg-white px-2.5 py-1 text-xs font-semibold hover:border-brand/50">
                {p.name.split(' ')[0]} · {p.unit.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-ink/45">{t('login.renterNote')}</p>
        <div className="flex-1" />
        <DevelopedBy className="mt-6" />
      </div>
    </SegmentTheme>
  );
}
