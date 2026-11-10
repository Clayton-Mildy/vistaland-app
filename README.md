# VHome · Vistaland resident app prototype

A clickable, fully working prototype of **VHome**: the resident app for Vistaland home owners and renters, a field-staff app (security, contractor foreman, gardener), and the estate web dashboard. Everything runs in the browser on demo data, and every screen reads from the same data, so an action in one app shows up in the others right away.

- **Resident app** (`/app`): built as a phone app. The **commercial** project (Vista Harmoni Residence, red) gets the full app. The **subsidized** project (Harmoni Park Cibitung, teal) gets a simpler version. Which one you see depends on who logs in.
- **Field-staff app** (`/staff`): security post, contractor foreman, gardener.
- **Estate dashboard** (`/dashboard`): occupancy, handover, residents and renters, leads, IPL billing, pay-ahead offers, complaints and renovation, cards and arrears, finance, security, community, monthly report, settings.
- **Demo view** (`/demo`): on a laptop, the phone (resident or staff) next to the dashboard, so you can watch changes travel between them. The floating **Demo** button (bottom right) opens the demo controls: the view (side by side, app only, or dashboard only, each filling the screen), which app the phone shows, the demo date, reset and language. Hidden screens stay loaded, so switching keeps logins and scroll position, and links like `/demo?view=phone` or `/demo?view=dashboard` open straight into one view. On a phone, `/demo` opens the customer app full screen, with the same **Demo** button for the date, reset and language.

Indonesian is the default language. Every screen has an ID / EN toggle.

## Run it

Requires Node 18 or newer.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173 (Vite picks the next free port if 5173 is taken). The launcher links to every app. For demos, start at http://localhost:5173/demo.

```bash
npm test
```

```bash
npm run build
```

`npm run build` type-checks and builds to `dist/`; `npm run preview` serves that build.

## Logging in

Residents log in with **phone number + NIK (KTP number)**, matched against the purchase records, then a one-time code. In the demo the code is shown on screen. Phone numbers work in any format (`0812…`, `62812…`, `+62 812-…`), and NIK can include spaces, dots or dashes.

The login screen has one-tap demo accounts. You can also type them:

| Persona | Role | Unit · project | Phone | NIK | Good for showing |
|---|---|---|---|---|---|
| Rina Wijaya | Owner | B1/02 · Vista Harmoni (commercial) | 0812-3456-0102 | 3275014101900001 | Onboarding: handed over, app not activated yet, rules and move-in still to do, so some menus are locked |
| Andi Pratama | Owner of two units | A1/07 (lived in) and A3/05 (empty) · Vista Harmoni | 0812-3456-0107 | 3275011203850002 | Unit switcher, 2 months of IPL arrears (no late fee), renter registration, house listing, renovation |
| Sari Lestari | Renter | B2/04 · Vista Harmoni, owned by Budi Santoso | 0812-9876-0204 | 3275016607950004 | Renter view ("milik Budi Santoso"), lease ending this month, IPL paid by renter |
| Joko Susilo | Owner | C3/14 · Harmoni Park (subsidized) | 0857-1234-0314 | 3216031508880005 | Subsidized app, complaint with AI photo check |
| Siti Aminah | Owner | A2/03 · Harmoni Park (subsidized) | 0857-1234-0203 | 3216034409900006 | Complaint window closed after 100 days |
| Bagus Prakoso | Renter | A1/09 · Vista Harmoni | 0812-7700-1109 | 3275010303920007 | Renter whose IPL stays with the owner |

A pending renter registration (Lukas Wibowo, A2/05) waits in **Dashboard → Penghuni & penyewa → Verifikasi**. Approve it, then log in as Lukas with `0812-0000-1117` / `3275012209910009`.

Staff log in by tapping their name at `/staff`: **Pak Dedi** (security), **Mandor Hasan** (contractor foreman), **Ujang** (gardener). The dashboard opens as the estate admin without a login.

## Demo controls

Every app has a small demo bar:

- **Demo date**: the prototype's "today" starts at **10 Nov 2026**. `+1 hari`, `+1 minggu`, `+1 bulan` and `+100 hari` move it forward. Bills, overdue marks, handover calls, the complaint window and lease ends all follow this date.
- **Reset data** restores the starting data (it asks first).

