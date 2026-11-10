# Customer App Premium Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle every screen of the VHome customer app (`/app`) into the agreed "calm and premium" look built on the client's MONI PDF. Change looks only.

**Architecture:**
- A static **design guard** test pins the visual rules (no tiny text, no heavy weights, no rainbow tints, no old app bar, no hard-coded brand reds) for every file a task has refreshed.
- A **premium flavor** React context makes the shared `Button`, `Card`, `StatusPill`, `Section` and `DevelopedBy` premium only inside the customer app, so the dashboard and staff app don't change.
- A small **resident design kit** (`ScreenHeader`, `ScreenBody`, `HomeBand`, `HouseCard`, single-tint `IconTile`, `houseFor`, `listingThumb`) carries the two screen frames.
- Screens are then moved onto the kit in groups.

**Tech Stack:** Vite 6, React 18, TypeScript strict, Tailwind 3.4 (brand colors as CSS variables via `SegmentTheme`), lucide-react, Vitest 2 (+ jsdom for UI tests).

**Spec:** `docs/superpowers/specs/2026-11-10-customer-app-premium-design.md`

## Global Constraints

- **Looks only.** No change to actions, store, domain, routes, copy meaning or data. Every existing test keeps passing (160 at plan time).
- **Colors:**
  - Primary and title bands use `bg-brand-dark` (commercial #B01222, subsidized #0B4A44). Active states and links use `text-brand`.
  - Gold `#E8BE5A` (`gold`) only for eyebrow labels, the current progress segment, news markers and the Moni welcome card edge.
  - Page background `bg-paper`. Cards are white with a `border-line` hairline, `rounded-2xl` (16px) and `shadow-card`.
  - Never hard-code `#D7192B` or `#B01222` in resident files, so teal projects never show red.
- **Status colors:** red = overdue or rejected, green = paid or done, amber (`warning`) = in progress or due, neutral = free or info. At most one `StatusPill` per card.
- **Type:**
  - Plus Jakarta Sans. Sizes `text-2xl` (24) / `text-xl` (20) / `text-base` (16) / `text-sm` (14) / `text-xs` (12).
  - **Nothing below 12px** in resident files: no `text-[9px]`, `text-[10px]`, `text-[10.5px]`, `text-[11px]`.
  - Weights: `font-semibold` for headings, `font-normal` or `font-medium` for body. No `font-extrabold` or `font-black`.
  - Money and counts use `tabular-nums` (the existing `tabular` class).
- **Icons:** lucide line icons, one tint. `IconTile` renders `text-brand-dark` on `bg-brand-tint`, `rounded-xl`, 44px square, with a 20px icon. No `TONES` in resident files.
- **Buttons:** pill-shaped (`rounded-full`). Primary is a flat `bg-brand-dark` with no gradient. One primary button per card.
- **Spacing:** 16px page gutter (`px-4`), 12px between cards (`space-y-3`), 16px inside cards (`p-4`).
- **Frames:**
  - Inner screens use `ScreenHeader` (deep brand band) followed by `ScreenBody` (first card overlaps the band by 32px).
  - Home screens use `HomeBand` followed by `HouseCard` overlapping it.
  - The old white `AppBar` is deleted at the end.
- **Footer:** "Developed by Vistaland" (`DevelopedBy`) sits at the end of the scroll content on every resident screen, never inside the bottom nav.
- **Moni:** only on splash, welcome, the onboarding checklist card, empty states, locked screens and a smaller login greeting (≤ 56px). Never inside promo cards.
- **Prototype leftovers:**
  - `VHome prototype · v0.1` becomes `VHome · versi 1.0` / `VHome · version 1.0`.
  - Login demo accounts fold behind an "Akun demo" toggle.
  - The OTP demo code stays, as a quiet hint.
- **i18n:** every new or changed string goes in both `id` and `en` (the parity test enforces this). No raw keys and no `{placeholder}` leftovers on screen.
- **Untouched:** the dashboard, staff app, launcher, public listing page and `/demo` look unchanged. Shared components change only under the premium flavor.
- **Commits:** one per task on `main`, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push after the final task only.

## Review Focus

1. **Teal projects (Harmoni Park):** every refreshed screen must render teal bands and buttons for Joko and Siti. A hard-coded brand red would leak; the guard checks the literals, and the browser sweep in Task 11 checks visually.
2. **Long or English text in title bands:** long unit lines, project names and the longer English strings must truncate or wrap inside 375px, with no horizontal overflow.
3. **Dashboard and staff unchanged:** the shared `Button`, `Card`, `StatusPill`, `Section` and `DevelopedBy` must render exactly their current classes when no flavor is provided (test in Task 1).
4. **Missing photos:**
   - a unit with no house photo gets a stable house photo from `houseFor`;
   - a listing with its own photos keeps them;
   - a listing without photos gets the house photo (house kinds) or a category icon, never a letter.
5. **Overlap frame edge cases:** screens whose first element isn't a card (capture camera, empty states, the locked screen), and bottom sheets and toasts (fixed inside the transformed phone). Nothing may be hidden under the band, and sheets must still open above the bottom nav.

---

### Task 1: Design guard, premium flavor and helpers

**Files:**
- Create: `src/apps/resident/design.test.ts`, `src/ui/flavor.tsx`, `src/ui/flavor.test.tsx`, `src/apps/resident/ui/media.ts`, `src/apps/resident/ui/media.test.ts`
- Modify: `src/ui/Button.tsx`, `src/ui/Card.tsx`, `src/ui/StatusPill.tsx`, `src/ui/Section.tsx`, `src/ui/Footer.tsx`, `src/apps/resident/routes.tsx` (wrap in `<UiFlavor value="premium">`)

**Interfaces:**
- Produces:
  - `UiFlavor({ value: 'standard' | 'premium', children })` and `useFlavor(): 'standard' | 'premium'` (default `'standard'`).
  - `houseFor(unit: { id: string; typeId: string }): string` returns `'house:N'` with N in 1..5, stable per `typeId`.
  - `listingThumb(listing: Listing, unit?: { id: string; typeId: string }): { photoId: string } | { icon: LucideIcon }`.
  - `REFRESHED: string[]` in `design.test.ts`: the files each task adds to.

- [ ] **Step 1: Write the failing tests**
  - `design.test.ts`:
    - Reads every file in `REFRESHED` (start with `src/apps/resident/ResidentShell.tsx`) and asserts none matches `/text-\[(9|10|10\.5|11)px\]/`, `/font-(extrabold|black)/`, `/\bTONES\b/`, `/ui\/AppBar/` or `/#(D7192B|B01222)\b/i`.
    - Asserts the file exists, so typos fail.
  - `flavor.test.tsx`:
    - With no provider, `Button`, `Card`, `StatusPill`, `Section` and `DevelopedBy` render their current class strings (copy them into the test).
    - Under `UiFlavor premium`:
      - `Button` primary has `rounded-full` and `bg-brand-dark` and no `bg-gradient-to-br`;
      - `StatusPill` has `text-xs`;
      - `Section` title has `text-base font-semibold`;
      - `DevelopedBy` has `text-xs`.
  - `media.test.ts`:
    - `houseFor` returns the same value for two units of one type, and values in `house:1..house:5`.
    - `listingThumb` returns the listing's own photo when it has one, `houseFor(unit)` for `rumahDisewakan`/`rumahDijual` without photos, and an icon for `jasa` without photos.
- [ ] **Step 2: Run them.** `npx vitest run src/apps/resident/design.test.ts src/ui/flavor.test.tsx src/apps/resident/ui/media.test.ts`. Expected: FAIL (ResidentShell uses `text-[10.5px]`; `flavor`/`media` modules are missing).
- [ ] **Step 3: Implement** `flavor.tsx` (context + hook) and `media.ts`, and premium branches in the five shared components:
  - Button: `rounded-full`, primary `bg-brand-dark text-white hover:bg-brand`, secondary `bg-white border border-line text-ink`.
  - Card: `rounded-2xl border-line`.
  - StatusPill: `text-xs font-medium`.
  - Section: `text-base font-semibold`.
  - DevelopedBy: `text-xs text-ink/45`.
  - Wrap the resident app in `UiFlavor premium`.
  - Fix the `ResidentShell` nav label size (`text-xs`) so the guard passes.
- [ ] **Step 4: Run** `npx vitest run`. Expected: all pass.
- [ ] **Step 5: Commit** `feat(resident): premium flavor, design guard and media helpers`.

### Task 2: Resident design kit and shell

**Files:**
- Create: `src/apps/resident/ui/ScreenHeader.tsx`, `src/apps/resident/ui/ScreenBody.tsx`, `src/apps/resident/ui/HomeBand.tsx`, `src/apps/resident/ui/HouseCard.tsx`, `src/apps/resident/ui/kit.test.tsx`
- Modify: `src/ui/IconTile.tsx` (single tint; drop the `tone` prop), `src/apps/resident/home/MenuGrid.tsx` (drop `tone` from `MENU`), `src/apps/resident/ResidentShell.tsx` (footer at the end of `<main>` always; nav keeps only the tabs), `design.test.ts` (`REFRESHED += IconTile, MenuGrid, kit files`)

**Interfaces:**
- Consumes: `UiFlavor`, `houseFor` (Task 1).
- Produces:
  - `ScreenHeader({ title, back = true, onBack?, right?, eyebrow?, figure?, sub?, children? })`:
    - `bg-brand-dark text-white`, `px-4 pt-4 md:pt-9 pb-12`;
    - title `text-base font-semibold`;
    - eyebrow `text-xs uppercase tracking-[0.12em] text-gold`;
    - figure `text-2xl font-semibold tabular`;
    - `children` (e.g. a progress bar) render under the figure.
  - `ScreenBody({ children, className? })`: `relative -mt-8 space-y-3 px-4 pb-4`.
  - `HomeBand({ eyebrow, greeting, unitLine, right?, children? })`: search, bell and SOS stay in `children`/`right`; `pb-14`.
  - `HouseCard({ photoId, occupancy, label, amount?, note?, action?, onClick? })`: a 120px photo with a white occupancy pill top-right, and a row with label, amount (`text-base font-semibold tabular`), note and one action.
  - `IconTile({ icon, label, locked?, badge?, onClick? })`.

- [ ] **Step 1: Write the failing test** `kit.test.tsx`:
  - `ScreenHeader` renders the title, eyebrow and figure inside an element with `bg-brand-dark`, and the back button navigates back.
  - `IconTile` has no `TONES` classes and renders `bg-brand-tint`.
  - `ResidentShell` renders `DevelopedBy` inside `main#resident-scroll` and not inside `nav`.
- [ ] **Step 2: Run it.** `npx vitest run src/apps/resident/ui/kit.test.tsx`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** the kit and the IconTile/MenuGrid/shell changes. Update every `IconTile` caller to drop `tone` (`tsc` lists them).
- [ ] **Step 4: Run** `npx vitest run` and `npx tsc -b`. Expected: all pass, no type errors.
- [ ] **Step 5: Commit** `feat(resident): design kit, single-tint tiles, footer at page end`.

### Task 3: Sign-in screens

**Files:** Modify `src/apps/resident/auth/{Splash,Login,Otp,UnitPicker,Welcome}.tsx`; i18n `resident-shell` (id/en: `login.demoToggle`); `design.test.ts` (`REFRESHED += these five`).

- [ ] **Step 1: Write the failing test.**
  - Add the five files to `REFRESHED`.
  - Extend `Login.test.tsx`: the demo account buttons are hidden until the "Akun demo" toggle is pressed.
- [ ] **Step 2: Run** `npx vitest run src/apps/resident/design.test.ts src/apps/resident/auth`. Expected: FAIL.
- [ ] **Step 3: Restyle.**
  - Splash: deep brand full-bleed, Moni 120px, wordmark, "Developed by" in `text-xs`.
  - Login and OTP: white page, a deep brand top band with the "VHome · Vistaland" eyebrow and title, form fields in one card, the Moni greeting at ≤ 56px, demo accounts behind a toggle, the demo OTP hint as `text-xs text-ink/55`.
  - UnitPicker: `ScreenHeader` plus `HouseCard`-style rows with `houseFor` photos.
  - Welcome: brand band, Moni, steps as one card list.
- [ ] **Step 4: Run** `npx vitest run`. Expected: all pass.
- [ ] **Step 5: Browser check** at 390×844: login, OTP, the Andi unit picker and the Rina welcome. Open "Akun demo"; Rina's one-tap login still works.
- [ ] **Step 6: Commit** `feat(resident): premium sign-in screens`.

### Task 4: Commercial home

**Files:** Modify `src/apps/resident/home/{CommercialHome,OnboardingCard,StatusCards}.tsx`, `src/apps/resident/PrepayGrid.tsx`; `design.test.ts`.

- [ ] **Step 1: Write the failing test:** add the four files to `REFRESHED`. Run the guard. Expected: FAIL.
- [ ] **Step 2: Restyle.**
  - `HomeBand`: search pill, bell, SOS, eyebrow = project name, greeting, unit line.
  - `HouseCard` overlapping the band: `houseFor(unit)`, occupancy pill, and the action. Show the IPL due or overdue amount with **Bayar**. If onboarding is incomplete, show the next step with **Lanjutkan**.
  - OnboardingCard keeps Moni (≤ 56px) and a gold left edge on the card.
  - Status row: three compact cells in one card.
  - PrepayGrid: neutral cells, brand ring on the selected cell, the "Paling hemat" badge as `StatusPill gold`.
  - Grouped menus via `MenuGrid` in one card per group, headed by `Section`.
  - Promos: calm horizontal cards (icon disc left, title, text link). No Moni, no display type.
  - Vouchers: white cards with a partner-initials disc and offer line, and validity in `text-xs`.
  - Listings: `listingThumb` photos or icons. Projects keep their photos. News gets a gold left marker.
- [ ] **Step 3: Run** `npx vitest run`. Expected: all pass.
- [ ] **Step 4: Browser check:** Andi's home (overdue), Rina's home (onboarding), and the whole home scrolled in EN.
- [ ] **Step 5: Commit** `feat(resident): premium commercial home`.

### Task 5: Subsidized and renter home

**Files:** Modify `src/apps/resident/home/{SubsidizedHome,RenterHome}.tsx`; `design.test.ts`.

- [ ] **Step 1: Write the failing test:** add both files to `REFRESHED`. Run the guard. Expected: FAIL.
- [ ] **Step 2: Restyle:**
  - Subsidized home uses the same frame as Task 4 (teal through the theme), with the shorter menu and no house listings.
  - Renter home: the band shows the lease line and "Unit milik …"; the house card shows the renter checklist progress or the IPL the renter pays; the shortcuts become an `IconTile` grid.
- [ ] **Step 3: Run** `npx vitest run`. Expected: all pass.
- [ ] **Step 4: Browser check:** Joko (teal), Siti (teal, complaint window closed), Sari (renter, lease ending) and Lukas (approve his registration in the dashboard first, then log in as `0812-0000-1117` / `3275012209910009`).
- [ ] **Step 5: Commit** `feat(resident): premium subsidized and renter home`.

### Task 6: Bills, pay sheet, WiFi and cards

**Files:** Modify `src/apps/resident/screens/{Bills,PaySheet,Wifi,Cards}.tsx`; `design.test.ts`.

- [ ] **Step 1: Write the failing test:** add the four files to `REFRESHED`. Run the guard. Expected: FAIL.
- [ ] **Step 2: Restyle:**
  - Bills: `ScreenHeader` with eyebrow `IPL · <unit>`, figure = amount due (or "Lunas s/d …"), and sub "tanpa denda". Pay buttons in the first card; the month list as one card with hairline rows. Consequence notice and history as cards. The WiFi tab uses the same pattern.
  - PaySheet: sheet header, method rows, a VA number block with tabular digits, one primary action.
  - Wifi and Cards: `ScreenHeader` plus card lists.
- [ ] **Step 3: Run** `npx vitest run`. Expected: all pass (including `Bills.test.tsx`).
- [ ] **Step 4: Browser check:** Andi pays the overdue months through the VA; Joko's 12-month package; Sari sees only her months.
- [ ] **Step 5: Commit** `feat(resident): premium bills, payments, WiFi and cards`.

### Task 7: Handover, rules and move-in

**Files:** Modify `src/apps/resident/screens/{Handover,Rules,MoveIn}.tsx`; `design.test.ts`.

- [ ] **Step 1: Write the failing test:** add the three files to `REFRESHED`. Run the guard. Expected: FAIL.
- [ ] **Step 2: Restyle:**
  - Handover: `ScreenHeader` with eyebrow "Serah terima rumah", the unit as the figure, and a 4-step bar.
  - Slot list as selectable rows (brand ring when selected); the receipt and BAST as cards.
  - Rules: accordion sections in one card; the signature card with one primary button.
  - MoveIn: form card and permit card.
- [ ] **Step 3: Run** `npx vitest run`. Expected: all pass (`Handover.test.tsx` included).
- [ ] **Step 4: Browser check:** the J2 handover for A1/10 (pick a slot, then the receipt shows) and the J1 rules signature and move-in for Rina.
- [ ] **Step 5: Commit** `feat(resident): premium handover, rules and move-in`.

### Task 8: Complaints

**Files:** Modify `src/apps/resident/screens/{Complaint,ComplaintCapture,ComplaintTracker}.tsx`, `src/apps/resident/FloorPlan.tsx`; `design.test.ts`.

- [ ] **Step 1: Write the failing test:** add the four files to `REFRESHED`. Run the guard. Expected: FAIL.
- [ ] **Step 2: Restyle:**
  - Complaint: `ScreenHeader` with the window as a sub line ("sisa 41 hari") and a gold window bar; the floor plan in a card; findings as one card list.
  - Capture: `ScreenHeader`, photo area, and the AI verdict card for the resident's own photo (kept; confidence in `tabular`).
  - Tracker: `ScreenHeader` with eyebrow "Progres", figure = the stage, and the 7-segment bar (white done, gold current, faint todo); per-finding cards with before/after and the timeline.
  - The closed-window state uses Moni and the reason.
- [ ] **Step 3: Run** `npx vitest run`. Expected: all pass (`ComplaintTracker.test.tsx` keeps "no AI wording").
- [ ] **Step 4: Browser check:** the J3 resident side for Joko, Siti's closed window, and Andi's tracker.
- [ ] **Step 5: Commit** `feat(resident): premium complaints`.

### Task 9: Home and household screens

**Files:** Modify `src/apps/resident/screens/{Renovation,RenovationDetail,Renters,RenterRegistrationWizard,Legal,Emergency,Cctv}.tsx`; `design.test.ts`.

- [ ] **Step 1: Write the failing test:** add the seven files to `REFRESHED`. Run the guard. Expected: FAIL.
- [ ] **Step 2: Restyle:**
  - `ScreenHeader` on each, with card lists.
  - The wizard step bar in the band.
  - Emergency: keep the large panic control centered on white (it's a safety control, so it stays bold red via `danger`, not brand), and the numbers as card rows.
  - Legal: three document cards with status pills.
  - CCTV: camera tiles with rounded photos.
- [ ] **Step 3: Run** `npx vitest run`. Expected: all pass (Emergency, RenovationDetail and wizard tests included).
- [ ] **Step 4: Browser check:** Andi registers a renter (the J5 first half), the panic countdown, Legal for Rina, and CCTV.
- [ ] **Step 5: Commit** `feat(resident): premium household screens`.

### Task 10: Community, account and system screens

**Files:** Modify `src/apps/resident/screens/{Marketplace,ListingDetail,ListingPost,Vouchers,Businesses,Projects,Handbook,Feedback,Account,Notifications,Locked}.tsx`, `src/apps/resident/ComingSoon.tsx`, the `listingMeta.ts` icon map; i18n for the version string (id/en); `design.test.ts`.

- [ ] **Step 1: Write the failing test:**
  - Add the files to `REFRESHED`.
  - Add a test in `media.test.ts`: every `Listing['kind']` maps to an icon.
  - Add an Account assertion: the text contains `VHome · versi 1.0` and not `prototype`.
  - Run them. Expected: FAIL.
- [ ] **Step 2: Restyle:**
  - Marketplace and listing detail use `listingThumb`.
  - Vouchers: calm cards with partner initials and a code block.
  - Businesses and Projects: photo cards.
  - Account: a profile card with an initials avatar, the unit list with `houseFor` thumbs, settings rows, and the version line.
  - Notifications: a grouped list.
  - Locked: Moni with the reason and the next step.
- [ ] **Step 3: Run** `npx vitest run`. Expected: all pass.
- [ ] **Step 4: Browser check:** the J9 resident side (post a house listing; the listing shows the house photo), a voucher claim, and the J11 feedback reply visible.
- [ ] **Step 5: Commit** `feat(resident): premium community, account and system screens`.

### Task 11: Remove the old app bar, full sweep, docs

**Files:** Delete `src/ui/AppBar.tsx`. Modify `design.test.ts` (replace `REFRESHED` with a glob of every non-test file under `src/apps/resident`), and `README.md` (one line: the customer app uses the premium look; screenshots not needed).

- [ ] **Step 1: Write the failing test:** switch the guard to all resident files. Run it. Expected: FAIL only if something was missed. Fix any hit.
- [ ] **Step 2: Run** `npx vitest run` and `npm run build`. Expected: all pass, no type errors.
- [ ] **Step 3: Browser sweep** at 390×844 over every resident route:
  - personas Andi, Rina, Sari, Joko and Siti, plus EN for Andi and Joko;
  - per route, check no raw keys, no `{…}`, no horizontal overflow, nothing hidden under the band, and teal for Harmoni Park.
  - Then screenshot the dashboard summary and the staff mandor tasks screen, and confirm they look as before.
- [ ] **Step 4: Commit** `refactor(resident): remove old app bar; docs` and push `main`.
