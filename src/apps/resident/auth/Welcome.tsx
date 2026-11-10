import { ArrowRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../../domain/clock';
import { nextOnboardingStep, onboardingSteps, type OnboardingKey } from '../../../domain/onboarding';
import { useLang, useT } from '../../../i18n';
import { useData, useResident } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Confetti } from '../../../ui/Confetti';
import { cx } from '../../../ui/cx';
import { Moni } from '../../../ui/Moni';
import { SegmentTheme } from '../../../ui/SegmentTheme';

export const STEP_ROUTE: Record<OnboardingKey, string> = { handover: '/app/handover', app: '/app/home', rules: '/app/rules', moveIn: '/app/move-in', occupied: '/app/move-in' };

export default function Welcome() {
  const t = useT();
  const [lang] = useLang();
  const nav = useNavigate();
  const ctx = useResident();
  const permit = useData((d) => d.moveIns.find((m) => m.unitId === ctx?.unit.id && m.status !== 'cancelled'));
  const tx = useData((d) => d.vles.transactions.find((x) => x.unit_id === ctx?.unit.vlesUnitId && x.status === 'active'));
  if (!ctx) return null;
  const steps = onboardingSteps(ctx.unit, { moveIn: permit });
  const next = nextOnboardingStep(steps);
  return (
    <SegmentTheme theme={ctx.segment} className="no-scrollbar h-full overflow-y-auto bg-paper">
      <div className="relative overflow-hidden bg-gradient-to-b from-brand to-brand-dark px-6 pb-24 pt-10 text-center text-white md:pt-14">
        <Confetti />
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">{ctx.project.name}</p>
        <h1 className="mt-2 text-4xl font-extrabold">{t('welcome.title')}</h1>
        <p className="mt-1 text-sm text-white/85">{t('welcome.body')}</p>
        <Moni pose="thumbs" size={130} className="mx-auto mt-3" />
      </div>
      <div className="relative -mt-16 px-5">
        <div className="rounded-2xl bg-white p-4 shadow-lift">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold">{ctx.unit.code} · {ctx.type.name}</span>
          </div>
          <dl className="mt-2 space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-ink/50">{t('welcome.owner')}</dt><dd className="font-semibold">{ctx.name}</dd></div>
            {tx && <div className="flex justify-between"><dt className="text-ink/50">{t('welcome.akad')}</dt><dd className="font-semibold">{formatDate(tx.akad_date, lang)} · {tx.payment_scheme}</dd></div>}
            <div className="flex justify-between"><dt className="text-ink/50">{t('welcome.handover')}</dt><dd className="font-semibold">{ctx.unit.handover.bastDate ? formatDate(ctx.unit.handover.bastDate, lang) : t('welcome.handoverPending')}</dd></div>
          </dl>
        </div>
        <h2 className="mb-2 mt-5 px-1 text-[15px] font-bold">{t('welcome.steps')}</h2>
        <div className="space-y-2">
          {steps.map((s, i) => (
            <div key={s.key} className={cx('flex items-center gap-3 rounded-2xl border bg-white p-3', s.key === next ? 'border-brand ring-2 ring-brand/10' : 'border-line')}>
              <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold', s.done ? 'bg-brand text-white' : 'bg-paper text-ink/50')}>
                {s.done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t(`onboarding.${s.key}`)}</p>
                <p className="text-xs text-ink/50">{t(`onboarding.${s.key}.hint`)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 space-y-2 pb-6">
          {next && next !== 'app' && <Button block size="lg" icon={<ArrowRight className="h-4 w-4" />} onClick={() => nav(STEP_ROUTE[next], { replace: true })}>{t(`onboarding.${next}.cta`)}</Button>}
          <Button block variant="ghost" onClick={() => nav('/app/home', { replace: true })}>{t('welcome.later')}</Button>
        </div>
      </div>
    </SegmentTheme>
  );
}
