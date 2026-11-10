import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../../../i18n';
import { useResident } from '../../../store/hooks';
import { Moni } from '../../../ui/Moni';

export default function Splash() {
  const t = useT();
  const nav = useNavigate();
  const signedIn = !!useResident();
  useEffect(() => {
    const id = setTimeout(() => nav(signedIn ? '/app/home' : '/app/login', { replace: true }), 1400);
    return () => clearTimeout(id);
  }, [nav, signedIn]);
  return (
    <div className="relative flex h-full flex-col items-center justify-center bg-brand-dark text-white">
      <Moni pose="wave" size={120} />
      <h1 className="mt-5 text-4xl font-semibold tracking-tight">VHome</h1>
      <span className="mt-3 h-px w-10 bg-gold" />
      <p className="mt-3 max-w-[230px] text-center text-sm text-white/80">{t('app.tagline')}</p>
      <p className="absolute bottom-8 text-xs text-white/65">
        {t('common.developedBy')} <span className="font-semibold text-white">Vistaland</span>
      </p>
    </div>
  );
}
