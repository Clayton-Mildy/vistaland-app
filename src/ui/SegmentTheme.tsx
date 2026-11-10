import type { ReactNode } from 'react';
import { themeStyle, type ThemeKey } from './theme';

export function SegmentTheme({ theme, className, children }: { theme: ThemeKey; className?: string; children: ReactNode }) {
  return (
    <div style={themeStyle(theme)} className={className}>
      {children}
    </div>
  );
}
