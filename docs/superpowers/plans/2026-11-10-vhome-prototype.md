# VHome Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the VHome prototype: a resident app (commercial + subsidized + renter views), a field-staff app (security, mandor, gardener) and an estate dashboard. All three share one live data store.

**Architecture:** One Vite + React + TypeScript SPA. Business rules are pure functions in `src/domain/` (unit-tested). State changes are named actions in `src/store/actions/` that mutate an immer draft of one `AppData` object (journey-tested without React). The Zustand store persists `AppData` to `localStorage` and photos to IndexedDB, and syncs tabs over `BroadcastChannel`. A mock VLES client mirrors the two OpenAPI specs. UI surfaces only read data through hooks and write through actions.

**Tech Stack:**
- Node 22, Vite 6, React 18.3, TypeScript 5.6 (strict)
- Tailwind CSS 3.4, React Router 6
- Zustand 5 + immer 10, idb-keyval 6, lucide-react, recharts 2, clsx
- Vitest 2; pngjs (dev, asset extraction)

**Spec:** `docs/superpowers/specs/2026-11-10-vhome-prototype-design.md`. Read it before any task; section numbers below (§) refer to it.

## Global Constraints

- **Demo date:** the default demo date is `2026-11-10`. All date logic reads `data.today` (via `src/domain/clock.ts`); never call `new Date()` for business dates.
- **Identity:** resident identity = phone + KTP. Login always goes through `vles.searchCustomers({ no_hp, no_ktp })` (both must match), then OTP. The same flow applies to both segments.
- **No late fees anywhere:** no "Denda" option, no surcharge, no automatic sanctions. Overdue is a status plus manual consequences only.
- **Complaint window:** default 100 days from BAST, read from settings.
- **IPL rate:** comes from `UnitType.iplRate`; the free-IPL and free-WiFi promos are settings with on/off + months.
- **Copy:** every user-visible UI string goes through `t()`. Indonesian is the default and English is the toggle. User-written content is not translated.
- **Number formats:** Rupiah formatting is `Rp350.000`. Dates format as `10 Nov 2026` (ID) / `10 Nov 2026` (EN), both using the `id-ID` style.
- **Colours** (exact):
  - commercial `#D7192B` / dark `#B01222`, gold `#E8BE5A`, Moni brown `#B56B3A`
  - subsidized `#0F5F57` / dark `#0B4A44`
  - security `#111827`, mandor `#C2410C`, gardener `#1B5E36`
  - dashboard sidebar `#111827`
- **Font and mascot:** Plus Jakarta Sans (Google Fonts). Moni artwork comes only from `src/assets/moni/`. Footer credit: "Developed by Vistaland".
- **Names:** the app is named "VHome". Never use "Moni" or "Zetira" as app or project names; "Moni" is only the mascot.
- **Phone frame:** resident and staff apps render in a 390×844 phone frame at ≥768 px viewport width, and full screen below that.
- **Git:** commit after every task on branch `main` (Task 1 runs `git init`).

## Review Focus

1. **Complaint window closes mid-repair:** a resident whose complaint is still in progress when the window closes must still open the complaint menu to track it. Only *new* submissions are blocked (Andi, A1/07). Test owned by Task 5.
2. **Messy login numbers:** `0812…`, `62812…`, `+62 812-3456-…` and an NIK with spaces or dots must all log in the same person. A phone that matches with the wrong NIK must return "not found", not a partial match. Test owned by Task 3.
3. **Two tabs writing at once:** an action run in tab A must apply on top of the latest state written by tab B, not a stale copy (read-latest-then-write). Test owned by Task 7.
4. **Lease end:** after the demo clock passes a renter's lease end, the renter can't log in (clear message), the owner's unit shows no active renter, and IPL months after the end are billed to the owner. Test owned by Task 9.
5. **Storage unavailable:** if `localStorage`/IndexedDB throw (private mode, quota), the app keeps working in memory and shows a one-line notice. Uploaded photos are compressed to ≤1000 px JPEG before storing. Test owned by Task 7.

---

## File structure

```
index.html, vite.config.ts, tsconfig.json, tailwind.config.ts, postcss.config.js, vitest.config.ts
public/manifest.webmanifest, public/icons/vhome-192.png, public/icons/vhome-512.png
public/samples/*.svg                         sample "photos" for the AI demo (Task 6)
scripts/extract-assets.mjs                   PDF → Moni PNGs with alpha + house photos (Task 1)
src/main.tsx, src/router.tsx, src/styles.css
src/assets/moni/{wave,wave-sm,point,thumbs,crossed,cool,icon}.png
src/assets/houses/house-{1..5}.png
src/domain/   types.ts clock.ts money.ts ipl.ts onboarding.ts access.ts complaints.ts ai.ts finance.ts report.ts identity.ts
src/vles/     normalize.ts client.ts
src/data/     seed.ts generate.ts content.ts floorplans.ts samples.ts
src/store/    store.ts persist.ts photos.ts hooks.ts notify.ts ids.ts actions/*.ts  test/apply.ts
src/i18n/     index.ts locales/id/*.ts locales/en/*.ts   (auto-loaded by import.meta.glob; one file pair per task)
src/ui/       theme.ts + primitives (one component per file)
src/apps/launcher/  Launcher.tsx Demo.tsx DemoToolbar.tsx
src/apps/resident/  ResidentShell.tsx routes.tsx auth/ home/ screens/
src/apps/staff/     StaffShell.tsx routes.tsx security/ contractor/ gardener/
src/apps/dashboard/ DashboardShell.tsx routes.tsx pages/ components/
src/apps/public/    ListingPage.tsx
```

**Parallel-safety rule:**
- Each UI task owns its own screen files plus its own i18n pair `src/i18n/locales/{id,en}/<task-ns>.ts`.
- Shells (Tasks 11, 17, 18) pre-create every route and a stub file per screen. Later tasks only fill stubs and never edit `routes.tsx` or shared dictionaries.

---

### Task 1: Scaffold, tooling, theme tokens, assets

**Files:**
- Create: project config files listed above
- Create: `src/main.tsx`, `src/router.tsx` (routes `/`, `/demo`, `/app/*`, `/staff/*`, `/dashboard/*`, `/listing/:id`, each rendering a placeholder)
- Create: `src/styles.css`, `scripts/extract-assets.mjs`, `src/assets/**`, `public/manifest.webmanifest`, `public/icons/*`
- Test: `src/smoke.test.ts`

**Interfaces:**
- Produces:
  - npm scripts `dev`, `build` (`tsc -b && vite build`), `test` (`vitest run`), `extract-assets`.
  - Tailwind colour tokens backed by CSS vars: `brand`, `brand-dark`, `brand-tint`, `gold`, `ink` (`#111827`), `paper` (`#F6F4F0`), `line` (`#ECE8E1`).
  - Font `font-sans` = Plus Jakarta Sans.

- [ ] **Step 1:** `git init`, `npm create vite@latest . -- --template react-ts`, then install the tech-stack deps. Run `npm run build`. Expected: exit 0.
- [ ] **Step 2:** Configure Tailwind (content `src/**/*.{ts,tsx}`) with the tokens above. `styles.css` defines `--brand`, `--brand-dark`, `--brand-tint` defaults (commercial values as RGB triplets) and imports Plus Jakarta Sans 400/500/600/700.
- [ ] **Step 3:** Write `scripts/extract-assets.mjs <pdfPath>`:
  - Run `pdfimages -png -p <pdf> <tmp>/m`.
  - For each pair, merge the smask into the alpha channel with pngjs and write it out:

    | Image + smask | Output |
    |---|---|
    | `m-002-011` + `m-002-012` | `wave.png` |
    | `m-005-018` + `-019` | `wave-sm.png` |
    | `m-005-034` + `-035` | `point.png` |
    | `m-005-026` + `-027` | `thumbs.png` |
    | `m-005-038` + `-039` | `crossed.png` |
    | `m-005-048` + `-049` | `cool.png` |

  - Copy `m-002-001` → `icon.png` (no mask) and `m-010-131..135` → `src/assets/houses/house-1..5.png`.
  - Resize `icon.png` to `public/icons/vhome-192.png` and `vhome-512.png` with `sips`.
- [ ] **Step 4:** Run `npm run extract-assets -- "/Users/claytonmildy/Downloads/MONI CUSTOMER APP Prototype (1).pdf"`. Expected: 7 Moni files + 5 house files exist; open `wave.png` and confirm the background is transparent.
- [ ] **Step 5:** Write the smoke test `expect(1 + 1).toBe(2)`. Run `npm test`. Expected: PASS. Run `npm run build`. Expected: exit 0.
- [ ] **Step 6:** Commit `chore: scaffold VHome prototype`.

---

### Task 2: Domain types, clock, money, i18n core

**Files:**
- Create: `src/domain/types.ts`, `src/domain/clock.ts`, `src/domain/money.ts`, `src/i18n/index.ts`, `src/i18n/locales/id/common.ts`, `src/i18n/locales/en/common.ts`
- Test: `src/domain/clock.test.ts`, `src/domain/money.test.ts`, `src/i18n/i18n.test.ts`

**Interfaces:**
- Produces `types.ts` exactly as below. Field order is free; names and unions are fixed.