Data is saved in the browser (`localStorage`, key `vhome.data.v1`; photos in IndexedDB). Open several tabs and they stay in sync live. Each tab has its own login, so one tab can be the owner and another the renter; a new tab starts logged out. If browser storage is blocked (some private windows), the app still works and shows a notice that changes won't survive a reload.

## Demo script (journeys 1–11)

Use `/demo` on a laptop. The **Demo** button switches the phone between **Warga** (resident) and **Petugas** (staff); the right side is the dashboard. Each journey starts from fresh data (**Reset data** in the same panel).

1. **Onboarding unlocks the app (Rina).** Log in as Rina → welcome → *Peraturan*: sign → *Pindahan*: pick today, tick "Sekalian pasang WiFi" → *Ajukan izin*. Switch to Petugas → Pak Dedi → *Pindahan hari ini* → **Sudah masuk**. Back on Rina, the locked tiles open. Dashboard → *Ringkasan*: B1/02 shows "Konfirmasi security".
2. **Handover (dashboard → resident).** Dashboard → *Serah terima* → **Unit siap serah terima** → *Tandai siap* on the first unit, A1/10 (call 1 goes out). Log in as its owner, Umi Firmansyah (`0813-5100-0266` / `3275590332852992`), open *Serah terima*, pick a slot. Dashboard → **Buka form** → **Kirim tanda terima**. Resident → **Lihat & tanda tangani BAST** → enter the code. Free IPL and the 100-day complaint window now start from today (see *Tagihan* and *Komplain*).
3. **Complaint with AI (Joko).** Joko → *Komplain* → tap a room → sample **Dinding rembes** → **Cek dengan AI** (valid, Kebocoran & rembes, 92%) → add → try **Dinding bersih** (rejected: no visible damage) → **Kirim komplain**. Dashboard (switch project to Harmoni Park) → *Komplain & renovasi*: turn on *Kelompokkan per kategori* → **Valid →** → in *Kontraktor*, tick the finding → **Gabungkan & tugaskan** → Mandor Hasan. Petugas → Mandor Hasan → the task → *Mulai kerjakan* → *Unggah foto sesudah* → **Masih rembes** (AI fails it, back to the foreman) → *Foto ulang* → **Sudah beres** (passes). Dashboard → **Cek hasil** (before/after) → **OK → kabari warga**. Joko → **Konfirmasi sudah beres**. Joko's tracker updates at every step.
4. **Complaint window closed (Siti).** Log in as Siti → *Komplain garansi* shows why it's closed and when it ended. Or press `+100 hari` and open any recent owner's complaint menu.
5. **Renter (Andi).** Andi → *Penyewa / jual* → **Daftarkan penghuni baru** → unit A3/05, Penyewa, identity (any name, NIK `3275019901990010`, phone `0813 5555 0305`), lease, vehicles, IPL paid by renter → pay. Dashboard → *Penghuni & penyewa* → *Verifikasi* → **Setujui**. Log in with that phone + NIK: the renter view says "Unit milik Andi Pratama", the dashboard lists "Penyewa · milik Andi Pratama", and A3/05's IPL bills go to the renter.
6. **IPL arrears (Andi).** Andi → *Tagihan*: 2 months overdue, no late fee. Dashboard → *Tagihan IPL* → *Perlu tindakan* → A1/07 → **Putus kartu akses** (logged; Andi sees it on *Tagihan* and gets a notification). Andi → **Bayar** → simulate the VA payment → the dashboard row turns *Lunas* live, and the unit page suggests restoring the card → **Pulihkan**.
7. **Settings ripple.** Log in as Rina. Dashboard → *Pengaturan* → WiFi: turn off *Promo WiFi gratis* → *Simpan*; IPL rate table: Tipe 45/90 → `400000` → *Simpan*. Rina's home loses the "Gratis 3 bln" WiFi badge and *Tagihan* shows Rp400.000 for upcoming bills; months already started keep their amount.
8. **Panic.** Andi → *Darurat* → **PANIK** → 5-second countdown. Petugas → Pak Dedi → *Darurat* → **Terima, saya menuju lokasi**. Andi sees "Pak Dedi menuju lokasi"; Dashboard → *Keamanan* logs the guard and response time.
9. **Public listing to lead.** Andi → *Jual beli* → *Pasang iklan* → **Disewakan** for A1/07. Open its public page (the link is shown on the listing, `/listing/<id>`) → fill the interest form. Dashboard → *Leads* shows the new lead; Andi gets a notification.
10. **Gardener to finance.** Petugas → Ujang → *Log potong* (start, finish) and *Bensin* → buy 5 L, Rp50.000, sample receipt. Dashboard (Vista Harmoni) → *Keuangan cluster*: the cost appears under *Biaya terbaru*, the jerrycan reconciliation updates, and the mowing log waits for approval.
11. **Suggestions and announcements.** Any resident → *Kotak masukan* → send. Dashboard → *Komunitas & info* → reply. The resident sees the reply. Dashboard → *Pengumuman* → publish → it appears under "Info dari estate" on the home screen and in notifications.

