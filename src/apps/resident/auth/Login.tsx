import { ChevronDown, ShieldCheck } from 'lucide-react';
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
  const [demoOpen, setDemoOpen] = useState(false);

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
    <SegmentTheme theme="komersil" className="no-scrollbar h-full overflow-y-auto bg-paper">
      <header className="bg-brand-dark px-6 pb-14 pt-6 text-white md:pt-12">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-gold">VHome · Vistaland</span>
          <LangToggle dark />
        </div>
        <h1 className="mt-5 text-2xl font-semibold leading-tight">{t('login.title')}</h1>
      </header>
      <div className="-mt-10 px-4 pb-6">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <MoniBubble size={52}>{t('login.moni')}</MoniBubble>
          <form onSubmit={submit} className="mt-4 space-y-4">
            <Field label={t('login.phone')}>
              <Input inputMode="tel" autoComplete="tel" placeholder="0812 3456 7890" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label={t('login.ktp')} hint={t('login.ktpHint')}>
              <Input inputMode="numeric" placeholder="3275 xxxx xxxx xxxx" value={ktp} onChange={(e) => setKtp(e.target.value)} />
            </Field>
            {error && <p className="rounded-xl bg-[#FDE8EA] px-3 py-2.5 text-sm font-medium text-[#B4192A]">{error}</p>}
            <Button block size="lg" loading={busy} type="submit">{t('login.submit')}</Button>
          </form>
        </div>
        <p className="mt-4 flex items-start gap-2 px-1 text-xs text-ink/55">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#17703D]" />
          {t('login.privacy')}
        </p>
        <div className="mt-6 text-center">
          <button type="button" aria-expanded={demoOpen} onClick={() => setDemoOpen((o) => !o)} className="inline-flex items-center gap-1 text-sm font-medium text-ink/60 hover:text-ink">
            {t('login.demoToggle')}
            <ChevronDown className={demoOpen ? 'h-4 w-4 rotate-180 transition' : 'h-4 w-4 transition'} />
          </button>
          {demoOpen && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {RESIDENT_PERSONAS.map((p) => (
                <button key={p.key} type="button" onClick={() => { setPhone(p.phone); setKtp(p.ktp); setError(null); }} className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium hover:border-brand/50">
                  {p.name.split(' ')[0]} · {p.unit.split(' ')[0]}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="mt-5 text-center text-xs text-ink/50">{t('login.renterNote')}</p>
        <DevelopedBy className="mt-8" />
      </div>
    </SegmentTheme>
  );
}