```ts
export type ISODate = string; export type ISODateTime = string; export type MonthKey = string; // 'YYYY-MM'
export type Segment = 'komersil' | 'subsidi'; export type Lang = 'id' | 'en';
export type I18nText = { key: string; params?: Record<string, string | number> };
export type FeatureKey = 'renterRegistration'|'houseListings'|'panic'|'cctv'|'legal'|'projects'|'handbook'|'vouchers'|'marketplace'|'businesses'|'feedback'|'wifi'|'prepay';
export type ResidentFeature = FeatureKey | 'handover'|'rules'|'moveIn'|'bills'|'cards'|'renovation'|'complaint';
export type RoomId = 'teras'|'carport'|'ruangTamu'|'ruangKeluarga'|'dapur'|'kamarUtama'|'kamar2'|'kamar3'|'kamarMandi'|'kamarMandi2'|'taman';
export type ComplaintCategory = 'kebocoran'|'retak'|'cat'|'keramik'|'pintuJendela'|'listrik'|'pipa'|'plafonAtap'|'lainnya';
export type ExpenseCategory = 'satpam'|'tukangTaman'|'listrik'|'kolamRenang'|'angkutSampah'|'landscape'|'clubhouse'|'lainnya';
export interface WifiPackage { id: string; name: string; mbps: number; price: number; popular?: boolean }
export interface PrepayPackage { id: string; months: number; discountType: 'none'|'percent'|'freeMonths'; value: number; active: boolean }
export interface ProjectSettings {
  ipl: { freeEnabled: boolean; freeMonths: number; dueDay: number };
  wifi: { promoEnabled: boolean; freeMonths: number; packages: WifiPackage[] };
  prepay: { ipl: PrepayPackage[]; wifi: PrepayPackage[]; validUntil: ISODate; noArrearsOnly: boolean };
  cards: { freeCards: number; freeStickers: number; extraStickerPrice: number; extraCardPrice: number; maxExtraCards: number };
  complaints: { windowDays: number; slaDays: Record<ComplaintCategory, number> };
  handover: { intervalDays: number; maxCalls: number; autoBast: boolean };
  renovation: { deposit: number; checklist: string[] };
  overdue: { flagMonths: number };
  fuel: { litersPer1000m2: number; tolerancePct: number };
  budget: Record<ExpenseCategory, number>;
  features: Record<FeatureKey, boolean>;
}
export interface Project { id: string; vlesProjectId: number; name: string; location: string; segment: Segment; businessGroup: 'Vista'|'Harmoni Park'; settings: ProjectSettings }
export interface UnitType { id: string; vlesTypeId: number; projectId: string; name: string; landSize: number; buildingSize: number; rooms: RoomId[]; iplRate: number }
export type Occupancy = 'notReady'|'readyForHandover'|'handedOver'|'occupied';
export interface HandoverCall { n: 1|2|3; sentAt: ISODate; readAt?: ISODate; channels: ('app'|'wa'|'letter')[] }
export interface HandoverChecklist { frontKeys: number; backKeys: number; roomKeys: number; accessCards: number; stickers: number; handbook: number; meterElectric: string; meterWater: string; gift: boolean }
export interface Consequence { id: string; type: 'cardSuspended'|'garbageStopped'|'warningLetter'; startedAt: ISODate; endedAt?: ISODate; by: string; note?: string }
export interface LegalDoc { status: 'process'|'atBank'|'ready'|'withCustomer'; number?: string; steps: { key: string; date?: ISODate }[] }
export interface LegalStatus { scheme: 'KPR'|'cash'; bank?: string; certificate: LegalDoc; pbg: LegalDoc; pbb: LegalDoc & { pickup?: { date: ISODate } } }
export interface Unit {
  id: string; vlesUnitId: number; code: string; projectId: string; typeId: string; ownerCustomerId?: number; akadDate?: ISODate;
  handover: { readySince?: ISODate; calls: HandoverCall[]; slot?: { date: ISODate; time: string }; checklist?: HandoverChecklist; receiptSentAt?: ISODate; bastDate?: ISODate; bastSource?: 'signed'|'auto' };
  appActivatedAt?: ISODate; rules?: { signedAt: ISODateTime; signaturePhotoId: string; version: string };
  moveIn?: { date: ISODate; source: 'security'|'app'|'estate' }; selfReportedMoveIn?: ISODate;
  occupancy: Occupancy; renterId?: string; legal?: LegalStatus; consequences: Consequence[];
}
export interface Customer { customer_id: number; no_ktp: string; no_npwp: string | null; no_hp: string; name: string; email: string }
export interface VlesTransaction { id: number; customer_id: number; unit_id: number; status: 'active'|'cancelled'; akad_date: ISODate; payment_scheme: 'KPR'|'cash' }
export interface VlesUnit { id: number; project_id: number; code: string; unit_type_id: number; sales_category: Segment; business_group_label: 'Vista'|'Harmoni Park'; active_transaction_id: number | null; deleted: boolean; updated_at: ISODateTime }
export interface VlesUnitType { id: number; project_id: number; name: string; land_size: number; building_size: number; sales_category: Segment; deleted: boolean; updated_at: ISODateTime }
export interface Vehicle { type: 'mobil'|'motor'; plate: string }
export interface Renter { id: string; unitId: string; ownerCustomerId: number; name: string; no_ktp: string; no_hp: string; householdSize: number; lease: { start: ISODate; end: ISODate }; iplPayer: 'owner'|'renter'; movedInAt?: ISODate; rulesSignedAt?: ISODateTime; status: 'active'|'ended' }
export interface RenterRegistration { id: string; unitId: string; ownerCustomerId: number; type: 'renter'|'newOwner'; person: { name: string; no_ktp: string; no_hp: string; householdSize: number }; lease?: { start: ISODate; end: ISODate }; leaseDocPhotoId?: string; ajbDate?: ISODate; vehicles: Vehicle[]; moveIn: { date: ISODate; time: string }; iplPayer: 'owner'|'renter'; fee: number; feePaid: boolean; status: 'submitted'|'needsFix'|'approved'|'rejected'; reviewNote?: string; createdAt: ISODateTime; renterId?: string }
export type ResidentIdentity = { kind: 'owner'; customerId: number } | { kind: 'renter'; renterId: string };
export interface Staff { id: string; role: 'security'|'mandor'|'gardener'; name: string; projectIds: string[]; company?: string; phone: string }
export interface Session { resident?: { identity: ResidentIdentity; unitId: string }; staff?: { staffId: string }; dashboard: { projectId: string; roleView: 'all'|'estate'|'contractor'|'mandor' } }
export interface Bill { id: string; unitId: string; kind: 'ipl'|'wifi'; month: MonthKey; amount: number; free: boolean; payer: 'owner'|'renter'; paymentId?: string }
export type BillStatus = 'free'|'upcoming'|'due'|'paid'|'overdue';
export interface Payment { id: string; unitId: string; kind: 'ipl'|'wifi'|'cards'|'deposit'|'registration'; months?: MonthKey[]; amount: number; discount: number; method: 'va'|'qris'|'transfer'|'cash'; paidAt: ISODateTime; recordedBy: 'resident'|'admin'; packageId?: string }
export interface WifiSub { unitId: string; packageId: string; installSlot: { date: ISODate; time: string }; status: 'requested'|'scheduled'|'installed'; installedAt?: ISODate; freeUntil?: MonthKey }
export interface CardOrder { id: string; unitId: string; freeCards: number; freeStickers: number; extraCards: number; extraStickers: number; vehicles: Vehicle[]; total: number; status: 'awaitingPayment'|'toMake'|'ready'|'pickedUp'; createdAt: ISODateTime }
export interface MoveInPermit { id: string; unitId: string; who: 'owner'|'renter'; renterId?: string; date: ISODate; time: '08.00–12.00'|'13.00–17.00'; vehicle: 'pickup'|'trukEngkel'|'trukBesar'; plate?: string; withWifi: boolean; status: 'approved'|'entered'|'cancelled'; enteredAt?: ISODateTime; enteredBy?: string }
export type RenovationStep = 'submitted'|'ownerApproval'|'estateReview'|'awaitingDeposit'|'inProgress'|'inspection'|'bastIssued'|'bastSigned'|'depositReturned'|'rejected';
export interface Renovation { id: string; unitId: string; requestedBy: 'owner'|'renter'; renterId?: string; title: string; description: string; drawingPhotoId?: string; step: RenovationStep; history: { step: RenovationStep; at: ISODateTime }[]; deposit: number; va: string; refundAccount?: string; inspection?: { checklist: Record<string, boolean>; result: 'full'|'deduct'; deduction: number; reason?: string; photoIds: string[] }; objection?: string }
export type FindingStage = 'draft'|'submitted'|'verified'|'assigned'|'inProgress'|'workDone'|'awaitingResident'|'done'|'rejected';
export interface AiResult { verdict: 'valid'|'invalid'|'unclear'; category: ComplaintCategory; confidence: number; noteKey: string; area?: { x: number; y: number; w: number; h: number } }
export interface FixCheck { verdict: 'fixed'|'notFixed'|'wrongArea'; confidence: number; noteKey: string; at: ISODateTime; photoId: string }
export interface Finding { id: string; room: RoomId; photoIds: string[]; description: string; ai: AiResult; manualReview: boolean; category: ComplaintCategory; estateNote?: string; groupId?: string; mandorId?: string; checklist: { label: string; done: boolean }[]; fixChecks: FixCheck[]; stage: FindingStage; history: { stage: FindingStage; at: ISODateTime; by: string }[] }
export interface Complaint { id: string; unitId: string; createdAt: ISODateTime; submittedAt?: ISODateTime; findings: Finding[] }
export interface WorkGroup { id: string; projectId: string; category: ComplaintCategory; refs: { complaintId: string; findingId: string }[]; material: string; estimateDays: number; mandorId?: string; createdAt: ISODateTime }
export interface Feedback { id: string; unitId: string; from: ResidentIdentity; topic: 'saran'|'kebersihan'|'keamanan'|'fasilitas'|'lainnya'; text: string; photoId?: string; status: 'sent'|'read'|'replied'; reply?: string; createdAt: ISODateTime; repliedAt?: ISODateTime }
export interface Announcement { id: string; projectId: string; tag: 'jadwal'|'info'|'penting'; title: string; body: string; date: ISODate; createdAt: ISODateTime }
export interface Notification { id: string; to: string; text: I18nText; link?: string; createdAt: ISODateTime; read: boolean }
export interface PanicSignal { id: string; unitId: string; from: ResidentIdentity; type: 'medis'|'kebakaran'|'pencurian'|'lainnya'|null; awayFromHome: boolean; createdAt: ISODateTime; acceptedAt?: ISODateTime; acceptedBy?: string; resolvedAt?: ISODateTime; outcome?: 'handled'|'falseAlarm'|'cancelled' }
export interface Business { id: string; projectId: string; name: string; category: 'kuliner'|'jasa'|'toko'|'kesehatan'|'pendidikan'; location: string; description: string; whatsapp: string; open: boolean; hasVoucher: boolean; ownerUnitId?: string; status: 'pending'|'verified' }
export interface Listing { id: string; projectId: string; unitId: string; kind: 'dijual'|'dicari'|'jasa'|'info'|'rumahDisewakan'|'rumahDijual'; title: string; price?: number; priceUnit?: 'once'|'month'|'year'; description: string; photoIds: string[]; createdAt: ISODateTime; replies: number; reported: boolean }
export interface Lead { id: string; projectId: string; name: string; whatsapp: string; interest: 'sewa'|'beli'; source: { kind: 'listing'; listingId: string } | { kind: 'project'; projectName: string }; domicile: string; plan: 'bulanIni'|'1-3bulan'|'>3bulan'; status: 'baru'|'dihubungi'|'survei'|'deal'|'batal'; pic: string; consentAt: ISODateTime; createdAt: ISODateTime }
export interface Voucher { id: string; projectId: string; partner: string; category: string; title: string; description: string; valueLabel: string; code: string; validUntil: ISODate; stock: number; tone: 'orange'|'blue'|'yellow'|'grey' }
export interface VoucherClaim { id: string; voucherId: string; holder: string; code: string; claimedAt: ISODateTime; usedAt?: ISODateTime }
export interface Zone { id: string; projectId: string; name: string; area: number; perMonth: number; lastCut?: ISODate }
export interface Machine { id: string; projectId: string; name: string; hours: number; status: 'baik'|'servis' }
export interface MowingLog { id: string; zoneId: string; gardenerId: string; machineId: string; date: ISODate; start: string; end: string; area: number; beforePhotoId: string; afterPhotoId: string; fuelUsed: number; status: 'pending'|'approved'|'rephoto'; note?: string }
export interface FuelEntry { id: string; projectId: string; gardenerId: string; kind: 'buy'|'refill'|'check'; liters: number; amount?: number; machineId?: string; receiptPhotoId?: string; source?: 'kasKecil'|'pribadi'; at: ISODateTime }
export interface Attendance { id: string; gardenerId: string; date: ISODate; at: ISODateTime; selfiePhotoId: string }
export interface Expense { id: string; projectId: string; category: ExpenseCategory; date: ISODate; amount: number; note: string; receiptPhotoId?: string; recurring: boolean; source?: 'fuel'|'manual' }
export interface ActivityLog { id: string; projectId: string; at: ISODateTime; by: string; text: I18nText }
export interface AppData {
  version: number; today: ISODate; seq: Record<string, number>; session: Session;
  vles: { customers: Customer[]; transactions: VlesTransaction[]; units: VlesUnit[]; unitTypes: VlesUnitType[] };
  projects: Project[]; unitTypes: UnitType[]; units: Unit[]; renters: Renter[]; registrations: RenterRegistration[]; staff: Staff[];
  bills: Bill[]; payments: Payment[]; wifi: WifiSub[]; cardOrders: CardOrder[]; moveIns: MoveInPermit[];
  renovations: Renovation[]; complaints: Complaint[]; workGroups: WorkGroup[];
  feedback: Feedback[]; announcements: Announcement[]; notifications: Notification[]; panics: PanicSignal[];
  businesses: Business[]; listings: Listing[]; leads: Lead[]; vouchers: Voucher[]; voucherClaims: VoucherClaim[];
  zones: Zone[]; machines: Machine[]; mowingLogs: MowingLog[]; fuel: FuelEntry[]; attendance: Attendance[]; expenses: Expense[]; activity: ActivityLog[];
}
```

- Produces `clock.ts`: `addDays(d: ISODate, n: number): ISODate`, `diffDays(a: ISODate, b: ISODate): number` (b − a), `monthOf(d: ISODate): MonthKey`, `addMonths(m: MonthKey, n: number): MonthKey`, `monthStart(m): ISODate`, `dayOfMonth(m: MonthKey, day: number): ISODate`, `nowISO(today: ISODate): ISODateTime` (today + the current wall-clock time), `formatDate(d, lang, style: 'short'|'long'|'month')`. All pure, with UTC arithmetic.
- Produces `money.ts`: `formatRp(n: number): string`.
- Produces `i18n/index.ts`:
  - `useT(): (key: string, params?: Record<string,string|number>) => string`, `useLang(): [Lang, (l: Lang) => void]` (stored in `localStorage['vhome.lang']`, default `'id'`)
  - `translate(lang, key, params)`, `tText(t, I18nText)`
  - Loader: `import.meta.glob('./locales/*/*.ts', { eager: true })` merges every file's default export (a flat `Record<string,string>`) per language.
  - Missing EN key → ID value → the key itself.

