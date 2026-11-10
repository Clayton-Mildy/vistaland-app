import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { AccessReason } from '../../../domain/access';
import { useT } from '../../../i18n';
import { useAccess } from '../../../store/hooks';
import type { ResidentFeature } from '../../../domain/types';
import { AppBar } from '../../../ui/AppBar';
import { Button } from '../../../ui/Button';
import { Moni } from '../../../ui/Moni';

const CTA: Partial<Record<AccessReason, string>> = { notOccupied: '/app/move-in', noBast: '/app/handover' };

export default function Locked() {
  const t = useT();
  const nav = useNavigate();
  const { feature } = useParams();
  const access = useAccess()(feature as ResidentFeature);
  const reason = ((useLocation().state as { reason?: AccessReason } | null)?.reason ?? (access.ok ? 'disabled' : access.reason)) as AccessReason;
  const cta = CTA[reason];
  return (
    <div>
      <AppBar title={t(`feature.${feature}`)} />
      <div className="flex flex-col items-center px-8 pt-10 text-center">
        <div className="relative">
          <Moni pose="crossed" size={130} />
          <span className="absolute -right-24 top-3 max-w-[140px] rounded-2xl rounded-bl-md bg-brand-tint px-3 py-2 text-left text-xs font-semibold text-brand-dark">{t('locked.bubble')}</span>
        </div>
        <h2 className="mt-5 text-xl font-bold">{t(`locked.title.${reason}`)}</h2>
        <p className="mt-2 text-sm text-ink/55">{t(`locked.body.${reason}`)}</p>
        {cta && <Button className="mt-6" onClick={() => nav(cta)}>{t(`locked.cta.${reason}`)}</Button>}
        <Button className="mt-2" variant="ghost" onClick={() => nav('/app/home')}>{t('locked.home')}</Button>
      </div>
    </div>
  );
}
