# MedX — Roadmap & Status

Build order follows the "build → test → move forward" rule. Each milestone must run and be verified
before the next starts.

## Legend
✅ done · 🚧 in progress · ⬜ not started

---

## M0 — Foundation & context  ✅
- ✅ Read landing + 3,000-test catalog (Ch 1–3)
- ✅ Decide architecture: offline-first Electron desktop app + Next.js/Firebase admin panel
- ✅ Write context/spec docs (README, ARCHITECTURE, FEATURES-AND-PLANS, ROADMAP)

## M1 — App scaffold + data layer  ✅ (browser-testable + desktop SQLite adapter ready)
- ✅ Scaffold `apps/medx-app` (Vite React-TS renderer). Electron main/preload = 🚧.
- ✅ SQLite schema + migrations (better-sqlite3 with JSON fallback)
- ✅ Data layer: Zustand + localStorage store (browser impl). SQLite impl swaps in for Electron.
- ✅ Settings/lab-profile bootstrap (Settings page)

## M2 — Test catalog  ✅
- ✅ `src/catalog`: 16 curated common tests/profiles with Indian ranges + 3 packages
- ✅ 2,481-name send-out directory parsed from the PDFs (searchable) → ~2,497 billable total

## M3 — Core domain logic (tested)  ✅
- ✅ GST engine (CGST/SGST/IGST, exempt, SAC 999316) + Vitest
- ✅ FY invoice & accession numbering + Vitest
- ✅ Reference-range flagging (age/sex → H/L/critical) + Vitest
- ✅ 19/19 tests green

## M4 — Vertical slice (Starter core)  ✅ (fully verified in browser + desktop)
- ✅ Patient registration + returning-patient lookup (by phone)
- ✅ Test/panel selection → order (search + quick packages)
- ✅ GST billing + payment mode + printable A4 invoice
- ✅ Sample accession numbering (260713-0001)
- ✅ Result entry with live H/L/critical flags → pathologist verify/lock
- ✅ A4 report (letterhead, GSTIN, signature, flags) + print/PDF
- ✅ One-click WhatsApp (wa.me, lab's own number) + print
- ✅ Dashboard (today's counts, dues) + worklist + patients
- ✅ Barcode label print, thermal 58mm receipt, token/counter display, backup scheduling
  (verified end-to-end 2026-07-13: reg → bill → results -> A4 report -> barcode sheet -> thermal receipt)

## M5 — Licensing + Admin Panel  ✅ (live in production 2026-07-15)
- ✅ In-app license activation (signed ECDSA tokens), heartbeat, entitlement tiers
- ✅ `apps/medx-admin` (Next.js + Vercel Blob): issue/revoke keys, device limits, CRM,
  payments, tickets, feature flags — live at https://medx-admin-lac.vercel.app
- ✅ Password-protected admin login (proxy auth gate); signing key moved to env vars (rotated)
- ✅ Wire license tiers → app gating (routes, sidebar, patient/day caps, WhatsApp lock)

## M6 — Pro features  🚧
- 🚧 Multi-counter LAN (TCP synchronizer server/client peer state replication on Port 8095)
- ✅ Analyzer interfacing LIS (verified serial/TCP ASTM and HL7 parser frame handling)
- ⬜ QR patient portal, home collection, inventory, referral tracking, doctor commission, MIS, histopath narrative editor

## M7 — Enterprise features  ⬜
- ⬜ Multi-branch/cloud sync, NABL quality module, ABDM/ABHA, TPA billing, doctor portal, API

## M8 — Packaging & release  ⬜
- ⬜ electron-builder Windows installer, auto-update channel, signed entitlements
- ⬜ AnyDesk install runbook + lab onboarding checklist

---

## Current focus
**M6** — building out Pro tier modules (Multi-counter LAN state replication, LIS interfaces, inventory, doctor commissions).

## Decisions log
- **2026-07-13:** Electron over Tauri (no Rust toolchain; runs on old Windows; single .exe).
- **2026-07-13:** SQLite (better-sqlite3) local-first; paise integers for money; FY numbering.
- **2026-07-13:** Admin cloud stores licensing metadata only (no patient data) → ₹0 free-tier cost.
- **2026-07-13:** Delivery uses the lab's own WhatsApp/Gmail/SMS creds so admin bears no message cost.
- **2026-07-15:** Cloud persistence moved to a **private Vercel Blob store** (free tier) after the
  kvdb.io buckets died; `/tmp` on Vercel is not persistent. All admin + portal data now survives
  serverless restarts.
- **2026-07-15:** License signing keypair **rotated** (old private key had been committed to the
  public repo). Private key now lives only in Vercel env vars; old tokens are invalid.
- **2026-07-15:** Admin panel locked behind password auth (`proxy.ts` gate). Public surface is
  only `/api/heartbeat` + sanitized `/api/labs-directory`.
- **2026-07-15:** Patient-portal sync is validated server-side: unknown/revoked keys rejected,
  Starter tier rejected (portal is Pro+; Starter data never leaves the lab PC).
- **2026-07-15:** Automated Vercel cron route for license audits and expiration messages; Razorpay payment captured webhooks; immutable operator audit trail at /audit; local network peer-to-peer TCP data store sync on Port 8095.