- [ ] **Step 1: Write failing tests.**
  - `addDays('2026-10-26', 100) === '2027-02-03'`
  - `diffDays('2026-11-10', '2026-12-21') === 41`
  - `addMonths('2026-11', 3) === '2027-02'`
  - `monthOf('2026-03-05') === '2026-03'`
  - `formatDate('2026-11-10','id','long') === '10 Nov 2026'`
  - `formatRp(3780000) === 'Rp3.780.000'`
  - `translate('en','x.greet',{name:'Rina'})` with id `'Halo, {name}'` and en `'Hi, {name}'` returns `'Hi, Rina'`
  - a key missing in en returns the id text
  - **parity test:** every key present in any `locales/id/*.ts` exists in the same-named `locales/en/*.ts`. It runs over all files, so later tasks are covered automatically.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Implement `types.ts`, `clock.ts`, `money.ts`, `i18n/index.ts`. Create `common.ts` pairs with shared labels (buttons, statuses `status.*`, categories `category.<ComplaintCategory>`, occupancy `occupancy.<Occupancy>`, months).
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit `feat: domain types, clock, money, i18n core`.

---

### Task 3: Mock VLES client, identity lookup, seed data

**Files:**
- Create: `src/vles/normalize.ts`, `src/vles/client.ts`, `src/domain/identity.ts`, `src/data/generate.ts`, `src/data/content.ts`, `src/data/floorplans.ts`, `src/data/seed.ts`
- Test: `src/vles/normalize.test.ts`, `src/domain/identity.test.ts`, `src/data/seed.test.ts`

**Interfaces:**
- Consumes: Task 2 types and clock.
- Produces:
  - **Normalisers:** `normalizePhone(s): string` (digits only, leading `0`/`62` → `62`), `normalizeKtp(s): string` (strip spaces, dots and dashes; uppercase), `normalizeNpwp(s): string` (15 digits → prefix `0`).
  - **Client** (all async with an 150–300 ms simulated delay; `data` is passed in, because the client reads `data.vles`):
    - `searchCustomers(data: AppData, q: { customer_id?: number; no_ktp?: string; no_npwp?: string; no_hp?: string }): Promise<{ data: Pick<Customer,'customer_id'|'no_ktp'|'no_npwp'|'no_hp'>[]; meta: { count: number; limit: 20; has_more: boolean } }>`. It throws `{ status: 422 }` when no field is given. All given fields must match.
    - `getTransactions(data, { customer_id })`, `getUnit(data, id): Promise<VlesUnit>`, `getUnitTypes(data, { project_id })`.
  - **Identity** (`identity.ts`):
    - `resolveResident(data: AppData, phone: string, ktp: string): Promise<{ ok: true; identity: ResidentIdentity; unitIds: string[] } | { ok: false; reason: 'notFound'|'noActiveUnit'|'leaseEnded' }>`
    - It checks VLES customers first: search → active transactions → `units` whose `vlesUnitId` matches. If none match, it checks `data.renters` (normalised phone + KTP); a renter whose lease end < `data.today` → `leaseEnded`.
  - **Seed:** `buildSeed(): AppData`, deterministic (`mulberry32(42)` in `generate.ts`).
  - **Content** (`content.ts`): `RULE_SECTIONS`, `EMERGENCY_NUMBERS`, `PROJECT_SHOWCASE` (5 projects using house photos), `HANDBOOK_SECTIONS`, `SLOTS`.
  - **Floor plans** (`floorplans.ts`): `FLOORPLANS: Record<string /*unitTypeId*/, { room: RoomId; x: number; y: number; w: number; h: number }[]>` in a 0–100 grid.

**Seed values (exact):**

| Item | Value |
|---|---|
| Projects | `vh` "Vista Harmoni Residence", Bekasi, komersil, Vista, vlesProjectId 101 · `hp` "Harmoni Park Cibitung", Bekasi, subsidi, Harmoni Park, 202 |
| Unit types `vh` | `vh-36` Tipe 36/72 Rp250.000 · `vh-45` Tipe 45/90 Rp350.000 · `vh-60` Tipe 60/105 Rp450.000 · `vh-75` Tipe 75/120 Rp550.000 |
| Unit types `hp` | `hp-30` Tipe 30/60 Rp120.000 · `hp-36` Tipe 36/72 Rp150.000 |
| Units | `vh`: blocks A1–A3, B1–B3, C1–C3 × 01–18 (162) · `hp`: blocks A1–A5, B1–B5, C1–C5 × 01–20 (300). Ids `vh-B1-02`, codes `B1/02`. |
| Settings defaults | IPL free on, 6 months (vh) / 3 (hp), due day 10 · WiFi promo on, 3 months, packages Basic 30 Mbps Rp199.000, Plus 50 Mbps Rp279.000 (popular), Max 100 Mbps Rp379.000 · prepay IPL: 3 bln none, 6 bln 5%, 12 bln 10%, 24 bln 3 free months (inactive); validUntil 2026-12-31; noArrearsOnly true · cards 1/1, Rp25.000 sticker, Rp50.000 card, max 2 extra · windowDays 100, SLA 7 days (14 for `retak`, `plafonAtap`) · handover 7 days / 3 calls / autoBast on · deposit Rp5.000.000 (vh) / Rp2.000.000 (hp) · flagMonths 2 · fuel 1,8 L / 10% · budget satpam 9.000.000, tukangTaman 3.000.000, listrik 2.200.000, kolamRenang 1.500.000, angkutSampah 1.200.000, landscape 1.200.000, clubhouse 1.000.000, lainnya 500.000 |
| Features | vh: all true · hp: renterRegistration, houseListings, panic, cctv, legal, projects, handbook false; the rest true |

**Personas (exact):**

| Persona | customer_id | no_hp | no_ktp | Unit(s) and state |
|---|---|---|---|---|
| Rina Wijaya | 1102 | 081234560102 | 3275014101900001 | `vh-B1-02` vh-45, akad 2026-03-14 KPR, BAST 2026-10-26 signed, no app activation, no rules, handedOver |
| Andi Pratama | 1107 | 081234560107 | 3275011203850002 | `vh-A1-07` vh-45, BAST 2026-03-05, moveIn 2026-03-20 (security), rules signed, occupied; IPL Sep+Oct 2026 unpaid; complaint KMP-0145 submitted 2026-05-20, one finding `inProgress` (pipa, "air debit kecil") and one `done`; renovation REN-0031 "Kanopi depan" at `awaitingDeposit` · `vh-A3-05` vh-36, BAST 2026-08-14, handedOver, empty |
| Budi Santoso | 1204 | 081234560204 | 3275012505800003 | `vh-B2-04` vh-60, occupied via renter |
| Sari Lestari (renter) | — | 081298760204 | 3275016607950004 | renter `r-1` of `vh-B2-04`, lease 2026-06-01 → 2026-11-30, iplPayer renter, movedInAt 2026-06-02, rules signed |
| Joko Susilo | 2314 | 085712340314 | 3216031508880005 | `hp-C3-14` hp-36, BAST 2026-09-12, moveIn 2026-09-20, occupied, no complaint yet |
| Siti Aminah | 2203 | 085712340203 | 3216034409900006 | `hp-A2-03` hp-30, BAST 2026-06-03, occupied, no complaint |

- **Staff:** `st-sec` Pak Dedi (security, both projects), `st-mandor` Mandor Hasan (mandor, PT Bangun Karya, both), `st-garden` Ujang (gardener, vh).
- **Bulk units:**
  - Generated owners with deterministic names and numbers `0813xxxxxxxx`.
  - Status mix per project: 70% occupied, 8% handedOver, 8% readyForHandover (with 1–3 calls), 14% notReady. BAST dates spread over 2025-09-01..2026-10-31.
  - Payments: 80% fully paid, 12% one month overdue, 8% two or three months overdue.
  - Seed IPL bills for every unit with a BAST, using `syncBills` from Task 4. Task 3 seeds payments only; Task 4 adds the `syncAllBills(data)` call at the end of `buildSeed`.
- **Content:** 8 businesses, 8 listings (one `rumahDisewakan` for `vh-B2-06`), 7 leads, 4 vouchers (Kopi Teras 10%, Harmoni Swim Club gratis 2 tiket, Dapur Bu Rini Rp15rb, Toko Bangunan Jaya 5%), 3 announcements per project, 6 zones + 2 machines (vh, values from wireframe 4i), 6 months of expenses matching the wireframe recap, 4 card orders, 2 move-ins today (`vh-C2-04` 13.00–17.00 pickup B 9876 KLM; `hp-B4-11` 08.00–12.00), 3 historical panic signals, and handover calls for 6 vh units matching wireframe 4b. Legal status for every vh owner unit (Rina KPR: certificate atBank, PBG atBank, PBB ready).

- [ ] **Step 1: Write failing tests.**
  - `normalizePhone('+62 812-3456-0102') === normalizePhone('081234560102') === '6281234560102'`
  - `normalizeKtp('3275.0141 0190-0001') === '3275014101900001'`
  - **Review Focus #2:** `resolveResident(seed,'+62 812 3456 0102','3275 0141 0190 0001')` → `{ ok:true, identity:{kind:'owner',customerId:1102}, unitIds:['vh-B1-02'] }`; the same phone with KTP `3275014101900009` → `{ ok:false, reason:'notFound' }`; `'62812345601'+'07'` with Andi's KTP → unitIds `['vh-A1-07','vh-A3-05']`
  - Sari's phone and KTP → `{ ok:true, identity:{kind:'renter',renterId:'r-1'} }`
  - `searchCustomers(seed,{})` rejects with status 422
  - Seed invariants:
    - every `Unit.vlesUnitId` exists in `vles.units` with the project's segment
    - 162 + 300 units
    - `vh-B1-02` VLES `sales_category === 'komersil'`, `hp-C3-14` `=== 'subsidi'`
    - `buildSeed()` is deep-equal across two calls
