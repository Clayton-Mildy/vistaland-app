import { HANDBOOK_SECTIONS } from '../../../data/content';
import { useT } from '../../../i18n';
import { useResident } from '../../../store/hooks';
import { AppBar } from '../../../ui/AppBar';
import { Card } from '../../../ui/Card';
import { FloorPlan } from '../FloorPlan';
import { useLocalized } from '../hooks';

export default function Handbook() {
  const t = useT();
  const L = useLocalized();
  const ctx = useResident()!;
  return (
    <div>
      <AppBar title={t('feature.handbook')} subtitle={ctx.project.name} />
      <div className="space-y-3 p-4">
        {HANDBOOK_SECTIONS.map((s, i) => (
          <Card key={i}>
            <h3 className="font-bold">{L(s.title)}</h3>
            <p className="mt-1 text-sm text-ink/60">{L(s.body)}</p>
          </Card>
        ))}
        <Card>
          <h3 className="mb-3 font-bold">{t('handbook.plan', { type: ctx.type.name })}</h3>
          <FloorPlan typeId={ctx.type.id} />
        </Card>
      </div>
    </div>
  );
}
