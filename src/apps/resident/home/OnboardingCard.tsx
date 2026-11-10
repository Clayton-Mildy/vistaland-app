import { Check, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { nextOnboardingStep, onboardingSteps } from '../../../domain/onboarding';
import { useT } from '../../../i18n';
import { useData, useResident } from '../../../store/hooks';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { MoniBubble } from '../../../ui/MoniBubble';
import { Progress } from '../../../ui/Progress';
import { STEP_ROUTE } from '../auth/Welcome';

export function OnboardingCard() {
  const t = useT();
  const nav = useNavigate();
  const ctx = useResident();
  const permit = useData((d) => d.moveIns.find((m) => m.unitId === ctx?.unit.id && m.who === 'owner' && m.status !== 'cancelled'));
  if (!ctx) return null;
  const steps = onboardingSteps(ctx.unit, { moveIn: permit });
  const next = nextOnboardingStep(steps);
  if (!next) return null;
  const done = steps.filter((s) => s.done).length;
  return (
    <Card className="p-0">
      <div className="px-4 pt-4">
        <MoniBubble size={48}>{t(`home.moni.${next}`, { name: ctx.name.split(' ')[0] })}</MoniBubble>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[15px] font-bold">{t('home.prepare')}</span>
          <span className="text-xs font-semibold text-ink/50">{t('home.prepareCount', { n: done, total: steps.length })}</span>
        </div>
        <Progress className="mt-2" value={(done / steps.length) * 100} />
      </div>
      <ul className="mt-2 divide-y divide-line">
        {steps.map((s) => (
          <li key={s.key}>
            <button disabled={s.key === 'app' || s.key === 'occupied'} onClick={() => nav(STEP_ROUTE[s.key])} className="flex w-full items-center gap-3 px-4 py-2.5 text-left disabled:cursor-default">
              <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2', s.done ? 'border-brand bg-brand text-white' : s.key === next ? 'border-brand' : 'border-line')}>
                {s.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cx('block text-sm', s.done ? 'text-ink/60' : 'font-semibold')}>{t(`onboarding.${s.key}`)}</span>
                <span className="block truncate text-[11px] text-ink/45">{t(`onboarding.${s.key}.hint`)}</span>
              </span>
              {s.key === next && s.key !== 'occupied' ? (
                <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white">{t('home.doIt')}</span>
              ) : s.done && s.key !== 'app' && s.key !== 'occupied' ? (
                <ChevronRight className="h-4 w-4 text-ink/25" />
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