- [ ] **Step 2:** Run `npm test -- src/vles src/domain/identity src/data`. Expected: FAIL.
- [ ] **Step 3:** Implement the normalisers, client, identity, generator, content, floor plans and seed.
- [ ] **Step 4:** Run the same tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat: mock VLES, identity lookup, seed data`.

---

### Task 4: IPL, WiFi bills and pay-ahead

**Files:**
- Create: `src/domain/ipl.ts`
- Modify: `src/data/seed.ts` (call `syncAllBills` at the end of `buildSeed`)
- Test: `src/domain/ipl.test.ts`

**Interfaces:**
- Consumes: Task 2 types and clock.
- Produces:
  - `firstBilledMonth(bastDate: ISODate, s: ProjectSettings['ipl']): MonthKey` — `addMonths(monthOf(bast), freeEnabled ? max(1, freeMonths) : 1)`.
  - `syncBills(unit: Unit, type: UnitType, settings: ProjectSettings, renter: Renter | undefined, bills: Bill[], today: ISODate, horizon?: MonthKey): Bill[]` — returns that unit's full IPL bill list. Bills run from the BAST month to `max(currentMonth+1, horizon)`.
    - **Locking:** a month that has started (≤ the current month) or is already paid keeps its stored `amount`/`free`.
    - **Future months** are recomputed from the current settings and rate.
    - **Free rule:** months before `firstBilledMonth` are `free: true, amount: 0`.
    - **Payer:** `'renter'` when that month falls inside an active renter's lease with `iplPayer === 'renter'`, otherwise `'owner'`.
  - `syncWifiBills(sub: WifiSub, pkg: WifiPackage, s: ProjectSettings['wifi'], bills, today): Bill[]` — the free months start from the install month when the promo is on.
  - `syncAllBills(data: AppData): void` (mutates).
  - `billStatus(bill: Bill, today: ISODate, dueDay: number): BillStatus`:
    - `free` if `free`; `paid` if `paymentId` is set
    - `upcoming` if today < month start; `due` if today ≤ due date; otherwise `overdue`
  - `overdueBills(bills, today, dueDay): Bill[]`.
  - `prepayQuote(pkg: PrepayPackage, rate: number): { months: number; gross: number; discount: number; net: number }`:
    - `percent`: discount = round(gross × value/100)
    - `freeMonths`: discount = value × rate
  - `prepayMonths(bills, startFrom: MonthKey, n): MonthKey[]` — the next n unpaid, non-free months from `startFrom`.

- [ ] **Step 1: Write failing tests** (use a vh-45 unit with BAST 2026-03-05, rate 350.000, today 2026-11-10, default settings):
  - Months Mar–Aug have `free: true`; Sep, Oct and Nov are billed at 350.000. Statuses: Sep `overdue`, Oct `overdue`, Nov `due` (due 2026-11-10), Dec `upcoming`.
  - With `freeEnabled:false`, the first billed month is `2026-04`.
  - **Locking:** change the rate to 400.000 and re-sync → Sep/Oct/Nov stay 350.000 and Dec becomes 400.000.
  - **Free-months change:** set freeMonths 6 → 9 after Nov has started → Mar–Nov keep their stored values; Dec becomes free.
  - `prepayQuote({months:12,discountType:'percent',value:10},350000)` → `{ gross:4200000, discount:420000, net:3780000 }`; 6 months 5% → net `1995000`; `freeMonths` 3 on 24 months → discount `1050000`.
  - **Renter payer:** a renter with lease 2026-06-01..2026-11-30, payer renter → Nov payer `'renter'`, Dec payer `'owner'` (Review Focus #4 billing half).
  - No bill ever has an amount above `type.iplRate` (no fee).
- [ ] **Step 2:** Run `npm test -- ipl`. Expected: FAIL.
- [ ] **Step 3:** Implement `ipl.ts`. In `buildSeed`, after payments are generated, call `syncAllBills` and link the seeded payments to bills.
- [ ] **Step 4:** Run `npm test`. Expected: PASS (seed tests included).
- [ ] **Step 5:** Commit `feat: IPL and WiFi billing rules`.

---

### Task 5: Onboarding, feature access, complaint window and stages

**Files:**
- Create: `src/domain/onboarding.ts`, `src/domain/access.ts`, `src/domain/complaints.ts`
- Test: `src/domain/onboarding.test.ts`, `src/domain/access.test.ts`, `src/domain/complaints.test.ts`

**Interfaces:**
- Produces:
  - `onboardingSteps(unit: Unit, ctx: { moveIn?: MoveInPermit }): { key: 'handover'|'app'|'rules'|'moveIn'|'occupied'; done: boolean; date?: ISODate }[]`
  - `isOccupiedFor(identity: ResidentIdentity, unit: Unit, renter?: Renter): boolean` — owner: `unit.occupancy==='occupied'`; renter: `!!renter.movedInAt`.
  - `type AccessResult = { ok: true } | { ok: false; reason: 'segment'|'disabled'|'role'|'notOccupied'|'noBast'|'windowClosed'|'renterIplOwner' }`
  - `canUse(f: ResidentFeature, ctx: { project: Project; unit: Unit; identity: ResidentIdentity; renter?: Renter; complaint?: Complaint; today: ISODate }): AccessResult`. Check order: segment → feature flag → role → occupancy → feature-specific.
    - **Segment-only (komersil):** renterRegistration, houseListings, panic, cctv, legal, projects, handbook.
    - **Renter blocked:** complaint, handover, legal, renterRegistration, houseListings. Bills is blocked with `renterIplOwner` when `iplPayer==='owner'`.
    - **Needs occupied:** vouchers, marketplace, businesses, feedback, panic, cctv, legal.
    - **complaint:** `noBast` if no bastDate. `windowClosed` if the window is closed **and** there is no submitted complaint with an unfinished finding (Review Focus #1).
  - `complaintWindow(bastDate: ISODate | undefined, windowDays: number, today: ISODate): { status: 'notStarted'|'open'|'closed'; endsOn?: ISODate; daysLeft: number; elapsedPct: number }`
  - `TRACKER_STEPS = ['submitted','estateVerify','assigned','inProgress','aiCheck','estateFinal','done'] as const` (7 steps, i18n `complaint.step.<key>`)
  - `STAGE_STEP: Record<FindingStage, number>` = draft 0, submitted 1, verified 2, assigned 3, inProgress 3, workDone 5, awaitingResident 6, done 7, rejected 7.
  - `trackerIndex(c: Complaint): number` — the minimum `STAGE_STEP` over non-rejected findings.
  - `BOARD_COLUMNS: { key: string; stages: FindingStage[] }[]`, in this order:

    | Column key | Stages |
    |---|---|
    | `estateVerify` | submitted |
    | `contractor` | verified |
    | `mandor` | assigned, inProgress |
    | `estateFinal` | workDone |
    | `residentConfirm` | awaitingResident |
    | `done` | done, rejected |

  - `isOverSla(f: Finding, submittedAt: ISODateTime, slaDays: number, today: ISODate): boolean`.

- [ ] **Step 1: Write failing tests.**
  - `complaintWindow('2026-09-12',100,'2026-11-10')` → `{ status:'open', endsOn:'2026-12-21', daysLeft:41 }`
  - `complaintWindow('2026-06-03',100,'2026-11-10').status === 'closed'`
  - **Siti** (closed window, no complaint) → `canUse('complaint')` is `{ ok:false, reason:'windowClosed' }`
  - **Andi** (closed window, KMP-0145 with an `inProgress` finding) → `{ ok:true }` (Review Focus #1)
  - **Rina** (handedOver, not occupied) → vouchers `notOccupied`, complaint `ok`, renterRegistration `ok`
  - **Joko** (subsidi) → panic `segment`, renterRegistration `segment` even with the flag forced true
  - A vh project with `features.cctv=false` → cctv `disabled`
  - **Sari** renter → complaint `role`, bills `ok`, cctv `ok`
  - `trackerIndex` of findings [inProgress, done] → 3
  - `onboardingSteps` for Rina → handover done, app/rules/moveIn/occupied not done
- [ ] **Step 2:** Run `npm test -- onboarding access complaints`. Expected: FAIL.
- [ ] **Step 3:** Implement the three files.
- [ ] **Step 4:** Run the same tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat: onboarding, access matrix, complaint window`.

---

### Task 6: Simulated AI, sample photos, finance and report calculators

**Files:**
- Create: `src/domain/ai.ts`, `src/data/samples.ts`, `public/samples/*.svg`, `src/domain/finance.ts`, `src/domain/report.ts`
- Test: `src/domain/ai.test.ts`, `src/domain/finance.test.ts`, `src/domain/report.test.ts`

**Interfaces:**
- Produces:
  - **Samples:** `SAMPLE_PHOTOS: Record<string, { file: string; kind: 'before'|'after'; base?: string; preset: AiResult | Omit<FixCheck,'at'|'photoId'> }>`. Photo ids are `sample:<ID>`, e.g. `sample:DAMP`.
    - **Before samples:**

      | Id | File | Preset |
      |---|---|---|
      | DAMP | damp-wall.svg | valid, kebocoran, 92 |
      | TILE | cracked-tile.svg | valid, keramik, 89 |
      | PAINT | peeling-paint.svg | valid, cat, 94 |
      | CRACK | wall-crack.svg | valid, retak, 87 |
      | TAP | leaking-tap.svg | valid, pipa, 90 |
      | CLEAN | clean-wall.svg | invalid, lainnya, 88, `ai.note.noDamage` |
      | DARK | dark-blurry.svg | unclear, lainnya, 51, `ai.note.tooDark` |

    - **After samples** for each of DAMP/TILE/PAINT/CRACK/TAP: `<ID>_FIXED` (fixed, 93), `<ID>_NOTFIXED` (notFixed, 86, `ai.fix.stillVisible`), plus `WRONG` (wrongArea, 84, `ai.fix.wrongArea`).
    - Each SVG is a flat illustrated "photo" (800×600) of the scene.
  - **AI functions:**
    - `analyzeComplaintPhoto(input: { photoId: string; stats?: { brightness: number; variance: number }; description: string; room: RoomId }): AiResult`:
      - a sample → its preset
      - else brightness < 45 → unclear `ai.note.tooDark`
      - else variance < 120 → invalid `ai.note.noDamage`
      - else category from `CATEGORY_KEYWORDS` (ID + EN words, e.g. kebocoran: rembes, bocor, lembab, leak, damp; pipa: kran, pipa, wastafel, closet, saluran, tap, pipe; …); no keyword and description < 10 chars → unclear `ai.note.describeMore`; otherwise valid
      - confidence = 70 + (hash(photoId + description) % 26); area from the hash
    - `checkFix(input: { beforePhotoId: string; afterPhotoId: string; afterHash?: string; beforeHash?: string }): Omit<FixCheck,'at'|'photoId'>`:
      - a sample → its preset
      - `afterHash === beforeHash` → notFixed `ai.fix.samePhoto`
      - otherwise fixed with a stable confidence
    - `hashString(s): number`.
  - **Finance:** `fuelReconciliation(entries: FuelEntry[], logs: MowingLog[], s: ProjectSettings['fuel'], month: MonthKey): { opening: number; bought: number; expectedUse: number; closingMeasured: number; unexplained: number; unexplainedPct: number; withinTolerance: boolean; weeks: {...}[] }` and `budgetVsActual(expenses, budget, month)`.
  - **Report:** `monthlyRecap(data, projectId, months: MonthKey[])`, `needsFollowUp(data, projectId): { tag: 'app'|'rules'|'ipl'|'handover'|'overdue'|'sla'|'lease'; text: I18nText; link: string }[]`, `occupancyFunnel(data, projectId)`, `monthlyReport(data, projectId, month)`.

- [ ] **Step 1: Write failing tests.**
  - `analyzeComplaintPhoto({photoId:'sample:DAMP',…})` → category `kebocoran`, verdict `valid`, confidence 92
  - `sample:CLEAN` → `invalid`
  - an upload with `{brightness:30,variance:900}` → `unclear`
  - an upload with `{brightness:140,variance:900}` and "kran wastafel bocor terus" → category `pipa`, valid
  - the same input twice → identical result
  - `checkFix({beforePhotoId:'sample:DAMP', afterPhotoId:'sample:DAMP_NOTFIXED'}).verdict === 'notFixed'`
  - equal hashes → `notFixed`
  - **Fuel reconciliation** (wireframe numbers): opening 2,0, bought 40,0, area 20.200 m² × 1,8 = expected 36,36, measured closing 2,6 → `unexplained ≈ 3.0` (±0.1), pct ≈ 8.2, `withinTolerance === true`
  - `needsFollowUp(seed,'vh')` includes an `app` item for `vh-B1-02` and an `overdue` item for `vh-A1-07`
- [ ] **Step 2:** Run `npm test -- ai finance report`. Expected: FAIL.
- [ ] **Step 3:** Implement the code and draw the 18 SVGs (7 before, 10 after, 1 wrong-area). Seed the fuel entries and mowing logs so the October numbers match the test.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit `feat: simulated AI, finance and report calculators`.

---

### Task 7: Store core: persistence, cross-tab sync, photos, session and demo actions

**Files:**
- Create: `src/store/store.ts`, `src/store/persist.ts`, `src/store/photos.ts`, `src/store/ids.ts`, `src/store/notify.ts`, `src/store/hooks.ts`, `src/store/test/apply.ts`, `src/store/actions/session.ts`, `src/store/actions/demo.ts`
- Test: `src/store/store.test.ts`, `src/store/actions/session.test.ts`

**Interfaces:**
- **Action shape:** `type Action<P> = (d: AppData, p: P) => void` — `d` is an immer draft; throw `new ActionError(key: string)` for user-facing failures.
- **Store:**
  - `useStore`: Zustand with `{ data: AppData; storageOk: boolean; run<P>(a: Action<P>, p: P): { ok: true } | { ok: false; error: string }; reset(): void }`.
  - `run` = `loadLatest()` (persisted state if its `version` is newer) → `produce(latest, d => a(d,p))` → save → broadcast. This read-latest-then-write order covers Review Focus #3.
- **Persistence (`persist.ts`):**
  - `STORAGE_KEY = 'vhome.data.v1'`, `CHANNEL = 'vhome-sync'`.
  - `load(): AppData | null`, `save(d): boolean` (false on throw), `subscribe(cb)`.
  - `version` is incremented on every save.
- **Photos (`photos.ts`):**
  - `savePhoto(file: File | Blob | string): Promise<{ id: string; hash: string; stats: { brightness: number; variance: number } }>` — downscale to ≤1000 px JPEG 0.8, store in IndexedDB under `idb:<uuid>`, and fall back to an in-memory Map on failure.
  - `usePhotoUrl(id: string): string | undefined` — `sample:` ids resolve to `/samples/<file>`.
- **Helpers:**
  - `ids.ts`: `nextId(d, prefix: 'KMP'|'REN'|'REG'|'PAY'|'ORD'|'MOV'|'FB'|'PNC'|'LST'|'LEAD'|'GRP'|'EXP'|'LOG'|'N'|'CLM'|'FUEL'|'ATT'): string` → `KMP-0146` style (4 digits; the seed sets starting counters above existing ids).
  - `notify.ts`: `notify(d, to: string, key: string, params?, link?)` and `logActivity(d, projectId, by, key, params?)`. Recipient keys: `owner:<customerId>`, `renter:<renterId>`, `staff:<staffId>`, `security:<projectId>`, `admin:<projectId>`.
