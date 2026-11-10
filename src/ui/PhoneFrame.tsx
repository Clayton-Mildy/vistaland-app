import type { ReactNode } from 'react';

/**
 * ≥768px: a 390×844 device on a soft backdrop (with optional side content).
 * Below: full screen. The screen has a transform so `fixed` overlays stay inside it.
 */
export function PhoneFrame({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-paper md:flex md:items-center md:justify-center md:gap-10 md:bg-[radial-gradient(ellipse_at_top,#ffffff,#ECE7DE)] md:p-6">
      <div className="relative h-[100dvh] w-full md:h-[844px] md:w-[390px] md:shrink-0 md:rounded-[46px] md:border-[10px] md:border-[#1A1D24] md:shadow-[0_40px_80px_-30px_rgba(17,24,39,0.45)]">
        <div className="relative h-full w-full overflow-hidden bg-paper [transform:translateZ(0)] md:rounded-[36px]">{children}</div>
        <div className="pointer-events-none absolute left-1/2 top-2 hidden h-6 w-28 -translate-x-1/2 rounded-full bg-[#1A1D24] md:block" />
      </div>
      {aside && <div className="hidden w-[300px] md:block">{aside}</div>}
    </div>
  );
}
