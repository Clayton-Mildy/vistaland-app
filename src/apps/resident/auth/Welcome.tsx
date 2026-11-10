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
import { Section } from '../../../ui/Section';
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
      <div className="relative overflow-hidden bg-brand-dark px-6 pb-24 pt-10 text-center text-white md:pt-14">
        <Confetti />
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-gold">{ctx.project.name}</p>
        <h1 className="mt-2 text-3xl font-semibold">{t('welcome.title')}</h1>
        <p className="mt-1 text-sm text-white/80">{t('welcome.body')}</p>
        <Moni pose="thumbs" size={110} className="mx-auto mt-4" />
      </div>
      <div className="relative -mt-16 space-y-3 px-4 pb-4">
        <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
          <p className="text-base font-semibold">{ctx.unit.code} · {ctx.type.name}</p>
          <dl className="mt-2 space-y-1.5 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-ink/55">{t('welcome.owner')}</dt><dd className="truncate font-medium">{ctx.name}</dd></div>
            {tx && <div className="flex justify-between gap-3"><dt className="text-ink/55">{t('welcome.akad')}</dt><dd className="font-medium">{formatDate(tx.akad_date, lang)} · {tx.payment_scheme}</dd></div>}
            <div className="flex justify-between gap-3"><dt className="text-ink/55">{t('welcome.handover')}</dt><dd className="font-medium">{ctx.unit.handover.bastDate ? formatDate(ctx.unit.handover.bastDate, lang) : t('welcome.handoverPending')}</dd></div>
          </dl>
        </div>
        <Section title={t('welcome.steps')} className="mt-4">
          <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            {steps.map((s, i) => (
              <div key={s.key} className={cx('flex items-center gap-3 p-4', i > 0 && 'border-t border-line', s.key === next && 'bg-brand-tint/40')}>
                <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold', s.done ? 'bg-brand-dark text-white' : s.key === next ? 'border-2 border-brand-dark text-brand-dark' : 'bg-paper text-ink/45')}>
                  {s.done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t(`onboarding.${s.key}`)}</p>
                  <p className="text-xs text-ink/55">{t(`onboarding.${s.key}.hint`)}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
        <div className="space-y-2 pt-2">
          {next && next !== 'app' && <Button block size="lg" icon={<ArrowRight className="h-4 w-4" />} onClick={() => nav(STEP_ROUTE[next], { replace: true })}>{t(`onboarding.${next}.cta`)}</Button>}
          <Button block variant="ghost" onClick={() => nav('/app/home', { replace: true })}>{t('welcome.later')}</Button>
        </div>
      </div>
    </SegmentTheme>
  );
}