- **Hooks (`hooks.ts`):**
  - `useData<T>(sel: (d: AppData) => T): T`, `useRun()`, `useToday(): ISODate`
  - `useResident(): ResidentCtx | null` where `ResidentCtx = { identity; name: string; phone: string; role: 'owner'|'renter'; unit: Unit; project: Project; type: UnitType; settings: ProjectSettings; segment: Segment; renter?: Renter; ownerName: string; unitIds: string[]; recipientKey: string }`
  - `useAccess(): (f: ResidentFeature) => AccessResult`
  - `useDashboardProject(): Project`, `useNotifications(to: string)`
- **Session actions:** `startResidentSession({ identity, unitId })`, `switchUnit({ unitId })`, `endResidentSession()`, `activateApp({ unitId })` (sets `appActivatedAt=today` if unset; notifies admin), `startStaffSession({ staffId })`, `endStaffSession()`, `setDashboardProject({ projectId })`, `setRoleView({ roleView })`, `markNotificationsRead({ to })`.
- **Demo actions:** `setToday({ date })`, which runs `syncAllBills`, then auto-BAST (Task 8 rule), then lease expiry (Task 9 rule) through the exported hook list `ON_DAY_CHANGE: ((d: AppData) => void)[]` that Tasks 8 and 9 append to. `resetDemo` lives in the store (`buildSeed()` + clear photos).
- **Test helper:** `src/store/test/apply.ts` — `apply<P>(d: AppData, a: Action<P>, p: P): AppData` (immer produce).

- [ ] **Step 1: Write failing tests.**
  - `run(activateApp,{unitId:'vh-B1-02'})` sets `appActivatedAt === '2026-11-10'` and adds a notification to `admin:vh`.
  - **Review Focus #3:** simulate tab B by calling `save()` directly with `seq.KMP` bumped, then `run` in tab A → the result keeps tab B's change.
  - **Review Focus #5:** with `localStorage.setItem` stubbed to throw, `run` still updates `useStore.getState().data` and sets `storageOk === false`.
  - `setToday({date:'2026-12-11'})` → `vh-A1-07` Nov bill becomes `overdue`.
  - `nextId` returns `KMP-0146` after a seed holding KMP-0145.
- [ ] **Step 2:** Run `npm test -- store`. Expected: FAIL.
- [ ] **Step 3:** Implement. Initialise from `load() ?? buildSeed()`. Listen on the BroadcastChannel and on `storage` events to replace `data`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit `feat: store core with persistence and cross-tab sync`.

---

### Task 8: Actions for onboarding, billing, settings and security

**Files:**
- Create: `src/store/actions/onboarding.ts`, `src/store/actions/billing.ts`, `src/store/actions/settings.ts`, `src/store/actions/security.ts`
- Test: `src/store/actions/journeys-a.test.ts`

**Interfaces:**
- **Onboarding** (`onboarding.ts`):
  - `markReadyForHandover({ unitId })`, `sendHandoverCall({ unitId })` (next n, channels: call 1 app+wa, call 2 app+wa, call 3 app+wa+letter; notifies the owner), `markCallRead({ unitId })`, `pickHandoverSlot({ unitId, date, time })`
  - `saveHandoverChecklist({ unitId, checklist })`, `sendHandoverReceipt({ unitId })`
  - `signBast({ unitId })` → bastDate=today, source `signed`, occupancy `handedOver`, sync bills, notify.
  - `issueAutoBast({ unitId })` → source `auto`. Registered in `ON_DAY_CHANGE`: auto-BAST when `calls.length===maxCalls`, no slot, and today ≥ last call + intervalDays.
  - `signRules({ unitId, signaturePhotoId, renterId? })`
  - `requestMoveIn({ unitId, date, time, vehicle, plate?, withWifi, packageId?, renterId? })` — creates a `MoveInPermit` with status approved, notifies `security:<projectId>` and the admin, and creates a WiFi request when `withWifi` is set.
  - `confirmMoveInAtGate({ permitId, staffId })` → permit `entered`. For an owner: unit `moveIn={date:today,source:'security'}`, occupancy `occupied`. For a renter: `renter.movedInAt`. Notifies the resident and admin.
  - `selfReportMoveIn({ unitId, date })`, `confirmSelfReportedMoveIn({ unitId })` (source `app`).
- **Billing** (`billing.ts`):
  - `payBills({ unitId, kind, months, method, packageId? })` — ensures the bills exist (horizon), creates a Payment (net of the package discount), sets `paymentId`, notifies admin.
    - Rejects with `ActionError('error.prepayArrears')` when a package is used, `noArrearsOnly` is on, and overdue bills exist outside `months`.
  - `recordPaymentAdmin({ unitId, months, method, date })`
  - `requestWifi({ unitId, packageId, date, time })`, `setWifiStatus({ unitId, status })` (installed → `freeUntil` from the promo; syncs WiFi bills)
  - `orderCards({ unitId, extraCards, extraStickers, vehicles })` (total from settings; status `toMake` when the total is 0, else `awaitingPayment`), `payCardOrder({ orderId })`, `setCardOrderStatus({ orderId, status })`
  - `applyConsequence({ unitId, type, note? })`, `liftConsequence({ unitId, consequenceId })` (both log activity and notify the owner)
- **Settings** (`settings.ts`): `updateSettings({ projectId, patch: DeepPartial<ProjectSettings> })`, `setUnitTypeRate({ typeId, rate })` — both re-sync the bills of affected units and log activity. Feature flags `renterRegistration`/`houseListings` are forced false for `subsidi`.
- **Security** (`security.ts`): `triggerPanic({ unitId, type, awayFromHome })` (notifies `security:<projectId>`), `cancelPanic({ id })`, `acceptPanic({ id, staffId })`, `resolvePanic({ id, outcome })`.

- [ ] **Step 1: Write the failing journey tests (spec §7).**
  - **J1:** Rina `activateApp` → `signRules` → `requestMoveIn` today → `confirmMoveInAtGate` → `canUse('vouchers').ok === true` and `unit.moveIn.source === 'security'`.
  - **J2:** `markReadyForHandover` on `vh-C3-04` → `sendHandoverCall` → `pickHandoverSlot` → `signBast` → bastDate `2026-11-10` and `complaintWindow(...).daysLeft === 100`.
  - **J6:** Andi `payBills` Sep+Oct via `va` → no `overdue` bills; `applyConsequence(cardSuspended)` then `liftConsequence` → `endedAt` set and 2 activity entries.
  - **J7:** `updateSettings({wifi:{promoEnabled:false}})` → a new WiFi request has no free months; `setUnitTypeRate(vh-45, 400000)` → Andi's Dec bill is 400000 and Nov stays 350000.
  - **Prepay:** Joko 12-month package with an arrears-free unit → payment net equals `prepayQuote` net; with an overdue bill present → error `error.prepayArrears`.
  - **Auto-BAST:** a unit with 3 calls, the last on 2026-10-26, no slot → `setToday('2026-11-02')` → `bastSource === 'auto'`.
  - **J8:** `triggerPanic` → `acceptPanic` → `resolvePanic('handled')` → acceptedAt set and a notification for `security:vh`.
- [ ] **Step 2:** Run `npm test -- journeys-a`. Expected: FAIL.
- [ ] **Step 3:** Implement the four action files.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit `feat: onboarding, billing, settings and security actions`.

---

### Task 9: Actions for complaints, renovation, renters, community, gardener and finance

**Files:**
- Create: `src/store/actions/complaints.ts`, `renovations.ts`, `renters.ts`, `community.ts`, `gardener.ts`, `finance.ts` (all in `src/store/actions/`)
- Test: `src/store/actions/journeys-b.test.ts`

**Interfaces:**
- **Complaints** (`complaints.ts`):
  - `addFinding({ unitId, room, photoIds, description, ai, manualReview })` — creates a draft complaint if missing. Throws `error.windowClosed` when the window is closed, and `error.alreadySubmitted` once submitted. `invalid`/`unclear` results require `manualReview`.
  - `removeFinding({ unitId, findingId })`, `submitComplaint({ unitId })` (all drafts → `submitted`; notify admin)
  - `estateVerifyFinding({ complaintId, findingId, category?, note? })` → verified, `estateRejectFinding({ complaintId, findingId, note })`
  - `createWorkGroup({ projectId, refs, material, estimateDays })`, `assignMandor({ groupId, mandorId })` (refs → `assigned`, checklist from `CHECKLIST_BY_CATEGORY`, notify `staff:<mandorId>`)
  - `startWork({ complaintId, findingId })`, `toggleChecklistItem({ complaintId, findingId, index })`
  - `submitAfterPhoto({ complaintId, findingId, photoId, check })` — appends a FixCheck; `fixed` → `workDone` + notify admin, otherwise stays `inProgress` + notify the mandor.
  - `estateFinalOk({ complaintId, findingId })` → `awaitingResident` + notify the resident, `residentConfirm({ complaintId, findingId })` → `done`.
  - Every stage change appends to `history`.
- **Renovations** (`renovations.ts`):
  - `requestRenovation({ unitId, title, description, drawingPhotoId?, renterId? })` — a renter's request starts at `ownerApproval`, an owner's at `estateReview`; VA = `8808` + unit digits.
  - `ownerDecideRenovation({ id, approve })`, `estateDecideRenovation({ id, approve, note? })` → `awaitingDeposit`/`rejected`
  - `payDeposit({ id })` → `inProgress`, `requestInspection({ id })` → `inspection`
  - `submitInspection({ id, checklist, result, deduction, reason?, photoIds })` → `bastIssued`
  - `signRenovationBast({ id })` → `bastSigned`, `objectRenovation({ id, text })`, `returnDeposit({ id })` → `depositReturned` (refund = deposit − deduction), `setRefundAccount({ id, account })`
- **Renters** (`renters.ts`):
  - `submitRegistration(p: Omit<RenterRegistration,'id'|'status'|'createdAt'|'feePaid'|'fee'>)` — fee = cards + stickers above the free allowance at settings prices.
  - `payRegistrationFee({ id })`, `resubmitRegistration({ id, patch })`
  - `reviewRegistration({ id, decision: 'approve'|'needsFix'|'reject', note? })`. Approving a renter:
    - creates a `Renter` (status active), sets `unit.renterId`
    - creates a MoveInPermit (who renter) and a CardOrder `toMake`
    - re-syncs bills (payer), notifies the owner and `security:<projectId>`
  - Approving `newOwner`: transfers `ownerCustomerId` to a newly created VLES customer with the person's phone and KTP; the old owner's session for that unit is invalid.
  - `endExpiredLeases(d)` is registered in `ON_DAY_CHANGE`: lease end < today → status `ended`, `unit.renterId` cleared, bills re-synced.
- **Community** (`community.ts`): `sendFeedback`, `replyFeedback({ id, reply })`, `publishAnnouncement({ projectId, tag, title, body, date })` (notifies every resident of the project), `registerBusiness`, `verifyBusiness`, `postListing` (house kinds only if `canUse('houseListings')`), `reportListing`, `submitLead({ listingId | projectName, name, whatsapp, domicile, plan, interest })` (notifies the listing owner + admin), `updateLeadStatus`, `claimVoucher({ voucherId, holder })` (stock − 1, code `<VOUCHER.code>-<4 digits>`), `redeemVoucherCode({ code, holder })`.
- **Gardener** (`gardener.ts`): `checkIn({ gardenerId, selfiePhotoId })`, `logMowing(p: Omit<MowingLog,'id'|'status'>)` (updates `zone.lastCut`), `addFuelEntry(p: Omit<FuelEntry,'id'|'at'>)` (`buy` also creates an Expense `tukangTaman`, source `fuel`), `reviewMowingLog({ id, decision: 'approved'|'rephoto', note? })`.
- **Finance** (`finance.ts`): `addExpense(p: Omit<Expense,'id'>)`.

