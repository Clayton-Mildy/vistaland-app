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
    <div className="relative flex h-full flex-col items-center justify-center bg-gradient-to-b from-[#D7192B] to-[#8E0F1C] text-white">
      <span className="absolute left-10 top-24 h-2 w-2 rounded-full bg-gold" />
      <span className="absolute right-12 top-40 h-1.5 w-1.5 rounded-full bg-gold" />
      <Moni pose="wave" size={170} />
      <h1 className="mt-4 text-5xl font-extrabold tracking-tight">VHome</h1>
      <p className="mt-2 max-w-[220px] text-center text-sm text-white/85">{t('app.tagline')}</p>
      <p className="absolute bottom-8 text-[11px] text-white/70">
        {t('common.developedBy')} <span className="font-bold text-white">Vistaland</span>
      </p>
    </div>
  );
}
