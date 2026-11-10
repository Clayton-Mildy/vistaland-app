import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { AccessReason } from '../../../domain/access';
import type { ResidentFeature } from '../../../domain/types';
import { useT } from '../../../i18n';
import { useAccess } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Moni } from '../../../ui/Moni';
import { ScreenBody } from '../ui/ScreenBody';
import { ScreenHeader } from '../ui/ScreenHeader';

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
      <ScreenHeader title={t(`feature.${feature}`)} />
      <ScreenBody>
        <Card className="flex flex-col items-center px-6 py-8 text-center">
          <Moni pose="crossed" size={110} />
          <h2 className="mt-4 text-xl font-semibold">{t(`locked.title.${reason}`)}</h2>
          <p className="mt-2 text-sm text-ink/55">{t(`locked.body.${reason}`)}</p>
          {cta && <Button className="mt-6" onClick={() => nav(cta)}>{t(`locked.cta.${reason}`)}</Button>}
          <Button className="mt-2" variant="ghost" onClick={() => nav('/app/home')}>{t('locked.home')}</Button>
        </Card>
      </ScreenBody>
    </div>
  );
}