- [ ] **Step 1: Write the failing journey tests.**
  - **J3:** Joko `addFinding(sample:DAMP)` + `addFinding(sample:CLEAN, manualReview:false)` throws `error.needsManualReview` → `submitComplaint` → `estateVerifyFinding` → `createWorkGroup` + `assignMandor(st-mandor)` → `startWork` → `submitAfterPhoto(DAMP_NOTFIXED)` → stage `inProgress` with 1 failed check → `submitAfterPhoto(DAMP_FIXED)` → `workDone` → `estateFinalOk` → `residentConfirm` → `trackerIndex === 7`.
  - **J4:** Siti `addFinding` throws `error.windowClosed`.
  - **J5:** Andi `submitRegistration` (renter for `vh-A3-05`, lease 2026-11-15..2027-11-14, payer renter, 1 extra card) → fee 50000 → `payRegistrationFee` → `reviewRegistration('approve')` → `resolveResident` with the new renter's phone + KTP returns the renter identity, and `syncBills` for Dec has payer `'renter'`.
  - **Review Focus #4:** `setToday('2026-12-01')` → Sari's renter status `ended`, `vh-B2-04.renterId` undefined, `resolveResident` with Sari → `leaseEnded`, and the Dec bill payer is `'owner'`.
  - **J9:** `postListing(rumahDisewakan)` then `submitLead` → the leads count +1 and the owner gets a notification.
  - **J10:** `addFuelEntry(buy, 5 L, Rp50.000)` → an expense of 50000 exists; `logMowing` sets `zone.lastCut`.
  - **J11:** `sendFeedback` → `replyFeedback` → status `replied`.
- [ ] **Step 2:** Run `npm test -- journeys-b`. Expected: FAIL.
- [ ] **Step 3:** Implement the six action files.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit `feat: complaint, renovation, renter, community, gardener actions`.

---

### Task 10: UI kit, launcher, demo page

**Files:**
- Create in `src/ui/`: `theme.ts`, `SegmentTheme.tsx`, `Button.tsx`, `Card.tsx`, `Chip.tsx`, `StatusPill.tsx`, `Sheet.tsx` (bottom sheet), `Modal.tsx`, `Tabs.tsx`, `Segmented.tsx`, `Field.tsx` (Input/Select/Textarea), `Toggle.tsx`, `Stepper.tsx` (horizontal steps), `Timeline.tsx` (vertical), `Progress.tsx`, `EmptyState.tsx`, `Moni.tsx`, `MoniBubble.tsx`, `IconTile.tsx`, `PhoneFrame.tsx`, `PhotoPicker.tsx`, `SignaturePad.tsx`, `Toast.tsx`, `AiScanning.tsx`, `LangToggle.tsx`, `DataTable.tsx`, `Kpi.tsx`
- Create: `src/apps/launcher/Launcher.tsx`, `Demo.tsx`, `DemoToolbar.tsx`
- Create: `src/i18n/locales/{id,en}/ui.ts`, `launcher.ts`

**Interfaces:**
- **Theme:** `SEGMENT_THEME: Record<Segment | 'security'|'mandor'|'gardener', { brand: string; brandDark: string; tint: string }>`. `<SegmentTheme segment>` sets `--brand*` vars on its subtree.
- **Primitives:**
  - `<Moni pose: 'wave'|'waveSm'|'point'|'thumbs'|'crossed'|'cool' size?: number />`
  - `<IconTile icon: LucideIcon tone: 'yellow'|'red'|'orange'|'green'|'aqua'|'blue'|'violet'|'grey' locked?: boolean badge?: string label: string onClick />`
  - `<PhotoPicker samples?: string[] onPicked(r: { id: string; hash: string; stats? }) />` — offers camera/upload (`<input type=file accept=image/* capture=environment>` → `savePhoto`) and a sample strip.
  - `<SignaturePad onChange(dataUrl | null) />` — canvas, pointer events, "Ulangi".
  - `<AiScanning label />` — a scanning-line animation shown 1.5–2.5 s.
  - `<PhoneFrame>` — 390×844 rounded device on ≥768 px, passthrough below.
  - `useToast().show(text)`.
- **Launcher (`/`):** three cards (Aplikasi warga, Aplikasi petugas, Dashboard estate) with persona quick-picks. Each persona chip shows name, unit and phone + NIK, and deep-links to `/app/login?persona=<customerId|renterId>`, `/staff?staff=<id>` or `/dashboard`.
- **DemoToolbar:** shows the demo date, +1 hari / +1 minggu / +1 bulan / +100 hari (`setToday`), Reset, and the storage-unavailable notice.
- **`/demo`:** two iframes side by side (left: `/app` or `/staff` chosen by a segmented control; right: `/dashboard`), with the DemoToolbar above.

- [ ] **Step 1:** Build the primitives. Every visible string comes from `ui.ts` / `launcher.ts`.
- [ ] **Step 2:** Build the Launcher, DemoToolbar and Demo.
- [ ] **Step 3:** Run `npm run build && npm test`. Expected: exit 0, all PASS (the parity test covers the new dictionaries).
- [ ] **Step 4:** Browser check:
  - `npm run dev`, open `/` → 3 surface cards with persona chips.
  - "+1 bulan" changes the date to `10 Des 2026`; Reset returns it to `10 Nov 2026`.
  - `/demo` shows two frames.
  - The ID/EN toggle switches launcher copy.
- [ ] **Step 5:** Commit `feat: UI kit, launcher and side-by-side demo`.

---

### Task 11: Resident shell, auth flow, account, notifications

**Files:**
- Create: `src/apps/resident/ResidentShell.tsx`, `routes.tsx`, `auth/{Splash,Login,Otp,UnitPicker,Welcome}.tsx`, `screens/{Account,Notifications,Locked}.tsx`
- Create **stubs** (one-line placeholder component each, filled by Tasks 12–16):
  - home: `home/{CommercialHome,SubsidizedHome,RenterHome}.tsx`
  - screens: `screens/{Handover,Rules,MoveIn,Bills,Wifi,Cards,Renters,RenterRegistrationWizard,Renovation,RenovationDetail,Complaint,ComplaintCapture,ComplaintTracker,Legal,Emergency,Cctv,Feedback,Businesses,Marketplace,ListingPost,ListingDetail,Vouchers,Projects,Handbook}.tsx`
- Create: `src/i18n/locales/{id,en}/resident-shell.ts`

**Interfaces:**
- **Routes** (all under `/app`):
  - **auth:** `splash`, `login`, `otp`, `units`, `welcome`
  - **main:** `home`, `bills`, `market`, `vouchers`, `account`, `notifications`
  - **screens:** `handover`, `rules`, `move-in`, `wifi`, `cards`, `renters`, `renters/new`, `renovation`, `renovation/:id`, `complaint`, `complaint/new/:room`, `complaint/track`, `legal`, `emergency`, `cctv`, `feedback`, `businesses`, `market/new`, `market/:id`, `projects`, `handbook`, `locked/:feature`
- **Guard:** `<RequireFeature f>` redirects to `locked/:feature` when `useAccess()(f)` is not ok. The reason is passed so Locked can explain it with Moni `crossed`.
- **Shell:**
  - `SegmentTheme` from the session unit.
  - Bottom nav: Beranda, Tagihan, Jual beli, Voucher, Akun.
  - "Developed by Vistaland" footer under the nav, in the frame.
- **Login:**
  - phone + NIK fields and persona chips (from `?persona=` or a chip tap)
  - Calls `resolveResident`, then shows an inline error for each failure reason (`login.error.notFound`/`noActiveUnit`/`leaseEnded`).
- **OTP:**
  - a 6-digit code generated client-side and shown in a simulated SMS toast; there is no hard 60 s resend.
  - Verifying runs `startResidentSession` (first unit) → `activateApp`. Then:
    - more than one unit → `units`
    - first activation → `welcome` (confetti + Moni `thumbs` + next steps)
    - else → `home`
- **Account:** profile, role badge (Pemilik / Penyewa · milik X), unit switcher, language toggle, logout.
- **Notifications:** list for `recipientKey`, mark read, deep links.
- **Locked:** Moni `crossed` "Sabar ya" + reason text + CTA to the unblocking step.

- [ ] **Step 1:** Build the shell, routes, guard and stubs.
- [ ] **Step 2:** Build the auth screens, Account, Notifications and Locked.
- [ ] **Step 3:** Run `npm run build && npm test`. Expected: exit 0, PASS.
- [ ] **Step 4:** Browser check:
  - Log in as Rina with `+62 812 3456 0102` / `3275 0141 0190 0001` → OTP → welcome.
  - Log in as Andi → unit picker shows 2 units.
  - Log in as Sari → the Account role says "Penyewa · milik Budi Santoso".
  - A wrong NIK → the not-found message.
  - Joko's app is teal, Rina's red.
- [ ] **Step 5:** Commit `feat: resident shell and login`.

---

### Task 12: Resident homes, onboarding screens, WiFi, cards

**Files:**
- Fill: `home/CommercialHome.tsx`, `home/SubsidizedHome.tsx`, `home/RenterHome.tsx`, `screens/{Handover,Rules,MoveIn,Wifi,Cards,Handbook}.tsx`
- Create: `home/MenuGrid.tsx`, `home/OnboardingCard.tsx`, `src/i18n/locales/{id,en}/resident-home.ts`

**Interfaces:**
- Consumes: hooks, `onboardingSteps`, `canUse`, `complaintWindow`, `billStatus`, onboarding/billing actions.
- **`MENU` definition** (in `MenuGrid.tsx`): `{ feature: ResidentFeature; icon; tone; labelKey; route }[]` in three groups (§6.2).
  - Rumah saya: handover, rules, moveIn, cards, wifi, bills, complaint (badge "<n> hr"), renovation, legal, renterRegistration
  - Keamanan: panic, cctv, numbers (→ emergency), feedback, handbook
  - Komunitas: vouchers, marketplace, businesses
  - Tiles whose `canUse` reason is `segment`/`disabled`/`role` are hidden; `notOccupied` tiles show locked.

- [ ] **Step 1: CommercialHome.**
  - Header: search, bell with an unread count, SOS (→ emergency), lang toggle; unit chip + occupancy pill.
  - OnboardingCard: Moni `waveSm` bubble with the next step, a progress "x dari 5", step rows with CTAs.
  - Status trio: IPL (free until / overdue n), WiFi (promo or status), cards.
  - Prepay strip (active packages), promo carousel (voucher + WiFi promo only when `promoEnabled`), locked notice when not occupied, MenuGrid.
  - Rows: vouchers (locked style when not occupied), latest listings, PROJECT_SHOWCASE, announcements for the project.
- [ ] **Step 2:** SubsidizedHome — a teal greeting header, the "Siapkan rumah Anda" checklist, IPL card, WiFi card, and a quick-action grid (Renovasi, Komplain, Kendaraan & kartu, Kotak masukan, Usaha warga, Info estate → announcements sheet).
- [ ] **Step 3:** RenterHome — a dark header with a "Penyewa" badge, "Halo, {name}", "Unit {code} · sewa {start} – {end}", a Darurat button.
  - "Persiapan masuk" checklist: account active, cards paid, rules, cards picked up, move-in.
  - IPL card (if payer renter), renovation card (pending owner approvals shown), a 2×3 shortcut grid, and an owner-only note.
- [ ] **Step 4:** Handover — call banner (call n of 3, sent date), pick from `SLOTS` → `pickHandoverSlot`, "Lihat BAST" sheet with an OTP sign → `signBast` (only after the estate has sent the receipt), receipt view, done state with the BAST date.
- [ ] **Step 5:** Rules — accordion of `RULE_SECTIONS`, agree checkbox, SignaturePad, "Tanda tangani" (enabled only with both) → `savePhoto(signature)` → `signRules`; signed state with date and version.
- [ ] **Step 6:** MoveIn:
  - date (≥ today), slot, vehicle radio, plate, "Sekalian pasang WiFi" (when the feature is on) → package and slot step → `requestMoveIn`
  - status card once submitted ("Terdaftar di security")
  - "Saya sudah mulai tinggal" → `selfReportMoveIn`
- [ ] **Step 7:** Wifi — promo hero (only when `promoEnabled`, shows `freeMonths`), packages, 5-day date strip + 2 slots → `requestWifi`; status view.
- [ ] **Step 8:** Cards — the free allowance card, vehicle type + plate, extra steppers (max from settings), total → `orderCards` / `payCardOrder` via the pay sheet; order status list.
- [ ] **Step 9:** Handbook — sections from `HANDBOOK_SECTIONS` + the unit-type floor plan.
- [ ] **Step 10:** Run `npm run build && npm test`. Expected: PASS.
- [ ] **Step 11:** Browser check:
  - Rina home shows red, 1/5 → 2/5 after app activation, voucher tile locked.
  - Sign rules → 3/5.
  - Request move-in today → shows on the security list (verified in Task 17).
  - Joko home teal with no panic tile.
  - Toggle the WiFi promo off in the console (`useStore.getState().run(updateSettings, …)`) → the promo banner disappears.
- [ ] **Step 12:** Commit `feat: resident homes and onboarding screens`.

---

### Task 13: Resident bills and payments

