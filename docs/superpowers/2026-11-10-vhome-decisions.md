# VHome prototype: decisions log

Every decision taken during implementation where the plan was silent, wrong or in conflict with the spec, in the order made, with what it costs if wrong. Also the final review outcome and the items deliberately left for later.

Spec: `docs/superpowers/specs/2026-11-10-vhome-prototype-design.md` · Plan: `docs/superpowers/plans/2026-11-10-vhome-prototype.md`

## Final review

A fresh reviewer read the whole branch (de77db4..55331fb). Verdict: ready with fixes; no critical issues. All important findings, plus four minor ones re-graded up by their effect on users, were fixed test-first in commit `aaa86d9`:

- WiFi pay-ahead charging for months it didn't cover — journeys-a "WiFi 6-month package after paying…" / "…during the free promo…" RED→GREEN, suite 137/137.
- renters paying or pre-paying owner months (action payer guard, renter-only bills hook, packages limited to the lease, receipt to whoever paid); Rp0 payments refused — journeys-a renter/owner/nothing-to-pay tests + Bills.test "a renter only sees…" RED→GREEN, suite 138/138.
- fix-link (?fix=) opening another owner's registration and resubmit changing owner/unit/type — RenterRegistrationWizard.test + journeys-b "registration fixes stay with their owner" RED→GREEN, suite 141/141.
- double approval leaving two active renters — journeys-b "a unit cannot end up with two active renters…" RED→GREEN, suite 142/142.
- logins shared across tabs — session kept per tab (sessionStorage, only changed parts written so /demo frames don't clash), another tab's data taken but never its login — store.test "each tab keeps its own login" RED→GREEN, suite 144/144.
- missing demo bar and storage notice in /app and /staff — PhoneApps.test RED→GREEN, suite 146/146.
- stale-tab repeats: panic accept/resolve/cancel once, verify/reject only from submitted, no group reassignment, after-photo only while work is open, group + assign in one action — guards.test RED→GREEN, suite 150/150.
- "same photo" check never firing for uploads (photo hash stored with the finding, fixCheckFor) — ai.test RED→GREEN, suite 151/151.
- (re-graded) auto-BAST dated on the landing day instead of the deadline — journeys-a "an automatic BAST is dated on its deadline…" RED→GREEN, suite 152/152.
- (re-graded) "+62 0812…" not logging in and login spinning forever when the lookup fails — normalize.test + Login.test RED→GREEN, suite 154/154.
- (re-graded) settings accepting out-of-range values — journeys-a "settings refuse values…" RED→GREEN, suite 155/155.

## Rulings

- **Setup**: work on `main` in the project folder (no worktree) — user approved the plan, which states "commit after every task on branch main"; folder was not a repo before — cost if wrong: history lives on main instead of a feature branch.
- **Setup**: committed spec+plan as initial commit de77db4 before Task 1 so task-start has a BASE — cost if wrong: none.
- **Pre-flight**: T8 J2 uses `vh-C3-04` for markReadyForHandover but T3 seeds C3/04 already ready with calls (wireframe 4b). J2 test uses the first `notReady` vh unit instead — markReadyForHandover on an already-ready unit is meaningless — cost if wrong: none.
- **Task 1**: hand-wrote the Vite scaffold instead of `npm create vite` — target dir not empty and the CLI is interactive; same files — cost if wrong: none.
- **Task 1**: extract-assets uses `pdfimages -all -f 2 -l 10` and keeps icon + houses as JPEG (`moni/icon.jpg`, `houses/house-N.jpg`) — disk had ~130 MB free and full PNG conversion filled it — cost if wrong: later tasks must import .jpg for those files.
- **Task 1**: script resolves its root with fileURLToPath — URL-encoded path wrote to a sibling "FDE%20Projects" folder (moved outputs, removed only the vistaland-app subfolder it created) — cost if wrong: none.
- **Task 2**: i18n exposes createTranslator(dicts) and builds translate from the merged dictionaries — lets the test use fixture dictionaries; added a no-duplicate-key test — cost if wrong: none.
- **Task 3**: vlesConfig.latencyMs lets tests run with zero simulated delay — cost if wrong: none.
- **Task 3**: seed content (rules, handbook, emergency numbers, project blurbs) is bilingual `{id,en}` objects in content.ts — spec says UI strings are bilingual and estate content is estate-authored; bilingual content avoids Indonesian leaking into EN mode — cost if wrong: none.
- **Task 3**: wireframe handover dates shifted relative to 10 Nov 2026 (C3/04, C3/06, C2/10, C1/03, B3/07) so deadlines are not already past — cost if wrong: none.
- **Task 3**: Oct tukangTaman manual expense is 2.600.000; Task 6 adds the Oct fuel purchases (≈400.000) so the category totals 3.0 jt as in the wireframe — cost if wrong: Oct tukangTaman off by the fuel amount.
- **Task 4**: plan test "freeMonths 6 → 9 makes Dec free" miscounted (9 months from March end in Nov); test uses 10 so Dec is the not-yet-started month that turns free — cost if wrong: none, the rule under test is unchanged.
- **Task 4**: syncWifiBills signature is (sub, pkg, bills, today, horizon?) — WiFi free months are fixed into sub.freeUntil at install time, so the settings argument in the plan is not needed — cost if wrong: none.
- **Task 5**: owners without a BAST are blocked from complaint, rules, moveIn and renovation (reason `noBast`) — spec onboarding order puts these after handover — cost if wrong: an owner could not pre-sign rules before BAST.
- **Task 5**: CHECKLIST_BY_CATEGORY (mandor work checklists) lives in domain/complaints.ts so Task 9 and the seed share it — cost if wrong: none.
- **Task 6**: AI keyword matching checks object categories (keramik, pintu/jendela, listrik, pipa, plafon/atap) before symptom categories (cat, retak, kebocoran) and matches at word starts — "kran wastafel bocor" is plumbing, not a leak; avoids "cat" matching inside words — cost if wrong: an ambiguous description lands in the object category; estate can correct it.
- **Task 6**: fuel reconciliation rounds expected use to 0,1 L before computing the gap (36,36 → 36,4) — matches the wireframe's 3,0 L · 8,2% — cost if wrong: ±0,1 percentage point.
- **Task 6**: sample files are named damp.svg/tile.svg… (not damp-wall.svg etc.) and extra doc samples were added (SIGNATURE, LEASE, SELFIE, RECEIPT, LAWN_*) because the seed references them — cost if wrong: none.
- **Task 6**: gardener/fuel seed lives in src/data/seedGarden.ts; kolam zone lastCut set to 6 Okt to match its single October log — cost if wrong: none.
- **Task 7**: ActionError lives in src/store/errors.ts (store.ts re-reads it by duck-typed `key`) — avoids an import cycle between store and actions — cost if wrong: none.
- **Task 7**: activity log ids use prefix ACT; LOG is already used for mowing logs in the seed — cost if wrong: none.
- **Task 7**: nextId test expects KMP-0148 — the seed holds KMP-0146/0147 beyond the plan's example — cost if wrong: none.
- **Task 7**: hooks add useDerived(fn) (memoised on the data snapshot) and residentContext() returns null for an invalid session (unit sold, lease ended) — Zustand 5 selectors must return stable references; null lets the app send the user back to login — cost if wrong: none.
- **Task 8**: signBast requires the estate's key receipt first (error.receiptFirst) and the J2 test includes saveHandoverChecklist + sendHandoverReceipt — spec journey 2 orders receipt before BAST; plan's test list skipped it — cost if wrong: none.
- **Task 8**: auto-BAST test uses seed units vh-C1-03 (fires on 10 Nov) and vh-C2-10 (fires on 16 Nov) instead of a synthetic unit — cost if wrong: none.
- **Task 8**: payBills with packageId computes the months itself via new domain prepayPlan() (next n billed, unpaid months from the current or first billed month) — the UI cannot know months beyond the generated bills — cost if wrong: none.
- **Task 8**: applyConsequence/liftConsequence take `by` (actor name) for the activity log; triggerPanic takes `from` (resident identity) — both needed by the log/notification — cost if wrong: none.
- **Task 8**: i18n interpolation renders ISO-date params in the reader's language; money params are stored pre-formatted with formatRp — notifications are stored data read in either language — cost if wrong: none.
- **Task 9**: RenterRegistration gains optional `cards?: number` (total cards requested); fee = stickers beyond the free allowance (one per vehicle) + cards beyond the free allowance — the fixed type had no card count to compute "1 extra card → Rp50.000" — cost if wrong: none.
- **Task 9**: approving a registration requires the fee to be paid (error.feeUnpaid) — wireframe shows fees paid before approval — cost if wrong: estate cannot approve unpaid registrations.
- **Task 9**: finding ids use their own counter seq.F; seed sets seq.r = 2 so new renters start at r-3 — avoids id collisions — cost if wrong: none.
- **Task 9**: submitLead takes projectId for "Ask marketing" leads (lead belongs to the resident's project so its estate/marketing team sees it) — cost if wrong: none.
- **Task 9**: added src/store/actions/index.ts that imports every action module so day-change rules (auto-BAST, lease expiry) always register; UI imports actions from there — cost if wrong: none.
- **Task 10**: added helper components beyond the plan list (AppBar, Avatar, Photo, Section, Confetti, DevelopedBy footer, cx) and domain helper addMonthsToDate (test-first) for the "+1 bulan" button — cost if wrong: none.
- **Task 10**: PhoneFrame's screen has a CSS transform so `fixed` sheets/toasts stay inside the phone on desktop — cost if wrong: none.
- **Task 11**: RequireFeature takes `allow` reasons — complaint route allows windowClosed (screen shows the blocked state itself) and emergency allows notOccupied (key numbers are always available; panic button locks inside) — cost if wrong: none.
- **Task 12**: PaySheet (screens/PaySheet.tsx) and FloorPlan (apps/resident/FloorPlan.tsx) built here instead of Tasks 13/14 — Cards and Handbook need them first; later tasks reuse them — cost if wrong: none.
- **Task 13**: "Bayar sekarang" pays overdue + the currently due month together (the due month is payable today) — cost if wrong: residents pay one month earlier than strictly required.
- **Task 13**: a "1 bulan" option (no discount) sits beside the configured pay-ahead packages, as in the wireframe — cost if wrong: none.
- **Task 14**: a resident may change the AI-chosen category before adding a finding; the chosen category is stored in the finding's ai result — estate can still correct it later — cost if wrong: the original AI guess isn't kept separately.
- **Task 14**: resident requests the renovation inspection ("Pekerjaan selesai, ajukan inspeksi") — no plan screen covered who moves inProgress → inspection — cost if wrong: none.
- **Task 15**: the emergency screen restores an unresolved signal for the unit when reopened, and owners whose unit has an active renter see CCTV locked (spec: renters keep access while the owner doesn't) — cost if wrong: none.
- **Task 15**: the wizard preselects the owner's first unit without a renter that isn't the current lived-in unit (A3/05 for Andi) — cost if wrong: one extra tap to change unit.
- **Task 16**: house listings let the owner pick which of their units is listed (default: first not-yet-occupied unit) — the marketplace is locked for an empty unit per the wireframe, but renting out an empty unit is the main house-listing case — cost if wrong: none.
- **Task 17**: staff app uses the staff member's first project for gardener screens; security sees all their projects — cost if wrong: none.
- **Task 18**: seed REG for Lukas (A2/05) had fee 0 + feePaid false, which submitRegistration never produces and reviewRegistration refuses — seed now feePaid true; journey test "estate can approve the seeded free registration" RED→GREEN — cost if wrong: none, matches the action's own rule.
- **Task 18**: markCallRead existed but nothing called it, so the dashboard "dibaca" column could never update — the resident Handover screen now marks the latest unread call read on open (Handover.test.tsx RED→GREEN) — cost if wrong: estate sees "read" when the owner only opened the screen, which is the intended meaning.
- **Task 18**: OTP SMS toast showed twice under React StrictMode (dev) — guarded per code with a ref (Otp.test.tsx RED→GREEN) — cost if wrong: none.
- **Task 18**: lead PIC "Pemilik B2/06" was stored Indonesian text — listing leads now render a translated "Owner of {unit}" from the lead source; CSV headers/values translated — cost if wrong: marketing PIC names still come from data.
- **Task 18**: Residents role filter hides the "Penyewa" chip when renter registration is off (subsidized) — spec says subsidized homes are owner-occupied.
- **Task 19**: per-unit billing rows (overdue months/amount, "needs action" = overdue ≥ flagMonths, active consequences) live in domain/report.ts unitBillingRows, shared by IPL list, unit detail and arrears table — tests "billing rows flag…" / "billing rows list only active consequences…" RED→GREEN — cost if wrong: none.
- **Task 19**: the legal status editor needed an action the plan didn't list — added updateLegalDoc (status change appends a dated step, notifies owner, logs activity; refused for units without legal records) with 3 tests RED→GREEN — cost if wrong: step keys follow the existing seed vocabulary.
- **Task 19**: activity log printed raw consequence codes ("cardSuspended") — keys split per type (activity.consequenceApplied.<type>); recordPaymentAdmin now logs activity.paymentRecorded (optional by) — journey tests RED→GREEN — cost if wrong: none.
- **Task 19**: matrix uses a 5th cell "J/D" (due, unpaid, not yet late) besides F/L/T/· — otherwise this month's unpaid bills would look like "no bill" — cost if wrong: one extra legend entry.
- **Task 19**: "same component logic as the resident pay-ahead section" done by extracting PrepayGrid/prepayOptions from Bills.tsx and using it in both places (resident WiFi pay-ahead now uses the same cards) — cost if wrong: WiFi cards gained the per-month line and badges.
- **Task 19**: residents could not see a consequence applied to them — owner Bills screen now lists active consequences (Bills.test.tsx RED→GREEN); dashboard unit page hints "arrears paid, restore services" when consequences outlive arrears — cost if wrong: none; spec requires consequences stay manual, nothing auto-restores.
- **Task 20**: board KPIs (active findings, avg days to done, failed AI fix checks this month, windows closing ≤7 days with no complaint) live in report.ts complaintKpis with 2 tests RED→GREEN — cost if wrong: none.
- **Task 20**: brief's "Koreksi (category/room/note)" needed room on estateVerifyFinding — added optional room; createWorkGroup now refuses findings that aren't verified, are already grouped, or mix categories (UI enforces it too; protects two-tab races) — tests RED→GREEN — cost if wrong: none.
- **Task 20**: reported listings had no way to be handled — added resolveListingReport (keep clears flag / remove takes down + notifies poster); publishAnnouncement now requires title and body — tests RED→GREEN — cost if wrong: one extra action.
- **Task 20**: renovation checklist keys inspect.* were never translated — added in dashboard-ops (global) — cost if wrong: none.
- **Task 20**: security stats use a rolling 30 days instead of calendar month (brief said "this month" for false alarms) — calendar month showed all zeros on 10 Nov — cost if wrong: label says "30 hari terakhir", easy to switch back.
- **Task 20**: estate-final quick action opens the drawer (before/after side by side) instead of a one-click OK on the card — the brief asks for before/after next to the OK — cost if wrong: one extra click.
- **Task 21**: spec §6.4 lists "consequence types offered" but settings had no field — added overdue.offered (seed: all three; older saved data falls back to all via offeredConsequences); applyConsequence refuses a type not offered; unit page and arrears table only show offered types — test RED→GREEN — cost if wrong: one setting.
- **Task 21**: report health tiles use fixed thresholds in reportHealth (occupancy ≥80/60%, collection ≥85/70%, finance surplus / deficit ≤10% of cost, over-SLA 0 / ≤2, fuel within tolerance / ≤2× tolerance, rules signed ≥90/75%) — test RED→GREEN — cost if wrong: badge colors shift; thresholds are in one function.
- **Task 21**: settings activity logged one entry per section (activity.settingsChanged.<section>) and rate changes log a formatted amount, so "last change" per section can be shown and the log reads in both languages — J7 test updated RED→GREEN — cost if wrong: none.
- **Task 21**: chart colors use the validated categorical slots 1–2 (#2a78d6 income, #eb6834 cost; validator ALL PASS) instead of brand red/teal, so income/cost don't read as status — cost if wrong: two hex values.
- **Task 21**: settings save per section (draft + Simpan) rather than on every keystroke, to avoid half-typed values reaching residents and flooding the activity log — cost if wrong: one extra click per section.
- **Task 22**: renovation detail was readable (and its deposit payable) for any renovation id by URL — now scoped to the signed-in unit, and to the renter's own requests (RenovationDetail.test.tsx RED→GREEN) — cost if wrong: none.
- **Task 22**: dashboard IPL pill said "Free → Des 2026" from the last generated bill while the app said Mar 2027 — iplState takes the real freeUntil (IplPill.test.ts RED→GREEN) — cost if wrong: none.
- **Task 22**: resident handover screen kept the "pick a slot within 7 days" call card after a slot was booked — hidden once booked (Handover.test.tsx RED→GREEN) — cost if wrong: none.
- **Final**: simultaneous same-instant writes from two tabs — stands; plan asks for read-latest-then-write, which holds — cost if wrong: a write within the same millisecond can be lost.
- **Final**: staff can open any finding by URL — stands; staff login is tap-your-name by design — cost if wrong: none in a demo.
- **Final**: admin can open any project's unit page by URL — stands; the admin covers both projects and the page says which project — cost if wrong: none.
- **Final**: WiFi always billed to the owner — stands; the owner orders the WiFi and the spec doesn't make it a renter cost — cost if wrong: renter-paid WiFi isn't modelled.
- **Final**: card orders and free allowance are per unit, shared by owner and renter — stands; spec silent, per-unit matches how the estate issues cards — cost if wrong: a renter gets no fresh free card.
- **Final**: the owner of a rented, occupied unit keeps "occupied" features (vouchers, panic) — stands; occupancy is per unit — cost if wrong: owners living elsewhere see those menus.
- **Final**: owner and renter of one unit see and can cancel each other's panic signal — stands; same household address, rare — cost if wrong: one can cancel the other's alert.
- **Final**: Hendra's seeded registration fee Rp75.000 vs rule 0 — stands as seed history — cost if wrong: one cosmetic number.
- **Final**: resident-chosen category stored in ai.category (Task 14) — stands — cost if wrong: the AI's original guess isn't kept separately.
- **Final**: act() warnings in UI tests — stand; noise only — cost if wrong: none.

## Deferred minor items

- marketplace listing detail (/app/market/:id) does not check the listing's project, so a resident can view (and report) another project's listing by URL; house listings are public anyway.
- resubmitting a sent-back registration keeps the old fee, so adding vehicles or cards adds no charge.
- approving a sale (new owner) carries the seller's arrears and consequences to the buyer, gives an existing customer a duplicate customer id, and logs the seller out if they were on that unit.
- unsaved edits on the pay-ahead page are wiped when another tab writes data.
- the "listing taken down" notification links to /app/marketplace (route is /app/market).
- photos the browser can't decode (e.g. HEIC on desktop) are stored uncompressed; savePhoto compression has no test.
- saving IPL/WiFi settings re-syncs every unit one by one (~0.5 s on Harmoni Park).
- package price uses the current rate even if an included month is locked at an older rate; the 1-month card shows the current rate but charges the locked amount.
- a renter whose lease ends mid-session is sent to login without the "lease ended" message.
- switching units from Account doesn't record app activation.
- saved data has no format version, so seed fixes only reach a browser after Reset data.
