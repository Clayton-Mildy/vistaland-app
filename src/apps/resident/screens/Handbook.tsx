import { HANDBOOK_SECTIONS } from '../../../data/content';
import { useT } from '../../../i18n';
import { useResident } from '../../../store/hooks';
import { Card } from '../../../ui/Card';
import { FloorPlan } from '../FloorPlan';
import { useLocalized } from '../hooks';
import { ScreenBody } from '../ui/ScreenBody';
import { ScreenHeader } from '../ui/ScreenHeader';

export default function Handbook() {
  const t = useT();
  const L = useLocalized();
  const ctx = useResident()!;
  return (
    <div>
      <ScreenHeader title={t('feature.handbook')} eyebrow={ctx.project.name} />
      <ScreenBody>
        {HANDBOOK_SECTIONS.map((s, i) => (
          <Card key={i}>
            <h3 className="text-base font-semibold">{L(s.title)}</h3>
            <p className="mt-1 text-sm text-ink/60">{L(s.body)}</p>
          </Card>
        ))}
        <Card>
          <h3 className="mb-3 text-base font-semibold">{t('handbook.plan', { type: ctx.type.name })}</h3>
          <FloorPlan typeId={ctx.type.id} />
        </Card>
      </ScreenBody>
    </div>
  );
}
