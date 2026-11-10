# VHome prototype — design spec

**Date:** 10 Nov 2026 · **Status:** draft for review · **Owner:** Vistaland FDE

## 1. Goal

A clickable, fully working prototype of **VHome**, Vistaland's resident platform, where every feature reads and writes the same data so actions in one place show up everywhere else. It has three surfaces:

| Surface | Users | Form factor |
|---|---|---|
| **Resident app** | House owners and renters | Mobile (phone frame on desktop, full screen on a phone) |
| **Field-staff app** | Security, contractor foreman (mandor), gardener | Mobile |
| **Estate dashboard** | Estate admin, estate manager, contractor office | Web, desktop-first |

The resident app has two variants, picked automatically at login from the unit's sales category:

- **Commercial** (`sales_category = komersil`): full feature set, red palette.
- **Subsidized** (`sales_category = subsidi`): stripped-down feature set, teal palette.

Success = a stakeholder can walk through each journey in §7 end to end, switch between surfaces, and see the data update without reloading.

## 2. Decisions already made

| Topic | Decision |
|---|---|
| Resident identity | **Phone number + KTP (NIK)** are the unique identifier. Matched through the VLES customer search API (`POST /api/v1/customers/search` with `no_hp` + `no_ktp`, both must match), then an OTP to that phone. Same flow for commercial and subsidized. |
| Commercial vs subsidized | Customer → active transaction → unit → `sales_category` from the VLES integration API. |
| AI | Simulated, with predictable outcomes for the bundled sample photos (§8). |
| Field staff | All three roles: security, contractor/mandor, gardener (incl. fuel). |
| Language | Bahasa Indonesia (default) and English, with a toggle on every surface. |
| Visual | Follow the wireframe colour scheme and use the **Moni** deer mascot. The layouts are redesigned, not copied (§10). |
| Late fees | None. Overdue months are only *marked*; consequences (card suspension, garbage stop, warning letter) are manual actions with a log. |
| Complaint window | 100 days from BAST (configurable). After that the complaint menu is blocked with a message. |
| IPL rate | Set per house type, not flat. |
| Customisable | Free IPL and free WiFi promos (on/off and duration), rates, pay-ahead packages, prices, windows and call rules, plus per-project feature toggles (§6.4). |

## 3. Architecture

**One web project:** Vite + React 18 + TypeScript + Tailwind CSS 3 + React Router 6 + Zustand.

```
src/
  domain/        pure logic, unit-tested (ipl, complaints, onboarding, access, ai-sim, clock, money)
  vles/          mock VLES client: same request/response shapes as the two OpenAPI specs
  data/          seed data + seeded generator for bulk units
  store/         Zustand store, persistence, cross-tab sync, actions
  i18n/          id.ts, en.ts, useT()
  ui/            design-system primitives (Button, Card, Badge, Sheet, Tabs, Stepper, Moni, PhoneFrame…)
  apps/resident/ apps/staff/ apps/dashboard/ apps/launcher/ apps/public/
  assets/        Moni poses, house photos, sample complaint photos
```

**Routes**

