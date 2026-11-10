import type { CSSProperties } from 'react';
import type { Segment } from '../domain/types';

export type ThemeKey = Segment | 'security' | 'mandor' | 'gardener' | 'admin';

/** Brand colours from the wireframes, as RGB triplets for Tailwind's alpha syntax. */
export const SEGMENT_THEME: Record<ThemeKey, { brand: string; brandDark: string; tint: string; hex: string }> = {
  komersil: { brand: '215 25 43', brandDark: '176 18 34', tint: '253 236 238', hex: '#D7192B' },
  subsidi: { brand: '15 95 87', brandDark: '11 74 68', tint: '228 241 238', hex: '#0F5F57' },
  security: { brand: '17 24 39', brandDark: '3 7 18', tint: '238 240 244', hex: '#111827' },
  mandor: { brand: '194 65 12', brandDark: '154 52 18', tint: '255 241 232', hex: '#C2410C' },
  gardener: { brand: '27 94 54', brandDark: '20 71 42', tint: '230 242 234', hex: '#1B5E36' },
  admin: { brand: '215 25 43', brandDark: '176 18 34', tint: '253 236 238', hex: '#D7192B' },
};

export const themeStyle = (key: ThemeKey): CSSProperties =>
  ({ '--brand': SEGMENT_THEME[key].brand, '--brand-dark': SEGMENT_THEME[key].brandDark, '--brand-tint': SEGMENT_THEME[key].tint }) as CSSProperties;

export const TONES = {
  yellow: 'bg-[#FFF4D6] text-[#B7791F]',
  red: 'bg-[#FDE8EA] text-[#C81E2E]',
  orange: 'bg-[#FFEBDD] text-[#D2611B]',
  green: 'bg-[#E3F5E9] text-[#1F8A4C]',
  aqua: 'bg-[#DDF4F2] text-[#11847B]',
  blue: 'bg-[#E3EEFD] text-[#2463C9]',
  violet: 'bg-[#EEE9FD] text-[#6B4FD8]',
  grey: 'bg-[#EEF0F3] text-[#5B6472]',
} as const;
export type Tone = keyof typeof TONES;
