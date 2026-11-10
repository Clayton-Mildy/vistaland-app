# VHome customer app: premium visual refresh

**Status:** approved in conversation, 10 Nov 2026 · **Applies to:** the resident app (`src/apps/resident`) for both projects and the renter view.

## Why

The prototype works end to end but the customer app still looks like a prototype: many competing colors, a crowded home screen, placeholder letters instead of photos and leftover prototype labels. It will be shown to the client (Vistaland), so it needs to look like a finished product.

The direction agreed with the user is **"calm and premium"**, built on the structure of the client's own design (`MONI CUSTOMER APP Prototype.pdf`), and made more refined.

## Constraints

- Keep the client's colors: red for commercial projects, teal for subsidized projects, gold as the accent. Keep Moni the deer.
- Follow the client's PDF structure:
  - a deep red header band holding search, SOS and the unit line;
  - white cards overlapping that band;
  - grouped icon menus;
  - vouchers and estate news on the home screen;
  - "Developed by …" on every screen.
- Change looks only. No behavior, data or flow changes, and every existing test keeps passing.
- The dashboard and staff app keep their current look. Shared UI components may only change in ways that leave those apps looking the same; resident-only looks go in resident components or opt-in variants.
- Indonesian and English stay complete. No raw keys or unfilled placeholders.

## Visual language

| Element | Rule |
|---|---|
| Header and primary color | Deep brand (`brand-dark`: #B01222 commercial, #0B4A44 subsidized) for title bands and primary buttons. The brighter brand (#D7192B / #0F5F57) is used for active states and links only. |
| Accent | Gold #E8BE5A only for small accents: the project name eyebrow, the current progress step, news markers, and the Moni welcome card edge. Never on large fills or body text. |
| Surfaces | Warm off-white page (#F5F3EF). White cards with a hairline border (#E7E2D9) and the existing soft card shadow, radius 16px. |
| Status | One muted status color per meaning: red = overdue or rejected, green = paid or done, amber = in progress or due, neutral = free or info. At most one status pill per card. |
| Type | Plus Jakarta Sans. Sizes 24 / 20 / 16 / 14 / 12; **nothing below 12px**. Headings semibold (600), body regular (400); no 800 weights. Money and counts use tabular figures. The eyebrow label (small, uppercase, letter-spaced, gold on the red band) is used once per screen at most. |
| Icons | Lucide line icons, all in one tint: brand-dark icon on a soft brand-tint rounded square (34px). No per-icon rainbow colors. |
| Buttons | Pill-shaped. Primary = deep brand fill. Secondary = white with hairline border. One primary button per card. |
| Spacing | 16px page gutter, 12px between cards, 16px inside cards. |

## Screen pattern

Every screen uses one of two frames.

1. **Home frame** (home screens):
   - a deep brand band with search, notifications and SOS;
   - the project eyebrow (gold), the greeting and the unit line;
   - a **house card** overlapping the band: the unit's house photo with an occupancy pill, plus the one thing to act on (the IPL bill or the next onboarding step) and its primary button.
2. **Inner frame** (all other screens):
   - a deep brand **title band** with the back button, title, optional eyebrow and optional key figure (e.g. the amount due, or the complaint stage with a 7-segment progress bar);
   - the first white card overlaps the band.
   - This replaces the current white `AppBar` on resident screens.

Bottom navigation: white, hairline top border, active item in brand. "Developed by Vistaland" moves from under the bottom menu to the end of each page's scroll content.

## Home screens

- **Commercial home:**
  - a house card (photo, occupancy, IPL due and Bayar);
  - the onboarding checklist card with Moni while onboarding is incomplete;
  - a compact status row (IPL, WiFi, cards);
  - pay-ahead offers;
  - grouped menus ("Rumah saya", "Keamanan dan lingkungan", "Komunitas warga") in single-tint tiles;
  - vouchers (calm cards: partner initials disc, offer line, validity);
  - marketplace (photos; house listings use the unit's house photo, items use a neutral category icon instead of a big letter);
  - other projects (photos) and estate news (gold marker).
- **Subsidized home:** the same frame in teal, with the shorter menu and no house listings.
- **Renter home:** the same frame with the lease line and "Unit milik …" in the band, plus the renter checklist.
- **Promo carousel:** calm cards with an image or icon on the left, a short title and a text link. No mascot and no shouty display type.

## Screens in scope

- **Auth:**
  - splash (Moni, kept);
  - login: Moni greeting kept but smaller; demo accounts fold into an "Akun demo" link that expands;
  - OTP: the demo code stays as a quiet hint;
  - unit picker and welcome: inner frame or a brand splash.
- **Billing:** bills (IPL and WiFi tabs), the pay sheet, WiFi and cards.
- **Onboarding:** handover, rules, move-in.
- **Complaints:** the complaint home, capture (the AI verdict for the resident's own photo is kept, restyled) and the tracker (title band with the stage and the 7-segment bar).
- **Home and household:** renovation and its detail, renters and the registration wizard, legal, emergency and CCTV.
- **Community:** marketplace, listing detail, listing post, vouchers, businesses, projects, handbook, feedback.
- **Account and system:** account, notifications, and locked screens (Moni with the reason).

## Moni

Moni appears on:
- splash;
- welcome / congratulations;
- the onboarding checklist card;
- empty states;
- locked screens;
- a smaller greeting on login.

Moni is removed from promo banners and repeated speech bubbles.

## Prototype leftovers

- "VHome prototype · v0.1" becomes "VHome · versi 1.0" ("VHome · version 1.0" in English).
- Demo accounts on login fold behind "Akun demo".
- The OTP demo code stays, as a quiet hint.
- The floating demo controls on `/demo` are unchanged.

## Acceptance

- `npm test` all green, and `npm run build` clean.
- Every resident route checked at 390×844 for:
  - both projects (Vista Harmoni red, Harmoni Park teal);
  - the renter view (Sari);
  - an onboarding owner (Rina);
  - both languages.
- No text below 12px in the resident app. No rainbow icon tints. No raw keys or `{placeholder}` leftovers. No horizontal overflow.
- Dashboard and staff app screenshots look the same as before.
