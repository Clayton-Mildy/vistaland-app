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
  // Task 6
  'src/apps/resident/screens/Bills.tsx',
  'src/apps/resident/screens/PaySheet.tsx',
  'src/apps/resident/screens/Wifi.tsx',
  'src/apps/resident/screens/Cards.tsx',
  // Task 7
  'src/apps/resident/screens/Handover.tsx',
  'src/apps/resident/screens/Rules.tsx',
  'src/apps/resident/screens/MoveIn.tsx',
  // Task 8
  'src/apps/resident/screens/Complaint.tsx',
  'src/apps/resident/screens/ComplaintCapture.tsx',
  'src/apps/resident/screens/ComplaintTracker.tsx',
  'src/apps/resident/FloorPlan.tsx',
  // Task 9
  'src/apps/resident/screens/Renovation.tsx',
  'src/apps/resident/screens/RenovationDetail.tsx',
  'src/apps/resident/screens/Renters.tsx',
  'src/apps/resident/screens/RenterRegistrationWizard.tsx',
  'src/apps/resident/screens/Legal.tsx',
  'src/apps/resident/screens/Emergency.tsx',
  'src/apps/resident/screens/Cctv.tsx',
  // Task 10
  'src/apps/resident/screens/Marketplace.tsx',
  'src/apps/resident/screens/ListingDetail.tsx',
  'src/apps/resident/screens/ListingPost.tsx',
  'src/apps/resident/screens/Vouchers.tsx',
  'src/apps/resident/screens/Businesses.tsx',
  'src/apps/resident/screens/Projects.tsx',
  'src/apps/resident/screens/Handbook.tsx',
  'src/apps/resident/screens/Feedback.tsx',
  'src/apps/resident/screens/Account.tsx',
  'src/apps/resident/screens/Notifications.tsx',
  'src/apps/resident/screens/Locked.tsx',
  'src/apps/resident/ComingSoon.tsx',
  'src/apps/resident/listingMeta.ts',
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
