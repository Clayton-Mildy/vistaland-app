import type { ReactNode } from 'react';
import { useT } from '../../../i18n';
import { useDashboardProject } from '../../../store/hooks';

export function PageHeader({ title, subtitle, actions, kicker }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; kicker?: ReactNode }) {
  const t = useT();
  const project = useDashboardProject();
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-brand">
          {kicker ?? project.name}
          <span className="rounded-md bg-[#FBF0D0] px-1.5 py-0.5 text-[10px] tracking-normal text-[#7A5600]">{t('dash.demoData')}</span>
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink/55">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
