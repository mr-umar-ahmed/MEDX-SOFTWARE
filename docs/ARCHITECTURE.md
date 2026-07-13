# MedX — Technical Architecture

## 1. Two deployables

### A. MedX Lab Software — `apps/medx-app`
- **Type:** Electron desktop app, single Windows `.exe` installer (NSIS via electron-builder).
- **Renderer:** React + TypeScript + Vite. Plain, high-contrast, keyboard-friendly UI.
- **Main process:** Node. Owns the database, filesystem, printing, license checks.
- **Database:** **SQLite** via `better-sqlite3` (synchronous, fast, tiny, perfect for low-spec).
  Stored at `%APPDATA%/MedX/medx.db`. This is the **single source of truth.**
- **IPC:** renderer talks to main via a typed, allow-listed `preload` bridge
  (`window.medx.*`). No `nodeIntegration` in the renderer (security).
- **Reports/labels:** generated locally (HTML → print/PDF; barcodes via a JS barcode lib). No
  cloud rendering.
- **Offline:** 100%. Network is only used for (a) the license heartbeat and (b) opt-in
  cloud/portal features on higher plans.

### B. MedX Admin Panel — `apps/medx-admin`
- **Type:** Next.js web app on Vercel.
- **Backend:** Firebase — **Auth** (admin login) + **Firestore** (licenses, labs, payments,
  feature flags, support tickets).
- **Purpose:** the admin issues/revokes license keys, binds devices, records payments, sets each
  lab's plan + feature entitlements, and reads telemetry the app reports on heartbeat.

> The admin cloud only ever stores **account/licensing metadata** — never patient data (for Plan
> 1 & 2). That keeps it tiny → free tier → ₹0 admin cost, and sidesteps health-data liability.

## 2. Data model (lab app, SQLite)

Core tables (see `apps/medx-app/electron/db/schema.sql`):
- `patients` — demographics, phone, ABHA (nullable).
- `doctors` — referring doctors/clinics, commission config.
- `tests` — catalog snapshot the lab can edit (price, active). Seeded from `packages/catalog`.
- `test_ranges` — reference ranges per test, keyed by sex + age band + qualifier.
- `panels` / `panel_items` — profiles that expand to member tests.
- `orders` — a visit/bill header (patient, doctor, date, totals, GST, status).
- `order_items` — tests on an order (price, discount, sample status, result).
- `results` — per-parameter results, values, flags, verified-by, verified-at.
- `payments` — receipts against an order (mode, amount, date).
- `samples` — accession numbers, barcode, container, status timeline.
- `users` — staff accounts + role; `audit_log` — who did what, when.
- `settings` — lab profile (name, GSTIN, state code, logo, invoice series), key-value.
- `sequences` — atomic counters for invoice/accession numbering per financial year.

All monetary values stored in **paise (integer)** to avoid float errors. All timestamps ISO-8601.

## 3. Numbering & GST rules

- **Financial year:** Apr 1 – Mar 31. Invoice series like `MEDX/24-25/000123`, reset each FY.
- **Accession:** `YYMMDD-####` per day (or per FY, configurable).
- **GST:** if lab state == patient/place-of-supply state → **CGST + SGST** (half each); else
  **IGST**. Default rate config per test (diagnostic services are often exempt/nil — the engine
  supports 0%, 5%, 12%, 18% and an *exempt* flag). HSN/SAC **999316**.
- Rounding: line tax computed on paise, invoice total rounded to nearest rupee with a
  `round_off` line.

## 4. Licensing & feature flags (the admin control plane)

- Each install has a **device fingerprint** (machine GUID hash). A **license key** binds a plan +
  allowed device count to a lab.
- **Activation:** enter key once (admin does this over AnyDesk). App calls admin API → gets a
  signed **entitlement token** (plan, feature flags, expiry, lab profile).
- **Heartbeat:** on launch + once/day, app posts `{key, deviceId, appVersion, counts}` and gets
  back the current entitlement token. Response cached locally.
- **Offline grace:** app keeps working for a configurable grace window (e.g. 14 days) using the
  cached token, so internet outages never stop the lab. Past grace → read-only/limited until it
  can reach the server again.
- **Feature flags:** every gated feature checks `entitlements.features[...]`. The admin flips these
  in Firestore; the app picks them up on next heartbeat. Same path delivers the **kill-switch**.
- Tokens are signed by the admin key so a lab can't forge entitlements offline.

## 5. Delivery channels & the ₹0 rule

| Channel | Starter (₹0 admin) | Pro | Enterprise |
|--------|--------------------|-----|-----------|
| Print | ✅ local | ✅ | ✅ |
| WhatsApp | ✅ click-to-send via lab's own WhatsApp | ✅ automated via lab's own WA Business API | ✅ |
| Email | ✅ lab's own Gmail/SMTP | ✅ | ✅ |
| SMS | — | ✅ lab's own DLT gateway | ✅ |
| QR portal | — | ✅ free-tier hosted links | ✅ |
| Cloud sync | — | — | ✅ (priced in) |

The admin never pays for a lab's message volume — those always run on the *lab's* credentials.

## 6. Security & integrity

- Renderer sandboxed (`contextIsolation: true`, `nodeIntegration: false`), typed preload bridge.
- Role-based access in-app; every mutation writes to `audit_log`.
- Local DB can be encrypted (SQLCipher option) for higher plans.
- Backups: scheduled copy of `medx.db` (+ integrity check) to a chosen folder/USB; restore flow.
- No patient data leaves the PC unless an Enterprise cloud feature is explicitly enabled.

## 7. Testing strategy

- **Domain logic** (GST, numbering, range flagging) is pure TypeScript in `src/core`, unit-tested
  with Vitest — no Electron needed, runs in CI and locally.
- **Data layer** has an interface (`DataStore`) with a SQLite impl (Electron) and an in-memory/
  IndexedDB impl (browser) so the **UI can be previewed and tested in a normal browser** during
  development, then runs on real SQLite in the packaged app.
- **Build → test → move forward:** each slice is verified running before the next begins.
