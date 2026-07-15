# MedX — AI Agent / Developer Handbook

> **Read this first.** It is the single source of truth for continuing work on MedX.
> Last updated: **2026-07-15** (everything below was live and verified on that date).

## 1. What MedX is

Offline-first pathology-lab management software for Indian labs, sold by the repo owner
(the "vendor") under three license tiers. Three connected deployables:

| Platform | Path | Runs on | Live URL |
|---|---|---|---|
| Desktop LIMS (the product labs buy) | `apps/medx-app` | Lab PCs — Electron, **v0.2.0** | installer: `apps/medx-app/release/MedX-Setup-0.2.0.exe` |
| Vendor admin panel | `apps/medx-admin` | Vercel, Next.js 16 | https://medx-admin-lac.vercel.app |
| Patient website (portal/booking/pricing) | `apps/medx-web` | Vercel, Next.js 16 | https://medx-web-one.vercel.app |

Tiers: **Starter** (offline-only, 1 device, 15 patients/day) · **Pro** (3 devices, portal/WhatsApp/
interfacing/inventory/doctors) · **Enterprise** (unlimited devices, + NABL QC/TPA/ABDM/MIS).
Feature gating is fully implemented via `isRouteAllowed()` in `apps/medx-app/src/core/licensing.ts`.

Deep documentation: `docs/ARCHITECTURE.md`, `docs/FEATURES-AND-PLANS.md`, `docs/ROADMAP.md`,
`docs/manuals/MedX-User-Manual.pdf`, `docs/manuals/MedX-Developer-Admin-Guide.pdf`.

## 2. Current status — what is DONE and verified

- Full Starter workflow (registration → GST billing → results w/ H/L flags → verified A4/PDF
  report → WhatsApp link), 30+ pages, role-based permissions, queue/tokens with **live-synced
  counter display** (second window, read-only, IPC broadcast).
- Licensing end-to-end: admin issues signed ECDSA tokens → app activates offline → heartbeat
  every 5 min registers devices, enforces limits (1/3/999), delivers **revocations, renewals,
  tier changes and vendor messages automatically** (verified: revoke → in-app alert + Starter
  lockout; setTier → modules appear on next check-in).
- Admin panel: password login (fail-closed `src/proxy.ts`), license lifecycle (extend / setTier /
  removeDevice / setMessage / revoke / reactivate / delete-when-revoked), CRM, payments ledger,
  tickets, **Platform Status** page (blob + website probes, per-lab heartbeat/sync freshness).
- Patient site: 2026 redesign (aurora hero/glass/bento), report portal (invoice+phone), home
  collection **bookings that flow into the desktop app** (token-authed pull + ack-delete),
  lab directory + catalog.
- Storage: private **Vercel Blob** store `medx-db` (team `medx-lab`); licenses are **one document
  each** (`license/<id>`); per-lab portal docs `labs/<licenseKey>`; bookings `bookings/<licenseKey>`.
- 19/19 unit tests (money/GST/FY numbering/ranges), clean `tsc` across all apps.

## 3. Critical context & gotchas (violating these has bitten us before)

1. **Next.js 16** in both web apps — APIs differ from training data. Read
   `node_modules/next/dist/docs/` before writing Next code. Middleware is now **`src/proxy.ts`**.
2. **The repo is PUBLIC.** Never commit secrets. All secrets live in Vercel env vars +
   git-ignored `.env.local` (re-pull with `npx vercel env pull .env.local --yes` inside the app dir).
   Env vars: `ADMIN_PASSWORD`, `SESSION_SECRET`, `LICENSE_PRIVATE_KEY_JWK` (admin);
   `BLOB_READ_WRITE_TOKEN` (admin+web); `MEDX_ADMIN_URL` (web).
3. **License private key exists ONLY in `LICENSE_PRIVATE_KEY_JWK`.** The matching public key is
   embedded in `medx-app/src/core/licensing.ts`, `medx-web/src/lib/licenseVerify.ts`,
   `medx-admin/src/lib/licenseVerify.ts`. Keypair was rotated 2026-07-15 (old one leaked in git
   history — old tokens invalid). Rotation procedure: Developer Guide §6.
4. **Never store licenses in one shared blob.** Concurrent serverless writes on a single JSON
   doc raced and **erased a real license**. Keep one document per license; the CRM blobs
   (customers/payments/tickets) are still single-doc — fine at admin-only write rates, migrate
   if that changes.
5. **License tokens travel via WhatsApp and arrive with line breaks.** Always
   `sanitizeToken()` (strip all whitespace) before verify/store. This silently broke activation
   for a real user.