## How the main rules work

- **IPL** is billed per house type, not a flat rate. The first bill is the month after the free period, which starts at BAST. A rate change only affects months that haven't started. There are **no late fees**: overdue months are marked, and a unit is flagged *Perlu tindakan* after the number of months set in *Pengaturan* (default 2). Consequences (suspend access cards, stop garbage pickup, warning letter) are applied and lifted by hand, logged, and shown to the owner.
- **Locked menus**: some resident features open only after handover, rules signing and move-in. A locked tile explains what's missing.
- **Complaints**: one submission per home within 100 days of BAST (configurable). If a complaint is still open when the window closes, the resident can still track it.
- **Renters** get their own login (phone + NIK) once the estate approves the owner's registration. When the lease ends, access ends and IPL returns to the owner.
- **Subsidized projects** can't turn on renter registration or house listings (homes must be owner-occupied).

## Simulated AI

The AI checks are simulated in the browser, with stable results so demos repeat:

- **Sample photos** (offered on every photo step) have fixed results, e.g. *Dinding rembes* → valid, Kebocoran & rembes, 92%; *Dinding bersih* → no visible damage; *Foto gelap* → too dark.
- **Your own uploads** are scored from image brightness and detail plus keywords in the description (e.g. "bocor", "retak", "keramik"). Confidence is derived from the photo, so the same photo always gets the same score.
- **Fix check** for the foreman's after-photo returns *fixed*, *not fixed*, *wrong area* or *same photo as before*.

To plug in a real model, replace `analyzeComplaintPhoto` and `checkFix` in `src/domain/ai.ts`; they return plain objects the rest of the app already uses.

## Connecting the real VLES API

Customer, transaction and unit data come from a mock of the VLES API in `src/vles/client.ts`. Its functions mirror the OpenAPI endpoints and return the same shapes:

| Function | Endpoint |
|---|---|
| `searchCustomers(data, { no_hp, no_ktp, … })` | `POST /api/v1/customers/search` |
| `getTransactions(data, { customer_id })` | `GET /transactions?customer_id=` |
| `getUnit(data, id)` | `GET /units/{id}` |
| `getUnits(data, { project_id })` | `GET /units?project_id=` |
| `getUnitTypes(data, { project_id })` | `GET /unit-types?project_id=` |

To switch to the real API, replace each function body with a `fetch` to the endpoint and drop the `data` argument; callers already `await` them and handle `VlesError` (`404` not found, `400` bad request). Phone and NIK are normalised before the search in `src/vles/normalize.ts`. Login matching lives in `src/domain/identity.ts` (`resolveResident`): owners are found through VLES by phone + NIK, renters through VHome's own records.

## Project layout

```
src/
  domain/        Pure rules with unit tests: IPL, access, complaints, AI, finance, report, identity
  vles/          Mock VLES client (swap point for the real API)
  data/          Demo data (seed), content, floor plans, sample photos, personas
  store/         One shared data store, actions, cross-tab sync, photo storage
  i18n/          Indonesian and English text, one file per area
  ui/            Shared components (phone frame, buttons, tables, sheets, Moni mascot…)
  apps/
    launcher/    Launcher, demo view, demo bar
    resident/    Resident app (commercial and subsidized)
    staff/       Security, foreman, gardener
    dashboard/   Estate dashboard
    public/      Public listing page
docs/superpowers/  Design spec and implementation plan
```

## Limits of the prototype

- No server: data lives in your browser, so each browser has its own copy. **Reset data** restores the starting point.
- Payments (VA, QRIS), OTP, WhatsApp and letters are simulated.
- CCTV shows sample stills.
- Printing the monthly report uses the browser's print dialog (**Unduh PDF** → save as PDF).
