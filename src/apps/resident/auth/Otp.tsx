import { ChevronLeft, MessageSquareText } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { ResidentIdentity } from '../../../domain/types';
import { useT } from '../../../i18n';
import { activateApp, startResidentSession } from '../../../store/actions';
import { useStore } from '../../../store/store';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Field';
import { SegmentTheme } from '../../../ui/SegmentTheme';
import { useToast } from '../../../ui/Toast';

const newCode = () => String(Math.floor(100000 + Math.random() * 900000));

export default function Otp() {
  const t = useT();
  const nav = useNavigate();
  const toast = useToast();
  const state = useLocation().state as { identity: ResidentIdentity; unitIds: string[]; phone: string } | null;
  const [code, setCode] = useState(newCode);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const masked = useMemo(() => (state ? state.phone.replace(/\D/g, '').replace(/^(\d{4})\d+(\d{3})$/, '$1••••$2') : ''), [state]);

  // Announce each code once (StrictMode runs mount effects twice in development).
  const announced = useRef<string | null>(null);
  useEffect(() => {
    if (announced.current === code) return;
    announced.current = code;
    toast.show(t('otp.sms', { code }), 'info');
  }, [code, t, toast]);

  if (!state) return <Navigate to="/app/login" replace />;

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() !== code) return setError(t('otp.wrong'));
    const { run, data } = useStore.getState();
    const firstUnit = state.unitIds[0];
    const firstTime = state.identity.kind === 'owner' && !data.units.find((u) => u.id === firstUnit)?.appActivatedAt;
    run(startResidentSession, { identity: state.identity, unitId: firstUnit });
    if (state.unitIds.length > 1) return nav('/app/units', { replace: true });
    if (state.identity.kind === 'owner') run(activateApp, { unitId: firstUnit });
    nav(firstTime ? '/app/welcome' : '/app/home', { replace: true });
  };

  return (
    <SegmentTheme theme="komersil" className="h-full bg-white px-6 pt-6 md:pt-12">
      <button onClick={() => nav(-1)} className="-ml-2 rounded-full p-1.5 text-ink/60 hover:bg-paper" aria-label="back">
        <ChevronLeft className="h-6 w-6" />
      </button>
      <h1 className="mt-3 text-[26px] font-extrabold">{t('otp.title')}</h1>
      <p className="mt-1 text-sm text-ink/55">{t('otp.body', { phone: masked })}</p>
      <div className="mt-4 flex items-start gap-2 rounded-2xl bg-[#FBF0D0] p-3 text-xs text-[#7A5600]">
        <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{t('otp.demo')} <b className="font-mono text-sm tracking-widest">{code}</b></span>
      </div>
      <form onSubmit={verify} className="mt-5 space-y-4">
        <Input autoFocus inputMode="numeric" maxLength={6} value={value} onChange={(e) => { setValue(e.target.value.replace(/\D/g, '')); setError(null); }} className="h-14 text-center font-mono text-2xl tracking-[0.5em]" placeholder="••••••" />
        {error && <p className="text-sm font-medium text-[#B4192A]">{error}</p>}
        <Button block size="lg" type="submit" disabled={value.length !== 6}>{t('otp.verify')}</Button>
      </form>
      <button onClick={() => { setCode(newCode()); setValue(''); }} className="mt-4 w-full text-center text-sm font-semibold text-brand-dark">{t('otp.resend')}</button>
    </SegmentTheme>
  );
}