6. **Lab identity = the signed token, never the license ID** (IDs are public in the labs
   directory). `/api/sync` and `/api/bookings` GET/PATCH require the token.
7. Heartbeat responses carry `code`: `revoked`/`device_limit` deactivate the app;
   **`unknown_key` must NOT** (offline-first: a validly-signed token survives server hiccups).
8. **Electron specifics:** HashRouter (`#/route`); the counter display window (`#/display`) is
   read-only (its persistence is no-op'd — a stale-snapshot write would clobber the main
   window's data); cross-window queue sync via IPC relay in `electron/main.ts` +
   `src/core/windowSync.ts`; renderer↔main only through the `window.medx.*` preload bridge.
9. **Money is integer paise everywhere.** Starter labs must stay 100% offline (privacy promise —
   `forceCloudSync` returns early); don't "helpfully" sync them.
10. Windows repo: LF/CRLF warnings are noise; binaries are protected by `.gitattributes`.
11. Vercel CLI is logged in (team `medx-lab`). Admin APIs accept
    `Authorization: Bearer <ADMIN_PASSWORD>` for automation/testing.

## 4. Build / test / deploy / verify

```bash
# Desktop app (apps/medx-app)
npx vitest run && npx tsc --noEmit     # 19 tests + typecheck
npm run build                          # vite renderer + electron bundle
npm run package                        # NSIS installer + portable → release/
npm run dev                            # browser dev on :5173 (localStorage impl)

# Web apps (apps/medx-admin, apps/medx-web)
npm run build && npx vercel --prod --yes
```

Production smoke test (replace $PW with ADMIN_PASSWORD):
```bash
# issue license
curl -X POST -H "Authorization: Bearer $PW" -H "Content-Type: application/json" \
  -d '{"labName":"Test","contactPhone":"9","tier":"Pro","validDays":30}' \
  https://medx-admin-lac.vercel.app/api/licenses
# heartbeat (device registers; response may carry token/adminMessage)
curl -X POST -H "Content-Type: application/json" \
  -d '{"licenseKey":"LIC-XXXXXX","deviceId":"D1","hostname":"PC1"}' \
  https://medx-admin-lac.vercel.app/api/heartbeat
# portal sync requires the SIGNED TOKEN, not the key
curl -X POST -H "Content-Type: application/json" \
  -d '{"licenseToken":"<token>","labSettings":{"name":"Test"},"data":{"orders":[],"patients":[]}}' \
  https://medx-web-one.vercel.app/api/sync
```
Full API tables: Developer Guide §8. Always verify UI flows in the browser (vite dev for the
app; the `.claude/launch.json` has `medx-app-dev` and `medx-web-dev` configs).

**Working conventions:** commit per milestone with descriptive conventional messages and push to
`main` (the owner wants continuous pushes); verify end-to-end (real requests / real UI) before
declaring anything done; rebuild + reship the installer whenever `medx-app` changes.

## 5. Key file map

| Concern | Files |
|---|---|
| License crypto (client) | `medx-app/src/core/licensing.ts` (verify, sanitize, heartbeat client, route gating) |
| Sync/bookings/heartbeat engines | `medx-app/src/core/sync.ts` |
| App state + persistence | `medx-app/src/data/store.ts` (Zustand persist via IPC) |
| Cross-window sync | `medx-app/src/core/windowSync.ts`, `medx-app/src/lib/windowMode.ts` |
| Electron shell | `medx-app/electron/main.ts`, `preload.ts`, `db/db.ts` |
| Admin storage | `medx-admin/src/lib/cloudStore.ts`, `adminDb.ts` |
| Admin auth | `medx-admin/src/lib/adminAuth.ts`, `src/proxy.ts`, `app/login/`, `app/api/auth/` |
| License lifecycle API | `medx-admin/src/app/api/licenses/route.ts` (PATCH action dispatcher) |
| Heartbeat control channel | `medx-admin/src/app/api/heartbeat/route.ts` |
| Status monitoring | `medx-admin/src/app/api/status/route.ts`, `app/status/page.tsx` |
| Portal + bookings | `medx-web/src/app/portal/actions.ts`, `api/sync/`, `api/bookings/`, `lib/licenseVerify.ts` |
| Patient-site design system | `medx-web/src/app/globals.css` |

## 6. Implementation backlog — what to build next

Prioritized. Each item is self-contained; verify end-to-end before moving on.

### P0 — Productization (needed before charging real customers)
1. **Publish GitHub Releases for auto-update.** `electron-updater` is already wired to GitHub
   releases but none are published — labs currently need manual reinstalls. Add a release
   workflow (tag → build → upload `MedX-Setup-x.y.z.exe` + `latest.yml`).
2. **Windows code-signing certificate.** Builds are unsigned → SmartScreen scares labs.
   (Requires the owner to purchase a cert; wire it into electron-builder config.)
3. **Automated renewal reminders.** Admin-side job (Vercel cron) that sets `adminMessage` for
   licenses expiring in ≤15 days and lists them on the Overview. Optionally auto-revoke N days
   after expiry.
4. **Payment collection for renewals.** Razorpay payment links (vendor's account) attached to a
   license: generate link in Manage panel, webhook marks payment → auto-extend license →
   ledger entry. Keeps the ₹0-infra constraint (Razorpay is pay-per-use).
5. **CI pipeline.** GitHub Actions: typecheck + vitest + `next build` on every push/PR to `main`.
6. **Admin panel responsiveness.** The panel is desktop-only CSS; the owner manages from a phone.

### P1 — Promised plan features not yet built (see docs/FEATURES-AND-PLANS.md)
7. **LAN multi-counter (Pro promise).** Multiple PCs in one lab sharing the SQLite DB — the
   Electron main already has TCP infra; design: one PC hosts, others connect over LAN (or sync
   via the existing IPC-style store API over sockets). Device slots already support 3 for Pro.
8. **WhatsApp Cloud API delivery.** Today WhatsApp = `wa.me` deep links (manual send). Add
   optional automated delivery using the *lab's own* WhatsApp Business API credentials
   (config gate `allowWhatsApp` already exists in admin config).
9. **Doctor referral portal (Enterprise).** Referring doctors log in on medx-web to see their
   patients' reports — data already syncs; needs auth (per-doctor codes) + views.
10. **Multi-branch cloud sync (Enterprise).** Several lab branches sharing patients/reports —
    build on the per-lab blob partitions with branch IDs.
11. **ABDM/ABHA real integration (Enterprise).** Sandbox first: ABHA number verification +
    push lab reports to the ABDM health locker. The page exists as UI only.
12. **TPA claims workflow depth.** Claim → submission → settlement states with document uploads.
13. **Report template editor.** Per-lab letterhead/margins/signature images — page exists,
    make it actually affect the print/PDF output.
14. **Patient portal PDF parity.** Portal "Save PDF" should render the same branded PDF as the
    desktop (`pdfReport.ts` logic can be ported/shared).

### P2 — Engineering hardening
15. **Real SQLite in production.** `better-sqlite3` falls back to JSON storage if the native
    module fails to load in the packaged app — verify which path packaged builds actually take,
    ship prebuilt binaries, and add a migration from the JSON fallback.
16. **Playwright E2E suite** for the desktop renderer (activation, billing flow, tier gating)
    and the web apps (portal lookup, booking) — the flows are currently verified manually.
17. **Error tracking** (e.g. Sentry free tier) in all three apps — today field errors are invisible.
18. **Vendor-action audit log** in the admin panel (who extended/revoked what, when) —
    store as `admin-audit` blob docs, surface on a page.
19. **Rate limiting / abuse protection** on public endpoints (`/api/heartbeat`, `/api/bookings`
    POST, portal lookups) — e.g. Upstash ratelimit or simple per-IP counters in blob.
20. **Blob backup job.** Nightly export of all `license/*` + CRM docs to a dated backup document
    (or GitHub-actions artifact) — the blob store is currently the only copy.
21. **Encrypt portal PHI at rest.** `labs/<id>` docs hold patient data in plaintext inside the
    private store; AES-GCM with a server-side key would add defense in depth.
22. **Session hardening.** Single admin password today; consider TOTP 2FA and per-session
    revocation if more staff get panel access.

### P3 — Growth ideas
23. Vendor marketing site (separate from the patient site) with pricing + demo booking.
24. In-app onboarding checklist for new labs (guided first bill).
25. Hindi/Marathi UI language toggle for low-literacy staff.
26. Analytics upgrades: revenue trends, test-mix charts (use `dataviz` patterns), monthly PDF
    MIS email to the lab owner.
27. Android companion app for phlebotomists (route list for home collections, mark collected).

## 7. Known open items / debts
- `Database/admin-keys.json` in the repo is stale dev-fallback data (harmless post-rotation).
- Admin CRM/billing/tickets still use single-blob storage (see gotcha #4).
- The `hero-mobile` CSS classes in medx-web are legacy aliases kept for older pages.
- Portable exe + installer both build; only the installer is documented for labs.
- `medx-admin` dashboard MRR uses hardcoded plan prices (₹499/₹1,499) — keep in sync with
  `docs/FEATURES-AND-PLANS.md` if pricing changes.