**Files:**
- Fill: `screens/Bills.tsx`
- Create: `screens/PaySheet.tsx`, `src/i18n/locales/{id,en}/resident-bills.ts`

**Interfaces:** Consumes `billStatus`, `prepayQuote`, `prepayMonths`, `payBills`.

- [ ] **Step 1:** IPL tab:
  - hero card: status "Gratis s/d {month}" / "{n} bulan tertunggak" / "Lunas s/d {month}", first bill info, rate from the unit type
  - month list with status pills; overdue rows say "Lewat jatuh tempo {date}" and never show a fine
  - "Bayar sekarang" selects the due and overdue months
  - Pay-ahead section: commercial always, subsidized behind a "Bayar di muka (opsional)" button. Only active packages appear, "Paling hemat" goes on the biggest discount, each shows net and per-month price.
  - riwayat pembayaran
- [ ] **Step 2:** WiFi tab — package, free until, bills, pay.
- [ ] **Step 3:** PaySheet:
  - method VA / QRIS
  - VA number `8808 <unit digits> <kind code>` with "Salin", or a QR placeholder
  - "Simulasikan pembayaran" → `payBills` → success with Moni `thumbs` + a receipt
  - Shows the `error.prepayArrears` message when thrown.
- [ ] **Step 4:** Renter view — the bills tab is shown only if the payer is the renter; the guard message otherwise comes from Locked.
- [ ] **Step 5:** Run `npm run build && npm test`. Expected: PASS.
- [ ] **Step 6:** Browser check:
  - Andi sees Sep/Oct overdue, no "Denda"; pays both → the list shows Lunas and dashboard data updates (checked in Task 19).
  - Joko's 12-month package shows `Rp1.620.000` net (12 × 150.000 − 10%).
- [ ] **Step 7:** Commit `feat: resident bills and payments`.

---

### Task 14: Resident complaint with AI, and renovation

**Files:**
- Fill: `screens/{Complaint,ComplaintCapture,ComplaintTracker,Renovation,RenovationDetail}.tsx`
- Create: `screens/FloorPlan.tsx`, `src/i18n/locales/{id,en}/resident-complaint.ts`

**Interfaces:** Consumes `complaintWindow`, `trackerIndex`, `TRACKER_STEPS`, `FLOORPLANS`, `analyzeComplaintPhoto`, `SAMPLE_PHOTOS`, complaint and renovation actions.

- [ ] **Step 1:** Complaint overview:
  - window bar "sisa {n} hari" with elapsed %, plus "100 hari sejak BAST {date} · dikirim 1 kali"
  - Before submit: FloorPlan (tap a room → `complaint/new/:room`), rooms with findings highlighted with counts, findings list (thumb, room, category chip, delete), "Kirim komplain ({n} temuan)" confirm sheet → `submitComplaint`.
  - After submit: link to the tracker.
  - Blocked state when `canUse` says `windowClosed`: Moni `crossed`, "Masa komplain 100 hari sudah lewat sejak BAST {date}", a contact-estate button.
- [ ] **Step 2:** ComplaintCapture:
  - PhotoPicker with before samples
  - description field
  - "Cek dengan AI" → `AiScanning` for 1.8 s → `analyzeComplaintPhoto`
  - result card:
    - verdict colour + icon, category chip (editable dropdown), confidence %, translated note, highlight rectangle over the photo from `area`
  - Valid → "Tambahkan ke laporan" → `addFinding`. Invalid/unclear → "Ambil ulang" or "Minta tinjau estate" (`manualReview:true`).
- [ ] **Step 3:** ComplaintTracker:
  - a 7-step Stepper at `trackerIndex`
  - per-finding cards with a stage pill, history timeline, before/after photos, latest AI fix verdict
  - "Konfirmasi selesai" on `awaitingResident` → `residentConfirm`
- [ ] **Step 4:** Renovation:
  - list with step pills, "+ Ajukan baru" form (title, description, drawing photo)
  - For an owner, a section "Pengajuan penyewa menunggu persetujuan Anda" with approve/reject → `ownerDecideRenovation`.
- [ ] **Step 5:** RenovationDetail:
  - step timeline
  - deposit card (amount, VA, Salin, "Simulasikan transfer" → `payDeposit`), refund account field
  - after inspection: deposit, deduction, refund, "Tanda tangani BAST renovasi" / "Ajukan keberatan"
- [ ] **Step 6:** Run `npm run build && npm test`. Expected: PASS.
- [ ] **Step 7:** Browser check:
  - As Joko, tap Kamar 2 → sample DAMP → AI valid *Kebocoran & rembes* 92%; CLEAN → invalid; submit 2 valid findings → tracker at step 2.
  - Siti → blocked screen.
  - Andi → tracker for KMP-0145 accessible.
- [ ] **Step 8:** Commit `feat: resident complaint with AI and renovation`.

---

### Task 15: Resident renter registration and commercial-only screens

**Files:**
- Fill: `screens/{Renters,RenterRegistrationWizard,Legal,Emergency,Cctv,Projects}.tsx`
- Create: `src/i18n/locales/{id,en}/resident-commercial.ts`

- [ ] **Step 1:** Renters — the list of registrations per unit with status, review note and "Perbaiki" for `needsFix`; the active renter card with lease dates; "+ Daftarkan penghuni baru".
- [ ] **Step 2:** Wizard (5 steps: Jenis, Identitas, Kendaraan, Pindahan, Bayar):
  - **Jenis:** Penyewa or Pemilik baru.
  - **Identitas:**
    - name, NIK (16 digits), phone, household size
    - lease start/end (renter) or AJB date (new owner)
    - lease document photo
  - **Kendaraan:** list + add.
  - **Pindahan:** date ≥ today, slot, IPL payer.
  - **Bayar:** fee breakdown from settings → `submitRegistration` + PaySheet → `payRegistrationFee`.
  - Validation is inline per step.
- [ ] **Step 3:** Emergency:
  - big PANIK button → 5 s countdown with "Batalkan" (`cancelPanic` if a signal was created) → `triggerPanic`
  - incident chips selectable during the countdown, an "I'm not home" checkbox
  - live status: "Menunggu security" → "Security menuju lokasi" (when accepted)
  - numbers list from `EMERGENCY_NUMBERS` with `tel:` links
- [ ] **Step 4:** Cctv — six camera tiles with a simulated feed (CSS noise + timestamp + camera name), "Security on duty" card; a renter-access note for owners whose unit has an active renter.
- [ ] **Step 5:** Legal:
  - KPR/cash summary chips
  - Certificate, PBG and PBB cards with step timelines and "Unduh salinan" (opens a printable view)
  - PBB pickup: 3 date chips → stores `legal.pbb.pickup` through a small action added to `onboarding.ts` as `schedulePbbPickup({ unitId, date })` with a test in `journeys-a.test.ts`
- [ ] **Step 6:** Projects — the Harmoni Fest promo card, area filter chips, PROJECT_SHOWCASE cards with "Lihat lokasi" (maps link) and "Tanya marketing" (form sheet → `submitLead({projectName})`).
- [ ] **Step 7:** Run `npm run build && npm test`. Expected: PASS.
- [ ] **Step 8:** Browser check:
  - Andi registers a renter for A3/05 → pays → the status says "Menunggu verifikasi".
  - Rina's emergency tile is locked; an occupied commercial persona triggers panic → the countdown → the signal exists (seen in Task 17).
- [ ] **Step 9:** Commit `feat: renter registration and commercial screens`.

---

### Task 16: Resident community screens and public listing page

**Files:**
- Fill: `screens/{Feedback,Businesses,Marketplace,ListingPost,ListingDetail,Vouchers}.tsx`
- Fill: `src/apps/public/ListingPage.tsx`
- Create: `src/i18n/locales/{id,en}/resident-community.ts`, `src/i18n/locales/{id,en}/public.ts`

- [ ] **Step 1:** Feedback — topic chips, textarea, optional photo → `sendFeedback`; an emergency call card; "Masukan saya" with status pills and estate replies.
- [ ] **Step 2:** Businesses — search, category chips, cards (initial avatar, open/closed, WhatsApp `https://wa.me/<62…>`, "Ada voucher warga" chip), "Daftarkan usaha saya" form → `registerBusiness` (shows "Menunggu verifikasi").
- [ ] **Step 3:** Marketplace:
  - tabs Semua/Rumah (commercial only)/Jual/Dicari/Jasa, listing cards, "+ Pasang" → ListingPost
  - ListingPost kinds are filtered by `canUse('houseListings')`; a house listing shows a share card with the public URL `/listing/:id` and a copy button
  - ListingDetail has a report action
- [ ] **Step 4:** Vouchers — red/teal hero with a code input → `redeemVoucherCode`, tabs Tersedia / Milik saya (n), voucher cards with a tone colour block and "Klaim" → `claimVoucher` → a code sheet with Moni `cool`.
- [ ] **Step 5:** Public ListingPage — no app shell. Photo, title, price, project, description, an interest form (name, WhatsApp, domicile, plan select, consent checkbox required) → `submitLead` → a thank-you state; "Atau beli rumah baru" strip from PROJECT_SHOWCASE.
- [ ] **Step 6:** Run `npm run build && npm test`. Expected: PASS.
- [ ] **Step 7:** Browser check:
  - As Andi, post "Rumah A3/05 disewakan" → open the public link in a new tab → submit a lead → Andi's notifications show the lead.
  - Claim the Kopi Teras voucher → it appears in "Milik saya".
- [ ] **Step 8:** Commit `feat: community screens and public listing page`.

---

### Task 17: Field-staff app

**Files:**
- Create: `src/apps/staff/StaffShell.tsx`, `routes.tsx`, `StaffLogin.tsx`
- Create: `security/{MoveInsToday,Emergency}.tsx`, `contractor/{Tasks,TaskDetail,History}.tsx`, `gardener/{Today,MowLog,Fuel,History}.tsx`
- Create: `src/i18n/locales/{id,en}/staff.ts`

**Interfaces:**
- **Routes:** `/staff` (login: pick a staff card or `?staff=<id>`), `/staff/security/{movein,emergency}`, `/staff/mandor/{tasks,tasks/:groupId/:complaintId/:findingId,history}`, `/staff/garden/{today,mow,fuel,history}`.
- **Shell:** coloured header per role, bottom nav per role, PhoneFrame, logout, lang toggle.

- [ ] **Step 1:** Security:
  - MoveInsToday:
    - header "Pos gerbang utama · Pindahan hari ini · {date}"
    - an active panic banner if any
    - search by unit or plate, permit cards (unit, slot, occupant count, vehicle, plate, renter badge) → "Sudah masuk" → `confirmMoveInAtGate` → the card shows "Masuk {time}"
    - an empty-list note
  - Emergency:
    - active signal card (unit, resident, type, time, mini site map with the unit pin) → "Terima — saya menuju lokasi" (`acceptPanic`) → "Selesai" with outcome handled / false alarm (`resolvePanic`)
    - call buttons
    - a 60 s escalation note
    - history list with response minutes
- [ ] **Step 2:** Mandor:
  - Tasks: work groups assigned to the mandor, each listing its findings across units with stage pills.
  - TaskDetail:
    - the before photo + AI category, "Mulai kerjakan" (`startWork`), checklist toggles
    - after-photo PhotoPicker with the samples `<BASE>_FIXED`, `<BASE>_NOTFIXED`, `WRONG` + upload → `AiScanning` → `checkFix` → `submitAfterPhoto`
    - verdict card (pass → "Menunggu cek akhir estate"; fail → reason + "Foto ulang")
  - History: completed findings.
- [ ] **Step 3:** Gardener:
  - Today: selfie attendance via PhotoPicker → `checkIn`, today's target, zone schedule (from `zones` + `lastCut`), jerrycan balance, machines, estate message.
  - MowLog, a 4-step stepper: zone map grid → start (before photo, timer starts) → mowing (timer) → finish (after photo, machine, fuel used) → `logMowing`.
  - Fuel tabs:
    - Beli di SPBU: liters, Rp, receipt photo, source → `addFuelEntry(buy)`
    - Isi ke mesin: machine, liters → `addFuelEntry(refill)`
    - plus a week history
  - History: KPIs (area, time, L/1000 m², on-time), logs needing a re-photo, log list with statuses.
- [ ] **Step 4:** Run `npm run build && npm test`. Expected: PASS.
- [ ] **Step 5:** Browser check (two tabs):
  - Tab 1 Rina requests a move-in today; tab 2 security sees it within 1 s and taps "Sudah masuk" → Rina's home unlocks without reload.
  - A panic from Andi appears on security; accepting updates Andi's screen.
  - As mandor, KMP-0145's finding: NOTFIXED → fail, FIXED → pass.
