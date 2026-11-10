import type { ReactNode } from 'react';

/** Home header band: the top row (search, bell, SOS) as children, then the gold project eyebrow, greeting and unit line. */
export function HomeBand({ eyebrow, greeting, unitLine, right, children }: { eyebrow: ReactNode; greeting: ReactNode; unitLine: ReactNode; right?: ReactNode; children?: ReactNode }) {
  return (
    <header className="bg-brand-dark px-4 pb-14 pt-4 text-white md:pt-9">
      {children}
      <p className="mt-5 truncate text-xs font-medium uppercase tracking-[0.12em] text-gold">{eyebrow}</p>
      <div className="mt-0.5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold leading-tight">{greeting}</h1>
          <p className="truncate text-sm text-white/75">{unitLine}</p>
        </div>
        {right}
      </div>
    </header>
  );
}
