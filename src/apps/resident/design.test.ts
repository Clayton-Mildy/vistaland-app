import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

/**
 * Files moved onto the premium look. Each task of the refresh adds its files here;
 * the final task replaces this list with every file in the resident app.
 */
export const REFRESHED: string[] = [
  'src/apps/resident/ResidentShell.tsx',
  // Task 2
  'src/ui/IconTile.tsx',
  'src/apps/resident/home/MenuGrid.tsx',
  'src/apps/resident/ui/ScreenHeader.tsx',
  'src/apps/resident/ui/ScreenBody.tsx',
  'src/apps/resident/ui/HomeBand.tsx',
  'src/apps/resident/ui/HouseCard.tsx',
  // Task 3
  'src/apps/resident/auth/Splash.tsx',
  'src/apps/resident/auth/Login.tsx',
  'src/apps/resident/auth/Otp.tsx',
  'src/apps/resident/auth/UnitPicker.tsx',
  'src/apps/resident/auth/Welcome.tsx',
  // Task 4
  'src/apps/resident/home/CommercialHome.tsx',
  'src/apps/resident/home/OnboardingCard.tsx',
  'src/apps/resident/home/StatusCards.tsx',
  'src/apps/resident/PrepayGrid.tsx',
  // Task 5
  'src/apps/resident/home/SubsidizedHome.tsx',
  'src/apps/resident/home/RenterHome.tsx',
];

const RULES: [string, RegExp][] = [
  ['text below 12px', /text-\[(9|10|10\.5|11)px\]/],
  ['extra-bold or black weight', /font-(extrabold|black)/],
  ['rainbow tile tints (TONES)', /\bTONES\b/],
  ['the old white app bar', /ui\/AppBar/],
  ['a hard-coded brand red (breaks teal projects)', /#(D7192B|B01222)\b/i],
];

describe('premium design rules', () => {
  test.each(REFRESHED)('%s follows the premium design rules', (file) => {
    expect(existsSync(file), `${file} does not exist`).toBe(true);
    const src = readFileSync(file, 'utf8');
    const broken = RULES.filter(([, re]) => re.test(src)).map(([name]) => name);
    expect(broken, `${file} breaks: ${broken.join(', ')}`).toEqual([]);
  });
});