- [ ] **Step 6:** Commit `feat: field-staff app`.

---

### Task 18: Dashboard shell, summary, handover, residents, leads

**Files:**
- Create: `src/apps/dashboard/DashboardShell.tsx`, `routes.tsx`, `components/{PageHeader,UnitLink,Sidebar,ProjectSwitcher}.tsx`
- Create pages `pages/{Summary,Handover,Residents,Leads}.tsx`
- Create **stubs** for `pages/{Report,IplList,UnitDetail,Prepay,Complaints,CardsOverdue,Finance,Security,Community,Settings}.tsx`
- Create: `src/i18n/locales/{id,en}/dashboard-shell.ts`, `dashboard-core.ts`

**Interfaces:**
- **Routes** under `/dashboard`: `summary`, `handover`, `residents`, `leads`, `report`, `ipl`, `ipl/:unitId`, `prepay`, `complaints`, `cards`, `finance`, `security`, `community`, `settings`.
- **Sidebar:**
  - Items are hidden by feature: `leads` needs `houseListings || projects`; the renter queue inside `residents` needs `renterRegistration`; `prepay` needs `prepay`.
  - Project switcher at the top (`setDashboardProject`). The top bar holds the DemoToolbar (compact), the lang toggle and the admin chip.
- **`<UnitLink unitId>`** routes to `ipl/:unitId`.

- [ ] **Step 1:** Shell, sidebar, switcher and stubs.
- [ ] **Step 2:** Summary:
  - funnel bars (`occupancyFunnel`)
  - "Perlu dikejar" (`needsFollowUp`, tags + links)
  - occupancy table for owner units with recent activity (unit, owner, BAST, app, rules, mulai huni, source, IPL pill; the renter tag "Penyewa · milik X" under the unit when there is one)
  - three cards: pending renovations (approve / request revision → `estateDecideRenovation`), open complaints (count + over-SLA), scheduled move-ins
  - "Buat laporan bulanan" → `report`
- [ ] **Step 3:** Handover:
  - KPI cards
  - table (unit, ready since, calls 1–3 with read state, status, schedule/deadline) with actions: Kirim panggilan (`sendHandoverCall`), Buka form, Terbitkan BAST (auto), Lihat BAST
  - "+ Unit siap serah terima" picker of `notReady` units → `markReadyForHandover`
  - form panel with checklist fields → `saveHandoverChecklist` + `sendHandoverReceipt`
  - rules card showing the settings values (editable link to Settings)
- [ ] **Step 4:** Residents:
  - tabs Semua penghuni / Verifikasi (n) / Sewa habis ≤30 hari
  - The directory shows Pemilik / Penyewa · milik X / Pemilik baru tags.
  - The verification table opens a detail panel (identity, lease, docs, vehicles, fees, rules state, move-in plan, IPL payer, "Saat disetujui otomatis:" explainer) with Setujui / Minta perbaikan (note) / Tolak → `reviewRegistration`.
  - A "Renovasi oleh penyewa" card.
- [ ] **Step 5:** Leads — KPIs, a "Dari mana leads datang" 4-step explainer, filter chips (Semua/Beli/Sewa/Belum dihubungi), table with a status dropdown (`updateLeadStatus`), masked phone, Export CSV.
- [ ] **Step 6:** Run `npm run build && npm test`. Expected: PASS.
- [ ] **Step 7:** Browser check:
  - Approve Andi's registration from Task 15 → the new renter can log in (`/app/login`).
  - Switching to Harmoni Park hides Leads and the verification tab.
  - Sending a handover call shows in the resident's handover screen.
- [ ] **Step 8:** Commit `feat: dashboard shell, summary, handover, residents, leads`.

---

### Task 19: Dashboard IPL, unit detail, pay-ahead promo, cards and overdue

**Files:**
- Fill: `pages/{IplList,UnitDetail,Prepay,CardsOverdue}.tsx`
- Create: `src/i18n/locales/{id,en}/dashboard-billing.ts`

- [ ] **Step 1:** IplList:
  - KPIs: handed over, still free, must pay this month, collection %, overdue units + total, not handed over
  - Daftar | Matriks 12 bulan toggle, search, block select, status chips with counts
  - table: unit, owner (+ renter tag), BAST, move-in, free until, IPL pill (no fines), overdue Rp, "Perlu tindakan" flag (≥ `flagMonths`), active consequences, Detail
  - The matrix renders 12 months × units with coloured cells (F/L/T/·), virtualised by pagination (50 rows per page).
- [ ] **Step 2:** UnitDetail:
  - header: unit, owner, type, rate, phone, total overdue
  - timeline: BAST → move-in → free IPL ends → billing starts
  - monthly status grid, payment history
  - "Catat pembayaran" panel: months checkboxes with "telat {n} hari" labels, amount auto-sum, date, method, proof upload → `recordPaymentAdmin`. There is **no Denda option**.
  - "Konsekuensi manual" panel: active list + buttons (Putus kartu akses, Stop angkut sampah, Kirim surat peringatan) with a note → `applyConsequence`, Pulihkan → `liftConsequence`; the activity log
  - legal status editor (commercial)
- [ ] **Step 3:** Prepay:
  - IPL / WiFi tabs and KPIs
  - package editor rows (Tanpa/Persen/Gratis bln segmented, − value +, computed price + savings at the reference rate, active toggle)
  - valid-until date, "only units without arrears" checkbox
  - "Simpan & tampilkan di app" → `updateSettings`
  - a live phone-style preview using the same component logic as the resident pay-ahead section
  - buyers table
- [ ] **Step 4:** CardsOverdue:
  - order KPIs, order table with actions (Selesai dibuat → kabari = `setCardOrderStatus('ready')`, Serah terima = `pickedUp`)
  - Overdue section: rule text built from settings ("Tunggakan ≥ {n} bulan ditandai perlu tindakan — konsekuensi diterapkan manual"), filter chips, table with consequence pills and "Kirim peringatan" / action menu → `applyConsequence`
  - "Daftar untuk petugas sampah" CSV export, "Riwayat putus & pulih" sheet
- [ ] **Step 5:** Run `npm run build && npm test`. Expected: PASS.
- [ ] **Step 6:** Browser check:
  - A1/07 is flagged "Perlu tindakan".
  - Suspend card → Andi gets a notification.
  - Andi pays in the app → the row turns Lunas live.
  - Setting the 6-month package to 7% → Joko's app quote updates.
- [ ] **Step 7:** Commit `feat: dashboard billing, promo, cards and overdue`.

---

### Task 20: Dashboard complaints and renovation, security, community

**Files:**
- Fill: `pages/{Complaints,Security,Community}.tsx`
- Create: `components/{FindingCard,FindingDrawer,RenovationInspection}.tsx`, `src/i18n/locales/{id,en}/dashboard-ops.ts`

- [ ] **Step 1:** Complaints header and toolbar:
  - KPIs: active findings, average days to done, rejected by AI check (fix checks failed this month), units whose window ends ≤ 7 days without a complaint
  - role tabs Semua/Estate/Kontraktor/Mandor (filter columns: estate → estateVerify + estateFinal; contractor → contractor; mandor → mandor)
  - **category bar:** a chip per `ComplaintCategory` with counts and a click to filter
  - a "Kelompokkan per kategori" toggle that groups cards inside each column under category headers
- [ ] **Step 2:** Board:
  - The `BOARD_COLUMNS` are horizontally scrollable.
  - FindingCard shows the unit, room, category chip (AI or corrected), AI confidence, SLA badge, and the latest fix-check verdict (green "Lolos AI" / red "Tidak lolos — kembali ke mandor").
  - Column actions:
    - **estateVerify:** Koreksi (category/room/note) / Valid → kontraktor / Tolak
    - **contractor:** multi-select verified findings of one category → "Gabungkan & tugaskan" (material, estimate, mandor select) → `createWorkGroup` + `assignMandor`
    - **estateFinal:** before/after side by side + "OK → kabari warga" (`estateFinalOk`)
  - FindingDrawer shows the full history and photos.
- [ ] **Step 3:** Renovation section:
  - table (id, unit, requester incl. renter tag, job, deposit status, step) with actions per step (approve/reject, mark inspection)
  - RenovationInspection panel: checklist from settings, Kembalikan penuh / Potong kerusakan (amount, reason, photos) → `submitInspection`; "Kembalikan deposit" after the resident signs → `returnDeposit`
- [ ] **Step 4:** Security — active and historical panic table (unit, type, created, accepted by, response min, outcome), false-alarm count per unit this month, move-ins today and upcoming.
- [ ] **Step 5:** Community, four tabs:
  - **Kotak masukan:** list, status, reply box → `replyFeedback`
  - **Pengumuman:** compose → `publishAnnouncement`, list
  - **Usaha:** pending → `verifyBusiness`
  - **Voucher & iklan:** vouchers with stock and claims, reported listings
- [ ] **Step 6:** Run `npm run build && npm test`. Expected: PASS.
- [ ] **Step 7:** Browser check — complete journey J3 across `/demo` (Joko app ↔ dashboard ↔ mandor) and watch the resident tracker update at each step. Grouping by category shows Kebocoran with Joko's finding.
- [ ] **Step 8:** Commit `feat: dashboard complaints, renovation, security, community`.

---

### Task 21: Dashboard finance, report, settings

**Files:**
- Fill: `pages/{Finance,Report,Settings}.tsx`
- Create: `src/i18n/locales/{id,en}/dashboard-admin.ts`

- [ ] **Step 1:** Finance:
  - period select, KPIs (income = IPL + other payments, cost, surplus/deficit, break-even units = ceil(cost / average rate))
  - "Catat biaya" form (category chips, date, amount, note, receipt photo, recurring) → `addExpense`
  - budget vs actual table with bars
  - 6-month income vs cost bar chart (recharts) + recap table
  - Fuel section: KPIs, a reconciliation card from `fuelReconciliation` (standard and tolerance editable → `updateSettings`), the weekly table, physical check entry → `addFuelEntry(check)`, per-machine and per-zone tables, "Perlu dicek" flags, the gardener logs queue (approve / request re-photo → `reviewMowingLog`)
  - latest expenses table, Export CSV
- [ ] **Step 2:** Report (`monthlyReport`):
  - period select
  - summary bullets generated from the numbers
  - six health tiles with Baik/Perhatian/Pantau badges
  - priority action list from `needsFollowUp`
  - four sections (occupancy, IPL collection + overdue table, finance chart + biggest costs, operations: complaint stage bar, renovation, suggestions, mowing, fuel, community, cards)
  - "how to read" glossary, signature block
  - "Unduh PDF" → `window.print()` with print CSS that hides the shell
- [ ] **Step 3:** Settings — sections per §6.4 with inputs bound to `updateSettings`; the unit-type rate table → `setUnitTypeRate`.
  - Feature toggles; the subsidized project's renterRegistration/houseListings toggles are locked off with the tooltip.
  - Each section shows "Berlaku langsung di aplikasi warga" and the last change from `activity`.
- [ ] **Step 4:** Run `npm run build && npm test`. Expected: PASS.
- [ ] **Step 5:** Browser check:
  - J7: turn off the WiFi promo and set Tipe 45 to Rp400.000 → Rina's home and bills update in the other frame.
  - J10: Ujang's fuel purchase appears in the latest expenses and the reconciliation.
  - The report prints without the sidebar.
- [ ] **Step 6:** Commit `feat: dashboard finance, report, settings`.

---

### Task 22: End-to-end verification, polish, README

**Files:**
- Create: `README.md` (run instructions, persona table with phone + NIK, demo script for journeys 1–11, the swap point for the real VLES API)
- Modify: any file needing fixes found in this task

- [ ] **Step 1:** Run `npm test`. Expected: all PASS. Run `npm run build`. Expected: exit 0 with no type errors.
- [ ] **Step 2:** Walk journeys J1–J11 from spec §7 in `/demo` at 1440×900 and the resident app at a 390×844 viewport. Record each as pass/fail with a screenshot.
- [ ] **Step 3:** Switch to EN and visit every resident, staff and dashboard route. There should be no raw keys (`foo.bar`) and no Indonesian left in the UI chrome.
- [ ] **Step 4:** Fix every failure found in Steps 2–3, re-running Step 1 after the fixes.
- [ ] **Step 5:** Write the README.
- [ ] **Step 6:** Commit `docs: README and final fixes`.