| Route | What |
|---|---|
| `/` | Demo launcher: pick a surface and persona, demo clock, reset data |
| `/app/*` | Resident app |
| `/staff/*` | Field-staff app |
| `/dashboard/*` | Estate dashboard |
| `/listing/:id` | Public house listing + lead form (opened from a resident's "rent/sell my house" post) |
| `/demo` | Side-by-side: phone (resident or staff) next to the dashboard, both live |

**Data and persistence**
- Single store holding every entity in §5. JSON state is saved to `localStorage`; photos are compressed (max 1000 px, JPEG) and saved to IndexedDB by id.
- **Cross-tab sync:** every write broadcasts on a `BroadcastChannel`; other tabs re-read state. Opening the app and dashboard in two tabs (or `/demo`) shows changes live.
- **Demo clock:** "today" defaults to **10 Nov 2026**. The launcher and dashboard can jump forward (+1 day, +1 week, +1 month, +100 days) to trigger bill generation, call deadlines, lease expiry and the complaint lock. All date logic reads the clock, never `Date.now()` directly.
- **Reset demo data** restores the seed.

**Mock VLES layer** (`src/vles/`) exposes async functions mirroring the specs. Swapping in the real API later means reimplementing this module only:
- `searchCustomers({ no_ktp?, no_hp?, no_npwp?, customer_id? })` → `{ data: [{customer_id, no_ktp, no_npwp, no_hp}], meta }`. Normalises `0`/`62`/`+62` and strips spaces, dots and dashes, as the spec describes.
- `getTransactions({ customer_id })`, `getUnit(id)`, `getUnits({ project_id })`, `getUnitTypes({ project_id })`. Units carry `sales_category`, `business_group_label`, `building_class`, `active_transaction_id`.
- Name, email and other profile data come from the mock (the search API only returns ids and numbers, so the real integration will need the integration API's `/customers/{id}`).

## 4. Personas (seed data)

Projects (placeholder names, editable in seed):
- **Vista Harmoni Residence** (Bekasi) — commercial, business group "Vista", about 160 units across 4 house types.
- **Harmoni Park Cibitung** (Bekasi) — subsidized, business group "Harmoni Park", about 300 units across 2 house types.

| # | Persona | Surface | Situation | Demonstrates |
|---|---|---|---|---|
| 1 | **Rina Wijaya**, owner B1/02 | Resident · commercial | BAST signed 26 Oct, app not yet activated, rules unsigned, no move-in date | First activation, onboarding checklist, locked menus, complaint window running |
| 2 | **Andi Pratama**, owner A1/07 + A3/05 | Resident · commercial | Lives in A1/07 since Mar 2026, IPL overdue 2 months, complaint in progress, renovation awaiting deposit; A3/05 is empty | Unit switcher, full access, renter registration, IPL marking, complaint tracking |
| 3 | **Sari Lestari**, renter B2/04 (owner Budi Santoso) | Resident · commercial | Active lease 1 Jun 2026 – 30 Nov 2026, pays IPL | Renter-limited home, "Penyewa · milik Budi Santoso" tag, lease expiry |
| 4 | **Joko Susilo**, owner C3/14 | Resident · subsidized | Moved in, 41 days left in complaint window, IPL free until Dec | Subsidized app, complaint with AI |
| 5 | **Siti Aminah**, owner A2/03 | Resident · subsidized | BAST 160 days ago | Complaint menu blocked after 100 days |
| 6 | **Pak Dedi**, security | Staff | Gate post, both projects | Move-in confirmation, panic alerts |
| 7 | **Mandor Hasan** (PT Bangun Karya) | Staff | Assigned complaint work orders | After-photo upload, AI fix check |
| 8 | **Ujang**, gardener | Staff | Vista Harmoni zones | Attendance, mowing log, fuel |
| 9 | **Admin Estate** | Dashboard | Both projects (switcher) | Everything in §6.3 |

Each resident persona has a known phone + KTP pair shown on the login screen as a one-tap chip, so demos don't need typing. Any other seeded customer can also log in.

## 5. Data model (main entities)

- **Project**: id, name, location, salesCategory, businessGroup, settings (§6.4), featureFlags.
- **UnitType**: id, projectId, name (e.g. "Tipe 45/90"), landSize, buildingSize, rooms (for the floor plan), **iplRate**.
- **Unit**: id, code ("B1/02"), projectId, typeId, ownerCustomerId, akadDate, handover {status, calls[], scheduledSlot, bastDate, bastSource: signed|auto, checklist}, appActivatedAt, rulesSignedAt + signature, moveIn {permit, date, source: security|app|estate}, occupancy: notReady|readyForHandover|handedOver|occupied, legal {certificate, pbg, pbb} (commercial), consequences[] (manual sanctions + log).
- **Customer** (VLES shape + profile): customer_id, no_ktp, no_hp, no_npwp, name, email.
- **Account**: id, role: owner|renter|staff|admin, customerId or renterId, unitIds, lastLogin. Renter accounts link to `ownerCustomerId`, lease {start, end}, `iplPayer: owner|renter`.
- **RenterRegistration**: unitId, type: renter|newOwner, identity, household size, lease doc, vehicles[], move-in plan, fees paid, status: draft|submitted|needsFix|approved|rejected, reviewer notes.
- **IplBill**: unitId, month (YYYY-MM), amount (from the unit type rate at issue time), status: free|upcoming|due|paid|overdue, paidAt, paymentId, prepaidPackageId. Generated from BAST and the free-IPL setting (§6.1).
- **Payment**: id, unitId, kind: ipl|wifi|cards|deposit, months[], amount, method: VA|QRIS|transfer|cash, recordedBy: resident|admin, receipt.
- **Wifi**: unitId, package, installSlot, status: requested|scheduled|installed, freeUntil; WiFi bills like IPL.
- **CardOrder**: unitId, freeCards, freeStickers, extra counts, vehicles[{type, plate}], total, status: awaitingPayment|toMake|ready|pickedUp.
- **Renovation**: id "REN-0031", unitId, requestedBy (owner/renter), title, description, steps (submitted → ownerApproval (renter only) → estateApproved → depositPaid → inProgress → inspection → bastSigned → depositReturned), deposit, VA, inspection checklist, deduction, refund account.
- **Complaint** (one per unit per window): id "KMP-0142", unitId, submittedAt, findings[].
- **Finding**: id, room, photos[], description, ai {verdict, category, confidence, note}, estateCorrection, groupId, assignedMandor, checklist, afterPhotos[], fixCheck {verdict, note}, estateFinalOk, residentConfirmed, stage.
- **WorkGroup**: contractor groups similar findings across units (category, units, material estimate, assigned mandor).
- **Feedback**, **Announcement**, **Notification** (per account), **PanicSignal**, **MoveInPermit**.
- **Business**, **Listing** (incl. house rent/sell → public page), **Lead**, **Voucher** + **VoucherClaim**, **ProjectPromo**.
- **Gardener**: Zone, Attendance, MowingLog (before/after photos, area, duration, fuel), FuelEntry (buy/refill/physical check), Machine.
- **Expense** (category, date, amount, note, receipt, recurring), **Budget** per category.

## 6. Surfaces

### 6.1 Core rules (shared domain logic)

- **Onboarding stages:** akad → ready for handover → handed over (BAST) → app activated → rules signed → move-in permit → occupied.
- **Occupied** happens when security taps "Sudah masuk" for the move-in, or the resident taps "Saya sudah mulai tinggal" and the estate confirms with one click.
- **Locked until occupied:** vouchers, marketplace, business directory, suggestion box, panic, CCTV, legal check. Locked tiles are greyed with a lock and open a Moni "Sabar ya" screen explaining how to unlock.
- **Free IPL:** if enabled, months 1…N after the BAST month are `free`. After that, a bill is issued on the 1st, due on the configured day (default 10th), and becomes `overdue` the day after if unpaid. **No late fee is ever added.**
- **Overdue marking:** units with ≥ X overdue months (default 2) are flagged "Perlu tindakan" in the dashboard. Nothing happens automatically.
- **Complaint window:** BAST date + window days (default 100). One submission per window (collect all findings, then send once). Days left are shown everywhere. After the window, the menu is blocked with "Masa komplain 100 hari sudah lewat sejak BAST [date]" and a contact button.
- **Feature access** = segment defaults ∧ project feature toggles ∧ role (owner/renter) ∧ occupancy.

### 6.2 Resident app

**Shared flows (both segments)**
- **Splash** (Moni) → **Login:** phone + NIK → VLES search → OTP (simulated, the code is shown in a demo banner) → if several units, pick one → first login shows a **welcome / "Selamat!"** screen with the next steps.
- **Bottom nav:** Beranda · Tagihan · Jual beli · Voucher · Akun.
- **Header:** unit chip, occupancy badge, notifications bell, ID/EN toggle; commercial adds search and SOS.
- **Screens:** Serah terima, Peraturan, Izin pindahan, Tagihan IPL & WiFi, Pasang WiFi, Kartu akses & stiker, Renovasi, Komplain garansi, Kotak masukan, Usaha warga, Jual beli, Voucher, Notifikasi, Akun.
  - **Serah terima (handover):** call status (1–3), pick a slot, read and sign BAST with OTP, view the key receipt.
  - **Peraturan (rules):** sections, an agree checkbox, a signature pad, then a signed copy.
  - **Izin pindahan (move-in permit):** date, slot, vehicle, plate, optional WiFi install; or "Saya sudah mulai tinggal".
  - **Tagihan (bills):**
    - IPL status hero, month list (free / due / paid / overdue)
    - pay-ahead packages from settings
    - pay sheet with a simulated VA number or QRIS, plus a "simulate payment" button
    - payment history and receipts; a WiFi tab
  - **Pasang WiFi:** promo banner (only if enabled), packages, install slot, request.
  - **Kartu akses & stiker:** free 1 card + 1 sticker claim, paid extras, vehicles, pay.
  - **Renovasi:** list, new request, step timeline, deposit VA, refund account, sign renovation BAST or raise an objection.
  - **Komplain garansi:** window bar, a floor plan of the unit type (tap a room) → capture a finding (camera/upload or sample photo) → **AI check** → list of findings → submit once. Then a 7-stage tracker per finding with before/after photos, and confirm when done. The resident sees the AI verdict only for their own photo; the AI check of the contractor's after-photo is shown to the estate (dashboard) only, and the resident sees the after-photo once the work has passed.
  - **Kotak masukan (suggestion box):** topic chips, text, optional photo; "my suggestions" with estate replies.
  - **Usaha warga:** directory with category filters and WhatsApp links; register a business (estate verifies).
  - **Jual beli:** listings by tab, post a listing, detail.
  - **Voucher:** available, mine, redeem a code; claim produces a code.
  - **Akun:** profile, units, role badge, language, logout.

**Commercial only (red):**
- **Beranda** in marketplace style:
  - onboarding checklist with Moni
  - IPL / WiFi / card status trio, pay-ahead strip, promo banners
  - menu grid of 18 tiles in three groups (Rumah saya · Keamanan & lingkungan · Komunitas warga)
  - rows for vouchers, latest listings, Vistaland projects and estate announcements
- **Penyewa / jual:** 5-step wizard (type → identity → vehicles → move-in → pay). Status tracking, and approving a renter's renovation request.
- **Darurat:** panic button with a 5-second cancel, incident type, "I'm not home" location; important numbers.
- **CCTV & security on duty:** camera grid with simulated feeds; renters keep access while the owner doesn't.
- **Cek legalitas:** certificate, PBG, PBB timelines; KPR vs cash; PBB pickup booking.
- **Proyek Vistaland:** projects with photos, "Ask marketing" (creates a lead).
- **Handbook:** guide and site plan.
- **Jual beli:** also allows "rent/sell my house" posts with a public link (`/listing/:id`).

**Renter view (commercial):** a dark header with a "Penyewa" badge and "Unit milik [owner]". It shows the move-in prep checklist, IPL (if the renter pays), renovation (needs owner approval first), vehicles and cards, CCTV, numbers, suggestion box, businesses, marketplace and vouchers. It has **no** warranty complaint, BAST documents, legal check or renter registration (a note says these are for the owner only). Access ends automatically at lease end.

**Subsidized (teal):** a simpler Beranda with a greeting header, the "Siapkan rumah Anda" checklist, IPL and WiFi cards, and a quick-action grid (Renovasi, Komplain, Kendaraan & kartu, Kotak masukan, Usaha warga, Info estate). It has none of renter registration, panic, CCTV, legal check, projects or house listings by default; most are project toggles, but renter registration stays off for subsidized projects (§6.4). Pay-ahead is an optional button on Tagihan.

### 6.3 Estate dashboard

**Layout**
- Left sidebar (dark navy) with a project switcher at the top.
- Top bar: demo clock, ID/EN toggle, admin menu.
- Each page header shows the project label in its segment colour.

| Page | Contents |
|---|---|
| **Ringkasan & hunian** | Stage funnel (akad → handover → app → rules → occupied), "needs follow-up" list (computed), occupancy table with date source, pending renovations, open complaints, scheduled move-ins |
| **Serah terima** | KPIs and a call table (call 1–3 read/unread, status, deadline), actions (resend, open form, issue auto-BAST), handover form (keys, cards, meters, promo gift) → send receipt to resident's phone, call-rule settings |
| **Penghuni & penyewa** | Resident directory with **Owner / Penyewa (milik X) / Pemilik baru** tags; verification queue for renter/new-owner registrations with a detail panel → **Approve** (creates the renter login, queues cards, schedules move-in, routes IPL) or **Request fix**; leases ending in ≤ 30 days |
| **Leads** | Leads from public listings and "Ask marketing", status pipeline, filters, CSV export |
| **Laporan estate** | Monthly snapshot computed from live data (occupancy, IPL collection, finance, complaints, facilities, compliance, priority actions), print/PDF via browser print |
| **Tagihan IPL** | KPIs, per-unit list with search/filter (overdue / paid / free / not handed over), 12-month matrix view, **unit detail**: timeline, monthly status, payment history, **record payment** (IPL only, no fine option), consequence log |
| **Promo bayar di muka** | IPL and WiFi package editors (none / % / free months, active toggle, valid until, no-arrears-only) with live app preview; residents who bought packages |
| **Komplain & renovasi** | Complaint board by stage (estate verify → contractor group/assign → mandor working → AI photo check → estate final check → resident confirmation). **Group by / filter by AI category**, category counts, SLA flags, role tabs (Semua / Estate / Kontraktor / Mandor), finding detail with before/after photos and AI verdicts, estate correction of category or room. Renovation table and inspection panel (checklist, full refund or deduction, issue renovation BAST). |
| **Kartu, stiker & penunggak** | Card/sticker orders (mark made → notify, hand over). **Overdue units**: amount and months, plus manual consequence buttons (suspend card, stop garbage pickup, send warning letter, restore) each logged with who and when |
| **Keuangan cluster** | Expense entry, budget vs actual per category, 6-month income vs expense chart and recap, fuel reconciliation (standard L/1,000 m², tolerance, weekly jerrycan balance, physical check), per machine, per zone, flags, gardener log approval / request re-photo |
| **Keamanan** | Panic signal log (response time, false alarms), move-ins today and upcoming |
| **Komunitas & info** | Suggestion inbox with reply, announcements (publish to app), business verification, voucher/partner management, listing reports |
| **Pengaturan** | Project settings and feature toggles (§6.4) |

Subsidized projects hide Leads and the renter verification queue (the toggles are off), matching the subsidized wireframe.

### 6.4 Settings (per project)

| Group | Settings |
|---|---|
| IPL | Free IPL on/off, free months (default 6 commercial / 3 subsidized), due day, **rate per house type** |
| WiFi | Free WiFi promo on/off, free months (default 3), packages (name, speed, price) |
| Pay-ahead | IPL and WiFi packages (also edited on the promo page) |
| Cards and stickers | Free card and sticker counts, extra prices, max extra cards |
| Complaints | Window days (100), SLA target days per category |
| Handover | Days between calls (7), max calls (3), auto-BAST after last call (on/off) |
| Renovation | Deposit amount, inspection checklist items |
| Overdue | Months before "Perlu tindakan" flag (2); consequence types offered |
| Features | Toggles: renter registration, house listings, panic, CCTV, legal check, projects, vouchers, marketplace, business directory, WiFi. Renter registration and house listings are locked off for subsidized projects, with a tooltip explaining that subsidized homes must be owner-occupied. |

Changing a setting updates the resident app immediately. For example, switching the WiFi promo off removes the "Gratis 3 bulan" banner, and changing a house type's IPL rate changes newly issued bills.

### 6.5 Field-staff app

- **Security** (navy):
  - **Pindahan hari ini:** search by unit or plate, one card per approved permit, "Sudah masuk" sets the unit to occupied and notifies the resident and estate.
  - **Darurat:** live panic card with a unit map, "Accept — on my way", call the resident or 112, auto-escalation note after 60 seconds, and history.
- **Contractor / mandor** (orange accent):
  - **Tugas:** work groups by category across units; per finding: before photo, checklist, "Upload after photo" → AI fix check with a verdict. A pass moves it to estate final check; a fail returns it with a reason.
  - **Riwayat** (history).
- **Gardener** (forest green):
  - **Hari ini:** selfie + location attendance (simulated), today's target, zone schedule, jerrycan balance, machines, estate message.
  - **Log potong:** zone → start (before photo) → mowing timer → finish (after photo).
  - **Bensin:** buy at a fuel station (litres, amount, receipt photo, source of funds; this becomes an expense), refill a machine.
  - **Riwayat & kinerja:** performance history and logs needing a re-photo.

## 7. Cross-feature journeys (acceptance walkthroughs)

1. **Onboarding to unlock (Rina).** Log in with phone + NIK + OTP → welcome → sign rules → request move-in for a date with WiFi install → security sees it in Pindahan hari ini → taps "Sudah masuk" → Rina's locked tiles unlock live, and the dashboard occupancy row shows "Konfirmasi security".
2. **Handover (dashboard → resident).** Estate marks a unit ready → call 1 appears in the resident's app → the resident picks a slot → estate opens the form and sends the receipt → the resident signs BAST by OTP → free IPL and the 100-day window start from that date (visible in the app and the IPL page).
3. **Complaint with AI (Joko).** Tap a room on the floor plan → sample "damp wall" photo → AI: valid, *Kebocoran & rembes*, 92% → add more findings (one sample is rejected as "no visible damage") → submit → the dashboard board shows it under its category → estate verifies → contractor groups and assigns Mandor Hasan → the mandor uploads a "not fixed" after-photo → AI fails it and it returns to the mandor → re-upload the "fixed" photo → AI passes → estate final check → Joko confirms. The tracker updates at every step.
4. **Window expiry (Siti, or demo clock +100 days).** The complaint tile shows a blocked state with the reason and date.
5. **Renter (Andi → Sari-like flow).** Andi registers a renter for A3/05 (identity, vehicles, move-in date, IPL paid by renter, pays card fees) → the dashboard queue → Approve → the new renter logs in with their phone + NIK and sees the renter view tagged "milik Andi Pratama" → the dashboard resident list shows "Penyewa · milik Andi Pratama" and A3/05 IPL bills route to the renter.
6. **IPL marking (Andi).** Andi sees 2 overdue months (no fine) → the dashboard flags A1/07 "Perlu tindakan" → admin manually suspends the card (logged) → Andi pays both months with simulated VA → the dashboard shows paid; admin restores the card (or the UI suggests restoring).
7. **Settings ripple.** Admin turns off the free WiFi promo and raises the Tipe 45 IPL rate → the resident app updates immediately; existing paid or free months keep their old amounts.
8. **Panic.** A resident presses panic → 5-second countdown → the security phone shows the alert → accept → the resident sees "Security menuju lokasi" → the dashboard Keamanan log records the response time.
9. **Public listing to lead.** A resident posts "rumah disewakan" → opens the public link → a visitor submits the interest form → the dashboard Leads shows a new lead and the owner gets a notification.
10. **Gardener to finance.** Ujang logs a mowing session and a fuel purchase → the dashboard finance shows the expense, the reconciliation updates, and the log awaits approval.
11. **Suggestions and announcements.** A resident sends a suggestion → the admin replies → the resident sees the reply. The admin publishes an announcement → it appears in "Info dari estate" and notifications.

## 8. Simulated AI

**Complaint photo check (resident)**
- **Input:** photo (sample or uploaded), room, description.
- **Sample photos** (illustrated, bundled) give fixed results:
  - damp wall → valid / Kebocoran & rembes
  - cracked tile → valid / Keramik & lantai
  - peeling paint → valid / Cat & finishing
  - wall crack → valid / Retak dinding
  - leaking tap → valid / Pipa & sanitasi
  - clean wall → **invalid** ("No visible damage")
  - blurry/dark photo → **unclear** ("Retake closer, with more light")
- **Uploaded photos:** a canvas analysis of brightness and variance (too dark → unclear; near-uniform → invalid), then category from description keywords (ID + EN), confidence from a stable hash so it repeats.
- **Output:** verdict (valid / invalid / unclear), category, confidence %, short note, highlighted area.
- **Behaviour:**
  - Invalid findings can't be submitted unless the resident taps "Minta tinjau estate" (flagged for manual review).
  - The estate can override the category.
- **Categories:** Kebocoran & rembes, Retak dinding / struktur, Cat & finishing, Keramik & lantai, Pintu & jendela, Listrik, Pipa & sanitasi, Plafon & atap, Lainnya.

**Fix check (mandor)**
- **Input:** before photo + after photo + finding category.
- **Output:** **fixed** / **not fixed** / **wrong area**, with a reason and confidence.
- **Sample after-photos** give each outcome. Uploading the same image as the before photo fails as "same photo as before". Other uploads pass with a stable confidence.

All AI calls show a 1.5–2.5 s "AI menganalisis foto…" scanning state.

## 9. Language

All UI strings live in `id.ts` / `en.ts` with a `useT()` hook. The toggle is stored per device and shown in the app header/Akun, the staff header and the dashboard top bar. Enum labels (statuses, categories, stages) are translated. User-written content (listing titles, descriptions, suggestions) is not translated. Dates and currency use `id-ID` formatting in both languages (Rp, 10 Nov 2026).

## 10. Visual design

**Palette (from the wireframes)**
- **Commercial:** red `#B01222` (primary dark) / `#D7192B` (primary), gold `#E8BE5A` (highlights, badges, voucher), Moni brown `#B56B3A`.
- **Subsidized:** teal `#0F5F57`.
- **Staff:** security navy `#111827`, contractor orange `#C2410C`, gardener green `#1B5E36`.
- **Dashboard:** sidebar navy `#111827`, light content, the segment colour for accents.
- **Menu icon tiles:** the wireframe tint set (yellow, red, orange, green, aqua, blue, violet, grey). Each tile is a lucide line icon in a tinted circle; locked tiles are grey with a lock badge.

**Moni:** mascot poses extracted from the wireframe PDF, used on both segments:
- waving — splash, welcome
- pointing — tips
- thumbs-up — success states
- arms crossed — locked screens, "Sabar ya"
- sunglasses — vouchers
- app icon

**Typography and shapes:** Plus Jakarta Sans; 16–20 px rounded cards; soft shadows; generous spacing. Gradients only where the wireframe used them (hero cards, primary buttons). Footer credit: "Developed by Vistaland".

**What changes from the wireframes:**
- clearer hierarchy, with one primary action per screen
- consistent cards and status chips
- bottom sheets instead of long pages for payments and pickers
- skeleton/empty states with Moni
- denser, sortable dashboard tables with sticky headers
- charts with legends

**Responsive:** at ≥ 768 px the resident and staff apps render inside a phone frame (390 × 844) with the demo toolbar beside it; on a phone they go full screen. A web manifest lets the app be added to a phone's home screen.

## 11. Testing

- **Vitest** unit tests for `src/domain/`:
  - IPL bill generation (per-type rate, free months on/off, due/overdue transitions, pay-ahead coverage, no fines)
  - complaint window and stage derivation
  - onboarding/occupancy and feature access matrix (segment × toggle × role × occupancy)
  - VLES search normalisation (0/62/+62, NIK formatting)
  - AI simulation predictability
- **Browser walkthrough** of journeys 1–11 in §7 using the side-by-side `/demo` page; `npm run build` must pass with no type errors.

## 12. Out of scope

- A real backend, database and multi-device sync (data lives in one browser).
- Real VLES calls, OTP/WhatsApp, payments, push notifications and AI.
- Native app builds. The prototype is a responsive web app plus a manifest.
- Real PDF generation (browser print instead) and Excel files (CSV instead).

## 13. Open assumptions (correct if wrong)

1. Moni appears in both commercial and subsidized views.
2. Renters are not VLES customers. Their phone + NIK is matched against VHome's own renter records created on approval.
3. New-owner registration (house sold) transfers the unit's account and future bills to the new owner on approval; the old owner loses access.
4. A complaint is submitted once per window, as in the wireframe. Findings can be added only before sending.
